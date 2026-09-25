export const baseInp = { width: "100%", padding: "10px 12px", border: "1.5px solid #E5E7EB", borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" };

export const Field = ({ label, children, hint }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
    {children}
    {hint && <p style={{ margin: "4px 0 0", fontSize: 11, color: "#aaa" }}>{hint}</p>}
  </div>
);

export const Input = (p) => <input {...p} style={{ ...baseInp, ...p.style }} onFocus={(e) => (e.target.style.borderColor = "#6366F1")} onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")} />;
export const Sel = ({ children, ...p }) => (
  <select {...p} style={{ ...baseInp, background: "#fff", cursor: "pointer", ...p.style }}>
    {children}
  </select>
);
export const Textarea = (p) => <textarea {...p} rows={p.rows || 3} style={{ ...baseInp, resize: "vertical" }} onFocus={(e) => (e.target.style.borderColor = "#6366F1")} onBlur={(e) => (e.target.style.borderColor = "#E5E7EB")} />;

export const Btn = ({ children, variant = "primary", onClick, style: s, disabled, small, type = "button" }) => {
  const vs = {
    primary: { background: "#6366F1", color: "#fff", border: "none" },
    secondary: { background: "#F5F5F5", color: "#333", border: "1px solid #E5E7EB" },
    danger: { background: "#FEE2E2", color: "#DC2626", border: "none" },
    green: { background: "#065F46", color: "#fff", border: "none" },
    amber: { background: "#92400E", color: "#fff", border: "none" },
    blue: { background: "#1D4ED8", color: "#fff", border: "none" },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{ padding: small ? "6px 12px" : "10px 20px", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", fontSize: small ? 12 : 14, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6, opacity: disabled ? 0.5 : 1, ...vs[variant], ...s }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.opacity = ".82")}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
    >
      {children}
    </button>
  );
};

export const Modal = ({ title, onClose, children, width = 580 }) => (
  <div style={{ position: "fixed", inset: 0, background: "#00000066", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }} onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: width, maxHeight: "92vh", overflow: "auto", boxShadow: "0 24px 64px #0006", margin: "0 8px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid #f0f0f0" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{title}</h2>
        <button onClick={onClose} style={{ border: "none", background: "none", cursor: "pointer", color: "#888", padding: 4, fontSize: 18 }}>
          ✕
        </button>
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  </div>
);

export const Avatar = ({ name, size = 36 }) => {
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const hue = [...(name || "")].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: `hsl(${hue},65%,50%)`, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.4, flexShrink: 0 }}>
      {initials}
    </div>
  );
};

const STATUS_COLORS = {
  "CV Submitted": "#3B82F6",
  Screening: "#8B5CF6",
  Interview: "#F59E0B",
  Offer: "#10B981",
  Placed: "#059669",
  Rejected: "#EF4444",
  Withdrawn: "#6B7280",
  Open: "#10B981",
  Filled: "#6B7280",
  "On Hold": "#F59E0B",
  Paid: "#10B981",
  Unpaid: "#EF4444",
  Overdue: "#DC2626",
  Pending: "#F59E0B",
  Draft: "#6B7280",
};
export const Badge = ({ text }) => (
  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 9px", borderRadius: 99, color: "#fff", background: STATUS_COLORS[text] || "#6366F1" }}>{text}</span>
);

export const Tag = ({ label }) => <span style={{ fontSize: 11, background: "#F5F5F5", color: "#555", padding: "2px 8px", borderRadius: 4 }}>{label}</span>;

export const ScorePill = ({ score }) => {
  if (score === null || score === undefined || score === "") return null;
  const color = score >= 75 ? "#059669" : score >= 50 ? "#D97706" : "#DC2626";
  return (
    <span style={{ fontSize: 12, fontWeight: 800, color, background: color + "18", padding: "3px 9px", borderRadius: 99 }}>{score}</span>
  );
};

export const Stat = ({ label, value, color, warn, sub }) => (
  <div style={{ background: "#fff", border: `1.5px solid ${warn ? "#FECACA" : "#F0F0F0"}`, borderRadius: 12, padding: "14px 16px" }}>
    <p style={{ margin: "0 0 4px", fontSize: 11, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</p>
    <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: color || "#111" }}>{value}</p>
    {sub && <p style={{ margin: "2px 0 0", fontSize: 11, color: warn ? "#DC2626" : "#aaa" }}>{sub}</p>}
  </div>
);

export const Empty = ({ msg }) => <div style={{ textAlign: "center", padding: "40px 20px", color: "#aaa", fontSize: 13 }}>{msg}</div>;

export const BarChart = ({ data, colorFn, maxH = 120, labelKey = "label", valueKey = "count" }) => {
  const max = Math.max(...data.map((d) => d[valueKey] || 0), 1);
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "flex-end", height: maxH + 30, paddingTop: 10 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#555", marginBottom: 4 }}>{d[valueKey] || 0}</span>
          <div style={{ width: "100%", borderRadius: "4px 4px 0 0", background: colorFn ? colorFn(d, i) : "#6366F1", height: `${Math.max(4, ((d[valueKey] || 0) / max) * maxH)}px`, transition: "height .3s", minHeight: d[valueKey] > 0 ? 8 : 3, opacity: d[valueKey] > 0 ? 1 : 0.2 }} />
          <span style={{ fontSize: 10, color: "#888", marginTop: 4, textAlign: "center", wordBreak: "break-word", lineHeight: 1.2 }}>{d[labelKey]}</span>
        </div>
      ))}
    </div>
  );
};

export const STAGES = ["CV Submitted", "Screening", "Interview", "Offer", "Placed", "Rejected", "Withdrawn"];
