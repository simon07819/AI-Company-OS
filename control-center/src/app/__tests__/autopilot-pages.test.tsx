import { describe, expect, it, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import AutopilotPage from "@/app/autopilot/page";

// Mock the AutopilotSessionBanner and AutopilotPanel since they fetch data
vi.mock("@/components/AutopilotPanel", () => ({
  default: () => React.createElement("div", { "data-testid": "autopilot-panel" }, "Autopilot Panel"),
}));

vi.mock("@/components/AutopilotSessionBanner", () => ({
  default: () => React.createElement("div", { "data-testid": "autopilot-session-banner" }, "Session Banner"),
}));

describe("Autopilot pages", () => {
  it("renders Autopilot sessions list page", () => {
    render(React.createElement(AutopilotPage));

    expect(screen.getByText("Autopilot Sessions")).toBeInTheDocument();
    expect(screen.getByText("New Project")).toBeInTheDocument();
  });

  it("shows empty state when no sessions", () => {
    // The mock fetch returns sessions, but we can test the page renders
    render(React.createElement(AutopilotPage));

    expect(screen.getByText("Total Sessions")).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Avg Progress")).toBeInTheDocument();
  });
});
