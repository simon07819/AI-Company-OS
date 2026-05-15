"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import CommandDock from "./CommandDock";
import { ViewModeProvider } from "./ViewModeProvider";

function DesktopShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="platform-shell" data-path={pathname}>
      <CommandDock mobileOpen={mobileNavOpen} onNavigate={() => setMobileNavOpen(false)} />
      {mobileNavOpen && (
        <button
          className="platform-mobile-scrim"
          type="button"
          aria-label="Fermer le menu"
          onClick={() => setMobileNavOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 100,
            background: "rgba(0,0,0,0.5)", border: "none", cursor: "default",
          }}
        />
      )}
      <div className="platform-main">
        {children}
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
