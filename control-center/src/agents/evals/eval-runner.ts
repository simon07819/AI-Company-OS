import { createArtifactFingerprint } from "@/agents/artifacts/artifact-fingerprint";
import { clearMissionMemoryStore, createMissionMemoryStore, reusableAssetFromMission } from "@/agents/memory/mission-memory-store";
import { decideContextReuse } from "@/agents/memory/reuse-policy";
import { runAgentMission } from "@/agents/runtime/mission-runtime";
import { createWorkOrderFromPrompt } from "@/agents/runtime/work-order";
import type { PreviousDeliverable } from "@/lib/ceoWorkOrder";
import { evaluateRuntimeResult } from "./eval-assertions";
import type { EvalCase, EvalResult, RuntimeVisibleOutput } from "./types";

function previousFromResult(result: ReturnType<typeof runAgentMission>): PreviousDeliverable {
  const visible = result.visibleOutput as RuntimeVisibleOutput;
  return {
    deliverableType: visible.deliverableType,
    brandName: visible.brandName,
    primaryVisual: visible.primaryVisual,
    primaryArtifactFingerprint: visible.primaryVisual ? createArtifactFingerprint(visible.primaryVisual) : undefined,
  };
}

export function runCeoAgentEvalCase(evalCase: EvalCase): EvalResult {
  try {
    clearMissionMemoryStore(evalCase.id);
    const store = createMissionMemoryStore({ conversationId: evalCase.id });
    const previousResults: ReturnType<typeof runAgentMission>[] = [];
    let previousDeliverable: PreviousDeliverable | null = null;

    for (const previousTurn of evalCase.previousTurns ?? []) {
      const result = runAgentMission(previousTurn.prompt, { previousDeliverable, mode: "simple" });
      const visible = result.visibleOutput as RuntimeVisibleOutput;
      previousResults.push(result);
      previousDeliverable = previousFromResult(result);

      store.addTurn({
        id: result.workOrder.turnId,
        userPrompt: previousTurn.prompt,
        workOrderId: result.workOrder.id,
        missionId: result.workOrder.missionId,
        deliverableType: visible.deliverableType,
        brandName: visible.brandName,
        visibleOutputKind: visible.kind,
        primaryArtifactId: visible.primaryArtifactId,
        primaryArtifactFingerprint: previousDeliverable.primaryArtifactFingerprint ?? undefined,
        status: "approved",
      });

      if (visible.primaryArtifactId && previousDeliverable.primaryArtifactFingerprint) {
        store.addApprovedMission({
          id: `memory-${result.workOrder.missionId}`,
          turnId: result.workOrder.turnId,
          missionId: result.workOrder.missionId,
          workOrderId: result.workOrder.id,
          deliverableType: visible.deliverableType ?? previousTurn.expectedDeliverableType,
          brandName: visible.brandName ?? previousTurn.expectedBrandName,
          primaryArtifactId: visible.primaryArtifactId,
          primaryArtifactFingerprint: previousDeliverable.primaryArtifactFingerprint,
          reusableAssets: [reusableAssetFromMission({
            id: `asset-${visible.primaryArtifactId}`,
            deliverableType: visible.deliverableType ?? previousTurn.expectedDeliverableType,
            brandName: visible.brandName ?? previousTurn.expectedBrandName,
            primaryArtifactId: visible.primaryArtifactId,
            primaryArtifactFingerprint: previousDeliverable.primaryArtifactFingerprint,
          })],
          summary: `${visible.deliverableType} ${visible.brandName ?? ""}`.trim(),
        });
      }
    }

    const preliminaryWorkOrder = createWorkOrderFromPrompt(evalCase.prompt, previousDeliverable);
    const contextSelection = decideContextReuse({
      currentPrompt: evalCase.prompt,
      currentWorkOrder: preliminaryWorkOrder,
      memory: store.snapshot(),
    });
    const result = runAgentMission(evalCase.prompt, { previousDeliverable, mode: "simple", contextSelection });
    const failures = evaluateRuntimeResult({ result, previousResults, expected: evalCase.expected });
    const visible = result.visibleOutput as RuntimeVisibleOutput;

    if (evalCase.expected.mustDifferFromPreviousPrimaryVisual && previousResults.at(-1)) {
      const previousVisible = previousResults.at(-1)!.visibleOutput as RuntimeVisibleOutput;
      if (visible.primaryVisual === previousVisible.primaryVisual) failures.push("primaryVisual identique au livrable précédent");
    }

    return {
      id: evalCase.id,
      status: failures.length ? "fail" : "pass",
      failures,
      summary: failures.length
        ? `${evalCase.name}: ${failures.length} échec(s)`
        : `${evalCase.name}: pass`,
    };
  } catch (error) {
    return {
      id: evalCase.id,
      status: "fail",
      failures: [error instanceof Error ? error.message : String(error)],
      summary: `${evalCase.name}: exception`,
    };
  }
}

export function runCeoAgentEvals(cases: EvalCase[]) {
  return cases.map(runCeoAgentEvalCase);
}
