import { render, screen, within } from "@testing-library/react";
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
    const scope = within(sidebar as HTMLElement);
    for (const label of ["CEO Chat", "Missions", "Agents", "Workspaces", "Artifacts", "Skills", "Evals", "Settings"]) {
      expect(scope.getByRole("link", { name: label })).toBeInTheDocument();
    }

    expect(await screen.findByLabelText("Chat CEO")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Message")).toBeInTheDocument();
    expect(container.textContent ?? "").not.toMatch(/Décris ce que tu veux construire|Production IA active|Mode simple|Conversation CEO/i);
  });
});
