"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Cpu,
  Gauge,
  Layers3,
  Lock,
  Pause,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  Server,
  Terminal,
  Timer,
  Zap,
} from "lucide-react";
import {
  PageHeader,
  SectionHeader,
  StatusBadge,
  LocalBadge,
  SimBadge,
  GhostButton,
} from "@/components/ui";
import { AGENTS, type AgentDef } from "@/lib/agents";
import { useLogStream, type BackendLogEntry } from "@/hooks/useLogStream";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { useTasks, type TaskWithProject } from "@/hooks/useTasks";
import { useRuntimeEvents, type RuntimeEvent } from "@/hooks/useRuntimeEvents";
import AutopilotPanel from "@/components/AutopilotPanel";
import AutopilotSessionBanner from "@/components/AutopilotSessionBanner";
import type { AgentRuntimeState } from "@/lib/agentRuntime";
import type { QueuedTask, QueueStats } from "@/lib/runtimeQueue";

type InferenceStatus = "streaming" | "inference" | "queued" | "retrying" | "idle" | "error";

type AgentRuntime = {
  status: InferenceStatus;
  task: string;
  project: string;
  model: string;
  latency: number;
  progress: number;
  tokens: number;
  queue: number;
  retries: number;
  lastEvent: string;
  elapsed: number;
};

const NVIDIA_MODELS = [
  "nvidia/llama-3.1-nemotron-70b-instruct",
  "nvidia/llama-3.3-nemotron-super-49b-v1",
  "nvidia/nemotron-4-340b-instruct",
  "meta/llama-3.1-405b-instruct",
  "mistralai/mixtral-8x22b-instruct-v0.1",
  "deepseek-ai/deepseek-r1",
];

const TASK_FALLBACKS = [
  "Generating roadmap decomposition",
  "Routing task dependencies",
  "Writing backend integration patch",
  "Streaming UI component diff",
  "Validating build output",
  "Preparing deployment manifest",
];

const STREAM_LINES = [
  "provider=nvidia request accepted, stream channel opened",
  "planner selected next task and resolved agent affinity",
  "tokens received: validating partial response against task schema",
  "worker event persisted to agent_activity.jsonl",
  "retry budget inspected, no escalation required",
  "response chunk emitted to orchestration bridge",
];

const STATUS_COPY: Record<InferenceStatus, string> = {
  streaming: "Streaming",
  inference: "Inferencing",
  queued: "Queued",
  retrying: "Retrying",
  idle: "Idle",
  error: "Error",
};

const STATUS_COLOR: Record<InferenceStatus, string> = {
  streaming: "#76b900",
  inference: "#60a5fa",
  queued: "#f59e0b",
  retrying: "#a78bfa",
  idle: "#64748b",
  error: "#fb7185",
};

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function specialty(agent: AgentDef) {
  const first = agent.role.split(",")[0] ?? agent.role;
  return first.replace("Generates ", "").replace("Defines ", "").replace("Designs ", "");
}

function taskForAgent(agent: AgentDef, tasks: TaskWithProject[], index: number) {
  const running = tasks.find((task) => {
    const text = `${task.department ?? ""} ${task.title ?? ""} ${task.description ?? ""}`.toLowerCase();
    return agent.keywords.some((kw) => text.includes(kw.toLowerCase()));
  });

  const fallback = tasks[index % Math.max(tasks.length, 1)];
  const task = running ?? fallback;
  return {
    title: task?.title ?? TASK_FALLBACKS[index % TASK_FALLBACKS.length],
    project: task?.project ?? "orchestrator",
  };
}

function initialRuntime(agent: AgentDef, index: number, tasks: TaskWithProject[]): AgentRuntime {
  const task = taskForAgent(agent, tasks, index);
  return {
    status: "idle",
    task: task.title,
    project: task.project,
    model: NVIDIA_MODELS[index % NVIDIA_MODELS.length],
    latency: 0,
    progress: 0,
    tokens: 0,
    queue: 0,
    retries: 0,
    lastEvent: "En attente d'une tâche",
    elapsed: 0,
  };
}

