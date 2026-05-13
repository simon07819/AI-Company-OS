"use client";

import { Menu, MoreHorizontal } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import CommandPalette from "./CommandPalette";
import type { ViewMode } from "@/lib/viewMode";

export default function AppTopBar({
  activeLabel,
  mode,
  onToggleMode,
  onMenuClick,
}: {
  activeLabel: string;
  mode: ViewMode;
  onToggleMode: () => void;
  onMenuClick: () => void;
}) {
  return (
    <header className="platform-topbar app-top-bar desktop-appbar">
      <button className="platform-mobile-menu-button" type="button" onClick={onMenuClick} aria-label="Ouvrir le menu">
        <Menu size={18} />
      </button>
      <div className="desktop-title platform-title">
        <span>AI Company OS</span>
        <strong>{activeLabel}</strong>
      </div>
      <div className="desktop-appbar-actions platform-topbar-actions">
        <CommandPalette />
        <ThemeToggle />
        <button className="platform-more-button" type="button" onClick={onToggleMode} aria-label={mode === "expert" ? "Revenir aux pages principales" : "Afficher les pages avancees"} title="Options">
          <MoreHorizontal size={17} />
        </button>
      </div>
    </header>
  );
}
