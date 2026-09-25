import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import RegisterOrg from "./pages/RegisterOrg";
import AdminShell from "./pages/admin/AdminShell";
import RecruiterPortal from "./pages/recruiter/RecruiterPortal";
import ClientPortal from "./pages/client/ClientPortal";

function Loading() {
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#888", fontFamily: "system-ui" }}>Loading…</div>;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <Loading />;

  if (!user) {
    return (
      <Routes>
        <Route path="/register" element={<RegisterOrg />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {user.role === "ADMIN" && <Route path="/*" element={<AdminShell />} />}
      {user.role === "RECRUITER" && <Route path="/*" element={<RecruiterPortal />} />}
      {user.role === "CLIENT" && <Route path="/*" element={<ClientPortal />} />}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
