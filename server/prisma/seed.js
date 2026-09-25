// Creates one demo organization with an admin, a recruiter, two clients (one
// same-state, one different-state, so you can see both CGST+SGST and IGST
// invoices), a couple of jobs and candidates. Run with `npm run seed`.
// Prints the generated login credentials to the console — nothing is ever
// hard-coded into the app itself or shown on a login screen.
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

function todayStr() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

async function main() {
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "ChangeMe123!";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const org = await prisma.organization.create({
    data: {
      name: "Closure Point",
      gstin: "27AABCC1234A1Z5", // Maharashtra (27)
      pan: "AABCC1234A",
      address: "12th Floor, BKC, Mumbai - 400051",
      email: "accounts@closurepoint.in",
      phone: "+91 22 4000 1000",
      bank: "HDFC Bank",
      accountNo: "50100123456789",
      ifsc: "HDFC0000123",
    },
  });

  const admin = await prisma.user.create({
    data: { orgId: org.id, role: "ADMIN", name: "Demo Admin", email: "admin@closurepoint.in", passwordHash },
  });

  const recruiter = await prisma.user.create({
    data: { orgId: org.id, role: "RECRUITER", name: "Preethi Sundaram", email: "preethi@closurepoint.in", passwordHash },
  });

  // Same state as org (Maharashtra, code 27) -> should invoice CGST+SGST
  const nexus = await prisma.client.create({
    data: { orgId: org.id, name: "Nexus Tech", contact: "Ravi Kumar", email: "ravi@nexustech.in", industry: "Technology", gstin: "27AAACN1234B1Z1", billingRate: 8.33, paymentTerms: 30 },
  });
  // Different state (Karnataka, code 29) -> should invoice IGST
  const greenbridge = await prisma.client.create({
    data: { orgId: org.id, name: "GreenBridge Capital", contact: "Meena Iyer", email: "meena@greenbridge.in", industry: "Finance", gstin: "29AABCG5678B1Z3", billingRate: 10, paymentTerms: 45 },
  });

  await prisma.client.update({ where: { id: nexus.id }, data: { users: { create: { orgId: org.id, role: "CLIENT", name: "Ravi Kumar", email: "ravi@nexustech.in", passwordHash } } } });

  const job1 = await prisma.job.create({
    data: { orgId: org.id, clientId: nexus.id, title: "Senior Frontend Engineer", location: "Bangalore", openPositions: 3, workMode: "Hybrid", skills: "React,TypeScript,Node.js", assignedRecruiters: [recruiter.id], createdAt: todayStr() },
  });

  await prisma.candidate.create({
    data: { orgId: org.id, clientId: nexus.id, jobId: job1.id, recruiterId: recruiter.id, name: "Ananya Rao", email: "ananya.rao@example.com", phone: "9876500001", role: "Senior Frontend Engineer", status: "Interview", aiScore: 82, tags: ["React", "TypeScript"], createdAt: todayStr() },
  });

  console.log("\nSeed complete.\n");
  console.log("Organization:", org.name);
  console.log("Admin login:      admin@closurepoint.in /", adminPassword);
  console.log("Recruiter login:  preethi@closurepoint.in /", adminPassword);
  console.log("Client login:     ravi@nexustech.in /", adminPassword);
  console.log("\n(Change these passwords after first login.)\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
