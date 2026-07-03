import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "../ai/context.js";

describe("AI context", () => {
  it("includes org name in system prompt", () => {
    const prompt = buildSystemPrompt({ name: "Acme Corp" });
    expect(prompt).toContain("Acme Corp");
  });

  it("uses default policies when none set", () => {
    const prompt = buildSystemPrompt({ name: "Test" });
    expect(prompt).toContain("Annual leave");
  });
});
