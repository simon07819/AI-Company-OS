import { runNvidiaAdapter } from "@/lib/nvidiaAgentAdapter";
import type { AutopilotSession, AutopilotTask } from "@/lib/autopilotStore";

export interface LlmRequest {
  system: string;
  user: string;
  purpose: string;
}

export interface LlmResponse {
  ok: boolean;
  text: string;
  mode: "nvidia" | "deepinfra" | "prototype";
  warnings: string[];
}

const PROTOTYPE_NOTICE = "mode prototype — aucun provider LLM disponible, analyse déterministe locale";
const TIMEOUT_MS = 30_000;

function prototypeResponse(warnings: string[] = []): LlmResponse {
  return {
    ok: false,
    text: "",
    mode: "prototype",
    warnings: warnings.length > 0 ? warnings.map(sanitizeWarning) : [PROTOTYPE_NOTICE],
  };
}

function sanitizeWarning(value: string) {
  return value
    .replace(/NVIDIA_API_KEY/g, "NVIDIA credentials")
    .replace(/DEEPINFRA_API_KEY/g, "DeepInfra credentials");
}

// ─── Direct OpenAI-compatible text call ──────────────────────────────────

async function callOpenAICompatibleText(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  user: string,
): Promise<{ ok: boolean; text: string; error?: string }> {
  try {
    const endpoint = baseUrl.endsWith("/chat/completions")
      ? baseUrl
      : `${baseUrl.replace(/\/$/, "")}/chat/completions`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      return { ok: false, text: "", error: `HTTP ${res.status}: ${errorText.slice(0, 200)}` };
    }

    const payload = await res.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content ?? "";
    if (!content.trim()) return { ok: false, text: "", error: "Empty response" };
    return { ok: true, text: content };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return { ok: false, text: "", error: sanitizeWarning(message) };
  }
}

// ─── NVIDIA text (via existing adapter) ──────────────────────────────────

function createSyntheticSession(purpose: string, prompt: string): AutopilotSession {
  const now = new Date().toISOString();
  return {
    sessionId: `ceo-intel-${Date.now().toString(36)}`,
    projectName: purpose,
    projectIdea: prompt,
    productType: null,
    template: null,
    stack: null,
    missionType: "ceo_intelligence",
    businessStatus: "idea",
    loopMode: null,
    loopStatus: null,
    nextRunAt: null,
    lastRunAt: null,
    loopHistory: [],
    status: "running",
    currentPhase: "idea",
    progress: 0,
    assignedAgents: [{ agentId: "ceo", role: "CEO intelligence", status: "active", provider: "NVIDIA API" }],
    roadmap: [],
    tasks: [],
    logs: [],
    runtime: { status: "online", provider: "NVIDIA API", activeWorkers: 1, lastEvent: purpose },
    createdAt: now,
    updatedAt: now,
  };
}

function createSyntheticTask(request: LlmRequest): AutopilotTask {
  const now = new Date().toISOString();
  return {
    id: `ceo-intel-task-${Date.now().toString(36)}`,
    title: request.purpose,
    description: `${request.system}\n\n${request.user}`,
    phase: "idea",
    agent: "ceo",
    status: "running",
    priority: 1,
    progress: 0,
    dependencies: [],
    createdAt: now,
    updatedAt: now,
  };
}

async function tryNvidiaText(request: LlmRequest): Promise<LlmResponse | null> {
  if (!process.env.NVIDIA_API_KEY || process.env.NVIDIA_API_KEY.length < 8) return null;
  try {
    const result = await runNvidiaAdapter(
      createSyntheticSession(request.purpose, request.user),
      createSyntheticTask(request),
    );
    if (!result.ok || result.mode !== "nvidia" || !result.output.trim()) return null;
    return { ok: true, text: result.output, mode: "nvidia", warnings: result.warnings };
  } catch {
    return null;
  }
}

// ─── DeepInfra text (OpenAI-compatible) ──────────────────────────────────

function getDeepInfraTextModel(): string {
  return process.env.DEEPINFRA_TEXT_MODEL ?? "Qwen/Qwen2.5-72B-Instruct";
}

async function tryDeepInfraText(request: LlmRequest): Promise<LlmResponse | null> {
  const apiKey = process.env.DEEPINFRA_API_KEY;
  const baseUrl = process.env.DEEPINFRA_BASE_URL;
  if (!apiKey || !baseUrl) return null;
  const model = getDeepInfraTextModel();
  const result = await callOpenAICompatibleText(baseUrl, apiKey, model, request.system, request.user);
  if (!result.ok) return null;
  return { ok: true, text: result.text, mode: "deepinfra", warnings: [] };
}

// ─── Public API ───────────────────────────────────────────────────────────

export async function generateWithLlm(request: LlmRequest): Promise<LlmResponse> {
  // 1. Try NVIDIA text
  const nvidiaResult = await tryNvidiaText(request);
  if (nvidiaResult) return nvidiaResult;

  // 2. Try DeepInfra text as fallback
  const deepinfraResult = await tryDeepInfraText(request);
  if (deepinfraResult) return deepinfraResult;

  // 3. Prototype mode
  return prototypeResponse();
}

export function prototypeNotice() {
  return PROTOTYPE_NOTICE;
}

export function getActiveLlmProvider(): "nvidia" | "deepinfra" | "prototype" {
  if (process.env.NVIDIA_API_KEY && process.env.NVIDIA_API_KEY.length >= 8) return "nvidia";
  if (process.env.DEEPINFRA_API_KEY && process.env.DEEPINFRA_BASE_URL) return "deepinfra";
  return "prototype";
}
