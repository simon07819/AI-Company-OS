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
  mode: "nvidia" | "prototype";
  warnings: string[];
}

const PROTOTYPE_NOTICE = "mode prototype — NVIDIA indisponible, analyse déterministe locale";

function prototypeResponse(warnings: string[] = []): LlmResponse {
  return {
    ok: false,
    text: "",
    mode: "prototype",
    warnings: warnings.length > 0 ? warnings.map(sanitizeWarning) : [PROTOTYPE_NOTICE],
  };
}

function sanitizeWarning(value: string) {
  return value.replace(/NVIDIA_API_KEY/g, "NVIDIA credentials");
}

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

export async function generateWithLlm(request: LlmRequest): Promise<LlmResponse> {
  if (!process.env.NVIDIA_API_KEY || process.env.NVIDIA_API_KEY.length < 8) {
    return prototypeResponse();
  }

  try {
    const result = await runNvidiaAdapter(
      createSyntheticSession(request.purpose, request.user),
      createSyntheticTask(request),
    );

    if (!result.ok || result.mode !== "nvidia" || !result.output.trim()) {
      return prototypeResponse(result.warnings.length > 0 ? result.warnings : undefined);
    }

    return {
      ok: true,
      text: result.output,
      mode: "nvidia",
      warnings: result.warnings,
    };
  } catch {
    return prototypeResponse(["mode prototype — NVIDIA indisponible, fallback local activé"]);
  }
}

export function prototypeNotice() {
  return PROTOTYPE_NOTICE;
}
