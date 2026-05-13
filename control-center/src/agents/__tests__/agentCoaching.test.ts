import { afterEach, describe, expect, it } from "vitest";
import { agentRegistry } from "@/agents/registry";
import { runAgentMission } from "@/agents/runtime/mission-runtime";
import { createWorkOrderFromPrompt } from "@/agents/runtime/work-order";
import {
  applyLessonsToPlaybookRuntimeView,
  coachAgentBeforeTask,
  clearDefaultLessons,
  createLessonStore,
  defaultLessonStore,
  extractLessonsFromCandidateRejection,
  extractLessonsFromEvalFailure,
  extractLessonsFromQualityReview,
  optimizeSkillBehavior,
  runEvalsWithCoaching,
  selectLessonsForTask,
} from "@/agents/coaching";
import { failurePatterns } from "@/agents/coaching/failure-patterns";
import { playbookRegistry } from "@/agents/playbooks";
import { compilePlaybookIntoAgentMethod } from "@/agents/playbooks";
import type { AgentLesson } from "@/agents/coaching/types";
import type { CandidateReview } from "@/agents/tournament/types";

function baseLesson(overrides: Partial<AgentLesson> = {}): AgentLesson {
  return {
    id: overrides.id ?? "lesson-ekida-wrong-initial",
    source: overrides.source ?? "eval_failure",
    sourceId: overrides.sourceId ?? "eval-logo-ekida",
    agentRole: overrides.agentRole ?? "logo_designer",
    deliverableType: overrides.deliverableType ?? "logo",
    failurePattern: overrides.failurePattern ?? failurePatterns.wrongInitial,
    correctionRule: overrides.correctionRule ?? "Use EKIDA, EK or E; never unrelated initials.",
    detectionHints: overrides.detectionHints ?? ["B generic"],
    appliesWhen: overrides.appliesWhen ?? ["EKIDA"],
    priority: overrides.priority ?? 100,
    severity: overrides.severity ?? "critical",
    createdAt: overrides.createdAt ?? "2026-05-13T00:00:00.000Z",
  };
}

