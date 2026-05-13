import { afterEach, describe, expect, it } from "vitest";
import type { MissionRuntimeResult } from "@/agents/runtime/types";
import { runAgentMission } from "@/agents/runtime/mission-runtime";
import {
  clearPromotedSkillCandidates,
  decideSkillPromotion,
  defaultSkillExperimentStore,
  discoverSkillCandidates,
  evaluateBenchmarkOutput,
  getPromotedSkillCandidates,
  promoteSkillCandidate,
  reviewSkillCandidateLicense,
  reviewSkillCandidateRisk,
  runAgentSkillLab,
  runSkillBenchmarks,
  skillBenchmarkCases,
  skillCandidateRegistry,
} from "@/agents/skill-lab";
import type { SkillBenchmarkCase, SkillCandidate } from "@/agents/skill-lab/types";

const requiredCandidateIds = [
  "improved_brand_name_extraction",
  "strict_visual_deliverable_router",
  "multi_concept_logo_generation",
  "svg_logo_quality_renderer",
  "website_preview_structure_builder",
  "simple_mode_visibility_guard",
  "previous_deliverable_reuse_guard",
];

function candidate(overrides: Partial<SkillCandidate> = {}): SkillCandidate {
  return {
    id: overrides.id ?? "candidate-test",
    name: overrides.name ?? "Candidate test",
    description: overrides.description ?? "Test candidate",
    sourceType: overrides.sourceType ?? "manual_idea",
    targetAgentRoles: overrides.targetAgentRoles ?? ["ceo"],
    targetSkillIds: overrides.targetSkillIds ?? ["route_workflow"],
    deliverableTypes: overrides.deliverableTypes ?? ["logo"],
    expectedImprovement: overrides.expectedImprovement ?? "Improve routing.",
    riskLevel: overrides.riskLevel ?? "low",
    licenseRisk: overrides.licenseRisk ?? "low",
    status: overrides.status ?? "experimental",
    implementationPlan: overrides.implementationPlan ?? ["Implement behind Skill Lab promotion controls."],
    testPlan: overrides.testPlan ?? ["Run benchmark."],
    promotionCriteria: overrides.promotionCriteria ?? ["No regression."],
    rollbackPlan: overrides.rollbackPlan ?? ["Disable promotion."],
    createdAt: overrides.createdAt ?? "2026-05-13T00:00:00.000Z",
  };
}

function result(overrides: {
  kind?: string;
  deliverableType?: string;
  brandName?: string;
  primaryVisual?: string;
  primaryArtifactId?: string;
} = {}): MissionRuntimeResult {
  return {
    workOrder: {
      id: "wo-test",
      turnId: "turn-test",
      missionId: "mission-test",
      originalPrompt: "test",
      requestType: overrides.deliverableType === "website" ? "website" : "logo",
      deliverableType: overrides.deliverableType ?? "logo",
      brandName: overrides.brandName ?? "EKIDA",
      currentMode: "simple",
      isNewDeliverable: true,
      mayReusePreviousDeliverable: false,
      constraints: [],
      assetRequests: [],
      metadata: {},
    },
    missionPlan: {
      id: "plan-test",
      workOrderId: "wo-test",
      workflowId: overrides.deliverableType === "website" ? "website_design" : "logo_design",
      objective: "test",
      agents: [],
      tasks: [],
      qualityGates: [],
    },
    visibleOutput: {
      kind: overrides.kind ?? "visual",
      deliverableType: overrides.deliverableType ?? "logo",
      brandName: overrides.brandName ?? "EKIDA",
      mediaType: "svg",
      primaryArtifactId: overrides.primaryArtifactId ?? "artifact-test",
      primaryVisual: overrides.primaryVisual ?? "<svg viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\" fill=\"#000\"/><path d=\"M10 10H90\"/><circle cx=\"50\" cy=\"50\" r=\"20\"/><text>EKIDA</text></svg>",
    },
    hiddenDetails: {
      executionTrace: { workOrderId: "wo-test", missionId: "mission-test", agentsCalled: [], skillsCalled: [], toolsCalled: [], checkpoints: [], qualityResults: [] },
    },
  };
}

