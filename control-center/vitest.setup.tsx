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
