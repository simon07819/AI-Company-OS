"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Award,
  BarChart3,
  Brain,
  Edit3,
  Palette,
  Power,
  RotateCcw,
  Save,
  Settings,
  Shield,
  Sparkles,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import {
  Panel,
  SectionHeader,
  GhostButton,
  PrimaryButton,
  LocalBadge,
  SimBadge,
  NvidiaLiveBadge,
  ErrorBanner,
  StatusBadge,
} from "@/components/ui";
import { type AgentId, type CreativeStyle, getLevelTitle, getXpToNextLevel, CREATIVE_STANDARDS } from "@/lib/agentTypes";

// ─── Types ────────────────────────────────────────────────────────────────

interface AgentProfile {
  agentId: AgentId;
  firstName: string; lastName: string; displayName: string;
  role: string; title: string;
  avatarEmoji: string; avatarColor: string;
  personality: string; expertise: string[];
  strengths: string[]; weaknesses: string[];
  yearsExperience: number; reputationScore: number;
  specialization: string; visualStyle: CreativeStyle;
  tone: string; preferredWorkflows: string[];
  systemPrompt: string; creativityLevel: number;
  communicationStyle: string; online: boolean;
  currentlyWorkingOn: string | null; expertiseBadges: string[];
}

interface AgentMemory {
  agentId: AgentId; xp: number; level: number;
  successfulProjects: number; approvalRate: number;
  clientSatisfaction: number; missionHistory: string[];
  learnedPreferences: Record<string, string>;
  brandingKnowledge: string[]; stylePreferences: string[];
  decisionHistory: { decision: string; outcome: string; timestamp: string }[];
  lastActive: string;
}

interface AgentCareer {
  agentId: AgentId; totalMissions: number;
  completedMissions: number; failedMissions: number;
  averageDeliveryTime: number;
  specialties: { name: string; level: number }[];
  awards: { name: string; earnedAt: string }[];
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function AgentProfilePage() {
  // Get agentId from URL
  const [agentId, setAgentId] = useState<string | null>(null);
  const [profile, setProfile] = useState<AgentProfile | null>(null);
  const [memory, setMemory] = useState<AgentMemory | null>(null);
  const [career, setCareer] = useState<AgentCareer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [runtimeMode, setRuntimeMode] = useState<"nvidia" | "simulation">("simulation");

  // Editable fields
  const [editSystemPrompt, setEditSystemPrompt] = useState("");
  const [editCreativity, setEditCreativity] = useState(50);
  const [editTone, setEditTone] = useState("");
  const [editVisualStyle, setEditVisualStyle] = useState<CreativeStyle>("minimalist_premium");
  const [editPersonality, setEditPersonality] = useState("");
  const [editWorkflows, setEditWorkflows] = useState("");
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editStrengths, setEditStrengths] = useState("");
  const [editWeaknesses, setEditWeaknesses] = useState("");
  const [editCommunicationStyle, setEditCommunicationStyle] = useState("");
  const [editAvatarEmoji, setEditAvatarEmoji] = useState("");
  const [editAvatarColor, setEditAvatarColor] = useState("");
  const [editSpecialization, setEditSpecialization] = useState("");
  const [editOnline, setEditOnline] = useState(true);
  const [editStatus, setEditStatus] = useState<"available" | "busy" | "offline">("available");
  const [editWorkingOn, setEditWorkingOn] = useState("");
  const [editExpertiseBadges, setEditExpertiseBadges] = useState("");

  useEffect(() => {
    // Extract agentId from URL path
    const pathParts = window.location.pathname.split("/");
    const id = pathParts[pathParts.length - 1];
    if (id) setAgentId(id);
  }, []);

