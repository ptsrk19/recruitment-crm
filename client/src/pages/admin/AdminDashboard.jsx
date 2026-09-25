import { useEffect, useState } from "react";
import api from "../../api/client";
import { INR, fmtL, fmtDate, getInvoiceAge } from "../../utils/format";
import { Stat } from "../../components/ui";
import Icon from "../../components/Icon";

export default function AdminDashboard() {
  const [d, setD] = useState(null);

  useEffect(() => {
    api.get("/dashboard").then((res) => setD(res.data));
  }, []);

  if (!d) return <p style={{ color: "#888" }}>Loading…</p>;

  return (
    <div>
      <h2 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 22px" }}>Dashboard</h2>

      {(d.overdueInvoices > 0 || d.msaExpiring.length > 0) && (
        <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
          {d.overdueInvoices > 0 && (
            <div style={{ background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
              <Icon name="warning" size={16} />
              <span>
                <strong>{d.overdueInvoices} invoice{d.overdueInvoices > 1 ? "s" : ""} overdue!</strong> Total {INR(d.overdueAmount)} pending
              </span>
            </div>
          )}
          {d.msaExpiring.length > 0 && (
            <div style={{ background: "#FFFBEB", border: "1.5px solid #FCD34D", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
              <Icon name="warning" size={16} />
              <span>
                <strong>{d.msaExpiring.map((c) => c.name).join(", ")} MSA</strong> expiring within 60 days — action required
              </span>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(140px,1fr))", gap: 10, marginBottom: 20 }}>
        <Stat label="Open Jobs" value={d.openJobs} color="#10B981" />
        <Stat label="Candidates" value={d.totalCandidates} color="#6366F1" />
        <Stat label="Placed" value={d.placedCandidates} color="#F59E0B" />
        <Stat label="Collected" value={fmtL(d.totalCollected)} color="#059669" />
        <Stat label="Outstanding" value={fmtL(d.totalOutstanding)} color="#EF4444" warn={d.overdueInvoices > 0} sub={d.overdueInvoices > 0 ? `${d.overdueInvoices} overdue` : undefined} />
        <Stat label="Today" value={d.todayCandidates} color="#8B5CF6" sub={d.today} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>Candidate Pipeline</h3>
          {d.pipeline.map(({ stage, count }) => (
            <div key={stage} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 12, minWidth: 110, color: "#555" }}>{stage}</span>
              <div style={{ flex: 1, background: "#F5F5F5", borderRadius: 99, height: 8 }}>
                <div style={{ width: `${Math.min(count * 22, 100)}%`, height: 8, borderRadius: 99, background: "#6366F1", minWidth: count > 0 ? 12 : 0 }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{count}</span>
            </div>
          ))}
        </div>
        <div style={{ background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>Invoice Ageing</h3>
          {d.unpaidInvoices.length === 0 ? (
            <p style={{ fontSize: 13, color: "#aaa" }}>All invoices paid</p>
          ) : (
            d.unpaidInvoices.map((inv) => {
              const age = getInvoiceAge(inv);
              return (
                <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #F5F5F5" }}>
                  <div>
                    <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600 }}>{inv.invoiceNo}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#888" }}>Due: {fmtDate(inv.dueDate)}</p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p style={{ margin: "0 0 2px", fontWeight: 700, fontSize: 13 }}>{INR(inv.totalAmount || 0)}</p>
                    {age && <span style={{ fontSize: 11, fontWeight: 600, color: age.color }}>{age.label}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 }}>
        <div style={{ background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px" }}>Recent Activity</h3>
          {d.recentActivities.length === 0 && <p style={{ fontSize: 13, color: "#aaa" }}>No activity yet</p>}
          {d.recentActivities.map((a) => (
            <div key={a.id} style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{a.type}</span>
              <p style={{ margin: 0, fontSize: 12, color: "#888" }}>
                {a.note} · {fmtDate(a.date)}
              </p>
            </div>
          ))}
        </div>
        <div style={{ background: "#fff", border: "1.5px solid #F0F0F0", borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px" }}>Interviews</h3>
          <div style={{ display: "flex", gap: 16 }}>
            <div style={{ flex: 1, background: "#EEF2FF", borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
              <p style={{ margin: "0 0 2px", fontSize: 24, fontWeight: 800, color: "#6366F1" }}>{d.interviewsToday}</p>
              <p style={{ margin: 0, fontSize: 11, color: "#888" }}>Today</p>
            </div>
            <div style={{ flex: 1, background: "#F0FDF4", borderRadius: 8, padding: "10px 14px", textAlign: "center" }}>
              <p style={{ margin: "0 0 2px", fontSize: 24, fontWeight: 800, color: "#059669" }}>{d.interviewsThisMonth}</p>
              <p style={{ margin: 0, fontSize: 11, color: "#888" }}>This Month</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
