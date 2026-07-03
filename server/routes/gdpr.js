import { Router } from "express";
import db, { orgQueries, userQueries, auditQueries } from "../db.js";

export function createGdprRouter({ requireAuth, requireRole, audit }) {
  const router = Router();

  router.get("/export", requireAuth, requireRole("admin"), (req, res) => {
    const orgId = req.user.org_id;
    const org = orgQueries.byId.get(orgId);
    const users = userQueries.byOrgId.all(orgId);
    const employees = db.prepare("SELECT * FROM employees WHERE org_id=?").all(orgId);
    const leaves = db.prepare("SELECT * FROM leaves WHERE org_id=?").all(orgId);
    const candidates = db.prepare("SELECT * FROM candidates WHERE org_id=?").all(orgId);
    const auditLog = auditQueries.byOrg.all(orgId);

    audit(req, "data_export", "organizations", orgId);
    res.json({
      exported_at: new Date().toISOString(),
      organization: org,
      users,
      employees,
      leaves,
      candidates,
      audit_log: auditLog,
    });
  });

  router.delete("/org", requireAuth, requireRole("admin"), (req, res) => {
    const { confirm } = req.body;
    if (confirm !== "DELETE") {
      return res.status(400).json({ error: 'Send { "confirm": "DELETE" } to permanently delete your organization.' });
    }
    const orgId = req.user.org_id;
    audit(req, "org_delete_requested", "organizations", orgId);
    orgQueries.delete.run(orgId);
    res.json({ ok: true, message: "Organization and all data deleted." });
  });

  return router;
}
