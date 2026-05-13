"use client";

import { FileText } from "lucide-react";
import Link from "next/link";
import type { CEOCurrentMission, CEOCurrentResult } from "./types";

function artifactName(artifactPath: string) {
  const parts = artifactPath.split("/");
  const generatedIndex = parts.indexOf("generated-products");
  if (generatedIndex >= 0 && parts.length > generatedIndex + 2) return parts.slice(generatedIndex + 2).join("/");
  return parts.at(-1) ?? artifactPath;
}

function workflowDetails(expert: CEOCurrentResult["expert"]) {
  const workflow = expert?.companyWorkflow as {
    workflow?: string;
    missionPlan?: unknown;
    agentRuns?: { agentId?: string; role?: string; skillId?: string; status?: string }[];
    hiddenDetails?: {
      executionTrace?: { agentsCalled?: string[]; skillsCalled?: string[]; toolsCalled?: string[]; checkpoints?: unknown[]; qualityResults?: unknown[] };
      artifacts?: { id?: string; name?: string; kind?: string; path?: string; fingerprint?: string }[];
      qualityReview?: { status?: string; score?: number; issues?: { id?: string; message?: string; suggestedFix?: string }[] };
      refinement?: { finalStatus?: string; attempts?: { attempt?: number; status?: string; outputArtifactId?: string }[]; reviews?: { status?: string; score?: number }[] };
      coaching?: {
        coachingTrace?: { agentRole?: string; lessonIds?: string[]; checklist?: string[]; activeFailureModes?: string[] }[];
        profiles?: { agentRole?: string; activeLessons?: { id?: string; failurePattern?: string; correctionRule?: string }[]; weakSkills?: string[] }[];
        skillOptimizations?: { agentRole?: string; skillId?: string; status?: string; changes?: string[] }[];
      };
      skillLab?: {
        activePromotions?: { candidateId?: string; targetAgentRoles?: string[]; targetSkillIds?: string[] }[];
        skillLabTrace?: { agentRole?: string; skillId?: string; activeCandidateIds?: string[]; status?: string }[];
      };
      workflowDetails?: { toolTrace?: { toolId?: string; status?: string; role?: string; error?: string }[] };
    };
  } | undefined;
  return {
    workflow: workflow?.workflow,
    missionPlan: workflow?.missionPlan,
    agents: workflow?.agentRuns ?? [],
    tools: workflow?.hiddenDetails?.workflowDetails?.toolTrace ?? [],
    executionTrace: workflow?.hiddenDetails?.executionTrace,
    missionArtifacts: workflow?.hiddenDetails?.artifacts ?? [],
    qualityReview: workflow?.hiddenDetails?.qualityReview,
    refinement: workflow?.hiddenDetails?.refinement,
    coaching: workflow?.hiddenDetails?.coaching,
    skillLab: workflow?.hiddenDetails?.skillLab,
  };
}

function diagnosticDetails(expert: CEOCurrentResult["expert"]) {
  return expert?.diagnostic as {
    providerUsed?: string;
    sourceType?: string;
    disabledSource?: string;
    route?: string;
    durationMs?: number;
    nvidiaConfigured?: boolean;
    nvidiaCalled?: boolean;
    nvidiaPurpose?: string;
    imageGeneratedByNvidia?: boolean;
    agentsActuallyCalled?: string[];
    artifactsCreated?: boolean;
    localRendererFile?: string;
    localRendererFunction?: string;
    displayDecision?: string;
  } | undefined;
}

