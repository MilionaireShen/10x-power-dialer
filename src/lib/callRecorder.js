import { getSharedAudioContext } from "./audioContext";

// 8 seconds. The tradeoff is crash-loss window against request overhead:
// at 8s a crash costs at most the in-flight chunk plus anything queued, while
// a 20-minute call produces ~150 requests rather than ~1200 at 1s. Opus at
// this bitrate makes each chunk tens of KB, so neither bandwidth nor storage
// is the binding constraint — the loss window is.
export const CHUNK_MS = 8000;

// Chunks that could not be uploaded are held here, not dropped, so a transient
// network failure costs nothing once connectivity returns.
const DB_NAME = "10x-recording-queue";
const STORE = "chunks";

function openQueue() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function queuePut(entry) {
  const db = await openQueue();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function queueDelete(key) {
  const db = await openQueue();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function queueAll() {
  const db = await openQueue();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Mixes the agent's microphone and the customer's remote audio into ONE
 * stereo stream and records it in chunks.
 *
 * Recording only the microphone would capture half the conversation — the
 * customer's audio arrives as a separate remote MediaStream and is never part
 * of the local mic track. Both are joined here through a ChannelMergerNode:
 *
 *   agent mic      -> merger input 0 -> LEFT channel
 *   customer audio -> merger input 1 -> RIGHT channel
 *
 * Keeping the two parties on separate channels rather than summing them to
 * mono is what makes the result useful afterwards: QA can hear who spoke, and
 * transcription can attribute turns without guessing.
 *
 * Nothing is connected to the AudioContext destination, so this taps the audio
 * without playing it a second time — the existing remote <audio> element
 * remains the only thing the agent hears.
 */
export function createCallRecorder({ localStream, remoteStream, onChunk, onError }) {
  const ctx = getSharedAudioContext();
  if (!ctx) throw new Error("Web Audio is unavailable in this browser.");
  if (typeof MediaRecorder === "undefined") throw new Error("MediaRecorder is unavailable in this browser.");

  const merger = ctx.createChannelMerger(2);
  const nodes = [];

  if (localStream?.getAudioTracks().length) {
    const src = ctx.createMediaStreamSource(localStream);
    src.connect(merger, 0, 0);
    nodes.push(src);
  }
  if (remoteStream?.getAudioTracks().length) {
    const src = ctx.createMediaStreamSource(remoteStream);
    src.connect(merger, 0, 1);
    nodes.push(src);
  }
  if (nodes.length === 0) throw new Error("Neither the microphone nor the remote audio track is available.");

  const destination = ctx.createMediaStreamDestination();
  merger.connect(destination);

  // Opus in WebM is the only combination Chrome reliably produces, and it is
  // efficient enough that chunk size never becomes the limiting factor.
  const mimeType = ["audio/webm;codecs=opus", "audio/webm"].find(
    (t) => MediaRecorder.isTypeSupported?.(t)
  );
  const recorder = new MediaRecorder(destination.stream, mimeType ? { mimeType } : undefined);

  let chunkNumber = 0;
  recorder.ondataavailable = (event) => {
    if (!event.data || event.data.size === 0) return;
    chunkNumber += 1;
    onChunk({ chunkNumber, blob: event.data, durationMs: CHUNK_MS });
  };
  recorder.onerror = (event) => onError?.(event.error || new Error("MediaRecorder failed."));

  return {
    mimeType: mimeType || "audio/webm",
    start() {
      // The timeslice argument is what makes this incremental: without it,
      // ondataavailable fires once at stop() and a crash loses everything.
      recorder.start(CHUNK_MS);
    },
    stop() {
      return new Promise((resolve) => {
        if (recorder.state === "inactive") return resolve(chunkNumber);
        recorder.onstop = () => resolve(chunkNumber);
        // Flushes whatever has accumulated since the last slice, so the tail
        // of the call is not lost.
        recorder.stop();
        nodes.forEach((n) => n.disconnect());
        merger.disconnect();
      });
    },
    get chunkCount() {
      return chunkNumber;
    },
    get state() {
      return recorder.state;
    },
  };
}

/**
 * Uploads chunks, holding anything that fails in IndexedDB until it succeeds.
 *
 * Retries are bounded and backed off rather than immediate: a chunk that fails
 * because the network is down should not spin, and one that fails because the
 * server rejected it should not retry forever.
 */
export function createChunkUploader({ sessionId, uploadFn, onStateChange }) {
  const state = { uploaded: 0, pending: 0, failed: 0 };
  let draining = false;

  // Every in-flight enqueue. MediaRecorder emits its final slice just before
  // onstop, and writing it to IndexedDB is asynchronous — without something to
  // await, a finalize triggered on stop can run while that write is still in
  // progress and miss the tail of the call.
  const inFlight = new Set();

  const report = () => onStateChange?.({ ...state });

  async function attempt(entry) {
    await uploadFn({ sessionId: entry.sessionId, chunkNumber: entry.chunkNumber, blob: entry.blob });
    await queueDelete(entry.key);
    state.uploaded += 1;
    state.pending = Math.max(0, state.pending - 1);
    report();
  }

  // Walks whatever is queued. Called after every new chunk and whenever the
  // browser reports connectivity returning, so a backlog clears on its own.
  //
  // A concurrent caller gets the IN-PROGRESS promise rather than an immediate
  // return. Returning early was a real defect: finalize awaited drain() while
  // an enqueue-triggered drain was still uploading, got back a resolved
  // promise, and finalized against a chunk table that had not been written
  // yet — which is how a perfectly good short call ended up recorded as
  // having no chunks at all.
  let currentDrain = null;
  async function drain() {
    if (currentDrain) return currentDrain;
    currentDrain = (async () => {
      try {
        await drainOnce();
        // Anything enqueued while the first pass was running still needs a
        // pass of its own.
        await drainOnce();
      } finally {
        currentDrain = null;
      }
    })();
    return currentDrain;
  }

  async function drainOnce() {
    if (draining) return;
    draining = true;
    try {
      const entries = (await queueAll()).filter((e) => e.sessionId === sessionId);
      entries.sort((a, b) => a.chunkNumber - b.chunkNumber);
      for (const entry of entries) {
        let delay = 500;
        let done = false;
        for (let attemptNo = 0; attemptNo < 4 && !done; attemptNo += 1) {
          try {
            await attempt(entry);
            done = true;
          } catch {
            await new Promise((r) => setTimeout(r, delay));
            delay = Math.min(delay * 2, 8000);
          }
        }
        if (!done) {
          // Left in IndexedDB deliberately — a later drain, or the next login
          // on this machine, can still deliver it.
          state.failed += 1;
          report();
        }
      }
    } finally {
      draining = false;
    }
  }

  return {
    enqueue({ chunkNumber, blob }) {
      const task = (async () => {
        await queuePut({ key: `${sessionId}:${chunkNumber}`, sessionId, chunkNumber, blob, queuedAt: Date.now() });
        state.pending += 1;
        report();
        drain();
      })();
      inFlight.add(task);
      task.finally(() => inFlight.delete(task));
      return task;
    },
    // Resolves once every enqueue started so far has been written. Awaited
    // before finalize so the tail chunk is counted.
    settled() {
      return Promise.allSettled([...inFlight]);
    },
    drain,
    get stats() {
      return { ...state };
    },
  };
}

// Anything left from a previous session on this machine — e.g. the browser was
// closed before the queue drained. Retried on next login so a crash costs the
// unsent tail rather than everything after the last successful upload.
export async function pendingChunkCount() {
  try {
    return (await queueAll()).length;
  } catch {
    return 0;
  }
}
