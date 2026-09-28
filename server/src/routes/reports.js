const router = require("express").Router();
const prisma = require("../lib/prisma");
const { auth } = require("../middleware/auth");
const { daysBetween, todayStr } = require("../lib/dates");

router.use(auth);

const STAGES = ["CV Submitted", "Screening", "Interview", "Offer", "Placed", "Rejected", "Withdrawn"];

// Reports available to recruiters are intentionally a subset — recruiters
// should not be able to pull other clients' billing/invoice data.
const ADMIN_ONLY_REPORTS = new Set(["placements", "invoices", "ageing", "clients", "recruiterPerformance"]);

router.get("/:type", async (req, res) => {
  const { type } = req.params;
  if (req.user.role === "RECRUITER" && ADMIN_ONLY_REPORTS.has(type)) {
    return res.status(403).json({ error: "This report isn't available to recruiters" });
  }
  if (req.user.role === "CLIENT") {
    return res.status(403).json({ error: "Reports aren't available in the client portal" });
  }

  const orgId = req.user.orgId;

  if (type === "candidates") {
    const where = { orgId };
    if (req.user.role === "RECRUITER") where.recruiterId = req.user.id;
    const candidates = await prisma.candidate.findMany({ where, include: { client: true, job: true, recruiter: true, cvFile: { select: { filename: true } } } });
    const hdr = ["Name", "Email", "Phone", "Role", "Status", "Client", "Job", "Recruiter", "AI Score", "CV", "Submission Date", "Tags", "Notes"];
    const rows = candidates.map((c) => [c.name, c.email, c.phone || "", c.role || "", c.status, c.client?.name || "", c.job?.title || "", c.recruiter?.name || "", c.aiScore || "", c.cvFile?.filename || "", c.createdAt, (c.tags || []).join("; "), c.notes || ""]);
    return res.json([hdr, ...rows]);
  }

  if (type === "placements") {
    const placements = await prisma.placement.findMany({ where: { orgId }, include: { candidate: true, client: true, job: true, invoice: true } });
    const hdr = ["Candidate", "Client", "Job", "CTC", "Billing Type", "Billing Rate", "Fee", "GST", "Total Invoice", "Start Date", "Invoice Status", "Placed Date"];
    const rows = placements.map((p) => [p.candidate?.name || "", p.client?.name || "", p.job?.title || "", p.ctc, p.billingType === "FLAT" ? "Flat Fee (₹)" : "Percentage (%)", p.billingRate, p.fee, p.invoice ? p.invoice.sgst + p.invoice.cgst + p.invoice.igst : "", p.invoice?.totalAmount || "", p.startDate, p.invoiceStatus, p.placedAt]);
    return res.json([hdr, ...rows]);
  }

  if (type === "invoices") {
    const invoices = await prisma.invoice.findMany({ where: { orgId }, include: { client: true, candidate: true } });
    const hdr = ["Invoice No", "Client", "Candidate", "Issue Date", "Due Date", "CTC", "Billing Type", "Rate/Amount", "Fee", "SGST", "CGST", "IGST", "Total", "Status", "Days Outstanding"];
    const rows = invoices.map((inv) => [inv.invoiceNo, inv.client?.name || "", inv.candidate?.name || "", inv.issuedAt, inv.dueDate, inv.ctc, inv.billingType === "FLAT" ? "Flat Fee (₹)" : "Percentage (%)", inv.billingRate, inv.feeAmount, inv.sgst, inv.cgst, inv.igst, inv.totalAmount, inv.status, inv.issuedAt ? daysBetween(inv.issuedAt, todayStr()) : 0]);
    return res.json([hdr, ...rows]);
  }

  if (type === "pipeline") {
    const where = { orgId };
    if (req.user.role === "RECRUITER") where.recruiterId = req.user.id;
    const candidates = await prisma.candidate.findMany({ where });
    const hdr = ["Stage", "Count", "% of Total", "Candidates"];
    const rows = STAGES.map((s) => {
      const cands = candidates.filter((c) => c.status === s);
      const pct = candidates.length > 0 ? Math.round((cands.length / candidates.length) * 100) : 0;
      return [s, cands.length, `${pct}%`, cands.map((c) => c.name).join("; ")];
    });
    return res.json([hdr, ...rows]);
  }

  if (type === "clients") {
    const clients = await prisma.client.findMany({ where: { orgId }, include: { jobs: true, candidates: true, invoices: true } });
    const hdr = ["Name", "Contact", "Email", "Industry", "Billing Rate %", "Billing Mode", "Payment Terms", "GSTIN", "MSA Expiry", "Total Jobs", "Total Candidates", "Placed", "Outstanding Invoices (₹)"];
    const rows = clients.map((c) => [c.name, c.contact || "", c.email || "", c.industry || "", c.billingRate, c.useBins ? "CTC Slabs" : "Flat Rate", c.paymentTerms, c.gstin || "", c.msaExpiry || "", c.jobs.length, c.candidates.length, c.candidates.filter((x) => x.status === "Placed").length, c.invoices.filter((i) => i.status !== "Paid").reduce((s, i) => s + (i.totalAmount || 0), 0)]);
    return res.json([hdr, ...rows]);
  }

  if (type === "recruiterPerformance") {
    const recruiters = await prisma.user.findMany({ where: { orgId, role: "RECRUITER" } });
    const hdr = ["Recruiter", "Email", "Total Submissions", "In Pipeline", "Placed", "Rejected/Withdrawn", "Avg AI Score"];
    const rows = await Promise.all(
      recruiters.map(async (r) => {
        const cands = await prisma.candidate.findMany({ where: { orgId, recruiterId: r.id } });
        const placed = cands.filter((c) => c.status === "Placed").length;
        const rejected = cands.filter((c) => ["Rejected", "Withdrawn"].includes(c.status)).length;
        const inPipeline = cands.filter((c) => !["Placed", "Rejected", "Withdrawn"].includes(c.status)).length;
        const scores = cands.filter((c) => c.aiScore).map((c) => c.aiScore);
        const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : "-";
        return [r.name, r.email, cands.length, inPipeline, placed, rejected, avgScore];
      })
    );
    return res.json([hdr, ...rows]);
  }

  if (type === "ageing") {
    const invoices = await prisma.invoice.findMany({ where: { orgId, status: { not: "Paid" } }, include: { client: true } });
    const hdr = ["Invoice No", "Client", "Amount", "Issue Date", "Due Date", "Days Outstanding", "Bucket", "Status"];
    const rows = invoices.map((inv) => {
      const days = inv.issuedAt ? daysBetween(inv.issuedAt, todayStr()) : 0;
      const bucket = days <= 30 ? "0-30 days" : days <= 60 ? "31-60 days" : days <= 90 ? "61-90 days" : "90+ days";
      return [inv.invoiceNo, inv.client?.name || "", inv.totalAmount, inv.issuedAt, inv.dueDate, days, bucket, inv.status];
    });
    return res.json([hdr, ...rows]);
  }

  res.status(404).json({ error: "Unknown report type" });
});

module.exports = router;
