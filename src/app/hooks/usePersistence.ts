import { useCallback } from "react";
import { api } from "../../api";
import {
  clearOfflineProgress,
  clearPreviousLocalProgress,
  loadOfflineProgress,
  sanitizeProgress,
  saveOfflineProgress,
} from "../../game";
import type { ProgressState } from "../../types";
import type { ProgressResponse } from "../apiTypes";
import type { LastAnswerAction } from "../state";
import type { AppDispatch, AppStateRef, CurrentRef } from "./types";

export function usePersistence({
  stateRef,
  queuedProgress,
  syncInFlight,
  dispatch,
}: {
  stateRef: AppStateRef;
  queuedProgress: CurrentRef<ProgressState | null>;
  syncInFlight: CurrentRef<boolean>;
  dispatch: AppDispatch;
}) {
  const flushProgressToServer = useCallback(async () => {
    const current = stateRef.current;
    const user = current.user;

    if (!user || syncInFlight.current) {
      return;
    }

    if (!queuedProgress.current && current.content) {
      queuedProgress.current = loadOfflineProgress(current.content, user.id);
    }

    if (!queuedProgress.current) {
      return;
    }

    syncInFlight.current = true;
    let recoveredOfflineProgress = Boolean(
      current.content && loadOfflineProgress(current.content, user.id),
    );

    try {
      while (queuedProgress.current) {
        const progressToSave = queuedProgress.current;
        queuedProgress.current = null;

        try {
          const result = await api<ProgressResponse>("/api/progress", {
            method: "PUT",
            body: { progress: progressToSave },
          });

          if (queuedProgress.current) {
            continue;
          }

          const latest = stateRef.current;

          clearOfflineProgress(user.id);
          clearPreviousLocalProgress();

          if (latest.user?.id !== user.id || !latest.content) {
            return;
          }

          const syncedProgress = sanitizeProgress(latest.content, result.progress);
          dispatch({ type: "setProgress", progress: syncedProgress });
          dispatch({
            type: "setAuthMessage",
            message: recoveredOfflineProgress ? "Back online. Progress synced." : "",
          });
          recoveredOfflineProgress = false;
        } catch {
          const latestProgress = queuedProgress.current || progressToSave;
          queuedProgress.current = latestProgress;
          const savedOffline = saveOfflineProgress(user.id, latestProgress);

          dispatch({
            type: "setAuthMessage",
            message: savedOffline
              ? "Offline. Progress is saved on this device and will sync automatically."
              : "Server unavailable. Keep this page open so progress can retry.",
          });
          return;
        }
      }
    } finally {
      syncInFlight.current = false;
    }
  }, []);

  const commitProgress = useCallback((nextProgress: ProgressState, options: {
    lastAnswerAction?: LastAnswerAction | null;
  } = {}): ProgressState | null => {
    const content = stateRef.current.content;

    if (!content) {
      return null;
    }

    const cleanProgress = sanitizeProgress(content, nextProgress);
    dispatch({
      type: "setProgress",
      progress: cleanProgress,
      lastAnswerAction: options.lastAnswerAction,
    });

    if (stateRef.current.user) {
      const user = stateRef.current.user;
      queuedProgress.current = cleanProgress;

      if (window.navigator.onLine === false) {
        const savedOffline = saveOfflineProgress(user.id, cleanProgress);
        dispatch({
          type: "setAuthMessage",
          message: savedOffline
            ? "Offline. Progress is saved on this device and will sync automatically."
            : "Server unavailable. Keep this page open so progress can retry.",
        });
      } else {
        void flushProgressToServer();
      }
    }

    return cleanProgress;
  }, [flushProgressToServer]);

  return { flushProgressToServer, commitProgress };
}
