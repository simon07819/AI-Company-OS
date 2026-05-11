"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Search, Users, Sparkles, Building2, Edit3, MessageSquare, ChevronRight } from "lucide-react";
import { AgentCard, AgentAvatar, GlassPanel, LiveStatus, NvidiaLiveBadge, SimBadge, LocalBadge } from "@/components/ui";

interface TeamProfile {
  agentId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  name: string;
  role: string;
  title: string;
  department: string;
  bio: string;
  avatarEmoji: string;
  avatarColor: string;
  avatarUrl: string | null;
  profilePhotoStyle: string;
  personality: string;
  expertise: string[];
  strengths: string[];
  weaknesses: string[];
  reputationScore: number;
  specialization: string;
  online: boolean;
  status: "available" | "busy" | "offline";
  level: number;
  xp: number;
  expertiseBadges: string[];
  currentlyWorkingOn: string | null;
  communicationStyle: string;
}

export default function TeamPage() {
  const [profiles, setProfiles] = useState<TeamProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [departments, setDepartments] = useState<string[]>([]);
  const [runtimeMode, setRuntimeMode] = useState<"nvidia" | "simulation">("simulation");

  useEffect(() => {
    Promise.all([
      fetch("/api/agents/profiles").then((r) => r.json()),
      fetch("/api/runtime-mode").then((r) => r.json()),
    ]).then(([teamData, runtimeData]) => {
      if (teamData.ok) {
        setProfiles(teamData.profiles);
        setDepartments(teamData.departments ?? []);
      }
      if (runtimeData.ok) setRuntimeMode(runtimeData.mode === "nvidia" ? "nvidia" : "simulation");
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = profiles.filter((p) => {
    if (selectedDept && p.department !== selectedDept) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.role.toLowerCase().includes(q) ||
      p.department.toLowerCase().includes(q) ||
      p.specialization.toLowerCase().includes(q) ||
      p.expertise.some((e) => e.toLowerCase().includes(q))
    );
  });

  const onlineCount = profiles.filter((p) => p.online).length;
  const avgReputation = profiles.length > 0 ? Math.round(profiles.reduce((s, p) => s + p.reputationScore, 0) / profiles.length) : 0;
  const totalLevel = profiles.reduce((s, p) => s + p.level, 0);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div style={{ color: "var(--text-3)", fontSize: 14 }}>Loading team...</div>
      </div>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "var(--bg-1)", padding: "24px 32px" }}>
      {/* Page Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10,
            background: "linear-gradient(135deg, #8b5cf6cc, #6366f144)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, boxShadow: "0 2px 10px #8b5cf630",
          }}>
            <Users size={20} color="#8b5cf6" />
          </div>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", lineHeight: 1.1, margin: 0 }}>
              AI Team
            </h1>
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>
              {profiles.length} agents · {onlineCount} online · Premium AI Agency
            </div>
          </div>
          <LocalBadge />
          {runtimeMode === "nvidia" ? <NvidiaLiveBadge /> : <SimBadge />}
        </div>

        {/* Overview metrics */}
        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          {[
            { label: "Team Size", value: profiles.length, color: "#8b5cf6", icon: <Users size={13} /> },
            { label: "Online", value: onlineCount, color: "#22c55e", icon: <Sparkles size={13} /> },
            { label: "Avg Reputation", value: avgReputation, color: "#f59e0b", icon: <Building2 size={13} /> },
            { label: "Total Level", value: totalLevel, color: "#3b82f6", icon: <Sparkles size={13} /> },
          ].map((m) => (
            <GlassPanel key={m.label} color={m.color} padding={10} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ color: m.color, opacity: 0.7 }}>{m.icon}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: m.color, lineHeight: 1 }}>{m.value}</div>
                <div style={{ fontSize: 8, color: "var(--text-3)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{m.label}</div>
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>

      {/* Search + Department Filter */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{
          flex: 1, minWidth: 200, position: "relative",
          background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
          display: "flex", alignItems: "center", padding: "0 12px",
        }}>
          <Search size={14} color="var(--text-3)" />
          <input
            type="text"
            placeholder="Search by name, role, expertise..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: 1, background: "transparent", border: "none", outline: "none",
              color: "var(--text)", fontSize: 12, padding: "9px 8px",
              fontFamily: "inherit",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <button
            onClick={() => setSelectedDept(null)}
            style={{
              padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
              background: !selectedDept ? "#8b5cf618" : "transparent",
              color: !selectedDept ? "#8b5cf6" : "var(--text-3)",
              border: `1px solid ${!selectedDept ? "#8b5cf640" : "var(--border)"}`,
              transition: "all 0.12s",
            }}
          >
            All
          </button>
          {departments.map((dept) => (
            <button
              key={dept}
              onClick={() => setSelectedDept(selectedDept === dept ? null : dept)}
              style={{
                padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                background: selectedDept === dept ? "#8b5cf618" : "transparent",
                color: selectedDept === dept ? "#8b5cf6" : "var(--text-3)",
                border: `1px solid ${selectedDept === dept ? "#8b5cf640" : "var(--border)"}`,
                transition: "all 0.12s",
              }}
            >
              {dept}
            </button>
          ))}
        </div>
      </div>

      {/* Team Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
        gap: 14,
      }}>
        <AnimatePresence>
          {filtered.map((profile) => (
            <div key={profile.agentId} style={{ position: "relative" }}>
              <AgentCard profile={profile} />
              {/* Action overlay buttons */}
              <div style={{
                position: "absolute", top: 14, right: 14,
                display: "flex", gap: 4,
              }}>
                <Link
                  href={`/agents/${profile.agentId}`}
                  style={{
                    padding: "4px 8px", borderRadius: 6,
                    background: `${profile.avatarColor}14`, border: `1px solid ${profile.avatarColor}25`,
                    color: profile.avatarColor, fontSize: 9, fontWeight: 600,
                    textDecoration: "none", display: "flex", alignItems: "center", gap: 3,
                    transition: "background 0.12s",
                  }}
                >
                  <Edit3 size={9} />
                  Edit
                </Link>
                <Link
                  href={`/conversations?agent=${profile.agentId}`}
                  style={{
                    padding: "4px 8px", borderRadius: 6,
                    background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)",
                    color: "var(--text-3)", fontSize: 9, fontWeight: 600,
                    textDecoration: "none", display: "flex", alignItems: "center", gap: 3,
                    transition: "background 0.12s",
                  }}
                >
                  <MessageSquare size={9} />
                  Chat
                </Link>
              </div>
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <GlassPanel color="#64748b" style={{ textAlign: "center", marginTop: 40 }}>
          <div style={{ color: "var(--text-3)", fontSize: 13 }}>No agents match your search.</div>
        </GlassPanel>
      )}

      {/* Currently working section */}
      {profiles.filter((p) => p.currentlyWorkingOn).length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            Currently Working
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {profiles.filter((p) => p.currentlyWorkingOn).map((p) => (
              <GlassPanel key={p.agentId} color={p.avatarColor} padding={12} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <AgentAvatar
                  firstName={p.firstName}
                  lastName={p.lastName}
                  avatarEmoji={p.avatarEmoji}
                  avatarColor={p.avatarColor}
                  avatarUrl={p.avatarUrl}
                  profilePhotoStyle={p.profilePhotoStyle}
                  size={32}
                  online={p.online}
                  status={p.status}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text)" }}>{p.displayName} <span style={{ color: p.avatarColor, fontSize: 10 }}>{p.role}</span></div>
                  <div style={{ fontSize: 11, color: "var(--text-2)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.currentlyWorkingOn}</div>
                </div>
                <Link href={`/conversations?agent=${p.agentId}`} style={{ color: p.avatarColor, fontSize: 10, textDecoration: "none", display: "flex", alignItems: "center", gap: 3 }}>
                  View <ChevronRight size={10} />
                </Link>
              </GlassPanel>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
