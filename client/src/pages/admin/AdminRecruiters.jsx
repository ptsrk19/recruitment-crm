import { useEffect, useState } from "react";
import api from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { Btn, Field, Input, Modal, Avatar, Empty } from "../../components/ui";
import Icon from "../../components/Icon";

// BUG FIXED: the original admin screen printed every recruiter's plaintext
// password inline ("Login: email / password"). Passwords are now hashed
// server-side and this screen never receives or displays them — only a
// "reset password" action that sets a new one.
export default function AdminRecruiters() {
  const toast = useToast();
  const [recruiters, setRecruiters] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});

  const load = () => {
    api.get("/recruiters").then((res) => setRecruiters(res.data));
    api.get("/candidates").then((res) => setCandidates(res.data));
  };
  useEffect(load, []);

  const save = async () => {
    if (!form.name || !form.email || (modal === "add" && !form.password)) return toast("Name, email and password are required", "error");
    try {
      if (modal === "add") await api.post("/recruiters", form);
      else await api.put(`/recruiters/${form.id}`, form);
      toast(modal === "add" ? "Recruiter added" : "Recruiter updated");
      setModal(null);
      load();
    } catch (e) {
      toast(e.message, "error");
    }
  };

  const del = async (id) => {
    if (!confirm("Remove recruiter access? Their submissions will remain.")) return;
    await api.delete(`/recruiters/${id}`);
    load();
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 4px" }}>Recruiter Access</h2>
          <p style={{ margin: 0, fontSize: 13, color: "#888" }}>Manage who can log in as a recruiter</p>
        </div>
        <Btn onClick={() => { setForm({ name: "", email: "", password: "" }); setModal("add"); }}><Icon name="plus" size={15} />Add Recruiter</Btn>
      </div>

      {recruiters.length === 0 ? (
        <Empty msg="No recruiters added yet" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {recruiters.map((r) => {
            const cands = candidates.filter((c) => c.recruiterId === r.id);
            const placed = cands.filter((c) => c.status === "Placed").length;
            return (
              <div key={r.id} style={{ background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                <Avatar name={r.name} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>{r.name}</span>
                    <span style={{ fontSize: 11, background: "#FEF3C7", color: "#78350F", padding: "2px 8px", borderRadius: 99, fontWeight: 600 }}>Recruiter</span>
                  </div>
                  <p style={{ margin: "0 0 4px", fontSize: 13, color: "#666" }}>{r.email}</p>
                  <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#888" }}>
                    <span>{cands.length} submission{cands.length !== 1 ? "s" : ""}</span>
                    <span style={{ color: "#059669", fontWeight: 600 }}>{placed} placed</span>
                  </div>
                </div>
                <button onClick={() => { setForm({ id: r.id, name: r.name, email: r.email, password: "" }); setModal("edit"); }} style={{ border: "none", background: "none", cursor: "pointer", color: "#6366F1", padding: 4 }}><Icon name="edit" size={15} /></button>
                <button onClick={() => del(r.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#EF4444", padding: 4 }}><Icon name="trash" size={15} /></button>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <Modal title={modal === "add" ? "Add Recruiter" : "Edit Recruiter"} onClose={() => setModal(null)}>
          <Field label="Full Name"><Input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Login Email"><Input type="email" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          <Field label={modal === "add" ? "Password" : "New Password (leave blank to keep current)"} hint="At least 8 characters">
            <Input type="password" value={form.password || ""} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <div style={{ background: "#FEF3C7", borderRadius: 8, padding: "8px 12px", marginBottom: 12, fontSize: 12, color: "#78350F" }}>
            Share the password with the recruiter through a secure channel — it will not be shown again after saving.
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn variant="secondary" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={save}>{modal === "add" ? "Add Recruiter" : "Save Changes"}</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
