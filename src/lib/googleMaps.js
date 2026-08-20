// Builds a Google Maps URL entirely from the lead's own stored address —
// no API key, no geocoding backend, and nothing hardcoded. Uses Google's
// documented query-based Maps URL scheme plus the classic `t=k` satellite
// map-type param, both of which work with a plain address string.

export function isAddressUsable(lead) {
  const street = (lead?.street || "").trim();
  const cityOrZip = (lead?.city || "").trim() || (lead?.zip || "").trim();
  return Boolean(street && cityOrZip);
}

export function buildPropertyMapsUrl(lead) {
  if (!isAddressUsable(lead)) return null;

  const parts = [lead.street, lead.city, lead.state, lead.zip].map((p) => (p || "").trim()).filter(Boolean);
  const query = encodeURIComponent(parts.join(", "));

  // t=k -> satellite map type. No coordinates required, nothing pre-set —
  // Maps resolves the query to a location dynamically on their end.
  return `https://www.google.com/maps?q=${query}&t=k`;
}

export function openPropertyOnMap(lead, notify) {
  const url = buildPropertyMapsUrl(lead);
  if (!url) {
    notify?.("This lead's property address is incomplete — can't open a map location.", "warning", { title: "Address Unavailable" });
    return false;
  }
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
