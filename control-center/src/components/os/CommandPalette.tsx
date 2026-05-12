"use client";

import { Search } from "lucide-react";

export default function CommandPalette() {
  return (
    <button className="desktop-search command-palette-trigger" type="button" aria-label="Command palette">
      <Search size={14} />
      <span>Command</span>
    </button>
  );
}