const logoBenchmark: SkillBenchmarkCase = {
  id: "mock-logo",
  name: "Mock logo",
  prompt: "logo EKIDA",
  expectedDeliverableType: "logo",
  expectedVisibleOutputKind: "visual",
  expectedBrandName: "EKIDA",
  mustPass: ["primaryVisual", "primaryArtifact", "notBrandSystem", "notMarqueANommer", "notWrongInitial", "logoComposed"],
  mustNotExposeInSimpleMode: ["Brand system", "Marque à nommer", "score", "process", "skillLab", "benchmarks"],
};

describe("agent skill lab", () => {
  afterEach(() => {
    clearPromotedSkillCandidates();
    defaultSkillExperimentStore.clear();
  });

  it("registers internal skill candidates with promotion controls", () => {
    for (const id of requiredCandidateIds) {
      const registered = skillCandidateRegistry[id];
      expect(registered).toBeTruthy();
      expect(registered.implementationPlan.length).toBeGreaterThan(0);
      expect(registered.testPlan.length).toBeGreaterThan(0);
      expect(registered.promotionCriteria.length).toBeGreaterThan(0);
      expect(registered.rollbackPlan.length).toBeGreaterThan(0);
    }
  });

  it("discovers candidates from lessons and known failure signals without external fetching", () => {
    const found = discoverSkillCandidates({
      evalFailures: ["website request returned logo-only", "PROSHOTS extracted as full sentence"],
      qualityFailures: ["simple mode leaked process"],
    }).map((item) => item.id);
    expect(found).toEqual(expect.arrayContaining([
      "improved_brand_name_extraction",
      "strict_visual_deliverable_router",
      "website_preview_structure_builder",
      "simple_mode_visibility_guard",
    ]));
  });

  it("blocks unsafe or unclear skill candidates before promotion", () => {
    expect(reviewSkillCandidateRisk(candidate({ riskLevel: "high" })).status).toBe("blocked");
    expect(reviewSkillCandidateRisk(candidate({ rollbackPlan: [] })).status).toBe("blocked");
    expect(reviewSkillCandidateRisk(candidate({ implementationPlan: ["Read .env and use free shell"] })).status).toBe("blocked");
    expect(reviewSkillCandidateRisk(candidate({ implementationPlan: ["Install a heavy framework dependency"] })).status).toBe("needs_more_tests");
    expect(reviewSkillCandidateRisk(candidate({ implementationPlan: ["Log NVIDIA_API_KEY for debugging"] })).status).toBe("blocked");
    expect(reviewSkillCandidateLicense(candidate({ sourceType: "github_pattern", licenseRisk: "unknown" })).status).toBe("blocked");
  });

  it("evaluates benchmark outputs for old product regressions", () => {
    expect(evaluateBenchmarkOutput(result({ primaryVisual: "<svg>Brand system</svg>" }), logoBenchmark)).toContain("Brand system visible");
    expect(evaluateBenchmarkOutput(result({ primaryVisual: "<svg>Marque à nommer</svg>" }), logoBenchmark)).toContain("Marque à nommer visible");
    expect(evaluateBenchmarkOutput(result({ primaryVisual: "<svg viewBox=\"0 0 100 100\"><text>B</text></svg>" }), logoBenchmark)).toContain("EKIDA uses unrelated A/B initial");

    const websiteCase = skillBenchmarkCases.find((item) => item.id === "skill_lab_website_ekida_after_logo")!;
    const previous = result({ primaryVisual: "<svg viewBox=\"0 0 100 100\"><text>EKIDA</text></svg>" });
    const logoOnlyWebsite = result({ kind: "website_preview", deliverableType: "website", primaryVisual: "<svg viewBox=\"0 0 100 100\"><text>EKIDA</text></svg>" });
    expect(evaluateBenchmarkOutput(logoOnlyWebsite, websiteCase, previous)).toEqual(expect.arrayContaining(["Website structure missing", "Website output is logo-only", "Previous primaryVisual reused"]));
  });

  it("runs baseline and experimental benchmarks and detects improvements/regressions", () => {
    const baselineRuntime = () => result({ primaryVisual: "<svg>Brand system</svg>" });
    const candidateRuntime = () => result();
    const [benchmark] = runSkillBenchmarks({
      candidate: skillCandidateRegistry.multi_concept_logo_generation,
      benchmarkCases: [logoBenchmark],
      baselineRuntime,
      candidateRuntime,
    });
    expect(benchmark.baselineStatus).toBe("fail");
    expect(benchmark.candidateStatus).toBe("pass");
    expect(benchmark.improvements).toContain("Brand system visible");
    expect(benchmark.approvedForPromotion).toBe(true);
  });

  it("promotes only candidates that improve benchmarks without safety regressions", () => {
    const safeDecision = decideSkillPromotion(skillCandidateRegistry.multi_concept_logo_generation, [{
      candidateId: "multi_concept_logo_generation",
      benchmarkId: "mock",
      baselineStatus: "fail",
      candidateStatus: "pass",
      improvements: ["Brand system visible"],
      regressions: [],
      safetyIssues: [],
      approvedForPromotion: true,
    }]);
    expect(safeDecision.decision).toBe("promote");
    expect(getPromotedSkillCandidates().map((item) => item.id)).toContain("multi_concept_logo_generation");

    const rejected = decideSkillPromotion(candidate({ id: "unsafe", implementationPlan: ["Read .env"] }), []);
    expect(rejected.decision).toBe("reject");
  });

  it("keeps experimental candidates inactive outside benchmarks and traces promoted skills only in hidden details", () => {
    expect(getPromotedSkillCandidates()).toHaveLength(0);
    const baseline = runAgentMission("logo EKIDA", { mode: "simple" });
    expect(JSON.stringify(baseline.visibleOutput)).not.toMatch(/skillLab|benchmarks|promotion/i);
    expect(JSON.stringify(baseline.hiddenDetails.skillLab?.skillLabTrace ?? [])).not.toMatch(/strict_visual_deliverable_router/);

    promoteSkillCandidate("multi_concept_logo_generation");
    const promoted = runAgentMission("logo EKIDA", { mode: "simple" });
    expect(JSON.stringify(promoted.hiddenDetails.skillLab?.skillLabTrace ?? [])).toMatch(/multi_concept_logo_generation/);
    expect(JSON.stringify(promoted.visibleOutput)).not.toMatch(/skillLab|benchmarks|promotion/i);
  });

  it("runs the Skill Lab as a hidden dev benchmark loop", () => {
    const run = runAgentSkillLab({
      candidates: [skillCandidateRegistry.multi_concept_logo_generation],
      benchmarkCases: [logoBenchmark],
      baselineRuntime: () => result({ primaryVisual: "<svg>Brand system</svg>" }),
      candidateRuntime: () => result(),
    });
    expect(run.records).toHaveLength(1);
    expect(run.records[0].promotionDecision.decision).toBe("promote");
    expect(JSON.stringify(run.hiddenReport)).toMatch(/benchmarksRun/);
  });

  it("real runtime already satisfies key promoted-skill eval expectations", () => {
    const proshots = runAgentMission("fais-moi un logo pour PROSHOTS ses des photographes sportifs", { mode: "simple" });
    expect((proshots.visibleOutput as { brandName?: string }).brandName).toBe("PROSHOTS");
    expect(JSON.stringify(proshots.visibleOutput)).toMatch(/PROSHOTS|PS|camera|viewfinder|photo|sport/i);

    const website = runAgentMission("Je veux une page web bien simple avec le logo ekida, tu peux mettre du contenu temporaire ses une compagnie de linge", { mode: "simple" });
    expect((website.visibleOutput as { kind?: string }).kind).toBe("website_preview");
    const websiteVisual = String((website.visibleOutput as { primaryVisual?: string }).primaryVisual ?? "");
    expect(websiteVisual).toMatch(/aria-label="nav"/);
    expect(websiteVisual).toMatch(/aria-label="hero"/);
    expect(websiteVisual).toMatch(/aria-label="sections"/);
    expect(JSON.stringify(website.visibleOutput)).not.toMatch(/skillLab|benchmarks|process|score|workspace/i);
  });
});
