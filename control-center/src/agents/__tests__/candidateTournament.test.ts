import { describe, expect, it } from "vitest";
import { createWorkOrderFromPrompt } from "@/agents/runtime/work-order";
import { runAgentMission } from "@/agents/runtime/mission-runtime";
import {
  generateCandidatesForWorkOrder,
  refineTopCandidates,
  runCandidateTournament,
  runJudgePanel,
  selectFinalCandidate,
} from "@/agents/tournament";
import type { AgentCandidate, CandidateReview } from "@/agents/tournament/types";

describe("candidate tournament", () => {
  it("generates at least five distinct logo candidates for EKIDA", () => {
    const workOrder = createWorkOrderFromPrompt("logo EKIDA sur fond noir");
    const candidates = generateCandidatesForWorkOrder(workOrder);

    expect(candidates.length).toBeGreaterThanOrEqual(5);
    expect(candidates.every((candidate) => candidate.id && candidate.content && candidate.rationale)).toBe(true);
    expect(candidates.some((candidate) => /EKIDA|>EK<|>E</.test(candidate.content))).toBe(true);
    expect(candidates.some((candidate) => /badge|embl/i.test(`${candidate.title} ${candidate.rationale}`))).toBe(true);
    expect(JSON.stringify(candidates)).not.toContain("Marque à nommer");
  });

  it("generates at least three structured website candidates", () => {
    const workOrder = createWorkOrderFromPrompt("Je veux une page web bien simple avec le logo ekida, tu peux mettre du contenu temporaire ses une compagnie de linge");
    const candidates = generateCandidatesForWorkOrder(workOrder);

    expect(candidates.length).toBeGreaterThanOrEqual(3);
    for (const candidate of candidates) {
      expect(candidate.kind).toBe("website_preview");
      expect(candidate.content).toContain("aria-label=\"nav\"");
      expect(candidate.content).toContain("aria-label=\"hero\"");
      expect(candidate.content).toContain("aria-label=\"sections\"");
      expect(candidate.content).toMatch(/Voir la collection|Acheter/);
    }
  });

  it("rejects known bad candidates and approves valid candidates", () => {
    const workOrder = createWorkOrderFromPrompt("logo EKIDA");
    const badCandidate: AgentCandidate = {
      id: "bad-b",
      missionId: workOrder.missionId,
      turnId: workOrder.turnId,
      kind: "logo_svg",
      deliverableType: "logo",
      brandName: "EKIDA",
      createdByAgentRole: "logo_designer",
      title: "Wrong initial",
      rationale: "Bad generic initial.",
      content: "<svg viewBox=\"0 0 100 100\"><rect width=\"100\" height=\"100\"/><text>B</text></svg>",
      artifactId: "candidate-bad-b",
      status: "draft",
      metadata: {},
    };
    const goodCandidate = generateCandidatesForWorkOrder(workOrder)[0];
    const reviews = runJudgePanel({ workOrder, candidates: [badCandidate, goodCandidate], mode: "simple" });

    expect(reviews.filter((review) => review.candidateId === "bad-b").some((review) => review.decision === "reject")).toBe(true);
    expect(reviews.filter((review) => review.candidateId === goodCandidate.id).every((review) => review.decision === "approve")).toBe(true);
  });

  it("refines weak website candidates into structured page candidates", () => {
    const workOrder = createWorkOrderFromPrompt("Je veux une page web avec le logo EKIDA");
    const logoOnly: AgentCandidate = {
      id: "logo-only",
      missionId: workOrder.missionId,
      turnId: workOrder.turnId,
      kind: "website_preview",
      deliverableType: "website",
      brandName: "EKIDA",
      createdByAgentRole: "frontend_builder",
      title: "Logo only",
      rationale: "Invalid website candidate.",
      content: "<svg viewBox=\"0 0 100 100\"><text>EKIDA</text></svg>",
      artifactId: "candidate-logo-only",
      status: "draft",
      metadata: {},
    };
    const reviews = runJudgePanel({ workOrder, candidates: [logoOnly], mode: "simple" });
    const refined = refineTopCandidates({ workOrder, candidates: [logoOnly], reviews, maxRefinements: 1 });

    expect(refined[0].id).toContain("refined");
    expect(refined[0].content).toContain("aria-label=\"nav\"");
    expect(refined[0].content).toContain("aria-label=\"hero\"");
    expect(refined[0].content).toContain("aria-label=\"sections\"");
  });

  it("selects only approved candidates with an artifact reference", () => {
    const workOrder = createWorkOrderFromPrompt("logo EKIDA");
    const candidate = generateCandidatesForWorkOrder(workOrder)[0];
    const missingArtifact = { ...candidate, id: "missing-artifact", artifactId: undefined };
    const reviews: CandidateReview[] = [
      { candidateId: candidate.id, reviewerRole: "quality_director", score: 94, strengths: [], weaknesses: [], issues: [], requiredChanges: [], decision: "approve" },
      { candidateId: missingArtifact.id, reviewerRole: "quality_director", score: 99, strengths: [], weaknesses: [], issues: [], requiredChanges: [], decision: "approve" },
    ];

    expect(selectFinalCandidate({ workOrder, candidates: [missingArtifact], reviews })).toBeNull();
    expect(selectFinalCandidate({ workOrder, candidates: [candidate, missingArtifact], reviews })?.id).toBe(candidate.id);
  });

  it("runs tournament in runtime and keeps tournament internals out of visible output", () => {
    const result = runAgentMission("logo EKIDA sur fond noir");
    const visible = JSON.stringify(result.visibleOutput);

    expect(result.hiddenDetails.tournament?.status).toBe("approved");
    expect(result.hiddenDetails.tournament?.candidates.length).toBeGreaterThanOrEqual(5);
    expect(visible).not.toMatch(/tournament|candidate|score|review|learning|process/i);
  });

  it("runs website tournament after logo without recycling the logo as primary output", () => {
    const logo = runAgentMission("logo EKIDA");
    const logoVisible = logo.visibleOutput as { primaryVisual?: string; deliverableType?: string };
    const website = runAgentMission("Je veux une page web bien simple avec le logo ekida, tu peux mettre du contenu temporaire ses une compagnie de linge", {
      previousDeliverable: { deliverableType: "logo", primaryVisual: logoVisible.primaryVisual ?? "", brandName: "EKIDA" },
    });
    const visible = website.visibleOutput as { kind?: string; primaryVisual?: string };

    expect(website.hiddenDetails.tournament?.status).toBe("approved");
    expect(website.hiddenDetails.tournament?.candidates.length).toBeGreaterThanOrEqual(3);
    expect(visible.kind).toBe("website_preview");
    expect(visible.primaryVisual).not.toBe(logoVisible.primaryVisual);
    expect(visible.primaryVisual).toContain("aria-label=\"nav\"");
    expect(visible.primaryVisual).toContain("aria-label=\"hero\"");
    expect(visible.primaryVisual).toContain("aria-label=\"sections\"");
  });

  it("records learning notes for rejected candidates", () => {
    const workOrder = createWorkOrderFromPrompt("Je veux une page web avec le logo EKIDA");
    const result = runCandidateTournament({ workOrder, maxRefinements: 1 });

    expect(result.status).toBe("approved");
    expect(JSON.stringify(result.learningNotes)).not.toMatch(/NVIDIA_API_KEY|\.env/);
  });
});
