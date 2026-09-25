import { createContext, useContext, useState, useCallback } from "react";

// BUG FIXED: the original file defined TWO separate toast systems (a
// module-level `toast()`/`ToastContainer` pair, and an unused `useToast()`
// hook with its own container) and never actually rendered either
// <ToastContainer/> anywhere in the component tree. Every `toast(...)` call
// was silently a no-op — errors like "CTC must be set" or confirmations like
// "Settings saved" never appeared. There is now exactly one system, and
// <ToastProvider> is mounted once at the root of <App/>.
const ToastContext = createContext(null);

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((msg, type = "success") => {
    const id = ++idCounter;
    setToasts((ts) => [...ts, { id, msg, type }]);
    setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 3500);
  }, []);

  const dismiss = (id) => setToasts((ts) => ts.filter((t) => t.id !== id));

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position: "fixed", bottom: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, maxWidth: 340 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              background: t.type === "error" ? "#FEE2E2" : t.type === "warning" ? "#FEF3C7" : "#D1FAE5",
              border: `1.5px solid ${t.type === "error" ? "#FECACA" : t.type === "warning" ? "#FCD34D" : "#6EE7B7"}`,
              borderRadius: 10,
              padding: "12px 16px",
              fontSize: 13,
              fontWeight: 600,
              color: t.type === "error" ? "#991B1B" : t.type === "warning" ? "#78350F" : "#065F46",
              boxShadow: "0 4px 16px #0002",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>{t.type === "error" ? "❌" : t.type === "warning" ? "⚠️" : "✅"}</span>
            <span style={{ flex: 1 }}>{t.msg}</span>
            <button onClick={() => dismiss(t.id)} style={{ background: "none", border: "none", cursor: "pointer", opacity: 0.5, fontSize: 15 }}>
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext).toast;
