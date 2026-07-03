import { orgQueries } from "../db.js";
import { getPlanConfig } from "../billing/plans.js";

export function runTrialExpiryJob() {
  const now = Date.now();
  try {
    const expired = orgQueries.expiredTrials.all(now);
    for (const org of expired) {
      orgQueries.updateBilling.run({
        id: org.id,
        plan: "free",
        max_seats: getPlanConfig("free").max_seats,
        stripe_customer_id: org.stripe_customer_id,
        stripe_subscription_id: org.stripe_subscription_id,
        subscription_status: "trial_expired",
        current_period_end: org.current_period_end,
      });
      console.log(`⏱️  Trial expired for org #${org.id} (${org.name}) → downgraded to free`);
    }
  } catch (err) {
    console.warn("Trial expiry job:", err.message);
  }
}
