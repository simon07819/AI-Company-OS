import { describe, expect, it } from "vitest";
import { ceoAgentEvalCases } from "@/agents/evals/eval-cases";
import { runCeoAgentEvals } from "@/agents/evals/eval-runner";
import { agentMethods } from "@/agents/intelligence/agent-methods";
import { runAgentBrain } from "@/agents/intelligence/agent-brain";
import { critiqueAgentOutput } from "@/agents/intelligence/critique-engine";
import { createMissionPlanWithIntelligence } from "@/agents/intelligence/planning-engine";
import { createRefinementStrategy } from "@/agents/intelligence/refinement-strategy";
import { learnFromEvalFailures } from "@/agents/intelligence/eval-learning";
import { logoDesignKnowledge } from "@/agents/intelligence/domain-knowledge/logo-design-knowledge";
import { websiteDesignKnowledge } from "@/agents/intelligence/domain-knowledge/website-design-knowledge";
import { qualityKnowledge } from "@/agents/intelligence/domain-knowledge/quality-knowledge";
import { runAgentMission } from "@/agents/runtime/mission-runtime";
import { createWorkOrderFromPrompt } from "@/agents/runtime/work-order";

describe("agent methods", () => {
  const criticalAgents = ["ceo", "product_owner", "logo_designer", "creative_director", "svg_illustrator", "ux_designer", "web_designer", "frontend_builder", "quality_director", "artifact_manager"];

  it("defines real methods for critical agents", () => {
    for (const role of criticalAgents) {
      const method = agentMethods[role];
      expect(method, role).toBeTruthy();
      expect(method.steps.length, role).toBeGreaterThan(0);
      expect(method.qualityChecklist.length, role).toBeGreaterThan(0);
      expect(method.commonFailureModes.length, role).toBeGreaterThan(0);
      expect(method.requiredOutputs.length, role).toBeGreaterThan(0);
    }
    expect(agentMethods.logo_designer.commonFailureModes.join(" ")).toMatch(/text-only|generic/i);
    expect(agentMethods.frontend_builder.commonFailureModes.join(" ")).toMatch(/logo-only|missing CTA|missing sections/i);
  });

  it("uses domain knowledge in methods", () => {
    expect(agentMethods.logo_designer.qualityChecklist).toEqual(expect.arrayContaining(logoDesignKnowledge.qualityChecklist));
    expect(agentMethods.frontend_builder.qualityChecklist).toEqual(expect.arrayContaining(websiteDesignKnowledge.qualityChecklist));
    expect(agentMethods.quality_director.qualityChecklist).toEqual(expect.arrayContaining(qualityKnowledge.qualityChecklist));
  });
});

describe("planning engine", () => {
  it("plans logo missions with methods and refinement gates", () => {
    const workOrder = createWorkOrderFromPrompt("logo EKIDA sur fond noir");
    const plan = createMissionPlanWithIntelligence(workOrder);

    expect(plan.workflowId).toBe("logo_design");
    expect(plan.agents).toEqual(expect.arrayContaining(["product_owner", "brand_strategist", "logo_designer", "creative_director", "svg_illustrator", "quality_director"]));
    expect(plan.qualityGates).toEqual(expect.arrayContaining(["critiqueAgentOutput", "createRefinementStrategy"]));
    expect(plan.objective).toMatch(/Logo concept production|Quality gate/);
  });

  it("routes website prompts with logo words to website planning", () => {
    const workOrder = createWorkOrderFromPrompt("Je veux une page web bien simple avec le logo ekida");
    const plan = createMissionPlanWithIntelligence(workOrder);

    expect(plan.workflowId).toBe("website_design");
    expect(plan.agents).toEqual(expect.arrayContaining(["product_owner", "ux_designer", "web_designer", "frontend_builder", "quality_director"]));
  });
});

