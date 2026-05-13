"use client";

export interface TeamTimelineRun {
  agentId?: string;
  name?: string;
  role?: string;
  providerUsed?: string;
  durationMs?: number;
  confidence?: number;
  output?: {
    summary?: string;
    issues?: string[];
    decisions?: string[];
  };
}

export interface TeamTimelineRetry {
  attempt?: number;
  issues?: string[];
  changedDirection?: string;
}

function agentLabel(run: TeamTimelineRun) {
  return run.name ?? run.agentId ?? "Agent";
}

function agentStatus(run: TeamTimelineRun) {
  return run.output?.issues?.length ? "blocked" : "completed";
}

function outputSummary(run: TeamTimelineRun) {
  if (run.output?.summary) return run.output.summary;
  if (run.output?.decisions?.length) return run.output.decisions[0];
  if (run.output?.issues?.length) return run.output.issues.join(", ");
  return "Output structuré disponible.";
}

export default function TeamTimeline({
  runs,
  retries = [],
  compact = false,
}: {
  runs: TeamTimelineRun[];
  retries?: TeamTimelineRetry[];
  compact?: boolean;
}) {
  return (
    <div className={compact ? "ceo-team-timeline compact" : "ceo-team-timeline"} data-testid="ceo-team-timeline">
      <div className="ceo-team-timeline-head">
        <strong>Timeline équipe</strong>
        {retries.length ? <span>{retries.length} retry</span> : <span>review complète</span>}
      </div>
      <ol>
        {runs.map((run, index) => {
          const retry = run.agentId === "critic" ? retries[0] : undefined;
          return (
            <li key={`${run.agentId ?? run.name}-${index}`}>
              <div className="ceo-team-timeline-main">
                <span>{agentLabel(run)}</span>
                <small>{run.role ?? run.agentId ?? "role inconnu"}</small>
              </div>
              <div className="ceo-team-timeline-meta">
                <span>{agentStatus(run)}</span>
                <span>{run.durationMs ?? 0}ms</span>
                <span>providerUsed: {run.providerUsed ?? "none"}</span>
                {typeof run.confidence === "number" && <span>{Math.round(run.confidence * 100)}%</span>}
              </div>
              <p>{outputSummary(run)}</p>
              {retry && (
                <p className="ceo-team-timeline-retry">
                  retry {retry.attempt ?? 1}: {retry.changedDirection ?? retry.issues?.join(", ") ?? "direction ajustée"}
                </p>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
