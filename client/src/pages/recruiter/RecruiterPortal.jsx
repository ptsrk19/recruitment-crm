import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { todayStr, fmtDate, exportToCSV } from "../../utils/format";
import { Btn, Field, Input, Sel, Modal, Avatar, Badge, ScorePill, Stat, Empty, STAGES } from "../../components/ui";
import Icon from "../../components/Icon";

const NAV = [
  { to: "", label: "Dashboard", icon: "dashboard" },
  { to: "openings", label: "Open Positions", icon: "jobs" },
  { to: "submissions", label: "My Submissions", icon: "candidates" },
  { to: "interviews", label: "Interviews", icon: "calendar" },
  { to: "reports", label: "Reports", icon: "download" },
];

export default function RecruiterPortal() {
  const { user, logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);

  const SidebarContent = () => (
    <>
      <div style={{ padding: "20px 16px 12px" }}>
        <p style={{ margin: 0, color: "#fff", fontWeight: 800, fontSize: 13 }}>Recruiter Portal</p>
        <p style={{ margin: 0, fontSize: 12, color: "#FCD34D" }}>Hi, {user?.name}</p>
      </div>
      <nav style={{ flex: 1, padding: "4px 10px" }}>
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === ""} onClick={() => setNavOpen(false)} style={({ isActive }) => ({ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, marginBottom: 2, textDecoration: "none", background: isActive ? "#F59E0B" : "transparent", color: isActive ? "#fff" : "#FCD34D", fontSize: 14, fontWeight: isActive ? 600 : 400 })}>
            <Icon name={item.icon} size={17} />{item.label}
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: "12px 20px 20px", borderTop: "1px solid #92400E" }}>
        <button onClick={logout} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "#FCD34D", cursor: "pointer", fontSize: 13, padding: 0 }}>
          <Icon name="logout" size={16} />Sign out
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#FFFBEB", fontFamily: "system-ui,sans-serif" }}>
      <aside style={{ width: 220, background: "#78350F", flexShrink: 0, position: "sticky", top: 0, height: "100vh", display: "flex", flexDirection: "column" }} className="desktop-sidebar">
        <SidebarContent />
      </aside>
      <div style={{ display: "none" }} className="mobile-topbar">
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, background: "#78350F", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", height: 56 }}>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>Recruiter Portal</span>
          <button onClick={() => setNavOpen(!navOpen)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 20 }}>☰</button>
        </div>
        {navOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => setNavOpen(false)}>
            <div style={{ position: "absolute", top: 56, left: 0, bottom: 0, width: 220, background: "#78350F", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
              <SidebarContent />
            </div>
          </div>
        )}
      </div>
      <main style={{ flex: 1, overflowY: "auto", padding: "24px 16px" }} className="main-content">
        <Routes>
          <Route index element={<RecruiterDashboard />} />
          <Route path="openings" element={<RecruiterOpenings />} />
          <Route path="submissions" element={<RecruiterSubmissions />} />
          <Route path="interviews" element={<RecruiterInterviews />} />
          <Route path="reports" element={<RecruiterReports />} />
        </Routes>
      </main>
    </div>
  );
}

