"use client";

import { motion } from "framer-motion";
import { Palette, Type, Eye } from "lucide-react";

interface BrandPreviewCardProps {
  brandName: string;
  tagline?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontHeading?: string;
  fontBody?: string;
  style?: string;
  mood?: string;
}

export function BrandPreviewCard({
  brandName, tagline, primaryColor = "#0A0A0A", secondaryColor = "#1A1A2E",
  accentColor = "#C9A96E", fontHeading = "Inter Bold", fontBody = "Inter Regular",
  style = "minimalist_premium", mood,
}: BrandPreviewCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        background: "var(--surface)", border: "1px solid var(--border)",
        borderRadius: 12, overflow: "hidden",
      }}
    >
      {/* Brand hero */}
      <div style={{
        padding: "24px 20px", textAlign: "center",
        background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
        minHeight: 80, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: accentColor, letterSpacing: "0.05em", fontFamily: fontHeading }}>
          {brandName}
        </div>
        {tagline && (
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.7)", marginTop: 4, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {tagline}
          </div>
        )}
      </div>

      {/* Color palette */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
          <Palette size={10} style={{ color: "var(--text-3)" }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Color Palette</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { color: primaryColor, label: "Primary" },
            { color: secondaryColor, label: "Secondary" },
            { color: accentColor, label: "Accent" },
            { color: "#F5F5F5", label: "Surface" },
            { color: "#333333", label: "Text" },
          ].map(({ color, label }) => (
            <div key={label} style={{ textAlign: "center" }}>
              <div style={{
                width: 32, height: 32, borderRadius: 6,
                background: color, border: "1px solid var(--border)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }} />
              <span style={{ fontSize: 7, color: "var(--text-3)", marginTop: 3, display: "block" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Typography */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 8 }}>
          <Type size={10} style={{ color: "var(--text-3)" }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Typography</span>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 4, fontFamily: fontHeading }}>
          {fontHeading}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-2)", fontFamily: fontBody }}>
          {fontBody} — The quick brown fox jumps over the lazy dog.
        </div>
      </div>

      {/* Mood & style */}
      <div style={{ padding: "10px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
          <Eye size={10} style={{ color: "var(--text-3)" }} />
          <span style={{ fontSize: 9, fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Direction</span>
        </div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 4, background: `${accentColor}12`, color: accentColor, fontWeight: 600 }}>
            {style.replace(/_/g, " ")}
          </span>
          {mood && (
            <span style={{ fontSize: 8, padding: "2px 6px", borderRadius: 4, background: "var(--bg-2)", border: "1px solid var(--border)", color: "var(--text-3)", fontWeight: 600 }}>
              {mood}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
