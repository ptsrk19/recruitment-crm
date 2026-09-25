const router = require("express").Router();
const prisma = require("../lib/prisma");
const { auth, requireRole } = require("../middleware/auth");
const { todayStr, addDays } = require("../lib/dates");
const { computeGst } = require("../lib/gst");

router.use(auth);
router.use(requireRole("ADMIN")); // placements & billing are an admin-only surface

function getBillingRate(client, ctc) {
  if (!client) return 0;
  if (client.useBins && Array.isArray(client.ctcBins) && client.ctcBins.length > 0) {
    const ctcNum = Number(ctc) || 0;
    const sorted = [...client.ctcBins].sort((a, b) => Number(a.ctcMin) - Number(b.ctcMin));
    for (const bin of sorted) {
      const lo = Number(bin.ctcMin) || 0;
      const hi = bin.ctcMax === "" || bin.ctcMax == null ? Infinity : Number(bin.ctcMax);
      if (ctcNum >= lo && ctcNum <= hi) return Number(bin.rate) || 0;
    }
  }
  return Number(client.billingRate) || 0;
}

router.get("/", async (req, res) => {
  const placements = await prisma.placement.findMany({ where: { orgId: req.user.orgId }, include: { invoice: true }, orderBy: { placedAt: "desc" } });
  res.json(placements);
});

router.post("/", async (req, res) => {
  const b = req.body || {};
  if (!b.candidateId || !b.jobId || !b.clientId) return res.status(400).json({ error: "Candidate, job and client are required" });
  const ctc = Number(b.ctc);
  if (!ctc || ctc <= 0) return res.status(400).json({ error: "Please enter a valid CTC amount" });

  const client = await prisma.client.findFirst({ where: { id: b.clientId, orgId: req.user.orgId } });
  if (!client) return res.status(404).json({ error: "Client not found" });

  const billingRate = getBillingRate(client, ctc);
  const fee = (ctc * billingRate) / 100;
  const placement = await prisma.placement.create({
    data: {
      orgId: req.user.orgId,
      candidateId: b.candidateId,
      jobId: b.jobId,
      clientId: b.clientId,
      ctc,
      billingRate,
      fee,
      startDate: b.startDate || todayStr(),
      placedAt: todayStr(),
      feedback: b.feedback || null,
    },
  });
  await prisma.candidate.update({ where: { id: b.candidateId }, data: { status: "Placed" } });
  const cand = await prisma.candidate.findUnique({ where: { id: b.candidateId } });
  await prisma.activity.create({
    data: { orgId: req.user.orgId, type: "Placed", candidateId: b.candidateId, jobId: b.jobId, date: todayStr(), note: `${cand?.name || "Candidate"} placed at ${client.name} — CTC ${ctc}, Fee ${fee.toFixed(0)}` },
  });
  res.status(201).json(placement);
});

router.put("/:id", async (req, res) => {
  const existing = await prisma.placement.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
  if (!existing) return res.status(404).json({ error: "Placement not found" });
  const b = req.body || {};
  const client = await prisma.client.findFirst({ where: { id: b.clientId || existing.clientId, orgId: req.user.orgId } });
  const ctc = b.ctc !== undefined ? Number(b.ctc) : existing.ctc;
  const billingRate = getBillingRate(client, ctc);
  const fee = (ctc * billingRate) / 100;
  const placement = await prisma.placement.update({
    where: { id: existing.id },
    data: { ctc, billingRate, fee, startDate: b.startDate ?? existing.startDate, feedback: b.feedback ?? existing.feedback },
  });
  res.json(placement);
});

// Sequential invoice numbers, reset per financial year (Apr–Mar), instead of
// the original's counter that never reset across years.
async function nextInvoiceNo(orgId, orgName) {
  const prefix = (orgName || "CP").split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 3);
  const d = new Date();
  const y = d.getFullYear();
  const fy = d.getMonth() >= 3 ? `${y}-${String(y + 1).slice(2)}` : `${y - 1}-${String(y).slice(2)}`;
  const countThisFy = await prisma.invoice.count({ where: { orgId, invoiceNo: { contains: `/${fy}/` } } });
  return `${prefix}/${fy}/${String(countThisFy + 1).padStart(3, "0")}`;
}

router.post("/:id/generate-invoice", async (req, res) => {
  const placement = await prisma.placement.findFirst({ where: { id: req.params.id, orgId: req.user.orgId }, include: { invoice: true } });
  if (!placement) return res.status(404).json({ error: "Placement not found" });
  if (placement.invoice) return res.status(409).json({ error: "An invoice already exists for this placement" });
  if (!placement.ctc || placement.ctc <= 0) return res.status(400).json({ error: "CTC must be set before generating an invoice" });

  const client = await prisma.client.findFirst({ where: { id: placement.clientId, orgId: req.user.orgId } });
  const org = await prisma.organization.findUnique({ where: { id: req.user.orgId } });
  const billingRate = getBillingRate(client, placement.ctc);
  const feeAmount = (placement.ctc * billingRate) / 100;
  const gst = computeGst(feeAmount, org.gstin, client.gstin);
  const invoiceNo = await nextInvoiceNo(req.user.orgId, org.name);
  const dueDate = addDays(todayStr(), client.paymentTerms || 30);

  const invoice = await prisma.invoice.create({
    data: {
      orgId: req.user.orgId,
      placementId: placement.id,
      clientId: placement.clientId,
      candidateId: placement.candidateId,
      jobId: placement.jobId,
      invoiceNo,
      ctc: placement.ctc,
      billingRate,
      feeAmount,
      taxType: gst.taxType,
      sgst: gst.sgst,
      cgst: gst.cgst,
      igst: gst.igst,
      totalAmount: gst.totalAmount,
      status: "Draft",
      issuedAt: todayStr(),
      dueDate,
      sacCode: org.sacCode || "998513",
      billingAddress: client.billingAddress || null,
      clientGstin: client.gstin || null,
    },
  });
  await prisma.placement.update({ where: { id: placement.id }, data: { invoiceStatus: "Draft" } });
  res.status(201).json({ ...invoice, gstStateMatchKnown: gst.stateMatchKnown });
});

module.exports = router;
