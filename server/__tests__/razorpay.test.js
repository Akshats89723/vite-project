import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isRazorpayEnabled, planIdForPlan, verifyWebhookSignature } from "../billing/razorpay.js";
import crypto from "crypto";

describe("Razorpay billing helper", () => {
  const oldEnv = process.env;

  beforeEach(() => {
    process.env = { ...oldEnv };
  });

  afterEach(() => {
    process.env = oldEnv;
  });

  it("checks if razorpay is enabled based on env keys", () => {
    process.env.RAZORPAY_KEY_ID = "key_123";
    process.env.RAZORPAY_KEY_SECRET = "secret_123";
    expect(isRazorpayEnabled()).toBe(true);

    delete process.env.RAZORPAY_KEY_ID;
    expect(isRazorpayEnabled()).toBe(false);
  });

  it("resolves plan IDs from environment variables", () => {
    process.env.RAZORPAY_PLAN_PRO = "plan_pro_123";
    process.env.RAZORPAY_PLAN_ENTERPRISE = "plan_ent_123";

    expect(planIdForPlan("pro")).toBe("plan_pro_123");
    expect(planIdForPlan("enterprise")).toBe("plan_ent_123");
    expect(planIdForPlan("free")).toBeNull();
  });

  it("verifies webhook signatures correctly", () => {
    const rawBody = JSON.stringify({ event: "payment.authorized" });
    const secret = "super_secret_webhook";
    
    // Create valid signature
    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(rawBody);
    const signature = shasum.digest("hex");

    expect(verifyWebhookSignature(rawBody, signature, secret)).toBe(true);
    expect(verifyWebhookSignature(rawBody, "invalid_sig", secret)).toBe(false);
  });
});
