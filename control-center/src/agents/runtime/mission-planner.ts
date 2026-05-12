import type { MissionPlan, MissionTask, WorkOrder } from "./types";

function task(id: string, agentRole: string, skillId: string, toolIds: string[], dependsOn: string[], input: unknown, expectedOutput: string): MissionTask {
  return { id, agentRole, skillId, toolIds, dependsOn, input, expectedOutput, status: "pending" };
}

export function createMissionPlan(workOrder: WorkOrder): MissionPlan {
  if (workOrder.deliverableType === "logo") {
    const tasks = [
      task("brief", "product_owner", "write_design_brief", ["artifact.store"], [], workOrder, "Design brief"),
      task("territories", "brand_strategist", "generate_creative_territories", ["artifact.store"], ["brief"], workOrder, "Creative territories"),
      task("concepts", "logo_designer", "generate_logo_concepts", ["visual.svg"], ["territories"], workOrder, "At least 3 logo concepts"),
      task("critique", "creative_director", "critique_design_concepts", ["quality.evaluate"], ["concepts"], workOrder, "Concept critique and selection"),
      task("render", "svg_illustrator", "render_svg_logo", ["visual.svg"], ["critique"], workOrder, "Final SVG prototype"),
      task("quality", "quality_director", "validate_logo_deliverable", ["quality.evaluate"], ["render"], workOrder, "Logo quality gate"),
      task("hidden-details", "artifact_manager", "prepare_hidden_details", ["artifact.store"], ["quality"], workOrder, "Hidden details package"),
    ];
    return {
      id: `${workOrder.missionId}-plan`,
      workOrderId: workOrder.id,
      workflowId: "logo_design",
      objective: `Create a logo deliverable for ${workOrder.brandName ?? "the requested brand"}`,
      agents: ["product_owner", "brand_strategist", "logo_designer", "creative_director", "svg_illustrator", "quality_director", "artifact_manager"],
      tasks,
      qualityGates: ["validateLogoDeliverable", "validateSimpleChatOutput", "validateNoPreviousDeliverableLeak", "validateNoSecretLeak", "validateAgentToolPermissions"],
    };
  }

  if (workOrder.requestType === "website") {
    const tasks = [
      task("website-brief", "product_owner", "generate_website_brief", ["artifact.store"], [], workOrder, "Website brief"),
      task("wireframe", "ux_designer", "generate_website_wireframe", ["website.preview"], ["website-brief"], workOrder, "Page structure"),
      task("visual-direction", "web_designer", "generate_website_wireframe", ["website.preview"], ["wireframe"], workOrder, "Visual direction"),
      task("preview", "frontend_builder", "render_website_preview", ["website.preview"], ["visual-direction"], workOrder, "Website preview"),
      task("website-quality", "quality_director", "validate_website_deliverable", ["quality.evaluate"], ["preview"], workOrder, "Website quality gate"),
      task("website-hidden-details", "artifact_manager", "prepare_hidden_details", ["artifact.store"], ["website-quality"], workOrder, "Hidden details package"),
    ];
    return {
      id: `${workOrder.missionId}-plan`,
      workOrderId: workOrder.id,
      workflowId: "website_design",
      objective: `Create a website preview for ${workOrder.brandName ?? "the requested project"}`,
      agents: ["product_owner", "ux_designer", "web_designer", "frontend_builder", "quality_director", "artifact_manager"],
      tasks,
      qualityGates: ["validateWebsiteDeliverable", "validateSimpleChatOutput", "validateNoPreviousDeliverableLeak", "validateNoSecretLeak", "validateAgentToolPermissions"],
    };
  }

  return {
    id: `${workOrder.missionId}-plan`,
    workOrderId: workOrder.id,
    workflowId: "unknown",
    objective: "Classify and request clarification",
    agents: ["ceo", "quality_director"],
    tasks: [task("classify", "ceo", "parse_user_request", ["quality.evaluate"], [], workOrder, "Classification")],
    qualityGates: ["validateSimpleChatOutput"],
  };
}
