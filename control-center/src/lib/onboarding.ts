import fs from "fs";
import path from "path";
import { getWorkspace, updateWorkspace } from "./companyWorkspace";

const REPO_ROOT = process.cwd();
const DATA_DIR = path.join(REPO_ROOT, "data");
const ONBOARDING_PATH = path.join(DATA_DIR, "onboarding-state.json");

export type OnboardingStep =
  | "company_identity"
  | "first_workspace"
  | "default_mission_types"
  | "nvidia_runtime_check"
  | "crm_revenue_preferences"
  | "distribution_channels"
  | "autonomous_loop_preferences"
  | "finish_setup";

export interface OnboardingPreferences {
  companyName: string;
  companyDescription: string;
  industry: string;
  workspaceName: string;
  primaryMissionTypes: string[];
  runtimeChecked: boolean;
  crmEnabled: boolean;
  revenueEnabled: boolean;
  defaultCurrency: "USD";
  distributionChannels: string[];
  autonomousLoopsEnabled: boolean;
  automationLevel: "manual" | "assisted" | "autonomous";
}

export interface OnboardingState {
  completed: boolean;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  preferences: OnboardingPreferences;
  defaultWorkspaceId: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface OnboardingOverview {
  state: OnboardingState;
  runtime: {
    nvidiaConfigured: boolean;
    provider: string;
  };
  checklist: { step: OnboardingStep; label: string; completed: boolean }[];
}

const STEPS: { step: OnboardingStep; label: string }[] = [
  { step: "company_identity", label: "Company identity" },
  { step: "first_workspace", label: "First workspace" },
  { step: "default_mission_types", label: "Default mission types" },
  { step: "nvidia_runtime_check", label: "NVIDIA runtime check" },
  { step: "crm_revenue_preferences", label: "CRM/revenue preferences" },
  { step: "distribution_channels", label: "Distribution channels" },
  { step: "autonomous_loop_preferences", label: "Autonomous loop preferences" },
  { step: "finish_setup", label: "Finish setup" },
];

function defaultPreferences(): OnboardingPreferences {
  return {
    companyName: "AI Company OS",
    companyDescription: "Autonomous AI company operating system.",
    industry: "AI operations",
    workspaceName: "AI Company OS",
    primaryMissionTypes: ["saas_project", "website", "social_campaign"],
    runtimeChecked: false,
    crmEnabled: true,
    revenueEnabled: true,
    defaultCurrency: "USD",
    distributionChannels: ["internal_feed", "linkedin", "email"],
    autonomousLoopsEnabled: false,
    automationLevel: "assisted",
  };
}

function defaultState(): OnboardingState {
  const now = new Date().toISOString();
  return {
    completed: false,
    currentStep: "company_identity",
    completedSteps: [],
    preferences: defaultPreferences(),
    defaultWorkspaceId: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
  };
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readState(): OnboardingState {
  ensureDataDir();
  if (!fs.existsSync(ONBOARDING_PATH)) return defaultState();
  try {
    const parsed = JSON.parse(fs.readFileSync(ONBOARDING_PATH, "utf-8")) as Partial<OnboardingState>;
    const fallback = defaultState();
    return {
      ...fallback,
      ...parsed,
      preferences: { ...fallback.preferences, ...parsed.preferences },
      completedSteps: parsed.completedSteps ?? [],
    };
  } catch {
    return defaultState();
  }
}

function writeState(state: OnboardingState) {
  ensureDataDir();
  fs.writeFileSync(ONBOARDING_PATH, JSON.stringify(state, null, 2) + "\n", "utf-8");
}

function mergeSteps(existing: OnboardingStep[], next?: OnboardingStep): OnboardingStep[] {
  if (!next) return existing;
  return Array.from(new Set([...existing, next]));
}

export function getOnboardingState(): OnboardingState {
  return readState();
}

export function getOnboardingOverview(): OnboardingOverview {
  const state = readState();
  const completed = new Set(state.completedSteps);
  return {
    state,
    runtime: {
      nvidiaConfigured: Boolean(process.env.NVIDIA_API_KEY),
      provider: "NVIDIA API",
    },
    checklist: STEPS.map((item) => ({
      ...item,
      completed: state.completed || completed.has(item.step),
    })),
  };
}

export function saveOnboardingState(input: {
  currentStep?: OnboardingStep;
  completedStep?: OnboardingStep;
  preferences?: Partial<OnboardingPreferences>;
}): OnboardingState {
  const state = readState();
  const next: OnboardingState = {
    ...state,
    currentStep: input.currentStep ?? state.currentStep,
    completedSteps: mergeSteps(state.completedSteps, input.completedStep),
    preferences: { ...state.preferences, ...input.preferences },
    updatedAt: new Date().toISOString(),
  };
  writeState(next);
  return next;
}

export function completeOnboarding(input?: { preferences?: Partial<OnboardingPreferences> }): OnboardingState {
  const state = saveOnboardingState({
    currentStep: "finish_setup",
    completedStep: "finish_setup",
    preferences: input?.preferences,
  });
  const preferences = state.preferences;
  const workspace = getWorkspace("workspace-default");
  const updatedWorkspace = workspace
    ? updateWorkspace(workspace.id, {
        name: preferences.workspaceName || preferences.companyName,
        description: preferences.companyDescription,
        industry: preferences.industry,
        primaryMissionTypes: preferences.primaryMissionTypes,
        automationLevel: preferences.automationLevel,
        settings: {
          ...workspace.settings,
          defaultChannels: preferences.distributionChannels,
          preferredCurrency: preferences.defaultCurrency,
        },
      })
    : null;

  const completed: OnboardingState = {
    ...state,
    completed: true,
    completedSteps: STEPS.map((item) => item.step),
    defaultWorkspaceId: updatedWorkspace?.id ?? workspace?.id ?? "workspace-default",
    updatedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  };
  writeState(completed);
  return completed;
}
