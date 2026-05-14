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

    expect(await screen.findByRole("heading", { name: "Que voulez-vous créer aujourd’hui?" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Tapez votre demande ici...")).toBeInTheDocument();
    expect(screen.getByText(/rendu final et l’équipe/)).toBeInTheDocument();
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
    expect(screen.getAllByText("Resultat prêt dans le chat CEO").length).toBeGreaterThan(0);
    expect(screen.queryByText("Resultat pret - approbation requise")).not.toBeInTheDocument();
  });

  it("keeps approval inbox masked in the simple workspace", async () => {
    render(React.createElement(ApprovalsPage));

    expect(await screen.findByRole("heading", { name: "Decisions a prendre" })).toBeInTheDocument();
    expect(screen.getByText("Panneau d’approbation masqué")).toBeInTheDocument();
    expect(screen.queryByText("Pret a approuver")).not.toBeInTheDocument();
    expect(screen.queryByText("Approuver")).not.toBeInTheDocument();
    expect(screen.queryByText("Demander des changements")).not.toBeInTheDocument();
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
    const pages = [DashboardPage, CompaniesPage, ProjectsPage, AgentsPage, OutputsPage, WorkspacesPage];
    for (const Page of pages) {
      const { unmount, container } = render(React.createElement(Page));
      await screen.findByText(Page === DashboardPage ? "Que voulez-vous créer aujourd’hui?" : "Parler au CEO");
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

    expect((await screen.findAllByText("CEO")).length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText("Message")).toBeInTheDocument();
    expect(screen.getByLabelText("Chat CEO")).toBeInTheDocument();
    expect(screen.queryByText(/Décris ce que tu veux construire/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Production IA active/)).not.toBeInTheDocument();
    expect(container.querySelector(".sidebar")).not.toBeInTheDocument();
    expect(container.querySelector(".right-rail")).not.toBeInTheDocument();
    expect(container.querySelector(".left-rail")).not.toBeInTheDocument();
  });

  it("renders CEO inside desktop shell without WordPress sidebar or permanent rails", async () => {
    globalThis.__TEST_PATHNAME__ = "/ceo";
    const { container } = render(React.createElement(AppShell, null, React.createElement(CeoPage)));

    expect(await screen.findByLabelText("Chat CEO")).toBeInTheDocument();
    expect(container.querySelector(".desktop-os-shell")).toBeInTheDocument();
    expect(container.querySelector(".os-dock")).toBeInTheDocument();
    expect(container.querySelector(".platform-sidebar")).toBeInTheDocument();
    for (const label of ["Accueil", "CEO Chat", "Projets", "Agents", "Outputs", "Expert Mode"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    for (const hiddenLabel of ["Workspaces", "Artifacts", "Skills", "Evals", "Settings", "Approvals"]) {
      expect(screen.queryByRole("link", { name: hiddenLabel })).not.toBeInTheDocument();
    }
    expect(container.querySelector(".right-rail")).not.toBeInTheDocument();
    expect(container.textContent ?? "").not.toMatch(/Décris ce que tu veux construire|Production IA active|Mode simple|Conversation CEO/i);
  });

  it("renders the global dark mode toggle and stores the preference", () => {
    globalThis.__TEST_PATHNAME__ = "/ceo";
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

    const toggle = screen.getByRole("button", { name: /mode clair/i });
    fireEvent.click(toggle);

    expect(document.documentElement.dataset.theme).toBe("light");
    expect(store.get("ai-company-os-theme")).toBe("light");
    expect(screen.getByRole("button", { name: /mode sombre/i })).toBeInTheDocument();
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

    expect((await screen.findAllByText("CEO")).length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText("Message")).toBeInTheDocument();
    expect(screen.queryByText(/Conversation CEO/)).not.toBeInTheDocument();
  });

  it("keeps CEO expert mode available", async () => {
    render(React.createElement(CeoExpertPage));

    expect((await screen.findAllByText("CEO Cockpit")).length).toBeGreaterThan(0);
  });

  it("renders submitted ELEVIO branding as a simple final CEO answer", async () => {
    vi.stubGlobal("fetch", vi.fn((url: string) => {
      if (String(url).includes("/api/ceo/command")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({
          ok: true,
          title: "Logo ELEVIO",
          brandName: "ELEVIO",
          deliverableType: "logo",
          shortMessage: "Voici une première version du logo ELEVIO.",
          primaryArtifactId: "artifact-elevio-logo",
          primaryVisual: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 240" role="img" aria-label="Logo ELEVIO"><rect width="400" height="240" fill="#030712"/><path d="M92 82h72M92 120h54M92 158h72" stroke="#fff" stroke-width="18" stroke-linecap="round"/><text x="220" y="137" fill="#fff" font-size="52" font-weight="900">ELEVIO</text></svg>`,
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
    fireEvent.change(await screen.findByPlaceholderText("Message"), { target: { value: "je veux un logo pour une compagnie qui s'appelle ELEVIO" } });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));

    expect(await screen.findByText("ELEVIO")).toBeInTheDocument();
    expect(screen.queryByText("Voici une première version du logo ELEVIO.")).not.toBeInTheDocument();
    expect(screen.queryByText("Nouvelle Marque AI")).not.toBeInTheDocument();
    expect(container.textContent ?? "").not.toMatch(/Brand system|Marque à nommer|Prototype visuel|Mission Room|autopilot|5 étapes exécutées|sessionId|projectId|workspaceId|90\/100/i);
    expect(screen.queryByText(/^LOGO$/i)).not.toBeInTheDocument();
    expect(screen.queryByText("logo-concept-a.svg")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Ouvrir workspace/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Voir travail de l’équipe/ }));
    expect(screen.getByRole("link", { name: /Ouvrir workspace/ })).toHaveAttribute("href", "/projects/elevio-brand-system");
    expect(screen.getByText("logo-concept-a.svg")).toBeInTheDocument();
  });

  it("keeps CEO simple view final-result-first and free of stale technical content", async () => {
    const { container } = render(React.createElement(CeoPage));
    await screen.findByPlaceholderText("Message");
    expect(container.textContent ?? "").not.toMatch(/ELEVIO|Mission Room|autopilot|sessionId|projectId|workspaceId|À approuver|A approuver/);
    expect(container.textContent ?? "").not.toMatch(/Décris ce que tu veux construire|Conversation CEO|Production IA active/);
    expect(container.querySelector(".right-rail")).not.toBeInTheDocument();
    expect(container.querySelector(".left-rail")).not.toBeInTheDocument();
  });
});
