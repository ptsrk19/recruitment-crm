import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Field, Input, Btn } from "../components/ui";

// BUG FIXED: the original login screen printed every demo account's email
// AND plaintext password directly on the public page, and checked passwords
// entirely in client-side JS. This is now a plain login form that calls the
// backend, which hashes and verifies credentials server-side.
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(145deg,#1E1B4B 0%,#065F46 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui,sans-serif", padding: 24 }}>
      <form onSubmit={submit} style={{ background: "#fff", borderRadius: 20, padding: "40px", width: "100%", maxWidth: 420, boxShadow: "0 32px 80px #0004" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 24, fontWeight: 900, color: "#1E1B4B" }}>Recruitment CRM</h1>
          <p style={{ margin: 0, color: "#888", fontSize: 14 }}>Sign in to your workspace</p>
        </div>
        {err && <div style={{ background: "#FEE2E2", color: "#DC2626", padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{err}</div>}
        <Field label="Email">
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </Field>
        <Field label="Password">
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        <Btn type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>
          {busy ? "Signing in…" : "Sign In"}
        </Btn>
        <p style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "#888" }}>
          New agency? <Link to="/register" style={{ color: "#6366F1", fontWeight: 600 }}>Set up your workspace</Link>
        </p>
      </form>
    </div>
  );
}
