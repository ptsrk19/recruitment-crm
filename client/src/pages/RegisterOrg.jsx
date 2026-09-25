import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Field, Input, Btn } from "../components/ui";

// BUG FIXED / FEATURE: the original app had exactly one hard-coded tenant
// ("Closure Point") baked into the source. This page is how a new
// recruitment agency gets its own fully isolated Organization — its own
// clients, candidates, invoices and users, invisible to every other tenant.
export default function RegisterOrg() {
  const { registerOrg } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ orgName: "", adminName: "", adminEmail: "", adminPassword: "", gstin: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await registerOrg(form);
      navigate("/");
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(145deg,#1E1B4B 0%,#065F46 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "system-ui,sans-serif", padding: 24 }}>
      <form onSubmit={submit} style={{ background: "#fff", borderRadius: 20, padding: "40px", width: "100%", maxWidth: 460, boxShadow: "0 32px 80px #0004" }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 900, color: "#1E1B4B" }}>Set up your agency</h1>
          <p style={{ margin: 0, color: "#888", fontSize: 13 }}>Creates a private workspace only your team can see</p>
        </div>
        {err && <div style={{ background: "#FEE2E2", color: "#DC2626", padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 13 }}>{err}</div>}
        <Field label="Agency / Company Name">
          <Input required value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} />
        </Field>
        <Field label="GSTIN" hint="Used to decide CGST+SGST vs IGST on invoices. You can add this later.">
          <Input value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value })} placeholder="27AABCX1234A1Z5" />
        </Field>
        <Field label="Your Name">
          <Input required value={form.adminName} onChange={(e) => setForm({ ...form, adminName: e.target.value })} />
        </Field>
        <Field label="Your Email">
          <Input type="email" required value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
        </Field>
        <Field label="Password" hint="At least 8 characters">
          <Input type="password" required minLength={8} value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} />
        </Field>
        <Btn type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center", marginTop: 6 }}>
          {busy ? "Creating…" : "Create Workspace"}
        </Btn>
        <p style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "#888" }}>
          Already have an account? <Link to="/login" style={{ color: "#6366F1", fontWeight: 600 }}>Sign in</Link>
        </p>
      </form>
    </div>
  );
}
