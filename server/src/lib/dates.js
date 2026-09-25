// ── Date helpers ─────────────────────────────────────────────────────────────
// BUG FIXED: the original app computed "today" with `new Date().toISOString()`,
// which converts to UTC. Since IST is UTC+5:30, that returns YESTERDAY's date
// for anyone using the app between midnight and ~5:30am IST. Render's servers
// run in UTC, so this bug would have been *more* visible after deployment, not
// less. We instead explicitly format "today" in the Asia/Kolkata timezone,
// which is correct regardless of where the server or the browser physically is.
const TZ = "Asia/Kolkata";

const IST_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// en-CA locale formats as YYYY-MM-DD, which is what the rest of the app
// (and the database) uses as the canonical date-string format.
function todayStr() {
  return IST_FORMATTER.format(new Date());
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

// Both inputs are YYYY-MM-DD date-only strings; compare as UTC midnights so
// there's no timezone drift baked into the subtraction.
function daysBetween(a, b) {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const da = Date.UTC(ay, am - 1, ad);
  const db_ = Date.UTC(by, bm - 1, bd);
  return Math.floor((db_ - da) / (1000 * 60 * 60 * 24));
}

// YYYY-MM-DD strings compare correctly with plain string comparison.
function isPastDate(dateStr) {
  return !!dateStr && dateStr < todayStr();
}

module.exports = { TZ, todayStr, addDays, daysBetween, isPastDate };
