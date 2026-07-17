import { useCallback } from "react";
import {
  MAZE_CHEST,
  MOVE_DELTAS,
  activeStage,
  activeStageState,
  cloneProgress,
  currentMazeLayout,
  isOpenMazeTile,
  isStageComplete,
  rewardById,
  sortRewardIds,
} from "../../game";
import type { ProgressState, StageContent } from "../../types";
import type { TreasureRevealState } from "../state";
import type {
  AppDispatch,
  AppStateRef,
  CommitProgress,
  CurrentRef,
  SetTreasureReveal,
} from "./types";

export function useTreasureFlow({
  stateRef,
  rewardClaimInFlight,
  treasureReveal,
  setTreasureReveal,
  dispatch,
  commitProgress,
  requireAuthenticated,
  handleStageComplete,
  scheduleNextWord,
}: {
  stateRef: AppStateRef;
  rewardClaimInFlight: CurrentRef<boolean>;
  treasureReveal: TreasureRevealState | null;
  setTreasureReveal: SetTreasureReveal;
  dispatch: AppDispatch;
  commitProgress: CommitProgress;
  requireAuthenticated: () => boolean;
  handleStageComplete: (stage: StageContent, progress: ProgressState) => void;
  scheduleNextWord: (delay: number) => void;
}) {
  const moveMaze = useCallback((direction: keyof typeof MOVE_DELTAS) => {
    const current = stateRef.current;

    if (!current.content || !current.progress || !current.maze.open || !requireAuthenticated()) {
      return;
    }

    const delta = MOVE_DELTAS[direction];
    const stage = activeStage(current.content, current.progress);
    const layout = currentMazeLayout(current.progress, stage);
    const nextPosition = {
      row: current.maze.position.row + delta.row,
      col: current.maze.position.col + delta.col,
    };

    if (!isOpenMazeTile(layout, nextPosition)) {
      dispatch({ type: "bumpMaze", message: "That path is blocked. Try another way." });
      return;
    }

    dispatch({ type: "moveMaze", position: nextPosition, message: "Keep going." });

    if (nextPosition.row === MAZE_CHEST.row && nextPosition.col === MAZE_CHEST.col) {
      claimPendingReward();
    }
  }, [requireAuthenticated]);

  const claimPendingReward = useCallback(() => {
    const current = stateRef.current;

    if (rewardClaimInFlight.current) {
      return;
    }

    if (!current.content || !current.progress) {
      dispatch({ type: "closeMaze" });
      return;
    }

    const nextProgress = cloneProgress(current.progress);
    const stage = activeStage(current.content, nextProgress);
    const stageState = activeStageState(current.content, nextProgress);
    const reward = stageState.pendingReward
      ? rewardById(stage, stageState.pendingReward.itemId)
      : undefined;

    if (!reward) {
      dispatch({ type: "closeMaze" });
      return;
    }

    rewardClaimInFlight.current = true;

    const unlockedItems = new Set(stageState.unlockedItems);
    const equippedItems = new Set(stageState.equippedItems);
    const completedMazeMilestones = new Set(stageState.completedMazeMilestones);

    unlockedItems.add(reward.id);
    equippedItems.add(reward.id);
    completedMazeMilestones.add(reward.milestone);
    stageState.unlockedItems = sortRewardIds([...unlockedItems], stage);
    stageState.equippedItems = sortRewardIds([...equippedItems], stage);
    stageState.completedMazeMilestones = [...completedMazeMilestones].sort(
      (first, second) => first - second,
    );
    stageState.pendingReward = null;

    commitProgress(nextProgress);
    dispatch({ type: "closeMaze" });
    setTreasureReveal({ stageId: stage.id, rewardId: reward.id });
  }, [commitProgress]);

  const continueAfterTreasureReveal = useCallback(() => {
    const current = stateRef.current;
    const claimedReward = treasureReveal;

    setTreasureReveal(null);
    rewardClaimInFlight.current = false;

    if (!claimedReward || !current.content || !current.progress) {
      return;
    }

    const stage = current.content.stages.find(
      (candidate) => candidate.id === claimedReward.stageId,
    );
    const stageState = current.progress.stages[String(claimedReward.stageId)];

    if (!stage || !stageState) {
      return;
    }

    if (isStageComplete(stage, stageState)) {
      handleStageComplete(stage, current.progress);
    } else {
      scheduleNextWord(0);
    }
  }, [handleStageComplete, scheduleNextWord, treasureReveal]);

  return { moveMaze, claimPendingReward, continueAfterTreasureReveal };
}
