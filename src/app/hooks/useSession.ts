import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { api } from "../../api";
import {
  clearOfflineProgress,
  clearPreviousLocalProgress,
  loadOfflineProgress,
  sanitizeProgress,
} from "../../game";
import type { ProgressState } from "../../types";
import type { AuthResponse, MeResponse, ProgressResponse } from "../apiTypes";
import type {
  AppDispatch,
  AppStateRef,
  CurrentRef,
  SetTreasureReveal,
  SetWordCheck,
} from "./types";

export function useSession({
  stateRef,
  queuedProgress,
  pendingWordCheckIndices,
  rewardClaimInFlight,
  setInventoryOpen,
  setTreasureReveal,
  setWordCheck,
  dispatch,
  clearAutoAdvance,
  clearWordCheckFeedback,
  stopSpeech,
  openPendingMaze,
}: {
  stateRef: AppStateRef;
  queuedProgress: CurrentRef<ProgressState | null>;
  pendingWordCheckIndices: CurrentRef<Record<number, number[]>>;
  rewardClaimInFlight: CurrentRef<boolean>;
  setInventoryOpen: Dispatch<SetStateAction<boolean>>;
  setTreasureReveal: SetTreasureReveal;
  setWordCheck: SetWordCheck;
  dispatch: AppDispatch;
  clearAutoAdvance: () => void;
  clearWordCheckFeedback: () => void;
  stopSpeech: () => void;
  openPendingMaze: () => void;
}) {
  const authenticate = useCallback(async (mode: "login" | "signup", username: string, password: string) => {
    const current = stateRef.current;

    if (!current.content || !current.progress) {
      return;
    }

    dispatch({
      type: "setAuthMessage",
      message: mode === "signup" ? "Creating account..." : "Logging in...",
    });

    try {
      const result = await api<AuthResponse>(`/api/auth/${mode}`, {
        method: "POST",
        body: { username, password },
      });
      const offlineProgress = loadOfflineProgress(current.content, result.user.id);
      let nextProgress = sanitizeProgress(current.content, result.progress);
      let message = "";

      if (offlineProgress) {
        try {
          const synced = await api<ProgressResponse>("/api/progress", {
            method: "PUT",
            body: { progress: offlineProgress },
          });
          nextProgress = sanitizeProgress(current.content, synced.progress);
          clearOfflineProgress(result.user.id);
          message = "Back online. Progress synced.";
        } catch {
          nextProgress = offlineProgress;
          queuedProgress.current = offlineProgress;
          message = "Offline. Progress is saved on this device and will sync automatically.";
        }
      }

      clearPreviousLocalProgress();
      pendingWordCheckIndices.current = {};
      rewardClaimInFlight.current = false;
      setTreasureReveal(null);
      clearWordCheckFeedback();
      setWordCheck(null);
      dispatch({
        type: "accountReady",
        user: result.user,
        progress: nextProgress,
        message,
      });

      window.setTimeout(openPendingMaze, 0);
    } catch (error) {
      dispatch({
        type: "setAuthMessage",
        message: error instanceof Error ? error.message : "Could not log in.",
      });
    }
  }, [clearWordCheckFeedback, openPendingMaze]);

  const updateAccountEmail = useCallback(async (email: string) => {
    dispatch({
      type: "setAuthMessage",
      message: "Saving account settings...",
    });

    try {
      const result = await api<MeResponse>("/api/me", {
        method: "PUT",
        body: { email },
      });

      dispatch({
        type: "setUser",
        user: result.user,
        message: "Account settings saved.",
      });
    } catch (error) {
      dispatch({
        type: "setAuthMessage",
        message: error instanceof Error ? error.message : "Could not save settings.",
      });
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
    } catch {
      // Local play remains blocked behind login even if logout request fails.
    }

    clearAutoAdvance();
    stopSpeech();
    dispatch({ type: "stopGames" });
    setInventoryOpen(false);
    rewardClaimInFlight.current = false;
    setTreasureReveal(null);
    clearWordCheckFeedback();
    setWordCheck(null);
    pendingWordCheckIndices.current = {};
    queuedProgress.current = null;
    dispatch({ type: "setUser", user: null, message: "Logged out. Log in or sign up to play." });
  }, [clearAutoAdvance, clearWordCheckFeedback, stopSpeech]);

  return { authenticate, updateAccountEmail, logout };
}
