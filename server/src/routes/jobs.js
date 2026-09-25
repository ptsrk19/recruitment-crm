const router = require("express").Router();
const prisma = require("../lib/prisma");
const { auth, requireRole } = require("../middleware/auth");
const { todayStr } = require("../lib/dates");

router.use(auth);

// Visibility rules, enforced in the query (not just the UI):
//  - ADMIN: every job in the org
//  - CLIENT: only jobs belonging to its own client record
//  - RECRUITER: only open jobs it's been assigned to
router.get("/", async (req, res) => {
  const where = { orgId: req.user.orgId };
  if (req.user.role === "CLIENT") {
    if (!req.user.clientId) return res.json([]);
    where.clientId = req.user.clientId;
  } else if (req.user.role === "RECRUITER") {
    where.assignedRecruiters = { has: req.user.id };
  }
  const jobs = await prisma.job.findMany({ where, orderBy: { createdAt: "desc" } });
  res.json(jobs);
});

router.post("/", async (req, res) => {
  const b = req.body || {};
  let clientId = b.clientId;
  if (req.user.role === "CLIENT") clientId = req.user.clientId; // clients can only post for themselves
  if (req.user.role === "RECRUITER") return res.status(403).json({ error: "Recruiters can't create job orders" });
  if (!clientId || !b.title) return res.status(400).json({ error: "Client and job title are required" });

  const client = await prisma.client.findFirst({ where: { id: clientId, orgId: req.user.orgId } });
  if (!client) return res.status(404).json({ error: "Client not found" });

  const job = await prisma.job.create({
    data: {
      orgId: req.user.orgId,
      clientId,
      title: b.title,
      status: b.status || "Open",
      salaryMin: b.salaryMin ? Number(b.salaryMin) : null,
      salaryMax: b.salaryMax ? Number(b.salaryMax) : null,
      location: b.location || null,
      description: b.description || null,
      workMode: b.workMode || null,
      openPositions: Number(b.openPositions) || 1,
      closedPositions: Number(b.closedPositions) || 0,
      noticePeriodDays: Number(b.noticePeriodDays) || 30,
      needByDate: b.needByDate || null,
      experienceMin: Number(b.experienceMin) || 0,
      experienceMax: Number(b.experienceMax) || 0,
      skills: b.skills || null,
      postedByClient: req.user.role === "CLIENT",
      assignedRecruiters: b.assignedRecruiters || [],
      closureLog: b.closureLog || [],
      createdAt: todayStr(),
    },
  });
  res.status(201).json(job);
});

async function loadScopedJob(req) {
  const where = { id: req.params.id, orgId: req.user.orgId };
  if (req.user.role === "CLIENT") where.clientId = req.user.clientId;
  return prisma.job.findFirst({ where });
}

router.put("/:id", async (req, res) => {
  if (req.user.role === "RECRUITER") return res.status(403).json({ error: "Recruiters can't edit job orders" });
  const existing = await loadScopedJob(req);
  if (!existing) return res.status(404).json({ error: "Job not found" });
  const b = req.body || {};
  const data = {
    title: b.title ?? existing.title,
    status: b.status ?? existing.status,
    salaryMin: b.salaryMin !== undefined ? Number(b.salaryMin) || null : existing.salaryMin,
    salaryMax: b.salaryMax !== undefined ? Number(b.salaryMax) || null : existing.salaryMax,
    location: b.location ?? existing.location,
    description: b.description ?? existing.description,
    workMode: b.workMode ?? existing.workMode,
    openPositions: b.openPositions !== undefined ? Number(b.openPositions) || 1 : existing.openPositions,
    noticePeriodDays: b.noticePeriodDays !== undefined ? Number(b.noticePeriodDays) || 30 : existing.noticePeriodDays,
    needByDate: b.needByDate ?? existing.needByDate,
    experienceMin: b.experienceMin !== undefined ? Number(b.experienceMin) || 0 : existing.experienceMin,
    experienceMax: b.experienceMax !== undefined ? Number(b.experienceMax) || 0 : existing.experienceMax,
    skills: b.skills ?? existing.skills,
  };
  // Only admins may reassign recruiters or the owning client.
  if (req.user.role === "ADMIN") {
    if (b.clientId) data.clientId = b.clientId;
    if (b.assignedRecruiters) data.assignedRecruiters = b.assignedRecruiters;
  }
  const job = await prisma.job.update({ where: { id: existing.id }, data });
  res.json(job);
});

// Reduce/increase open headcount with an audit trail (closure log), used by
// both admin and client ("Reduce"/"Add" buttons in the original UI).
router.post("/:id/adjust-positions", async (req, res) => {
  const existing = await loadScopedJob(req);
  if (!existing) return res.status(404).json({ error: "Job not found" });
  const { delta, reason, notes } = req.body || {};
  const d = Number(delta) || 0;
  let data;
  if (d < 0) {
    const newClosed = existing.closedPositions + Math.abs(d);
    const remaining = Math.max(0, existing.openPositions - newClosed);
    const log = [...(existing.closureLog || []), { date: todayStr(), count: Math.abs(d), reason: reason || "Reduced", notes: notes || "" }];
    data = { closedPositions: newClosed, status: remaining === 0 ? "Filled" : existing.status, closureLog: log };
  } else if (d > 0) {
    data = { openPositions: existing.openPositions + d };
  } else {
    return res.status(400).json({ error: "delta must be non-zero" });
  }
  const job = await prisma.job.update({ where: { id: existing.id }, data });
  res.json(job);
});

router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  const existing = await prisma.job.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
  if (!existing) return res.status(404).json({ error: "Job not found" });
  await prisma.job.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});

module.exports = router;
