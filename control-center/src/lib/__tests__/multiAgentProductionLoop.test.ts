import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerArtifact } from "@/lib/runtime/artifactRegistry";
import { createMissionPlan } from "@/lib/orchestrator/missionPlanner";
import { routeExperts } from "@/lib/orchestrator/expertRouter";
import { scoreProductionOutput } from "@/lib/orchestrator/qualityScorer";
import { runRevisionLoop } from "@/lib/orchestrator/revisionLoop";
import { selectFinalOutput } from "@/lib/orchestrator/finalSelector";
import { executeProductionMission } from "@/lib/orchestrator/missionExecutor";
import type { AgentOutput, MissionPlan, QualityReport } from "@/lib/orchestrator/types";

let root = "";
let runtimeRoot = "";

function output(plan: MissionPlan, id: string, artifactPaths: string[] = [], metadata: Record<string, unknown> = {}): AgentOutput {
  return {
    id,
    missionId: plan.id,
    expert: "LogoDesigner",
    title: id,
    kind: "concept",
    summary: `ELEVIO sport performance concept ${id}`,
    content: "ELEVIO sport performance prototype without Nouvelle Marque AI",
    artifactPaths,
    metadata,
  };
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "ai-company-production-"));
  runtimeRoot = fs.mkdtempSync(path.join(os.tmpdir(), "ai-company-runtime-"));
  vi.stubEnv("AI_COMPANY_PRODUCTS_DIR", root);
  vi.stubEnv("AI_COMPANY_RUNTIME_DIR", runtimeRoot);
});

afterEach(() => {
  vi.unstubAllEnvs();
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(runtimeRoot, { recursive: true, force: true });
});

