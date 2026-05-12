import { buildLogoArtifact } from "@/agents/artifacts/logo-artifact-builder";
import { createMissionArtifactStore } from "@/agents/artifacts/artifact-store";
import { buildWebsiteArtifact } from "@/agents/artifacts/website-artifact-builder";
import type { MissionArtifact } from "@/agents/artifacts/types";
import type { DesignConcept } from "@/lib/design-team/logoWorkflow";
import { evaluateDeliverable } from "./deliverable-evaluator";
import type { RefinementLoopInput, RefinementLoopResult } from "./types";

function logoSvg(input: { brandName: string; black: boolean }) {
  const bg = input.black ? "#030712" : "#F8FAFC";
  const ink = input.black ? "#FFFFFF" : "#0F172A";
  const accent = "#2F6FED";
  const brand = input.brandName;
  const mark = brand.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 2) || "AI";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 560" role="img" aria-label="Logo ${brand}">
  <rect width="900" height="560" rx="52" fill="${bg}"/>
  <g transform="translate(150 120)">
    <path d="M0 150 98 0h132l98 150-98 150H98L0 150Z" fill="${accent}"/>
    <path d="M56 150 126 48h76l70 102-70 102h-76L56 150Z" fill="${bg}"/>
    <path d="M118 98h96M118 150h74M118 202h96" stroke="${ink}" stroke-width="22" stroke-linecap="round"/>
    <path d="M228 96 292 150l-64 54" stroke="#38BDF8" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <text x="164" y="358" text-anchor="middle" fill="#93C5FD" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="950" letter-spacing="4">${mark}</text>
  </g>
  <text x="510" y="258" fill="${ink}" font-family="Inter, Arial, sans-serif" font-size="${brand.length > 8 ? 64 : 90}" font-weight="950" letter-spacing="8">${brand}</text>
  <path d="M514 306h236" stroke="${accent}" stroke-width="12" stroke-linecap="round"/>
</svg>`;
}

function conceptFrom(input: { brandName: string; black: boolean }): DesignConcept {
  return {
    id: "refined-quality-concept",
    name: "Refinement qualité",
    rationale: "Correction automatique après review qualité.",
    visualDirection: "Monogramme construit, marque lisible et structure SVG exploitable.",
    svg: logoSvg(input),
    strengths: ["brandName correct", "composition non text-only", "viewBox"],
    weaknesses: [],
  };
}

function visibleFromArtifact(workOrder: RefinementLoopInput["workOrder"], artifact: MissionArtifact) {
  return workOrder.requestType === "website"
    ? {
      kind: "website_preview",
      deliverableType: workOrder.deliverableType === "landing_page" ? "landing_page" : "website",
      brandName: workOrder.brandName,
      mediaType: "svg",
      primaryArtifactId: artifact.id,
      primaryVisual: artifact.content,
      alt: `Preview site web ${workOrder.brandName ?? ""}`.trim(),
    }
    : {
      kind: "visual",
      deliverableType: "logo",
      brandName: workOrder.brandName,
      mediaType: "svg",
      primaryArtifactId: artifact.id,
      primaryVisual: artifact.content,
      alt: `Logo ${workOrder.brandName ?? ""}`.trim(),
    };
}

export function runRefinementLoop(input: RefinementLoopInput): RefinementLoopResult {
  const maxAttempts = input.maxAttempts ?? 2;
  const reviews = [
    evaluateDeliverable({
      workOrder: input.workOrder,
      visibleOutput: input.visibleOutput,
      primaryArtifact: input.primaryArtifact,
      previousDeliverable: input.previousDeliverable,
      mode: "simple",
    }),
  ];
  const attempts: RefinementLoopResult["attempts"] = [];
  if (reviews[0].status === "approved") {
    return {
      finalStatus: "approved",
      finalVisibleOutput: input.visibleOutput,
      finalArtifactId: input.primaryArtifact?.id,
      finalArtifact: input.primaryArtifact ?? undefined,
      reviews,
      attempts,
    };
  }

  let artifact = input.primaryArtifact ?? undefined;
  let visibleOutput = input.visibleOutput;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const store = createMissionArtifactStore({ missionId: input.workOrder.missionId, turnId: `${input.workOrder.turnId}-refine-${attempt}` });
      const build = input.workOrder.requestType === "website"
        ? buildWebsiteArtifact({
          missionId: input.workOrder.missionId,
          turnId: `${input.workOrder.turnId}-refine-${attempt}`,
          brandName: input.workOrder.brandName ?? "AI Company",
          industry: input.workOrder.industry,
          style: input.workOrder.style,
          contentMode: input.workOrder.contentMode,
          assetRequests: input.workOrder.assetRequests,
          previousPrimaryVisual: input.previousDeliverable?.primaryVisual ?? null,
          store,
        })
        : buildLogoArtifact({
          missionId: input.workOrder.missionId,
          turnId: `${input.workOrder.turnId}-refine-${attempt}`,
          brandName: input.workOrder.brandName ?? "AI Company",
          style: input.workOrder.style,
          background: /fond noir|background:black/i.test(`${input.workOrder.originalPrompt} ${input.workOrder.constraints.join(" ")}`) ? "black" : undefined,
          selectedConcept: conceptFrom({
            brandName: input.workOrder.brandName ?? "AI Company",
            black: /fond noir|background:black/i.test(`${input.workOrder.originalPrompt} ${input.workOrder.constraints.join(" ")}`),
          }),
          constraints: input.workOrder.constraints,
          store,
        });
      artifact = build.artifact;
      visibleOutput = visibleFromArtifact(input.workOrder, artifact);
      const review = evaluateDeliverable({
        workOrder: input.workOrder,
        visibleOutput,
        primaryArtifact: artifact,
        previousDeliverable: input.previousDeliverable,
        mode: "simple",
      });
      reviews.push(review);
      attempts.push({
        attempt,
        inputArtifactId: input.primaryArtifact?.id,
        outputArtifactId: artifact.id,
        issuesBefore: reviews.at(-2)?.issues ?? [],
        changesApplied: reviews.at(-2)?.requiredChanges ?? [],
        status: review.status === "approved" ? "improved" : "failed",
      });
      if (review.status === "approved") {
        return { finalStatus: "approved", finalVisibleOutput: visibleOutput, finalArtifactId: artifact.id, finalArtifact: artifact, reviews, attempts };
      }
    } catch {
      attempts.push({
        attempt,
        inputArtifactId: input.primaryArtifact?.id,
        issuesBefore: reviews.at(-1)?.issues ?? [],
        changesApplied: reviews.at(-1)?.requiredChanges ?? [],
        status: "failed",
      });
    }
  }

  return { finalStatus: "failed", finalVisibleOutput: visibleOutput, finalArtifactId: artifact?.id, finalArtifact: artifact, reviews, attempts };
}
