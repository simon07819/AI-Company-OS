import "@testing-library/jest-dom/vitest";
import React from "react";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

type MockResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

declare global {
  var __TEST_PATHNAME__: string | undefined;
}

afterEach(() => {
  cleanup();
  globalThis.__TEST_PATHNAME__ = "/";
  vi.clearAllMocks();
});

globalThis.__TEST_PATHNAME__ = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => globalThis.__TEST_PATHNAME__ ?? "/",
  useParams: () => {
    const segments = (globalThis.__TEST_PATHNAME__ ?? "/").split("/").filter(Boolean);
    return {
      missionId: segments[0] === "mission" ? segments[1] : undefined,
      sessionId: segments[0] === "autopilot" ? segments[1] : undefined,
    };
  },
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    React.createElement("a", { href, ...props }, children)
  ),
}));

vi.mock("framer-motion", () => {
  const makeMotion = (tag: keyof JSX.IntrinsicElements) => {
    const Component = ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const {
        animate: _animate,
        exit: _exit,
        initial: _initial,
        layout: _layout,
        transition: _transition,
        variants: _variants,
        whileHover: _whileHover,
        whileTap: _whileTap,
        ...domProps
      } = props;

      return React.createElement(tag, domProps, children);
    };
    Component.displayName = `motion.${String(tag)}`;
    return Component;
  };

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    motion: new Proxy({}, {
      get: (_target, prop) => makeMotion(prop as keyof JSX.IntrinsicElements),
    }),
  };
});

class MockEventSource {
  url: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;
  }

  close() {}
}

vi.stubGlobal("EventSource", MockEventSource);

Element.prototype.scrollIntoView = vi.fn();

vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL): Promise<MockResponse> => {
  const url = String(input);
  if (url.includes("/api/status")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        timestamp: new Date().toISOString(),
        projects: 2,
        totalTasks: 12,
        queued: 3,
        running: 1,
        failed: 0,
        completed: 8,
        archived: 0,
        successRate: 98,
        nvidiaStatus: "online",
        logFileExists: true,
        logEntries: 24,
        lastActivity: new Date().toISOString(),
        workers: 2,
      }),
    };
  }

  if (url.includes("/api/tasks")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        tasks: [
          {
            id: "T-1",
            title: "Implement runtime QA",
            status: "queued",
            project: "control-center",
            department: "QA",
            description: "Critical UI test coverage",
          },
        ],
        summary: { total: 1, queued: 1, running: 0, failed: 0, completed: 0, archived: 0 },
      }),
    };
  }

  if (url.includes("/api/agent-activity")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ entries: [] }),
    };
  }

  if (url.includes("/api/runtime-mode")) {
    return { ok: true, status: 200, json: async () => ({ ok: true, mode: "simulation" }) };
  }

  if (url.includes("/api/approvals")) {
    return { ok: true, status: 200, json: async () => ({ ok: true, pending: [] }) };
  }

  if (url.includes("/api/archive")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        entities: [{
          id: "arch-projects-proj-1",
          entityType: "projects",
          entityId: "proj-1",
          label: "Archived Project",
          action: "archived",
          archivedAt: new Date().toISOString(),
        }],
      }),
    };
  }

  if (url.includes("/api/visible-outputs")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        outputs: [{
          id: "vo-test",
          title: "Design Recommendation",
          type: "style_direction",
          preview: "Creative Direction, Logo Concept, Color Palette, Typography Direction",
          status: "review",
          assignedAgent: "cmo",
        }],
      }),
    };
  }

  if (url.includes("/api/conversations/threads")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        thread: {
          id: "ceo-main-thread",
          title: "CEO Cockpit",
          participants: [{ id: "ceo", name: "Alexandra", avatar: "👑", color: "#f59e0b" }],
          messages: [],
          archived: false,
          updatedAt: new Date().toISOString(),
        },
        threads: [],
      }),
    };
  }

  if (url.includes("/api/ceo/messages")) {
    return { ok: true, status: 200, json: async () => ({ ok: true, messages: [] }) };
  }

  if (url.includes("/api/ceo/overview")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        overview: { activeMissions: 0, pendingApprovals: 0, totalRevenue: 0, agents: [], recentMessages: [], pendingDecisions: [] },
      }),
    };
  }

  if (url.includes("/api/ceo/simple-agency")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        view: {
          messages: [],
          companies: [{ id: "workspace-photo", name: "Studio Lumiere", type: "photography", status: "Attend ton avis", avatar: "SL", projectsCount: 1, projectIds: ["proj-logo"], hasPendingApproval: true }],
          projects: [{ id: "proj-logo", name: "Logo pour compagnie de photo", missionType: "branding_pack", status: "review", sessionId: "session-logo", workspaceId: "workspace-photo", progress: 70, outputsCount: 1, updatedAt: new Date().toISOString() }],
          sessions: [{ sessionId: "session-logo", projectName: "Logo pour compagnie de photo", projectIdea: "", missionType: "branding_pack", businessStatus: "review", status: "waiting_approval", progress: 70, assignedAgents: [{ agentId: "frontend_agent", role: "Designer", status: "done", provider: "NVIDIA API" }], tasks: [], logs: [], runtime: { lastEvent: "Waiting for approval", activeWorkers: 0 } }],
          outputs: [{ id: "out-logo", sessionId: "session-logo", projectId: "proj-logo", title: "Logo Concept", type: "logo_direction", summary: "Concept premium", preview: "Palette #0F172A #38BDF8", status: "review", assignedAgent: "frontend_agent", updatedAt: new Date().toISOString(), visualPreview: { kind: "brand_card", logoText: "SL", tagline: "Capture the light", colors: ["#172033", "#2f6fed", "#f8fafc", "#d8a63f"], typography: { heading: "Inter SemiBold", body: "Inter Regular" }, mockup: { title: "Studio Lumiere", subtitle: "Photo", blocks: ["Premium", "Lumineux", "Moderne"] } } }],
          approvals: [{ item: { id: "output-out-logo", title: "Logo Concept", type: "logo", status: "pending", agentId: "frontend_agent", agentName: "Designer", sessionId: "session-logo", missionType: "branding_pack", createdAt: new Date().toISOString(), summary: "Concept premium", hasPreviewContent: true, previewType: "output_list" }, preview: null, canApprove: true, visualPreview: { kind: "brand_card", logoText: "SL", tagline: "Capture the light", colors: ["#172033", "#2f6fed", "#f8fafc", "#d8a63f"], typography: { heading: "Inter SemiBold", body: "Inter Regular" }, mockup: { title: "Studio Lumiere", subtitle: "Photo", blocks: ["Premium", "Lumineux", "Moderne"] } } }],
          logs: [],
        },
      }),
    };
  }

  if (url.includes("/api/autopilot/sessions/") && url.includes("/logs")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({ ok: true, logs: [] }),
    };
  }

  if (url.includes("/api/autopilot/sessions/") && url.includes("/run-step")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        message: "Task completed.",
        task: { id: "AP-001", title: "Analyze idea", status: "completed", agent: "product_agent" },
        completed: false,
        session: {
          sessionId: "ap-test123",
          projectName: "TestProject",
          projectIdea: "Test idea",
          productType: null,
          template: null,
          stack: null,
          missionType: "saas_project",
          businessStatus: "idea",
          loopMode: null, loopStatus: null, nextRunAt: null, lastRunAt: null, loopHistory: [],
          status: "running",
          currentPhase: "planning",
          progress: 6,
          assignedAgents: [{ agentId: "product_agent", role: "Product analysis", status: "active", provider: "NVIDIA API" }],
          roadmap: ["Step 1"],
          tasks: [
            { id: "AP-001", title: "Analyze idea", description: "Test task", phase: "idea", agent: "product_agent", status: "completed", priority: 1, progress: 100, dependencies: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: "AP-002", title: "Validate market", description: "Test task", phase: "idea", agent: "product_agent", status: "running", priority: 2, progress: 15, dependencies: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          ],
          logs: [
            { id: "log-2", timestamp: new Date().toISOString(), level: "success", agent: "product_agent", message: "product_agent completed: Analyze idea", source: "agent" },
            { id: "log-1", timestamp: new Date().toISOString(), level: "info", agent: "product_agent", message: "product_agent started task: Analyze idea", source: "autopilot" },
          ],
          runtime: { status: "online", provider: "NVIDIA API", activeWorkers: 1, lastEvent: "product_agent completed: Analyze idea" },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    };
  }

  if (url.includes("/api/autopilot/sessions/") && url.includes("/run-all")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        message: "Executed 3 steps. Session running.",
        stepsExecuted: 3,
        completed: false,
        session: {
          sessionId: "ap-test123",
          projectName: "TestProject",
          projectIdea: "Test idea",
          productType: null,
          template: null,
          stack: null,
          missionType: "saas_project",
          businessStatus: "idea",
          loopMode: null, loopStatus: null, nextRunAt: null, lastRunAt: null, loopHistory: [],
          status: "running",
          currentPhase: "planning",
          progress: 18,
          assignedAgents: [{ agentId: "product_agent", role: "Product analysis", status: "active", provider: "NVIDIA API" }],
          roadmap: ["Step 1"],
          tasks: [],
          logs: [],
          runtime: { status: "online", provider: "NVIDIA API", activeWorkers: 1, lastEvent: "run-all executed 3 steps" },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    };
  }

  if (url.includes("/api/autopilot/sessions/") && url.includes("/workspace/file")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        path: "README.md",
        content: "# TestProject\n\n> Test idea\n\n**Session:** ap-test123\n",
      }),
    };
  }

  if (url.includes("/api/autopilot/sessions/") && url.includes("/workspace")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        message: "Workspace has 12 files (3.2KB).",
        summary: {
          sessionId: "ap-test123",
          projectName: "TestProject",
          exists: true,
          fileCount: 12,
          totalSize: 3200,
          files: [
            { path: "README.md", name: "README.md", size: 256, modifiedAt: new Date().toISOString() },
            { path: "roadmap.md", name: "roadmap.md", size: 380, modifiedAt: new Date().toISOString() },
            { path: "tasks.json", name: "tasks.json", size: 1024, modifiedAt: new Date().toISOString() },
            { path: "logs.md", name: "logs.md", size: 512, modifiedAt: new Date().toISOString() },
            { path: "phases/01-idea-analysis.md", name: "01-idea-analysis.md", size: 180, modifiedAt: new Date().toISOString() },
            { path: "phases/02-product-definition.md", name: "02-product-definition.md", size: 140, modifiedAt: new Date().toISOString() },
            { path: "phases/03-architecture.md", name: "03-architecture.md", size: 140, modifiedAt: new Date().toISOString() },
            { path: "phases/04-frontend-design.md", name: "04-frontend-design.md", size: 140, modifiedAt: new Date().toISOString() },
            { path: "phases/05-backend-implementation.md", name: "05-backend-implementation.md", size: 140, modifiedAt: new Date().toISOString() },
            { path: "phases/06-validation.md", name: "06-validation.md", size: 140, modifiedAt: new Date().toISOString() },
            { path: "phases/07-build-preparation.md", name: "07-build-preparation.md", size: 140, modifiedAt: new Date().toISOString() },
            { path: "phases/08-runtime-monitoring.md", name: "08-runtime-monitoring.md", size: 140, modifiedAt: new Date().toISOString() },
          ],
        },
      }),
    };
  }

  if (url.includes("/api/autopilot/sessions/") && url.includes("/generate-project")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        message: "Generated 9 project files.",
        files: [
          "project/package.json", "project/README.md", "project/app/page.tsx",
          "project/app/layout.tsx", "project/app/globals.css", "project/lib/config.ts",
          "project/components/Hero.tsx", "project/components/Pricing.tsx",
          "project/components/DashboardPreview.tsx",
        ],
        session: {
          sessionId: "ap-test123",
          projectName: "TestProject",
          projectIdea: "Test idea",
          productType: null, template: null, stack: null, missionType: "saas_project", businessStatus: "idea",
          loopMode: null, loopStatus: null, nextRunAt: null, lastRunAt: null, loopHistory: [],
          status: "running", currentPhase: "frontend", progress: 50,
          assignedAgents: [], roadmap: [], tasks: [], logs: [],
          runtime: { status: "online", provider: "NVIDIA API", activeWorkers: 1, lastEvent: "Scaffold generated" },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    };
  }

  if (url.includes("/api/autopilot/sessions/") && url.includes("/validate-project")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        message: "Project validated: 100% — Build-ready",
        validation: {
          ok: true,
          score: 100,
          checks: [
            { name: "project-directory", path: "project/", passed: true, message: "Project directory exists" },
            { name: "exists:package.json", path: "package.json", passed: true, message: "package.json exists and is parseable" },
            { name: "exists:app/page.tsx", path: "app/page.tsx", passed: true, message: "app/page.tsx exists" },
            { name: "exists:app/layout.tsx", path: "app/layout.tsx", passed: true, message: "app/layout.tsx exists" },
            { name: "exists:components/Hero.tsx", path: "components/Hero.tsx", passed: true, message: "components/Hero.tsx exists" },
            { name: "exists:lib/config.ts", path: "lib/config.ts", passed: true, message: "lib/config.ts exists" },
            { name: "non-empty:package.json", path: "package.json", passed: true, message: "package.json is not empty" },
            { name: "non-empty:app/page.tsx", path: "app/page.tsx", passed: true, message: "app/page.tsx is not empty" },
            { name: "non-empty:app/layout.tsx", path: "app/layout.tsx", passed: true, message: "app/layout.tsx is not empty" },
            { name: "non-empty:components/Hero.tsx", path: "components/Hero.tsx", passed: true, message: "components/Hero.tsx is not empty" },
            { name: "non-empty:lib/config.ts", path: "lib/config.ts", passed: true, message: "lib/config.ts is not empty" },
            { name: "package-json-parseable", path: "package.json", passed: true, message: "package.json is valid JSON" },
          ],
          warnings: [],
          generatedAt: new Date().toISOString(),
        },
        session: {
          sessionId: "ap-test123",
          projectName: "TestProject",
          projectIdea: "Test idea",
          productType: null, template: null, stack: null, missionType: "saas_project",
          status: "running", currentPhase: "frontend", progress: 50,
          assignedAgents: [], roadmap: [], tasks: [], logs: [],
          runtime: { status: "online", provider: "NVIDIA API", activeWorkers: 1, lastEvent: "Validation completed" },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    };
  }

  if (url.includes("/api/autopilot/sessions/")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        session: {
          sessionId: "ap-test123",
          projectName: "TestProject",
          projectIdea: "Test idea",
          productType: null,
          template: null,
          stack: null,
          missionType: "saas_project",
          businessStatus: "idea",
          loopMode: null, loopStatus: null, nextRunAt: null, lastRunAt: null, loopHistory: [],
          status: "running",
          currentPhase: "idea",
          progress: 0,
          assignedAgents: [{ agentId: "product_agent", role: "Product analysis", status: "available", provider: "NVIDIA API" }],
          roadmap: ["Step 1"],
          tasks: [{ id: "AP-001", title: "Analyze idea", description: "Test task", phase: "idea", agent: "product_agent", status: "running", priority: 1, progress: 10, dependencies: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
          logs: [{ id: "log-1", timestamp: new Date().toISOString(), level: "info", agent: "product_agent", message: "Autopilot started", source: "autopilot" }],
          runtime: { status: "online", provider: "NVIDIA API", activeWorkers: 1, lastEvent: "Started" },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    };
  }

  if (url.includes("/api/autopilot/sessions")) {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        sessions: [{
          sessionId: "ap-test123",
          projectName: "TestProject",
          projectIdea: "Test idea",
          productType: null,
          template: null,
          stack: null,
          missionType: "saas_project",
          businessStatus: "idea",
          loopMode: null, loopStatus: null, nextRunAt: null, lastRunAt: null, loopHistory: [],
          status: "running",
          currentPhase: "idea",
          progress: 0,
          assignedAgents: [{ agentId: "product_agent", role: "Product analysis", status: "available", provider: "NVIDIA API" }],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }],
      }),
    };
  }

  return {
    ok: true,
    status: 200,
    json: async () => ({}),
  };
}));