describe("agent coaching and skill optimization", () => {
  afterEach(() => {
    clearDefaultLessons();
  });

  it("stores and selects lessons without exposing secrets", () => {
    const store = createLessonStore();
    store.addLesson(baseLesson({ correctionRule: "Never print NVIDIA_API_KEY or .env" }));
    store.addLesson(baseLesson({ id: "site", agentRole: "frontend_builder", deliverableType: "website", failurePattern: failurePatterns.websiteLogoOnly }));

    expect(store.lessonsForAgent("logo_designer")).toHaveLength(1);
    expect(store.lessonsForDeliverable("website")).toHaveLength(1);
    expect(store.lessonsForFailurePattern(failurePatterns.wrongInitial)).toHaveLength(1);
    expect(JSON.stringify(store.all())).not.toMatch(/NVIDIA_API_KEY|\.env/);
  });

  it("extracts lessons from eval failures, quality reviews and candidate rejections", () => {
    const evalLessons = extractLessonsFromEvalFailure({
      id: "logo_ekida_basic",
      status: "fail",
      failures: ["Brand system visible", "EKIDA uses B generic"],
      summary: "failed",
    });
    expect(evalLessons.map((lesson) => lesson.failurePattern)).toEqual(expect.arrayContaining([
      failurePatterns.brandSystemLogo,
      failurePatterns.wrongInitial,
    ]));

    const qualityLessons = extractLessonsFromQualityReview({
      status: "rejected",
      score: 20,
      reviewerRole: "quality_director",
      requiredChanges: [],
      issues: [{
        id: "placeholder",
        severity: "fail",
        category: "brand_extraction",
        message: "Marque à nommer used with explicit brand",
        suggestedFix: "Extract the provided brand name.",
      }],
    });
    expect(qualityLessons[0]).toMatchObject({ agentRole: "product_owner", failurePattern: failurePatterns.unnamedBrand });

    const review: CandidateReview = {
      candidateId: "candidate-logo-only",
      reviewerRole: "web_director",
      score: 40,
      strengths: [],
      weaknesses: ["logo-only"],
      issues: ["website logo-only output"],
      requiredChanges: ["Build a full page."],
      decision: "reject",
    };
    expect(extractLessonsFromCandidateRejection(review, "website")[0]).toMatchObject({
      agentRole: "frontend_builder",
      failurePattern: failurePatterns.websiteLogoOnly,
    });
  });

  it("selects only relevant lessons for each task", () => {
    const lessons = [
      baseLesson(),
      baseLesson({ id: "website", agentRole: "frontend_builder", deliverableType: "website", failurePattern: failurePatterns.websiteLogoOnly, appliesWhen: ["website"] }),
      baseLesson({ id: "product", agentRole: "product_owner", deliverableType: "logo", failurePattern: failurePatterns.brandNameFullSentence, appliesWhen: ["PROSHOTS"] }),
    ];

    const logoWorkOrder = createWorkOrderFromPrompt("logo EKIDA");
    const websiteWorkOrder = createWorkOrderFromPrompt("Je veux une page web avec le logo EKIDA");
    expect(selectLessonsForTask({ agentRole: "logo_designer", workOrder: logoWorkOrder, lessons })).toHaveLength(1);
    expect(selectLessonsForTask({ agentRole: "frontend_builder", workOrder: websiteWorkOrder, lessons })).toHaveLength(1);
    expect(selectLessonsForTask({ agentRole: "product_owner", workOrder: logoWorkOrder, lessons })).toHaveLength(0);
  });

  it("enriches playbooks and skill behavior without editing source playbooks", () => {
    const playbook = playbookRegistry.logo_designer;
    const originalFailureCount = playbook.failureModes.length;
    const runtimeView = applyLessonsToPlaybookRuntimeView(playbook, [baseLesson()]);
    const method = compilePlaybookIntoAgentMethod(runtimeView);
    const optimization = optimizeSkillBehavior({ agentRole: "logo_designer", skillId: "generate_logo_concepts", lessons: [baseLesson()] });
    const coached = coachAgentBeforeTask({ agentRole: "logo_designer", method, selectedLessons: [baseLesson()], skillOptimizations: [optimization] });

    expect(runtimeView.failureModes.length).toBeGreaterThan(originalFailureCount);
    expect(playbook.failureModes).toHaveLength(originalFailureCount);
    expect(method.qualityChecklist).toContain(baseLesson().correctionRule);
    expect(optimization.status).toBe("improved");
    expect(coached.profile.updatedChecklist.join(" ")).toContain("unrelated initials");
    expect(coached.skillInputPatch.coaching.lessonIds).toContain(baseLesson().id);
  });

  it("passes coaching into runtime hidden details only", () => {
    clearDefaultLessons();
    defaultLessonStore.addLesson(baseLesson());
    const result = runAgentMission("logo EKIDA sur fond noir");
    const visible = JSON.stringify(result.visibleOutput);
    const coaching = result.hiddenDetails.coaching;

    expect(coaching?.coachingTrace.some((trace) => trace.lessonIds.includes(baseLesson().id))).toBe(true);
    expect(coaching?.profiles.some((profile) => profile.agentRole === "logo_designer" && profile.activeLessons.length > 0)).toBe(true);
    expect(coaching?.skillOptimizations.some((optimization) => optimization.skillId === "generate_logo_concepts" && optimization.status === "improved")).toBe(true);
    expect(visible).not.toMatch(/coaching|lessons|coachingTrace|skillOptimizations|quality report|process/i);
  });

  it("lets learned website lessons influence the next mission", () => {
    clearDefaultLessons();
    defaultLessonStore.addLesson(baseLesson({
      id: "lesson-website-logo-only",
      agentRole: "frontend_builder",
      deliverableType: "website",
      failurePattern: failurePatterns.websiteLogoOnly,
      correctionRule: "Website primary output must include header/nav, hero, CTA and sections.",
      appliesWhen: ["website"],
    }));
    const logo = runAgentMission("logo EKIDA");
    const logoVisible = logo.visibleOutput as { primaryVisual?: string };
    const website = runAgentMission("Je veux une page web bien simple avec le logo ekida, tu peux mettre du contenu temporaire ses une compagnie de linge", {
      previousDeliverable: { deliverableType: "logo", brandName: "EKIDA", primaryVisual: logoVisible.primaryVisual },
    });
    const visible = website.visibleOutput as { kind?: string; primaryVisual?: string };

    expect(visible.kind).toBe("website_preview");
    expect(visible.primaryVisual).not.toBe(logoVisible.primaryVisual);
    expect(visible.primaryVisual).toContain("aria-label=\"nav\"");
    expect(website.hiddenDetails.coaching?.coachingTrace.some((trace) => trace.agentRole === "frontend_builder" && trace.lessonIds.includes("lesson-website-logo-only"))).toBe(true);
  });

  it("runs evals with coaching and keeps the API available for current agents", () => {
    clearDefaultLessons();
    const result = runEvalsWithCoaching([{
      id: "mock-logo-brand-system",
      name: "Mock logo failure",
      prompt: "logo EKIDA",
      expected: {
        deliverableType: "website",
        visibleOutputKind: "website_preview",
        brandName: "EKIDA",
      },
      tags: ["mock"],
    }]);

    expect(result.hiddenReport).toBeTruthy();
    expect(result.lessonsCreated.length).toBeGreaterThan(0);
    expect(Object.keys(agentRegistry)).toContain("ceo");
  });
});
