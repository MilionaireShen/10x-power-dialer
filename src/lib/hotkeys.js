// Parses bindings like "F1" or "ctrl+1" and checks them against a
// keydown event. Shared by the agent hotkey listener and the admin Hotkey
// Management screen (which uses it to preview/validate what an admin types).
export function matchesBinding(binding, e) {
  if (!binding) return false;
  const parts = binding
    .toLowerCase()
    .split("+")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return false;
  const mainKey = parts[parts.length - 1];
  const needsCtrl = parts.includes("ctrl");
  const needsAlt = parts.includes("alt");
  const needsShift = parts.includes("shift");
  if (needsCtrl !== e.ctrlKey) return false;
  if (needsAlt !== e.altKey) return false;
  if (needsShift !== e.shiftKey) return false;
  return e.key.toLowerCase() === mainKey;
}
