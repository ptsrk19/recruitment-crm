import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import api from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { todayStr, fmtDate, INR, getInvoiceAge } from "../../utils/format";
import { Btn, Field, Input, Sel, Textarea, Modal, Avatar, Badge, Stat, Empty, STAGES } from "../../components/ui";
import Icon from "../../components/Icon";

const NAV = [
  { to: "", label: "Dashboard", icon: "dashboard" },
  { to: "myjobs", label: "My Openings", icon: "jobs" },
  { to: "submissions", label: "Submissions", icon: "candidates" },
  { to: "pipeline", label: "Pipeline", icon: "pipeline" },
  { to: "invoices", label: "Invoices", icon: "invoices" },
];

export default function ClientPortal() {
  const { user, logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);

  const SidebarContent = () => (
    <>
      <div style={{ padding: "20px 16px 12px" }}>
        <p style={{ margin: 0, color: "#fff", fontWeight: 800, fontSize: 13 }}>Client Portal</p>
        <p style={{ margin: 0, fontSize: 12, color: "#6EE7B7" }}>Hi, {user?.name}</p>
      </div>
      <nav style={{ flex: 1, padding: "4px 10px" }}>
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === ""} onClick={() => setNavOpen(false)} style={({ isActive }) => ({ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, marginBottom: 2, textDecoration: "none", background: isActive ? "#10B981" : "transparent", color: isActive ? "#fff" : "#6EE7B7", fontSize: 14, fontWeight: isActive ? 600 : 400 })}>
            <Icon name={item.icon} size={17} />{item.label}
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: "12px 20px 20px", borderTop: "1px solid #065F46" }}>
        <button onClick={logout} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "#6EE7B7", cursor: "pointer", fontSize: 13, padding: 0 }}>
          <Icon name="logout" size={16} />Sign out
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F0FDF4", fontFamily: "system-ui,sans-serif" }}>
      <aside style={{ width: 220, background: "#064E3B", flexShrink: 0, position: "sticky", top: 0, height: "100vh", display: "flex", flexDirection: "column" }} className="desktop-sidebar">
        <SidebarContent />
      </aside>
      <div style={{ display: "none" }} className="mobile-topbar">
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, background: "#064E3B", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", height: 56 }}>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>Client Portal</span>
          <button onClick={() => setNavOpen(!navOpen)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 20 }}>☰</button>
        </div>
        {navOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => setNavOpen(false)}>
            <div style={{ position: "absolute", top: 56, left: 0, bottom: 0, width: 220, background: "#064E3B", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
              <SidebarContent />
            </div>
          </div>
        )}
      </div>
      <main style={{ flex: 1, overflowY: "auto", padding: "24px 16px" }} className="main-content">
        <Routes>
          <Route index element={<ClientDashboard />} />
          <Route path="myjobs" element={<ClientJobs />} />
          <Route path="submissions" element={<ClientSubmissions />} />
          <Route path="pipeline" element={<ClientPipeline />} />
          <Route path="invoices" element={<ClientInvoices />} />
        </Routes>
      </main>
    </div>
  );
}

