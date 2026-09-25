import { useEffect, useState } from "react";
import api from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { Btn, Field, Input, Sel, Textarea, Modal, Badge, Empty } from "../../components/ui";
import Icon from "../../components/Icon";

const defaults = { title: "", clientId: "", status: "Open", salaryMin: "", salaryMax: "", location: "", description: "", workMode: "Hybrid", openPositions: "1", noticePeriodDays: "30", needByDate: "", experienceMin: "", experienceMax: "", skills: "", assignedRecruiters: [] };

export default function AdminJobs() {
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const load = () => {
    api.get("/jobs").then((res) => setJobs(res.data));
    api.get("/clients").then((res) => setClients(res.data));
    api.get("/recruiters").then((res) => setRecruiters(res.data));
  };
  useEffect(load, []);

  const save = async () => {
    if (!form.clientId || !form.title) return toast("Client and job title are required", "error");
    try {
      if (modal === "add") await api.post("/jobs", form);
      else await api.put(`/jobs/${form.id}`, form);
      toast(modal === "add" ? "Job added" : "Job updated");
      setModal(null);
      load();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const del = async (id) => {
    if (!confirm("Delete this job order?")) return;
    try {
      await api.delete(`/jobs/${id}`);
      load();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const adjust = async (job, delta) => {
    let reason;
    if (delta < 0) {
      reason = window.prompt("Reason for reducing headcount?", "Closed Internally");
      if (!reason) return;
    }
    try {
      await api.post(`/jobs/${job.id}/adjust-positions`, { delta, reason });
      load();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const toggleRecruiter = (rid) => {
    const list = form.assignedRecruiters || [];
    setForm({ ...form, assignedRecruiters: list.includes(rid) ? list.filter((x) => x !== rid) : [...list, rid] });
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Jobs</h2>
        <Btn onClick={() => { setForm(defaults); setModal("add"); }}><Icon name="plus" size={15} />Add Job</Btn>
      </div>
      {jobs.length === 0 ? (
        <Empty msg="No jobs yet." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {jobs.map((j) => {
            const cl = clients.find((c) => c.id === j.clientId);
            const remaining = Math.max(0, (j.openPositions || 1) - (j.closedPositions || 0));
            return (
              <div key={j.id} style={{ background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 12, padding: "16px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{j.title}</span>
                      <Badge text={j.status} />
                      {j.postedByClient && <span style={{ fontSize: 10, background: "#EEF2FF", color: "#6366F1", padding: "1px 6px", borderRadius: 99 }}>Posted by client</span>}
                    </div>
                    <p style={{ margin: "0 0 4px", fontSize: 13, color: "#666" }}>
                      {cl?.name} · {j.location} · {remaining} of {j.openPositions} open
                    </p>
                    <p style={{ margin: 0, fontSize: 12, color: "#888" }}>{j.skills}</p>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button onClick={() => adjust(j, -1)} disabled={remaining <= 0} style={{ border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>− Close 1</button>
                    <button onClick={() => adjust(j, 1)} style={{ border: "1px solid #6EE7B7", background: "#F0FDF4", color: "#065F46", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer" }}>+ Add 1</button>
                    <button onClick={() => { setForm({ ...j, salaryMin: j.salaryMin ?? "", salaryMax: j.salaryMax ?? "" }); setModal("edit"); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#6366F1", padding: 4 }}><Icon name="edit" size={15} /></button>
                    <button onClick={() => del(j.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#EF4444", padding: 4 }}><Icon name="trash" size={15} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={modal === "add" ? "Add Job" : "Edit Job"} onClose={() => setModal(null)} width={640}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Job Title"><Input value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
            <Field label="Client">
              <Sel value={form.clientId || ""} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
                <option value="">Select…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Sel>
            </Field>
            <Field label="Location"><Input value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
            <Field label="Work Mode">
              <Sel value={form.workMode || "Hybrid"} onChange={(e) => setForm({ ...form, workMode: e.target.value })}>
                <option>Onsite</option><option>Hybrid</option><option>Remote</option>
              </Sel>
            </Field>
            <Field label="Open Positions"><Input type="number" min="1" value={form.openPositions || "1"} onChange={(e) => setForm({ ...form, openPositions: e.target.value })} /></Field>
            <Field label="Status">
              <Sel value={form.status || "Open"} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option>Open</option><option>On Hold</option><option>Filled</option>
              </Sel>
            </Field>
          </div>
          <Field label="Skills (comma separated)"><Input value={form.skills || ""} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></Field>
          <Field label="Description"><Textarea value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Assigned Recruiters">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {recruiters.map((r) => (
                <label key={r.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, border: "1px solid #E5E7EB", padding: "4px 8px", borderRadius: 6, cursor: "pointer" }}>
                  <input type="checkbox" checked={(form.assignedRecruiters || []).includes(r.id)} onChange={() => toggleRecruiter(r.id)} />
                  {r.name}
                </label>
              ))}
            </div>
          </Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>{modal === "add" ? "Add" : "Save"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
