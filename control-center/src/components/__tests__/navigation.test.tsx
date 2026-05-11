import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import AppShell from "@/components/AppShell";
import NavSidebar from "@/components/NavSidebar";

const primaryLinks = [
  "Dashboard",
  "CEO",
  "Entreprises",
  "Projets",
  "Agents",
  "Resultats",
  "Approvals",
  "Messages",
  "Mission Rooms",
  "Mode expert",
  "Workspaces",
  "Settings",
];

describe("NavSidebar", () => {
  it("renders the global product navigation", () => {
    render(React.createElement(NavSidebar));

    for (const label of primaryLinks) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("marks the active route", () => {
    globalThis.__TEST_PATHNAME__ = "/projects";

    render(React.createElement(NavSidebar));

    expect(screen.getByRole("link", { name: "Projets" })).toHaveClass("active");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveClass("active");
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
    expect(screen.getAllByRole("link", { name: "Settings" })[0]).toHaveAttribute("href", "/settings");
    expect(screen.getByText("Agence AI active")).toBeInTheDocument();
    expect(screen.getByText("Mode simple")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Settings child content" })).toBeInTheDocument();
  });
});
