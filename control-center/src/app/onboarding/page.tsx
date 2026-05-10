"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Bot,
  Building2,
  CheckCircle2,
  DollarSign,
  ListChecks,
  Megaphone,
  Rocket,
  Save,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

type OnboardingStep =
  | "company_identity"
  | "first_workspace"
  | "default_mission_types"
  | "nvidia_runtime_check"
  | "crm_revenue_preferences"
  | "distribution_channels"
  | "autonomous_loop_preferences"
  | "finish_setup";

interface Preferences {
  companyName: string;
  companyDescription: string;
  industry: string;
  workspaceName: string;
  primaryMissionTypes: string[];
  runtimeChecked: boolean;
  crmEnabled: boolean;
  revenueEnabled: boolean;
  distributionChannels: string[];
  autonomousLoopsEnabled: boolean;
  automationLevel: "manual" | "assisted" | "autonomous";
}

interface OnboardingResponse {
  onboarding: {
    state: {
      completed: boolean;
      currentStep: OnboardingStep;
      completedSteps: OnboardingStep[];
      preferences: Preferences;
    };
    runtime: { nvidiaConfigured: boolean; provider: string };
    checklist: { step: OnboardingStep; label: string; completed: boolean }[];
  };
}

const STEPS: { id: OnboardingStep; label: string; icon: React.ReactNode }[] = [
  { id: "company_identity", label: "Company identity", icon: <Building2 size={14} /> },
  { id: "first_workspace", label: "First workspace", icon: <Sparkles size={14} /> },
  { id: "default_mission_types", label: "Mission types", icon: <Rocket size={14} /> },
  { id: "nvidia_runtime_check", label: "Runtime check", icon: <ShieldCheck size={14} /> },
  { id: "crm_revenue_preferences", label: "CRM/revenue", icon: <DollarSign size={14} /> },
  { id: "distribution_channels", label: "Distribution", icon: <Megaphone size={14} /> },
  { id: "autonomous_loop_preferences", label: "Autonomy", icon: <Bot size={14} /> },
  { id: "finish_setup", label: "Finish setup", icon: <CheckCircle2 size={14} /> },
];