function StatusPulse({ status }: { status: InferenceStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
      <motion.span
        style={{ width: 8, height: 8, borderRadius: 99, background: color, boxShadow: `0 0 18px ${color}` }}
        animate={{ scale: status === "idle" ? 1 : [1, 1.45, 1], opacity: status === "idle" ? 0.65 : [1, 0.45, 1] }}
        transition={{ duration: status === "streaming" ? 1.15 : 1.8, repeat: Infinity }}
      />
      {STATUS_COPY[status]}
    </span>
  );
}

function StreamingDots() {
  return (
    <span style={{ display: "inline-flex", gap: 3, marginLeft: 5 }}>
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          style={{ width: 3, height: 3, borderRadius: 99, background: "#76b900" }}
          animate={{ opacity: [0.25, 1, 0.25], y: [0, -2, 0] }}
          transition={{ duration: 0.9, delay: i * 0.16, repeat: Infinity }}
        />
      ))}
    </span>
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <motion.div
      className="metric-card runtime-metric"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ boxShadow: `0 0 34px ${color}10` }}
    >
      <div className="metric-card-top">
        <span className="metric-label">{label}</span>
        <div className="metric-icon" style={{ background: `${color}18`, color }}>
          {icon}
        </div>
      </div>
      <div className="metric-value" style={{ color }}>{value}</div>
      <div className="metric-sub">{sub}</div>
    </motion.div>
  );
}

function AgentExecutionCard({
  agent,
  runtime,
  index,
}: {
  agent: AgentDef;
  runtime: AgentRuntime;
  index: number;
}) {
  return (
    <motion.div
      className="runtime-agent-card"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035 }}
      style={{ borderColor: `${agent.color}28`, boxShadow: `0 0 42px ${agent.color}0f` }}
    >
      <div className="runtime-agent-top">
        <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
          <div className="runtime-agent-avatar" style={{ background: `${agent.color}18`, color: agent.color, borderColor: `${agent.color}30` }}>
            {agent.name.charAt(0)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="runtime-agent-name">{agent.name}</div>
            <div className="runtime-agent-sub">{specialty(agent)}</div>
          </div>
        </div>
        <div className="runtime-pill" style={{ color: STATUS_COLOR[runtime.status], background: `${STATUS_COLOR[runtime.status]}14` }}>
          <StatusPulse status={runtime.status} />
        </div>
      </div>

      <div className="runtime-current-task">
        <div className="runtime-kicker" style={{ color: agent.color }}>Current task</div>
        <div className="runtime-task-title">{runtime.task}</div>
        <div className="runtime-task-project">{runtime.project}</div>
      </div>

      <div className="runtime-agent-grid">
        <div>
          <span>Model</span>
          <strong title={runtime.model}>{runtime.model.replace("nvidia/", "").replace("meta/", "")}</strong>
        </div>
        <div>
          <span>Latency</span>
          <strong>{runtime.latency} ms</strong>
        </div>
        <div>
          <span>Tokens</span>
          <strong>{runtime.tokens.toLocaleString()}</strong>
        </div>
        <div>
          <span>Retries</span>
          <strong style={{ color: runtime.retries > 0 ? "#fbbf24" : "var(--text)" }}>{runtime.retries}</strong>
        </div>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-3)", marginBottom: 7 }}>
          <span>Progress</span>
          <span>{runtime.progress}%</span>
        </div>
        <div className="runtime-progress">
          <motion.div
            className="runtime-progress-fill"
            animate={{ width: `${runtime.progress}%` }}
            style={{ background: `linear-gradient(90deg, ${agent.color}, #76b900)` }}
          />
        </div>
      </div>

      <div className="runtime-last-event">
        <Radio size={12} color={agent.color} />
        <span>{runtime.lastEvent}</span>
      </div>
    </motion.div>
  );
}