  const loadData = async () => {
    if (!agentId) return;
    try {
      const res = await fetch(`/api/agents/${agentId}`);
      if (res.ok) {
        const d = await res.json();
        setProfile(d.profile);
        setMemory(d.memory);
        setCareer(d.career);
        // Set editable fields
        if (d.profile) {
          setEditSystemPrompt(d.profile.systemPrompt ?? "");
          setEditCreativity(d.profile.creativityLevel ?? 50);
          setEditTone(d.profile.tone ?? "");
          setEditVisualStyle(d.profile.visualStyle ?? "minimalist_premium");
          setEditPersonality(d.profile.personality ?? "");
          setEditWorkflows((d.profile.preferredWorkflows ?? []).join(", "));
          setEditName(d.profile.name ?? `${d.profile.firstName} ${d.profile.lastName}`);
          setEditBio(d.profile.bio ?? "");
          setEditDepartment(d.profile.department ?? "");
          setEditStrengths((d.profile.strengths ?? []).join(", "));
          setEditWeaknesses((d.profile.weaknesses ?? []).join(", "));
          setEditCommunicationStyle(d.profile.communicationStyle ?? "");
          setEditAvatarEmoji(d.profile.avatarEmoji ?? "");
          setEditAvatarColor(d.profile.avatarColor ?? "#6366f1");
          setEditSpecialization(d.profile.specialization ?? "");
          setEditOnline(d.profile.online ?? true);
          setEditStatus(d.profile.status ?? "available");
          setEditWorkingOn(d.profile.currentlyWorkingOn ?? "");
          setEditExpertiseBadges((d.profile.expertiseBadges ?? []).join(", "));
        }
        setError(null);
      } else {
        setError("Agent not found");
      }
    } catch { setError("Failed to load agent"); }
  };

