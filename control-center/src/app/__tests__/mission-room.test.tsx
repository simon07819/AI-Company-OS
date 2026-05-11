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

    await waitFor(() => expect(screen.getByText(/Mission: TestProject/)).toBeInTheDocument());
    expect(screen.getByText("Conversation CEO")).toBeInTheDocument();
    expect(screen.getByText("Activite recente")).toBeInTheDocument();
    expect(screen.getByText("Equipe AI")).toBeInTheDocument();
  });

  it("shows approvals and results sections", async () => {
    render(React.createElement(MissionRoomPage));

    await waitFor(() => expect(screen.getByText("Decisions requises")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /Approuver/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Refuser/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Demander une revision/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Changer la direction/ })).toBeInTheDocument();
    expect(screen.getByText("Resultats")).toBeInTheDocument();
  });

  it("shows latest generated result controls", async () => {
    render(React.createElement(MissionRoomPage));

    await waitFor(() => expect(screen.getByText("Dernier resultat")).toBeInTheDocument());
    expect(screen.getAllByText("Design Recommendation").length).toBeGreaterThan(0);
    expect(screen.getByText("Prochaine livraison")).toBeInTheDocument();
    expect(screen.getByText("Ouvrir la preview")).toBeInTheDocument();
  });

  it("renders Recent Missions navigation", async () => {
    render(React.createElement(MissionsPage));

    await waitFor(() => expect(screen.getByText("Missions")).toBeInTheDocument());
    expect(screen.getByText("Suivez les objectifs, agents, resultats et decisions sans logs techniques.")).toBeInTheDocument();
    expect(screen.getByText(/Voir l'activite/)).toBeInTheDocument();
  });
});
