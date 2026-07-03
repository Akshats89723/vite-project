import Razorpay from "razorpay";
import { PLANS } from "./plans.js";
import crypto from "crypto";

let razorpay = null;

export function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  if (!razorpay) {
    razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }
  return razorpay;
}

export function isRazorpayEnabled() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function planIdForPlan(planKey) {
  // We can define RAZORPAY_PLAN_PRO and RAZORPAY_PLAN_ENTERPRISE in .env
  const key = planKey?.toLowerCase();
  if (key === "pro") return process.env.RAZORPAY_PLAN_PRO || null;
  if (key === "enterprise") return process.env.RAZORPAY_PLAN_ENTERPRISE || null;
  return null;
}

export async function createRazorpaySubscription({ org, planKey }) {
  const r = getRazorpay();
  if (!r) throw new Error("Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env");

  let planId = planIdForPlan(planKey);

  // If the plan ID is placeholder or not configured, create a plan dynamically on Razorpay!
  if (!planId || planId.includes("PlaceHolder") || planId.includes("YOUR_REAL")) {
    const isPro = planKey === "pro";
    const amount = isPro ? 290000 : 990000; // in INR paise (e.g. Rs 2900.00 / Rs 9900.00)

    try {
      const newPlan = await r.plans.create({
        period: "monthly",
        interval: 1,
        item: {
          name: `PeopleCore ${isPro ? "Pro" : "Enterprise"} Plan`,
          amount: amount,
          currency: "INR",
          description: `Subscription to ${isPro ? "Pro" : "Enterprise"} Plan`,
        }
      });
      planId = newPlan.id;
    } catch (err) {
      throw new Error(`Failed to automatically create plan on Razorpay: ${err.message}. Please verify your Key ID and Key Secret.`);
    }
  }

  // Create Subscription in Razorpay
  const subscriptionParams = {
    plan_id: planId,
    customer_notify: 1,
    total_count: 60, // 60 months (5 years)
    quantity: 1,
    notes: {
      org_id: String(org.id),
      plan: planKey,
    },
  };

  return r.subscriptions.create(subscriptionParams);
}

export function verifyWebhookSignature(rawBody, signature, secret) {
  const shasum = crypto.createHmac("sha256", secret || process.env.RAZORPAY_WEBHOOK_SECRET);
  shasum.update(rawBody);
  const digest = shasum.digest("hex");
  return digest === signature;
}