export default function CEOResultDetails({
  result,
  mission,
  expertMode,
}: {
  result: CEOCurrentResult;
  mission: CEOCurrentMission | null;
  expertMode: boolean;
}) {
  const hasArtifacts = result.artifactPaths.length > 0;
  const workflow = workflowDetails(result.expert);
  const diagnostic = diagnosticDetails(result.expert);

  return (
    <div className="ceo-os-result-details" aria-label="Détails du résultat">
      {result.workspaceHref && (
        <div>
          <strong>Workspace</strong>
          <Link href={result.workspaceHref}>Ouvrir workspace</Link>
        </div>
      )}

      {(workflow.qualityReview || workflow.refinement) && (
        <div>
          <strong>Quality review</strong>
          {workflow.qualityReview && (
            <p>{workflow.qualityReview.status} · {workflow.qualityReview.score}/100</p>
          )}
          {workflow.qualityReview?.issues?.length ? (
            <ul>
              {workflow.qualityReview.issues.map((issue) => (
                <li key={issue.id ?? issue.message}>
                  <span>{issue.message}</span>
                  {issue.suggestedFix && <span>{issue.suggestedFix}</span>}
                </li>
              ))}
            </ul>
          ) : null}
          {workflow.refinement?.attempts?.length ? (
            <ul>
              {workflow.refinement.attempts.map((attempt) => (
                <li key={`${attempt.attempt}-${attempt.outputArtifactId}`}>
                  <span>Attempt {attempt.attempt}</span>
                  <span>{attempt.status}</span>
                  {attempt.outputArtifactId && <span>{attempt.outputArtifactId}</span>}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      {workflow.missionArtifacts.length > 0 && (
        <div>
          <strong>Artifacts runtime</strong>
          <ul>
            {workflow.missionArtifacts.map((artifact) => (
              <li key={artifact.id ?? artifact.path ?? artifact.name}>
                <FileText size={14} />
                <span>{artifact.name ?? artifact.path ?? artifact.kind}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasArtifacts ? (
        <div>
          <strong>Artifacts créés</strong>
          <ul>
            {result.artifactPaths.map((artifact) => (
              <li key={artifact}>
                <FileText size={14} />
                <span>{artifactName(artifact)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div>
          <strong>Aucun artifact réel créé</strong>
          <p>Le système ne marque pas cette mission comme prête tant qu’aucun fichier traçable n’existe.</p>
        </div>
      )}

      {(result.limitations?.length || result.launchInstructions?.length) && (
        <div>
          <strong>Notes</strong>
          {result.limitations?.map((item) => <p key={item}>{item}</p>)}
          {result.launchInstructions?.map((item) => <code key={item}>{item}</code>)}
        </div>
      )}

      {(workflow.agents.length > 0 || workflow.tools.length > 0) && (
        <div>
          <strong>Agents, skills et tools</strong>
          {workflow.workflow && <p>Workflow: {workflow.workflow}</p>}
          {workflow.executionTrace?.agentsCalled?.length ? <p>Agents: {workflow.executionTrace.agentsCalled.join(", ")}</p> : null}
          {workflow.executionTrace?.skillsCalled?.length ? <p>Skills: {workflow.executionTrace.skillsCalled.join(", ")}</p> : null}
          {workflow.executionTrace?.toolsCalled?.length ? <p>Tools: {workflow.executionTrace.toolsCalled.join(", ")}</p> : null}
          {workflow.executionTrace?.checkpoints?.length ? <p>Checkpoints: {workflow.executionTrace.checkpoints.length}</p> : null}
          {workflow.agents.length > 0 && (
            <ul>
              {workflow.agents.slice(0, 10).map((run, index) => (
                <li key={`${run.agentId}-${run.skillId}-${index}`}>
                  <span>{run.role ?? run.agentId}</span>
                  <span>{run.skillId}</span>
                  <span>{run.status}</span>
                </li>
              ))}
            </ul>
          )}
          {workflow.tools.length > 0 && (
            <ul>
              {workflow.tools.map((trace, index) => (
                <li key={`${trace.toolId}-${index}`}>
                  <span>{trace.role}</span>
                  <span>{trace.toolId}</span>
                  <span>{trace.status}</span>
                  {trace.error && <span>{trace.error}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {(workflow.coaching?.coachingTrace?.length || workflow.coaching?.profiles?.length || workflow.coaching?.skillOptimizations?.length) && (
        <div>
          <strong>Coaching agents</strong>
          {workflow.coaching.coachingTrace?.length ? <p>Lessons appliquées: {workflow.coaching.coachingTrace.flatMap((trace) => trace.lessonIds ?? []).length}</p> : null}
          {workflow.coaching.profiles?.length ? (
            <ul>
              {workflow.coaching.profiles.slice(0, 8).map((profile, index) => (
                <li key={`${profile.agentRole}-${index}`}>
                  <span>{profile.agentRole}</span>
                  <span>{profile.activeLessons?.map((lesson) => lesson.failurePattern ?? lesson.id).join(", ") || "baseline"}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {workflow.coaching.skillOptimizations?.length ? (
            <ul>
              {workflow.coaching.skillOptimizations.filter((item) => item.status !== "unchanged").slice(0, 8).map((optimization, index) => (
                <li key={`${optimization.agentRole}-${optimization.skillId}-${index}`}>
                  <span>{optimization.agentRole}</span>
                  <span>{optimization.skillId}</span>
                  <span>{optimization.status}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      {(workflow.skillLab?.activePromotions?.length || workflow.skillLab?.skillLabTrace?.some((trace) => trace.activeCandidateIds?.length)) && (
        <div>
          <strong>Skill Lab</strong>
          {workflow.skillLab.activePromotions?.length ? <p>Promotions actives: {workflow.skillLab.activePromotions.length}</p> : null}
          {workflow.skillLab.skillLabTrace?.some((trace) => trace.activeCandidateIds?.length) ? (
            <ul>
              {workflow.skillLab.skillLabTrace.filter((trace) => trace.activeCandidateIds?.length).slice(0, 8).map((trace, index) => (
                <li key={`${trace.agentRole}-${trace.skillId}-${index}`}>
                  <span>{trace.agentRole}</span>
                  <span>{trace.skillId}</span>
                  <span>{trace.activeCandidateIds?.join(", ")}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      {expertMode && (
        <div>
          <strong>Mode expert</strong>
          {diagnostic && (
            <div>
              <p>providerUsed: {diagnostic.providerUsed ?? "unknown"}</p>
              <p>sourceType: {diagnostic.sourceType ?? "unknown"}</p>
              <p>route: {diagnostic.route ?? "unknown"}</p>
              <p>durée: {diagnostic.durationMs ?? 0}ms</p>
              <p>NVIDIA appelé: {diagnostic.nvidiaCalled ? "oui" : "non"}</p>
              <p>NVIDIA image: {diagnostic.imageGeneratedByNvidia ? "oui" : "non"}</p>
              <p>agents appelés: {diagnostic.agentsActuallyCalled?.join(", ") || "aucun"}</p>
              <p>artifacts créés: {diagnostic.artifactsCreated ? "oui" : "non"}</p>
              {diagnostic.localRendererFile && <p>renderer local désactivé: {diagnostic.localRendererFile} · {diagnostic.localRendererFunction}</p>}
            </div>
          )}
          <pre>{JSON.stringify({
            mission,
            qualityScore: result.qualityScore,
            qualityStatus: result.qualityStatus,
            diagnostic,
            plan: result.expert?.plan,
            qualityReport: result.expert?.qualityReport,
            revisions: result.expert?.revisions,
            manifest: result.expert?.manifest,
            runtime: result.expert?.runtime,
            companyWorkflow: result.expert?.companyWorkflow,
          }, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
