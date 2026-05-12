"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import AppTopBar from "./AppTopBar";
import CommandDock, { EXPERT_NAV, SIMPLE_NAV, pageLabel } from "./CommandDock";
import { NAV_MODE_STORAGE_KEY } from "./ViewModeToggle";
import WorkspaceSurface from "./WorkspaceSurface";

function isAdvancedPath(pathname: string) {
  return /^\/(ceo\/expert|runtime|logs|system|settings|demo|crm|revenue|distribution|workspaces|agents|approvals|mission|conversations|business|archive)(\/|$)/.test(pathname);
}

export default function DesktopShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [expertMode, setExpertMode] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(NAV_MODE_STORAGE_KEY);
      if (stored === "expert") {
        setExpertMode(true);
        return;
      }
      if (stored === "simple") {
        setExpertMode(false);
        return;
      }
      setExpertMode(isAdvancedPath(pathname));
    } catch {
      setExpertMode(isAdvancedPath(pathname));
    }
  }, [pathname]);

  const navItems = useMemo(() => expertMode ? EXPERT_NAV : SIMPLE_NAV, [expertMode]);
  const activeLabel = pageLabel(pathname, navItems);

  const toggleExpertMode = () => {
    setExpertMode((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(NAV_MODE_STORAGE_KEY, next ? "expert" : "simple");
      } catch {
        // localStorage can be unavailable in private or test environments.
      }
      return next;
    });
  };

  return (
    <div className="desktop-os-shell" data-mode={expertMode ? "expert" : "simple"}>
      <CommandDock expertMode={expertMode} pathname={pathname} />
      <div className="desktop-viewport">
        <AppTopBar activeLabel={activeLabel} expertMode={expertMode} onToggleExpertMode={toggleExpertMode} />
        <WorkspaceSurface>{children}</WorkspaceSurface>
      </div>
    </div>
  );
}
