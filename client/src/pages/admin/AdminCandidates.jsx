import { useEffect, useState } from "react";
import api, { fileUrl } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { todayStr, fmtDate } from "../../utils/format";
import { Btn, Field, Input, Sel, Textarea, Modal, Avatar, Badge, ScorePill, Tag, Empty, STAGES } from "../../components/ui";
import Icon from "../../components/Icon";

const defaults = { name: "", email: "", phone: "", role: "", status: "CV Submitted", tags: "", notes: "", jobId: "", clientId: "", recruiterId: "", createdAt: todayStr(), aiScore: "" };

export default function AdminCandidates() {
  const toast = useToast();
  const [candidates, setCandidates] = useState([]);
  const [clients, setClients] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [recruiters, setRecruiters] = useState([]);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("All");
  const [clientFilter, setClientFilter] = useState("All");
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const load = () => {
    api.get("/candidates").then((res) => setCandidates(res.data));
    api.get("/clients").then((res) => setClients(res.data));
    api.get("/jobs").then((res) => setJobs(res.data));
    api.get("/recruiters").then((res) => setRecruiters(res.data));
  };
  useEffect(load, []);

  const filtered = candidates.filter((c) => {
    const q = search.toLowerCase();
    return (!q || c.name.toLowerCase().includes(q) || (c.role || "").toLowerCase().includes(q)) && (stageFilter === "All" || c.status === stageFilter) && (clientFilter === "All" || c.clientId === clientFilter);
  });

  const save = async () => {
    if (!form.name || !form.email) return toast("Candidate name and email are required", "error");
    const tags = form.tags ? String(form.tags).split(",").map((t) => t.trim()).filter(Boolean) : [];
    try {
      if (modal === "add") await api.post("/candidates", { ...form, tags });
      else await api.put(`/candidates/${form.id}`, { ...form, tags });
      toast(modal === "add" ? "Candidate added" : "Candidate updated");
      setModal(null);
      load();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const del = async (id) => {
    if (!confirm("Delete this candidate? This cannot be undone.")) return;
    try {
      await api.delete(`/candidates/${id}`);
      toast("Candidate deleted");
      load();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const uploadFile = async (candidateId, field, file) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api.post(`/candidates/${candidateId}/${field}`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast("File uploaded");
      load();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Candidates</h2>
        <Btn onClick={() => { setForm(defaults); setModal("add"); }}><Icon name="plus" size={15} />Add</Btn>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" style={{ flex: 1, minWidth: 160 }} />
        <Sel value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} style={{ width: 150 }}>
          <option>All</option>
          {STAGES.map((s) => <option key={s}>{s}</option>)}
        </Sel>
        <Sel value={clientFilter} onChange={(e) => setClientFilter(e.target.value)} style={{ width: 170 }}>
          <option value="All">All Clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Sel>
      </div>

      <p style={{ fontSize: 12, color: "#aaa", marginBottom: 10 }}>{filtered.length} shown</p>

      {filtered.length === 0 ? (
        <Empty msg="No candidates match. Try clearing filters or add your first candidate." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((c) => {
            const cl = clients.find((x) => x.id === c.clientId);
            const job = jobs.find((j) => j.id === c.jobId);
            const rec = recruiters.find((r) => r.id === c.recruiterId);
            return (
              <div key={c.id} style={{ background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar name={c.name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{c.name}</span>
                    <Badge text={c.status} />
                    {c.isDuplicate && <span style={{ fontSize: 10, background: "#FEE2E2", color: "#DC2626", padding: "2px 7px", borderRadius: 99, fontWeight: 700 }}>⚠ Duplicate</span>}
                    {cl && <Tag label={cl.name} />}
                    {rec && <span style={{ fontSize: 11, color: "#6366F1", background: "#EEF2FF", padding: "1px 7px", borderRadius: 4 }}>{rec.name}</span>}
                  </div>
                  <p style={{ margin: "0 0 4px", fontSize: 13, color: "#666" }}>
                    {c.role}
                    {job ? " · " + job.title : ""}
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {c.cvFile ? (
                      <a href={fileUrl(c.cvFile.id)} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#3B82F6", background: "#EFF6FF", padding: "2px 8px", borderRadius: 4 }}>
                        <Icon name="pdf" size={11} /> CV
                      </a>
                    ) : (
                      <label style={{ fontSize: 11, color: "#888", cursor: "pointer" }}>
                        + Upload CV
                        <input type="file" style={{ display: "none" }} onChange={(e) => e.target.files[0] && uploadFile(c.id, "cv", e.target.files[0])} />
                      </label>
                    )}
                    {(c.tags || []).map((t) => <Tag key={t} label={t} />)}
                    <span style={{ fontSize: 11, color: "#bbb" }}>{fmtDate(c.createdAt)}</span>
                  </div>
                </div>
                <ScorePill score={c.aiScore} />
                <button onClick={() => { setForm({ ...c, tags: (c.tags || []).join(","), aiScore: c.aiScore || "" }); setModal("edit"); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#6366F1", padding: 4 }}>
                  <Icon name="edit" size={15} />
                </button>
                <button onClick={() => del(c.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#EF4444", padding: 4 }}>
                  <Icon name="trash" size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={modal === "add" ? "Add Candidate" : "Edit Candidate"} onClose={() => setModal(null)} width={640}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Full Name"><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Email"><Input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Phone"><Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Role Applied For"><Input value={form.role || ""} onChange={(e) => setForm({ ...form, role: e.target.value })} /></Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Status">
              <Sel value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STAGES.map((s) => <option key={s}>{s}</option>)}
              </Sel>
            </Field>
            <Field label="Client">
              <Sel value={form.clientId || ""} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
                <option value="">—</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Sel>
            </Field>
            <Field label="Job">
              <Sel value={form.jobId || ""} onChange={(e) => setForm({ ...form, jobId: e.target.value })}>
                <option value="">—</option>
                {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
              </Sel>
            </Field>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Recruiter">
              <Sel value={form.recruiterId || ""} onChange={(e) => setForm({ ...form, recruiterId: e.target.value })}>
                <option value="">—</option>
                {recruiters.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </Sel>
            </Field>
            <Field label="Submission Date"><Input type="date" value={form.createdAt} onChange={(e) => setForm({ ...form, createdAt: e.target.value })} /></Field>
            <Field label="AI Score (0–100)"><Input type="number" min={0} max={100} value={form.aiScore} onChange={(e) => setForm({ ...form, aiScore: e.target.value })} /></Field>
          </div>
          <Field label="Skills (comma separated)"><Input value={form.tags || ""} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></Field>
          <Field label="Notes"><Textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>{modal === "add" ? "Add" : "Save"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
