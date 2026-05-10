import { getAgentById } from "./agents";
import type { AutopilotSession, AutopilotTask } from "./autopilotStore";

export interface AdapterResult {
  ok: boolean;
  agentId: string;
  taskId: string;
  output: string;
  mode: "nvidia" | "simulation";
  tokensUsed?: number;
  durationMs: number;
  warnings: string[];
}

const NVIDIA_API_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const TIMEOUT_MS = 30_000;

function getNvidiaModel(): string {
  return process.env.NVIDIA_MODEL ?? "nvidia/llama-3.1-nemotron-70b-instruct";
}

function buildSystemPrompt(agentId: string): string {
  const agent = getAgentById(agentId);
  if (!agent) return "You are an AI agent for a software company.";
  return [
    `You are ${agent.name}.`,
    agent.role + ".",
    `Responsibilities: ${agent.responsibilities.join("; ")}.`,
    "Be concise, structured, and output professional-quality Markdown content.",
  ].join(" ");
}

function buildUserPrompt(session: AutopilotSession, task: AutopilotTask): string {
  return [
    `Project: ${session.projectName}`,
    `Mission type: ${session.missionType}`,
    `Project idea: ${session.projectIdea}`,
    `Current phase: ${task.phase}`,
    `Task: ${task.title}`,
    `Description: ${task.description}`,
    `Priority: P${task.priority}`,
    "",
    "Generate a detailed, professional output for this task. Format your response in Markdown.",
  ].join("\n");
}

function buildSimulationOutput(agentId: string, task: AutopilotTask): string {
  return [
    `# ${task.title}`,
    "",
    `**Agent:** \`${agentId}\`  `,
    `**Phase:** ${task.phase}  `,
    `**Mode:** Simulation fallback`,
    "",
    "## Summary",
    "",
    `This task was processed in simulation mode. Configure \`NVIDIA_API_KEY\` to enable`,
    `real inference via the NVIDIA inference API.`,
    "",
    "## Output",
    "",
    `Task "${task.title}" processed by the local simulation engine.`,
    "All acceptance criteria are considered met for this simulation run.",
  ].join("\n");
}

export async function runNvidiaAdapter(
  session: AutopilotSession,
  task: AutopilotTask
): Promise<AdapterResult> {
  const started = Date.now();
  const agentId = task.agent;
  const taskId = task.id;
  const warnings: string[] = [];

  const apiKey = process.env.NVIDIA_API_KEY ?? "";

  if (!apiKey || apiKey.length < 8) {
    return {
      ok: true,
      agentId,
      taskId,
      output: buildSimulationOutput(agentId, task),
      mode: "simulation",
      durationMs: Date.now() - started,
      warnings: ["NVIDIA_API_KEY not configured — using simulation fallback"],
    };
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(NVIDIA_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: getNvidiaModel(),
        messages: [
          { role: "system", content: buildSystemPrompt(agentId) },
          { role: "user", content: buildUserPrompt(session, task) },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      // Never include the API key in warnings
      warnings.push(
        `NVIDIA API returned HTTP ${res.status} — falling back to simulation`
      );
      return {
        ok: true,
        agentId,
        taskId,
        output: buildSimulationOutput(agentId, task),
        mode: "simulation",
        durationMs: Date.now() - started,
        warnings,
      };
    }

    const payload = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };

    const content = payload.choices?.[0]?.message?.content ?? "";
    const tokensUsed = payload.usage?.total_tokens;

    if (!content) {
      warnings.push("NVIDIA API returned empty content — falling back to simulation");
      return {
        ok: true,
        agentId,
        taskId,
        output: buildSimulationOutput(agentId, task),
        mode: "simulation",
        durationMs: Date.now() - started,
        warnings,
      };
    }

    return {
      ok: true,
      agentId,
      taskId,
      output: content,
      mode: "nvidia",
      tokensUsed,
      durationMs: Date.now() - started,
      warnings,
    };
  } catch (err) {
    // Never log the API key — only the sanitized error message
    const message = err instanceof Error ? err.message : "unknown error";
    warnings.push(
      `NVIDIA API call failed (${message}) — falling back to simulation`
    );
    return {
      ok: true,
      agentId,
      taskId,
      output: buildSimulationOutput(agentId, task),
      mode: "simulation",
      durationMs: Date.now() - started,
      warnings,
    };
  }
}
