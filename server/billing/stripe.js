import Stripe from "stripe";
import { PLANS } from "./plans.js";

let stripe = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripe) stripe = new Stripe(key, { apiVersion: "2024-11-20.acacia" });
  return stripe;
}

export function isStripeEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function priceIdForPlan(planKey) {
  return PLANS[planKey?.toLowerCase()]?.stripe_price || null;
}

export async function createCheckoutSession({ org, user, planKey, successUrl, cancelUrl }) {
  const s = getStripe();
  if (!s) throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY in .env");

  const priceId = priceIdForPlan(planKey);
  if (!priceId) throw new Error(`No Stripe price configured for plan: ${planKey}`);

  const sessionParams = {
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: String(org.id),
    metadata: { org_id: String(org.id), plan: planKey },
    subscription_data: {
      metadata: { org_id: String(org.id), plan: planKey },
    },
  };

  if (org.stripe_customer_id) {
    sessionParams.customer = org.stripe_customer_id;
  } else {
    sessionParams.customer_email = user.email;
  }

  return s.checkout.sessions.create(sessionParams);
}

export async function createPortalSession({ customerId, returnUrl }) {
  const s = getStripe();
  if (!s) throw new Error("Stripe is not configured");
  return s.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
}

export function constructWebhookEvent(rawBody, signature) {
  const s = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!s || !secret) throw new Error("Stripe webhook not configured");
  return s.webhooks.constructEvent(rawBody, signature, secret);
}
