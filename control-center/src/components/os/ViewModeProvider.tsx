"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { isAdvancedPath } from "@/lib/navigation";
import { persistViewMode, resolveInitialViewMode, type ViewMode } from "@/lib/viewMode";

type ViewModeContextValue = {
  mode: ViewMode;
  isExpert: boolean;
  setMode: (mode: ViewMode) => void;
  toggleMode: () => void;
};

const ViewModeContext = createContext<ViewModeContextValue | null>(null);

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mode, setModeState] = useState<ViewMode>("simple");

  useEffect(() => {
    const nextMode = resolveInitialViewMode(pathname, window.localStorage);
    setModeState(nextMode);
    if (nextMode === "expert" || isAdvancedPath(pathname)) {
      persistViewMode("expert", window.localStorage);
    }
  }, [pathname]);

  const setMode = (nextMode: ViewMode) => {
    setModeState(nextMode);
    persistViewMode(nextMode, window.localStorage);
  };

  const value = useMemo<ViewModeContextValue>(() => ({
    mode,
    isExpert: mode === "expert",
    setMode,
    toggleMode: () => setMode(mode === "expert" ? "simple" : "expert"),
  }), [mode]);

  return <ViewModeContext.Provider value={value}>{children}</ViewModeContext.Provider>;
}

export function useViewMode() {
  const value = useContext(ViewModeContext);
  if (!value) throw new Error("useViewMode must be used inside ViewModeProvider");
  return value;
}

export function useOptionalViewMode() {
  return useContext(ViewModeContext);
}
