import fs from "fs";
import path from "path";
import { fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import AppShell from "@/components/AppShell";
import CeoPage from "@/app/ceo/page";

describe("active AI Company OS platform shell", () => {
  it("renders /ceo with the real premium sidebar and clean chat surface", async () => {
    globalThis.__TEST_PATHNAME__ = "/ceo";
    const { container } = render(React.createElement(AppShell, null, React.createElement(CeoPage)));
    const sidebar = container.querySelector(".platform-sidebar");

    expect(sidebar).toBeInTheDocument();
    expect(sidebar).toHaveAttribute("data-collapsed", "false");
    const scope = within(sidebar as HTMLElement);
    for (const label of ["CEO Chat", "Missions", "Agents"]) {
      expect(scope.getByRole("link", { name: label })).toBeInTheDocument();
    }
    for (const hiddenLabel of ["Companies", "Projects", "Outputs", "Approvals", "Workspaces", "Artifacts", "Skills", "Evals", "Settings", "Logs", "Runtime", "Expert"]) {
      expect(scope.queryByRole("link", { name: hiddenLabel })).not.toBeInTheDocument();
    }
    expect(scope.queryByText("Nouveau chat")).not.toBeInTheDocument();
    expect(container.textContent ?? "").not.toMatch(/\b(?:C|M|A)\.\.\./);

    expect(await screen.findByLabelText("Chat CEO")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Message")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajouter des fichiers" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ouvrir le mode expert" })).toHaveAttribute("href", "/ceo/expert");
    expect(container.textContent ?? "").not.toMatch(/Décris ce que tu veux construire|Production IA active|Mode simple|Conversation CEO/i);
  });

  it("keeps expert navigation behind the dedicated expert route", () => {
    globalThis.__TEST_PATHNAME__ = "/ceo/expert";
    const { container } = render(React.createElement(AppShell, null, React.createElement("main", null, "Expert route")));
    const sidebar = container.querySelector(".platform-sidebar");
    const scope = within(sidebar as HTMLElement);

    for (const label of [
      "CEO Chat",
      "Missions",
      "Agents",
      "Companies",
      "Projects",
      "Outputs",
      "Approvals",
      "Workspaces",
      "Artifacts",
      "Skills",
      "Evals",
      "Settings",
      "Logs",
      "Runtime",
      "Expert",
    ]) {
      expect(scope.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("keeps the full expert menu active on advanced routes", () => {
    globalThis.__TEST_PATHNAME__ = "/projects";
    const { container } = render(React.createElement(AppShell, null, React.createElement("main", null, "Projects route")));
    const sidebar = container.querySelector(".platform-sidebar");
    const scope = within(sidebar as HTMLElement);

    for (const label of ["CEO Chat", "Missions", "Agents", "Companies", "Projects", "Outputs", "Approvals", "Workspaces", "Artifacts", "Skills", "Evals", "Settings", "Logs", "Runtime", "Expert"]) {
      expect(scope.getByRole("link", { name: label })).toBeInTheDocument();
    }
  });

  it("keeps the active shell CSS at usable app-chat dimensions", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "src", "app", "globals.css"), "utf-8");

    expect(css).toMatch(/\.platform-shell\s*{[^}]*height:\s*100vh/s);
    expect(css).toMatch(/\.platform-shell\s*{[^}]*grid-template-columns:\s*280px minmax\(0,\s*1fr\)/s);
    expect(css).toMatch(/\.platform-shell\s*{[^}]*background:\s*#000000/s);
    expect(css).toMatch(/\.platform-sidebar\s*{[^}]*background:\s*#050505/s);
    expect(css).toMatch(/\.platform-topbar\s*{[^}]*background:\s*#000000/s);
    expect(css).toMatch(/\.platform-shell\s*{[^}]*--surface:\s*#0f0f0f/s);
    expect(css).toMatch(/\.platform-shell\s*{[^}]*overflow:\s*hidden/s);
    expect(css).toMatch(/\.platform-sidebar\s*{[^}]*width:\s*280px/s);
    expect(css).toMatch(/\.platform-sidebar\s*{[^}]*min-width:\s*280px/s);
    expect(css).toMatch(/\.platform-sidebar \.os-dock-item span\s*{[^}]*max-width:\s*none/s);
    expect(css).toMatch(/@media \(max-width:\s*860px\)[\s\S]*\.platform-sidebar\s*{[\s\S]*transform:\s*translateX\(-104%\)/);
    expect(css).toMatch(/\.platform-sidebar\.mobile-open\s*{[^}]*transform:\s*translateX\(0\)/s);
    expect(css).toMatch(/\.platform-shell \.ceo-chat-shell\s*{[^}]*width:\s*min\(100%,\s*820px\)/s);
  });

  it("opens and closes the mobile sidebar drawer from the topbar menu", () => {
    globalThis.__TEST_PATHNAME__ = "/ceo";
    const { container } = render(React.createElement(AppShell, null, React.createElement(CeoPage)));
    const sidebar = container.querySelector(".platform-sidebar");

    expect(sidebar).not.toHaveClass("mobile-open");
    fireEvent.click(screen.getByRole("button", { name: "Ouvrir le menu" }));
    expect(sidebar).toHaveClass("mobile-open");
    fireEvent.click(screen.getByRole("button", { name: "Fermer le menu" }));
    expect(sidebar).not.toHaveClass("mobile-open");
  });
});
