import { useEffect } from "react";
import { MOVE_DELTAS, TRIP_TARGET, stageById } from "../../game";
import { getSpeechVoices } from "../speech";
import type { TreasureRevealState } from "../state";
import type { AppDispatch, AppStateRef, CurrentRef } from "./types";
import type { AppState } from "../state";

type FieldTripDirection = "left" | "right" | "hit" | "defend";

export function useGameplayEffects({
  state,
  stateRef,
  inventoryOpen,
  setInventoryOpen,
  treasureReveal,
  moveMaze,
  moveFieldTrip,
  completeFieldTrip,
  dispatch,
  wordCheckFeedbackTimer,
  fieldTripDefenseTimer,
  speechControl,
  stopSpeech,
}: {
  state: AppState;
  stateRef: AppStateRef;
  inventoryOpen: boolean;
  setInventoryOpen: (open: boolean) => void;
  treasureReveal: TreasureRevealState | null;
  moveMaze: (direction: keyof typeof MOVE_DELTAS) => void;
  moveFieldTrip: (direction: FieldTripDirection) => void;
  completeFieldTrip: () => void;
  dispatch: AppDispatch;
  wordCheckFeedbackTimer: CurrentRef<number>;
  fieldTripDefenseTimer: CurrentRef<number>;
  speechControl?: CurrentRef<{
    replayTimer: number;
    startTimer: number;
    requestId: number;
  }>;
  stopSpeech?: () => void;
}) {
  useEffect(() => () => {
    if (wordCheckFeedbackTimer.current) {
      window.clearTimeout(wordCheckFeedbackTimer.current);
    }

    if (fieldTripDefenseTimer.current) {
      window.clearTimeout(fieldTripDefenseTimer.current);
    }
  }, [fieldTripDefenseTimer, wordCheckFeedbackTimer]);

  useEffect(() => {
    if (!state.fieldTrip.open || state.fieldTrip.stageId === null || !state.content) {
      return;
    }

    const stage = stageById(state.content, state.fieldTrip.stageId);
    let frame = 0;
    const tick = (timestamp: number) => {
      dispatch({
        type: "tickFieldTrip",
        timestamp,
        creatures: stage.fieldTrip.creatures,
      });
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [dispatch, state.content, state.fieldTrip.open, state.fieldTrip.stageId]);

  useEffect(() => {
    if (state.fieldTrip.open && state.fieldTrip.collected >= TRIP_TARGET) {
      completeFieldTrip();
    }
  }, [completeFieldTrip, state.fieldTrip.collected, state.fieldTrip.open]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const current = stateRef.current;

      if (!current.user || treasureReveal) {
        return;
      }

      if (inventoryOpen && event.key === "Escape") {
        event.preventDefault();
        setInventoryOpen(false);
        return;
      }

      if (current.maze.open) {
        const directions: Record<string, keyof typeof MOVE_DELTAS | undefined> = {
          ArrowUp: "up",
          ArrowDown: "down",
          ArrowLeft: "left",
          ArrowRight: "right",
        };
        const direction = directions[event.key];

        if (direction) {
          event.preventDefault();
          moveMaze(direction);
        }
        return;
      }

      if (current.fieldTrip.open) {
        const directions: Record<string, FieldTripDirection | undefined> = {
          ArrowLeft: "left",
          ArrowRight: "right",
          ArrowDown: "defend",
          " ": "hit",
          Enter: "hit",
        };
        const direction = directions[event.key];

        if (direction) {
          event.preventDefault();
          moveFieldTrip(direction);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [inventoryOpen, moveFieldTrip, moveMaze, setInventoryOpen, stateRef, treasureReveal]);

  useEffect(() => {
    const synthesis = "speechSynthesis" in window ? window.speechSynthesis : null;
    const prepareVoices = () => synthesis && getSpeechVoices(synthesis);
    const handleBeforeUnload = stopSpeech || (() => synthesis?.cancel());

    prepareVoices();
    if (typeof synthesis?.addEventListener === "function") {
      synthesis.addEventListener("voiceschanged", prepareVoices);
    }
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (typeof synthesis?.removeEventListener === "function") {
        synthesis.removeEventListener("voiceschanged", prepareVoices);
      }
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (speechControl?.current.replayTimer) {
        window.clearTimeout(speechControl.current.replayTimer);
      }
      if (speechControl?.current.startTimer) {
        window.clearTimeout(speechControl.current.startTimer);
      }
      synthesis?.cancel();
    };
  }, [speechControl, stopSpeech]);
}
