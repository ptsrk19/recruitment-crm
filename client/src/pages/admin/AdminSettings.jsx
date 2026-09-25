import { useEffect, useState } from "react";
import api from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { exportToCSV, todayStr, fmtDate } from "../../utils/format";
import { Btn, Field, Input, Textarea } from "../../components/ui";
import Icon from "../../components/Icon";

const REPORT_LIST = [
  { id: "candidates", label: "Candidate Submissions", desc: "All candidates with status, AI score, CV details" },
  { id: "placements", label: "Placements & Fees", desc: "All placements with CTC, billing rate & invoice totals" },
  { id: "invoices", label: "Invoice Register", desc: "All invoices with GST breakup and ageing" },
  { id: "ageing", label: "Invoice Ageing", desc: "Outstanding invoices bucketed by 0-30, 31-60, 61-90, 90+ days" },
  { id: "pipeline", label: "Pipeline Summary", desc: "Candidate count per stage across the funnel" },
  { id: "clients", label: "Client Overview", desc: "All clients with billing config, jobs and outstanding dues" },
  { id: "recruiterPerformance", label: "Recruiter Performance", desc: "Submissions, placements and avg AI score per recruiter" },
];

function ReportsSection() {
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
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>Reports</h3>
      <p style={{ margin: "0 0 16px", fontSize: 13, color: "#888" }}>Download reports as CSV — open in Excel, Google Sheets, or Numbers.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 12 }}>
        {REPORT_LIST.map((r) => (
          <div key={r.id} style={{ background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 12, padding: 16 }}>
            <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 13 }}>{r.label}</p>
            <p style={{ margin: "0 0 10px", fontSize: 12, color: "#888" }}>{r.desc}</p>
            <Btn small variant="secondary" onClick={() => download(r.id)}><Icon name="download" size={13} />Download CSV</Btn>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivitySection() {
  const [activities, setActivities] = useState([]);
  useEffect(() => {
    api.get("/activities").then((res) => setActivities(res.data));
  }, []);
  return (
    <div style={{ marginBottom: 32 }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>Activity Log</h3>
      <div style={{ background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 12, padding: 16, maxHeight: 320, overflowY: "auto" }}>
        {activities.length === 0 && <p style={{ fontSize: 13, color: "#aaa" }}>No activity yet</p>}
        {activities.map((a) => (
          <div key={a.id} style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{a.type}</span>
            <p style={{ margin: 0, fontSize: 12, color: "#888" }}>{a.note} · {fmtDate(a.date)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function OrgSettingsSection() {
  const toast = useToast();
  const [org, setOrg] = useState(null);
  useEffect(() => {
    api.get("/org").then((res) => setOrg(res.data));
  }, []);
  if (!org) return null;
  const save = async () => {
    try {
      const res = await api.put("/org", org);
      setOrg(res.data);
      toast("Settings saved successfully!");
    } catch (e) {
      toast(e.message, "error");
    }
  };
  return (
    <div>
      <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>Organization & Invoice Settings</h3>
      <div style={{ background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 12, padding: 20, maxWidth: 640 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Organization Name"><Input value={org.name || ""} onChange={(e) => setOrg({ ...org, name: e.target.value })} /></Field>
          <Field label="GSTIN" hint="First 2 digits are used to decide CGST/SGST vs IGST"><Input value={org.gstin || ""} onChange={(e) => setOrg({ ...org, gstin: e.target.value })} /></Field>
          <Field label="PAN"><Input value={org.pan || ""} onChange={(e) => setOrg({ ...org, pan: e.target.value })} /></Field>
          <Field label="SAC Code"><Input value={org.sacCode || ""} onChange={(e) => setOrg({ ...org, sacCode: e.target.value })} /></Field>
          <Field label="Email"><Input value={org.email || ""} onChange={(e) => setOrg({ ...org, email: e.target.value })} /></Field>
          <Field label="Phone"><Input value={org.phone || ""} onChange={(e) => setOrg({ ...org, phone: e.target.value })} /></Field>
        </div>
        <Field label="Address"><Textarea value={org.address || ""} onChange={(e) => setOrg({ ...org, address: e.target.value })} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field label="Bank Name"><Input value={org.bank || ""} onChange={(e) => setOrg({ ...org, bank: e.target.value })} /></Field>
          <Field label="Account No"><Input value={org.accountNo || ""} onChange={(e) => setOrg({ ...org, accountNo: e.target.value })} /></Field>
          <Field label="IFSC"><Input value={org.ifsc || ""} onChange={(e) => setOrg({ ...org, ifsc: e.target.value })} /></Field>
        </div>
        <Field label="Invoice Accent Color"><Input type="color" value={org.invoiceAccentColor || "#1E1B4B"} onChange={(e) => setOrg({ ...org, invoiceAccentColor: e.target.value })} style={{ width: 80, padding: 4 }} /></Field>
        <Field label="Invoice Footer Note"><Textarea value={org.invoiceFooterNote || ""} onChange={(e) => setOrg({ ...org, invoiceFooterNote: e.target.value })} /></Field>
        <Btn onClick={save}>Save Settings</Btn>
      </div>
    </div>
  );
}

export default function AdminSettings() {
  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 18px" }}>Reports & Settings</h2>
      <ReportsSection />
      <ActivitySection />
      <OrgSettingsSection />
    </div>
  );
}
