import { useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import Icon from "../../components/Icon";
import AdminDashboard from "./AdminDashboard";
import AdminClients from "./AdminClients";
import AdminCandidates from "./AdminCandidates";
import AdminJobs from "./AdminJobs";
import AdminInterviews from "./AdminInterviews";
import AdminPlacements from "./AdminPlacements";
import AdminRecruiters from "./AdminRecruiters";
import AdminSettings from "./AdminSettings";

const NAV = [
  { to: "", label: "Dashboard", icon: "dashboard" },
  { to: "candidates", label: "Candidates", icon: "candidates" },
  { to: "clients", label: "Clients", icon: "clients" },
  { to: "jobs", label: "Jobs", icon: "jobs" },
  { to: "interviews", label: "Interviews", icon: "calendar" },
  { to: "placements", label: "Placements & Invoices", icon: "invoices" },
  { to: "recruiters", label: "Recruiters", icon: "recruiter" },
  { to: "settings", label: "Reports & Settings", icon: "settings" },
];

export default function AdminShell() {
  const { user, logout } = useAuth();
  const [navOpen, setNavOpen] = useState(false);

  const SidebarContent = () => (
    <>
      <div style={{ padding: "20px 16px 12px" }}>
        <p style={{ margin: 0, color: "#fff", fontWeight: 800, fontSize: 14 }}>Recruitment CRM</p>
        <p style={{ margin: 0, color: "#8B87CF", fontSize: 11 }}>{user?.name}</p>
      </div>
      <nav style={{ flex: 1, padding: "4px 10px", overflowY: "auto" }}>
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === ""}
            onClick={() => setNavOpen(false)}
            style={({ isActive }) => ({ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", borderRadius: 8, marginBottom: 1, textDecoration: "none", background: isActive ? "#6366F1" : "transparent", color: isActive ? "#fff" : "#A5B4FC", fontSize: 13, fontWeight: isActive ? 600 : 400 })}
          >
            <Icon name={item.icon} size={16} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: "10px 14px 16px", borderTop: "1px solid #312E81" }}>
        <button onClick={logout} style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", color: "#6E6EAF", cursor: "pointer", fontSize: 13, padding: 0 }}>
          <Icon name="logout" size={15} />
          Sign out
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F8F8FC", fontFamily: "system-ui,sans-serif" }}>
      <aside style={{ width: 220, background: "#1E1B4B", flexShrink: 0, position: "sticky", top: 0, height: "100vh", display: "flex", flexDirection: "column", overflowY: "auto" }} className="desktop-sidebar">
        <SidebarContent />
      </aside>
      <div style={{ display: "none" }} className="mobile-topbar">
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, background: "#1E1B4B", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", height: 56 }}>
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>Recruitment CRM</span>
          <button onClick={() => setNavOpen(!navOpen)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 20 }}>☰</button>
        </div>
        {navOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 199 }} onClick={() => setNavOpen(false)}>
            <div style={{ position: "absolute", top: 56, left: 0, bottom: 0, width: 220, background: "#1E1B4B", display: "flex", flexDirection: "column" }} onClick={(e) => e.stopPropagation()}>
              <SidebarContent />
            </div>
          </div>
        )}
      </div>
      <main style={{ flex: 1, overflowY: "auto", padding: "24px 16px" }} className="main-content">
        <Routes>
          <Route index element={<AdminDashboard />} />
          <Route path="candidates" element={<AdminCandidates />} />
          <Route path="clients" element={<AdminClients />} />
          <Route path="jobs" element={<AdminJobs />} />
          <Route path="interviews" element={<AdminInterviews />} />
          <Route path="placements" element={<AdminPlacements />} />
          <Route path="recruiters" element={<AdminRecruiters />} />
          <Route path="settings" element={<AdminSettings />} />
        </Routes>
      </main>
    </div>
  );
}
