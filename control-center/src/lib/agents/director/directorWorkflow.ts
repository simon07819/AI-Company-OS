/**
 * Director Workflow — Intégration complète CEO → Directeur → Agents → Directeur → CEO
 *
 * Appelé après executeProductionMission() pour enrichir et valider le résultat.
 */

import type { ProductionRun } from "@/lib/orchestrator/types";
import { runDirectorValidation, runDirectorSynthesis, type DirectorValidation, type DirectorSynthesis } from "./directorAgent";
import { buildKpiReport, type KpiReport } from "./kpiTracker";

export interface DirectorWorkflowResult {
  validation: DirectorValidation;
  synthesis: DirectorSynthesis;
  kpi: KpiReport;
  directorApproved: boolean;
  directorMessage: string;
  ceoFacingMessage: string;
  mode: "llm" | "prototype";
}

function buildOutputsSummary(run: ProductionRun): string {
  return run.outputs
    .slice(0, 6)
    .map((output) => `- ${output.expert}: ${output.summary ?? output.title}`)
    .join("\n");
}

function extractAgentsUsed(run: ProductionRun): string[] {
  const seen = new Set<string>();
  return run.outputs.reduce<string[]>((acc, output) => {
    if (!seen.has(output.expert)) { seen.add(output.expert); acc.push(output.expert); }
    return acc;
  }, []);
}

export async function runDirectorWorkflow(
  prompt: string,
  run: ProductionRun,
  startedAt: Date,
  conversationContext = "",
): Promise<DirectorWorkflowResult> {
  const qualityScore = run.manifest.qualityScore ?? run.qualityReports.at(-1)?.score ?? 0;
  const outputsSummary = buildOutputsSummary(run);
  const agentsUsed = extractAgentsUsed(run);

  const brief = {
    sourcePrompt: conversationContext ? `${conversationContext}Demande actuelle: ${prompt}` : prompt,
    requestType: run.plan.requestType,
    brandName: run.plan.brandName ?? null,
    industry: run.plan.industry,
    userGoal: run.plan.userGoal,
  };

  const validation = await runDirectorValidation(brief, outputsSummary, qualityScore);
  const synthesis = await runDirectorSynthesis(brief, validation, run.revisions.length);

  const kpi = buildKpiReport(
    run.id,
    run.plan.requestType,
    run.plan.brandName ?? null,
    startedAt,
    qualityScore,
    run.revisions.length,
    run.manifest.artifactPaths.length,
    agentsUsed,
    validation.approved,
    validation.revisionNeeded,
  );

  return {
    validation,
    synthesis,
    kpi,
    directorApproved: validation.approved,
    directorMessage: validation.directorMessage,
    ceoFacingMessage: synthesis.ceoFacingMessage,
    mode: validation.mode,
  };
}
