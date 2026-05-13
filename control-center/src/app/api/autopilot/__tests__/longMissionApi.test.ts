import fs from "fs";
import os from "os";
import path from "path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let runtimeDir = "";

function request(url: string, body?: unknown) {
  return new NextRequest(url, {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json", host: "localhost" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function routes() {
  vi.resetModules();
  return {
    start: await import("@/app/api/autopilot/start/route"),
    step: await import("@/app/api/autopilot/step/route"),
    pause: await import("@/app/api/autopilot/pause/route"),
    resume: await import("@/app/api/autopilot/resume/route"),
    cancel: await import("@/app/api/autopilot/cancel/route"),
    status: await import("@/app/api/autopilot/status/[missionId]/route"),
  };
}

describe("autopilot long mission API", () => {
  beforeEach(() => {
    runtimeDir = fs.mkdtempSync(path.join(os.tmpdir(), "aios-autopilot-api-"));
    process.env.AI_COMPANY_RUNTIME_DIR = runtimeDir;
    delete process.env.AI_COMPANY_AUTH_TOKEN;
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.AI_COMPANY_RUNTIME_DIR;
    fs.rmSync(runtimeDir, { recursive: true, force: true });
  });

  it("start, step, pause, resume, cancel and status are traceable", async () => {
    const api = await routes();
    const startedResponse = await api.start.POST(request("http://localhost/api/autopilot/start", { command: "logo ekida long mission" }));
    const started = await startedResponse.json();

    expect(startedResponse.status).toBe(200);
    expect(started.mission.status).toBe("queued");
    expect(started.mission.missionId).toBeTruthy();

    const steppedResponse = await api.step.POST(request("http://localhost/api/autopilot/step", { missionId: started.mission.missionId, maxSteps: 1 }));
    const stepped = await steppedResponse.json();
    expect(stepped.mission.subtasks[0].status).toBe("completed");

    const pausedResponse = await api.pause.POST(request("http://localhost/api/autopilot/pause", { missionId: started.mission.missionId }));
    const paused = await pausedResponse.json();
    expect(paused.mission.status).toBe("paused");

    const resumedResponse = await api.resume.POST(request("http://localhost/api/autopilot/resume", { missionId: started.mission.missionId }));
    const resumed = await resumedResponse.json();
    expect(resumed.mission.resumedFromCheckpoint).toBeTruthy();

    const statusResponse = await api.status.GET(request(`http://localhost/api/autopilot/status/${started.mission.missionId}`), {
      params: { missionId: started.mission.missionId },
    });
    const status = await statusResponse.json();
    expect(status.mission.checkpoints.length).toBeGreaterThan(0);

    const canceledResponse = await api.cancel.POST(request("http://localhost/api/autopilot/cancel", { missionId: started.mission.missionId }));
    const canceled = await canceledResponse.json();
    expect(canceled.mission.status).toBe("canceled");
  });

  it("production without configured auth is blocked", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const api = await routes();

    const response = await api.start.POST(request("http://example.com/api/autopilot/start", { command: "private mission" }));
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.ok).toBe(false);
  });
});
