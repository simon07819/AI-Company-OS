"use client";

import type { CSSProperties } from "react";
import type { OutputVisualPreview } from "@/lib/visibleOutputs";

interface VisualOutputPreviewProps {
  visualPreview?: OutputVisualPreview | null;
  title: string;
  summary?: string;
  compact?: boolean;
}

export function VisualOutputPreview({ visualPreview, title, summary, compact = false }: VisualOutputPreviewProps) {
  if (!visualPreview) return null;
  const height = compact ? 116 : 220;

  if (visualPreview.kind === "image" && visualPreview.imageUrl) {
    return (
      <div style={{ ...frameStyle, height }}>
        <img
          src={visualPreview.imageUrl}
          alt={visualPreview.imageAlt ?? title}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "#0f172a" }}
        />
      </div>
    );
  }

  if (visualPreview.kind === "website_card") {
    const colors = visualPreview.colors.length > 0 ? visualPreview.colors : ["#0F172A", "#38BDF8", "#E2E8F0"];
    return (
      <div style={{ ...frameStyle, minHeight: height, background: "#f8fafc", color: "#0f172a" }}>
        <div style={{ height: 22, display: "flex", alignItems: "center", gap: 5, padding: "0 10px", borderBottom: "1px solid #cbd5e1" }}>
          <span style={{ ...dotStyle, background: "#ef4444" }} />
          <span style={{ ...dotStyle, background: "#f59e0b" }} />
          <span style={{ ...dotStyle, background: "#22c55e" }} />
        </div>
        <div style={{ padding: compact ? 12 : 18 }}>
          <div style={{ height: compact ? 18 : 28, width: "62%", background: colors[1], borderRadius: 5, marginBottom: 10 }} />
          <div style={{ height: 8, width: "86%", background: "#cbd5e1", borderRadius: 4, marginBottom: 6 }} />
          <div style={{ height: 8, width: "68%", background: "#cbd5e1", borderRadius: 4, marginBottom: 14 }} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
            {(visualPreview.mockup?.blocks ?? ["Hero", "Grid", "CTA"]).map((block) => (
              <div key={block} style={{ height: compact ? 34 : 58, borderRadius: 6, border: `1px solid ${colors[1]}55`, background: `${colors[1]}18`, padding: 8 }}>
                <div style={{ height: 7, width: "70%", borderRadius: 4, background: colors[0], opacity: 0.75 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (visualPreview.kind === "brand_card") {
    const colors = visualPreview.colors.length > 0 ? visualPreview.colors : ["#0F172A", "#38BDF8", "#F8FAFC", "#22C55E"];
    const primary = colors[0] ?? "#0F172A";
    const accent = colors[1] ?? "#38BDF8";
    const surface = colors[2] ?? "#F8FAFC";
    const brandName = compact
      ? visualPreview.logoText ?? visualPreview.mockup?.title ?? title
      : visualPreview.mockup?.title ?? visualPreview.logoText ?? title.replace(/^(Concept|Logo|Approval Preview)\s*/i, "Studio Lumiere");
    const keywords = (visualPreview.mockup?.blocks?.length ? visualPreview.mockup.blocks : ["Premium", "Lumineux", "Moderne"]).slice(0, 3);
    return (
      <div style={{ ...frameStyle, minHeight: height, background: surface, color: "#0f172a" }}>
        <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "1.08fr 0.92fr", minHeight: height }}>
          <div style={{ background: `radial-gradient(circle at 28% 18%, ${accent}55, transparent 28%), ${primary}`, color: surface, padding: compact ? 14 : 22, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
            <div style={{ width: compact ? 54 : 86, height: compact ? 54 : 86, borderRadius: "50%", border: `2px solid ${accent}`, display: "grid", placeItems: "center", color: accent, marginBottom: 10, position: "relative", background: "rgba(255,255,255,0.06)" }}>
              <svg viewBox="0 0 64 64" width={compact ? 34 : 48} height={compact ? 34 : 48} aria-hidden="true">
                <circle cx="32" cy="32" r="19" fill="none" stroke="currentColor" strokeWidth="5" />
                <circle cx="32" cy="32" r="7" fill="currentColor" opacity="0.82" />
                <path d="M20 13h12l4 7h10a8 8 0 0 1 8 8v15a8 8 0 0 1-8 8H18a8 8 0 0 1-8-8V28a8 8 0 0 1 8-8h2z" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.38" />
              </svg>
            </div>
            <div style={{ fontSize: compact ? 13 : 20, fontWeight: 900 }}>{brandName}</div>
            {compact && visualPreview.mockup?.title && (
              <div style={{ fontSize: 9, opacity: 0.72, marginTop: 2 }}>{visualPreview.mockup.title}</div>
            )}
            <div style={{ fontSize: compact ? 9 : 11, opacity: 0.76, marginTop: 4, textTransform: "uppercase", letterSpacing: 0 }}>{visualPreview.tagline ?? "Capture the light"}</div>
          </div>
          {!compact && (
            <div style={{ padding: 18, display: "grid", gap: 12, alignContent: "center" }}>
              <div style={{ display: "flex", gap: 7 }}>
                {colors.slice(0, 4).map((color) => (
                  <span key={color} title={color} style={{ width: 32, height: 32, borderRadius: 7, background: color, border: "1px solid rgba(15,23,42,0.16)" }} />
                ))}
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 900 }}>{visualPreview.typography?.heading ?? "Inter Bold"}</div>
                <div style={{ fontSize: 11, color: "#475569", marginTop: 3 }}>{visualPreview.typography?.body ?? "Inter Regular"} pour textes courts</div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {keywords.map((block) => (
                  <span key={block} style={{ borderRadius: 999, padding: "6px 8px", fontSize: 10, fontWeight: 800, color: primary, background: `${accent}1f`, border: `1px solid ${accent}44` }}>{block}</span>
                ))}
              </div>
              <div style={{ fontSize: 11, lineHeight: 1.45, color: "#475569" }}>Un concept premium et lumineux pour une marque photo moderne.</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...frameStyle, minHeight: compact ? 100 : 150, padding: 14, background: "#f8fafc", color: "#0f172a" }}>
      <div style={{ fontSize: compact ? 12 : 16, fontWeight: 900, marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: compact ? 10 : 12, color: "#475569", lineHeight: 1.5 }}>{summary}</div>
    </div>
  );
}

const frameStyle: CSSProperties = {
  borderRadius: 8,
  overflow: "hidden",
  border: "1px solid rgba(148,163,184,0.35)",
  background: "var(--bg-2)",
};

const dotStyle: CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: 99,
  display: "inline-block",
};
