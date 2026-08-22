import api, { tokenStorage } from "./api";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const recordingService = {
  startSession: (payload) => api.post("/recordings/sessions", payload).then((r) => r.data),

  // Sent as raw bytes rather than through the JSON client: base64-encoding
  // audio inside JSON would inflate every chunk by a third for no benefit.
  // Uses fetch directly because axios interceptors assume JSON bodies.
  uploadChunk: async ({ sessionId, chunkNumber, blob }) => {
    const res = await fetch(`${BASE_URL}/recordings/sessions/${sessionId}/chunks/${chunkNumber}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/octet-stream",
        Authorization: `Bearer ${tokenStorage.getAccessToken()}`,
      },
      body: blob,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Chunk ${chunkNumber} upload failed (${res.status}): ${text.slice(0, 200)}`);
    }
    return res.json();
  },

  finalize: (sessionId, payload) =>
    api.post(`/recordings/sessions/${sessionId}/finalize`, payload).then((r) => r.data),

  // Returns { data, meta } — meta carries total/page/total_pages so the UI can
  // render pagination without a second request.
  list: (params) => api.get("/recordings", { params }).then((r) => r.data),
  filterOptions: () => api.get("/recordings/filter-options").then((r) => r.data),
  playUrl: (id) => api.get(`/recordings/${id}/play`).then((r) => r.data),
  downloadUrl: (id) => api.get(`/recordings/${id}/download`).then((r) => r.data),
  reap: () => api.post("/recordings/reap").then((r) => r.data),
};

export default recordingService;