describe("agent brain and critique", () => {
  it("produces task plans before execution", () => {
    const workOrder = createWorkOrderFromPrompt("logo EKIDA");
    const brain = runAgentBrain({
      agentRole: "logo_designer",
      task: { id: "concepts" },
      workOrder,
      availableSkills: ["generate_logo_concepts", "compose_symbol"],
      availableTools: ["visual.svg", "quality.evaluate"],
      context: {},
      mode: "produce",
    });

    expect(brain.methodId).toBe("logo-designer-concept-method");
    expect(brain.plan).toEqual(expect.arrayContaining(["Create monogram concept", "Create symbol concept", "Create badge concept"]));
    expect(brain.qualityChecklist).toContain("non-text-only composition");
  });

  it("rejects bad logo and website outputs", () => {
    const logoOrder = createWorkOrderFromPrompt("logo EKIDA");
    expect(critiqueAgentOutput({
      agentRole: "logo_designer",
      output: "<svg viewBox=\"0 0 100 100\"><text>EKIDA</text></svg>",
      workOrder: logoOrder,
      method: agentMethods.logo_designer,
    })).toMatchObject({ status: "rejected" });
    expect(critiqueAgentOutput({
      agentRole: "ceo",
      output: "Brand system pour Marque à nommer",
      workOrder: logoOrder,
      method: agentMethods.ceo,
    })).toMatchObject({ status: "rejected" });
    expect(critiqueAgentOutput({
      agentRole: "svg_illustrator",
      output: "<svg viewBox=\"0 0 100 100\"><text>B</text><path d=\"M0 0h1\"/></svg>",
      workOrder: logoOrder,
      method: agentMethods.svg_illustrator,
    })).toMatchObject({ status: "rejected" });

    const websiteOrder = createWorkOrderFromPrompt("Je veux une page web avec le logo ekida");
    expect(critiqueAgentOutput({
      agentRole: "frontend_builder",
      output: "<svg viewBox=\"0 0 100 100\"><text>EKIDA</text></svg>",
      workOrder: websiteOrder,
      method: agentMethods.frontend_builder,
    })).toMatchObject({ status: "needs_refinement" });
  });
});

describe("refinement strategy and eval lessons", () => {
  it("routes corrections to the right agents", () => {
    const logoOrder = createWorkOrderFromPrompt("logo EKIDA");
    const logoCritique = critiqueAgentOutput({
      agentRole: "logo_designer",
      output: "<svg viewBox=\"0 0 100 100\"><text>EKIDA</text></svg>",
      workOrder: logoOrder,
      method: agentMethods.logo_designer,
    });
    expect(createRefinementStrategy(logoCritique, logoOrder)).toMatchObject({
      targetAgents: ["logo_designer", "svg_illustrator"],
    });

    const websiteOrder = createWorkOrderFromPrompt("Je veux une page web avec le logo ekida");
    const websiteCritique = critiqueAgentOutput({
      agentRole: "frontend_builder",
      output: "<svg viewBox=\"0 0 100 100\"><text>EKIDA</text></svg>",
      workOrder: websiteOrder,
      method: agentMethods.frontend_builder,
    });
    expect(createRefinementStrategy(websiteCritique, websiteOrder).targetAgents).toEqual(["ux_designer", "web_designer", "frontend_builder"]);
  });

  it("turns eval failures into lessons", () => {
    const lessons = learnFromEvalFailures([
      { id: "website_after_logo", status: "fail", failures: ["previous primaryVisual recycled"], summary: "failed" },
      { id: "logo_ekida", status: "fail", failures: ["Brand system visible"], summary: "failed" },
    ]);

    expect(lessons).toHaveLength(2);
    expect(lessons.map((lesson) => lesson.correctionRule).join(" ")).toMatch(/Forbid incompatible previous fingerprints|never expose brandSystem/i);
  });
});

describe("runtime intelligence integration", () => {
  it("stores brain, critique and refinement intelligence in hiddenDetails only", () => {
    const result = runAgentMission("logo EKIDA sur fond noir");
    const visible = JSON.stringify(result.visibleOutput);
    const intelligence = result.hiddenDetails.intelligence;

    expect(intelligence?.brainOutputs.length).toBeGreaterThan(3);
    expect(intelligence?.critiques.length).toBeGreaterThan(3);
    expect(intelligence?.taskDecomposition?.join("\n")).toMatch(/logo_designer|quality_director/);
    expect(visible).not.toMatch(/brainOutputs|critiques|refinementStrategies|Logo concept production|Quality gate/);
  });

  it("keeps eval-protected outputs passing through the intelligent runtime", () => {
    const results = runCeoAgentEvals(ceoAgentEvalCases);
    expect(results.filter((result) => result.status === "fail")).toEqual([]);
  });
});
