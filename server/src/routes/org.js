const router = require("express").Router();
const prisma = require("../lib/prisma");
const { auth, requireRole } = require("../middleware/auth");

router.use(auth);

router.get("/", async (req, res) => {
  const org = await prisma.organization.findUnique({ where: { id: req.user.orgId } });
  if (!org) return res.status(404).json({ error: "Organization not found" });
  res.json(org);
});

router.put("/", requireRole("ADMIN"), async (req, res) => {
  const b = req.body || {};
  const org = await prisma.organization.update({
    where: { id: req.user.orgId },
    data: {
      name: b.name,
      gstin: b.gstin || null,
      pan: b.pan || null,
      address: b.address || null,
      email: b.email || null,
      phone: b.phone || null,
      bank: b.bank || null,
      accountNo: b.accountNo || null,
      ifsc: b.ifsc || null,
      sacCode: b.sacCode || "998513",
      logoDataUrl: b.logoDataUrl ?? undefined,
      invoiceAccentColor: b.invoiceAccentColor || "#1E1B4B",
      invoiceFontFamily: b.invoiceFontFamily || "'Segoe UI',Arial,sans-serif",
      invoiceShowLogo: b.invoiceShowLogo !== false,
      invoiceShowStamp: b.invoiceShowStamp !== false,
      invoiceFooterNote: b.invoiceFooterNote || null,
      invoiceServiceDesc: b.invoiceServiceDesc || null,
    },
  });
  res.json(org);
});

module.exports = router;
