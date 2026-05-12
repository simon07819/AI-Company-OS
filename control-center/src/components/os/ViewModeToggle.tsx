"use client";

export const NAV_MODE_STORAGE_KEY = "ai-company-os-nav-mode";

export default function ViewModeToggle({ expertMode, onToggle }: { expertMode: boolean; onToggle: () => void }) {
  return (
    <button className="desktop-mode-toggle view-mode-toggle" type="button" onClick={onToggle}>
      {expertMode ? "Mode simple" : "Mode expert"}
    </button>
  );
}
