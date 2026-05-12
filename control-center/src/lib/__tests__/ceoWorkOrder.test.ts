import { describe, expect, it } from "vitest";
import { createWorkOrderFromPrompt, shouldReusePreviousDeliverable } from "@/lib/ceoWorkOrder";

describe("CEO work order routing", () => {
  it("routes logo prompts as logo deliverables", () => {
    const order = createWorkOrderFromPrompt("logo EKIDA");

    expect(order.requestType).toBe("branding");
    expect(order.deliverableType).toBe("logo");
    expect(order.brandName).toBe("EKIDA");
  });

  it("routes page web prompts with logo as website, not logo", () => {
    const order = createWorkOrderFromPrompt("Je veux une page web bien simple avec le logo ekida, tu peux mettre du contenu temporaire ses une compagnie de linge");

    expect(order.requestType).toBe("website");
    expect(order.deliverableType).toBe("landing_page");
    expect(order.visibleKind).toBe("website_preview");
    expect(order.brandName).toBe("EKIDA");
    expect(order.assetRequests).toContain("logo");
    expect(order.contentMode).toBe("temporary");
    expect(order.industry).toBe("apparel");
  });

  it("routes landing pages with a logo as web deliverables", () => {
    const order = createWorkOrderFromPrompt("crée une landing page avec le logo EKIDA");

    expect(order.requestType).toBe("website");
    expect(order.deliverableType).toBe("landing_page");
    expect(order.brandName).toBe("EKIDA");
    expect(order.assetRequests).toContain("logo");
  });

  it("only reuses previous deliverables for explicit compatible edits", () => {
    const previous = { deliverableType: "logo", primaryVisual: "<svg>logo</svg>" };

    expect(shouldReusePreviousDeliverable({ prompt: "modifie ce logo en noir", deliverableType: "logo" }, previous)).toBe(true);
    expect(shouldReusePreviousDeliverable({ prompt: "je veux une page web avec ce logo", deliverableType: "landing_page" }, previous)).toBe(false);
    expect(createWorkOrderFromPrompt("je veux une page web avec le logo ekida", previous).shouldReusePreviousLogo).toBe(false);
  });
});
