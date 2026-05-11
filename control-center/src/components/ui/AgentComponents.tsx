"use client";

import { motion } from "framer-motion";

// ─── AgentAvatar ─────────────────────────────────────────────────────────

interface AgentAvatarProps {
  firstName: string;
  lastName: string;
  avatarEmoji: string;
  avatarColor: string;
  avatarUrl?: string | null;
  profilePhotoStyle?: string;
  size?: number;
  online?: boolean;
  status?: "available" | "busy" | "offline";
  showStatus?: boolean;
}

export function AgentAvatar({
  firstName,
  lastName,
  avatarEmoji,
  avatarColor,
  avatarUrl,
  profilePhotoStyle = "gradient",
  size = 44,
  online = true,
  status = "available",
  showStatus = true,
}: AgentAvatarProps) {
  const initials = `${firstName[0]}${lastName[0]}`;

  const statusColor = status === "available" ? "#22c55e" : status === "busy" ? "#f59e0b" : "#64748b";
  const statusSize = Math.max(Math.round(size * 0.18), 6);

  const gradientAngle = {
    ceo: "135deg",
    cfo: "150deg",
    cmo: "120deg",
    cto: "160deg",
    coo: "145deg",
    logistics: "130deg",
    support: "110deg",
    sales: "155deg",
    hr: "140deg",
    product_agent: "165deg",
    architect_agent: "125deg",
    frontend_agent: "115deg",
    backend_agent: "170deg",
    qa_agent: "175deg",
    devops_agent: "135deg",
    ecommerce_operator: "120deg",
  }[avatarEmoji] ?? "135deg";

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={`${firstName} ${lastName}`}
          style={{ width: size, height: size, borderRadius: size * 0.22, objectFit: "cover" }}
        />
      ) : profilePhotoStyle === "photo-like" ? (
        <div style={{
          width: size, height: size, borderRadius: size * 0.22,
          background: `linear-gradient(${gradientAngle}, ${avatarColor}dd, ${avatarColor}66, ${avatarColor}33)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: Math.round(size * 0.45), lineHeight: 1,
          boxShadow: `0 2px 12px ${avatarColor}30, inset 0 1px 0 rgba(255,255,255,0.15)`,
          border: `1.5px solid ${avatarColor}40`,
          position: "relative", overflow: "hidden",
        }}>
          <span style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))" }}>{avatarEmoji}</span>
          {/* Photo-like overlay effect */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: size * 0.22,
            background: `radial-gradient(ellipse 80% 60% at 35% 25%, rgba(255,255,255,0.2) 0%, transparent 60%)`,
            pointerEvents: "none",
          }} />
        </div>
      ) : (
        <div style={{
          width: size, height: size, borderRadius: size * 0.22,
          background: `linear-gradient(${gradientAngle}, ${avatarColor}cc, ${avatarColor}44)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: Math.round(size * 0.36), fontWeight: 700, color: "#fff",
          letterSpacing: "0.5px",
          boxShadow: `0 2px 8px ${avatarColor}25`,
          border: `1px solid ${avatarColor}30`,
        }}>
          {initials}
        </div>
      )}
      {showStatus && (
        <motion.div
          style={{
            position: "absolute", bottom: -1, right: -1,
            width: statusSize + 4, height: statusSize + 4,
            borderRadius: "50%", background: "var(--bg-1)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          animate={online && status !== "offline" ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          <div style={{
            width: statusSize, height: statusSize, borderRadius: "50%",
            background: statusColor,
            boxShadow: `0 0 6px ${statusColor}60`,
            border: "1.5px solid var(--bg-1)",
          }} />
        </motion.div>
      )}
    </div>
  );
}

// ─── AgentCard ───────────────────────────────────────────────────────────

interface AgentCardProfile {
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
}

interface AgentCardProps {
  profile: AgentCardProfile;
  onClick?: () => void;
  selected?: boolean;
  compact?: boolean;
}

