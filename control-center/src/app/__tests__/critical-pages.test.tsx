import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import AgentsPage from "@/app/agents/page";
import AutopilotPage from "@/app/autopilot/page";
import FactoryPage from "@/app/factory/page";
import LogsPage from "@/app/logs/page";
import RuntimePage from "@/app/runtime/page";
import SettingsPage from "@/app/settings/page";

// Mock components that fetch data
vi.mock("@/components/AutopilotPanel", () => ({
  default: () => React.createElement("div", { "data-testid": "autopilot-panel" }, "Autopilot Panel"),
}));

vi.mock("@/components/AutopilotSessionBanner", () => ({
  default: () => React.createElement("div", { "data-testid": "autopilot-session-banner" }, "Session Banner"),
}));

describe("critical Control Center pages", () => {
  it("renders Settings without crashing", () => {
    render(React.createElement(SettingsPage));

    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
    expect(screen.getByText("NVIDIA Provider")).toBeInTheDocument();
    expect(screen.getByText("Operational Checklist")).toBeInTheDocument();
  });

  it("renders Runtime without crashing", () => {
    render(React.createElement(RuntimePage));

    expect(screen.getByRole("heading", { name: "NVIDIA Agent Execution Center" })).toBeInTheDocument();
    expect(screen.getByText("Live Provider Execution")).toBeInTheDocument();
    expect(screen.getByText("Agent Execution Cards")).toBeInTheDocument();
  });

  it("renders Agents without crashing", () => {
    render(React.createElement(AgentsPage));

    expect(screen.getByRole("heading", { name: "AI Team Command Center" })).toBeInTheDocument();
    expect(screen.getByText("Product Agent")).toBeInTheDocument();
    expect(screen.getByText("NVIDIA API")).toBeInTheDocument();
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
});
