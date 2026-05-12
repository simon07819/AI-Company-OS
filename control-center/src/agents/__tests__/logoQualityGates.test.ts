import { describe, expect, it } from "vitest";
import { validateLogoDeliverable } from "@/agents/quality/logo-quality-gates";
import { runDesignTeamWorkflow } from "@/lib/design-team/logoWorkflow";

describe("logo quality gates", () => {
  it("rejects missing and placeholder brand names", () => {
    expect(validateLogoDeliverable({ brandName: "", visibleOutput: { kind: "visual", deliverableType: "logo", primaryVisual: "<svg viewBox=\"0 0 10 10\"><path d=\"M0 0h10\"/></svg>" } }).ok).toBe(false);
    expect(validateLogoDeliverable({ brandName: "Marque à nommer", visibleOutput: { kind: "visual", deliverableType: "logo", primaryVisual: "<svg viewBox=\"0 0 10 10\"><path d=\"M0 0h10\"/></svg>" } }).issues).toContain("brandName placeholder");
  });

  it("rejects brand system outputs and text-only visuals", () => {
    const report = validateLogoDeliverable({
      brandName: "EKIDA",
      visibleOutput: {
        kind: "brandSystem",
        deliverableType: "logo",
        brandName: "EKIDA",
        primaryVisual: "<svg viewBox=\"0 0 100 100\"><text>EKIDA</text></svg>",
      },
    });

    expect(report.ok).toBe(false);
    expect(report.issues).toEqual(expect.arrayContaining(["visibleOutput kind brandSystem interdit", "logo texte-seulement"]));
  });

  it("rejects unrelated generic initials", () => {
    const report = validateLogoDeliverable({
      brandName: "EKIDA",
      visibleOutput: {
        kind: "visual",
        deliverableType: "logo",
        brandName: "EKIDA",
        primaryVisual: "<svg viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\"/><text>B</text></svg>",
      },
    });

    expect(report.ok).toBe(false);
    expect(report.issues).toContain("initiale générique sans rapport");
  });

  it("accepts the generated EKIDA and PROSHOTS visual deliverables", () => {
    const ekida = runDesignTeamWorkflow("logo EKIDA sur fond noir");
    const proshots = runDesignTeamWorkflow("fais-moi un logo pour PROSHOTS ses des photographes sportifs");

    expect(validateLogoDeliverable({ brandName: "EKIDA", visibleOutput: ekida.visibleOutput }).ok).toBe(true);
    expect(validateLogoDeliverable({ brandName: "PROSHOTS", visibleOutput: proshots.visibleOutput }).ok).toBe(true);
  });
});
