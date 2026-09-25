const router = require("express").Router();
const prisma = require("../lib/prisma");
const { auth, requireRole } = require("../middleware/auth");

router.use(auth);
router.use(requireRole("ADMIN"));

router.get("/", async (req, res) => {
  const activities = await prisma.activity.findMany({ where: { orgId: req.user.orgId }, orderBy: { date: "desc" }, take: 200 });
  res.json(activities);
});

module.exports = router;