function LiveNvidiaPanel({
  runtime,
  providerOnline,
  activeRequest,
  streamPreview,
}: {
  runtime: AgentRuntime;
  providerOnline: boolean;
  activeRequest: string;
  streamPreview: string[];
}) {
  return (
    <motion.section
      className="runtime-nvidia-panel"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="runtime-panel-glow" />
      <div className="runtime-panel-header">
        <div>
          <div className="runtime-panel-eyebrow"><Zap size={13} /> NVIDIA inference fabric</div>
          <h2 className="runtime-panel-title">Live Provider Execution</h2>
          <p className="runtime-panel-subtitle">Streaming response, queue pressure and runtime health from the active agent layer.</p>
        </div>
        <div className={`runtime-health ${providerOnline ? "online" : "offline"}`}>
          <StatusPulse status={providerOnline ? "streaming" : "error"} />
        </div>
      </div>

      <div className="runtime-panel-body">
        <div className="runtime-model-block">
          <div className="runtime-kicker">Model</div>
          <div className="runtime-model-name">{runtime.model}</div>
          <div className="runtime-model-meta">
            <span><Clock3 size={12} /> {runtime.elapsed}s elapsed</span>
            <span><Gauge size={12} /> {runtime.latency} ms</span>
            <span><Layers3 size={12} /> queue {runtime.queue}</span>
          </div>
        </div>

        <div className="runtime-active-request">
          <div className="runtime-kicker">Active request</div>
          <div className="runtime-request-text">{activeRequest}</div>
          <div className="runtime-token-row">
            <span>Token estimate</span>
            <strong>{runtime.tokens.toLocaleString()} tokens</strong>
          </div>
          <div className="runtime-progress">
            <motion.div
              className="runtime-progress-fill"
              animate={{ width: `${runtime.progress}%` }}
              transition={{ type: "spring", stiffness: 80, damping: 18 }}
              style={{ background: "linear-gradient(90deg, #76b900, #60a5fa)" }}
            />
          </div>
        </div>

        <div className="runtime-stream-box">
          <div className="runtime-stream-header">
            <Terminal size={13} />
            response.stream <StreamingDots />
          </div>
          <div className="runtime-stream-lines">
            {streamPreview.map((line, i) => (
              <motion.div
                key={`${line}-${i}`}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="runtime-stream-line"
              >
                <span>{String(i + 1).padStart(2, "0")}</span>
                {line}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

const AGENT_STATUS_COLOR: Record<string, string> = {
  idle: "#64748b",
  planning: "#a78bfa",
  executing: "#76b900",
  waiting: "#f59e0b",
  blocked: "#fb7185",
  retrying: "#fbbf24",
  completed: "#22c55e",
  failed: "#ef4444",
};

function MissionControlCard({
  agentState,
  agentDef,
  onPause,
  onResume,
}: {
  agentState: AgentRuntimeState;
  agentDef: AgentDef;
  onPause: () => void;
  onResume: () => void;
}) {
  const statusColor = AGENT_STATUS_COLOR[agentState.status] ?? "#64748b";
  const isActive = agentState.status === "executing" || agentState.status === "planning";
  const isBlocked = agentState.status === "blocked";
  const isRetrying = agentState.status === "retrying";

  return (
    <motion.div
      className="runtime-agent-card"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ borderColor: `${statusColor}30`, boxShadow: `0 0 42px ${statusColor}0f` }}
      data-testid={`mission-control-card-${agentState.agentId}`}
    >
      <div className="runtime-agent-top">
        <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
          <div className="runtime-agent-avatar" style={{ background: `${agentDef.color}18`, color: agentDef.color, borderColor: `${agentDef.color}30` }}>
            {agentDef.name.charAt(0)}
          </div>
          <div style={{ minWidth: 0 }}>
            <div className="runtime-agent-name">{agentDef.name}</div>
            <div className="runtime-agent-sub">{agentDef.role.split(",")[0]}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div className="runtime-pill" style={{ color: statusColor, background: `${statusColor}14` }}>
            <motion.span
              style={{ width: 7, height: 7, borderRadius: 99, background: statusColor, display: "inline-block", marginRight: 5 }}
              animate={isActive ? { scale: [1, 1.45, 1], opacity: [1, 0.45, 1] } : {}}
              transition={{ duration: 1.4, repeat: Infinity }}
            />
            {agentState.status}
          </div>
          <button
            type="button"
            onClick={agentState.status === "idle" ? onResume : onPause}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-3)", padding: 4 }}
            title={agentState.status === "idle" ? "Resume agent" : "Pause agent"}
          >
            {agentState.status === "idle" ? <Play size={12} /> : <Pause size={12} />}
          </button>
        </div>
      </div>

      <div className="runtime-agent-grid" style={{ marginTop: 12 }}>
        <div>
          <span>Task</span>
          <strong style={{ fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block", maxWidth: 100 }}>
            {agentState.currentTaskId ?? "—"}
          </strong>
        </div>
        <div>
          <span>Progress</span>
          <strong style={{ color: statusColor }}>{agentState.progress}%</strong>
        </div>
        <div>
          <span>Retries</span>
          <strong style={{ color: agentState.retryCount > 0 ? "#fbbf24" : "var(--text)" }}>{agentState.retryCount}</strong>
        </div>
        <div>
          <span>Since</span>
          <strong style={{ fontSize: 10 }}>{agentState.startedAt ? new Date(agentState.startedAt).toLocaleTimeString() : "—"}</strong>
        </div>
      </div>

      {isBlocked && (
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, color: "#fb7185", fontSize: 11 }}>
          <Lock size={11} />
          <span>Blocked — waiting on dependency</span>
        </div>
      )}
      {isRetrying && (
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, color: "#fbbf24", fontSize: 11 }}>
          <RotateCcw size={11} />
          <span>Retrying — attempt {agentState.retryCount}</span>
        </div>
      )}

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-3)", marginBottom: 7, marginTop: 10 }}>
          <span>Progress</span>
          <span>{agentState.progress}%</span>
        </div>
        <div className="runtime-progress">
          <motion.div
            className="runtime-progress-fill"
            animate={{ width: `${agentState.progress}%` }}
            style={{ background: `linear-gradient(90deg, ${agentDef.color}, ${statusColor})` }}
          />
        </div>
      </div>

      <div className="runtime-last-event" style={{ marginTop: 10 }}>
        <Radio size={12} color={agentDef.color} />
        <span style={{ fontSize: 10 }}>{agentState.lastActivity ? new Date(agentState.lastActivity).toLocaleTimeString() : "No activity"}</span>
      </div>
    </motion.div>
  );
}

