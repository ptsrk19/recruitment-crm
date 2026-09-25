require("dotenv").config();
const express = require("express");
const cors = require("cors");

if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is not set. Refusing to start with an insecure default.");
  process.exit(1);
}

const app = express();

// CORS: restrict to the configured frontend origin(s) in production. Set
// CORS_ORIGIN to your Render static site URL (comma-separated for multiple).
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:5173").split(",").map((s) => s.trim());
app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
  })
);

// JSON body limit is small on purpose — actual file uploads go through
// multipart/form-data (see routes/candidates.js), not base64-in-JSON, which
// is what caused the original app's storage size bug.
app.use(express.json({ limit: "2mb" }));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/org", require("./routes/org"));
app.use("/api/clients", require("./routes/clients"));
app.use("/api/recruiters", require("./routes/recruiters"));
app.use("/api/jobs", require("./routes/jobs"));
app.use("/api/candidates", require("./routes/candidates"));
app.use("/api/files", require("./routes/files"));
app.use("/api/placements", require("./routes/placements"));
app.use("/api/invoices", require("./routes/invoices"));
app.use("/api/interviews", require("./routes/interviews"));
app.use("/api/activities", require("./routes/activities"));
app.use("/api/reports", require("./routes/reports"));
app.use("/api/dashboard", require("./routes/dashboard"));

// Centralized error handler — multer file-too-large errors, CORS rejections,
// and any uncaught route error land here instead of leaking a stack trace.
app.use((err, req, res, next) => {
  if (err && err.message === "Not allowed by CORS") return res.status(403).json({ error: "Not allowed by CORS" });
  if (err && err.code === "LIMIT_FILE_SIZE") return res.status(413).json({ error: "File is too large (max 8MB)" });
  console.error(err);
  res.status(500).json({ error: "Something went wrong on the server" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API listening on :${PORT}`));
