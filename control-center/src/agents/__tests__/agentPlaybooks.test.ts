import { describe, expect, it } from "vitest";
import { toolRegistry } from "@/agents/capabilities/registry";
import { skillRegistry } from "@/agents/registry";
import { runAgentMission } from "@/agents/runtime/mission-runtime";
import { createWorkOrderFromPrompt } from "@/agents/runtime/work-order";
import { critiqueAgentOutput } from "@/agents/intelligence/critique-engine";
import { createRefinementStrategy } from "@/agents/intelligence/refinement-strategy";
import { compilePlaybookIntoAgentMethod } from "@/agents/playbooks/playbook-compiler";
import { knowledgePackRegistry, logoDesignKnowledgePack, qualityReviewKnowledgePack, websiteDesignKnowledgePack } from "@/agents/playbooks/knowledge";
import { playbookRegistry } from "@/agents/playbooks/registry";
import { selectPlaybookForTask } from "@/agents/playbooks/playbook-selector";

describe("expert agent playbook registry", () => {
  const criticalAgents = ["ceo", "product_owner", "brand_strategist", "logo_designer", "creative_director", "svg_illustrator", "ux_designer", "web_designer", "frontend_builder", "quality_director", "artifact_manager"];

  it("defines complete playbooks with valid skill and tool bindings", () => {
    for (const role of criticalAgents) {
      const playbook = playbookRegistry[role as keyof typeof playbookRegistry];
      expect(playbook, role).toBeTruthy();
      expect(playbook.mission.length, role).toBeGreaterThan(10);
      expect(playbook.operatingPrinciples.length, role).toBeGreaterThan(0);
      expect(playbook.taskMethod.length, role).toBeGreaterThan(0);
      expect(playbook.decisionRules.length, role).toBeGreaterThan(0);
      expect(playbook.qualityStandards.length, role).toBeGreaterThan(0);
      expect(playbook.failureModes.length, role).toBeGreaterThan(0);
      expect(playbook.requiredOutputs.length, role).toBeGreaterThan(0);
      expect(playbook.forbiddenOutputs.length, role).toBeGreaterThan(0);
      for (const skillId of playbook.skillBindings) expect(skillRegistry[skillId], `${role}:${skillId}`).toBeTruthy();
      for (const toolId of playbook.toolBindings) expect(toolRegistry[toolId], `${role}:${toolId}`).toBeTruthy();
    }
  });

  it("contains knowledge packs for known product failure modes", () => {
    expect(logoDesignKnowledgePack.antiPatterns.join(" ")).toMatch(/text-only|generic unrelated letter/i);
    expect(websiteDesignKnowledgePack.antiPatterns.join(" ")).toMatch(/only a logo|old logo recycled/i);
    expect(qualityReviewKnowledgePack.principles.join(" ")).toMatch(/anti-recycle|simple mode visibility/i);
    expect(Object.keys(knowledgePackRegistry)).toEqual(expect.arrayContaining(["logo-design-knowledge", "website-design-knowledge", "quality-review-knowledge"]));
  });
});

