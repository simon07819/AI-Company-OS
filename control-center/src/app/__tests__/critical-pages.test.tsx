import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import AgentsPage from "@/app/agents/page";
import AutopilotPage from "@/app/autopilot/page";
import DashboardPage from "@/app/page";
import CompaniesPage from "@/app/companies/page";
import ProjectsPage from "@/app/projects/page";
import ApprovalsPage from "@/app/approvals/page";
import OutputsPage from "@/app/outputs/page";
import WorkspacesPage from "@/app/workspaces/page";
import FactoryPage from "@/app/factory/page";
import LogsPage from "@/app/logs/page";
import RuntimePage from "@/app/runtime/page";
import SettingsPage from "@/app/settings/page";
import CeoPage from "@/app/ceo/page";
import CeoExpertPage from "@/app/ceo/expert/page";
import ArchivePage from "@/app/archive/page";
import AppShell from "@/components/AppShell";

// Mock components that fetch data
vi.mock("@/components/AutopilotPanel", () => ({
  default: () => React.createElement("div", { "data-testid": "autopilot-panel" }, "Autopilot Panel"),
}));

vi.mock("@/components/AutopilotSessionBanner", () => ({
  default: () => React.createElement("div", { "data-testid": "autopilot-session-banner" }, "Session Banner"),
}));

