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

    expect(await screen.findByRole("heading", { name: "Ce que votre agence AI fait maintenant" })).toBeInTheDocument();
    expect(screen.getByText("Ce qui se passe maintenant")).toBeInTheDocument();
    expect(screen.getAllByText("Studio Lumiere").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Logo Concept").length).toBeGreaterThan(0);
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

    expect((await screen.findAllByText("CEO AI")).length).toBeGreaterThan(0);
    expect(screen.getByText("Mode expert")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Je veux un logo/)).toBeInTheDocument();
    expect(container.querySelector(".right-rail")).not.toBeInTheDocument();
    expect(container.querySelector(".left-rail")).not.toBeInTheDocument();
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

    expect((await screen.findAllByText("CEO AI")).length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText(/Je veux un logo/)).toBeInTheDocument();
  });

  it("keeps CEO expert mode available", async () => {
    render(React.createElement(CeoExpertPage));

    expect((await screen.findAllByText("CEO Cockpit")).length).toBeGreaterThan(0);
  });

  it("renders waiting approval as ready to approve with visual action", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        view: {
          messages: [],
          companies: [{ id: "workspace-photo", name: "Studio Lumiere", type: "photography", status: "Attend ton avis", avatar: "SL", projectsCount: 1, projectIds: ["proj-logo"], hasPendingApproval: true }],
          projects: [{ id: "proj-logo", name: "Logo pour compagnie de photo", missionType: "branding_pack", status: "review", sessionId: "session-logo", workspaceId: "workspace-photo", progress: 70, outputsCount: 1, updatedAt: "2026-05-11T12:00:00.000Z" }],
          sessions: [{ sessionId: "session-logo", projectName: "Logo pour compagnie de photo", projectIdea: "", missionType: "branding_pack", businessStatus: "review", status: "waiting_approval", progress: 70, assignedAgents: [{ agentId: "frontend_agent", role: "Designer", status: "done", provider: "simulation" }], tasks: [], logs: [{ id: "log-1", timestamp: "2026-05-11T12:01:00.000Z", level: "success", agent: "ceo", message: "Generated visible output: Approval Preview", source: "visible_outputs" }], runtime: { lastEvent: "Waiting for approval", activeWorkers: 0 } }],
          outputs: [{ id: "out-logo", sessionId: "session-logo", projectId: "proj-logo", title: "Logo Concept", type: "logo_direction", summary: "Concept premium", preview: "Palette #0F172A #38BDF8", status: "review", assignedAgent: "frontend_agent", updatedAt: "2026-05-11T12:02:00.000Z", visualPreview: { kind: "brand_card", logoText: "SL", tagline: "Capture the light", colors: ["#0F172A", "#38BDF8", "#F8FAFC", "#F59E0B"], typography: { heading: "Inter Bold", body: "Inter Regular" }, mockup: { title: "Studio Lumiere", subtitle: "Photo", blocks: ["Premium", "Lumineux", "Moderne"] } } }],
          approvals: [{ item: { id: "output-out-logo", title: "Logo Concept", type: "logo", status: "pending", agentId: "frontend_agent", agentName: "Designer", sessionId: "session-logo", missionType: "branding_pack", createdAt: "2026-05-11T12:02:00.000Z", summary: "Concept premium", hasPreviewContent: true, previewType: "output_list" }, preview: null, canApprove: true, visualPreview: { kind: "brand_card", logoText: "SL", tagline: "Capture the light", colors: ["#0F172A", "#38BDF8", "#F8FAFC", "#F59E0B"], typography: { heading: "Inter Bold", body: "Inter Regular" }, mockup: { title: "Studio Lumiere", subtitle: "Photo", blocks: ["Premium", "Lumineux", "Moderne"] } } }],
          logs: [],
        },
      }),
    })));

    render(React.createElement(CeoPage));

    expect(await screen.findByRole("heading", { name: "Logo Concept — Studio Lumiere" })).toBeInTheDocument();
    expect(screen.getAllByText("Prêt").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: /Accepter/ }).length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByRole("button", { name: /Modifier/ }).length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByRole("button", { name: /Refaire/ }).length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText(/Mission Room/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/autopilot/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: /Accepter/ })[0]);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/approvals/output-out-logo/approve", { method: "POST" });
    });
  });

  it("renders ELEVIO logo request as brand-aware central concepts", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        view: {
          messages: [
            { id: "msg-user", role: "user", text: "je veux un logo pour une compagnie qui s'appelle ELEVIO", timestamp: "2026-05-11T12:00:00.000Z" },
            { id: "msg-ceo", role: "ceo", text: "Parfait. Je prépare un premier concept de logo pour ELEVIO.\nMission créée — ouvrir la Mission Room\n5 étapes exécutées automatiquement. autopilot", timestamp: "2026-05-11T12:00:02.000Z" },
          ],
          companies: [{ id: "workspace-elevio", name: "ELEVIO", type: "construction verticale / élévateurs", status: "Attend ton avis", avatar: "EL", projectsCount: 1, projectIds: ["proj-elevio"], hasPendingApproval: true }],
          projects: [{ id: "proj-elevio", name: "Logo ELEVIO", missionType: "branding_pack", status: "review", sessionId: "session-elevio", workspaceId: "workspace-elevio", progress: 70, outputsCount: 1, updatedAt: "2026-05-11T12:00:00.000Z" }],
          sessions: [{ sessionId: "session-elevio", projectName: "Logo ELEVIO", projectIdea: "", missionType: "branding_pack", businessStatus: "review", status: "waiting_approval", progress: 70, assignedAgents: [], tasks: [], logs: [], runtime: { lastEvent: "Waiting for approval", activeWorkers: 0 } }],
          outputs: [{ id: "out-elevio", sessionId: "session-elevio", projectId: "proj-elevio", title: "Logo Concept", type: "logo_direction", summary: "Concept premium", preview: "Palette #0F172A #38BDF8", status: "review", assignedAgent: "frontend_agent", updatedAt: "2026-05-11T12:02:00.000Z", visualPreview: { kind: "brand_card", logoText: "NM", tagline: "Generic", colors: ["#0F172A", "#38BDF8"], typography: { heading: "Inter Bold", body: "Inter Regular" }, mockup: { title: "Nouvelle Marque AI", subtitle: "Generic", blocks: ["Generic"] } } }],
          approvals: [{ item: { id: "output-out-elevio", title: "Logo Concept", type: "logo", status: "pending", agentId: "frontend_agent", agentName: "Designer", sessionId: "session-elevio", missionType: "branding_pack", createdAt: "2026-05-11T12:02:00.000Z", summary: "Concept premium", hasPreviewContent: true, previewType: "output_list" }, preview: null, canApprove: true, visualPreview: null }],
          logs: [],
        },
      }),
    })));

    const { container } = render(React.createElement(CeoPage));

    expect(await screen.findByRole("heading", { name: "Logo Concept — ELEVIO" })).toBeInTheDocument();
    expect(screen.queryByText("Nouvelle Marque AI")).not.toBeInTheDocument();
    expect(container.textContent ?? "").not.toMatch(/Mission Room|autopilot|5 étapes exécutées|sessionId|projectId|workspaceId/i);
    expect(screen.getByText("A. Premium construction tech")).toBeInTheDocument();
    expect(screen.getByText("B. Fast vertical movement / elevator signal")).toBeInTheDocument();
    expect(screen.getByText("C. Safety + reliability")).toBeInTheDocument();
    expect(screen.getAllByText("Concept visuel généré en prototype")).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: /Accepter/ })).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: /Modifier/ })).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: /Refaire/ })).toHaveLength(3);
  });

  it("reject workflow asks for changes and calls the existing approval route", async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) => {
      if (String(url).includes("/reject")) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }) });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          view: {
            messages: [],
            companies: [],
            projects: [],
            sessions: [],
            outputs: [],
            approvals: [{ item: { id: "output-out-logo", title: "Logo Concept", type: "logo", status: "pending", agentId: "frontend_agent", agentName: "Designer", sessionId: "session-logo", createdAt: "2026-05-11T12:02:00.000Z", summary: "Concept premium", hasPreviewContent: true, previewType: "output_list" }, preview: null, canApprove: true, visualPreview: { kind: "brand_card", logoText: "SL", colors: ["#0F172A", "#38BDF8", "#F8FAFC", "#F59E0B"] } }],
            logs: [],
          },
        }),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(React.createElement(CeoPage));
    fireEvent.click((await screen.findAllByRole("button", { name: /Modifier/ }))[0]);
    fireEvent.change(screen.getByPlaceholderText(/plus luxe/), { target: { value: "Je veux quelque chose de plus luxe et minimaliste" } });
    fireEvent.click(screen.getByText("Envoyer la modification"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/approvals/output-out-logo/reject", expect.objectContaining({
        method: "POST",
      }));
    });
    const rejectCall = fetchMock.mock.calls.find(([url]) => String(url).includes("/reject"));
    expect(String(rejectCall?.[1]?.body)).toContain("plus luxe et minimaliste");
  });

  it("keeps CEO simple view final-result-first and free of stale technical content", async () => {
    const { container } = render(React.createElement(CeoPage));
    await screen.findByText("Demande, reçois, décide.");
    expect(container.textContent ?? "").not.toMatch(/ELEVIO|Mission Room|autopilot|sessionId|projectId|workspaceId|À approuver|A approuver/);
    expect(container.querySelector(".right-rail")).not.toBeInTheDocument();
    expect(container.querySelector(".left-rail")).not.toBeInTheDocument();
  });
});