describe("playbook selector and compiler", () => {
  it("selects logo knowledge for logo designer and website knowledge for UX", () => {
    const logoOrder = createWorkOrderFromPrompt("logo EKIDA");
    const websiteOrder = createWorkOrderFromPrompt("Je veux une page web avec le logo ekida");
    const logoSelection = selectPlaybookForTask({ agentRole: "logo_designer", workOrder: logoOrder });
    const uxSelection = selectPlaybookForTask({ agentRole: "ux_designer", workOrder: websiteOrder });
    const qualitySelection = selectPlaybookForTask({ agentRole: "quality_director", workOrder: websiteOrder });

    expect(logoSelection.playbookId).toBe("logo-designer-expert-playbook");
    expect(logoSelection.relevantKnowledgePacks).toContain("logo-design-knowledge");
    expect(uxSelection.relevantKnowledgePacks).toEqual(expect.arrayContaining(["ux-design-knowledge", "website-design-knowledge"]));
    expect(qualitySelection.relevantKnowledgePacks).toContain("quality-review-knowledge");
    expect(JSON.stringify(uxSelection)).not.toMatch(/hiddenDetails|toolTrace|checkpoints/i);
  });

  it("compiles playbooks into AgentMethod and fails on missing skill", () => {
    const method = compilePlaybookIntoAgentMethod(playbookRegistry.logo_designer);
    expect(method.steps.length).toBeGreaterThan(0);
    expect(method.qualityChecklist).toEqual(expect.arrayContaining(playbookRegistry.logo_designer.qualityStandards));
    expect(method.commonFailureModes.join(" ")).toMatch(/text-only|wrong-initial/i);
    expect(method.requiredOutputs).toEqual(playbookRegistry.logo_designer.requiredOutputs);
    expect(() => compilePlaybookIntoAgentMethod({ ...playbookRegistry.logo_designer, skillBindings: ["missing_skill"] })).toThrow(/missing skill/);
  });
});

describe("playbooks drive critique and refinement", () => {
  it("rejects known playbook failure modes and creates targeted strategies", () => {
    const workOrder = createWorkOrderFromPrompt("logo EKIDA");
    const selectedKnowledge = selectPlaybookForTask({ agentRole: "logo_designer", workOrder });
    const critique = critiqueAgentOutput({
      agentRole: "logo_designer",
      output: "<svg viewBox=\"0 0 100 100\"><text>B</text><path d=\"M0 0h1\"/></svg>",
      workOrder,
      selectedKnowledge,
    });
    const strategy = createRefinementStrategy(critique, workOrder, selectedKnowledge.relevantFailureModes);

    expect(critique.status).toBe("rejected");
    expect(critique.issues.join(" ")).toMatch(/Unrelated generic initial|Initial does not belong/i);
    expect(strategy.targetAgents).toEqual(expect.arrayContaining(["logo_designer", "svg_illustrator"]));
    expect(strategy.requiredChanges.join(" ")).toMatch(/Use correct brand initials|symbol/i);
  });
});

describe("runtime playbook integration", () => {
  it("stores playbook trace and selected knowledge in hiddenDetails only", () => {
    const result = runAgentMission("logo EKIDA sur fond noir");
    const visible = JSON.stringify(result.visibleOutput);
    const intelligence = result.hiddenDetails.intelligence;

    expect(intelligence?.playbookTrace?.length).toBeGreaterThan(3);
    expect(intelligence?.selectedKnowledge?.some((entry) => entry.playbookId === "logo-designer-expert-playbook")).toBe(true);
    expect(intelligence?.selectedKnowledge?.some((entry) => entry.relevantKnowledgePacks.includes("logo-design-knowledge"))).toBe(true);
    expect(visible).not.toMatch(/playbookTrace|selectedKnowledge|expert-playbook|knowledge-pack|qualityStandards/i);
  });

  it("keeps website after logo protected by website playbooks", () => {
    const logo = runAgentMission("logo EKIDA");
    const logoVisible = logo.visibleOutput as { primaryVisual?: string };
    const website = runAgentMission("Je veux une page web bien simple avec le logo ekida, tu peux mettre du contenu temporaire ses une compagnie de linge", {
      previousDeliverable: { deliverableType: "logo", primaryVisual: logoVisible.primaryVisual, brandName: "EKIDA" },
    });
    const visible = website.visibleOutput as { kind?: string; primaryVisual?: string };

    expect(visible.kind).toBe("website_preview");
    expect(visible.primaryVisual).not.toBe(logoVisible.primaryVisual);
    expect(visible.primaryVisual).toMatch(/aria-label="nav"|aria-label="hero"|aria-label="sections"/);
    expect(website.hiddenDetails.intelligence?.selectedKnowledge?.some((entry) => entry.relevantKnowledgePacks.includes("website-design-knowledge"))).toBe(true);
  });
});
