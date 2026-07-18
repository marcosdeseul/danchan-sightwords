import { useCallback } from "react";
import {
  SPEECH_REPLAY_DELAY_MS,
  SPEECH_START_TIMEOUT_MS,
  SPEECH_START_TIMEOUT_NOTICE,
  getSpeechVoices,
  preferredEnglishVoice,
  speechFailureNotice,
} from "../speech";
import type { AppDispatch, AppStateRef, CurrentRef } from "./types";

export function useCoreActions({
  stateRef,
  autoAdvanceTimer,
  speechControl,
  dispatch,
}: {
  stateRef: AppStateRef;
  autoAdvanceTimer: CurrentRef<number>;
  speechControl: CurrentRef<{
    replayTimer: number;
    startTimer: number;
    requestId: number;
  }>;
  dispatch: AppDispatch;
}) {
  const clearSpeechTimers = () => {
    if (speechControl.current.replayTimer) {
      window.clearTimeout(speechControl.current.replayTimer);
      speechControl.current.replayTimer = 0;
    }

    if (speechControl.current.startTimer) {
      window.clearTimeout(speechControl.current.startTimer);
      speechControl.current.startTimer = 0;
    }
  };

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
    speechControl.current.requestId += 1;
    clearSpeechTimers();
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

    const synthesis = window.speechSynthesis;
    const requestId = speechControl.current.requestId + 1;
    speechControl.current.requestId = requestId;
    clearSpeechTimers();

    const utterance = new SpeechSynthesisUtterance(word);
    const voice = preferredEnglishVoice(getSpeechVoices(synthesis));
    utterance.lang = voice?.lang || "en-US";
    utterance.voice = voice;
    utterance.rate = 0.76;
    utterance.pitch = 1;
    utterance.volume = 1;

    const clearStartTimer = () => {
      if (speechControl.current.startTimer) {
        window.clearTimeout(speechControl.current.startTimer);
        speechControl.current.startTimer = 0;
      }
    };

    utterance.onstart = () => {
      if (speechControl.current.requestId !== requestId) {
        return;
      }

      clearStartTimer();
      dispatch({ type: "setSpeaking", speaking: true });
    };
    utterance.onend = () => {
      if (speechControl.current.requestId !== requestId) {
        return;
      }

      clearStartTimer();
      dispatch({ type: "setSpeaking", speaking: false });
    };
    utterance.onerror = (event) => {
      if (speechControl.current.requestId !== requestId) {
        return;
      }

      clearStartTimer();
      dispatch({ type: "setSpeaking", speaking: false });
      dispatch({
        type: "setSpeechNotice",
        message: speechFailureNotice(event?.error),
      });
    };

    const startSpeaking = () => {
      if (speechControl.current.requestId !== requestId) {
        return;
      }

      speechControl.current.replayTimer = 0;

      try {
        synthesis.resume();
        synthesis.speak(utterance);
      } catch {
        dispatch({ type: "setSpeaking", speaking: false });
        dispatch({ type: "setSpeechNotice", message: speechFailureNotice() });
        return;
      }

      speechControl.current.startTimer = window.setTimeout(() => {
        if (speechControl.current.requestId !== requestId) {
          return;
        }

        speechControl.current.requestId += 1;
        speechControl.current.startTimer = 0;
        synthesis.cancel();
        dispatch({ type: "setSpeaking", speaking: false });
        dispatch({ type: "setSpeechNotice", message: SPEECH_START_TIMEOUT_NOTICE });
      }, SPEECH_START_TIMEOUT_MS);
    };

    dispatch({ type: "setSpeaking", speaking: true });

    if (synthesis.speaking || synthesis.pending || synthesis.paused) {
      synthesis.cancel();
      speechControl.current.replayTimer = window.setTimeout(
        startSpeaking,
        SPEECH_REPLAY_DELAY_MS,
      );
    } else {
      startSpeaking();
    }

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
