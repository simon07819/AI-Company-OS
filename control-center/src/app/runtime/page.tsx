"use client";

import { useEffect, useMemo, useState } from "react";
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
  Radio,
  RefreshCw,
  Server,
  Terminal,
  Timer,
  Zap,
} from "lucide-react";
import { AGENTS, type AgentDef } from "@/lib/agents";
import { useLogStream, type BackendLogEntry } from "@/hooks/useLogStream";
import { useSystemStatus } from "@/hooks/useSystemStatus";
import { useTasks, type TaskWithProject } from "@/hooks/useTasks";

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
  const statuses: InferenceStatus[] = ["streaming", "inference", "queued", "idle", "retrying", "inference"];
  return {
    status: statuses[index % statuses.length],
    task: task.title,
    project: task.project,
    model: NVIDIA_MODELS[index % NVIDIA_MODELS.length],
    latency: rand(580, 2100),
    progress: rand(28, 92),
    tokens: rand(900, 7400),
    queue: rand(0, 5),
    retries: index === 4 ? 1 : 0,
    lastEvent: STREAM_LINES[index % STREAM_LINES.length],
    elapsed: rand(7, 96),
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

export default function RuntimePage() {
  const { status } = useSystemStatus(3500);
  const { tasks, summary } = useTasks(undefined, 4500);
  const [tick, setTick] = useState(0);
  const [logs, setLogs] = useState<BackendLogEntry[]>([]);

  useLogStream((entry) => {
    setLogs((prev) => [entry, ...prev].slice(0, 16));
  }, true);

  useEffect(() => {
    const iv = setInterval(() => setTick((v) => v + 1), 1700);
    return () => clearInterval(iv);
  }, []);

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

  return (
    <main className="page runtime-page">
      <div className="page-header runtime-header">
        <div>
          <div className="runtime-eyebrow"><Cpu size={14} /> AI Runtime Center</div>
          <h1 className="page-title runtime-title">NVIDIA Agent Execution Center</h1>
          <p className="page-subtitle">Real-time visibility into agent inference, provider health, queues, retries and streaming output.</p>
        </div>
        <div className="page-actions runtime-actions">
          <div className="runtime-live-badge">
            <StatusPulse status={providerOnline ? "streaming" : "error"} />
          </div>
          <button className="btn btn-ghost" type="button">
            <RefreshCw size={14} /> Auto updating
          </button>
        </div>
      </div>

      <section className="runtime-top-grid">
        <MetricCard label="Active inferences" value={activeInferences} sub={`${runtimes.length} agents monitored`} icon={<Activity size={15} />} color="#76b900" />
        <MetricCard label="Avg latency" value={`${avgLatency}ms`} sub="mock plus live events" icon={<Gauge size={15} />} color="#60a5fa" />
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

      <section className="runtime-workspace">
        <div className="runtime-agent-section">
          <div className="section-header">
            <div>
              <h2>Agent Execution Cards</h2>
              <p className="runtime-section-sub">Active model, task, latency, progress and latest runtime event per agent.</p>
            </div>
          </div>
          <div className="runtime-agent-grid-cards">
            {AGENTS.map((agent, index) => (
              <AgentExecutionCard key={agent.id} agent={agent} runtime={runtimes[index]} index={index} />
            ))}
          </div>
        </div>

        <aside className="runtime-side-rail">
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
              {tasks.length === 0 && TASK_FALLBACKS.slice(0, 5).map((task, i) => (
                <div key={task} className="runtime-queue-item">
                  <span>{i + 1}</span>
                  <div>
                    <strong>{task}</strong>
                    <em>runtime mock · queued</em>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="runtime-rail-card">
            <div className="runtime-rail-title"><AlertTriangle size={14} /> Inference Errors</div>
            <div className="runtime-error-stat">{inferenceErrors}</div>
            <p className="runtime-section-sub">Recent failed or error-like events from the live backend stream.</p>
            <div className="runtime-error-row">
              <span>Retry budget</span>
              <strong>{runtimes.reduce((sum, r) => sum + r.retries, 0)} active</strong>
            </div>
          </div>

          <div className="runtime-rail-card">
            <div className="runtime-rail-title"><Radio size={14} /> Dynamic Logs</div>
            <div className="runtime-live-log">
              {visibleLogs.map((entry, i) => (
                <motion.div
                  key={`${entry.timestamp}-${i}`}
                  className="runtime-log-line"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <span>{entry.agent ?? "runtime"}</span>
                  <p>{entry.message ?? entry.event ?? entry.task_title ?? "inference event received"}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
