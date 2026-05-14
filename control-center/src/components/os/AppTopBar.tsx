"use client";

import { Menu } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useOptionalViewMode } from "./ViewModeProvider";
import ViewModeToggle from "./ViewModeToggle";

export default function AppTopBar({
  activeLabel,
  onMenuClick,
}: {
  activeLabel: string;
  onMenuClick: () => void;
}) {
  const viewMode = useOptionalViewMode();

  return (
    <header className="platform-topbar app-top-bar desktop-appbar">
      <button className="platform-mobile-menu-button" type="button" onClick={onMenuClick} aria-label="Ouvrir le menu">
        <Menu size={18} />
      </button>
      <div className="desktop-title platform-title">
        <span>AI Company OS</span>
        <strong>{activeLabel}</strong>
      </div>
      <div className="platform-topbar-actions">
        {viewMode && <ViewModeToggle mode={viewMode.mode} onToggle={viewMode.toggleMode} />}
        <ThemeToggle />
      </div>
    </header>
  );
}
