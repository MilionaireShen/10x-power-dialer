import { useCallback, useEffect, useRef, useState } from "react";
import adminService from "../services/adminService";

// The agent's server-backed live state: callbacks that have come due,
// messages a supervisor has sent, and a status a supervisor has changed.
//
// All three used to live in a React context shared between admin and agent
// screens, which only worked because both were open in the same browser tab.
// In production they are different people on different machines, so none of
// it ever arrived. Each is now polled from the server.
//
// One interval drives all three. A dialer screen is already doing real work,
// and three separate timers competing for the same seconds is worse than one
// that batches.
const POLL_MS = 5000;

export function useAgentLiveState({ enabled = true, onMessage, onForcedStatus, onForcedLogout }) {
  const [dueCallback, setDueCallback] = useState(null);

  // Held in refs so changing a callback identity does not restart the poll —
  // the interval should keep its cadence across re-renders.
  const onMessageRef = useRef(onMessage);
  const onForcedStatusRef = useRef(onForcedStatus);
  const onForcedLogoutRef = useRef(onForcedLogout);
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onForcedStatusRef.current = onForcedStatus; }, [onForcedStatus]);
  useEffect(() => { onForcedLogoutRef.current = onForcedLogout; }, [onForcedLogout]);

  // Tracks the status last seen from the server so a supervisor's change is
  // announced once, not on every poll.
  const lastServerStatusRef = useRef(null);
  const seenMessagesRef = useRef(new Set());

  const poll = useCallback(async () => {
    // Callbacks that are due. The server only returns this agent's own, and
    // only ones whose popup has not already been shown.
    try {
      const res = await adminService.dueCallbacks();
      const next = (res?.data?.callbacks || [])[0] || null;
      setDueCallback((current) => current || next);
    } catch {
      // A failed poll is not worth interrupting an agent mid-call over; the
      // next tick tries again.
    }

    try {
      const res = await adminService.agentInbox();
      for (const m of res?.data?.messages || []) {
        if (seenMessagesRef.current.has(m.id)) continue;
        seenMessagesRef.current.add(m.id);
        onMessageRef.current?.(m);
        adminService.markMessageRead(m.id).catch(() => {});
      }
    } catch { /* as above */ }

    try {
      const res = await adminService.mySession();
      const session = res?.data?.session;
      if (!session) return;

      if (!session.is_active) {
        onForcedLogoutRef.current?.(session.logout_reason);
        return;
      }
      // Only announced when the server's status differs from what this
      // browser last saw there — an agent changing their own status moves
      // both, so it must not read as a supervisor's doing.
      if (lastServerStatusRef.current === null) {
        lastServerStatusRef.current = session.current_status;
      } else if (session.current_status !== lastServerStatusRef.current) {
        lastServerStatusRef.current = session.current_status;
        if (session.status_forced_by_supervisor) {
          onForcedStatusRef.current?.(session.current_status);
        }
      }
    } catch { /* as above */ }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    poll();
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [enabled, poll]);

  // Marks the popup shown so the server stops returning it, then clears it
  // locally. Called when the agent acts on the callback either way.
  const resolveCallback = useCallback(async (id, patch) => {
    try {
      await adminService.updateCallback(id, patch);
    } finally {
      setDueCallback(null);
    }
  }, []);

  const dismissCallbackPopup = useCallback(async (id, { onCall = false } = {}) => {
    try {
      await adminService.updateCallback(id, {
        status: "dismissed", popup_dismissed: true, dismissed_while_on_call: onCall,
      });
    } finally {
      setDueCallback(null);
    }
  }, []);

  // Notes locally that the agent's own status changed, so the next poll does
  // not mistake their own action for a supervisor's.
  const noteOwnStatusChange = useCallback((status) => {
    lastServerStatusRef.current = status;
  }, []);

  return { dueCallback, resolveCallback, dismissCallbackPopup, noteOwnStatusChange };
}
