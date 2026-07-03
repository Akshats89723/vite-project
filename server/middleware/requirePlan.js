import { orgQueries, userQueries } from "../db.js";
import { hasFeature, effectiveMaxSeats } from "../billing/plans.js";

export function loadOrg(req, res, next) {
  const org = orgQueries.byId.get(req.user.org_id);
  if (!org) return res.status(404).json({ error: "Organization not found." });
  req.org = org;
  next();
}

export function requireFeature(feature) {
  return [loadOrg, (req, res, next) => {
    if (!hasFeature(req.org, feature)) {
      return res.status(403).json({
        error: `This feature requires a Pro or Enterprise plan.`,
        code: "PLAN_UPGRADE_REQUIRED",
        feature,
        plan: req.org.plan,
      });
    }
    next();
  }];
}

export function requirePlan(...allowedPlans) {
  return [loadOrg, (req, res, next) => {
    if (!allowedPlans.includes(req.org.plan?.toLowerCase())) {
      return res.status(403).json({
        error: `Requires ${allowedPlans.join(" or ")} plan.`,
        code: "PLAN_UPGRADE_REQUIRED",
        plan: req.org.plan,
      });
    }
    next();
  }];
}

export function checkSeatLimit(req, res, next) {
  const org = orgQueries.byId.get(req.user.org_id);
  if (!org) return res.status(404).json({ error: "Organization not found." });
  req.org = org;
  const max = effectiveMaxSeats(org);
  const current = userQueries.countByOrg.get(org.id).c;
  if (current >= max) {
    return res.status(403).json({
      error: `Seat limit reached (${max}). Upgrade your plan to add more members.`,
      code: "SEAT_LIMIT_REACHED",
      plan: org.plan,
      max_seats: max,
      current_seats: current,
    });
  }
  next();
}

export { effectiveMaxSeats };
