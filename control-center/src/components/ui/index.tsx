"use client";

import type { ReactNode } from "react";

// ─── StatusBadge ──────────────────────────────────────────────────────────

interface StatusBadgeProps {
  label: string;
  color: string;
  bg?: string;
  icon?: ReactNode;
  size?: "xs" | "sm" | "md";
}

export function StatusBadge({ label, color, bg, icon, size = "sm" }: StatusBadgeProps) {
  const background = bg ?? `${color}1a`;
  const fs = size === "md" ? 11 : size === "xs" ? 7 : 9;
  const py = size === "md" ? 4 : size === "xs" ? 1 : 2;
  const px = size === "md" ? 10 : size === "xs" ? 5 : 7;

  return (
    <span style={{
      fontSize: fs,
      fontWeight: 600,
      color,
      background,
      padding: `${py}px ${px}px`,
      borderRadius: 99,
      textTransform: "uppercase",
      letterSpacing: "0.4px",
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      lineHeight: 1,
      whiteSpace: "nowrap",
    }}>
      {icon}
      {label}
    </span>
  );
}

// ─── MetricCard ───────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  color?: string;
  trend?: "up" | "down" | "flat";
  trendValue?: string;
}

export function MetricCard({ label, value, icon, color = "var(--text)", trend, trendValue }: MetricCardProps) {
  const trendColor = trend === "up" ? "#22c55e" : trend === "down" ? "#f43f5e" : "var(--text-3)";
  const trendArrow = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";

  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      padding: "14px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        {icon && <span style={{ color }}>{icon}</span>}
        <span style={{
          fontSize: 10,
          color: "var(--text-3)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}>
          {label}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color }}>{value}</span>
        {trend && trendValue && (
          <span style={{ fontSize: 10, fontWeight: 600, color: trendColor }}>
            {trendArrow} {trendValue}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      padding: "32px 24px",
      textAlign: "center",
    }}>
      {icon && <div style={{ fontSize: 40, opacity: 0.25, marginBottom: 12 }}>{icon}</div>}
      <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", margin: "0 0 6px" }}>{title}</h3>
      <p style={{ fontSize: 13, color: "var(--text-3)", margin: "0 0 16px", maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─── SectionHeader ────────────────────────────────────────────────────────

interface SectionHeaderProps {
  icon?: ReactNode;
  title: string;
  action?: ReactNode;
}

export function SectionHeader({ icon, title, action }: SectionHeaderProps) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    }}>
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: "var(--text-3)",
        textTransform: "uppercase",
        letterSpacing: "0.6px",
        display: "flex",
        alignItems: "center",
        gap: 5,
      }}>
        {icon}
        {title}
      </div>
      {action}
    </div>
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────

interface PageHeaderProps {
  icon: ReactNode;
  title: string;
  description: string;
  badge?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ icon, title, description, badge, actions }: PageHeaderProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ display: "inline-flex", alignItems: "center" }}>{icon}</span>
          {title}
          {badge}
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-3)", margin: "4px 0 0" }}>{description}</p>
      </div>
      {actions && <div style={{ display: "flex", gap: 8, alignItems: "center" }}>{actions}</div>}
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────

interface PanelProps {
  children: ReactNode;
  style?: React.CSSProperties;
}

export function Panel({ children, style }: PanelProps) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      padding: "18px 22px",
      marginBottom: 32,
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────

interface RowProps {
  children: ReactNode;
  style?: React.CSSProperties;
}

export function Row({ children, style }: RowProps) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "10px 14px",
      background: "var(--bg-2)",
      borderRadius: "var(--radius-sm)",
      border: "1px solid var(--border)",
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── GhostButton ───────────────────────────────────────────────────────────

interface GhostButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}

export function GhostButton({ children, onClick, disabled }: GhostButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontSize: 11,
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        padding: "6px 12px",
        cursor: disabled ? "not-allowed" : "pointer",
        color: "var(--text-2)",
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

// ─── PrimaryButton ─────────────────────────────────────────────────────────

interface PrimaryButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  color?: string;
}

export function PrimaryButton({ children, onClick, disabled, color = "#6366f1" }: PrimaryButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontSize: 11,
        background: color,
        color: "#fff",
        border: "none",
        borderRadius: "var(--radius-sm)",
        padding: "6px 12px",
        cursor: disabled ? "not-allowed" : "pointer",
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  );
}

// ─── ErrorBanner ───────────────────────────────────────────────────────────

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div style={{
      background: "rgba(244,63,94,0.08)",
      border: "1px solid rgba(244,63,94,0.2)",
      borderRadius: "var(--radius-sm)",
      padding: "10px 14px",
      display: "flex",
      alignItems: "center",
      gap: 8,
      marginBottom: 24,
    }}>
      <span style={{ color: "#f43f5e", fontSize: 13 }}>⚠</span>
      <span style={{ color: "var(--text-2)", fontSize: 12, flex: 1 }}>{message}</span>
      {onRetry && (
        <button onClick={onRetry} style={{ fontSize: 10, color: "#f43f5e", background: "none", border: "1px solid rgba(244,63,94,0.3)", borderRadius: "var(--radius-sm)", padding: "3px 8px", cursor: "pointer" }}>
          Retry
        </button>
      )}
    </div>
  );
}

// ─── LocalBadge ───────────────────────────────────────────────────────────

export function LocalBadge() {
  return (
    <span style={{
      fontSize: 9,
      fontWeight: 600,
      color: "#a78bfa",
      background: "rgba(167,139,250,0.1)",
      padding: "2px 7px",
      borderRadius: 99,
      textTransform: "uppercase",
      letterSpacing: "0.3px",
      marginLeft: 6,
    }}>
      Local-First
    </span>
  );
}

// ─── SimBadge ─────────────────────────────────────────────────────────────

export function SimBadge() {
  return (
    <span style={{
      fontSize: 9,
      fontWeight: 600,
      color: "#f59e0b",
      background: "rgba(245,158,11,0.1)",
      padding: "2px 7px",
      borderRadius: 99,
      textTransform: "uppercase",
      letterSpacing: "0.3px",
      marginLeft: 6,
    }}>
      Local Mode
    </span>
  );
}

export function NvidiaLiveBadge() {
  return (
    <span style={{
      fontSize: 9,
      fontWeight: 600,
      color: "#22c55e",
      background: "rgba(34,197,94,0.1)",
      padding: "2px 7px",
      borderRadius: 99,
      textTransform: "uppercase",
      letterSpacing: "0.3px",
      marginLeft: 6,
    }}>
      NVIDIA LIVE
    </span>
  );
}

export function RuntimeBadge({ mode }: { mode: "nvidia" | "simulation" | "hybrid" }) {
  if (mode === "nvidia") return <NvidiaLiveBadge />;
  return <SimBadge />;
}

// Re-export agent components
export { AgentAvatar, AgentCard, GlassPanel, LiveStatus, TypingBubble, ExpertiseBadge } from "./AgentComponents";
