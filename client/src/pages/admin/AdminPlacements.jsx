import { useEffect, useState } from "react";
import api from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { todayStr, fmtDate, fmtL, INR, getInvoiceAge } from "../../utils/format";
import { Btn, Field, Input, Sel, Textarea, Modal, Badge, Avatar, Stat, Empty } from "../../components/ui";
import Icon from "../../components/Icon";

const defaults = { candidateId: "", jobId: "", clientId: "", startDate: todayStr(), ctc: "", feedback: "" };

export default function AdminPlacements() {
  const toast = useToast();
  const [placements, setPlacements] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [invModal, setInvModal] = useState(null);
  const [invForm, setInvForm] = useState({});

  const load = () => {
    api.get("/placements").then((res) => setPlacements(res.data));
    api.get("/invoices").then((res) => setInvoices(res.data));
    api.get("/candidates").then((res) => setCandidates(res.data));
    api.get("/jobs").then((res) => setJobs(res.data));
    api.get("/clients").then((res) => setClients(res.data));
  };
  useEffect(load, []);

  const save = async () => {
    if (!form.candidateId || !form.jobId || !form.clientId) return toast("Candidate, job and client are required", "error");
    try {
      if (modal === "add") await api.post("/placements", form);
      else await api.put(`/placements/${form.id}`, form);
      toast(modal === "add" ? "Placement recorded" : "Placement updated");
      setModal(null);
      load();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const genInvoice = async (p) => {
    try {
      const res = await api.post(`/placements/${p.id}/generate-invoice`);
      if (res.data.gstStateMatchKnown === false) {
        toast("Invoice created — but the client or your org is missing a GSTIN, so it defaulted to CGST+SGST. Double-check before publishing.", "warning");
      } else {
        toast("Invoice generated");
      }
      load();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const totalCollected = invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + (i.totalAmount || 0), 0);
  const today = todayStr();
  const outstanding = invoices.filter((i) => i.status !== "Paid" && (!i.dueDate || i.dueDate >= today)).reduce((s, i) => s + (i.totalAmount || 0), 0);
  const overdue = invoices.filter((i) => i.status !== "Paid" && i.dueDate && i.dueDate < today).reduce((s, i) => s + (i.totalAmount || 0), 0);

  const saveInvoice = async () => {
    try {
      await api.put(`/invoices/${invForm.id}`, invForm);
      toast("Invoice updated");
      setInvModal(null);
      load();
    } catch (e) {
      toast(e.message, "error");
    }
  };
  const publish = async (inv) => {
    try {
      await api.post(`/invoices/${inv.id}/publish`);
      toast("Invoice published to client portal");
      load();
    } catch (e) {
      toast(e.message, "error");
    }
  };
  const deleteInvoice = async (inv) => {
    if (!confirm(`Delete invoice ${inv.invoiceNo}?`)) return;
    await api.delete(`/invoices/${inv.id}`);
    load();
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 18px" }}>Placements & Invoices</h2>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <Stat label="Collected" value={INR(totalCollected)} color="#059669" />
        <Stat label="Outstanding" value={INR(outstanding)} color="#3B82F6" />
        <Stat label="Overdue" value={INR(overdue)} color="#DC2626" warn={overdue > 0} />
        <Stat label="Total Invoices" value={invoices.length} color="#6366F1" />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Placements</h3>
        <Btn small onClick={() => { setForm(defaults); setModal("add"); }}><Icon name="plus" size={13} />Record Placement</Btn>
      </div>

      {placements.length === 0 ? (
        <Empty msg="No placements recorded yet." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
          {placements.map((p) => {
            const cand = candidates.find((c) => c.id === p.candidateId);
            const job = jobs.find((j) => j.id === p.jobId);
            const cl = clients.find((c) => c.id === p.clientId);
            return (
              <div key={p.id} style={{ background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ display: "flex", gap: 14 }}>
                  <Avatar name={cand?.name} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700 }}>{cand?.name}</span>
                      <span style={{ color: "#888" }}>→</span>
                      <span style={{ fontWeight: 600, color: "#555" }}>{job?.title}</span>
                      <Badge text={p.invoiceStatus} />
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "#666" }}>
                      {cl?.name} · Start: {fmtDate(p.startDate)} · CTC: {fmtL(p.ctc || 0)} · Fee: {fmtL(p.fee || 0)}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    {!p.invoice && (
                      <Btn small variant="secondary" onClick={() => genInvoice(p)}>
                        <Icon name="invoices" size={13} />Generate Invoice
                      </Btn>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 10px" }}>Invoices</h3>
      {invoices.length === 0 ? (
        <Empty msg="No invoices yet." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {invoices.map((inv) => {
            const cl = clients.find((c) => c.id === inv.clientId);
            const age = getInvoiceAge(inv);
            return (
              <div key={inv.id} style={{ background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700 }}>{inv.invoiceNo}</span>
                    <Badge text={inv.status} />
                    <span style={{ fontSize: 10, color: "#888" }}>{inv.taxType === "IGST" ? "IGST (inter-state)" : "CGST+SGST (intra-state)"}</span>
                    <span style={{ fontSize: 10, color: "#6366F1", background: "#EEF2FF", padding: "1px 7px", borderRadius: 99, fontWeight: 700 }}>
                      {inv.billingType === "FLAT" ? `Flat ${INR(inv.billingRate || 0)}` : `${inv.billingRate || 0}%`}
                    </span>
                  </div>
                  <p style={{ margin: "0 0 4px", fontSize: 13, color: "#666" }}>
                    {cl?.name} · Issued: {fmtDate(inv.issuedAt)} · Due: {fmtDate(inv.dueDate)} {age && <span style={{ fontWeight: 700, color: age.color }}>· {age.label}</span>}
                  </p>
                  <div style={{ display: "flex", gap: 10, fontSize: 12, color: "#888" }}>
                    <span>Fee: {INR(inv.feeAmount || 0)}</span>
                    <span>SGST: {INR(inv.sgst || 0)}</span>
                    <span>CGST: {INR(inv.cgst || 0)}</span>
                    <span>IGST: {INR(inv.igst || 0)}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: "0 0 8px", fontWeight: 800, fontSize: 18 }}>{INR(inv.totalAmount || 0)}</p>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}>
                    <Btn small variant="secondary" onClick={() => { setInvForm({ ...inv }); setInvModal(inv.id); }}>Edit</Btn>
                    {!inv.published && <Btn small variant="green" onClick={() => publish(inv)}>Publish</Btn>}
                    <Btn small variant="blue" onClick={() => window.open(`${api.defaults.baseURL}/invoices/${inv.id}/html?token=${encodeURIComponent(localStorage.getItem("token"))}`, "_blank")}>Print</Btn>
                    <Btn small variant="danger" onClick={() => deleteInvoice(inv)}>Delete</Btn>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={modal === "add" ? "Record Placement" : "Edit Placement"} onClose={() => setModal(null)}>
          <Field label="Candidate">
            <Sel value={form.candidateId || ""} onChange={(e) => setForm({ ...form, candidateId: e.target.value })}>
              <option value="">Select…</option>
              {candidates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Sel>
          </Field>
          <Field label="Job">
            <Sel value={form.jobId || ""} onChange={(e) => { const j = jobs.find((j) => j.id === e.target.value); setForm({ ...form, jobId: e.target.value, clientId: j?.clientId || form.clientId }); }}>
              <option value="">Select…</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </Sel>
          </Field>
          <Field label="Client">
            <Sel value={form.clientId || ""} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">Select…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Sel>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Start Date"><Input type="date" value={form.startDate || ""} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
            <Field label="CTC (₹)"><Input type="number" value={form.ctc || ""} onChange={(e) => setForm({ ...form, ctc: e.target.value })} /></Field>
          </div>
          <Field label="Feedback"><Textarea value={form.feedback || ""} onChange={(e) => setForm({ ...form, feedback: e.target.value })} /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>{modal === "add" ? "Record" : "Save"}</Btn>
          </div>
        </Modal>
      )}

      {invModal && (
        <Modal title={`Edit Invoice ${invForm.invoiceNo}`} onClose={() => setInvModal(null)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="CTC (₹)"><Input type="number" value={invForm.ctc || ""} onChange={(e) => setInvForm({ ...invForm, ctc: e.target.value })} /></Field>
            <Field label="Billing Type">
              <Sel value={invForm.billingType || "PERCENTAGE"} onChange={(e) => setInvForm({ ...invForm, billingType: e.target.value })}>
                <option value="PERCENTAGE">% of CTC</option>
                <option value="FLAT">Flat fee ₹</option>
              </Sel>
            </Field>
            <Field label={invForm.billingType === "FLAT" ? "Flat Fee (₹)" : "Billing Rate (%)"}>
              <Input type="number" step="0.01" value={invForm.billingRate || ""} onChange={(e) => setInvForm({ ...invForm, billingRate: e.target.value })} />
            </Field>
            <Field label="Due Date"><Input type="date" value={invForm.dueDate || ""} onChange={(e) => setInvForm({ ...invForm, dueDate: e.target.value })} /></Field>
            <Field label="Status">
              <Sel value={invForm.status || "Draft"} onChange={(e) => setInvForm({ ...invForm, status: e.target.value })}>
                <option>Draft</option><option>Unpaid</option><option>Paid</option>
              </Sel>
            </Field>
          </div>
          <p style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>Fee is CTC × rate for percentage billing, or the flat amount as-is for flat fee billing. GST is then recalculated from each party's GSTIN state code when you save.</p>
          <Field label="Notes"><Textarea value={invForm.notes || ""} onChange={(e) => setInvForm({ ...invForm, notes: e.target.value })} /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setInvModal(null)}>Cancel</Btn>
            <Btn onClick={saveInvoice}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
