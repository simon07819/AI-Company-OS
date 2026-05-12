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
      workflowDetails?: { toolTrace?: { toolId?: string; status?: string; role?: string; error?: string }[] };
    };
  } | undefined;
  return {
    workflow: workflow?.workflow,
    missionPlan: workflow?.missionPlan,
    agents: workflow?.agentRuns ?? [],
    tools: workflow?.hiddenDetails?.workflowDetails?.toolTrace ?? [],
    executionTrace: workflow?.hiddenDetails?.executionTrace,
  };
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

  return (
    <div className="ceo-os-result-details" aria-label="Détails du résultat">
      {result.workspaceHref && (
        <div>
          <strong>Workspace</strong>
          <Link href={result.workspaceHref}>Ouvrir workspace</Link>
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

      {expertMode && (
        <div>
          <strong>Mode expert</strong>
          <pre>{JSON.stringify({
            mission,
            qualityScore: result.qualityScore,
            qualityStatus: result.qualityStatus,
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