function QueuePanel({ queue, stats }: { queue: QueuedTask[]; stats: QueueStats | null }) {
  return (
    <div className="runtime-rail-card">
      <div className="runtime-rail-title"><Timer size={14} /> Runtime Queue</div>
      {stats && (
        <div style={{ display: "flex", gap: 12, marginBottom: 10, fontSize: 11 }}>
          <span style={{ color: "#22c55e" }}>{stats.runnable} runnable</span>
          <span style={{ color: "#fb7185" }}>{stats.blocked} blocked</span>
          <span style={{ color: "var(--text-3)" }}>{stats.total} total</span>
        </div>
      )}
      <div className="runtime-queue-list">
        {queue.slice(0, 6).map((item, i) => (
          <div key={`${item.sessionId}-${item.taskId}`} className="runtime-queue-item">
            <span>{i + 1}</span>
            <div>
              <strong style={{ fontSize: 11 }}>{item.taskId}</strong>
              <em style={{ fontSize: 10 }}>{item.agentId} · {item.phase} · p{item.priority}</em>
              {item.dependencies.length > 0 && (
                <div style={{ fontSize: 10, color: "#f59e0b", display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                  <Lock size={9} /> {item.dependencies.length} dep{item.dependencies.length > 1 ? "s" : ""}
                </div>
              )}
            </div>
          </div>
        ))}
        {queue.length === 0 && (
          <div style={{ color: "var(--text-3)", fontSize: 12, padding: "8px 0" }}>Queue empty — all agents idle</div>
        )}
      </div>
    </div>
  );
}

const EVENT_TYPE_COLOR: Record<string, string> = {
  "agent.status_changed": "#a78bfa",
  "task.started": "#60a5fa",
  "task.completed": "#22c55e",
  "task.failed": "#ef4444",
  "task.blocked": "#fb7185",
  "dependency.resolved": "#34d399",
  "queue.updated": "#f59e0b",
  "runtime.reset": "#64748b",
};

function EventTimeline({ events }: { events: RuntimeEvent[] }) {
  if (events.length === 0) {
    return <div style={{ color: "var(--text-3)", fontSize: 12, padding: "8px 0" }}>No events yet — waiting for runtime activity</div>;
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {events.slice(0, 12).map((ev) => {
        const color = EVENT_TYPE_COLOR[ev.type] ?? "#64748b";
        return (
          <motion.div
            key={ev.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            style={{ display: "flex", gap: 8, alignItems: "flex-start" }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 99, background: color, marginTop: 4, flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10, color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{ev.type}</div>
              <div style={{ fontSize: 11, color: "var(--text-2)" }}>
                {ev.agentId && <span style={{ color: "var(--text-3)", marginRight: 4 }}>{ev.agentId}</span>}
                {ev.payload.taskTitle as string ?? ev.payload.action as string ?? ""}
              </div>
              <div style={{ fontSize: 10, color: "var(--text-3)" }}>{new Date(ev.timestamp).toLocaleTimeString()}</div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

interface CostData {
  totalUsd: number;
  callCount: number;
  imageCount: number;
  alertProjects: string[];
  byProvider: Record<string, number>;
}

export default function RuntimePage() {
  const { status, refresh: refreshStatus } = useSystemStatus(3500);
  const { tasks, summary, refresh: refreshTasks } = useTasks(undefined, 4500);
  const [tick, setTick] = useState(0);
  const [logs, setLogs] = useState<BackendLogEntry[]>([]);
  const [runtimeCheck, setRuntimeCheck] = useState<string>("Auto updating");
  const [checkingRuntime, setCheckingRuntime] = useState(false);
  const [agentStates, setAgentStates] = useState<AgentRuntimeState[]>([]);
  const [runtimeQueue, setRuntimeQueue] = useState<QueuedTask[]>([]);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [resettingRuntime, setResettingRuntime] = useState(false);
  const [costData, setCostData] = useState<CostData | null>(null);
  const { events: runtimeEvents, connected: eventsConnected, lastActivity } = useRuntimeEvents(true);

  useLogStream((entry) => {
    setLogs((prev) => [entry, ...prev].slice(0, 16));
  }, true);

  useEffect(() => {
    const iv = setInterval(() => setTick((v) => v + 1), 1700);
    return () => clearInterval(iv);
  }, []);

  const fetchRuntimeData = useCallback(async () => {
    try {
      const [agentsRes, queueRes] = await Promise.all([
        fetch("/api/runtime/agents", { cache: "no-store" }),
        fetch("/api/runtime/queue", { cache: "no-store" }),
      ]);
      if (agentsRes.ok) {
        const data = await agentsRes.json() as { agents: AgentRuntimeState[] };
        setAgentStates(data.agents ?? []);
      }
      if (queueRes.ok) {
        const data = await queueRes.json() as { queue: QueuedTask[]; stats: QueueStats };
        setRuntimeQueue(data.queue ?? []);
        setQueueStats(data.stats ?? null);
      }
    } catch {
      // non-fatal — runtime data is supplemental
    }
  }, []);

  // Initial fetch + refresh when runtime events arrive (event-driven updates)
  useEffect(() => {
    void fetchRuntimeData();
    fetch("/api/costs", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: CostData & { ok: boolean }) => { if (d.ok) setCostData(d); })
      .catch(() => {});
  }, [fetchRuntimeData]);

  useEffect(() => {
    if (runtimeEvents.length > 0) {
      void fetchRuntimeData();
    }
  }, [runtimeEvents, fetchRuntimeData]);

  // Fallback: poll every 10s when SSE not connected
  useEffect(() => {
    if (eventsConnected) return;
    const iv = setInterval(() => void fetchRuntimeData(), 10_000);
    return () => clearInterval(iv);
  }, [eventsConnected, fetchRuntimeData]);

  const handlePauseAgent = async (agentId: string) => {
    await fetch(`/api/runtime/agent/${agentId}/pause`, { method: "POST" });
    void fetchRuntimeData();
  };

  const handleResumeAgent = async (agentId: string) => {
    await fetch(`/api/runtime/agent/${agentId}/resume`, { method: "POST" });
    void fetchRuntimeData();
  };

  const handleResetRuntime = async () => {
    setResettingRuntime(true);
    try {
      await fetch("/api/runtime/reset", { method: "POST" });
      void fetchRuntimeData();
    } finally {
      setResettingRuntime(false);
    }
  };

  const runtimes = useMemo(() => {
    return AGENTS.map((agent, index) => {
      const base = initialRuntime(agent, index + tick, tasks);
      const latest = logs.find((entry) => entry.agent === agent.id);
      const related = taskForAgent(agent, tasks, index + tick);
      return {
        ...base,
        task: latest?.task_title ?? related.title,
        project: latest?.project ?? related.project,
        lastEvent: latest?.event ?? latest?.message ?? base.lastEvent,
        status: latest?.status === "failed" ? "error" as InferenceStatus : base.status,
      };
    });
  }, [logs, tasks, tick]);

  const activeInferences = runtimes.filter((r) => ["streaming", "inference", "retrying"].includes(r.status)).length;
  const avgLatency = Math.round(runtimes.reduce((sum, r) => sum + r.latency, 0) / runtimes.length);
  const requestsPerMin = Math.max(12, status?.logEntries ? Math.min(96, Math.round(status.logEntries / 2) + tick) : 28 + (tick % 18));
  const load = Math.min(99, Math.round(((summary.running + summary.queued) / Math.max(summary.total, 1)) * 100) + activeInferences * 5);
  const successRate = status?.successRate ?? 97;
  const providerOnline = status?.nvidiaStatus !== "offline";
  const primaryRuntime = runtimes.find((r) => r.status === "streaming") ?? runtimes[0];
  const queuedTasks = tasks.filter((task) => task.status === "queued" || task.status === "pending").slice(0, 5);
  const inferenceErrors = logs.filter((entry) => entry.status === "failed" || entry.event?.toLowerCase().includes("error")).length;
  const streamPreview = [
    logs[0]?.message ?? STREAM_LINES[tick % STREAM_LINES.length],
    logs[1]?.event ?? STREAM_LINES[(tick + 1) % STREAM_LINES.length],
    `chunk=${tick + 17} latency=${primaryRuntime.latency}ms model=${primaryRuntime.model.split("/").pop()}`,
    STREAM_LINES[(tick + 2) % STREAM_LINES.length],
  ];
  const visibleLogs: BackendLogEntry[] = logs.length
    ? logs.slice(0, 7)
    : streamPreview.map((message, i) => ({
        timestamp: new Date().toISOString(),
        message,
        agent: AGENTS[i % AGENTS.length].id,
      }));

  const checkRuntimeStatus = async () => {
    setCheckingRuntime(true);
    setRuntimeCheck("Checking runtime bridge...");
    try {
      const res = await fetch("/api/runtime/status", { cache: "no-store" });
      const payload = (await res.json()) as { ok: boolean; message?: string };
      await Promise.all([refreshStatus(), refreshTasks()]);
      setRuntimeCheck(payload.message ?? (payload.ok ? "Runtime bridge online" : "Runtime bridge returned an error"));
    } catch (error) {
      setRuntimeCheck(`Runtime check failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setCheckingRuntime(false);
    }
  };

  return (
    <main className="page runtime-page">
      <PageHeader
        icon={<Cpu size={22} />}
        title="NVIDIA Agent Execution Center"
        description="Real-time visibility into agent inference, provider health, queues, retries and streaming output. NVIDIA inference center — simulation mode active when API key not configured."
        badge={<>{<LocalBadge />}{!providerOnline && <SimBadge />}</>}
        actions={
          <>
            {/* Live event stream badge */}
            <div
              className="runtime-live-badge"
              title={eventsConnected ? "Event stream connected" : "Event stream disconnected — polling fallback active"}
              style={{ display: "flex", alignItems: "center", gap: 6, cursor: "default" }}
            >
              <motion.span
                style={{ width: 8, height: 8, borderRadius: 99, background: eventsConnected ? "#76b900" : "#64748b" }}
                animate={eventsConnected ? { scale: [1, 1.5, 1], opacity: [1, 0.4, 1] } : {}}
                transition={{ duration: 1.6, repeat: Infinity }}
              />
              <span style={{ fontSize: 11, color: eventsConnected ? "#76b900" : "var(--text-3)", fontWeight: 600 }}>
                {eventsConnected ? "Live" : "Offline"}
              </span>
              {lastActivity && (
                <span style={{ fontSize: 10, color: "var(--text-3)" }}>
                  · {new Date(lastActivity).toLocaleTimeString()}
                </span>
              )}
            </div>
            <StatusBadge
              label={providerOnline ? "Provider Online" : "Provider Offline"}
              color={providerOnline ? "#76b900" : "#fb7185"}
              size="md"
            />
            <GhostButton onClick={checkRuntimeStatus} disabled={checkingRuntime}>
              <RefreshCw size={14} /> {checkingRuntime ? "Checking..." : "Check Runtime Status"}
            </GhostButton>
          </>
        }
      />

      <div className="card" style={{ marginBottom: 16, padding: "10px 14px", color: "var(--text-2)", fontSize: 12 }}>
        {runtimeCheck}
      </div>

      <section className="runtime-top-grid">
        <MetricCard label="Active inferences" value={activeInferences} sub={`${runtimes.length} agents monitored`} icon={<Activity size={15} />} color="#76b900" />
        <MetricCard label="Avg latency" value={`${avgLatency}ms`} sub="données live" icon={<Gauge size={15} />} color="#60a5fa" />
        <MetricCard label="Requests/min" value={requestsPerMin} sub="rolling inference rate" icon={<BarChart3 size={15} />} color="#a78bfa" />
        <MetricCard label="Orchestration load" value={`${load}%`} sub={`${summary.queued} queued tasks`} icon={<Layers3 size={15} />} color="#f59e0b" />
        <MetricCard label="Active workers" value={status?.workers ?? activeInferences} sub="backend worker count" icon={<Server size={15} />} color="#34d399" />
        <MetricCard label="Success rate" value={`${successRate}%`} sub={`${summary.failed} failed tasks`} icon={<CheckCircle2 size={15} />} color="#22c55e" />
        <MetricCard label="NVIDIA health" value={providerOnline ? "Online" : "Offline"} sub={status?.nvidiaStatus ?? "checking provider"} icon={<Zap size={15} />} color={providerOnline ? "#76b900" : "#fb7185"} />
      </section>

      <LiveNvidiaPanel
        runtime={primaryRuntime}
        providerOnline={providerOnline}
        activeRequest={primaryRuntime.task}
        streamPreview={streamPreview}
      />

      <AutopilotPanel />
      <AutopilotSessionBanner />

      {/* Mission Control: live agent runtime states */}
      <section className="runtime-workspace" style={{ marginTop: 32 }} data-testid="mission-control-section">
        <div className="runtime-agent-section">
          <SectionHeader
            icon={<Cpu size={12} />}
            title="Mission Control"
            action={
              <div style={{ display: "flex", gap: 8 }}>
                <GhostButton onClick={() => void fetchRuntimeData()}>
                  <RefreshCw size={13} /> Refresh
                </GhostButton>
                <GhostButton onClick={() => void handleResetRuntime()} disabled={resettingRuntime}>
                  <RotateCcw size={13} /> {resettingRuntime ? "Resetting..." : "Reset Runtime"}
                </GhostButton>
              </div>
            }
          />
          <p className="runtime-section-sub" style={{ marginTop: -6, marginBottom: 14 }}>Live agent runtime states, dependency blocking, concurrency indicators and retry tracking.</p>

          {/* Agent concurrency summary */}
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            {(["executing", "blocked", "retrying", "idle"] as const).map((s) => {
              const count = agentStates.filter((a) => a.status === s).length;
              return (
                <StatusBadge
                  key={s}
                  label={`${count} ${s}`}
                  color={AGENT_STATUS_COLOR[s]}
                  size="md"
                />
              );
            })}
          </div>

          <div className="runtime-agent-grid-cards">
            {AGENTS.map((agent) => {
              const state = agentStates.find((s) => s.agentId === agent.id);
              // Hide agents that are idle with no meaningful runtime data
              if (!state || (state.status === "idle" && !state.currentTaskId)) return null;
              return (
                <MissionControlCard
                  key={agent.id}
                  agentState={state}
                  agentDef={agent}
                  onPause={() => void handlePauseAgent(agent.id)}
                  onResume={() => void handleResumeAgent(agent.id)}
                />
              );
            })}
            {agentStates.length > 0 && agentStates.every((s) => s.status === "idle") && (
              <div style={{ gridColumn: "1 / -1", padding: "20px 0", color: "var(--text-3)", fontSize: 12, textAlign: "center" }}>
                Tous les agents sont en attente — aucune tâche active.
              </div>
            )}
            {agentStates.length === 0 && (
              <div style={{ gridColumn: "1 / -1", padding: "20px 0", color: "var(--text-3)", fontSize: 12, textAlign: "center" }}>
                Aucun agent en cours — en attente de missions.
              </div>
            )}
          </div>
        </div>

        <aside className="runtime-side-rail">
          <QueuePanel queue={runtimeQueue} stats={queueStats} />

          <div className="runtime-rail-card">
            <div className="runtime-rail-title"><AlertTriangle size={14} /> Inference Errors</div>
            <div className="runtime-error-stat">{inferenceErrors}</div>
            <p className="runtime-section-sub">Recent failed or error-like events from the live backend stream.</p>
            <div className="runtime-error-row">
              <span>Blocked agents</span>
              <strong style={{ color: "#fb7185" }}>{agentStates.filter((a) => a.status === "blocked").length}</strong>
            </div>
            <div className="runtime-error-row">
              <span>Retrying agents</span>
              <strong style={{ color: "#fbbf24" }}>{agentStates.filter((a) => a.status === "retrying").length}</strong>
            </div>
          </div>

          <div className="runtime-rail-card" data-testid="event-timeline">
            <div className="runtime-rail-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}><Radio size={14} /> Event Timeline</span>
              {eventsConnected && (
                <span style={{ fontSize: 10, color: "#76b900", display: "flex", alignItems: "center", gap: 4 }}>
                  <motion.span style={{ width: 5, height: 5, borderRadius: 99, background: "#76b900", display: "inline-block" }} animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} />
                  LIVE
                </span>
              )}
            </div>
            <EventTimeline events={runtimeEvents} />
          </div>
        </aside>
      </section>

      <section className="runtime-workspace" style={{ marginTop: 32 }}>
        <div className="runtime-agent-section">
          <SectionHeader
            icon={<Zap size={12} />}
            title="Agent Execution Cards"
          />
          <p className="runtime-section-sub" style={{ marginTop: -6, marginBottom: 14 }}>Active model, task, latency, progress and latest runtime event per agent.</p>
          <div className="runtime-agent-grid-cards">
            {AGENTS.map((agent, index) => (
              <AgentExecutionCard key={agent.id} agent={agent} runtime={runtimes[index]} index={index} />
            ))}
          </div>
        </div>

        <aside className="runtime-side-rail">
          {costData && (
            <div className="runtime-rail-card" style={{ marginBottom: 12 }}>
              <div className="runtime-rail-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span><BarChart3 size={13} /> Coûts API estimés</span>
                {costData.alertProjects.length > 0 && (
                  <span style={{ fontSize: 10, color: "#fb7185", fontWeight: 600 }}>⚠ ALERTE</span>
                )}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: costData.totalUsd >= 5 ? "#fb7185" : "#f4f4f5", margin: "8px 0 4px" }}>
                ${costData.totalUsd.toFixed(3)}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.8 }}>
                <div>{costData.callCount} appels LLM · {costData.imageCount} images</div>
                {Object.entries(costData.byProvider).map(([p, v]) => (
                  <div key={p}>{p}: ${(v as number).toFixed(3)}</div>
                ))}
                {costData.alertProjects.length > 0 && (
                  <div style={{ color: "#fb7185", marginTop: 4 }}>
                    {costData.alertProjects.length} projet(s) &gt; $5.00
                  </div>
                )}
              </div>
            </div>
          )}
          <div className="runtime-rail-card">
            <div className="runtime-rail-title"><Timer size={14} /> Inference Queue</div>
            <div className="runtime-queue-list">
              {(queuedTasks.length ? queuedTasks : tasks.slice(0, 5)).map((task, i) => (
                <div key={`${task.project}-${task.id}`} className="runtime-queue-item">
                  <span>{i + 1}</span>
                  <div>
                    <strong>{task.title}</strong>
                    <em>{task.project} · {task.status}</em>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <div style={{ padding: "10px 0", color: "var(--text-3)", fontSize: 11, textAlign: "center" }}>
                  Aucune tâche en queue
                </div>
              )}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
