"use client";

import type { ViewMode } from "@/lib/viewMode";

export default function ViewModeToggle({ mode, onToggle }: { mode: ViewMode; onToggle: () => void }) {
  const expertMode = mode === "expert";
  return (
    <button className="desktop-mode-toggle view-mode-toggle" type="button" onClick={onToggle}>
      {expertMode ? "Mode simple" : "Mode expert"}
    </button>
  );
}
