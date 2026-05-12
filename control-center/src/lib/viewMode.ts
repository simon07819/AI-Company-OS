import { isAdvancedPath } from "./navigation";

export type ViewMode = "simple" | "expert";

export const VIEW_MODE_STORAGE_KEY = "ai-company-os-view-mode";
export const LEGACY_NAV_MODE_STORAGE_KEY = "ai-company-os-nav-mode";

export function isViewMode(value: unknown): value is ViewMode {
  return value === "simple" || value === "expert";
}

export function resolveInitialViewMode(pathname: string, storage?: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null): ViewMode {
  try {
    const stored = storage?.getItem(VIEW_MODE_STORAGE_KEY);
    if (isViewMode(stored)) return stored;

    const legacy = storage?.getItem(LEGACY_NAV_MODE_STORAGE_KEY);
    if (isViewMode(legacy)) {
      storage?.setItem(VIEW_MODE_STORAGE_KEY, legacy);
      storage?.removeItem(LEGACY_NAV_MODE_STORAGE_KEY);
      return legacy;
    }
  } catch {
    // Storage can be unavailable.
  }

  return isAdvancedPath(pathname) ? "expert" : "simple";
}

export function persistViewMode(mode: ViewMode, storage?: Pick<Storage, "setItem"> | null): void {
  try {
    storage?.setItem(VIEW_MODE_STORAGE_KEY, mode);
  } catch {
    // Mode still applies for current render.
  }
}
