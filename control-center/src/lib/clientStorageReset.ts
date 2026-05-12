export const CLIENT_STORAGE_RESET_PATTERNS = [
  /ai-company/i,
  /company-os/i,
  /ceo-simple/i,
  /simple-agency/i,
];

export const CLIENT_STORAGE_PRESERVED_KEYS = new Set([
  "ai-company-os-theme",
  "ai-company-os-view-mode",
  "ai-company-os-nav-mode",
]);

type BrowserStorageLike = Pick<Storage, "length" | "key" | "removeItem">;

export function shouldClearCompanyOsStorageKey(key: string): boolean {
  if (CLIENT_STORAGE_PRESERVED_KEYS.has(key)) return false;
  return CLIENT_STORAGE_RESET_PATTERNS.some((pattern) => pattern.test(key));
}

export function cleanupCompanyOsClientStorage(storages?: BrowserStorageLike[]): string[] {
  const targets = storages ?? (typeof window === "undefined" ? [] : [window.localStorage, window.sessionStorage]);
  const removed: string[] = [];

  for (const storage of targets) {
    for (let index = storage.length - 1; index >= 0; index -= 1) {
      const key = storage.key(index);
      if (key && shouldClearCompanyOsStorageKey(key)) {
        storage.removeItem(key);
        removed.push(key);
      }
    }
  }

  return removed;
}
