import { Router } from "express";
import { orgQueries, userQueries } from "../db.js";
import { requireSuperAdmin } from "../middleware/requireSuperAdmin.js";
import { getPlanConfig } from "../billing/plans.js";

export function createAdminRouter({ requireAuth, audit }) {
  const router = Router();

  router.use(requireAuth, requireSuperAdmin);

  router.get("/orgs", (_req, res) => {
    const orgs = orgQueries.listAll.all();
    const enriched = orgs.map(o => ({
      ...o,
      member_count: userQueries.countByOrg.get(o.id).c,
      plan_label: getPlanConfig(o.plan).label,
    }));
    res.json(enriched);
  });

  router.get("/stats", (_req, res) => {
    const orgs = orgQueries.listAll.all();
    const byPlan = {};
    for (const o of orgs) byPlan[o.plan] = (byPlan[o.plan] || 0) + 1;
    res.json({
      total_orgs: orgs.length,
      total_users: userQueries.count.get().c,
      by_plan: byPlan,
    });
  });

  router.patch("/orgs/:id/plan", (req, res) => {
    const { plan, max_seats } = req.body;
    const org = orgQueries.byId.get(req.params.id);
    if (!org) return res.status(404).json({ error: "Organization not found." });
    const cfg = getPlanConfig(plan || org.plan);
    orgQueries.updateBilling.run({
      id: org.id,
      plan: plan || org.plan,
      max_seats: max_seats ?? cfg.max_seats,
      stripe_customer_id: org.stripe_customer_id,
      stripe_subscription_id: org.stripe_subscription_id,
      subscription_status: org.subscription_status || "active",
      current_period_end: org.current_period_end,
    });
    audit(req, "admin_override_plan", "organizations", org.id, req.body);
    res.json(orgQueries.byId.get(org.id));
  });

  return router;
}
