import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import AppShell from "@/components/AppShell";
import CommandDock from "@/components/os/CommandDock";

const primaryLinks = [
  "Accueil",
  "CEO Chat",
  "Projets",
  "Agents",
  "Outputs",
  "Expert Mode",
];

const expertLinks = [
  "Accueil",
  "CEO Chat",
  "Projets",
  "Agents",
  "Outputs",
  "Companies",
  "Workspaces",
  "Artifacts",
  "Skills",
  "Evals",
  "Settings",
  "Logs",
  "Runtime",
  "Expert Mode",
];

describe("CommandDock", () => {
  it("renders the active platform navigation", () => {
    render(React.createElement(CommandDock, { mode: "simple", pathname: "/ceo" }));

    for (const label of primaryLinks) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("keeps the same core navigation in expert mode", () => {
    render(React.createElement(CommandDock, { mode: "expert", pathname: "/ceo/expert" }));

    for (const label of expertLinks) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("marks the active route", () => {
    render(React.createElement(CommandDock, { mode: "simple", pathname: "/projects" }));

    expect(screen.getByRole("link", { name: "Projets" })).toHaveClass("active");
    expect(screen.getByRole("link", { name: "CEO Chat" })).not.toHaveClass("active");
  });
});

describe("AppShell", () => {
  it("renders premium platform chrome and page content", () => {
    globalThis.__TEST_PATHNAME__ = "/settings";

    render(
      React.createElement(
        AppShell,
        null,
        React.createElement("main", null, React.createElement("h1", null, "Settings child content"))
      )
    );

    expect(screen.getAllByText("AI Company OS").length).toBeGreaterThan(0);
    expect(screen.queryByText("Mode simple")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Settings child content" })).toBeInTheDocument();
  });

  it("renders the active dark platform shell with full sidebar", () => {
    globalThis.__TEST_PATHNAME__ = "/ceo";

    const { container } = render(
      React.createElement(
        AppShell,
        null,
        React.createElement("main", null, React.createElement("h1", null, "CEO child content"))
      )
    );

    expect(container.querySelector(".desktop-os-shell")).toBeInTheDocument();
    expect(container.querySelector(".os-dock")).toBeInTheDocument();
    expect(container.querySelector(".platform-sidebar")).toBeInTheDocument();
    for (const label of primaryLinks) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("keeps the sidebar stable when navigating between simple renders", async () => {
    globalThis.__TEST_PATHNAME__ = "/ceo";

    const { unmount } = render(
      React.createElement(
        AppShell,
        null,
        React.createElement("main", null, React.createElement("h1", null, "CEO child content"))
      )
    );

    expect(screen.getByRole("link", { name: "Agents" })).toBeInTheDocument();
    for (const label of primaryLinks) {
      expect(screen.getAllByRole("link", { name: label }).length).toBeGreaterThan(0);
    }

    unmount();
    render(
      React.createElement(
        AppShell,
        null,
        React.createElement("main", null, React.createElement("h1", null, "CEO child content"))
      )
    );

    await waitFor(() => expect(screen.getAllByRole("link", { name: "CEO Chat" }).length).toBeGreaterThan(0));
  });

  it("applies expert mode globally beyond the CEO page", async () => {
    const store = new Map<string, string>([["ai-company-os-view-mode", "expert"]]);
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
      },
    });
    globalThis.__TEST_PATHNAME__ = "/projects";

    render(
      React.createElement(
        AppShell,
        null,
        React.createElement("main", null, React.createElement("h1", null, "Projects child content"))
      )
    );

    await waitFor(() => expect(screen.getAllByRole("link", { name: "Agents" }).length).toBeGreaterThan(0));
    for (const label of expertLinks) {
      expect(screen.getAllByRole("link", { name: label }).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole("heading", { name: "Projects child content" })).toBeInTheDocument();
  });
});
