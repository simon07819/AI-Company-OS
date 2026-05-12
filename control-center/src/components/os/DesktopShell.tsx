"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { navigationForMode, pageLabel } from "@/lib/navigation";
import AppTopBar from "./AppTopBar";
import CommandDock from "./CommandDock";
import { useViewMode, ViewModeProvider } from "./ViewModeProvider";
import WorkspaceSurface from "./WorkspaceSurface";

function DesktopShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { mode, toggleMode } = useViewMode();
  const navItems = useMemo(() => navigationForMode(mode), [mode]);
  const activeLabel = pageLabel(pathname, navItems);

  return (
    <div className="desktop-os-shell" data-mode={mode}>
      <CommandDock mode={mode} pathname={pathname} />
      <div className="desktop-viewport">
        <AppTopBar activeLabel={activeLabel} mode={mode} onToggleMode={toggleMode} />
        <WorkspaceSurface>{children}</WorkspaceSurface>
      </div>
    </div>
  );
}

export default function DesktopShell({ children }: { children: ReactNode }) {
  return (
    <ViewModeProvider>
      <DesktopShellInner>{children}</DesktopShellInner>
    </ViewModeProvider>
  );
}
