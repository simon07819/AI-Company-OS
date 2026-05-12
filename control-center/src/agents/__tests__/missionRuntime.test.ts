import { describe, expect, it } from "vitest";
import { agentRegistry, skillRegistry } from "@/agents/registry";
import { runAgentMission } from "@/agents/runtime/mission-runtime";
import { createMissionPlan } from "@/agents/runtime/mission-planner";
import { runQualityGates } from "@/agents/runtime/quality-gate-runner";
import { runMissionTask } from "@/agents/runtime/task-runner";
import { createWorkOrderFromPrompt } from "@/agents/runtime/work-order";

describe("agent mission runtime work orders", () => {
  it("creates logo work orders with extracted brand and background constraints", () => {
    const order = createWorkOrderFromPrompt("logo EKIDA sur fond noir");

    expect(order.deliverableType).toBe("logo");
    expect(order.brandName).toBe("EKIDA");
    expect(order.constraints).toContain("visibleKind:logo");
  });

  it("routes page web prompts with logo as website work orders", () => {
    const order = createWorkOrderFromPrompt("Je veux une page web bien simple avec le logo ekida, tu peux mettre du contenu temporaire ses une compagnie de linge", {
      previousDeliverable: { deliverableType: "logo", primaryVisual: "<svg>EKIDA</svg>" },
    });

    expect(order.requestType).toBe("website");
    expect(order.deliverableType).not.toBe("logo");
    expect(order.brandName).toBe("EKIDA");
    expect(order.mayReusePreviousDeliverable).toBe(false);
  });
});

describe("agent mission planner", () => {
  it("plans the full logo team with valid skills and tools", () => {
    const plan = createMissionPlan(createWorkOrderFromPrompt("logo EKIDA"));

    expect(plan.workflowId).toBe("logo_design");
    expect(plan.agents).toEqual(expect.arrayContaining(["product_owner", "brand_strategist", "logo_designer", "creative_director", "svg_illustrator", "quality_director"]));
    for (const task of plan.tasks) {
      const agent = Object.values(agentRegistry).find((candidate) => candidate.role === task.agentRole || candidate.id === task.agentRole);
      expect(agent, task.agentRole).toBeTruthy();
      expect(skillRegistry[task.skillId], task.skillId).toBeTruthy();
      expect(agent?.skills).toContain(task.skillId);
      for (const toolId of task.toolIds) expect(agent?.toolsAllowed).toContain(toolId);
    }
  });

  it("plans website team tasks with valid skills and tools", () => {
    const plan = createMissionPlan(createWorkOrderFromPrompt("Je veux une page web avec le logo ekida"));

    expect(plan.workflowId).toBe("website_design");
    expect(plan.agents).toEqual(expect.arrayContaining(["product_owner", "ux_designer", "web_designer", "frontend_builder", "quality_director"]));
    expect(plan.tasks.map((task) => task.skillId)).toEqual(expect.arrayContaining(["generate_website_brief", "generate_website_wireframe", "render_website_preview"]));
  });
});

describe("agent mission task runner", () => {
  const workOrder = createWorkOrderFromPrompt("logo EKIDA");

  it("refuses missing skills", () => {
    const checkpoint = runMissionTask({
      id: "bad-skill",
      agentRole: "product_owner",
      skillId: "missing_skill",
      toolIds: [],
      dependsOn: [],
      input: workOrder,
      expectedOutput: "nothing",
      status: "pending",
    }, { workOrder, agentRuns: [], toolTrace: [] });

    expect(checkpoint.status).toBe("blocked");
  });

  it("refuses unauthorized tools and produces checkpoints", () => {
    const checkpoint = runMissionTask({
      id: "bad-tool",
      agentRole: "product_owner",
      skillId: "write_design_brief",
      toolIds: ["shell.safe"],
      dependsOn: [],
      input: workOrder,
      expectedOutput: "brief",
      status: "pending",
    }, { workOrder, agentRuns: [], toolTrace: [] });

    expect(checkpoint.status).toBe("blocked");
    expect(checkpoint.taskId).toBe("bad-tool");
  });
});

describe("agent mission runtime", () => {
  it("returns clean visible logo output and hidden execution trace", () => {
    const result = runAgentMission("logo EKIDA sur fond noir");
    const visible = result.visibleOutput as { kind?: string; deliverableType?: string; primaryVisual?: string; primaryArtifactId?: string };

    expect(visible.kind).toBe("visual");
    expect(visible.deliverableType).toBe("logo");
    expect(visible.primaryVisual).toContain("<svg");
    expect(visible.primaryArtifactId).toMatch(/^logo_svg-/);
    expect(result.hiddenDetails.artifacts?.length).toBeGreaterThan(0);
    expect(result.hiddenDetails.executionTrace.agentsCalled.length).toBeGreaterThan(3);
    expect(result.hiddenDetails.executionTrace.skillsCalled.length).toBeGreaterThan(3);
    expect(result.hiddenDetails.executionTrace.toolsCalled).toEqual(expect.arrayContaining(["visual.svg", "quality.evaluate", "artifact.store"]));
    expect(JSON.stringify(visible)).not.toMatch(/executionTrace|artifacts|score|process|checkpoint/i);
  });

  it("returns website preview after a previous logo without recycling the logo", () => {
    const previous = runAgentMission("logo EKIDA");
    const previousVisible = previous.visibleOutput as { primaryVisual?: string };
    const result = runAgentMission("Je veux une page web bien simple avec le logo ekida, tu peux mettre du contenu temporaire ses une compagnie de linge", {
      previousDeliverable: { deliverableType: "logo", primaryVisual: previousVisible.primaryVisual },
    });
    const visible = result.visibleOutput as { kind?: string; primaryVisual?: string; brandName?: string; primaryArtifactId?: string };

    expect(visible.kind).toBe("website_preview");
    expect(visible.primaryArtifactId).toMatch(/^website_preview_svg-/);
    expect(visible.brandName).toBe("EKIDA");
    expect(visible.primaryVisual).not.toBe(previousVisible.primaryVisual);
    expect(visible.primaryVisual).toMatch(/aria-label="nav"|aria-label="hero"|aria-label="sections"|Voir la collection/);
    expect(result.hiddenDetails.executionTrace.toolsCalled).toEqual(expect.arrayContaining(["website.preview", "quality.evaluate", "artifact.store"]));
  });

  it("quality gates fail text-only logos and recycled website visuals", () => {
    const logoOrder = createWorkOrderFromPrompt("logo EKIDA");
    expect(runQualityGates({
      workOrder: logoOrder,
      visibleOutput: { kind: "visual", deliverableType: "logo", brandName: "EKIDA", primaryVisual: "<svg viewBox=\"0 0 100 100\"><text>EKIDA</text></svg>" },
    }).some((result) => !result.ok)).toBe(true);

    const siteOrder = createWorkOrderFromPrompt("Je veux une page web avec le logo ekida");
    const previous = "<svg viewBox=\"0 0 100 100\"><text>EKIDA</text></svg>";
    expect(runQualityGates({
      workOrder: siteOrder,
      previousDeliverable: { deliverableType: "logo", primaryVisual: previous },
      visibleOutput: { kind: "website_preview", deliverableType: "landing_page", brandName: "EKIDA", primaryVisual: previous },
    }).some((result) => !result.ok)).toBe(true);
  });
});
