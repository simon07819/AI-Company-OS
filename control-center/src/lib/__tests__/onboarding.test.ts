import { beforeEach, describe, expect, it, vi } from "vitest";

let onboardingState: Record<string, unknown> = { completed: false };
const getWorkspace = vi.fn();
const updateWorkspace = vi.fn();

vi.mock("fs", () => ({
  default: {
    mkdirSync: vi.fn(),
    existsSync: vi.fn((p: string) => p.includes("onboarding-state.json")),
    readFileSync: vi.fn((p: string) => {
      if (p.includes("onboarding-state.json")) return JSON.stringify(onboardingState);
      return "{}";
    }),
    writeFileSync: vi.fn((p: string, data: string) => {
      if (p.includes("onboarding-state.json")) {
        try { onboardingState = JSON.parse(data); } catch { /* ignore */ }
      }
    }),
  },
}));

vi.mock("@/lib/companyWorkspace", () => ({
  getWorkspace,
  updateWorkspace,
}));

describe("onboarding", () => {
  beforeEach(() => {
    onboardingState = { completed: false };
    getWorkspace.mockReset();
    updateWorkspace.mockReset();
    getWorkspace.mockReturnValue({
      id: "workspace-default",
      settings: { defaultChannels: ["internal_feed"], preferredCurrency: "USD", timezone: "America/Toronto" },
    });
    updateWorkspace.mockReturnValue({ id: "workspace-default" });
  });

  it("saves onboarding state", async () => {
    const { saveOnboardingState, getOnboardingState } = await import("@/lib/onboarding");

    const saved = saveOnboardingState({
      currentStep: "first_workspace",
      completedStep: "company_identity",
      preferences: { companyName: "Acme AI", workspaceName: "Acme HQ" },
    });

    expect(saved.currentStep).toBe("first_workspace");
    expect(saved.completedSteps).toContain("company_identity");
    expect(saved.preferences.companyName).toBe("Acme AI");
    expect(getOnboardingState().preferences.workspaceName).toBe("Acme HQ");
  });

  it("complete marks setup done and configures default workspace", async () => {
    const { completeOnboarding } = await import("@/lib/onboarding");

    const completed = completeOnboarding({
      preferences: {
        companyName: "Launch Co",
        workspaceName: "Launch Workspace",
        companyDescription: "Launch operations",
        industry: "media",
        primaryMissionTypes: ["website", "social_campaign"],
        distributionChannels: ["linkedin", "email"],
        automationLevel: "autonomous",
      },
    });

    expect(completed.completed).toBe(true);
    expect(completed.defaultWorkspaceId).toBe("workspace-default");
    expect(updateWorkspace).toHaveBeenCalledWith("workspace-default", expect.objectContaining({
      name: "Launch Workspace",
      industry: "media",
      primaryMissionTypes: ["website", "social_campaign"],
      automationLevel: "autonomous",
    }));
  });

  it("onboarding API works", async () => {
    const onboardingRoute = await import("@/app/api/onboarding/route");
    const saveRoute = await import("@/app/api/onboarding/save/route");
    const completeRoute = await import("@/app/api/onboarding/complete/route");

    const initialPayload = await (await onboardingRoute.GET()).json();
    expect(initialPayload.ok).toBe(true);
    expect(initialPayload.onboarding.state.completed).toBe(false);

    const savePayload = await (await saveRoute.POST(new Request("http://test.local/api/onboarding/save", {
      method: "POST",
      body: JSON.stringify({
        currentStep: "distribution_channels",
        completedStep: "crm_revenue_preferences",
        preferences: { distributionChannels: ["internal_feed", "linkedin"] },
      }),
    }) as never)).json();
    expect(savePayload.ok).toBe(true);
    expect(savePayload.state.currentStep).toBe("distribution_channels");

    const completePayload = await (await completeRoute.POST(new Request("http://test.local/api/onboarding/complete", {
      method: "POST",
      body: JSON.stringify({ preferences: { workspaceName: "API Workspace" } }),
    }) as never)).json();
    expect(completePayload.ok).toBe(true);
    expect(completePayload.state.completed).toBe(true);
    expect(updateWorkspace).toHaveBeenCalled();
  });
});
