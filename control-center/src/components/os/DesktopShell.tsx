"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isAdvancedPath, navigationForMode, pageLabel } from "@/lib/navigation";
import AppTopBar from "./AppTopBar";
import CommandDock from "./CommandDock";
import { useViewMode, ViewModeProvider } from "./ViewModeProvider";
import WorkspaceSurface from "./WorkspaceSurface";

function DesktopShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { mode } = useViewMode();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const effectiveMode = mode === "expert" || isAdvancedPath(pathname) ? "expert" : "simple";
  const navItems = useMemo(() => navigationForMode(effectiveMode), [effectiveMode]);
  const activeLabel = pageLabel(pathname, navItems);
  return (
    <div className="platform-shell desktop-os-shell" data-mode={effectiveMode}>
      <CommandDock mode={effectiveMode} pathname={pathname} mobileOpen={mobileNavOpen} onNavigate={() => setMobileNavOpen(false)} />
      {mobileNavOpen && <button className="platform-mobile-scrim" type="button" aria-label="Fermer le menu" onClick={() => setMobileNavOpen(false)} />}
      <div className="platform-main desktop-viewport">
        <AppTopBar activeLabel={activeLabel} onMenuClick={() => setMobileNavOpen(true)} />
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
