import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import AppShell from "@/components/AppShell";
import NavSidebar from "@/components/NavSidebar";

const primaryLinks = [
  "CEO",
  "Entreprises",
  "Projets",
  "Resultats",
  "Expert",
];

const expertLinks = [
  "Agents",
  "Approvals",
  "Mission Rooms",
  "Workspaces",
  "Settings",
  "Runtime",
  "Logs",
  "System Health",
  "Demo Center",
  "Conversations",
  "Revenue",
  "CRM",
  "Distribution",
];

describe("NavSidebar", () => {
  it("renders only simple OS navigation in simple mode", () => {
    render(React.createElement(NavSidebar));

    for (const label of primaryLinks) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(screen.queryByRole("link", { name: "Dashboard" })).not.toBeInTheDocument();
    for (const label of expertLinks) {
      expect(screen.queryByRole("link", { name: label })).not.toBeInTheDocument();
    }
  });

  it("restores full navigation in expert mode", () => {
    render(React.createElement(NavSidebar, { expertMode: true }));

    for (const label of expertLinks) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    expect(screen.getByRole("link", { name: "CEO Cockpit" })).toBeInTheDocument();
  });

  it("marks the active route", () => {
    globalThis.__TEST_PATHNAME__ = "/projects";

    render(React.createElement(NavSidebar));

    expect(screen.getByRole("link", { name: "Projets" })).toHaveClass("active");
    expect(screen.getByRole("link", { name: "CEO" })).not.toHaveClass("active");
  });
});

describe("AppShell", () => {
  it("renders breadcrumbs, status chrome and page content", () => {
    globalThis.__TEST_PATHNAME__ = "/settings";

    render(
      React.createElement(
        AppShell,
        null,
        React.createElement("main", null, React.createElement("h1", null, "Settings child content"))
      )
    );

    expect(screen.getAllByText("AI Company OS").length).toBeGreaterThan(0);
    expect(screen.getByText("Agence AI active")).toBeInTheDocument();
    expect(screen.getByText("Mode simple")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Settings child content" })).toBeInTheDocument();
  });

  it("renders desktop shell simple dock without advanced modules", () => {
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
    expect(container.querySelector(".sidebar")).not.toBeInTheDocument();
    for (const label of primaryLinks) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    for (const label of expertLinks) {
      expect(screen.queryByRole("link", { name: label })).not.toBeInTheDocument();
    }
  });

  it("toggles global expert navigation and persists the choice", async () => {
    const store = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        removeItem: (key: string) => store.delete(key),
      },
    });
    globalThis.__TEST_PATHNAME__ = "/ceo";

    const { unmount } = render(
      React.createElement(
        AppShell,
        null,
        React.createElement("main", null, React.createElement("h1", null, "CEO child content"))
      )
    );

    expect(screen.queryAllByRole("link", { name: "Agents" })).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Mode expert" }));

    await waitFor(() => expect(store.get("ai-company-os-view-mode")).toBe("expert"));
    expect(screen.getAllByRole("link", { name: "Agents" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Approvals" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Mission Rooms" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Workspaces" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Settings" }).length).toBeGreaterThan(0);

    unmount();
    render(
      React.createElement(
        AppShell,
        null,
        React.createElement("main", null, React.createElement("h1", null, "CEO child content"))
      )
    );

    await waitFor(() => expect(screen.getAllByRole("link", { name: "Runtime" }).length).toBeGreaterThan(0));
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
    expect(screen.getAllByRole("link", { name: "Approvals" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Mission Rooms" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Workspaces" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "Settings" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Projects child content" })).toBeInTheDocument();
  });
});
