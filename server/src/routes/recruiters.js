const router = require("express").Router();
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const { auth, requireRole } = require("../middleware/auth");

router.use(auth);

// BUG FIXED: the original admin screen displayed every recruiter's plaintext
// password inline ("Login: email / password"). Passwords are now hashed and
// never sent back to the client at all — admins set an initial password and
// can reset it, but can never read it back.
router.get("/", requireRole("ADMIN"), async (req, res) => {
  const recruiters = await prisma.user.findMany({
    where: { orgId: req.user.orgId, role: "RECRUITER" },
    select: { id: true, name: true, email: true, createdAt: true },
    orderBy: { name: "asc" },
  });
  res.json(recruiters);
});

router.post("/", requireRole("ADMIN"), async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: "Name, email and password are required" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) return res.status(409).json({ error: "That email is already in use" });
  const passwordHash = await bcrypt.hash(password, 12);
  const r = await prisma.user.create({
    data: { orgId: req.user.orgId, role: "RECRUITER", name, email: normalizedEmail, passwordHash },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  res.status(201).json(r);
});

router.put("/:id", requireRole("ADMIN"), async (req, res) => {
  const { name, email, password } = req.body || {};
  const existing = await prisma.user.findFirst({ where: { id: req.params.id, orgId: req.user.orgId, role: "RECRUITER" } });
  if (!existing) return res.status(404).json({ error: "Recruiter not found" });
  const data = { name: name ?? existing.name };
  if (email && email.toLowerCase().trim() !== existing.email) {
    const normalizedEmail = email.toLowerCase().trim();
    const dupe = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (dupe) return res.status(409).json({ error: "That email is already in use" });
    data.email = normalizedEmail;
  }
  if (password) {
    if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
    data.passwordHash = await bcrypt.hash(password, 12);
  }
  const r = await prisma.user.update({ where: { id: existing.id }, data, select: { id: true, name: true, email: true, createdAt: true } });
  res.json(r);
});

router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  const existing = await prisma.user.findFirst({ where: { id: req.params.id, orgId: req.user.orgId, role: "RECRUITER" } });
  if (!existing) return res.status(404).json({ error: "Recruiter not found" });
  // Their past submissions stay on record — we just null out the reference and remove the login.
  await prisma.candidate.updateMany({ where: { recruiterId: existing.id }, data: { recruiterId: null } });
  await prisma.user.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});

module.exports = router;
