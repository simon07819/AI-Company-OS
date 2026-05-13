import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let runtimeDir = "";

async function executor() {
  vi.resetModules();
  return import("@/lib/autopilot/autopilotExecutor");
}

describe("autopilotExecutor long missions", () => {
  beforeEach(() => {
    runtimeDir = fs.mkdtempSync(path.join(os.tmpdir(), "aios-autopilot-"));
    process.env.AI_COMPANY_RUNTIME_DIR = runtimeDir;
    delete process.env.IMAGE_PROVIDER;
  });

  afterEach(() => {
    delete process.env.AI_COMPANY_RUNTIME_DIR;
    fs.rmSync(runtimeDir, { recursive: true, force: true });
  });

  it("start creates a persisted long mission with branding team subtasks", async () => {
    const { startLongMission, getLongMission } = await executor();

    const mission = startLongMission({ command: "je veux un logo ekida" });
    const persisted = getLongMission(mission.missionId);

    expect(persisted?.status).toBe("queued");
    expect(persisted?.type).toBe("logo");
    expect(persisted?.subtasks.map((task) => task.ownerAgent)).toEqual([
      "ceo",
      "planner",
      "brand_strategist",
      "creative_director",
      "visual_prompt_engineer",
      "nvidia_image_agent",
      "critic",
      "reviewer",
      "artifact_manager",
    ]);
    expect(persisted?.checkpoints.length).toBeGreaterThan(0);
  });

  it("step advances one subtask and writes a checkpoint", async () => {
    const { startLongMission, stepLongMission } = await executor();
    const mission = startLongMission({ command: "mission website longue" });

    const stepped = stepLongMission(mission.missionId);

    expect(stepped?.subtasks[0].status).toBe("completed");
    expect(stepped?.progressPercent).toBeGreaterThan(0);
    expect(stepped?.checkpoints.length).toBeGreaterThan(mission.checkpoints.length);
    expect(stepped?.agents.length).toBe(1);
  });

  it("pause blocks step until resume", async () => {
    const { startLongMission, pauseLongMission, stepLongMission, resumeLongMission } = await executor();
    const mission = startLongMission({ command: "mission produit longue" });
    const paused = pauseLongMission(mission.missionId);
    const skipped = stepLongMission(mission.missionId);

    expect(paused?.status).toBe("paused");
    expect(skipped?.subtasks.every((task) => task.status === "queued")).toBe(true);

    const resumed = resumeLongMission(mission.missionId);
    const stepped = stepLongMission(mission.missionId);

    expect(resumed?.resumedFromCheckpoint).toBeTruthy();
    expect(stepped?.subtasks[0].status).toBe("completed");
  });

  it("cancel stops further progress", async () => {
    const { startLongMission, cancelLongMission, stepLongMission } = await executor();
    const mission = startLongMission({ command: "mission strategy longue" });

    const canceled = cancelLongMission(mission.missionId);
    const afterStep = stepLongMission(mission.missionId);

    expect(canceled?.status).toBe("canceled");
    expect(afterStep?.status).toBe("canceled");
    expect(afterStep?.progressPercent).toBe(0);
  });

  it("max steps prevents unbounded execution", async () => {
    const { startLongMission, stepLongMission } = await executor();
    const mission = startLongMission({ command: "mission app longue" });

    const stepped = stepLongMission(mission.missionId, { maxSteps: 999 });

    expect(stepped?.agents.length).toBeLessThanOrEqual(stepped?.maxStepsPerRun ?? 10);
    expect(stepped?.events.some((event) => event.type === "autopilot_step")).toBe(true);
  });

  it("checkpoint allows mission reload and resume", async () => {
    const { startLongMission, stepLongMission, pauseLongMission, resumeLongMission, getLongMission } = await executor();
    const mission = startLongMission({ command: "mission copywriting longue" });
    const stepped = stepLongMission(mission.missionId);
    pauseLongMission(mission.missionId);

    const reloaded = getLongMission(mission.missionId);
    const resumed = resumeLongMission(mission.missionId);

    expect(reloaded?.checkpoints[0].id).toBeTruthy();
    expect(resumed?.resumedFromCheckpoint).toBe(reloaded?.checkpoints[0].id);
    expect(stepped?.missionId).toBe(mission.missionId);
  });
});