const MISSION_TYPES = ["saas_project", "website", "social_campaign", "automation_workflow", "ecommerce_store", "branding_pack"];
const CHANNELS = ["internal_feed", "linkedin", "email", "blog", "x_twitter", "facebook", "instagram", "youtube"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [runtimeConfigured, setRuntimeConfigured] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<OnboardingStep>>(new Set());
  const [saving, setSaving] = useState(false);

  const activeStep = STEPS[step];
  const progress = Math.round(((step + 1) / STEPS.length) * 100);

  useEffect(() => {
    let mounted = true;
    fetch("/api/onboarding")
      .then((res) => res.json())
      .then((data: OnboardingResponse) => {
        if (!mounted) return;
        setPreferences(data.onboarding.state.preferences);
        setRuntimeConfigured(data.onboarding.runtime.nvidiaConfigured);
        setCompletedSteps(new Set(data.onboarding.state.completedSteps));
        const idx = STEPS.findIndex((item) => item.id === data.onboarding.state.currentStep);
        setStep(idx >= 0 ? idx : 0);
      })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  const checklist = useMemo(() => STEPS.map((item, index) => ({
    ...item,
    completed: completedSteps.has(item.id) || index < step,
  })), [completedSteps, step]);

  const patchPreferences = (patch: Partial<Preferences>) => {
    setPreferences((current) => current ? { ...current, ...patch } : current);
  };

  const toggleArray = (key: "primaryMissionTypes" | "distributionChannels", value: string) => {
    setPreferences((current) => {
      if (!current) return current;
      const list = current[key];
      const next = list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
      return { ...current, [key]: next };
    });
  };

  const save = async (nextStep = step) => {
    if (!preferences) return;
    setSaving(true);
    await fetch("/api/onboarding/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentStep: STEPS[nextStep].id,
        completedStep: activeStep.id,
        preferences,
      }),
    });
    setCompletedSteps((current) => new Set([...Array.from(current), activeStep.id]));
    setSaving(false);
  };

  const next = async () => {
    const nextStep = Math.min(step + 1, STEPS.length - 1);
    await save(nextStep);
    setStep(nextStep);
  };

  const complete = async () => {
    if (!preferences) return;
    setSaving(true);
    await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences }),
    });
    setSaving(false);
    router.push("/command");
  };

  if (!preferences) {
    return <div style={{ padding: 40, color: "var(--text-3)" }}>Loading onboarding...</div>;
  }

  return (
    <div style={{ padding: "32px 40px", maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", margin: 0 }}>
            <Sparkles size={22} style={{ display: "inline", marginRight: 8, verticalAlign: -4 }} />
            Setup AI Company OS
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-3)", margin: "4px 0 0" }}>Configure your company, workspace, revenue, CRM, distribution and autonomy defaults</p>
        </div>
        <button onClick={() => save(step)} disabled={saving} style={ghostButton}><Save size={12} /> Save</button>
      </div>

      <section style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 18 }}>
        <aside style={panelStyle}>
          <div style={sectionTitle}><ListChecks size={12} /> Setup checklist</div>
          <div style={{ height: 8, background: "var(--bg-2)", borderRadius: 999, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "#22c55e", borderRadius: 999 }} />
          </div>
          {checklist.map((item, index) => (
            <button key={item.id} onClick={() => setStep(index)} style={{ ...stepButton, borderColor: index === step ? "#6366f1" : "var(--border)", background: index === step ? "rgba(99,102,241,0.12)" : "var(--bg-2)" }}>
              <span style={{ color: item.completed ? "#22c55e" : index === step ? "#6366f1" : "var(--text-3)" }}>{item.completed ? <CheckCircle2 size={14} /> : item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </aside>

        <main style={panelStyle}>
          <AnimatePresence mode="wait">
            <motion.div key={activeStep.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <span style={{ color: "#6366f1" }}>{activeStep.icon}</span>
                <h2 style={{ fontSize: 18, margin: 0, color: "var(--text)" }}>{activeStep.label}</h2>
              </div>
              <StepContent
                step={activeStep.id}
                preferences={preferences}
                runtimeConfigured={runtimeConfigured}
                patchPreferences={patchPreferences}
                toggleArray={toggleArray}
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 22 }}>
                <button onClick={() => setStep(Math.max(step - 1, 0))} disabled={step === 0} style={{ ...ghostButton, opacity: step === 0 ? 0.5 : 1 }}>Back</button>
                {activeStep.id === "finish_setup" ? (
                  <button onClick={complete} disabled={saving} style={launchButton}><Zap size={13} /> Launch AI Company OS</button>
                ) : (
                  <button onClick={next} disabled={saving} style={primaryButton}>Continue <ArrowRight size={13} /></button>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      </section>
    </div>
  );
}

function StepContent({
  step,
  preferences,
  runtimeConfigured,
  patchPreferences,
  toggleArray,
}: {
  step: OnboardingStep;
  preferences: Preferences;
  runtimeConfigured: boolean;
  patchPreferences: (patch: Partial<Preferences>) => void;
  toggleArray: (key: "primaryMissionTypes" | "distributionChannels", value: string) => void;
}) {
  if (step === "company_identity") {
    return (
      <div style={cardGrid}>
        <Field label="Company name" value={preferences.companyName} onChange={(companyName) => patchPreferences({ companyName })} />
        <Field label="Industry" value={preferences.industry} onChange={(industry) => patchPreferences({ industry })} />
        <Field label="Description" value={preferences.companyDescription} onChange={(companyDescription) => patchPreferences({ companyDescription })} wide />
      </div>
    );
  }

  if (step === "first_workspace") {
    return (
      <div style={cardGrid}>
        <Field label="Workspace name" value={preferences.workspaceName} onChange={(workspaceName) => patchPreferences({ workspaceName })} />
        <Choice label="Automation level" value={preferences.automationLevel} options={["manual", "assisted", "autonomous"]} onChange={(automationLevel) => patchPreferences({ automationLevel: automationLevel as Preferences["automationLevel"] })} />
      </div>
    );
  }

  if (step === "default_mission_types") {
    return <ToggleCards items={MISSION_TYPES} selected={preferences.primaryMissionTypes} onToggle={(value) => toggleArray("primaryMissionTypes", value)} />;
  }

  if (step === "nvidia_runtime_check") {
    return (
      <div style={premiumCard}>
        <div style={{ color: runtimeConfigured ? "#22c55e" : "#f59e0b", marginBottom: 8 }}><ShieldCheck size={22} /></div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", marginBottom: 4 }}>NVIDIA runtime {runtimeConfigured ? "configured" : "not configured"}</div>
        <div style={{ fontSize: 12, color: "var(--text-3)", marginBottom: 14 }}>This check only verifies whether the provider is configured. It never displays secrets.</div>
        <label style={checkLine}>
          <input type="checkbox" checked={preferences.runtimeChecked} onChange={(e) => patchPreferences({ runtimeChecked: e.target.checked })} />
          Runtime check acknowledged
        </label>
      </div>
    );
  }

  if (step === "crm_revenue_preferences") {
    return (
      <div style={cardGrid}>
        <label style={premiumCard}><input type="checkbox" checked={preferences.crmEnabled} onChange={(e) => patchPreferences({ crmEnabled: e.target.checked })} /> Enable CRM pipeline</label>
        <label style={premiumCard}><input type="checkbox" checked={preferences.revenueEnabled} onChange={(e) => patchPreferences({ revenueEnabled: e.target.checked })} /> Enable revenue tracking</label>
      </div>
    );
  }

  if (step === "distribution_channels") {
    return <ToggleCards items={CHANNELS} selected={preferences.distributionChannels} onToggle={(value) => toggleArray("distributionChannels", value)} />;
  }

  if (step === "autonomous_loop_preferences") {
    return (
      <div style={premiumCard}>
        <label style={checkLine}>
          <input type="checkbox" checked={preferences.autonomousLoopsEnabled} onChange={(e) => patchPreferences({ autonomousLoopsEnabled: e.target.checked })} />
          Enable autonomous loops by default for compatible missions
        </label>
      </div>
    );
  }

  return (
    <div style={premiumCard}>
      <div style={{ color: "#22c55e", marginBottom: 8 }}><CheckCircle2 size={24} /></div>
      <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>Ready to launch</div>
      <div style={{ fontSize: 12, color: "var(--text-3)" }}>Your default workspace, mission defaults, CRM, revenue, distribution and autonomy preferences will be saved locally.</div>
    </div>
  );
}

function Field({ label, value, onChange, wide = false }: { label: string; value: string; onChange: (value: string) => void; wide?: boolean }) {
  return (
    <label style={{ ...premiumCard, gridColumn: wide ? "1 / -1" : undefined }}>
      <span style={fieldLabel}>{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />
    </label>
  );
}

function Choice({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div style={premiumCard}>
      <div style={fieldLabel}>{label}</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {options.map((option) => (
          <button key={option} onClick={() => onChange(option)} style={{ ...pillButton, background: value === option ? "#6366f1" : "var(--bg-2)", color: value === option ? "#fff" : "var(--text-2)" }}>{option}</button>
        ))}
      </div>
    </div>
  );
}

function ToggleCards({ items, selected, onToggle }: { items: string[]; selected: string[]; onToggle: (value: string) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 10 }}>
      {items.map((item) => {
        const active = selected.includes(item);
        return (
          <button key={item} onClick={() => onToggle(item)} style={{ ...premiumCard, textAlign: "left", cursor: "pointer", borderColor: active ? "#22c55e" : "var(--border)" }}>
            <div style={{ color: active ? "#22c55e" : "var(--text-3)", marginBottom: 6 }}>{active ? <CheckCircle2 size={16} /> : <Rocket size={16} />}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)" }}>{item.replace(/_/g, " ")}</div>
          </button>
        );
      })}
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  padding: "20px 22px",
};

const sectionTitle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 5,
  fontSize: 11,
  fontWeight: 700,
  color: "var(--text-3)",
  textTransform: "uppercase",
  letterSpacing: "0.6px",
  marginBottom: 14,
};

const stepButton: React.CSSProperties = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "9px 10px",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text-2)",
  cursor: "pointer",
  marginBottom: 7,
  fontSize: 12,
};

const premiumCard: React.CSSProperties = {
  background: "var(--bg-2)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  padding: 16,
};

const cardGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 12,
};

const fieldLabel: React.CSSProperties = {
  display: "block",
  fontSize: 10,
  color: "var(--text-3)",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  marginBottom: 8,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 11px",
  fontSize: 13,
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  color: "var(--text)",
  outline: "none",
};

const checkLine: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 13,
  color: "var(--text-2)",
};

const pillButton: React.CSSProperties = {
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "6px 10px",
  cursor: "pointer",
  fontSize: 11,
  textTransform: "capitalize",
};

const primaryButton: React.CSSProperties = {
  fontSize: 12,
  background: "#6366f1",
  color: "#fff",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "8px 14px",
  cursor: "pointer",
  fontWeight: 700,
  display: "flex",
  alignItems: "center",
  gap: 5,
};

const launchButton: React.CSSProperties = {
  ...primaryButton,
  background: "#22c55e",
};

const ghostButton: React.CSSProperties = {
  fontSize: 12,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "8px 12px",
  cursor: "pointer",
  color: "var(--text-2)",
  display: "flex",
  alignItems: "center",
  gap: 5,
};