function RecruiterDashboard() {
  const [d, setD] = useState(null);
  useEffect(() => {
    api.get("/dashboard").then((res) => setD(res.data));
  }, []);
  if (!d) return <p style={{ color: "#888" }}>Loading…</p>;
  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 22px" }}>Dashboard</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10, marginBottom: 20 }}>
        <Stat label="My Submissions" value={d.totalCandidates} color="#F59E0B" />
        <Stat label="Placed" value={d.placedCandidates} color="#059669" />
        <Stat label="Today" value={d.todayCandidates} color="#8B5CF6" sub={d.today} />
        <Stat label="Interviews Today" value={d.interviewsToday} color="#6366F1" />
      </div>
      <div style={{ background: "#fff", border: "1.5px solid #FDE68A", borderRadius: 12, padding: 20, maxWidth: 420 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px" }}>My Pipeline</h3>
        {d.pipeline.map(({ stage, count }) => (
          <div key={stage} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span style={{ fontSize: 12, minWidth: 110, color: "#555" }}>{stage}</span>
            <div style={{ flex: 1, background: "#F5F5F5", borderRadius: 99, height: 8 }}>
              <div style={{ width: `${Math.min(count * 22, 100)}%`, height: 8, borderRadius: 99, background: "#F59E0B" }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecruiterOpenings() {
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [clients, setClients] = useState([]);
  const [submitModal, setSubmitModal] = useState(null);
  const [form, setForm] = useState({});

  const load = () => {
    api.get("/jobs").then((res) => setJobs(res.data.filter((j) => j.status === "Open")));
    api.get("/clients").then((res) => setClients(res.data));
  };
  useEffect(load, []);

  const submit = async () => {
    if (!form.name || !form.email) return toast("Candidate name and email are required", "error");
    try {
      const tags = form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [];
      await api.post("/candidates", { ...form, tags, jobId: submitModal.id, clientId: submitModal.clientId });
      toast("Candidate submitted");
      setSubmitModal(null);
      setForm({});
    } catch (e) {
      toast(e.message, "error");
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 18px" }}>Open Positions</h2>
      {jobs.length === 0 ? (
        <Empty msg="No open positions assigned to you yet." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {jobs.map((j) => {
            const cl = clients.find((c) => c.id === j.clientId);
            return (
              <div key={j.id} style={{ background: "#fff", border: "1.5px solid #FDE68A", borderRadius: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <p style={{ margin: "0 0 4px", fontWeight: 700 }}>{j.title}</p>
                  <p style={{ margin: 0, fontSize: 13, color: "#666" }}>{cl?.name} · {j.location} · {j.skills}</p>
                </div>
                <Btn small onClick={() => { setForm({ name: "", email: "", phone: "", role: j.title, tags: "" }); setSubmitModal(j); }}>Submit Candidate</Btn>
              </div>
            );
          })}
        </div>
      )}

      {submitModal && (
        <Modal title={`Submit Candidate — ${submitModal.title}`} onClose={() => setSubmitModal(null)}>
          <Field label="Full Name"><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Email"><Input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label="Phone"><Input value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
          <Field label="Skills (comma separated)"><Input value={form.tags || ""} onChange={(e) => setForm({ ...form, tags: e.target.value })} /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setSubmitModal(null)}>Cancel</Btn>
            <Btn onClick={submit}>Submit</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function RecruiterSubmissions() {
  const toast = useToast();
  const [candidates, setCandidates] = useState([]);
  const load = () => api.get("/candidates").then((res) => setCandidates(res.data));
  useEffect(load, []);

  const uploadCv = async (id, file) => {
    const fd = new FormData();
    fd.append("file", file);
    try {
      await api.post(`/candidates/${id}/cv`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast("CV uploaded");
      load();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 18px" }}>My Submissions</h2>
      {candidates.length === 0 ? (
        <Empty msg="You haven't submitted any candidates yet." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {candidates.map((c) => (
            <div key={c.id} style={{ background: "#fff", border: "1.5px solid #FDE68A", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={c.name} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700 }}>{c.name}</span>
                  <Badge text={c.status} />
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "#666" }}>{c.role}</p>
                {!c.cvFile && (
                  <label style={{ fontSize: 11, color: "#6366F1", cursor: "pointer" }}>
                    + Upload CV
                    <input type="file" style={{ display: "none" }} onChange={(e) => e.target.files[0] && uploadCv(c.id, e.target.files[0])} />
                  </label>
                )}
              </div>
              <ScorePill score={c.aiScore} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecruiterInterviews() {
  const [interviews, setInterviews] = useState([]);
  const [candidates, setCandidates] = useState([]);
  useEffect(() => {
    api.get("/interviews").then((res) => setInterviews(res.data));
    api.get("/candidates").then((res) => setCandidates(res.data));
  }, []);
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 18px" }}>Interviews</h2>
      {interviews.length === 0 ? (
        <Empty msg="No interviews scheduled for your candidates." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {interviews.map((iv) => {
            const cand = candidates.find((c) => c.id === iv.candidateId);
            return (
              <div key={iv.id} style={{ background: "#fff", border: "1.5px solid #FDE68A", borderRadius: 12, padding: "14px 18px" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontWeight: 700 }}>{cand?.name}</span>
                  <Badge text={iv.status} />
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "#666" }}>{new Date(iv.scheduledAt).toLocaleString("en-IN")} · {iv.mode}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RecruiterReports() {
  const toast = useToast();
  const download = async (id) => {
    try {
      const res = await api.get(`/reports/${id}`);
      exportToCSV(res.data, `report_${id}_${todayStr()}`);
    } catch (e) {
      toast(e.message, "error");
    }
  };
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 18px" }}>Reports</h2>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          { id: "candidates", label: "My Submissions" },
          { id: "pipeline", label: "My Pipeline" },
        ].map((r) => (
          <div key={r.id} style={{ background: "#fff", border: "1.5px solid #FDE68A", borderRadius: 12, padding: 16, width: 240 }}>
            <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 13 }}>{r.label}</p>
            <Btn small variant="secondary" onClick={() => download(r.id)}><Icon name="download" size={13} />Download CSV</Btn>
          </div>
        ))}
      </div>
    </div>
  );
}
