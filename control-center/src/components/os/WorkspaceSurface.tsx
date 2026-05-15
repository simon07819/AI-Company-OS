"use client";

import type { ReactNode } from "react";

export default function WorkspaceSurface({ children }: { children: ReactNode }) {
  return (
    <main className="workspace-surface">
      {children}
    </main>
  );
}
