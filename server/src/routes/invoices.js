const router = require("express").Router();
const prisma = require("../lib/prisma");
const { auth, requireRole } = require("../middleware/auth");
const { computeGst } = require("../lib/gst");
const { buildInvoiceHTML } = require("../lib/invoiceHtml");

router.use(auth);

router.get("/", async (req, res) => {
  const where = { orgId: req.user.orgId };
  if (req.user.role === "CLIENT") {
    if (!req.user.clientId) return res.json([]);
    where.clientId = req.user.clientId;
    where.published = true; // clients only ever see published invoices
  }
  if (req.user.role === "RECRUITER") return res.status(403).json({ error: "Recruiters don't have access to invoices" });
  const invoices = await prisma.invoice.findMany({ where, orderBy: { issuedAt: "desc" } });
  res.json(invoices);
});

async function loadScoped(req) {
  const where = { id: req.params.id, orgId: req.user.orgId };
  if (req.user.role === "CLIENT") { where.clientId = req.user.clientId; where.published = true; }
  return prisma.invoice.findFirst({ where });
}

router.put("/:id", requireRole("ADMIN"), async (req, res) => {
  const existing = await prisma.invoice.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
  if (!existing) return res.status(404).json({ error: "Invoice not found" });
  const b = req.body || {};

  // Recompute GST server-side whenever ctc/billingRate/status change, using the
  // same state-aware logic as generation — never trust a client-supplied total.
  const ctc = b.ctc !== undefined ? Number(b.ctc) || 0 : existing.ctc;
  const billingRate = b.billingRate !== undefined ? Number(b.billingRate) || 0 : existing.billingRate;
  const feeAmount = (ctc * billingRate) / 100;
  const client = await prisma.client.findFirst({ where: { id: existing.clientId, orgId: req.user.orgId } });
  const org = await prisma.organization.findUnique({ where: { id: req.user.orgId } });
  const gst = computeGst(feeAmount, org.gstin, b.clientGstin ?? existing.clientGstin ?? client?.gstin);

  const invoice = await prisma.invoice.update({
    where: { id: existing.id },
    data: {
      ctc,
      billingRate,
      feeAmount,
      taxType: gst.taxType,
      sgst: gst.sgst,
      cgst: gst.cgst,
      igst: gst.igst,
      totalAmount: gst.totalAmount,
      status: b.status ?? existing.status,
      dueDate: b.dueDate ?? existing.dueDate,
      notes: b.notes ?? existing.notes,
      sacCode: b.sacCode ?? existing.sacCode,
      billingAddress: b.billingAddress ?? existing.billingAddress,
      clientGstin: b.clientGstin ?? existing.clientGstin,
    },
  });

  if (b.status) {
    const placementStatus = b.status === "Paid" ? "Paid" : invoice.published ? "Published" : "Draft";
    await prisma.placement.update({ where: { id: invoice.placementId }, data: { invoiceStatus: placementStatus } }).catch(() => {});
  }
  res.json(invoice);
});

router.post("/:id/publish", requireRole("ADMIN"), async (req, res) => {
  const existing = await prisma.invoice.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
  if (!existing) return res.status(404).json({ error: "Invoice not found" });
  if (existing.published) return res.status(409).json({ error: "This invoice is already published" });
  const invoice = await prisma.invoice.update({ where: { id: existing.id }, data: { published: true, status: "Unpaid" } });
  await prisma.placement.update({ where: { id: invoice.placementId }, data: { invoiceStatus: "Published" } });
  res.json(invoice);
});

router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  const existing = await prisma.invoice.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
  if (!existing) return res.status(404).json({ error: "Invoice not found" });
  await prisma.invoice.delete({ where: { id: existing.id } });
  await prisma.placement.update({ where: { id: existing.placementId }, data: { invoiceStatus: "Draft" } }).catch(() => {});
  res.json({ ok: true });
});

router.get("/:id/html", async (req, res) => {
  const invoice = await loadScoped(req);
  if (!invoice) return res.status(404).send("Invoice not found");
  const [org, client, candidate, job] = await Promise.all([
    prisma.organization.findUnique({ where: { id: req.user.orgId } }),
    prisma.client.findUnique({ where: { id: invoice.clientId } }),
    prisma.candidate.findUnique({ where: { id: invoice.candidateId } }),
    invoice.jobId ? prisma.job.findUnique({ where: { id: invoice.jobId } }) : null,
  ]);
  const html = buildInvoiceHTML({ invoice, org, client, candidate, job, forPrint: true });
  res.setHeader("Content-Type", "text/html");
  res.send(html);
});

module.exports = router;
