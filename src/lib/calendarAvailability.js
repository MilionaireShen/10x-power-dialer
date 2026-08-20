// Simulates a read-only "get availability" API response for a client's
// calendar. In a real backend this would call the provider's availability
// endpoint (Calendly/Acuity/Google Calendar all expose one) and return
// open slots only — never anything that can create, modify, or cancel an
// event. This mirrors that contract on the frontend: the shape returned
// here has no slot IDs usable for booking, no write actions, nothing but
// a day + time to read aloud to the lead.

const TIME_POOL = ["9:00 AM", "10:00 AM", "11:30 AM", "1:00 PM", "2:30 PM", "3:00 PM", "4:30 PM"];

function seededRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Deterministic per client + per day, so the same client shows the same
// slots all day rather than reshuffling on every render.
export function getClientAvailability(clientId, days = 5) {
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const results = [];
  let cursor = new Date(today);

  while (results.length < days) {
    cursor.setDate(cursor.getDate() + 1);
    const dayOfWeek = cursor.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // skip weekends

    const dateKey = cursor.toISOString().slice(0, 10);
    const rand = seededRandom(hashString(`${clientId}:${dateKey}:${todayKey.slice(0, 7)}`));
    const slotCount = 2 + Math.floor(rand() * 3);
    const shuffled = [...TIME_POOL].sort(() => rand() - 0.5).slice(0, slotCount);
    shuffled.sort((a, b) => TIME_POOL.indexOf(a) - TIME_POOL.indexOf(b));

    results.push({
      dateKey,
      label: cursor.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }),
      slots: shuffled,
    });
  }

  return results;
}