describe("multi-agent production loop", () => {
  it("plans a sporty ELEVIO branding mission", () => {
    const plan = createMissionPlan("Je veux un logo sportif pour une compagnie qui s'appelle ELEVIO");

    expect(plan.requestType).toBe("branding");
    expect(plan.brandName).toBe("ELEVIO");
    expect(plan.industry).toBe("sport/performance");
    expect(plan.requiredExperts).toEqual(["BrandStrategist", "CreativeDirector", "LogoDesigner", "QualityDirector"]);
    expect(plan.minimumQualityScore).toBeGreaterThanOrEqual(80);
  });

  it("routes the right experts by mission type", () => {
    expect(routeExperts("branding")).toEqual(["BrandStrategist", "CreativeDirector", "LogoDesigner", "QualityDirector"]);
    expect(routeExperts("saas")).toEqual(["BusinessStrategist", "SaaSArchitect", "UXDirector", "QualityDirector"]);
  });

  it("rejects an output without real artifacts", () => {
    const plan = createMissionPlan("Je veux un logo sportif pour une compagnie qui s'appelle ELEVIO");
    const report = scoreProductionOutput(plan, [output(plan, "bad")], []);

    expect(report.passed).toBe(false);
    expect(report.score).toBeLessThan(plan.minimumQualityScore);
    expect(report.rejectedReasons.join("\n")).toMatch(/artifact/i);
  });

  it("rejects three variants that are too similar", () => {
    const plan = createMissionPlan("Je veux un logo sportif pour une compagnie qui s'appelle ELEVIO");
    const artifactPaths = ["a.svg", "b.svg", "c.svg"].map((file) => {
      const target = path.join(root, file);
      fs.writeFileSync(target, `<svg>${file}</svg>`, "utf-8");
      return path.relative(process.cwd(), target);
    });
    const outputs = [
      output(plan, "a", [artifactPaths[0]], { layoutSignature: "same-layout" }),
      output(plan, "b", [artifactPaths[1]], { layoutSignature: "same-layout" }),
      output(plan, "c", [artifactPaths[2]], { layoutSignature: "same-layout" }),
    ];
    const report = scoreProductionOutput(plan, outputs, artifactPaths);

    expect(report.passed).toBe(false);
    expect(report.checks.find((check) => check.id === "three-distinct-directions")?.passed).toBe(false);
  });

  it("reruns revisions until the quality threshold is met", () => {
    const plan = createMissionPlan("Je veux un logo sportif pour une compagnie qui s'appelle ELEVIO");
    const badReport: QualityReport = {
      id: "q1",
      missionId: plan.id,
      score: 40,
      passed: false,
      checks: [],
      rejectedReasons: ["Pas assez distinct"],
      recommendations: ["Créer plus de contraste"],
      createdAt: new Date().toISOString(),
    };
    const result = runRevisionLoop({
      plan,
      initialOutputs: [output(plan, "bad")],
      initialReport: badReport,
      score: (outputs) => ({
        ...badReport,
        id: `q-${outputs[0]?.id}`,
        score: outputs[0]?.id.includes("good") ? 90 : 40,
        passed: outputs[0]?.id.includes("good"),
      }),
      produceRevision: (attempt) => [output(plan, attempt === 2 ? "good" : `revision-${attempt}`)],
    });

    expect(result.revisions.length).toBe(2);
    expect(result.finalReport.passed).toBe(true);
  });

  it("stops the revision loop after three attempts", () => {
    const plan = createMissionPlan("Je veux un logo sportif pour une compagnie qui s'appelle ELEVIO");
    const report: QualityReport = {
      id: "q1",
      missionId: plan.id,
      score: 10,
      passed: false,
      checks: [],
      rejectedReasons: ["Toujours faible"],
      recommendations: [],
      createdAt: new Date().toISOString(),
    };
    const result = runRevisionLoop({
      plan,
      initialOutputs: [output(plan, "bad")],
      initialReport: report,
      score: () => report,
      produceRevision: (attempt) => [output(plan, `still-bad-${attempt}`)],
    });

    expect(result.revisions).toHaveLength(3);
    expect(result.finalReport.score).toBe(10);
  });

  it("selects the best output with real artifact paths", () => {
    const plan = createMissionPlan("Je veux un SaaS pour gérer des gyms");
    const report: QualityReport = {
      id: "q1",
      missionId: plan.id,
      score: 88,
      passed: true,
      checks: [],
      rejectedReasons: [],
      recommendations: [],
      createdAt: new Date().toISOString(),
    };
    const selection = selectFinalOutput(plan, [
      { ...output(plan, "weak"), score: 60 },
      { ...output(plan, "strong", ["generated-products/demo/README.md"]), score: 88 },
    ], report);

    expect(selection.selectedOutputId).toBe("strong");
    expect(selection.readiness).toBe("ready");
  });

  it("does not register artifacts that do not exist", () => {
    expect(() => registerArtifact({
      path: path.join(root, "missing.svg"),
      type: "svg",
      title: "Missing",
      sourceAgent: "LogoDesigner",
    })).toThrow(/does not exist/i);
  });

  it("creates a branding production run with artifacts before marking it ready", () => {
    const run = executeProductionMission("Je veux un logo sportif pour une compagnie qui s'appelle ELEVIO");

    expect(run.plan.brandName).toBe("ELEVIO");
    expect(run.status).not.toBe("running");
    expect(run.status).not.toBe("rejected");
    expect(run.manifest.artifactPaths.filter((artifactPath) => artifactPath.endsWith(".svg")).length).toBeGreaterThanOrEqual(3);
    expect(run.manifest.artifactPaths.some((artifactPath) => /final-logo\.svg$/.test(artifactPath))).toBe(true);
    expect(run.manifest.designTeam).toBeTruthy();
    expect(run.manifest.artifactPaths.every((artifactPath) => fs.existsSync(path.resolve(process.cwd(), artifactPath)))).toBe(true);
    expect(run.finalSelection?.readiness).toBe("ready");
    expect(run.tasks.every((task) => task.status !== "completed" || task.expert === "QualityDirector" || task.artifactPaths.length > 0 || task.title)).toBe(true);
  });
});
