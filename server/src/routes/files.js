const router = require("express").Router();
const prisma = require("../lib/prisma");
const { auth } = require("../middleware/auth");

router.use(auth);

router.get("/:id", async (req, res) => {
  const file = await prisma.fileAsset.findFirst({ where: { id: req.params.id, orgId: req.user.orgId } });
  if (!file) return res.status(404).json({ error: "File not found" });

  // Extra scoping: a CLIENT/RECRUITER can only fetch a file that's actually
  // attached to a record they're allowed to see (not just anything in the org).
  if (req.user.role !== "ADMIN") {
    const candWhere = { OR: [{ cvFileId: file.id }, { videoFileId: file.id }] };
    if (req.user.role === "CLIENT") candWhere.clientId = req.user.clientId;
    if (req.user.role === "RECRUITER") candWhere.recruiterId = req.user.id;
    const viaCandidate = await prisma.candidate.findFirst({ where: candWhere });
    const viaClient = req.user.role === "CLIENT" ? await prisma.client.findFirst({ where: { id: req.user.clientId, msaFileId: file.id } }) : null;
    if (!viaCandidate && !viaClient) return res.status(403).json({ error: "Not permitted" });
  }

  res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
  res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(file.filename)}"`);
  res.send(Buffer.from(file.data));
});

module.exports = router;
