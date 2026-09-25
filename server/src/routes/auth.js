const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");
const { auth } = require("../middleware/auth");

function sign(user) {
  return jwt.sign(
    { id: user.id, orgId: user.orgId, role: user.role, clientId: user.clientId || null, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function publicUser(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, orgId: u.orgId, clientId: u.clientId || null };
}

// Creates a brand new tenant (Organization) plus its first ADMIN user.
// This replaces the old model where "Closure Point" was the only hard-coded
// tenant baked into the source — any agency can now sign up and get its own
// fully isolated workspace.
router.post("/register-org", async (req, res) => {
  const { orgName, adminName, adminEmail, adminPassword, gstin } = req.body || {};
  if (!orgName || !adminName || !adminEmail || !adminPassword) {
    return res.status(400).json({ error: "Organization name, your name, email and password are all required" });
  }
  if (adminPassword.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }
  const email = String(adminEmail).toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "That email is already registered" });

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const org = await prisma.organization.create({ data: { name: orgName, gstin: gstin || null } });
  const user = await prisma.user.create({
    data: { orgId: org.id, role: "ADMIN", name: adminName, email, passwordHash },
  });
  res.status(201).json({ token: sign(user), user: publicUser(user) });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
  const user = await prisma.user.findUnique({ where: { email: String(email).toLowerCase().trim() } });
  // Same error for "no such user" and "wrong password" so we don't leak which emails exist.
  if (!user) return res.status(401).json({ error: "Invalid email or password" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid email or password" });
  res.json({ token: sign(user), user: publicUser(user) });
});

router.get("/me", auth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: publicUser(user) });
});

router.post("/change-password", auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters" });
  }
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  const ok = await bcrypt.compare(currentPassword || "", user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Current password is incorrect" });
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  res.json({ ok: true });
});

module.exports = router;
