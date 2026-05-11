import { describe, expect, it } from "vitest";
import { MISSION_TYPES, getMissionType, getDefaultMissionType, isSoftwareMission } from "@/lib/missionTypes";

describe("missionTypes", () => {
  it("contains all 9 mission types", () => {
    const ids = MISSION_TYPES.map((m) => m.id);
    expect(ids).toContain("saas_project");
    expect(ids).toContain("website");
    expect(ids).toContain("branding_pack");
    expect(ids).toContain("flyer");
    expect(ids).toContain("business_card");
    expect(ids).toContain("ecommerce_store");
    expect(ids).toContain("ecommerce_operator");
    expect(ids).toContain("social_campaign");
    expect(ids).toContain("automation_workflow");
    expect(MISSION_TYPES.length).toBe(9);
  });

  it("each mission type has required fields", () => {
    for (const mt of MISSION_TYPES) {
      expect(mt.id).toBeTruthy();
      expect(mt.label).toBeTruthy();
      expect(mt.description).toBeTruthy();
      expect(["software", "design", "marketing", "automation", "business"]).toContain(mt.category);
      expect(mt.recommendedAgents.length).toBeGreaterThan(0);
      expect(mt.defaultPhases.length).toBeGreaterThan(0);
      expect(mt.expectedDeliverables.length).toBeGreaterThan(0);
      expect(mt.workspaceFolders.length).toBeGreaterThan(0);
    }
  });

  it("getDefaultMissionType returns saas_project", () => {
    const mt = getDefaultMissionType();
    expect(mt.id).toBe("saas_project");
  });

  it("getMissionType returns correct type", () => {
    expect(getMissionType("flyer")?.label).toBe("Flyer");
    expect(getMissionType("branding_pack")?.category).toBe("design");
    expect(getMissionType("social_campaign")?.category).toBe("marketing");
  });

  it("getMissionType returns undefined for unknown id", () => {
    expect(getMissionType("nonexistent")).toBeUndefined();
  });

  it("isSoftwareMission works correctly", () => {
    expect(isSoftwareMission("saas_project")).toBe(true);
    expect(isSoftwareMission("website")).toBe(true);
    expect(isSoftwareMission("ecommerce_store")).toBe(true);
    expect(isSoftwareMission("branding_pack")).toBe(false);
    expect(isSoftwareMission("flyer")).toBe(false);
    expect(isSoftwareMission("social_campaign")).toBe(false);
    expect(isSoftwareMission("automation_workflow")).toBe(false);
  });
});
