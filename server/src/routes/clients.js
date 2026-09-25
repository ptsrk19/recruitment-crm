const router = require("express").Router();
const bcrypt = require("bcryptjs");
const prisma = require("../lib/prisma");
const { auth, requireRole } = require("../middleware/auth");

router.use(auth);

// ADMIN/RECRUITER see every client in their org; CLIENT sees only its own record.
router.get("/", async (req, res) => {
  if (req.user.role === "CLIENT") {
    const c = req.user.clientId
      ? await prisma.client.findFirst({ where: { id: req.user.clientId, orgId: req.user.orgId } })
      : null;
    return res.json(c ? [c] : []);
  }
  const clients = await prisma.client.findMany({ where: { orgId: req.user.orgId }, orderBy: { name: "asc" } });
  res.json(clients);
});

router.post("/", requireRole("ADMIN"), async (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: "Client name is required" });
  const c = await prisma.client.create({
    data: {
      orgId: req.user.orgId,
      name: b.name,
      contact: b.contact || null,
      email: b.email || null,
      phone: b.phone || null,
      industry: b.industry || null,
      gstin: b.gstin || null,
      billingAddress: b.billingAddress || null,
      billingRate: Number(b.billingRate) || 0,
      useBins: !!b.useBins,
      ctcBins: b.ctcBins || [],
      paymentTerms: Number(b.paymentTerms) || 30,
      msaExpiry: b.msaExpiry || null,
    },
  });
  res.status(201).json(c);
});

router.put("/:id", requireRole("ADMIN"), async (req, res) => {
  const b = req.body || {};
  const existing = await prisma.client.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
  if (!existing) return res.status(404).json({ error: "Client not found" });
  const c = await prisma.client.update({
    where: { id: existing.id },
    data: {
      name: b.name,
      contact: b.contact || null,
      email: b.email || null,
      phone: b.phone || null,
      industry: b.industry || null,
      gstin: b.gstin || null,
      billingAddress: b.billingAddress || null,
      billingRate: Number(b.billingRate) || 0,
      useBins: !!b.useBins,
      ctcBins: b.ctcBins || [],
      paymentTerms: Number(b.paymentTerms) || 30,
      msaExpiry: b.msaExpiry || null,
    },
  });
  res.json(c);
});

router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  const existing = await prisma.client.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
  if (!existing) return res.status(404).json({ error: "Client not found" });
  await prisma.client.delete({ where: { id: existing.id } });
  res.json({ ok: true });
});

// Create/update the CLIENT-role login for a given client company.
router.post("/:id/portal-user", requireRole("ADMIN"), async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password are required" });
  if (password.length < 8) return res.status(400).json({ error: "Password must be at least 8 characters" });
  const client = await prisma.client.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
  if (!client) return res.status(404).json({ error: "Client not found" });

  const normalizedEmail = String(email).toLowerCase().trim();
  const passwordHash = await bcrypt.hash(password, 12);
  const existingUser = await prisma.user.findFirst({ where: { clientId: client.id, role: "CLIENT" } });

  if (existingUser) {
    if (normalizedEmail !== existingUser.email) {
      const dupe = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (dupe) return res.status(409).json({ error: "That email is already in use" });
    }
    const updated = await prisma.user.update({
      where: { id: existingUser.id },
      data: { email: normalizedEmail, name: name || existingUser.name, passwordHash },
    });
    return res.json({ id: updated.id, email: updated.email, name: updated.name });
  }

  const dupe = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (dupe) return res.status(409).json({ error: "That email is already in use" });
  const created = await prisma.user.create({
    data: { orgId: req.user.orgId, role: "CLIENT", clientId: client.id, name: name || client.contact || client.name, email: normalizedEmail, passwordHash },
  });
  res.status(201).json({ id: created.id, email: created.email, name: created.name });
});

router.get("/:id/portal-user", requireRole("ADMIN"), async (req, res) => {
  const u = await prisma.user.findFirst({
    where: { clientId: req.params.id, role: "CLIENT", orgId: req.user.orgId },
    select: { id: true, email: true, name: true },
  });
  res.json(u || null);
});

module.exports = router;
