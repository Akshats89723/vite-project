import { orgQueries } from "../db.js";
import { aiLimitForOrg } from "../billing/plans.js";

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function checkAiQuota(req, res, next) {
  const org = orgQueries.byId.get(req.user.org_id);
  if (!org) return res.status(404).json({ error: "Organization not found." });

  const limit = aiLimitForOrg(org);
  if (limit === -1) {
    req.org = org;
    return next();
  }

  const month = currentMonth();
  let used = org.ai_messages_used || 0;
  if (org.ai_usage_month !== month) {
    orgQueries.resetAiUsage.run(month, org.id);
    used = 0;
  }

  if (used >= limit) {
    return res.status(429).json({
      error: `AI message limit reached (${limit}/month on ${org.plan} plan). Upgrade for more.`,
      code: "AI_QUOTA_EXCEEDED",
      limit,
      used,
      plan: org.plan,
    });
  }

  req.org = org;
  next();
}

export function incrementAiUsage(orgId) {
  const month = currentMonth();
  orgQueries.incrementAiUsage.run(month, month, orgId);
}
