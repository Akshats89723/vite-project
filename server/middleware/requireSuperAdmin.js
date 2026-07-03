const SUPER_ADMINS = (process.env.SUPER_ADMIN_EMAILS || "")
  .split(",")
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

export function requireSuperAdmin(req, res, next) {
  if (!req.user?.email) return res.status(401).json({ error: "Authentication required" });
  if (!SUPER_ADMINS.includes(req.user.email.toLowerCase())) {
    return res.status(403).json({ error: "Super-admin access required." });
  }
  next();
}

export function isSuperAdminEmail(email) {
  return SUPER_ADMINS.includes(email?.toLowerCase());
}