export function AgentCard({ profile, onClick, selected = false, compact = false }: AgentCardProps) {
  const { agentId: _id, agentColor: _c, ...rest } = profile as AgentCardProfile & { agentColor?: string };
  const p = rest;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -2, transition: { duration: 0.12 } }}
      onClick={onClick}
      style={{
        background: selected
          ? `linear-gradient(135deg, ${p.avatarColor}08, ${p.avatarColor}04, var(--surface))`
          : "var(--surface)",
        border: `1px solid ${selected ? p.avatarColor + "60" : "var(--border)"}`,
        borderRadius: 14,
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        position: "relative",
        boxShadow: selected
          ? `0 0 0 1px ${p.avatarColor}30, 0 4px 20px ${p.avatarColor}15`
          : "0 1px 4px rgba(0,0,0,0.12)",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      {/* Top gradient bar */}
      <div style={{
        height: 3,
        background: `linear-gradient(90deg, ${p.avatarColor}, ${p.avatarColor}88, transparent)`,
      }} />

      {/* Subtle radial glow */}
      <div style={{
        position: "absolute", top: 0, right: 0, width: "60%", height: "50%",
        background: `radial-gradient(ellipse at 100% 0%, ${p.avatarColor}08 0%, transparent 70%)`,
        pointerEvents: "none",
      }} />

      <div style={{ padding: compact ? 14 : 18, position: "relative" }}>
        {/* Header: Avatar + Name + Status */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: compact ? 8 : 14 }}>
          <AgentAvatar
            firstName={p.firstName}
            lastName={p.lastName}
            avatarEmoji={p.avatarEmoji}
            avatarColor={p.avatarColor}
            avatarUrl={p.avatarUrl}
            profilePhotoStyle={p.profilePhotoStyle}
            size={compact ? 36 : 48}
            online={p.online}
            status={p.status}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>
                {p.displayName}
              </span>
              {p.level >= 5 && (
                <span style={{
                  fontSize: 8, padding: "1px 5px", borderRadius: 4,
                  background: `${p.avatarColor}18`, color: p.avatarColor,
                  fontWeight: 700, letterSpacing: "0.04em",
                }}>
                  LVL {p.level}
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: p.avatarColor, fontWeight: 600, marginTop: 2 }}>
              {p.role}
            </div>
            <div style={{ fontSize: 10, color: "var(--text-3)", marginTop: 1 }}>
              {p.department}
            </div>
          </div>
          <LiveStatus online={p.online} status={p.status} />
        </div>

        {!compact && (
          <>
            {/* Bio */}
            <p style={{
              fontSize: 11, color: "var(--text-2)", lineHeight: 1.5,
              marginBottom: 12, display: "-webkit-box",
              WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {p.bio}
            </p>

            {/* Badges */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
              {p.expertiseBadges.map((badge) => (
                <span key={badge} style={{
                  fontSize: 9, padding: "2px 7px", borderRadius: 5,
                  background: `${p.avatarColor}12`, color: p.avatarColor,
                  border: `1px solid ${p.avatarColor}20`,
                  fontWeight: 600, letterSpacing: "0.02em",
                }}>
                  {badge}
                </span>
              ))}
            </div>

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, marginBottom: 0 }}>
              {[
                { label: "Reputation", value: p.reputationScore, color: p.reputationScore >= 95 ? "#22c55e" : "#f59e0b" },
                { label: "Level", value: p.level, color: p.avatarColor },
                { label: "XP", value: p.xp, color: "var(--text-2)" },
              ].map((m, i) => (
                <div key={m.label} style={{
                  padding: "8px 0", textAlign: "center",
                  borderRight: i < 2 ? "1px solid var(--border)" : "none",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: m.color, lineHeight: 1 }}>{m.value}</div>
                  <div style={{ fontSize: 8, color: "var(--text-3)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{m.label}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {compact && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
            {p.expertiseBadges.slice(0, 2).map((badge) => (
              <span key={badge} style={{
                fontSize: 8, padding: "1px 5px", borderRadius: 4,
                background: `${p.avatarColor}12`, color: p.avatarColor,
                fontWeight: 600,
              }}>
                {badge}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── GlassPanel ──────────────────────────────────────────────────────────

interface GlassPanelProps {
  children: React.ReactNode;
  color?: string;
  style?: React.CSSProperties;
  padding?: number;
}

export function GlassPanel({ children, color = "#6366f1", style, padding = 18 }: GlassPanelProps) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${color}06, rgba(255,255,255,0.02))`,
      backdropFilter: "blur(12px)",
      border: `1px solid ${color}18`,
      borderRadius: 12,
      padding,
      boxShadow: `0 2px 12px ${color}08, inset 0 1px 0 rgba(255,255,255,0.04)`,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── LiveStatus ───────────────────────────────────────────────────────────

interface LiveStatusProps {
  online?: boolean;
  status?: "available" | "busy" | "offline";
  label?: string;
  size?: "sm" | "md";
}

export function LiveStatus({ online = true, status = "available", label, size = "sm" }: LiveStatusProps) {
  const color = !online || status === "offline" ? "#64748b" : status === "busy" ? "#f59e0b" : "#22c55e";
  const text = label ?? (status === "available" ? "Online" : status === "busy" ? "Busy" : "Offline");
  const dotSize = size === "sm" ? 5 : 7;
  const fontSize = size === "sm" ? 9 : 10;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 4,
      padding: size === "sm" ? "2px 7px" : "3px 9px",
      borderRadius: 20,
      background: `${color}12`,
      border: `1px solid ${color}20`,
    }}>
      <motion.div
        style={{ width: dotSize, height: dotSize, borderRadius: "50%", background: color, flexShrink: 0 }}
        animate={online && status !== "offline" ? { opacity: [1, 0.4, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <span style={{ fontSize, fontWeight: 600, color, letterSpacing: "0.03em" }}>{text}</span>
    </div>
  );
}
