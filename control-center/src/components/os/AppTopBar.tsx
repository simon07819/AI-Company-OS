"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

export default function AppTopBar({
  activeLabel,
  onMenuClick,
}: {
  activeLabel: string;
  onMenuClick: () => void;
}) {
  const router = useRouter();
  const [archiving, setArchiving] = useState(false);

  const handleArchive = () => {
    setArchiving(true);
    setTimeout(() => {
      setArchiving(false);
      router.push("/outputs");
    }, 600);
  };

  const handleNewProject = () => {
    router.push(`/ceo?session=${Date.now()}`);
  };

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
        <button
          className="topbar-action-btn"
          onClick={handleArchive}
          disabled={archiving}
          aria-label="Archiver la session"
        >
          {archiving ? "…" : "Archiver"}
        </button>
        <button
          className="topbar-action-btn topbar-action-primary"
          onClick={handleNewProject}
          aria-label="Nouveau projet CEO"
        >
          + Nouveau projet
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
