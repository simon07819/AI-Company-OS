import { describe, expect, it, vi, beforeEach } from "vitest";
import path from "path";

// ─── Mock setup ──────────────────────────────────────────────────────────────

const workspaceFiles = new Map<string, string>();
const existingDirs = new Set<string>();

vi.mock("fs", () => ({
  default: {
    mkdirSync: vi.fn((p: string) => { existingDirs.add(p); }),
    existsSync: vi.fn((p: string) => {
      if (workspaceFiles.has(p)) return true;
      for (const key of workspaceFiles.keys()) {
        if (key.startsWith(p + "/") || key === p) return true;
      }
      return existingDirs.has(p);
    }),
    readFileSync: vi.fn((p: string) => workspaceFiles.get(p) ?? ""),
    writeFileSync: vi.fn((p: string, data: string) => { workspaceFiles.set(p, data); }),
    readdirSync: vi.fn((p: string, opts?: { withFileTypes?: boolean }) => {
      const prefix = p.endsWith("/") ? p : p + "/";
      const direct = new Map<string, boolean>();
      for (const key of workspaceFiles.keys()) {
        if (key.startsWith(prefix)) {
          const rest = key.slice(prefix.length);
          const segment = rest.split("/")[0];
          if (segment) direct.set(segment, rest.includes("/"));
        }
      }
      if (opts?.withFileTypes) {
        return Array.from(direct.entries()).map(([name, isDir]) => ({
          name,
          isDirectory: () => isDir,
          isFile: () => !isDir,
        }));
      }
      return Array.from(direct.keys());
    }),
    statSync: vi.fn((p: string) => ({
      size: workspaceFiles.get(p)?.length ?? 100,
      mtime: new Date(),
    })),
  },
  mkdirSync: vi.fn((p: string) => { existingDirs.add(p); }),
  existsSync: vi.fn((p: string) => {
    if (workspaceFiles.has(p)) return true;
    for (const key of workspaceFiles.keys()) {
      if (key.startsWith(p + "/") || key === p) return true;
    }
    return existingDirs.has(p);
  }),
  readFileSync: vi.fn((p: string) => workspaceFiles.get(p) ?? ""),
  writeFileSync: vi.fn((p: string, data: string) => { workspaceFiles.set(p, data); }),
  readdirSync: vi.fn((p: string, opts?: { withFileTypes?: boolean }) => {
    const prefix = p.endsWith("/") ? p : p + "/";
    const direct = new Map<string, boolean>();
    for (const key of workspaceFiles.keys()) {
      if (key.startsWith(prefix)) {
        const rest = key.slice(prefix.length);
        const segment = rest.split("/")[0];
        if (segment) direct.set(segment, rest.includes("/"));
      }
    }
    if (opts?.withFileTypes) {
      return Array.from(direct.entries()).map(([name, isDir]) => ({
        name,
        isDirectory: () => isDir,
        isFile: () => !isDir,
      }));
    }
    return Array.from(direct.keys());
  }),
  statSync: vi.fn((p: string) => ({
    size: workspaceFiles.get(p)?.length ?? 100,
    mtime: new Date(),
  })),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSession(missionType: string) {
  return {
    sessionId: `test-${missionType}`,
    projectName: `Test ${missionType}`,
    projectIdea: `A test project for ${missionType}. Built for modern teams.`,
    missionType,
    productType: null,
    template: null,
    stack: null,
    status: "running" as const,
    currentPhase: "idea" as const,
    progress: 0,
    assignedAgents: [],
    roadmap: [],
    tasks: [],
    logs: [],
    runtime: { status: "online" as const, provider: "NVIDIA API (Nemotron)", activeWorkers: 1, lastEvent: "" },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function workspaceDirForTest(sessionId: string): string {
  const repoRoot = path.resolve(process.cwd(), "..");
  return path.join(repoRoot, "generated", "autopilot-workspaces", sessionId);
}

function seedWorkspace(sessionId: string) {
  const base = workspaceDirForTest(sessionId);
  workspaceFiles.set(path.join(base, "README.md"), "# Workspace");
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("missionDeliverables", () => {
  beforeEach(() => {
    workspaceFiles.clear();
    existingDirs.clear();
    vi.clearAllMocks();
  });

  it("generates 3 files for website mission", async () => {
    const { generateMissionDeliverables } = await import("@/lib/missionDeliverables");
    const session = makeSession("website");
    seedWorkspace(session.sessionId);

    const paths = generateMissionDeliverables(session);

    expect(paths).toHaveLength(3);
    expect(paths).toContain("deliverables/website/site-map.md");
    expect(paths).toContain("deliverables/website/homepage-copy.md");
    expect(paths).toContain("deliverables/website/sections.md");
  });

  it("website generates site-map.md with correct content", async () => {
    const { generateMissionDeliverables } = await import("@/lib/missionDeliverables");
    const session = makeSession("website");
    seedWorkspace(session.sessionId);

    generateMissionDeliverables(session);

    const written = Array.from(workspaceFiles.entries()).find(([k]) => k.includes("site-map.md"));
    expect(written).toBeTruthy();
    expect(written![1]).toContain("# Site Map");
    expect(written![1]).toContain("## Pages");
  });

  it("flyer generates print-specs.md", async () => {
    const { generateMissionDeliverables } = await import("@/lib/missionDeliverables");
    const session = makeSession("flyer");
    seedWorkspace(session.sessionId);

    const paths = generateMissionDeliverables(session);

    expect(paths).toContain("deliverables/flyer/print-specs.md");
    const written = Array.from(workspaceFiles.entries()).find(([k]) => k.includes("print-specs.md") && k.includes("flyer"));
    expect(written).toBeTruthy();
    expect(written![1]).toContain("300 DPI");
    expect(written![1]).toContain("CMYK");
  });

  it("business_card generates card-copy.md", async () => {
    const { generateMissionDeliverables } = await import("@/lib/missionDeliverables");
    const session = makeSession("business_card");
    seedWorkspace(session.sessionId);

    const paths = generateMissionDeliverables(session);

    expect(paths).toContain("deliverables/business-card/card-copy.md");
    const written = Array.from(workspaceFiles.entries()).find(([k]) => k.includes("card-copy.md"));
    expect(written).toBeTruthy();
    expect(written![1]).toContain("Business Card Copy");
    expect(written![1]).toContain("Front Side");
  });

  it("ecommerce_store generates ads-plan.md", async () => {
    const { generateMissionDeliverables } = await import("@/lib/missionDeliverables");
    const session = makeSession("ecommerce_store");
    seedWorkspace(session.sessionId);

    const paths = generateMissionDeliverables(session);

    expect(paths).toContain("deliverables/ecommerce/ads-plan.md");
    const written = Array.from(workspaceFiles.entries()).find(([k]) => k.includes("ads-plan.md"));
    expect(written).toBeTruthy();
    expect(written![1]).toContain("Ads Plan");
    expect(written![1]).toContain("Google Shopping");
  });

  it("social_campaign generates all 3 deliverables", async () => {
    const { generateMissionDeliverables } = await import("@/lib/missionDeliverables");
    const session = makeSession("social_campaign");
    seedWorkspace(session.sessionId);

    const paths = generateMissionDeliverables(session);

    expect(paths).toContain("deliverables/social/content-calendar.md");
    expect(paths).toContain("deliverables/social/ad-copy.md");
    expect(paths).toContain("deliverables/social/post-ideas.md");
  });

  it("automation_workflow generates runbook.md", async () => {
    const { generateMissionDeliverables } = await import("@/lib/missionDeliverables");
    const session = makeSession("automation_workflow");
    seedWorkspace(session.sessionId);

    const paths = generateMissionDeliverables(session);

    expect(paths).toContain("deliverables/automation/runbook.md");
    const written = Array.from(workspaceFiles.entries()).find(([k]) => k.includes("runbook.md"));
    expect(written).toBeTruthy();
    expect(written![1]).toContain("Runbook");
    expect(written![1]).toContain("Emergency Stop");
  });

  it("saas_project returns empty (uses scaffold pipeline instead)", async () => {
    const { generateMissionDeliverables } = await import("@/lib/missionDeliverables");
    const session = makeSession("saas_project");
    seedWorkspace(session.sessionId);

    const paths = generateMissionDeliverables(session);

    expect(paths).toHaveLength(0);
  });

  it("returns empty if workspace does not exist", async () => {
    const { generateMissionDeliverables } = await import("@/lib/missionDeliverables");
    const session = makeSession("website");
    // do NOT seed workspace

    const paths = generateMissionDeliverables(session);

    expect(paths).toHaveLength(0);
  });

  it("missionDeliverablesExist returns false when no deliverables", async () => {
    const { missionDeliverablesExist } = await import("@/lib/missionDeliverables");
    const exists = missionDeliverablesExist("nonexistent-session");
    expect(exists).toBe(false);
  });

  it("missionDeliverablesExist returns true after generation", async () => {
    const { generateMissionDeliverables, missionDeliverablesExist } = await import("@/lib/missionDeliverables");
    const session = makeSession("branding_pack");
    seedWorkspace(session.sessionId);

    generateMissionDeliverables(session);

    expect(missionDeliverablesExist(session.sessionId)).toBe(true);
  });

  it("listMissionDeliverables returns empty for missing session", async () => {
    const { listMissionDeliverables } = await import("@/lib/missionDeliverables");
    const files = listMissionDeliverables("no-session");
    expect(files).toEqual([]);
  });

  it("listMissionDeliverables returns file list after generation", async () => {
    const { generateMissionDeliverables, listMissionDeliverables } = await import("@/lib/missionDeliverables");
    const session = makeSession("flyer");
    seedWorkspace(session.sessionId);

    generateMissionDeliverables(session);

    const files = listMissionDeliverables(session.sessionId);
    expect(files.length).toBeGreaterThan(0);
    expect(files.every((f) => f.path.startsWith("deliverables/"))).toBe(true);
    expect(files.some((f) => f.name === "print-specs.md")).toBe(true);
  });

  it("readDeliverableFile returns null for missing file", async () => {
    const { readDeliverableFile } = await import("@/lib/missionDeliverables");
    const result = readDeliverableFile("no-session", "deliverables/flyer/print-specs.md");
    expect(result).toBeNull();
  });

  it("readDeliverableFile rejects path traversal", async () => {
    const { readDeliverableFile } = await import("@/lib/missionDeliverables");
    const result = readDeliverableFile("test-session", "../../etc/passwd");
    expect(result).toBeNull();
  });
});
