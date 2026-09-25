// BUG FIXED: the original used `new Date().toISOString().slice(0,10)` for
// "today", which is UTC and rolls over to the next day ~5.5 hours before
// midnight IST. We pin "today" to Asia/Kolkata explicitly here too, so the
// browser's own timezone never causes the UI to disagree with the server.
const TZ = "Asia/Kolkata";
const IST_FORMATTER = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

export const todayStr = () => IST_FORMATTER.format(new Date());

export const INR = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n) || 0);

export const fmtL = (n) => {
  const v = Number(n) || 0;
  return "₹" + (v / 100000).toFixed(2) + "L";
};

export const fmtDate = (d) => (d ? new Date(d + "T00:00:00Z").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "—");

export const daysBetween = (a, b) => {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.floor((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
};

export const getInvoiceAge = (inv) => {
  if (!inv.issuedAt || inv.status === "Paid") return null;
  const days = daysBetween(inv.issuedAt, todayStr());
  if (days <= 30) return { label: "0-30 days", color: "#6366F1" };
  if (days <= 60) return { label: "31-60 days", color: "#F59E0B" };
  if (days <= 90) return { label: "61-90 days", color: "#F97316" };
  return { label: "90+ days", color: "#DC2626" };
};

// Client-side CSV download for the /reports/:type JSON rows.
export const exportToCSV = (rows, filename) => {
  const esc = (v) => {
    const s = String(v ?? "").replace(/"/g, '""');
    return /[,"\n\r]/.test(s) ? `"${s}"` : s;
  };
  const csv = rows.map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename + ".csv";
  a.click();
  URL.revokeObjectURL(url);
};
