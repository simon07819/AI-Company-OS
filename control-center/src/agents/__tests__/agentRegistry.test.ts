import { describe, expect, it } from "vitest";
import { capabilityPacks, toolRegistry } from "@/agents/capabilities/registry";
import { agentRegistry, runAgentSkill, skillRegistry } from "@/agents/registry";

const requiredAgents = [
  "ceo",
  "product_owner",
  "brand_strategist",
  "logo_designer",
  "creative_director",
  "ux_designer",
  "web_designer",
  "frontend_builder",
  "svg_illustrator",
  "research_agent",
  "browser_agent",
  "quality_director",
  "artifact_manager",
];

describe("agent registry", () => {
  it("registers the operational design team agents", () => {
    for (const agentId of requiredAgents) {
      const agent = agentRegistry[agentId];

      expect(agent, agentId).toBeTruthy();
      expect(agent.mission.length).toBeGreaterThan(12);
      expect(agent.responsibilities.length).toBeGreaterThan(0);
      expect(agent.skills.length).toBeGreaterThan(0);
      expect(agent.toolsAllowed.length).toBeGreaterThan(0);
      expect(agent.capabilityPacks.length).toBeGreaterThan(0);
      expect(agent.mustProduce.length).toBeGreaterThan(0);
      expect(agent.mustNeverDo.length).toBeGreaterThan(0);
      expect(agent.qualityChecklist.length).toBeGreaterThan(0);
    }
  });

  it("only references real callable skills", () => {
    for (const agent of Object.values(agentRegistry)) {
      for (const skillId of agent.skills) {
        expect(skillRegistry[skillId], `${agent.id}.${skillId}`).toBeTruthy();
        expect(typeof skillRegistry[skillId].run).toBe("function");

        const result = runAgentSkill(agent.id, skillId, { probe: true });
        expect(result).toMatchObject({
          agentId: agent.id,
          role: agent.role,
          skillId,
          status: "ok",
        });
      }
    }
  });

  it("only references real capability packs and tools", () => {
    for (const agent of Object.values(agentRegistry)) {
      for (const packId of agent.capabilityPacks) {
        expect(capabilityPacks[packId], `${agent.id}.${packId}`).toBeTruthy();
      }
      for (const toolId of agent.toolsAllowed) {
        expect(toolRegistry[toolId], `${agent.id}.${toolId}`).toBeTruthy();
      }
    }
  });
});
