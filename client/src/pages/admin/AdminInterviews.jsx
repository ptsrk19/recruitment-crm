import { useEffect, useState } from "react";
import api from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { Btn, Field, Input, Sel, Textarea, Modal, Badge, Empty } from "../../components/ui";
import Icon from "../../components/Icon";

const defaults = { candidateId: "", clientId: "", jobId: "", scheduledAt: "", mode: "Video", round: "", notes: "", status: "Scheduled" };

export default function AdminInterviews() {
  const toast = useToast();
  const [interviews, setInterviews] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [clients, setClients] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const load = () => {
    api.get("/interviews").then((res) => setInterviews(res.data));
    api.get("/candidates").then((res) => setCandidates(res.data));
    api.get("/clients").then((res) => setClients(res.data));
  };
  useEffect(load, []);

  const save = async () => {
    if (!form.candidateId || !form.clientId || !form.scheduledAt) return toast("Candidate, client and date/time are required", "error");
    try {
      if (modal === "add") await api.post("/interviews", form);
      else await api.put(`/interviews/${form.id}`, form);
      toast(modal === "add" ? "Interview scheduled" : "Interview updated");
      setModal(null);
      load();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const del = async (id) => {
    if (!confirm("Cancel/delete this interview?")) return;
    await api.delete(`/interviews/${id}`);
    load();
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Interviews</h2>
        <Btn onClick={() => { setForm(defaults); setModal("add"); }}><Icon name="plus" size={15} />Schedule</Btn>
      </div>
      {interviews.length === 0 ? (
        <Empty msg="No interviews scheduled." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {interviews.map((iv) => {
            const cand = candidates.find((c) => c.id === iv.candidateId);
            const cl = clients.find((c) => c.id === iv.clientId);
            return (
              <div key={iv.id} style={{ background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 12, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700 }}>{cand?.name || "—"}</span>
                    <Badge text={iv.status} />
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "#666" }}>
                    {cl?.name} · {new Date(iv.scheduledAt).toLocaleString("en-IN")} · {iv.mode} {iv.round ? `· ${iv.round}` : ""}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => { setForm({ ...iv, scheduledAt: iv.scheduledAt?.slice(0, 16) }); setModal("edit"); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#6366F1", padding: 4 }}><Icon name="edit" size={15} /></button>
                  <button onClick={() => del(iv.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#EF4444", padding: 4 }}><Icon name="trash" size={15} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={modal === "add" ? "Schedule Interview" : "Edit Interview"} onClose={() => setModal(null)}>
          <Field label="Candidate">
            <Sel value={form.candidateId || ""} onChange={(e) => { const cand = candidates.find((c) => c.id === e.target.value); setForm({ ...form, candidateId: e.target.value, clientId: cand?.clientId || form.clientId, jobId: cand?.jobId || form.jobId }); }}>
              <option value="">Select…</option>
              {candidates.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Sel>
          </Field>
          <Field label="Client">
            <Sel value={form.clientId || ""} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">Select…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Sel>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Date & Time"><Input type="datetime-local" value={form.scheduledAt || ""} onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })} /></Field>
            <Field label="Mode">
              <Sel value={form.mode || "Video"} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                <option>Video</option><option>Phone</option><option>In-Person</option>
              </Sel>
            </Field>
            <Field label="Round"><Input value={form.round || ""} onChange={(e) => setForm({ ...form, round: e.target.value })} /></Field>
            <Field label="Status">
              <Sel value={form.status || "Scheduled"} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option>Scheduled</option><option>Completed</option><option>Cancelled</option><option>No Show</option>
              </Sel>
            </Field>
          </div>
          <Field label="Notes"><Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>{modal === "add" ? "Schedule" : "Save"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
