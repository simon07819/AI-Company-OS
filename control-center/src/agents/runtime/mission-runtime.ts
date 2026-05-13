import { runDesignTeamWorkflow, type DesignTeamResult } from "@/lib/design-team/logoWorkflow";
import { type PreviousDeliverable } from "@/lib/ceoWorkOrder";
import { buildLogoArtifact } from "@/agents/artifacts/logo-artifact-builder";
import { defaultLessonStore, extractLessonsFromApprovedSuccess, extractLessonsFromCandidateRejection, extractLessonsFromQualityReview, extractLessonsFromRefinementAttempt } from "@/agents/coaching";
import type { AgentCoachingProfile, CoachingTraceEntry, SkillOptimizationResult } from "@/agents/coaching/types";
import { createMissionArtifactStore } from "@/agents/artifacts/artifact-store";
import { buildHiddenArtifacts } from "@/agents/artifacts/hidden-artifacts-builder";
import {
  validateArtifactIsolation,
  validateLogoArtifact,
  validateNoArtifactRecycle,
  validatePrimaryArtifactExists,
  validateSimpleChatDoesNotExposeArtifacts,
  validateWebsiteArtifact,
} from "@/agents/artifacts/artifact-quality";
import { buildWebsiteArtifact } from "@/agents/artifacts/website-artifact-builder";
import { runWebsiteDesignWorkflow, type WebsiteTeamResult } from "@/agents/workflows/website-design-workflow";
import { createMissionPlanWithIntelligence, summarizeTaskDecomposition } from "@/agents/intelligence";
import type { AgentBrainOutput, CritiqueResult, RefinementStrategy } from "@/agents/intelligence/types";
import type { PlaybookTraceEntry, SelectedAgentKnowledge } from "@/agents/playbooks/types";
import { approveFinalDeliverable } from "@/agents/quality/final-approval";
import { evaluateDeliverable } from "@/agents/quality/deliverable-evaluator";
import { runRefinementLoop } from "@/agents/quality/refinement-loop";
import { getApprovedCandidate, runCandidateTournament } from "@/agents/tournament";
import type { TournamentResult } from "@/agents/tournament/types";
import type { ContextSelection } from "@/agents/memory/types";
import type { AgentRunResult } from "@/agents/types";
import type { ToolTraceEntry } from "@/agents/capabilities/types";
import { InMemoryCheckpointStore } from "./checkpoint-store";
import { buildExecutionTrace } from "./execution-trace";
import { buildHiddenDetails } from "./hidden-details-builder";
import { runQualityGates } from "./quality-gate-runner";
import { decideRetry } from "./retry-policy";
import { buildTaskGraph, sortTasksForExecution } from "./task-graph";
import { runMissionTask } from "./task-runner";
import type { MissionRuntimeResult } from "./types";
import { buildVisibleOutput } from "./visible-output-builder";
import { createWorkOrderFromPrompt } from "./work-order";

