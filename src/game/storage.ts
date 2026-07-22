import type { ProgressState } from "../types";

export const STORAGE_KEY = "danSightWords:v2";
export const LEGACY_STORAGE_KEY = "danSightWords:v1";
export const OFFLINE_STORAGE_PREFIX = "danSightWords:offline:v1";

export function readJsonStorage(key: string): unknown {
  try {
    return JSON.parse(window.localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

export function offlineProgressStorageKey(userId: number): string {
  return `${OFFLINE_STORAGE_PREFIX}:${userId}`;
}

export function saveOfflineProgress(userId: number, progress: ProgressState): boolean {
  try {
    window.localStorage.setItem(
      offlineProgressStorageKey(userId),
      JSON.stringify({ userId, progress }),
    );
    return true;
  } catch {
    return false;
  }
}

export function clearOfflineProgress(userId: number): void {
  try {
    window.localStorage.removeItem(offlineProgressStorageKey(userId));
  } catch {
    // A successful server save is enough when browser storage is unavailable.
  }
}

export function clearPreviousLocalProgress(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Old browser data is ignored even if storage cleanup is unavailable.
  }
}
