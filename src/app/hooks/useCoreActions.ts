import { useCallback } from "react";
import type { AppDispatch, AppStateRef, CurrentRef } from "./types";

export function useCoreActions({
  stateRef,
  autoAdvanceTimer,
  dispatch,
}: {
  stateRef: AppStateRef;
  autoAdvanceTimer: CurrentRef<number>;
  dispatch: AppDispatch;
}) {
  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceTimer.current) {
      window.clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = 0;
    }
  }, []);

  const showCelebration = useCallback((message: string) => {
    dispatch({ type: "celebrate", message });
  }, []);

  const stopSpeech = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    dispatch({ type: "setSpeaking", speaking: false });
  }, []);

  const speakWord = useCallback((word: string, options: { clearAutoAdvance?: boolean } = {}) => {
    if (options.clearAutoAdvance !== false) {
      clearAutoAdvance();
    }

    dispatch({ type: "setSpeechNotice", message: "" });

    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      dispatch({
        type: "setSpeechNotice",
        message: "Speech is not available in this browser.",
      });
      return false;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.76;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onstart = () => dispatch({ type: "setSpeaking", speaking: true });
    utterance.onend = () => dispatch({ type: "setSpeaking", speaking: false });
    utterance.onerror = () => {
      dispatch({ type: "setSpeaking", speaking: false });
      dispatch({ type: "setSpeechNotice", message: "Speech could not play. Try again." });
    };

    dispatch({ type: "setSpeaking", speaking: true });
    window.speechSynthesis.speak(utterance);
    return true;
  }, [clearAutoAdvance]);

  const requireAuthenticated = useCallback(() => {
    if (stateRef.current.user) {
      return true;
    }

    clearAutoAdvance();
    stopSpeech();
    dispatch({ type: "stopGames" });
    dispatch({ type: "setAuthMessage", message: "Log in or sign up to play." });
    return false;
  }, [clearAutoAdvance, stopSpeech]);

  return {
    clearAutoAdvance,
    showCelebration,
    stopSpeech,
    speakWord,
    requireAuthenticated,
  };
}
