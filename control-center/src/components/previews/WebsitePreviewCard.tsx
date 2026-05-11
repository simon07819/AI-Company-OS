"use client";

import { motion } from "framer-motion";
import { Layout, Smartphone, Monitor } from "lucide-react";

interface WebsitePreviewCardProps {
  title: string;
  hero?: string;
  sections?: { title: string; description: string }[];
  navigation?: string[];
  style?: "minimalist_premium" | "bold_athletic" | "corporate_clean" | "elegant_luxury";
  mobilePreview?: boolean;
}

const STYLE_COLORS: Record<string, string> = {
  minimalist_premium: "#a78bfa",
  bold_athletic: "#ef4444",
  corporate_clean: "#3b82f6",
  elegant_luxury: "#f59e0b",
};

export function WebsitePreviewCard({ title, hero, sections, navigation, style = "minimalist_premium", mobilePreview }: WebsitePreviewCardProps) {
  const color = STYLE_COLORS[style] ?? "#64748b";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: "var(--surface)", border: `1px solid ${color}20`, borderRadius: 12, overflow: "hidden",
      }}
    >
      {/* Browser chrome */}
      <div style={{
        padding: "8px 12px", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: 6, background: "var(--bg-2)",
      }}>
        <div style={{ display: "flex", gap: 4 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#ef4444" }} />
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#f59e0b" }} />
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
        </div>
        <div style={{
          flex: 1, fontSize: 9, color: "var(--text-3)", textAlign: "center",
          background: "var(--bg-1)", padding: "2px 8px", borderRadius: 4,
          fontFamily: "ui-monospace, monospace",
        }}>
          {title.toLowerCase().replace(/\s+/g, "-")}.com
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {mobilePreview ? <Smartphone size={10} style={{ color: "var(--text-3)" }} /> : <Monitor size={10} style={{ color: "var(--text-3)" }} />}
        </div>
      </div>

      {/* Navigation */}
      {navigation && navigation.length > 0 && (
        <div style={{
          padding: "6px 12px", borderBottom: "1px solid var(--border)",
          display: "flex", gap: 12, background: `${color}04`,
        }}>
          {navigation.map((item, i) => (
            <span key={i} style={{ fontSize: 8, fontWeight: 600, color: i === 0 ? color : "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {item}
            </span>
          ))}
        </div>
      )}

      {/* Hero section */}
      {hero && (
        <div style={{
          padding: "20px 16px", textAlign: "center",
          background: `linear-gradient(180deg, ${color}08, transparent)`,
        }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", lineHeight: 1.2, marginBottom: 6 }}>
            {hero}
          </div>
          <div style={{ fontSize: 8, color: "var(--text-3)", marginBottom: 8 }}>
            Subheadline text here
          </div>
          <div style={{
            display: "inline-block", padding: "4px 12px", borderRadius: 6,
            background: `${color}14`, border: `1px solid ${color}30`, color,
            fontSize: 8, fontWeight: 700,
          }}>
            Get Started
          </div>
        </div>
      )}

      {/* Sections */}
      {sections && sections.length > 0 && (
        <div style={{ padding: "8px 12px" }}>
          {sections.map((section, i) => (
            <div key={i} style={{
              padding: "8px 0", borderBottom: i < sections.length - 1 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <Layout size={8} style={{ color }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text)" }}>{section.title}</span>
              </div>
              <p style={{ fontSize: 8, color: "var(--text-3)", margin: 0, lineHeight: 1.4 }}>{section.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div style={{
        padding: "6px 12px", borderTop: "1px solid var(--border)",
        background: "var(--bg-2)", display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontSize: 8, color: "var(--text-3)" }}>Preview</span>
        <span style={{ fontSize: 7, color, fontWeight: 600 }}>{style.replace(/_/g, " ").toUpperCase()}</span>
      </div>
    </motion.div>
  );
}
