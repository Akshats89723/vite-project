import { describe, it, expect } from "vitest";
import { getPlanConfig, hasFeature, effectiveMaxSeats, aiLimitForOrg } from "../billing/plans.js";

describe("billing plans", () => {
  it("returns free plan defaults", () => {
    const p = getPlanConfig("free");
    expect(p.max_seats).toBe(10);
    expect(p.ats).toBe(false);
  });

  it("pro plan has ATS", () => {
    expect(hasFeature({ plan: "pro" }, "ats")).toBe(true);
    expect(hasFeature({ plan: "free" }, "ats")).toBe(false);
  });

  it("effectiveMaxSeats uses org override", () => {
    expect(effectiveMaxSeats({ plan: "free", max_seats: 25 })).toBe(25);
  });

  it("enterprise has unlimited AI", () => {
    expect(aiLimitForOrg({ plan: "enterprise" })).toBe(-1);
  });
});
