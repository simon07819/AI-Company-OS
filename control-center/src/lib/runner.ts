import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const REPO_ROOT = path.resolve(process.cwd(), "..");
const PYTHON = "python3";
const TIMEOUT_MS = 60_000;
const PROJECT_RE = /^[a-zA-Z0-9_-]{1,64}$/;

export interface RunResult {
  ok: boolean;
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
}

type ActionDef = {
  script: string;
  buildArgs: (body: Record<string, string>) => string[];
};

const ACTIONS: Record<string, ActionDef> = {
  "create-product": {
    script: "create_product.py",
    buildArgs: (b) => ["--project", b.project, "--idea", b.idea ?? "New SaaS product"],
  },
  "init-monetization": {
    script: "init_monetization.py",
    buildArgs: (b) => ["--project", b.project],
  },
  "factory-cycle": {
    script: "factory_cycle.py",
    buildArgs: (b) => ["--project", b.project],
  },
  "auto-build": {
    script: "auto_build.py",
    buildArgs: (b) => ["--project", b.project],
  },
  "set-project-status": {
    script: "set_project_status.py",
    buildArgs: (b) => ["--project", b.project, "--status", b.status],
  },
  "validate-project": {
    script: "validate_product.py",
    buildArgs: (b) => ["--project", b.project, "--repo-path", b.repoPath ?? ".."],
  },
  "generate-roadmap": {
    script: "generate_roadmap.py",
    buildArgs: (b) => ["--project", b.project, "--repo-path", b.repoPath ?? ".."],
  },
  "roadmap-to-tasks": {
    script: "roadmap_to_tasks.py",
    buildArgs: (b) => ["--project", b.project, "--repo-path", b.repoPath ?? ".."],
  },
  "run-worker": {
    script: "run_worker.py",
    buildArgs: (b) => ["--project", b.project],
  },
};

const PROJECT_REQUIRED_ACTIONS = [
  "create-product", "init-monetization", "factory-cycle", "auto-build",
  "set-project-status", "validate-project", "generate-roadmap",
  "roadmap-to-tasks", "run-worker",
];

function validateBody(action: string, body: Record<string, string>): string | null {
  if (PROJECT_REQUIRED_ACTIONS.includes(action)) {
    if (!body.project || !PROJECT_RE.test(body.project)) return "Invalid project name";
  }
  if (action === "set-project-status") {
    if (!["active", "paused", "archived"].includes(body.status)) return "Invalid status value";
  }
  return null;
}

export async function runAction(
  action: string,
  body: Record<string, string>
): Promise<RunResult> {
  const def = ACTIONS[action];
  if (!def) {
    return { ok: false, command: action, stdout: "", stderr: "Unknown action", exitCode: 1 };
  }

  const validationError = validateBody(action, body);
  if (validationError) {
    return { ok: false, command: action, stdout: "", stderr: validationError, exitCode: 1 };
  }

  const script = path.join(REPO_ROOT, def.script);
  const args = def.buildArgs(body);
  const command = `python3 ${def.script} ${args.join(" ")}`;

  try {
    const { stdout, stderr } = await execFileAsync(PYTHON, [script, ...args], {
      cwd: REPO_ROOT,
      timeout: TIMEOUT_MS,
      env: { ...process.env, PYTHONUNBUFFERED: "1" },
    });
    return { ok: true, command, stdout: stdout.trim(), stderr: stderr.trim(), exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; code?: number; message?: string };
    return {
      ok: false,
      command,
      stdout: (e.stdout ?? "").trim(),
      stderr: (e.stderr ?? e.message ?? "Unknown error").trim(),
      exitCode: typeof e.code === "number" ? e.code : 1,
    };
  }
}