describe("critical Control Center pages", () => {
  it("renders the simple OS dashboard", async () => {
    render(React.createElement(DashboardPage));

    expect(await screen.findByRole("heading", { name: "Que veux-tu construire aujourd'hui?" })).toBeInTheDocument();
    expect(screen.getByText("AI Company OS Desktop")).toBeInTheDocument();
    expect(screen.getByText("Command Center")).toBeInTheDocument();
    expect(screen.getByText("Entreprises")).toBeInTheDocument();
  });

  it("renders Settings without crashing", () => {
    render(React.createElement(SettingsPage));

    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("AI Runtime")).toBeInTheDocument();
  });

  it("renders Runtime without crashing", () => {
    render(React.createElement(RuntimePage));

    expect(screen.getByText("NVIDIA Agent Execution Center")).toBeInTheDocument();
    expect(screen.getByText("Live Provider Execution")).toBeInTheDocument();
    expect(screen.getByText("Agent Execution Cards")).toBeInTheDocument();
  });

  it("renders Agents without crashing", () => {
    render(React.createElement(AgentsPage));

    expect(screen.getByRole("heading", { name: "Agents au travail" })).toBeInTheDocument();
    expect(screen.getByText("Equipe AI active")).toBeInTheDocument();
    return waitFor(() => expect(screen.getAllByText("Designer").length).toBeGreaterThan(0));
  }, 10000);

  it("renders simple companies and projects pages from agency view", async () => {
    const { unmount } = render(React.createElement(CompaniesPage));
    expect(await screen.findByRole("heading", { name: "Les entreprises que vous construisez" })).toBeInTheDocument();
    expect(screen.getAllByText("Studio Lumiere").length).toBeGreaterThan(0);

    unmount();
    render(React.createElement(ProjectsPage));
    expect((await screen.findAllByRole("heading", { name: "Projets actifs" })).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Resultat pret - approbation requise").length).toBeGreaterThan(0);
  });

  it("renders approval inbox with visual approval card", async () => {
    render(React.createElement(ApprovalsPage));

    expect(await screen.findByRole("heading", { name: "Decisions a prendre" })).toBeInTheDocument();
    expect(screen.getAllByText("Pret a approuver").length).toBeGreaterThan(0);
    expect(screen.getByText("Approuver")).toBeInTheDocument();
    expect(screen.getByText("Demander des changements")).toBeInTheDocument();
  });

  it("renders outputs and workspaces in the simple OS style", async () => {
    const { unmount } = render(React.createElement(OutputsPage));
    expect(await screen.findByRole("heading", { name: "Resultats produits" })).toBeInTheDocument();
    expect(screen.getAllByText("Logo Concept").length).toBeGreaterThan(0);

    unmount();
    render(React.createElement(WorkspacesPage));
    expect(await screen.findByRole("heading", { name: "Les entreprises que vous construisez" })).toBeInTheDocument();
    expect(screen.queryByText("Company Workspaces")).not.toBeInTheDocument();
  });

  it("keeps simple mode free of raw technical identifiers", async () => {
    const pages = [DashboardPage, CompaniesPage, ProjectsPage, AgentsPage, OutputsPage, ApprovalsPage, WorkspacesPage];
    for (const Page of pages) {
      const { unmount, container } = render(React.createElement(Page));
      await screen.findByText("Parler au CEO");
      expect(container.textContent ?? "").not.toMatch(/sessionId|projectId|workspaceId|\{|\}/);
      unmount();
    }
  });

  it("renders Factory without crashing", () => {
    render(React.createElement(FactoryPage));

    expect(screen.getByText("Factory Control Center")).toBeInTheDocument();
    expect(screen.getByText("Workers")).toBeInTheDocument();
    expect(screen.getByText("Task Queue")).toBeInTheDocument();
  });

  it("renders Logs without crashing", () => {
    render(React.createElement(LogsPage));

    expect(screen.getByRole("heading", { name: "Execution Stream" })).toBeInTheDocument();
    expect(screen.getByText("NVIDIA API live")).toBeInTheDocument();
    expect(screen.getAllByText("Simulation stream").length).toBeGreaterThan(0);
  });

  it("renders Autopilot without crashing", () => {
    render(React.createElement(AutopilotPage));

    expect(screen.getByText("Autopilot Sessions")).toBeInTheDocument();
    expect(screen.getByText("New Project")).toBeInTheDocument();
  });

  it("renders CEO chat controls", async () => {
    const { container } = render(React.createElement(CeoPage));

    expect((await screen.findAllByText(/AI Company OS/)).length).toBeGreaterThan(0);
    expect(screen.getByText("Mode expert")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Décris ce que tu veux construire/)).toBeInTheDocument();
    expect(screen.getByLabelText("Command Surface")).toBeInTheDocument();
    expect(container.querySelector(".sidebar")).not.toBeInTheDocument();
    expect(container.querySelector(".right-rail")).not.toBeInTheDocument();
    expect(container.querySelector(".left-rail")).not.toBeInTheDocument();
  });

  it("renders CEO inside desktop shell without WordPress sidebar or permanent rails", async () => {
    const { container } = render(React.createElement(AppShell, null, React.createElement(CeoPage)));

    expect(await screen.findByLabelText("Command Surface")).toBeInTheDocument();
    expect(container.querySelector(".desktop-os-shell")).toBeInTheDocument();
    expect(container.querySelector(".os-dock")).toBeInTheDocument();
    expect(container.querySelector(".sidebar")).not.toBeInTheDocument();
    expect(container.querySelector(".right-rail")).not.toBeInTheDocument();
    expect(container.textContent ?? "").not.toMatch(/Mission Room|autopilot|logs/i);
  });

  it("renders the global dark mode toggle and stores the preference", () => {
    const store = new Map<string, string>();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
        clear: () => store.clear(),
      },
    });
    render(React.createElement(AppShell, null, React.createElement("main", null, "Theme test")));

    const toggle = screen.getByRole("button", { name: /mode sombre/i });
    fireEvent.click(toggle);

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(store.get("ai-company-os-theme")).toBe("dark");
    expect(screen.getByRole("button", { name: /mode clair/i })).toBeInTheDocument();
    store.clear();
    document.documentElement.dataset.theme = "light";
  });

  it("renders global archive page", async () => {
    render(React.createElement(ArchivePage));

    expect(screen.getByText("Global Archive")).toBeInTheDocument();
    expect(await screen.findByText("Archived Project")).toBeInTheDocument();
  });

  it("renders CEO simple agency conversation", async () => {
    render(React.createElement(CeoPage));

    expect((await screen.findAllByText(/Command Center/)).length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText(/Décris ce que tu veux construire/)).toBeInTheDocument();
  });

  it("keeps CEO expert mode available", async () => {
    render(React.createElement(CeoExpertPage));

    expect((await screen.findAllByText("CEO Cockpit")).length).toBeGreaterThan(0);
  });

  it("renders submitted ELEVIO branding as a clean artifact result", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string) => {
      if (String(url).includes("/api/ceo/command")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({
          ok: true,
          title: "ELEVIO brand system",
          projectId: "elevio-brand-system",
          workspaceHref: "/projects/elevio-brand-system",
          requestType: "branding",
          status: "ready",
          qualityStatus: "Prêt",
          qualityScore: 90,
          summary: "Direction de marque pour ELEVIO avec prototypes SVG.",
          artifactPaths: ["generated-products/elevio-brand-system/logo-concept-a.svg", "generated-products/elevio-brand-system/logo-concept-b.svg", "generated-products/elevio-brand-system/logo-concept-c.svg"],
        }) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, view: { messages: [], companies: [], projects: [], sessions: [], outputs: [], approvals: [] } }) });
    }));

    const { container } = render(React.createElement(CeoPage));
    fireEvent.change(await screen.findByPlaceholderText("Décris ce que tu veux construire..."), { target: { value: "je veux un logo pour une compagnie qui s'appelle ELEVIO" } });
    fireEvent.click(screen.getByRole("button", { name: "Construire" }));

    expect(await screen.findByRole("heading", { name: "ELEVIO brand system" })).toBeInTheDocument();
    expect(screen.queryByText("Nouvelle Marque AI")).not.toBeInTheDocument();
    expect(container.textContent ?? "").not.toMatch(/Mission Room|autopilot|5 étapes exécutées|sessionId|projectId|workspaceId/i);
    expect(screen.getByText("logo-concept-a.svg")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ouvrir workspace/ })).toHaveAttribute("href", "/projects/elevio-brand-system");
  });

  it("keeps CEO simple view final-result-first and free of stale technical content", async () => {
    const { container } = render(React.createElement(CeoPage));
    await screen.findByText("Décris ce que tu veux construire.");
    expect(container.textContent ?? "").not.toMatch(/ELEVIO|Mission Room|autopilot|sessionId|projectId|workspaceId|À approuver|A approuver/);
    expect(container.querySelector(".right-rail")).not.toBeInTheDocument();
    expect(container.querySelector(".left-rail")).not.toBeInTheDocument();
  });
});