export function runAgentMission(userPrompt: string, context?: { previousDeliverable?: PreviousDeliverable | null; mode?: "simple" | "details"; contextSelection?: ContextSelection | null }): MissionRuntimeResult {
  const workOrder = createWorkOrderFromPrompt(userPrompt, context);
  if (context?.contextSelection) {
    workOrder.forbiddenPrimaryArtifactFingerprints = context.contextSelection.forbiddenPrimaryArtifactFingerprints;
    workOrder.selectedReusableAssets = context.contextSelection.selectedReusableAssets;
    workOrder.contextSelection = context.contextSelection;
  }
  const missionPlan = createMissionPlanWithIntelligence(workOrder, context);
  const graph = buildTaskGraph(missionPlan);
  const store = new InMemoryCheckpointStore();
  const runtimeAgentRuns: AgentRunResult[] = [];
  const runtimeToolTrace: ToolTraceEntry[] = [];
  const brainOutputs: AgentBrainOutput[] = [];
  const critiques: CritiqueResult[] = [];
  const refinementStrategies: RefinementStrategy[] = [];
  const playbookTrace: PlaybookTraceEntry[] = [];
  const selectedKnowledge: SelectedAgentKnowledge[] = [];
  const coachingTrace: CoachingTraceEntry[] = [];
  const coachingProfiles: AgentCoachingProfile[] = [];
  const skillOptimizations: SkillOptimizationResult[] = [];

  for (const task of sortTasksForExecution(graph)) {
    store.add(runMissionTask(task, {
      workOrder,
      agentRuns: runtimeAgentRuns,
      toolTrace: runtimeToolTrace,
      brainOutputs,
      critiques,
      refinementStrategies,
      playbookTrace,
      selectedKnowledge,
      coachingTrace,
      coachingProfiles,
      skillOptimizations,
    }));
  }

  const workflowPrompt = workOrder.deliverableType === "logo" && workOrder.brandName && !new RegExp(workOrder.brandName, "i").test(userPrompt)
    ? `logo ${workOrder.brandName} ${userPrompt}`
    : userPrompt;
  const workflow: WebsiteTeamResult | DesignTeamResult | null = workOrder.requestType === "website"
    ? runWebsiteDesignWorkflow(userPrompt, context?.previousDeliverable?.primaryVisual ?? null)
    : workOrder.deliverableType === "logo"
      ? runDesignTeamWorkflow(workflowPrompt)
      : null;
  const websiteWorkflow = workOrder.requestType === "website" ? workflow as WebsiteTeamResult : null;
  const logoWorkflow = workOrder.deliverableType === "logo" ? workflow as DesignTeamResult : null;
  const tournament: TournamentResult | null = workflow
    ? runCandidateTournament({
      workOrder,
      previousDeliverable: context?.previousDeliverable ?? null,
      selectedKnowledge,
      mode: "simple",
      maxRefinements: 2,
    })
    : null;
  const approvedCandidate = tournament ? getApprovedCandidate(tournament) : null;
  const tournamentWebsiteWorkflow = websiteWorkflow && approvedCandidate
    ? { ...websiteWorkflow, primaryVisual: approvedCandidate.content, visibleOutput: { ...websiteWorkflow.visibleOutput, primaryVisual: approvedCandidate.content } }
    : websiteWorkflow;
  const tournamentLogoConcept = logoWorkflow && approvedCandidate
    ? { ...logoWorkflow.selectedConcept, id: approvedCandidate.id, name: approvedCandidate.title, rationale: approvedCandidate.rationale, visualDirection: String(approvedCandidate.metadata.variant ?? approvedCandidate.title), svg: approvedCandidate.content }
    : logoWorkflow?.selectedConcept;
  const tournamentLogoVisual = approvedCandidate?.content ?? logoWorkflow?.primaryVisual;
  const artifactStore = createMissionArtifactStore({ missionId: workOrder.missionId, turnId: workOrder.turnId });
  const primaryArtifactBuild = workOrder.requestType === "website"
    ? buildWebsiteArtifact({
      missionId: workOrder.missionId,
      turnId: workOrder.turnId,
      brandName: workOrder.brandName ?? "AI Company",
      industry: workOrder.industry,
      style: workOrder.style,
      contentMode: workOrder.contentMode,
      assetRequests: workOrder.assetRequests,
      workflow: tournamentWebsiteWorkflow,
      previousPrimaryVisual: context?.previousDeliverable?.primaryVisual ?? null,
      store: artifactStore,
    })
    : workOrder.deliverableType === "logo"
      ? buildLogoArtifact({
        missionId: workOrder.missionId,
        turnId: workOrder.turnId,
        brandName: workOrder.brandName ?? "AI Company",
        style: workOrder.style,
        background: typeof logoWorkflow?.brief?.background === "string" ? logoWorkflow.brief.background : undefined,
        selectedConcept: tournamentLogoConcept,
        primaryVisual: tournamentLogoVisual,
        constraints: workOrder.constraints,
        store: artifactStore,
      })
      : null;
  const visibleOutput = buildVisibleOutput(workOrder, primaryArtifactBuild
    ? { primaryArtifact: primaryArtifactBuild.visibleDeliverable }
    : workflow ?? {});
  const initialReview = evaluateDeliverable({
    workOrder,
    visibleOutput: visibleOutput as { kind?: string; deliverableType?: string; brandName?: string; mediaType?: string; primaryArtifactId?: string; primaryVisual?: string },
    primaryArtifact: primaryArtifactBuild?.artifact ?? null,
    previousDeliverable: context?.previousDeliverable ?? null,
    mode: "simple",
  });
  const refinement = runRefinementLoop({
    workOrder,
    visibleOutput: visibleOutput as { kind?: string; deliverableType?: string; brandName?: string; mediaType?: string; primaryArtifactId?: string; primaryVisual?: string },
    primaryArtifact: primaryArtifactBuild?.artifact ?? null,
    previousDeliverable: context?.previousDeliverable ?? null,
    maxAttempts: 2,
  });
  const finalVisibleOutput = refinement.finalStatus === "approved" && refinement.finalVisibleOutput
    ? refinement.finalVisibleOutput
    : visibleOutput;
  const finalPrimaryArtifact = refinement.finalStatus === "approved"
    ? refinement.finalArtifact ?? primaryArtifactBuild?.artifact ?? null
    : primaryArtifactBuild?.artifact ?? null;
  const finalReview = refinement.reviews.at(-1) ?? initialReview;
  const lessonsCreated = [
    ...extractLessonsFromQualityReview(finalReview, workOrder.missionId),
    ...((tournament?.reviews ?? []).flatMap((review) => extractLessonsFromCandidateRejection(review, workOrder.deliverableType))),
    ...refinement.attempts.flatMap((attempt) => extractLessonsFromRefinementAttempt(attempt, workOrder.missionId)),
    ...extractLessonsFromApprovedSuccess({ workOrder, visibleOutput: finalVisibleOutput as { kind?: string; deliverableType?: string } }, workOrder.missionId),
  ].map((lesson) => defaultLessonStore.addLesson(lesson));
  const finalApproval = finalPrimaryArtifact
    ? approveFinalDeliverable({
      workOrder,
      visibleOutput: finalVisibleOutput as { kind?: string; deliverableType?: string; brandName?: string; mediaType?: string; primaryArtifactId?: string; primaryVisual?: string },
      primaryArtifact: finalPrimaryArtifact,
      qualityReview: finalReview,
      mode: "simple",
    })
    : null;
  const workflowDetails = workflow?.hiddenDetails ?? {};
  const workflowAgentRuns = "agentRuns" in workflowDetails && Array.isArray(workflowDetails.agentRuns) ? workflowDetails.agentRuns as AgentRunResult[] : [];
  const workflowToolTrace = "toolTrace" in workflowDetails && Array.isArray(workflowDetails.toolTrace) ? workflowDetails.toolTrace as ToolTraceEntry[] : [];
  const agentRuns = [...runtimeAgentRuns, ...workflowAgentRuns];
  const toolTrace = [...runtimeToolTrace, ...workflowToolTrace];
  const qualityResults = runQualityGates({
    workOrder,
    visibleOutput: finalVisibleOutput as { kind?: string; deliverableType?: string; brandName?: string; primaryVisual?: string },
    previousDeliverable: context?.previousDeliverable ?? null,
  });
  const artifactList = artifactStore.list();
  const primaryArtifact = finalPrimaryArtifact;
  const hiddenArtifactList = primaryArtifact && !artifactList.some((artifact) => artifact.id === primaryArtifact.id)
    ? [...artifactList, primaryArtifact]
    : artifactList;
  const artifactQualityResults = [
    validatePrimaryArtifactExists({ primaryArtifactId: primaryArtifact?.id, artifacts: hiddenArtifactList }),
    workOrder.deliverableType === "logo"
      ? validateLogoArtifact({ artifact: primaryArtifact, brandName: workOrder.brandName })
      : validateWebsiteArtifact({ artifact: primaryArtifact, brandName: workOrder.brandName }),
    validateArtifactIsolation({ artifacts: hiddenArtifactList, missionId: workOrder.missionId, turnId: workOrder.turnId }),
    validateNoArtifactRecycle({
      artifact: primaryArtifact,
      previousPrimaryVisual: context?.previousDeliverable?.primaryVisual ?? null,
      previousDeliverableType: context?.previousDeliverable?.deliverableType ?? null,
      currentDeliverableType: workOrder.deliverableType,
    }),
    validateSimpleChatDoesNotExposeArtifacts(finalVisibleOutput),
    { gate: "qualityReview", ok: finalReview.status === "approved", issues: finalReview.issues.map((issue) => issue.message) },
    { gate: "finalApproval", ok: Boolean(finalApproval?.approved), issues: finalApproval?.approved ? [] : ["final approval missing"] },
  ];
  const retry = decideRetry(qualityResults, 0);
  const checkpoints = store.all();
  const executionTrace = buildExecutionTrace({ workOrder, agentRuns, toolTrace, checkpoints, qualityResults: [...qualityResults, ...artifactQualityResults, retry] });

  return {
    workOrder,
    missionPlan,
    visibleOutput: finalVisibleOutput,
    hiddenDetails: buildHiddenDetails({
      workOrder,
      missionPlan,
      executionTrace,
      qualityResults: [...qualityResults, ...artifactQualityResults, retry],
      checkpoints,
      workflowDetails,
      artifacts: buildHiddenArtifacts(hiddenArtifactList),
      qualityReview: finalReview,
      refinement,
      finalApproval,
      tournament,
      coaching: {
        coachingTrace,
        profiles: coachingProfiles,
        skillOptimizations,
        lessonsCreated,
      },
      contextSelection: context?.contextSelection ?? null,
      intelligence: {
        brainOutputs,
        critiques,
        refinementStrategies,
        playbookTrace,
        selectedKnowledge,
        taskDecomposition: summarizeTaskDecomposition(missionPlan),
      },
    }),
  };
}
