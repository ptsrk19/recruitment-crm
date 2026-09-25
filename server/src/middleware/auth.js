const jwt = require("jsonwebtoken");

// ── Auth ──────────────────────────────────────────────────────────────────
// BUG FIXED: the original app had no server at all — the entire dataset for
// every client and recruiter sat in one JSON blob inside the browser, and
// "access control" was just which parts of it the UI chose to render. Anyone
// could open devtools and read every other tenant's data. Now every request
// must carry a valid JWT, and every route handler filters its database
// queries by req.user.orgId (and, for CLIENT/RECRUITER roles, by clientId or
// recruiterId too) — enforced in the database query itself, not just in the UI.
function auth(req, res, next) {
  const header = req.headers.authorization || "";
  // File download links are plain <a href> tags and can't set an Authorization
  // header, so we also accept ?token=... on GET requests for those routes only.
  const token = (header.startsWith("Bearer ") ? header.slice(7) : null) || (req.method === "GET" ? req.query.token : null);
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, orgId, role, clientId, name, email }
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired session" });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You don't have permission to do this" });
    }
    next();
  };
}

module.exports = { auth, requireRole };
