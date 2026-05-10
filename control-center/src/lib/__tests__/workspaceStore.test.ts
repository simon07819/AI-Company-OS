import { describe, expect, it, vi, beforeAll } from "vitest";

// ─── Mock setup ──────────────────────────────────────────────────────────────

const writtenFiles = new Map<string, string>();

function mockWriteFileSync(p: string, data: string) {
  writtenFiles.set(p, data);
}

function mockExistsSync(p: string) {
  for (const key of writtenFiles.keys()) {
    if (p === key || key.startsWith(p + "/")) return true;
  }
  return false;
}

function mockReadFileSync(p: string) {
  return writtenFiles.get(p) ?? "[]";
}

vi.mock("fs", () => ({
  default: {
    mkdirSync: vi.fn(),
    existsSync: vi.fn((p: string) => mockExistsSync(p)),
    readFileSync: vi.fn((p: string) => mockReadFileSync(p)),
    writeFileSync: vi.fn((p: string, data: string) => mockWriteFileSync(p, data)),
    readdirSync: vi.fn(() => []),
    statSync: vi.fn(() => ({ size: 100, mtime: new Date() })),
  },
  mkdirSync: vi.fn(),
  existsSync: vi.fn((p: string) => mockExistsSync(p)),
  readFileSync: vi.fn((p: string) => mockReadFileSync(p)),
  writeFileSync: vi.fn((p: string, data: string) => mockWriteFileSync(p, data)),
  readdirSync: vi.fn(() => []),
  statSync: vi.fn(() => ({ size: 100, mtime: new Date() })),
}));

