import { describe, expect, it } from "vitest";
import { runMissionAgentFlow } from "@/lib/agents/agentRegistry";
import { createMissionRuntime } from "@/lib/mission-runtime/missionRuntime";
import { selectTeamPlaybook, teamPlaybooks } from "@/lib/mission-runtime/teamPlaybooks";

describe("mission team playbooks", () => {
  it("selects the full branding team for logo requests", () => {
    const playbook = selectTeamPlaybook("logo EKIDA sur fond noir");

    expect(playbook.id).toBe("logo-branding-team-playbook");
    expect(playbook.agents).toEqual([
      "ceo",
      "planner",
      "brand_strategist",
      "creative_director",
      "visual_prompt_engineer",
      "nvidia_image_agent",
      "critic",
      "reviewer",
      "artifact_manager",
    ]);
    expect(playbook.providerRequirement).toEqual(expect.objectContaining({
      capability: "image",
      required: true,
      providerUsed: "nvidia",
    }));
  });

  it("selects the full website team for website requests", () => {
    const playbook = selectTeamPlaybook("Je veux un site web pour EKIDA");

    expect(playbook.id).toBe("website-team-playbook");
    expect(playbook.agents).toEqual([
      "ceo",
      "product_owner",
      "ux_strategist",
      "ui_designer",
      "frontend_architect",
      "critic",
      "qa",
      "reviewer",
      "artifact_manager",
    ]);
  });

  it("defines playbooks for every supported project type", () => {
    expect(Object.keys(teamPlaybooks).sort()).toEqual([
      "app",
      "code",
      "copywriting",
      "general",
      "logo",
      "product",
      "strategy",
      "website",
    ]);
  });

  it("runs agents through the selected playbook instead of a direct provider-only flow", () => {
    const mission = createMissionRuntime("logo EKIDA");
    const flow = runMissionAgentFlow({
      missionId: mission.missionId,
      missionType: mission.type,
      command: mission.command,
      sourceType: "nvidia_image",
      providerUsed: "nvidia",
      imageProviderAvailable: true,
      deliverables: [{
        title: "Image logo NVIDIA EKIDA",
        sourceType: "nvidia_image",
        providerUsed: "nvidia",
        artifactId: "artifact-image",
      }],
      agentSequence: mission.playbook.agents,
      playbookId: mission.playbook.id,
    });

    expect(flow.runs.map((run) => run.agentId)).toEqual(mission.playbook.agents);
    expect(flow.runs.every((run) => run.input.playbookId === "logo-branding-team-playbook")).toBe(true);
  });
});
