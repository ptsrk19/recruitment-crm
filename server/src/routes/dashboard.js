const router = require("express").Router();
const prisma = require("../lib/prisma");
const { auth } = require("../middleware/auth");
const { todayStr, daysBetween } = require("../lib/dates");

router.use(auth);

const STAGES = ["CV Submitted", "Screening", "Interview", "Offer", "Placed", "Rejected", "Withdrawn"];

router.get("/", async (req, res) => {
  const orgId = req.user.orgId;
  const today = todayStr();
  const thisMonth = today.slice(0, 7);

  const candWhere = { orgId };
  const jobWhere = { orgId };
  const invWhere = { orgId };
  if (req.user.role === "CLIENT") {
    if (!req.user.clientId) return res.json({ empty: true });
    candWhere.clientId = req.user.clientId;
    jobWhere.clientId = req.user.clientId;
    invWhere.clientId = req.user.clientId;
    invWhere.published = true;
  }
  if (req.user.role === "RECRUITER") {
    candWhere.recruiterId = req.user.id;
    jobWhere.assignedRecruiters = { has: req.user.id };
  }

  const [candidates, jobs, invoices, clients, activities, interviews] = await Promise.all([
    prisma.candidate.findMany({ where: candWhere }),
    prisma.job.findMany({ where: jobWhere }),
    req.user.role === "RECRUITER" ? [] : prisma.invoice.findMany({ where: invWhere }),
    req.user.role === "ADMIN" ? prisma.client.findMany({ where: { orgId } }) : [],
    req.user.role === "ADMIN" ? prisma.activity.findMany({ where: { orgId }, orderBy: { date: "desc" }, take: 6 }) : [],
    prisma.interview.findMany({ where: req.user.role === "CLIENT" ? { orgId, clientId: req.user.clientId } : { orgId } }),
  ]);

  const pipeline = STAGES.map((s) => ({ stage: s, count: candidates.filter((c) => c.status === s).length }));
  const todayCands = candidates.filter((c) => c.createdAt === today);
  const overdueInv = invoices.filter((i) => i.status !== "Paid" && i.dueDate && i.dueDate < today);
  const unpaidInv = invoices.filter((i) => i.status !== "Paid");
  const totalOutstanding = unpaidInv.reduce((s, i) => s + (i.totalAmount || 0), 0);
  const totalCollected = invoices.filter((i) => i.status === "Paid").reduce((s, i) => s + (i.totalAmount || 0), 0);
  const msaExpiring = clients.filter((c) => c.msaExpiry && daysBetween(today, c.msaExpiry) <= 60 && daysBetween(today, c.msaExpiry) >= 0);
  const ivToday = interviews.filter((i) => i.scheduledAt?.startsWith(today)).length;
  const ivMonth = interviews.filter((i) => i.scheduledAt?.startsWith(thisMonth)).length;

  res.json({
    openJobs: jobs.filter((j) => j.status === "Open").length,
    totalCandidates: candidates.length,
    placedCandidates: candidates.filter((c) => c.status === "Placed").length,
    todayCandidates: todayCands.length,
    pipeline,
    overdueInvoices: overdueInv.length,
    overdueAmount: overdueInv.reduce((s, i) => s + (i.totalAmount || 0), 0),
    unpaidInvoices: unpaidInv,
    totalOutstanding,
    totalCollected,
    msaExpiring: msaExpiring.map((c) => ({ id: c.id, name: c.name, msaExpiry: c.msaExpiry })),
    recentActivities: activities,
    interviewsToday: ivToday,
    interviewsThisMonth: ivMonth,
    today,
  });
});

module.exports = router;