describe("workspaceStore", () => {
  beforeAll(() => {
    writtenFiles.clear();
  });

  it("createWorkspaceForSession creates base files", async () => {
    const { createWorkspaceForSession } = await import("@/lib/workspaceStore");

    const session = {
      sessionId: "ap-test-ws",
      projectName: "TestCRM",
      projectIdea: "A CRM for restaurants",
      template: "b2b-saas",
      stack: "nextjs-prisma",
      status: "running" as const,
      currentPhase: "idea" as const,
      progress: 0,
      assignedAgents: [],
      roadmap: ["Validate market", "Build MVP"],
      tasks: [
        { id: "AP-001", title: "Analyze idea", description: "Test", phase: "idea", agent: "product_agent", status: "running" as const, priority: 1, progress: 10, dependencies: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      ],
      logs: [{ id: "log-1", timestamp: new Date().toISOString(), level: "info" as const, agent: "product_agent", message: "Started", source: "autopilot" }],
      runtime: { status: "online", provider: "NVIDIA API", activeWorkers: 1, lastEvent: "Started" },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      productType: null,
    };

    createWorkspaceForSession(session);

    const paths = [...writtenFiles.keys()];

    expect(paths.some((p) => p.endsWith("README.md"))).toBe(true);
    expect(paths.some((p) => p.endsWith("roadmap.md"))).toBe(true);
    expect(paths.some((p) => p.endsWith("tasks.json"))).toBe(true);
    expect(paths.some((p) => p.endsWith("logs.md"))).toBe(true);
    expect(paths.some((p) => p.includes("phases/01-idea-analysis.md"))).toBe(true);
    expect(paths.some((p) => p.includes("phases/08-runtime-monitoring.md"))).toBe(true);
  });

  it("createWorkspaceForSession writes correct README content", async () => {
    const readme = [...writtenFiles.entries()].find(([p]) => p.endsWith("README.md"));
    expect(readme).toBeDefined();
    expect(readme![1]).toContain("TestCRM");
    expect(readme![1]).toContain("A CRM for restaurants");
  });

  it("writeWorkspaceFile writes content and can be read back", async () => {
    const { writeWorkspaceFile, readWorkspaceFile } = await import("@/lib/workspaceStore");

    writeWorkspaceFile("ap-ws-test", "src/app/page.tsx", "export default function Page() {}");
    const content = readWorkspaceFile("ap-ws-test", "src/app/page.tsx");
    expect(content).toBe("export default function Page() {}");
  });

  it("writeWorkspaceFile rejects path traversal", async () => {
    const { writeWorkspaceFile } = await import("@/lib/workspaceStore");

    const result = writeWorkspaceFile("ap-traversal", "../../etc/passwd", "hacked");
    expect(result).toBe(false);
  });

  it("readWorkspaceFile rejects path traversal", async () => {
    const { readWorkspaceFile } = await import("@/lib/workspaceStore");

    const content = readWorkspaceFile("ap-traversal-read", "../../etc/passwd");
    expect(content).toBeNull();
  });

  it("getWorkspaceSummary returns correct structure for nonexistent workspace", async () => {
    const { getWorkspaceSummary } = await import("@/lib/workspaceStore");

    const summary = getWorkspaceSummary("ap-nonexistent-xyz");
    expect(summary.exists).toBe(false);
    expect(summary.fileCount).toBe(0);
  });

  it("updateWorkspaceAfterStep writes tasks, logs and phase file", async () => {
    const { updateWorkspaceAfterStep } = await import("@/lib/workspaceStore");

    // Create a workspace first so updateWorkspaceAfterStep finds the dir
    const { createWorkspaceForSession } = await import("@/lib/workspaceStore");
    createWorkspaceForSession({
      sessionId: "ap-update-test",
      projectName: "UpTest",
      projectIdea: "test",
      template: null, stack: null,
      status: "running" as const, currentPhase: "idea" as const, progress: 0,
      assignedAgents: [], roadmap: [], tasks: [], logs: [],
      runtime: { status: "online", provider: "NVIDIA API", activeWorkers: 0, lastEvent: "" },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), productType: null,
    });

    const tasks = [
      { id: "AP-001", title: "Analyze", description: "Test", phase: "idea", agent: "product_agent", status: "completed" as const, priority: 1, progress: 100, dependencies: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ];
    const logs = [
      { id: "log-2", timestamp: new Date().toISOString(), level: "success" as const, agent: "product_agent", message: "Completed", source: "agent" },
    ];

    updateWorkspaceAfterStep("ap-update-test", tasks, logs, tasks[0]);

    // Verify the files were written
    const tasksJson = [...writtenFiles.entries()].find(([p]) => p.endsWith("tasks.json") && p.includes("ap-update-test"));
    expect(tasksJson).toBeDefined();
    const parsed = JSON.parse(tasksJson![1]);
    expect(parsed[0].status).toBe("completed");

    const phaseFile = [...writtenFiles.entries()].find(([p]) => p.includes("phases/01-idea-analysis.md") && p.includes("ap-update-test"));
    expect(phaseFile).toBeDefined();
    expect(phaseFile![1]).toContain("completed");
  });

  // ─── Agent Artifact Tests ──────────────────────────────────────────────────

  it("generateAgentArtifact creates product/brief.md for product_agent", async () => {
    const { createWorkspaceForSession, generateAgentArtifact } = await import("@/lib/workspaceStore");

    const session = {
      sessionId: "ap-artifact-product",
      projectName: "ArtifactTest",
      projectIdea: "Test product artifacts",
      template: null, stack: "nextjs-prisma",
      status: "running" as const, currentPhase: "idea" as const, progress: 0,
      assignedAgents: [], roadmap: [], tasks: [], logs: [],
      runtime: { status: "online", provider: "NVIDIA API", activeWorkers: 0, lastEvent: "" },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), productType: null,
    };

    createWorkspaceForSession(session);

    const task = {
      id: "AP-101", title: "Analyze idea", description: "Deep analysis",
      phase: "idea" as const, agent: "product_agent", status: "completed" as const,
      priority: 1, progress: 100, dependencies: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };

    const paths = generateAgentArtifact(session, task);

    expect(paths).toContain("product/brief.md");
    expect(paths).toContain("product/user-stories.md");

    const briefContent = [...writtenFiles.entries()].find(([p]) => p.endsWith("product/brief.md") && p.includes("ap-artifact-product"));
    expect(briefContent).toBeDefined();
    expect(briefContent![1]).toContain("Product Brief");
    expect(briefContent![1]).toContain("ArtifactTest");
    expect(briefContent![1]).toContain("AP-101");
    expect(briefContent![1]).toContain("product_agent");
  });

  it("generateAgentArtifact creates architecture/system-design.md for architect_agent", async () => {
    const { createWorkspaceForSession, generateAgentArtifact } = await import("@/lib/workspaceStore");

    const session = {
      sessionId: "ap-artifact-arch",
      projectName: "ArchTest",
      projectIdea: "Test architecture artifacts",
      template: null, stack: "nextjs-prisma",
      status: "running" as const, currentPhase: "architecture" as const, progress: 0,
      assignedAgents: [], roadmap: [], tasks: [], logs: [],
      runtime: { status: "online", provider: "NVIDIA API", activeWorkers: 0, lastEvent: "" },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), productType: null,
    };

    createWorkspaceForSession(session);

    const task = {
      id: "AP-201", title: "Design system", description: "System architecture",
      phase: "architecture" as const, agent: "architect_agent", status: "completed" as const,
      priority: 1, progress: 100, dependencies: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };

    const paths = generateAgentArtifact(session, task);

    expect(paths).toContain("architecture/system-design.md");
    expect(paths).toContain("architecture/data-model.md");

    const designContent = [...writtenFiles.entries()].find(([p]) => p.endsWith("architecture/system-design.md") && p.includes("ap-artifact-arch"));
    expect(designContent).toBeDefined();
    expect(designContent![1]).toContain("System Design");
    expect(designContent![1]).toContain("architect_agent");
  });

  it("generateAgentArtifact returns empty array for unknown agent", async () => {
    const { createWorkspaceForSession, generateAgentArtifact } = await import("@/lib/workspaceStore");

    const session = {
      sessionId: "ap-artifact-unknown",
      projectName: "UnknownTest",
      projectIdea: "Test",
      template: null, stack: null,
      status: "running" as const, currentPhase: "idea" as const, progress: 0,
      assignedAgents: [], roadmap: [], tasks: [], logs: [],
      runtime: { status: "online", provider: "NVIDIA API", activeWorkers: 0, lastEvent: "" },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), productType: null,
    };

    createWorkspaceForSession(session);

    const task = {
      id: "AP-999", title: "Unknown task", description: "N/A",
      phase: "idea" as const, agent: "mystery_agent", status: "completed" as const,
      priority: 1, progress: 100, dependencies: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };

    const paths = generateAgentArtifact(session, task);
    expect(paths).toEqual([]);
  });

  it("generateAgentArtifact creates all 6 agent artifact sets", async () => {
    const { createWorkspaceForSession, generateAgentArtifact } = await import("@/lib/workspaceStore");

    const agentFiles: Record<string, string[]> = {
      product_agent: ["product/brief.md", "product/user-stories.md"],
      architect_agent: ["architecture/system-design.md", "architecture/data-model.md"],
      frontend_agent: ["frontend/ui-plan.md", "frontend/routes.md"],
      backend_agent: ["backend/api-plan.md", "backend/services.md"],
      qa_agent: ["qa/test-plan.md", "qa/risks.md"],
      devops_agent: ["devops/deployment-plan.md", "devops/env-checklist.md"],
    };

    for (const [agent, expectedPaths] of Object.entries(agentFiles)) {
      const sid = `ap-all-artifacts-${agent}`;
      const session = {
        sessionId: sid,
        projectName: `${agent}Test`,
        projectIdea: "Test",
        template: null, stack: "nextjs-prisma",
        status: "running" as const, currentPhase: "idea" as const, progress: 0,
        assignedAgents: [], roadmap: [], tasks: [], logs: [],
        runtime: { status: "online", provider: "NVIDIA API", activeWorkers: 0, lastEvent: "" },
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), productType: null,
      };

      createWorkspaceForSession(session);

      const task = {
        id: `AP-${agent}`, title: `${agent} task`, description: "Test",
        phase: "idea" as const, agent, status: "completed" as const,
        priority: 1, progress: 100, dependencies: [],
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };

      const paths = generateAgentArtifact(session, task);
      expect(paths).toEqual(expectedPaths);
    }
  });

  it("generateAgentArtifact includes objectives, decisions, and next actions", async () => {
    const { createWorkspaceForSession, generateAgentArtifact } = await import("@/lib/workspaceStore");

    const session = {
      sessionId: "ap-artifact-content",
      projectName: "ContentTest",
      projectIdea: "Test content quality",
      template: null, stack: "nextjs-prisma",
      status: "running" as const, currentPhase: "backend" as const, progress: 0,
      assignedAgents: [], roadmap: [], tasks: [], logs: [],
      runtime: { status: "online", provider: "NVIDIA API", activeWorkers: 0, lastEvent: "" },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), productType: null,
    };

    createWorkspaceForSession(session);

    const task = {
      id: "AP-301", title: "Implement API routes", description: "Build auth and CRUD routes",
      phase: "backend" as const, agent: "backend_agent", status: "completed" as const,
      priority: 1, progress: 100, dependencies: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };

    generateAgentArtifact(session, task);

    const apiPlan = [...writtenFiles.entries()].find(([p]) => p.endsWith("backend/api-plan.md") && p.includes("ap-artifact-content"));
    expect(apiPlan).toBeDefined();
    expect(apiPlan![1]).toContain("## Objectives");
    expect(apiPlan![1]).toContain("## Key Decisions");
    expect(apiPlan![1]).toContain("## Next Actions");
    expect(apiPlan![1]).toContain("AP-301");
    expect(apiPlan![1]).toContain("backend_agent");
  });

  // ─── Project Scaffold Tests ─────────────────────────────────────────────────

  it("generateProjectScaffold creates project/package.json", async () => {
    const { createWorkspaceForSession, generateProjectScaffold } = await import("@/lib/workspaceStore");

    const session = {
      sessionId: "ap-scaffold-pkg",
      projectName: "SaaSPro",
      projectIdea: "A modern SaaS platform",
      template: "b2b-saas", stack: "nextjs-prisma",
      status: "running" as const, currentPhase: "frontend" as const, progress: 0,
      assignedAgents: [], roadmap: [], tasks: [], logs: [],
      runtime: { status: "online", provider: "NVIDIA API", activeWorkers: 0, lastEvent: "" },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), productType: null,
    };

    createWorkspaceForSession(session);
    const paths = generateProjectScaffold(session);

    expect(paths).toContain("project/package.json");
    const pkgContent = [...writtenFiles.entries()].find(([p]) => p.endsWith("project/package.json") && p.includes("ap-scaffold-pkg"));
    expect(pkgContent).toBeDefined();
    const parsed = JSON.parse(pkgContent![1]);
    expect(parsed.name).toBe("saaspro");
    expect(parsed.dependencies.next).toBeDefined();
  });

  it("generateProjectScaffold creates project/app/page.tsx", async () => {
    const { createWorkspaceForSession, generateProjectScaffold } = await import("@/lib/workspaceStore");

    const session = {
      sessionId: "ap-scaffold-page",
      projectName: "FlowApp",
      projectIdea: "Workflow automation for teams",
      template: null, stack: null,
      status: "running" as const, currentPhase: "frontend" as const, progress: 0,
      assignedAgents: [], roadmap: [], tasks: [], logs: [],
      runtime: { status: "online", provider: "NVIDIA API", activeWorkers: 0, lastEvent: "" },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), productType: null,
    };

    createWorkspaceForSession(session);
    const paths = generateProjectScaffold(session);

    expect(paths).toContain("project/app/page.tsx");
    const pageContent = [...writtenFiles.entries()].find(([p]) => p.endsWith("project/app/page.tsx") && p.includes("ap-scaffold-page"));
    expect(pageContent).toBeDefined();
    expect(pageContent![1]).toContain("Hero");
    expect(pageContent![1]).toContain("Pricing");
  });

  it("generateProjectScaffold uses session name and idea", async () => {
    const { createWorkspaceForSession, generateProjectScaffold } = await import("@/lib/workspaceStore");

    const session = {
      sessionId: "ap-scaffold-ctx",
      projectName: "AutoCRM",
      projectIdea: "CRM for restaurants and cafes",
      template: "b2b-saas", stack: "nextjs-prisma",
      status: "running" as const, currentPhase: "idea" as const, progress: 0,
      assignedAgents: [], roadmap: [], tasks: [], logs: [],
      runtime: { status: "online", provider: "NVIDIA API", activeWorkers: 0, lastEvent: "" },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), productType: null,
    };

    createWorkspaceForSession(session);
    generateProjectScaffold(session);

    const readme = [...writtenFiles.entries()].find(([p]) => p.endsWith("project/README.md") && p.includes("ap-scaffold-ctx"));
    expect(readme).toBeDefined();
    expect(readme![1]).toContain("AutoCRM");
    expect(readme![1]).toContain("CRM for restaurants");

    const config = [...writtenFiles.entries()].find(([p]) => p.endsWith("project/lib/config.ts") && p.includes("ap-scaffold-ctx"));
    expect(config).toBeDefined();
    expect(config![1]).toContain("AutoCRM");
    expect(config![1]).toContain("autocrm");
  });

  it("generateProjectScaffold creates all 9 project files", async () => {
    const { createWorkspaceForSession, generateProjectScaffold } = await import("@/lib/workspaceStore");

    const session = {
      sessionId: "ap-scaffold-all",
      projectName: "FullStack",
      projectIdea: "Full stack platform",
      template: null, stack: null,
      status: "running" as const, currentPhase: "frontend" as const, progress: 0,
      assignedAgents: [], roadmap: [], tasks: [], logs: [],
      runtime: { status: "online", provider: "NVIDIA API", activeWorkers: 0, lastEvent: "" },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), productType: null,
    };

    createWorkspaceForSession(session);
    const paths = generateProjectScaffold(session);

    expect(paths).toContain("project/package.json");
    expect(paths).toContain("project/README.md");
    expect(paths).toContain("project/app/page.tsx");
    expect(paths).toContain("project/app/layout.tsx");
    expect(paths).toContain("project/app/globals.css");
    expect(paths).toContain("project/lib/config.ts");
    expect(paths).toContain("project/components/Hero.tsx");
    expect(paths).toContain("project/components/Pricing.tsx");
    expect(paths).toContain("project/components/DashboardPreview.tsx");
    expect(paths.length).toBe(9);
  });

  it("projectScaffoldExists returns true after generation", async () => {
    const { createWorkspaceForSession, generateProjectScaffold, projectScaffoldExists } = await import("@/lib/workspaceStore");

    const sid = "ap-scaffold-exists";
    const session = {
      sessionId: sid,
      projectName: "ExistCheck",
      projectIdea: "Test",
      template: null, stack: null,
      status: "running" as const, currentPhase: "idea" as const, progress: 0,
      assignedAgents: [], roadmap: [], tasks: [], logs: [],
      runtime: { status: "online", provider: "NVIDIA API", activeWorkers: 0, lastEvent: "" },
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), productType: null,
    };

    createWorkspaceForSession(session);
    expect(projectScaffoldExists(sid)).toBe(false);

    generateProjectScaffold(session);
    expect(projectScaffoldExists(sid)).toBe(true);
  });
});
