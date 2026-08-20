import { useEffect, useState } from "react";
import { AlertTriangle, Ban, Clock, TimerOff } from "lucide-react";

export const LOGOUT_BANNER = {
  wrapup_timeout: {
    icon: AlertTriangle,
    tone: "warning",
    message: "You were logged out due to wrap-up timeout. Please log back in.",
  },
  admin_kick: {
    icon: Ban,
    tone: "danger",
    message: "You have been removed from this session by an administrator.",
  },
  inactivity: {
    icon: Clock,
    tone: "warning",
    message: "You were logged out due to inactivity.",
  },
  session_expired: {
    icon: TimerOff,
    tone: "warning",
    message: "Your session expired. Please log back in.",
  },
};

// Surfaces why the user landed back on a login screen (wrap-up timeout,
// admin kick, inactivity, expired session) exactly once, then clears it
// so a refresh doesn't repeat it. Set by services/api.js on a 401 that
// can't be refreshed, and by the agent force-logout flow.
export function useLogoutBanner() {
  const [reason, setReason] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("logout_reason");
    if (stored && LOGOUT_BANNER[stored]) {
      setReason(stored);
      localStorage.removeItem("logout_reason");
    }
  }, []);

  return reason ? LOGOUT_BANNER[reason] : null;
}
