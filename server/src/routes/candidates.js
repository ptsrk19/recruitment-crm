const router = require("express").Router();
const multer = require("multer");
const prisma = require("../lib/prisma");
const { auth, requireRole } = require("../middleware/auth");
const { todayStr } = require("../lib/dates");

router.use(auth);

// BUG FIXED: the original app base64-encoded every CV/MSA/interview PDF and
// stuffed it into the SAME JSON blob as all the app's other data, saved under
// one storage key with a 5MB total cap — a handful of resumes would silently
// blow past that limit and the save would fail with no user-visible error.
// Files now live in their own FileAsset rows in Postgres, fetched on demand
// via /files/:id, so the size of your data has nothing to do with how many
// CVs you've uploaded. We still cap individual uploads at 8MB.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

function scopeWhere(req) {
  const where = { orgId: req.user.orgId };
  if (req.user.role === "CLIENT") where.clientId = req.user.clientId;
  if (req.user.role === "RECRUITER") where.recruiterId = req.user.id;
  return where;
}

const includeFiles = { cvFile: { select: { id: true, filename: true, mimeType: true, size: true } }, videoFile: { select: { id: true, filename: true, mimeType: true, size: true } } };

router.get("/", async (req, res) => {
  const candidates = await prisma.candidate.findMany({ where: scopeWhere(req), include: includeFiles, orderBy: { createdAt: "desc" } });
  res.json(candidates);
});

router.post("/", requireRole("ADMIN", "RECRUITER"), async (req, res) => {
  const b = req.body || {};
  if (!b.name || !b.email) return res.status(400).json({ error: "Candidate name and email are required" });
  const recruiterId = req.user.role === "RECRUITER" ? req.user.id : b.recruiterId || null;
  const c = await prisma.candidate.create({
    data: {
      orgId: req.user.orgId,
      clientId: b.clientId || null,
      jobId: b.jobId || null,
      recruiterId,
      name: b.name,
      email: b.email,
      phone: b.phone || null,
      role: b.role || null,
      status: b.status || "CV Submitted",
      aiScore: b.aiScore ? Number(b.aiScore) : null,
      tags: b.tags || [],
      notes: b.notes || null,
      createdAt: b.createdAt || todayStr(),
    },
    include: includeFiles,
  });
  await prisma.activity.create({
    data: { orgId: req.user.orgId, type: "CV Submitted", candidateId: c.id, jobId: c.jobId, date: c.createdAt, note: `${c.name} submitted`, byRecruiter: req.user.role === "RECRUITER" },
  });
  res.status(201).json(c);
});

async function loadScoped(req) {
  return prisma.candidate.findFirst({ where: { id: req.params.id, ...scopeWhere(req) } });
}

router.put("/:id", requireRole("ADMIN", "RECRUITER"), async (req, res) => {
  const existing = await loadScoped(req);
  if (!existing) return res.status(404).json({ error: "Candidate not found" });
  const b = req.body || {};
  const c = await prisma.candidate.update({
    where: { id: existing.id },
    data: {
      name: b.name ?? existing.name,
      email: b.email ?? existing.email,
      phone: b.phone ?? existing.phone,
      role: b.role ?? existing.role,
      status: b.status ?? existing.status,
      clientId: b.clientId !== undefined ? b.clientId || null : existing.clientId,
      jobId: b.jobId !== undefined ? b.jobId || null : existing.jobId,
      recruiterId: req.user.role === "ADMIN" && b.recruiterId !== undefined ? b.recruiterId || null : existing.recruiterId,
      aiScore: b.aiScore !== undefined ? (b.aiScore ? Number(b.aiScore) : null) : existing.aiScore,
      tags: b.tags ?? existing.tags,
      notes: b.notes ?? existing.notes,
    },
    include: includeFiles,
  });
  res.json(c);
});

// CLIENT-only: flag a submission as a duplicate (scoped to their own candidates).
router.post("/:id/flag-duplicate", requireRole("CLIENT"), async (req, res) => {
  const existing = await loadScoped(req);
  if (!existing) return res.status(404).json({ error: "Candidate not found" });
  const c = await prisma.candidate.update({ where: { id: existing.id }, data: { isDuplicate: true } });
  await prisma.activity.create({
    data: { orgId: req.user.orgId, type: "Marked Duplicate", candidateId: c.id, jobId: c.jobId, date: todayStr(), note: `${c.name} flagged as duplicate by client`, byClient: true },
  });
  res.json(c);
});

router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  const existing = await prisma.candidate.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
  if (!existing) return res.status(404).json({ error: "Candidate not found" });
  await prisma.candidate.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});

// ── File upload / download ──────────────────────────────────────────────────
async function handleUpload(req, res, field) {
  const existing = await loadScoped(req);
  if (!existing) return res.status(404).json({ error: "Candidate not found" });
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const file = await prisma.fileAsset.create({
    data: { orgId: req.user.orgId, filename: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size, data: req.file.buffer },
  });
  const fkField = field === "cv" ? "cvFileId" : "videoFileId";
  await prisma.candidate.update({ where: { id: existing.id }, data: { [fkField]: file.id } });
  res.status(201).json({ id: file.id, filename: file.filename, mimeType: file.mimeType, size: file.size });
}

router.post("/:id/cv", requireRole("ADMIN", "RECRUITER"), upload.single("file"), (req, res) => handleUpload(req, res, "cv"));
router.post("/:id/video", requireRole("ADMIN", "RECRUITER"), upload.single("file"), (req, res) => handleUpload(req, res, "video"));

module.exports = router;
