import { useEffect } from "react";
import { api } from "../../api";
import { activeStageState, clearOfflineProgress, clearPreviousLocalProgress, defaultProgress, loadOfflineProgress, sanitizeProgress } from "../../game";
import type { ProgressState, SightWordsContent } from "../../types";
import type { MeResponse, ProgressResponse } from "../apiTypes";
import type { AppDispatch, AppStateRef, CurrentRef } from "./types";

export function useAppInitialization({ stateRef, queuedProgress, dispatch, openPendingMaze }: { stateRef: AppStateRef; queuedProgress: CurrentRef<ProgressState | null>; dispatch: AppDispatch; openPendingMaze: () => void }) {
  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      try {
        const content = await api<SightWordsContent>("/api/content");
        const initialProgress = defaultProgress(content);
        if (cancelled) return;
        dispatch({ type: "bootstrapped", content, progress: initialProgress });
        try {
          const me = await api<MeResponse>("/api/me");
          if (cancelled) return;
          if (!me.user) { dispatch({ type: "accountReady", user: null, message: "Log in or sign up to play." }); return; }
          const offlineProgress = loadOfflineProgress(content, me.user.id);
          let nextProgress: ProgressState;
          let message = "";
          try { nextProgress = sanitizeProgress(content, (await api<ProgressResponse>("/api/progress")).progress); }
          catch (error) {
            if (!offlineProgress) throw error;
            nextProgress = offlineProgress; queuedProgress.current = offlineProgress;
            message = "Offline. Progress is saved on this device and will sync automatically.";
          }
          if (offlineProgress && message === "") {
            try {
              nextProgress = sanitizeProgress(content, (await api<ProgressResponse>("/api/progress", { method: "PUT", body: { progress: offlineProgress } })).progress);
              clearOfflineProgress(me.user.id); message = "Back online. Progress synced.";
            } catch { nextProgress = offlineProgress; queuedProgress.current = offlineProgress; message = "Offline. Progress is saved on this device and will sync automatically."; }
          }
          clearPreviousLocalProgress();
          dispatch({ type: "accountReady", user: me.user, progress: nextProgress, message });
          if (activeStageState(content, nextProgress).pendingReward) window.setTimeout(openPendingMaze, 0);
        } catch {
          dispatch({ type: "accountReady", user: null, message: window.navigator.onLine === false ? "Server unavailable. Reconnect to log in." : "Log in or sign up to play." });
        }
      } catch {
        if (!cancelled) dispatch({ type: "setAuthMessage", message: "The game could not load. Refresh and try again." });
      }
    }
    initialize();
    return () => { cancelled = true; };
  }, [dispatch, openPendingMaze, queuedProgress, stateRef]);
}
