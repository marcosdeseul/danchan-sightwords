import { useCallback } from "react";
import {
  cloneProgress,
  completedFieldTripsFor,
  hasNextStage,
  isStageComplete,
  stageById,
  unlockedStageIdsFor,
} from "../../game";
import { FIELD_TRIP_DEFEND_MS } from "../fieldTrip";
import type { AppDispatch, AppStateRef, CommitProgress, CurrentRef } from "./types";

export function useFieldTripFlow({
  stateRef,
  fieldTripDefenseTimer,
  dispatch,
  requireAuthenticated,
  commitProgress,
  showCelebration,
}: {
  stateRef: AppStateRef;
  fieldTripDefenseTimer: CurrentRef<number>;
  dispatch: AppDispatch;
  requireAuthenticated: () => boolean;
  commitProgress: CommitProgress;
  showCelebration: (message: string) => void;
}) {
  const moveFieldTrip = useCallback((direction: "left" | "right" | "hit" | "defend") => {
    if (!requireAuthenticated()) {
      return;
    }

    const current = stateRef.current;
    const stage = current.content && current.fieldTrip.stageId !== null
      ? stageById(current.content, current.fieldTrip.stageId)
      : null;

    dispatch({
      type: "moveFieldTrip",
      direction,
      creatures: stage?.fieldTrip.creatures,
      stageId: stage?.id,
    });

    if (direction === "hit") {
      window.setTimeout(() => dispatch({ type: "clearFieldTripSwing" }), 180);
    }

    if (direction === "defend") {
      window.clearTimeout(fieldTripDefenseTimer.current);
      fieldTripDefenseTimer.current = window.setTimeout(
        () => {
          fieldTripDefenseTimer.current = 0;
          dispatch({ type: "clearFieldTripDefense" });
        },
        FIELD_TRIP_DEFEND_MS,
      );
    }
  }, [requireAuthenticated]);

  const completeFieldTrip = useCallback(() => {
    const current = stateRef.current;

    if (!current.content || !current.progress || current.fieldTrip.stageId === null) {
      dispatch({ type: "closeFieldTrip" });
      return;
    }

    const nextProgress = cloneProgress(current.progress);
    const stage = stageById(current.content, current.fieldTrip.stageId);
    const stageState = nextProgress.stages[String(stage.id)];

    if (!hasNextStage(current.content, stage) || !isStageComplete(stage, stageState)) {
      dispatch({ type: "closeFieldTrip" });
      return;
    }

    stageState.fieldTripCompleted = true;
    nextProgress.completedFieldTrips = completedFieldTripsFor(
      current.content,
      nextProgress.stages,
    );
    nextProgress.unlockedStageIds = unlockedStageIdsFor(
      current.content,
      nextProgress.stages,
    );
    nextProgress.activeStageId = nextProgress.unlockedStageIds.includes(stage.id + 1)
      ? stage.id + 1
      : stage.id;
    commitProgress(nextProgress);
    dispatch({ type: "closeFieldTrip" });
    showCelebration(stage.fieldTrip.finish);
  }, [commitProgress, showCelebration]);

  return { moveFieldTrip, completeFieldTrip };
}