  useEffect(() => { loadData(); fetch("/api/runtime-mode").then((r) => r.json()).then((d) => { if (d.ok) setRuntimeMode(d.mode === "nvidia" ? "nvidia" : "simulation"); }).catch(() => {}); }, [agentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!agentId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: editSystemPrompt,
          creativityLevel: editCreativity,
          tone: editTone,
          visualStyle: editVisualStyle,
          personality: editPersonality,
          preferredWorkflows: editWorkflows.split(",").map((w: string) => w.trim()).filter(Boolean),
          name: editName,
          bio: editBio,
          department: editDepartment,
          strengths: editStrengths.split(",").map((w: string) => w.trim()).filter(Boolean),
          weaknesses: editWeaknesses.split(",").map((w: string) => w.trim()).filter(Boolean),
          communicationStyle: editCommunicationStyle,
          avatarEmoji: editAvatarEmoji,
          avatarColor: editAvatarColor,
          specialization: editSpecialization,
          online: editOnline,
          status: editStatus,
          currentlyWorkingOn: editWorkingOn || null,
          expertiseBadges: editExpertiseBadges.split(",").map((w: string) => w.trim()).filter(Boolean),
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setProfile(d.profile);
        setMemory(d.memory);
        setCareer(d.career);
        setEditing(false);
      }
    } catch { /* */ }
    setSaving(false);
  };

  if (error) return <div style={{ padding: 40, color: "var(--text-3)", textAlign: "center" }}><ErrorBanner message={error} onRetry={loadData} /></div>;
  if (!profile) return <div style={{ padding: 40, color: "var(--text-3)", textAlign: "center" }}>Loading…</div>;

  const xpInfo = memory ? getXpToNextLevel(memory.xp) : { current: 0, needed: 500, progress: 0 };
  const levelTitle = memory ? getLevelTitle(memory.level) : "Junior";
  const applicableStandards = CREATIVE_STANDARDS.filter((s) => s.applicableAgents.includes(profile.agentId as AgentId));

  return (
    <div style={{ padding: "20px 24px", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <a href="/conversations" style={{ color: "var(--text-3)", textDecoration: "none" }}><ArrowLeft size={16} /></a>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: `${profile.avatarColor}22`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22,
        }}>{profile.avatarEmoji}</div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "var(--text)" }}>{profile.firstName} {profile.lastName}</h1>
          <div style={{ fontSize: 12, color: "var(--text-3)" }}>{profile.title}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
          <StatusBadge label={profile.online ? "Online" : "Offline"} color={profile.online ? "#22c55e" : "#ef4444"} size="xs" />
          <LocalBadge />
          {runtimeMode === "nvidia" ? <NvidiaLiveBadge /> : <SimBadge />}
          {!editing ? (
            <>
              <GhostButton onClick={() => setEditing(true)}><Edit3 size={11} /> Edit</GhostButton>
              <GhostButton onClick={async () => {
                if (!agentId) return;
                const res = await fetch(`/api/agents/${agentId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ online: !profile.online, status: profile.online ? "offline" : "available" }),
                });
                if (res.ok) { const d = await res.json(); setProfile(d.profile); setMemory(d.memory); setCareer(d.career); }
              }}><Power size={11} /> {profile.online ? "Deactivate" : "Activate"}</GhostButton>
              <GhostButton onClick={async () => {
                if (!agentId || !confirm("Reset agent to default profile?")) return;
                const res = await fetch(`/api/agents/${agentId}`, { method: "DELETE" });
                if (res.ok) { const d = await res.json(); setProfile(d.profile); setMemory(d.memory); setCareer(d.career); setEditSystemPrompt(d.profile.systemPrompt ?? ""); setEditCreativity(d.profile.creativityLevel ?? 50); setEditTone(d.profile.tone ?? ""); setEditVisualStyle(d.profile.visualStyle ?? "minimalist_premium"); setEditPersonality(d.profile.personality ?? ""); setEditWorkflows((d.profile.preferredWorkflows ?? []).join(", ")); setEditName(d.profile.name ?? ""); setEditBio(d.profile.bio ?? ""); setEditDepartment(d.profile.department ?? ""); setEditStrengths((d.profile.strengths ?? []).join(", ")); setEditWeaknesses((d.profile.weaknesses ?? []).join(", ")); setEditCommunicationStyle(d.profile.communicationStyle ?? ""); setEditAvatarEmoji(d.profile.avatarEmoji ?? ""); setEditAvatarColor(d.profile.avatarColor ?? "#6366f1"); setEditSpecialization(d.profile.specialization ?? ""); setEditOnline(d.profile.online ?? true); setEditStatus(d.profile.status ?? "available"); setEditWorkingOn(d.profile.currentlyWorkingOn ?? ""); setEditExpertiseBadges((d.profile.expertiseBadges ?? []).join(", ")); }
              }}><RotateCcw size={11} /> Reset</GhostButton>
            </>
          ) : (
            <>
              <GhostButton onClick={() => setEditing(false)}>Cancel</GhostButton>
              <PrimaryButton onClick={handleSave} disabled={saving} color="#3b82f6">
                <Save size={11} /> {saving ? "Saving…" : "Save"}
              </PrimaryButton>
            </>
          )}
        </div>
      </div>

      {/* 2-Column Layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 16 }}>

        {/* ── LEFT: Profile + Settings ── */}
        <div style={{ display: "grid", gap: 16 }}>
          {/* Profile Card */}
          <Panel>
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: `${profile.avatarColor}22`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 28, flexShrink: 0,
              }}>{profile.avatarEmoji}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>{profile.displayName}</div>
                <div style={{ fontSize: 12, color: profile.avatarColor, fontWeight: 600 }}>{profile.specialization}</div>
                <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 4 }}>{profile.personality}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                  {profile.expertiseBadges.map((b) => (
                    <span key={b} style={{ padding: "2px 8px", fontSize: 9, fontWeight: 600, background: `${profile.avatarColor}15`, color: profile.avatarColor, borderRadius: 4 }}>{b}</span>
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          {/* Strengths / Weaknesses */}
          <Panel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <SectionHeader title="Strengths" icon={<Zap size={11} style={{ color: "#22c55e" }} />} />
                {profile.strengths.map((s) => (
                  <div key={s} style={{ fontSize: 11, color: "var(--text)", padding: "3px 0" }}>✓ {s}</div>
                ))}
              </div>
              <div>
                <SectionHeader title="Weaknesses" icon={<Shield size={11} style={{ color: "#f59e0b" }} />} />
                {profile.weaknesses.map((w) => (
                  <div key={w} style={{ fontSize: 11, color: "var(--text-3)", padding: "3px 0" }}>△ {w}</div>
                ))}
              </div>
            </div>
          </Panel>

          {/* Settings (editable) */}
          <Panel>
            <SectionHeader title="Agent Settings" icon={<Settings size={12} />} />
            <div style={{ display: "grid", gap: 12 }}>
              {/* Name */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 3 }}>Full Name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={!editing}
                  style={{
                    width: "100%", padding: "6px 10px", fontSize: 11,
                    background: editing ? "var(--bg-2)" : "transparent",
                    border: editing ? "1px solid var(--border)" : "1px solid transparent",
                    borderRadius: 6, color: "var(--text)", outline: "none",
                  }}
                />
              </div>

              {/* Bio */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 3 }}>Bio</label>
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  disabled={!editing}
                  style={{
                    width: "100%", padding: "8px 10px", fontSize: 11, lineHeight: 1.5,
                    background: editing ? "var(--bg-2)" : "transparent",
                    border: editing ? "1px solid var(--border)" : "1px solid transparent",
                    borderRadius: 6, color: "var(--text)", outline: "none",
                    minHeight: 60, resize: "vertical",
                  }}
                />
              </div>

              {/* Department */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 3 }}>Department</label>
                <input
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  disabled={!editing}
                  style={{
                    width: "100%", padding: "6px 10px", fontSize: 11,
                    background: editing ? "var(--bg-2)" : "transparent",
                    border: editing ? "1px solid var(--border)" : "1px solid transparent",
                    borderRadius: 6, color: "var(--text)", outline: "none",
                  }}
                />
              </div>

              {/* Specialization */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 3 }}>Specialization</label>
                <input
                  value={editSpecialization}
                  onChange={(e) => setEditSpecialization(e.target.value)}
                  disabled={!editing}
                  style={{
                    width: "100%", padding: "6px 10px", fontSize: 11,
                    background: editing ? "var(--bg-2)" : "transparent",
                    border: editing ? "1px solid var(--border)" : "1px solid transparent",
                    borderRadius: 6, color: "var(--text)", outline: "none",
                  }}
                />
              </div>

              {/* Communication Style */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 3 }}>Communication Style</label>
                <input
                  value={editCommunicationStyle}
                  onChange={(e) => setEditCommunicationStyle(e.target.value)}
                  disabled={!editing}
                  style={{
                    width: "100%", padding: "6px 10px", fontSize: 11,
                    background: editing ? "var(--bg-2)" : "transparent",
                    border: editing ? "1px solid var(--border)" : "1px solid transparent",
                    borderRadius: 6, color: "var(--text)", outline: "none",
                  }}
                />
              </div>

              {/* Strengths */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 3 }}>Strengths (comma-separated)</label>
                <input
                  value={editStrengths}
                  onChange={(e) => setEditStrengths(e.target.value)}
                  disabled={!editing}
                  placeholder="e.g. vision long terme, coordination"
                  style={{
                    width: "100%", padding: "6px 10px", fontSize: 11,
                    background: editing ? "var(--bg-2)" : "transparent",
                    border: editing ? "1px solid var(--border)" : "1px solid transparent",
                    borderRadius: 6, color: "var(--text)", outline: "none",
                  }}
                />
              </div>

              {/* Weaknesses */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 3 }}>Weaknesses (comma-separated)</label>
                <input
                  value={editWeaknesses}
                  onChange={(e) => setEditWeaknesses(e.target.value)}
                  disabled={!editing}
                  placeholder="e.g. détails techniques, impatience"
                  style={{
                    width: "100%", padding: "6px 10px", fontSize: 11,
                    background: editing ? "var(--bg-2)" : "transparent",
                    border: editing ? "1px solid var(--border)" : "1px solid transparent",
                    borderRadius: 6, color: "var(--text)", outline: "none",
                  }}
                />
              </div>

              {/* Avatar Emoji */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 3 }}>Avatar Emoji</label>
                <input
                  value={editAvatarEmoji}
                  onChange={(e) => setEditAvatarEmoji(e.target.value)}
                  disabled={!editing}
                  style={{
                    width: "100%", padding: "6px 10px", fontSize: 11,
                    background: editing ? "var(--bg-2)" : "transparent",
                    border: editing ? "1px solid var(--border)" : "1px solid transparent",
                    borderRadius: 6, color: "var(--text)", outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 3 }}>Activation</label>
                <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--text)" }}>
                    <input type="checkbox" checked={editOnline} onChange={(e) => setEditOnline(e.target.checked)} disabled={!editing} />
                    Active
                  </label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as typeof editStatus)} disabled={!editing} style={{ width: "100%", padding: "6px 10px", fontSize: 11, background: editing ? "var(--bg-2)" : "transparent", border: editing ? "1px solid var(--border)" : "1px solid transparent", borderRadius: 6, color: "var(--text)", outline: "none" }}>
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 3 }}>Currently Working On</label>
                <input
                  value={editWorkingOn}
                  onChange={(e) => setEditWorkingOn(e.target.value)}
                  disabled={!editing}
                  style={{
                    width: "100%", padding: "6px 10px", fontSize: 11,
                    background: editing ? "var(--bg-2)" : "transparent",
                    border: editing ? "1px solid var(--border)" : "1px solid transparent",
                    borderRadius: 6, color: "var(--text)", outline: "none",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 3 }}>Expertise Badges</label>
                <input
                  value={editExpertiseBadges}
                  onChange={(e) => setEditExpertiseBadges(e.target.value)}
                  disabled={!editing}
                  placeholder="Design, QA, Operations"
                  style={{
                    width: "100%", padding: "6px 10px", fontSize: 11,
                    background: editing ? "var(--bg-2)" : "transparent",
                    border: editing ? "1px solid var(--border)" : "1px solid transparent",
                    borderRadius: 6, color: "var(--text)", outline: "none",
                  }}
                />
              </div>

              {/* Avatar Color */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 3 }}>Avatar Color</label>
                <input
                  type="color"
                  value={editAvatarColor}
                  onChange={(e) => setEditAvatarColor(e.target.value)}
                  disabled={!editing}
                  style={{
                    width: "100%", height: 32, padding: 2, fontSize: 11,
                    background: editing ? "var(--bg-2)" : "transparent",
                    border: editing ? "1px solid var(--border)" : "1px solid transparent",
                    borderRadius: 6, color: "var(--text)", outline: "none", cursor: editing ? "pointer" : "default",
                  }}
                />
              </div>

              {/* System Prompt */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 3 }}>System Prompt</label>
                <textarea
                  value={editSystemPrompt}
                  onChange={(e) => setEditSystemPrompt(e.target.value)}
                  disabled={!editing}
                  style={{
                    width: "100%", padding: "8px 10px", fontSize: 11, lineHeight: 1.5,
                    background: editing ? "var(--bg-2)" : "transparent",
                    border: editing ? "1px solid var(--border)" : "1px solid transparent",
                    borderRadius: 6, color: "var(--text)", outline: "none",
                    minHeight: 60, resize: "vertical",
                  }}
                />
              </div>

              {/* Creativity Level */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 3 }}>
                  Creativity Level: {editCreativity}%
                </label>
                <input
                  type="range" min={0} max={100} value={editCreativity}
                  onChange={(e) => setEditCreativity(parseInt(e.target.value))}
                  disabled={!editing}
                  style={{ width: "100%", accentColor: profile.avatarColor }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "var(--text-3)" }}>
                  <span>Precise</span><span>Creative</span>
                </div>
              </div>

              {/* Tone */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 3 }}>Tone</label>
                <input
                  value={editTone}
                  onChange={(e) => setEditTone(e.target.value)}
                  disabled={!editing}
                  style={{
                    width: "100%", padding: "6px 10px", fontSize: 11,
                    background: editing ? "var(--bg-2)" : "transparent",
                    border: editing ? "1px solid var(--border)" : "1px solid transparent",
                    borderRadius: 6, color: "var(--text)", outline: "none",
                  }}
                />
              </div>

              {/* Visual Style */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 3 }}>Visual Style</label>
                <select
                  value={editVisualStyle}
                  onChange={(e) => setEditVisualStyle(e.target.value as CreativeStyle)}
                  disabled={!editing}
                  style={{
                    width: "100%", padding: "6px 10px", fontSize: 11,
                    background: editing ? "var(--bg-2)" : "transparent",
                    border: editing ? "1px solid var(--border)" : "1px solid transparent",
                    borderRadius: 6, color: "var(--text)", outline: "none",
                  }}
                >
                  <option value="minimalist_premium">Minimalist Premium (Apple)</option>
                  <option value="bold_athletic">Bold Athletic (Nike)</option>
                  <option value="elegant_luxury">Elegant Luxury</option>
                  <option value="playful_modern">Playful Modern</option>
                  <option value="corporate_clean">Corporate Clean (Stripe)</option>
                  <option value="experimental_avant_garde">Experimental Avant-Garde</option>
                </select>
              </div>

              {/* Personality */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 3 }}>Personality</label>
                <textarea
                  value={editPersonality}
                  onChange={(e) => setEditPersonality(e.target.value)}
                  disabled={!editing}
                  style={{
                    width: "100%", padding: "8px 10px", fontSize: 11, lineHeight: 1.5,
                    background: editing ? "var(--bg-2)" : "transparent",
                    border: editing ? "1px solid var(--border)" : "1px solid transparent",
                    borderRadius: 6, color: "var(--text)", outline: "none",
                    minHeight: 40, resize: "vertical",
                  }}
                />
              </div>

              {/* Preferred Workflows */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 600, color: "var(--text-2)", display: "block", marginBottom: 3 }}>Preferred Workflows (comma-separated)</label>
                <input
                  value={editWorkflows}
                  onChange={(e) => setEditWorkflows(e.target.value)}
                  disabled={!editing}
                  placeholder="e.g. branding_pack, creative_brief"
                  style={{
                    width: "100%", padding: "6px 10px", fontSize: 11,
                    background: editing ? "var(--bg-2)" : "transparent",
                    border: editing ? "1px solid var(--border)" : "1px solid transparent",
                    borderRadius: 6, color: "var(--text)", outline: "none",
                  }}
                />
              </div>
            </div>
          </Panel>

          {/* Creative Standards */}
          {applicableStandards.length > 0 && (
            <Panel>
              <SectionHeader title="Creative Standards" icon={<Sparkles size={12} style={{ color: "#8b5cf6" }} />} />
              {applicableStandards.map((cs) => (
                <div key={cs.id} style={{ padding: "6px 8px", marginBottom: 4, background: "var(--bg-2)", borderRadius: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text)" }}>{cs.label}</div>
                  <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>{cs.description}</div>
                </div>
              ))}
            </Panel>
          )}
        </div>

        {/* ── RIGHT: Career + Memory ── */}
        <div style={{ display: "grid", gap: 16 }}>
          {/* Level & XP */}
          <Panel>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: profile.avatarColor }}>Lv.{memory?.level ?? 1}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-3)" }}>{levelTitle}</div>
              <div style={{ marginTop: 8, background: "var(--bg-2)", borderRadius: 6, height: 8, overflow: "hidden" }}>
                <div style={{ width: `${xpInfo.progress * 100}%`, height: "100%", background: profile.avatarColor, borderRadius: 6, transition: "width 0.3s" }} />
              </div>
              <div style={{ fontSize: 9, color: "var(--text-3)", marginTop: 4 }}>
                {xpInfo.current} / {xpInfo.needed} XP to next level
              </div>
              <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 2 }}>
                Total: {memory?.xp ?? 0} XP
              </div>
            </div>
          </Panel>

          {/* Career Stats */}
          {career && (
            <Panel>
              <SectionHeader title="Career" icon={<Trophy size={12} style={{ color: "#f59e0b" }} />} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <div style={{ padding: "6px 8px", background: "var(--bg-2)", borderRadius: 6, textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{career.totalMissions}</div>
                  <div style={{ fontSize: 8, color: "var(--text-3)" }}>Total Missions</div>
                </div>
                <div style={{ padding: "6px 8px", background: "var(--bg-2)", borderRadius: 6, textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>{career.completedMissions}</div>
                  <div style={{ fontSize: 8, color: "var(--text-3)" }}>Completed</div>
                </div>
                <div style={{ padding: "6px 8px", background: "var(--bg-2)", borderRadius: 6, textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#ef4444" }}>{career.failedMissions}</div>
                  <div style={{ fontSize: 8, color: "var(--text-3)" }}>Failed</div>
                </div>
                <div style={{ padding: "6px 8px", background: "var(--bg-2)", borderRadius: 6, textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{career.averageDeliveryTime}d</div>
                  <div style={{ fontSize: 8, color: "var(--text-3)" }}>Avg Delivery</div>
                </div>
              </div>
              {memory && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
                  <div style={{ padding: "6px 8px", background: "var(--bg-2)", borderRadius: 6, textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#22c55e" }}>{(memory.approvalRate * 100).toFixed(0)}%</div>
                    <div style={{ fontSize: 8, color: "var(--text-3)" }}>Approval Rate</div>
                  </div>
                  <div style={{ padding: "6px 8px", background: "var(--bg-2)", borderRadius: 6, textAlign: "center" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#3b82f6" }}>{(memory.clientSatisfaction * 100).toFixed(0)}%</div>
                    <div style={{ fontSize: 8, color: "var(--text-3)" }}>Satisfaction</div>
                  </div>
                </div>
              )}
            </Panel>
          )}

          {/* Specialties */}
          {career && career.specialties.length > 0 && (
            <Panel>
              <SectionHeader title="Specialties" icon={<Award size={12} style={{ color: "#8b5cf6" }} />} />
              {career.specialties.map((s) => (
                <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0" }}>
                  <span style={{ fontSize: 11, color: "var(--text)", flex: 1 }}>{s.name}</span>
                  <div style={{ display: "flex", gap: 2 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: i < s.level ? profile.avatarColor : "var(--bg-2)" }} />
                    ))}
                  </div>
                </div>
              ))}
            </Panel>
          )}

          {/* Awards */}
          {career && career.awards.length > 0 && (
            <Panel>
              <SectionHeader title="Awards" icon={<Star size={12} style={{ color: "#f59e0b" }} />} />
              {career.awards.map((a) => (
                <div key={a.name} style={{ fontSize: 11, color: "var(--text)", padding: "3px 0" }}>
                  🏆 {a.name}
                </div>
              ))}
            </Panel>
          )}

          {/* Memory — Learned Preferences */}
          {memory && memory.learnedPreferences && Object.keys(memory.learnedPreferences).length > 0 && (
            <Panel>
              <SectionHeader title="Learned Preferences" icon={<Brain size={12} style={{ color: "#06b6d4" }} />} />
              {Object.entries(memory.learnedPreferences).map(([k, v]) => (
                <div key={k} style={{ fontSize: 10, color: "var(--text)", padding: "3px 0" }}>
                  <span style={{ fontWeight: 600, color: "var(--text-3)" }}>{k}:</span> {v}
                </div>
              ))}
            </Panel>
          )}

          {/* Branding Knowledge */}
          {memory && memory.brandingKnowledge.length > 0 && (
            <Panel>
              <SectionHeader title="Branding Knowledge" icon={<Palette size={12} style={{ color: "#8b5cf6" }} />} />
              {memory.brandingKnowledge.map((k) => (
                <div key={k} style={{ fontSize: 10, color: "var(--text)", padding: "2px 0" }}>• {k}</div>
              ))}
            </Panel>
          )}

          {/* Style Preferences */}
          {memory && memory.stylePreferences.length > 0 && (
            <Panel>
              <SectionHeader title="Style Preferences" icon={<Palette size={12} style={{ color: "#ec4899" }} />} />
              {memory.stylePreferences.map((s) => (
                <span key={s} style={{ padding: "2px 8px", fontSize: 9, fontWeight: 600, background: `${profile.avatarColor}15`, color: profile.avatarColor, borderRadius: 4, marginRight: 4 }}>{s}</span>
              ))}
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
