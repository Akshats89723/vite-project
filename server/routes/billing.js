import { Router } from "express";
import { orgQueries, userQueries } from "../db.js";
import { planListForPricing, getPlanConfig } from "../billing/plans.js";
import { generateInvoicePdf } from "../billing/invoice.js";
import { sendInvoiceEmail } from "../email/index.js";
import {
  isStripeEnabled,
  createCheckoutSession,
  createPortalSession,
  constructWebhookEvent,
} from "../billing/stripe.js";
import {
  isRazorpayEnabled,
  createRazorpaySubscription,
  verifyWebhookSignature,
} from "../billing/razorpay.js";

export function createBillingRouter({ requireAuth, requireRole, audit, CLIENT_ORIGIN }) {
  const router = Router();

  router.get("/plans", (_req, res) => {
    res.json({
      plans: planListForPricing(),
      stripe_enabled: isStripeEnabled(),
      razorpay_enabled: isRazorpayEnabled(),
    });
  });

  router.get("/subscription", requireAuth, (req, res) => {
    const org = orgQueries.byId.get(req.user.org_id);
    const plan = getPlanConfig(org.plan);
    const seats = userQueries.countByOrg.get(org.id).c;
    res.json({
      plan: org.plan,
      plan_label: plan.label,
      max_seats: org.max_seats ?? plan.max_seats,
      current_seats: seats,
      subscription_status: org.subscription_status || "active",
      trial_ends_at: org.trial_ends_at,
      current_period_end: org.current_period_end,
      ai_messages_used: org.ai_messages_used || 0,
      ai_limit: plan.ai_limit,
      stripe_enabled: isStripeEnabled(),
      has_stripe_customer: Boolean(org.stripe_customer_id),
      razorpay_enabled: isRazorpayEnabled(),
      has_razorpay_customer: Boolean(org.razorpay_customer_id),
    });
  });

  router.post("/checkout", requireAuth, requireRole("admin"), async (req, res) => {
    const { plan } = req.body;
    if (!["pro", "enterprise"].includes(plan)) {
      return res.status(400).json({ error: "Invalid plan. Choose pro or enterprise." });
    }
    if (!isStripeEnabled()) {
      return res.status(503).json({ error: "Billing is not configured. Set STRIPE_SECRET_KEY and price IDs." });
    }

    const org = orgQueries.byId.get(req.user.org_id);
    const user = userQueries.byId.get(req.user.id);
    const base = CLIENT_ORIGIN.replace(/\/$/, "");

    try {
      const session = await createCheckoutSession({
        org,
        user,
        planKey: plan,
        successUrl: `${base}/app/billing/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${base}/app/billing`,
      });
      audit(req, "billing_checkout", "organizations", org.id, { plan });
      res.json({ url: session.url, session_id: session.id });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/razorpay/checkout", requireAuth, requireRole("admin"), async (req, res) => {
    const { plan } = req.body;
    if (!["pro", "enterprise"].includes(plan)) {
      return res.status(400).json({ error: "Invalid plan. Choose pro or enterprise." });
    }
    if (!isRazorpayEnabled()) {
      return res.status(503).json({ error: "Razorpay billing is not configured. Set RAZORPAY_KEY_ID and plan IDs." });
    }

    const org = orgQueries.byId.get(req.user.org_id);
    const user = userQueries.byId.get(req.user.id);

    // If keys contain PlaceHolder, return a mock success response so checkout can run offline
    if (process.env.RAZORPAY_KEY_ID?.includes("PlaceHolder") || process.env.RAZORPAY_KEY_SECRET?.includes("PlaceHolder")) {
      audit(req, "razorpay_checkout_mock", "organizations", org.id, { plan });
      return res.json({
        subscription_id: "sub_mock_" + Math.random().toString(36).substring(2, 10),
        key_id: process.env.RAZORPAY_KEY_ID,
        amount: plan === "pro" ? 2900 : 9900,
        name: user.name,
        email: user.email,
        is_mock: true,
      });
    }

    try {
      const subscription = await createRazorpaySubscription({
        org,
        planKey: plan,
      });

      audit(req, "razorpay_checkout", "organizations", org.id, { plan });
      res.json({
        subscription_id: subscription.id,
        key_id: process.env.RAZORPAY_KEY_ID,
        amount: subscription.amount,
        name: user.name,
        email: user.email,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/start-trial", requireAuth, requireRole("admin"), (req, res) => {
    const { plan } = req.body;
    if (!["pro", "enterprise"].includes(plan)) {
      return res.status(400).json({ error: "Invalid plan. Choose pro or enterprise." });
    }

    const org = orgQueries.byId.get(req.user.org_id);
    const planCfg = getPlanConfig(plan);
    const trialDays = 14;

    try {
      orgQueries.startTrial.run({
        id: org.id,
        plan,
        max_seats: planCfg.max_seats,
        trial_ends_at: Date.now() + trialDays * 24 * 60 * 60 * 1000,
      });

      audit(req, "start_trial", "organizations", org.id, { plan });
      res.json({ ok: true, plan, subscription_status: "trialing" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/razorpay/simulate-success", requireAuth, requireRole("admin"), async (req, res) => {
    const { plan, subscriptionId } = req.body;
    const org = orgQueries.byId.get(req.user.org_id);
    const planCfg = getPlanConfig(plan);
    const amount = plan === "pro" ? 29 : 99;
    try {
      orgQueries.updateRazorpayBilling.run({
        id: org.id,
        plan,
        max_seats: planCfg.max_seats,
        razorpay_customer_id: "cust_mock_" + Math.random().toString(36).substring(2, 10),
        razorpay_subscription_id: subscriptionId,
        subscription_status: "active",
        current_period_end: Date.now() + 30 * 24 * 60 * 60 * 1000,
      });
      audit(req, "razorpay_simulate_success", "organizations", org.id, { plan });

      // Generate invoice PDF
      const pdfBuffer = await generateInvoicePdf({
        orgName: org.name,
        plan,
        amount,
        invoiceId: subscriptionId,
        email: req.user.email,
        paymentMethod: "Razorpay (Simulated)"
      });

      // Email the PDF invoice
      await sendInvoiceEmail({
        email: req.user.email,
        orgName: org.name,
        plan,
        amount,
        pdfBuffer
      });

      res.json({ ok: true });
    } catch (err) {
      console.error("Simulation invoice failure:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  router.post("/portal", requireAuth, requireRole("admin"), async (req, res) => {
    const org = orgQueries.byId.get(req.user.org_id);
    if (!org.stripe_customer_id) {
      return res.status(400).json({ error: "No billing account yet. Subscribe to a paid plan first." });
    }
    try {
      const base = CLIENT_ORIGIN.replace(/\/$/, "");
      const session = await createPortalSession({
        customerId: org.stripe_customer_id,
        returnUrl: `${base}/app/billing`,
      });
      res.json({ url: session.url });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

export async function handleStripeWebhook(req, res, audit) {
  const sig = req.headers["stripe-signature"];
  try {
    const event = constructWebhookEvent(req.body, sig);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const orgId = parseInt(session.metadata?.org_id || session.client_reference_id, 10);
      const plan = session.metadata?.plan || "pro";
      const planCfg = getPlanConfig(plan);
      if (orgId) {
        orgQueries.updateBilling.run({
          id: orgId,
          plan,
          max_seats: planCfg.max_seats,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
          subscription_status: "active",
        });
        audit({ user: null, ip: req.ip }, "stripe_checkout_complete", "organizations", orgId, { plan });

        // Generate and email invoice PDF
        try {
          const org = orgQueries.byId.get(orgId);
          const orgUsers = userQueries.byOrgId.all(orgId) || [];
          const adminUser = orgUsers.find(u => u.role === "admin") || orgUsers[0];
          const email = adminUser?.email || session.customer_details?.email || session.customer_email;

          if (email) {
            const amount = plan === "pro" ? 29 : 99;
            const pdfBuffer = await generateInvoicePdf({
              orgName: org.name,
              plan,
              amount,
              invoiceId: session.subscription || session.id,
              email,
              paymentMethod: "Stripe"
            });

            await sendInvoiceEmail({
              email,
              orgName: org.name,
              plan,
              amount,
              pdfBuffer
            });
          }
        } catch (invoiceErr) {
          console.error("Stripe webhook invoice generation failed:", invoiceErr.message);
        }
      }
    }

    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object;
      const orgId = parseInt(sub.metadata?.org_id, 10);
      const plan = sub.metadata?.plan || "pro";
      if (orgId) {
        orgQueries.updateBilling.run({
          id: orgId,
          plan,
          max_seats: getPlanConfig(plan).max_seats,
          stripe_customer_id: sub.customer,
          stripe_subscription_id: sub.id,
          subscription_status: sub.status,
          current_period_end: sub.current_period_end * 1000,
        });
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object;
      const orgId = parseInt(sub.metadata?.org_id, 10);
      if (orgId) {
        orgQueries.updateBilling.run({
          id: orgId,
          plan: "free",
          max_seats: getPlanConfig("free").max_seats,
          stripe_customer_id: sub.customer,
          stripe_subscription_id: null,
          subscription_status: "cancelled",
        });
      }
    }

    if (event.type === "invoice.payment_failed") {
      const inv = event.data.object;
      const org = orgQueries.byStripeCustomer.get(inv.customer);
      if (org) {
        orgQueries.updateSubscriptionStatus.run("past_due", org.id);
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Stripe webhook error:", err.message);
    res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }
}

export async function handleRazorpayWebhook(req, res, audit) {
  const signature = req.headers["x-razorpay-signature"];
  const rawBody = req.body.toString();
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!verifyWebhookSignature(rawBody, signature, secret)) {
    return res.status(400).json({ error: "Invalid Razorpay webhook signature" });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch (err) {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  const { event, payload: eventPayload } = payload;

  if (event === "subscription.charged") {
    const sub = eventPayload.subscription.entity;
    const orgId = parseInt(sub.notes?.org_id, 10);
    const plan = sub.notes?.plan || "pro";
    const planCfg = getPlanConfig(plan);
    if (orgId) {
      orgQueries.updateRazorpayBilling.run({
        id: orgId,
        plan,
        max_seats: planCfg.max_seats,
        razorpay_customer_id: sub.customer_id || null,
        razorpay_subscription_id: sub.id,
        subscription_status: "active",
        current_period_end: sub.current_end ? sub.current_end * 1000 : null,
      });
      audit({ user: null, ip: req.ip }, "razorpay_checkout_complete", "organizations", orgId, { plan });

      // Generate and email invoice PDF
      try {
        const org = orgQueries.byId.get(orgId);
        const orgUsers = userQueries.byOrgId.all(orgId) || [];
        const adminUser = orgUsers.find(u => u.role === "admin") || orgUsers[0];
        const email = adminUser?.email || sub.notes?.email;

        if (email) {
          const amount = plan === "pro" ? 29 : 99;
          const pdfBuffer = await generateInvoicePdf({
            orgName: org.name,
            plan,
            amount,
            invoiceId: sub.id,
            email,
            paymentMethod: "Razorpay"
          });

          await sendInvoiceEmail({
            email,
            orgName: org.name,
            plan,
            amount,
            pdfBuffer
          });
        }
      } catch (invoiceErr) {
        console.error("Razorpay webhook invoice generation failed:", invoiceErr.message);
      }
    }
  }

  if (event === "subscription.cancelled" || event === "subscription.halted") {
    const sub = eventPayload.subscription.entity;
    const orgId = parseInt(sub.notes?.org_id, 10);
    if (orgId) {
      orgQueries.updateRazorpayBilling.run({
        id: orgId,
        plan: "free",
        max_seats: getPlanConfig("free").max_seats,
        razorpay_customer_id: sub.customer_id || null,
        razorpay_subscription_id: null,
        subscription_status: "cancelled",
        current_period_end: null,
      });
    }
  }

  res.json({ received: true });
}
