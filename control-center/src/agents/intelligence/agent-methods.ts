import type { AgentMethod } from "./types";
import { brandKnowledge } from "./domain-knowledge/brand-knowledge";
import { logoDesignKnowledge } from "./domain-knowledge/logo-design-knowledge";
import { qualityKnowledge } from "./domain-knowledge/quality-knowledge";
import { uxKnowledge } from "./domain-knowledge/ux-knowledge";
import { websiteDesignKnowledge } from "./domain-knowledge/website-design-knowledge";

function method(input: AgentMethod): AgentMethod {
  return input;
}

export const agentMethods: Record<string, AgentMethod> = {
  ceo: method({
    id: "ceo-orchestration-method",
    agentRole: "ceo",
    name: "CEO orchestration",
    purpose: "Understand the current request, route the right workflow and return only the final deliverable.",
    steps: ["Classify current prompt", "Decide new deliverable vs modification", "Choose workflow", "Assign agents", "Finalize visible output"],
    qualityChecklist: ["workflow matches prompt", "no fake success", ...qualityKnowledge.qualityChecklist],
    commonFailureModes: ["wrong workflow", "previous output recycled", "process visible in simple chat"],
    requiredOutputs: ["workOrder", "missionPlan", "visibleOutput"],
  }),
  product_owner: method({
    id: "product-owner-brief-method",
    agentRole: "product_owner",
    name: "Brief extraction",
    purpose: "Turn the prompt into a testable brief with constraints and acceptance criteria.",
    steps: ["Extract brandName", "Separate style/background/audience", "Set deliverable type", "Write acceptance criteria"],
    qualityChecklist: [...brandKnowledge.qualityChecklist, "criteria testable"],
    commonFailureModes: ["style absorbed into brandName", "background absorbed into brandName", "missing acceptance criteria"],
    requiredOutputs: ["brief", "constraints", "acceptanceCriteria"],
  }),
  brand_strategist: method({
    id: "brand-strategy-territories-method",
    agentRole: "brand_strategist",
    name: "Creative territories",
    purpose: "Create distinct visual territories tied to the brand energy.",
    steps: ["Define brand energy", "Create 2-3 territories", "Map each territory to visual language"],
    qualityChecklist: ["territories distinct", "not generic", "brand energy clear"],
    commonFailureModes: ["three similar variants", "generic adjectives only"],
    requiredOutputs: ["creativeTerritories"],
  }),
  logo_designer: method({
    id: "logo-designer-concept-method",
    agentRole: "logo_designer",
    name: "Logo concept production",
    purpose: "Create distinct logo concepts with symbol, monogram and badge options.",
    steps: ["Create monogram concept", "Create symbol concept", "Create badge concept", "Attach SVG draft to each"],
    qualityChecklist: logoDesignKnowledge.qualityChecklist,
    commonFailureModes: logoDesignKnowledge.failureModes,
    requiredOutputs: ["atLeast3Concepts", "svgDrafts", "visualIntent"],
  }),
  creative_director: method({
    id: "creative-director-critique-method",
    agentRole: "creative_director",
    name: "Concept critique and selection",
    purpose: "Reject weak concepts, select the strongest and request precise refinement.",
    steps: ["Compare concepts", "Reject placeholders", "Reject text-only outputs", "Select best concept", "Specify improvements"],
    qualityChecklist: ["selection justified", "failure modes checked", "refinement specific"],
    commonFailureModes: ["accepting placeholder", "accepting text-only logo", "vague feedback"],
    requiredOutputs: ["critique", "selectedConcept", "requiredChanges"],
  }),
  svg_illustrator: method({
    id: "svg-illustrator-render-method",
    agentRole: "svg_illustrator",
    name: "SVG production",
    purpose: "Render the selected concept into a clean centered responsive SVG.",
    steps: ["Create SVG viewBox", "Center composition", "Respect background", "Avoid scripts and foreignObject", "Fit content"],
    qualityChecklist: ["viewBox", "centered", "safe SVG", "brand visible", "not clipped"],
    commonFailureModes: ["missing viewBox", "text clipped", "unsafe SVG", "wrong background"],
    requiredOutputs: ["primaryVisualSvg"],
  }),
  ux_designer: method({
    id: "ux-designer-page-structure-method",
    agentRole: "ux_designer",
    name: "Website information architecture",
    purpose: "Create a page structure with clear navigation, hero, CTA and sections.",
    steps: ["Define page goal", "Build nav", "Build hero", "Choose CTA", "Define content sections"],
    qualityChecklist: uxKnowledge.qualityChecklist,
    commonFailureModes: ["missing CTA", "missing sections", "unclear hierarchy"],
    requiredOutputs: ["wireframe", "sections", "CTA"],
  }),
  web_designer: method({
    id: "web-designer-visual-method",
    agentRole: "web_designer",
    name: "Website visual direction",
    purpose: "Translate UX structure into a coherent visual preview.",
    steps: ["Choose palette", "Set spacing", "Set typography", "Compose page", "Integrate brand asset secondarily"],
    qualityChecklist: websiteDesignKnowledge.qualityChecklist,
    commonFailureModes: websiteDesignKnowledge.failureModes,
    requiredOutputs: ["designDirection", "previewDirection"],
  }),
  frontend_builder: method({
    id: "frontend-builder-preview-method",
    agentRole: "frontend_builder",
    name: "Preview builder",
    purpose: "Produce an exploitable website preview artifact.",
    steps: ["Render header/nav", "Render hero", "Render CTA", "Render sections", "Validate not logo-only"],
    qualityChecklist: websiteDesignKnowledge.qualityChecklist,
    commonFailureModes: websiteDesignKnowledge.failureModes,
    requiredOutputs: ["websitePreview"],
  }),
  quality_director: method({
    id: "quality-director-gate-method",
    agentRole: "quality_director",
    name: "Quality gate",
    purpose: "Block fake deliverables and request targeted refinement.",
    steps: ["Match current prompt", "Check artifact", "Check placeholder patterns", "Check anti-recycle", "Check simple-mode visibility"],
    qualityChecklist: qualityKnowledge.qualityChecklist,
    commonFailureModes: qualityKnowledge.failureModes,
    requiredOutputs: ["qualityDecision", "issues", "requiredChanges"],
  }),
  artifact_manager: method({
    id: "artifact-manager-hidden-details-method",
    agentRole: "artifact_manager",
    name: "Artifact packaging",
    purpose: "Store artifacts and package internal details without exposing them in simple chat.",
    steps: ["Store primary artifact", "Classify details-only artifacts", "Prepare hiddenDetails", "Keep visible output minimal"],
    qualityChecklist: ["artifacts isolated", "details hidden", "primary artifact available"],
    commonFailureModes: ["details leaked", "artifact mixed between missions"],
    requiredOutputs: ["hiddenDetails", "artifactRefs"],
  }),
};

export function getAgentMethod(agentRole: string) {
  return agentMethods[agentRole];
}