function ClientDashboard() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  useEffect(() => {
    api.get("/dashboard").then((res) => setD(res.data));
  }, []);
  if (!d) return <p style={{ color: "#888" }}>Loading…</p>;
  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 6px" }}>Welcome, {user?.name}</h2>
      <p style={{ margin: "0 0 22px", color: "#666", fontSize: 14 }}>Recruitment Dashboard</p>
      {d.overdueInvoices > 0 && (
        <div style={{ background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="warning" size={15} />
          <span><strong>{d.overdueInvoices} invoice{d.overdueInvoices > 1 ? "s" : ""} overdue</strong> — {INR(d.overdueAmount)} pending payment</span>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10, marginBottom: 18 }}>
        <Stat label="Open Positions" value={d.openJobs} color="#10B981" />
        <Stat label="Total Submitted" value={d.totalCandidates} color="#6366F1" />
        <Stat label="Placed" value={d.placedCandidates} color="#059669" />
        <Stat label="Pending Invoices" value={d.unpaidInvoices.length} color="#EF4444" warn={d.overdueInvoices > 0} sub={d.totalOutstanding > 0 ? INR(d.totalOutstanding) : undefined} />
        <Stat label="Today" value={d.todayCandidates} color="#3B82F6" sub={d.today} />
      </div>
      <div style={{ background: "#fff", border: "1.5px solid #D1FAE5", borderRadius: 12, padding: 20, maxWidth: 480 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px" }}>Candidate Pipeline</h3>
        {d.pipeline.filter((p) => p.count > 0).length === 0 ? (
          <p style={{ fontSize: 13, color: "#aaa" }}>No candidates yet</p>
        ) : (
          d.pipeline.map(({ stage, count }) => (
            <div key={stage} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 12, minWidth: 110, color: "#555" }}>{stage}</span>
              <div style={{ flex: 1, background: "#F5F5F5", borderRadius: 99, height: 8 }}>
                <div style={{ width: `${Math.min(count * 20, 100)}%`, height: 8, borderRadius: 99, background: "#10B981" }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{count}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ClientJobs() {
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: "", location: "", description: "", workMode: "Hybrid", openPositions: "1", skills: "" });

  const load = () => api.get("/jobs").then((res) => setJobs(res.data));
  useEffect(load, []);

  const post = async () => {
    if (!form.title) return toast("Job title is required", "error");
    try {
      await api.post("/jobs", form);
      toast("Opening posted");
      setModal(false);
      setForm({ title: "", location: "", description: "", workMode: "Hybrid", openPositions: "1", skills: "" });
      load();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const adjust = async (job, delta) => {
    let reason;
    if (delta < 0) {
      reason = window.prompt("Why are you reducing? (e.g. Closed Internally, Position Cancelled)", "Closed Internally");
      if (!reason) return;
    }
    try {
      await api.post(`/jobs/${job.id}/adjust-positions`, { delta, reason });
      load();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>My Openings</h2>
        <Btn variant="green" onClick={() => setModal(true)}><Icon name="plus" size={15} />Post Opening</Btn>
      </div>
      {jobs.length === 0 ? (
        <Empty msg="No openings yet" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {jobs.map((j) => {
            const remaining = Math.max(0, (j.openPositions || 1) - (j.closedPositions || 0));
            return (
              <div key={j.id} style={{ background: "#fff", border: "1.5px solid #D1FAE5", borderRadius: 12, padding: "18px 22px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontWeight: 700 }}>{j.title}</span>
                      <Badge text={j.status} />
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: "#666" }}>{j.location} · {remaining} of {j.openPositions} open</p>
                  </div>
                  {j.status === "Open" && (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <button onClick={() => adjust(j, -1)} disabled={remaining <= 0} style={{ border: "1px solid #FCA5A5", background: "#FEF2F2", color: "#DC2626", padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>− Reduce</button>
                      <button onClick={() => adjust(j, 1)} style={{ border: "1px solid #6EE7B7", background: "#F0FDF4", color: "#065F46", padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>+ Add</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {modal && (
        <Modal title="Post Opening" onClose={() => setModal(false)}>
          <Field label="Job Title"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Location"><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
            <Field label="Open Positions"><Input type="number" min="1" value={form.openPositions} onChange={(e) => setForm({ ...form, openPositions: e.target.value })} /></Field>
          </div>
          <Field label="Skills (comma separated)"><Input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} /></Field>
          <Field label="Description"><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn variant="green" onClick={post}>Post</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ClientSubmissions() {
  const toast = useToast();
  const [candidates, setCandidates] = useState([]);
  const [jobs, setJobs] = useState([]);
  const load = () => {
    api.get("/candidates").then((res) => setCandidates(res.data));
    api.get("/jobs").then((res) => setJobs(res.data));
  };
  useEffect(load, []);

  const flagDuplicate = async (c) => {
    if (!confirm("Mark this submission as a duplicate?")) return;
    try {
      await api.post(`/candidates/${c.id}/flag-duplicate`);
      load();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 18px" }}>Submissions</h2>
      {candidates.length === 0 ? (
        <Empty msg="No submissions yet" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {candidates.map((c) => {
            const job = jobs.find((j) => j.id === c.jobId);
            return (
              <div key={c.id} style={{ background: "#fff", border: "1.5px solid #D1FAE5", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar name={c.name} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700 }}>{c.name}</span>
                    <Badge text={c.status} />
                    {c.isDuplicate && <span style={{ fontSize: 10, background: "#FEE2E2", color: "#DC2626", padding: "2px 7px", borderRadius: 99, fontWeight: 700 }}>⚠ Duplicate</span>}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "#666" }}>{job?.title || c.role}</p>
                </div>
                {!c.isDuplicate && (
                  <button onClick={() => flagDuplicate(c)} style={{ border: "1px dashed #FCA5A5", background: "none", cursor: "pointer", color: "#EF4444", padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>Flag Duplicate</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ClientPipeline() {
  const [candidates, setCandidates] = useState([]);
  useEffect(() => {
    api.get("/candidates").then((res) => setCandidates(res.data));
  }, []);
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 18px" }}>Pipeline</h2>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
        {STAGES.map((stage) => (
          <div key={stage} style={{ minWidth: 220, background: "#fff", border: "1.5px solid #D1FAE5", borderRadius: 12, padding: 14 }}>
            <p style={{ margin: "0 0 10px", fontWeight: 700, fontSize: 13 }}>{stage} ({candidates.filter((c) => c.status === stage).length})</p>
            {candidates.filter((c) => c.status === stage).map((c) => (
              <div key={c.id} style={{ background: "#F0FDF4", borderRadius: 8, padding: "8px 10px", marginBottom: 6, fontSize: 13 }}>{c.name}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientInvoices() {
  const [invoices, setInvoices] = useState([]);
  useEffect(() => {
    api.get("/invoices").then((res) => setInvoices(res.data));
  }, []);
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 18px" }}>Invoices</h2>
      {invoices.length === 0 ? (
        <Empty msg="No invoices yet" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {invoices.map((inv) => {
            const age = getInvoiceAge(inv);
            return (
              <div key={inv.id} style={{ background: "#fff", border: "1.5px solid #D1FAE5", borderRadius: 12, padding: "16px 20px", display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700 }}>{inv.invoiceNo}</span>
                    <Badge text={inv.status} />
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "#666" }}>Issued: {fmtDate(inv.issuedAt)} · Due: {fmtDate(inv.dueDate)} {age && <span style={{ fontWeight: 700, color: age.color }}>· {age.label}</span>}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: "0 0 8px", fontWeight: 800, fontSize: 18 }}>{INR(inv.totalAmount || 0)}</p>
                  <Btn small variant="blue" onClick={() => window.open(`${api.defaults.baseURL}/invoices/${inv.id}/html?token=${encodeURIComponent(localStorage.getItem("token"))}`, "_blank")}>
                    <Icon name="download" size={13} />View / Print
                  </Btn>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
