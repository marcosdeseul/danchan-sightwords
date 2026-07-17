import { useCallback } from "react";
import {
  TRIP_TARGET,
  activeStage,
  activeStageState,
  hasNextStage,
  rewardById,
  stageById,
} from "../../game";
import type { ProgressState, StageContent } from "../../types";
import { spawnCreature } from "../fieldTrip";
import type { AppDispatch, AppStateRef, CurrentRef } from "./types";

export function useStageFlow({
  stateRef,
  rewardClaimInFlight,
  dispatch,
  clearAutoAdvance,
  stopSpeech,
  showCelebration,
}: {
  stateRef: AppStateRef;
  rewardClaimInFlight: CurrentRef<boolean>;
  dispatch: AppDispatch;
  clearAutoAdvance: () => void;
  stopSpeech: () => void;
  showCelebration: (message: string) => void;
}) {
  const openPendingMaze = useCallback(() => {
    const current = stateRef.current;

    if (!current.content || !current.progress) {
      return;
    }

    const stage = activeStage(current.content, current.progress);
    const stageState = activeStageState(current.content, current.progress);

    if (!stageState.pendingReward || !rewardById(stage, stageState.pendingReward.itemId)) {
      return;
    }

    clearAutoAdvance();
    stopSpeech();
    rewardClaimInFlight.current = false;
    dispatch({ type: "openMaze" });
  }, [clearAutoAdvance, stopSpeech]);

  const openFieldTrip = useCallback((stageId: number) => {
    const current = stateRef.current;

    if (!current.content || !current.progress) {
      return;
    }

    const stage = stageById(current.content, stageId);
    const stageState = current.progress.stages[String(stage.id)];

    if (
      !hasNextStage(current.content, stage) ||
      !stageState ||
      stageState.knownWords.length < stage.words.length ||
      stageState.fieldTripCompleted
    ) {
      return;
    }

    clearAutoAdvance();
    stopSpeech();
    dispatch({
      type: "openFieldTrip",
      stageId: stage.id,
      creature: spawnCreature(stage.fieldTrip.creatures, stage.id),
      message: `Defeat ${TRIP_TARGET} creatures and block their attacks.`,
    });
  }, [clearAutoAdvance, stopSpeech]);

  const handleStageComplete = useCallback((stage: StageContent, progress: ProgressState) => {
    const content = stateRef.current.content;

    if (!content) {
      return;
    }

    const stageState = progress.stages[String(stage.id)];

    if (hasNextStage(content, stage) && !stageState.fieldTripCompleted) {
      window.setTimeout(() => openFieldTrip(stage.id), 700);
      return;
    }

    if (!hasNextStage(content, stage)) {
      showCelebration("All stages complete!");
    }
  }, [openFieldTrip, showCelebration]);

  return { openPendingMaze, openFieldTrip, handleStageComplete };
}
