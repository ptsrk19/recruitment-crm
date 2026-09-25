const router = require("express").Router();
const prisma = require("../lib/prisma");
const { auth, requireRole } = require("../middleware/auth");

router.use(auth);

function scopeWhere(req) {
  const where = { orgId: req.user.orgId };
  if (req.user.role === "CLIENT") where.clientId = req.user.clientId;
  return where;
}

router.get("/", async (req, res) => {
  const where = scopeWhere(req);
  if (req.user.role === "RECRUITER") {
    // Recruiters see interviews for candidates they own.
    const myCandIds = (await prisma.candidate.findMany({ where: { orgId: req.user.orgId, recruiterId: req.user.id }, select: { id: true } })).map((c) => c.id);
    where.candidateId = { in: myCandIds };
  }
  const interviews = await prisma.interview.findMany({ where, orderBy: { scheduledAt: "asc" } });
  res.json(interviews);
});

router.post("/", requireRole("ADMIN", "RECRUITER"), async (req, res) => {
  const b = req.body || {};
  if (!b.candidateId || !b.clientId || !b.scheduledAt) return res.status(400).json({ error: "Candidate, client and date/time are required" });
  const interview = await prisma.interview.create({
    data: { orgId: req.user.orgId, candidateId: b.candidateId, clientId: b.clientId, jobId: b.jobId || null, scheduledAt: b.scheduledAt, mode: b.mode || null, round: b.round || null, notes: b.notes || null, status: b.status || "Scheduled" },
  });
  res.status(201).json(interview);
});

router.put("/:id", requireRole("ADMIN", "RECRUITER"), async (req, res) => {
  const existing = await prisma.interview.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
  if (!existing) return res.status(404).json({ error: "Interview not found" });
  const b = req.body || {};
  const interview = await prisma.interview.update({
    where: { id: existing.id },
    data: { scheduledAt: b.scheduledAt ?? existing.scheduledAt, mode: b.mode ?? existing.mode, round: b.round ?? existing.round, notes: b.notes ?? existing.notes, status: b.status ?? existing.status },
  });
  res.json(interview);
});

router.delete("/:id", requireRole("ADMIN", "RECRUITER"), async (req, res) => {
  const existing = await prisma.interview.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
  if (!existing) return res.status(404).json({ error: "Interview not found" });
  await prisma.interview.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});

module.exports = router;
