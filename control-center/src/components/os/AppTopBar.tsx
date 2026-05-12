"use client";

import { Sparkles } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import CommandPalette from "./CommandPalette";
import ViewModeToggle from "./ViewModeToggle";
import type { ViewMode } from "@/lib/viewMode";

export default function AppTopBar({
  activeLabel,
  mode,
  onToggleMode,
}: {
  activeLabel: string;
  mode: ViewMode;
  onToggleMode: () => void;
}) {
  return (
    <header className="app-top-bar desktop-appbar">
      <div className="window-controls" aria-hidden="true">
        <i className="close" />
        <i className="minimize" />
        <i className="zoom" />
      </div>
      <div className="desktop-title">
        <span>AI Company OS</span>
        <strong>{activeLabel}</strong>
      </div>
      <div className="desktop-appbar-actions">
        <CommandPalette />
        <div className="desktop-status">
          <Sparkles size={13} />
          Agence AI active
        </div>
        <ThemeToggle />
        <ViewModeToggle mode={mode} onToggle={onToggleMode} />
      </div>
    </header>
  );
}
