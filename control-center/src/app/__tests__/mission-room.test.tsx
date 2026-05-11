import { render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it } from "vitest";
import MissionRoomPage from "@/app/mission/[missionId]/page";
import MissionsPage from "@/app/mission/page";

describe("Mission Room experience", () => {
  beforeEach(() => {
    globalThis.__TEST_PATHNAME__ = "/mission/ap-test123";
  });

  it("renders the guided mission room layout", async () => {
    render(React.createElement(MissionRoomPage));

    await waitFor(() => expect(screen.getByText(/Mission Room: TestProject/)).toBeInTheDocument());
    expect(screen.getByText("CEO Conversation")).toBeInTheDocument();
    expect(screen.getByText("Live Timeline")).toBeInTheDocument();
    expect(screen.getByText("Executive Team")).toBeInTheDocument();
  });

  it("shows approvals and results sections", async () => {
    render(React.createElement(MissionRoomPage));

    await waitFor(() => expect(screen.getByText("Decisions Required")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Approve/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reject/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ask Revision/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Change Direction/ })).toBeInTheDocument();
    expect(screen.getByText("Results")).toBeInTheDocument();
  });

  it("shows latest generated result controls", async () => {
    render(React.createElement(MissionRoomPage));

    await waitFor(() => expect(screen.getByText("Latest generated result")).toBeInTheDocument());
    expect(screen.getAllByText("Design Recommendation").length).toBeGreaterThan(0);
    expect(screen.getByText("Next expected output")).toBeInTheDocument();
    expect(screen.getByText("Open latest preview")).toBeInTheDocument();
  });

  it("renders Recent Missions navigation", async () => {
    render(React.createElement(MissionsPage));

    await waitFor(() => expect(screen.getByText("Mission Rooms")).toBeInTheDocument());
    expect(screen.getByText("Suivez les objectifs, agents, resultats et decisions sans logs techniques.")).toBeInTheDocument();
    expect(screen.getByText(/Voir l'activite/)).toBeInTheDocument();
  });
});
