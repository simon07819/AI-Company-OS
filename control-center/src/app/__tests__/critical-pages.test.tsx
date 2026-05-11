import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import AgentsPage from "@/app/agents/page";
import AutopilotPage from "@/app/autopilot/page";
import DashboardPage from "@/app/page";
import CompaniesPage from "@/app/companies/page";
import ProjectsPage from "@/app/projects/page";
import ApprovalsPage from "@/app/approvals/page";
import FactoryPage from "@/app/factory/page";
import LogsPage from "@/app/logs/page";
import RuntimePage from "@/app/runtime/page";
import SettingsPage from "@/app/settings/page";
import CeoPage from "@/app/ceo/page";
import ArchivePage from "@/app/archive/page";

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
    render(React.createElement(CeoPage));

    expect(await screen.findByText("AI Company OS")).toBeInTheDocument();
    expect(screen.getByText("CEO AI en ligne")).toBeInTheDocument();
    expect(screen.getByText("Mode expert")).toBeInTheDocument();
    expect(screen.getByText("Mes entreprises")).toBeInTheDocument();
    expect(screen.getByText("Agents au travail")).toBeInTheDocument();
  });

  it("renders global archive page", async () => {
    render(React.createElement(ArchivePage));

    expect(screen.getByText("Global Archive")).toBeInTheDocument();
    expect(await screen.findByText("Archived Project")).toBeInTheDocument();
  });

  it("renders CEO simple agency conversation", async () => {
    render(React.createElement(CeoPage));

    expect((await screen.findAllByText("CEO AI")).length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText(/Ecris au CEO AI/)).toBeInTheDocument();
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

    expect((await screen.findAllByText("Studio Lumiere")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pret a approuver").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Resultat pret - approbation requise").length).toBeGreaterThan(0);
    expect(screen.getByText("Les agents ont prepare un premier resultat. Valide-le ou demande des changements.")).toBeInTheDocument();
    expect(screen.getAllByText("Approuver").length).toBeGreaterThan(0);
    expect(screen.getByText("Demander des changements")).toBeInTheDocument();
    fireEvent.click(screen.getAllByText("Approuver")[0]);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/approvals/output-out-logo/approve", { method: "POST" });
    });
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
    fireEvent.click(await screen.findByText("Demander des changements"));
    fireEvent.change(screen.getByPlaceholderText(/plus luxe/), { target: { value: "Je veux quelque chose de plus luxe et minimaliste" } });
    fireEvent.click(screen.getByText("Envoyer la demande"));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/approvals/output-out-logo/reject", expect.objectContaining({
        method: "POST",
      }));
    });
    const rejectCall = fetchMock.mock.calls.find(([url]) => String(url).includes("/reject"));
    expect(String(rejectCall?.[1]?.body)).toContain("plus luxe et minimaliste");
  });
});
