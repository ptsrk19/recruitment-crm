import { useEffect, useState } from "react";
import api from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { fmtDate, daysBetween, todayStr, fmtL, INR } from "../../utils/format";
import { Btn, Field, Input, Sel, Modal, Tag, Empty } from "../../components/ui";
import Icon from "../../components/Icon";

const defaults = { name: "", contact: "", email: "", phone: "", industry: "", gstin: "", billingRate: "8.33", paymentTerms: "30", useBins: false, ctcBins: [], billingAddress: "", msaExpiry: "" };

export default function AdminClients() {
  const toast = useToast();
  const [clients, setClients] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [credModal, setCredModal] = useState(null);

  const load = () => api.get("/clients").then((res) => setClients(res.data));
  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.name) return toast("Client name is required", "error");
    try {
      if (modal === "add") await api.post("/clients", form);
      else await api.put(`/clients/${form.id}`, form);
      toast(modal === "add" ? "Client added" : "Client updated");
      setModal(null);
      load();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const del = async (id) => {
    if (!confirm("Delete this client? This cannot be undone.")) return;
    try {
      await api.delete(`/clients/${id}`);
      toast("Client deleted");
      load();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const addBin = () => setForm({ ...form, ctcBins: [...(form.ctcBins || []), { ctcMin: "", ctcMax: "", type: "PERCENTAGE", value: "" }] });
  const updateBin = (i, key, val) => {
    const bins = [...form.ctcBins];
    bins[i] = { ...bins[i], [key]: val };
    setForm({ ...form, ctcBins: bins });
  };
  const removeBin = (i) => setForm({ ...form, ctcBins: form.ctcBins.filter((_, idx) => idx !== i) });

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Clients</h2>
        <Btn onClick={() => { setForm(defaults); setModal("add"); }}>
          <Icon name="plus" size={15} />Add Client
        </Btn>
      </div>

      {clients.length === 0 ? (
        <Empty msg="No clients yet. Add your first client using the button above." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {clients.map((c) => {
            const days = c.msaExpiry ? daysBetween(todayStr(), c.msaExpiry) : null;
            const msaStatus = days === null ? "No MSA" : days < 0 ? "Expired" : days <= 60 ? `${days}d left` : "Active";
            const msaColor = days === null ? "#aaa" : days < 0 ? "#DC2626" : days <= 60 ? "#D97706" : "#059669";
            return (
              <div key={c.id} style={{ background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 12, padding: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 16, fontWeight: 700 }}>{c.name}</span>
                      {c.industry && <Tag label={c.industry} />}
                      <span style={{ fontSize: 11, fontWeight: 600, color: msaColor, background: msaColor + "18", padding: "2px 8px", borderRadius: 99 }}>MSA: {msaStatus}</span>
                    </div>
                    <p style={{ margin: "0 0 4px", fontSize: 13, color: "#555" }}>
                      {c.contact} · {c.email} · {c.phone}
                    </p>
                    <div style={{ display: "flex", gap: 14, fontSize: 12, color: "#888", flexWrap: "wrap" }}>
                      {c.useBins && c.ctcBins?.length > 0 ? (
                        <span>
                          Billing: <strong style={{ color: "#6366F1" }}>CTC Slab ({c.ctcBins.length} tiers)</strong>
                        </span>
                      ) : (
                        <span>
                          Billing Rate: <strong>{c.billingRate || "—"}%</strong>
                        </span>
                      )}
                      <span>
                        Payment Terms: <strong>{c.paymentTerms || "—"} days</strong>
                      </span>
                      <span>
                        GSTIN: <strong>{c.gstin || "—"}</strong>
                      </span>
                    </div>
                    {c.useBins && c.ctcBins?.length > 0 && (
                      <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {[...c.ctcBins].sort((a, b) => Number(a.ctcMin) - Number(b.ctcMin)).map((bin, i) => (
                          <span key={i} style={{ fontSize: 11, background: "#EEF2FF", color: "#4338CA", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>
                            {bin.ctcMax ? `${fmtL(bin.ctcMin)}–${fmtL(bin.ctcMax)}` : `${fmtL(bin.ctcMin)}+`} → {bin.type === "FLAT" ? INR(bin.value) : `${bin.value}%`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => { setForm({ ...c }); setModal("edit"); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#6366F1", padding: 4 }}>
                      <Icon name="edit" size={15} />
                    </button>
                    <button onClick={() => del(c.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#EF4444", padding: 4 }}>
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                </div>
                <div style={{ borderTop: "1px solid #F5F5F5", paddingTop: 10, display: "flex", justifyContent: "flex-end" }}>
                  <button onClick={() => setCredModal(c)} style={{ fontSize: 11, border: "1px solid #E5E7EB", background: "none", cursor: "pointer", color: "#6366F1", padding: "4px 10px", borderRadius: 6, fontWeight: 600 }}>
                    Set / Reset Portal Access
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={modal === "add" ? "Add Client" : "Edit Client"} onClose={() => setModal(null)} width={640}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Company Name"><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Contact Person"><Input value={form.contact || ""} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></Field>
            <Field label="Email"><Input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Industry"><Input value={form.industry || ""} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></Field>
            <Field label="GSTIN" hint="First 2 digits decide CGST/SGST vs IGST on invoices"><Input value={form.gstin || ""} onChange={(e) => setForm({ ...form, gstin: e.target.value })} placeholder="27AABCX1234A1Z5" /></Field>
            <Field label="Payment Terms (days)"><Input type="number" value={form.paymentTerms || ""} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })} /></Field>
            <Field label="MSA Expiry"><Input type="date" value={form.msaExpiry || ""} onChange={(e) => setForm({ ...form, msaExpiry: e.target.value })} /></Field>
          </div>
          <Field label="Billing Address"><Input value={form.billingAddress || ""} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} /></Field>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 12, cursor: "pointer" }}>
            <input type="checkbox" checked={!!form.useBins} onChange={(e) => setForm({ ...form, useBins: e.target.checked })} />
            Use CTC-based billing slabs instead of a flat rate
          </label>

          {form.useBins ? (
            <div style={{ marginBottom: 16 }}>
              {(form.ctcBins || []).map((bin, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <Input type="number" placeholder="Min CTC" value={bin.ctcMin} onChange={(e) => updateBin(i, "ctcMin", e.target.value)} style={{ width: 120 }} />
                  <Input type="number" placeholder="Max CTC (blank = no cap)" value={bin.ctcMax} onChange={(e) => updateBin(i, "ctcMax", e.target.value)} style={{ width: 170 }} />
                  <Sel value={bin.type || "PERCENTAGE"} onChange={(e) => updateBin(i, "type", e.target.value)} style={{ width: 110 }}>
                    <option value="PERCENTAGE">% of CTC</option>
                    <option value="FLAT">Flat fee ₹</option>
                  </Sel>
                  <Input
                    type="number"
                    placeholder={bin.type === "FLAT" ? "Amount ₹" : "Rate %"}
                    value={bin.value ?? ""}
                    onChange={(e) => updateBin(i, "value", e.target.value)}
                    style={{ width: 110 }}
                  />
                  <button onClick={() => removeBin(i)} style={{ border: "none", background: "none", color: "#EF4444", cursor: "pointer" }}><Icon name="trash" size={14} /></button>
                </div>
              ))}
              <Btn small variant="secondary" onClick={addBin}><Icon name="plus" size={12} />Add Tier</Btn>
              <p style={{ fontSize: 11, color: "#aaa", marginTop: 8 }}>
                Example: "0 – 8,00,000 → Flat fee ₹15,000" then "8,00,000+ → 4% of CTC" — mix flat and percentage tiers freely.
              </p>
            </div>
          ) : (
            <Field label="Flat Billing Rate (%)"><Input type="number" step="0.01" value={form.billingRate || ""} onChange={(e) => setForm({ ...form, billingRate: e.target.value })} /></Field>
          )}

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>{modal === "add" ? "Add" : "Save"}</Btn>
          </div>
        </Modal>
      )}

      {credModal && <PortalCredModal client={credModal} onClose={() => setCredModal(null)} toast={toast} />}
    </div>
  );
}

function PortalCredModal({ client, onClose, toast }) {
  const [email, setEmail] = useState(client.email || "");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(client.contact || "");

  const save = async () => {
    if (!email || !password) return toast("Email and password are required", "error");
    try {
      await api.post(`/clients/${client.id}/portal-user`, { email, password, name });
      toast("Portal access saved. Share the password with your client securely.");
      onClose();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  return (
    <Modal title={`Portal Access — ${client.name}`} onClose={onClose}>
      <div style={{ background: "#FEF3C7", borderRadius: 8, padding: "8px 12px", marginBottom: 14, fontSize: 12, color: "#78350F" }}>
        Set a password and share it with the client through a secure channel (not email in plain text). It will not be shown here again.
      </div>
      <Field label="Contact Name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="Login Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="New Password" hint="At least 8 characters"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
        <Btn onClick={save}>Save</Btn>
      </div>
    </Modal>
  );
}
