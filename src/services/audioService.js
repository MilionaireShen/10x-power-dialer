// No /audio endpoints exist on the backend yet (playback/upload live only
// as internal TelnyxProvider methods, never exposed over HTTP — see
// src/telephony/providers/TelnyxProvider.js in the backend repo). Nothing
// in this frontend currently calls this file. Stubbed with clear errors
// rather than silently no-op-ing, so if a future screen wires up audio
// management it fails loudly instead of pretending to work.
function notImplemented(action) {
  return Promise.reject(new Error(`audioService.${action}: no backend /audio endpoint exists yet.`));
}

const audioService = {
  list: () => notImplemented("list"),
  upload: () => notImplemented("upload"),
  playToCall: () => notImplemented("playToCall"),
};

export default audioService;
