import { useMemo } from "react";
import {
  activeStage,
  activeStageState,
  currentWordFor,
  rewardById,
  totalKnownCount,
} from "../../game";
import type { AppState, TreasureRevealState } from "../state";

export function useViewModel(
  state: AppState,
  treasureReveal: TreasureRevealState | null,
) {
  const viewModel = useMemo(() => {
    if (!state.content || !state.progress) {
      return null;
    }

    const stage = activeStage(state.content, state.progress);
    const stageState = activeStageState(state.content, state.progress);
    const word = currentWordFor(state.content, state.progress);
    const knownSet = new Set(stageState.knownWords);
    const practiceSet = new Set(stageState.practiceWords);
    const equipped = new Set(stageState.equippedItems);
    const equippedRewards = stage.rewards.filter((reward) => equipped.has(reward.id));
    const knownCount = stageState.knownWords.length;

    return {
      stage,
      stageState,
      word,
      knownSet,
      practiceSet,
      equippedRewards,
      knownCount,
      practiceCount: stageState.practiceWords.length,
      leftCount: stage.words.length - knownCount,
      totalCount: totalKnownCount(state.content, state.progress),
      knownPercent: (knownCount / stage.words.length) * 100,
    };
  }, [state.content, state.progress]);

  const treasureRevealDetails = useMemo(() => {
    if (!treasureReveal || !state.user || !state.content || !state.progress) {
      return null;
    }

    const revealStage = state.content.stages.find(
      (candidate) => candidate.id === treasureReveal.stageId,
    );
    const revealStageState = state.progress.stages[String(treasureReveal.stageId)];
    const revealReward = revealStage
      ? rewardById(revealStage, treasureReveal.rewardId)
      : undefined;

    if (
      !revealStage ||
      !revealStageState ||
      !revealReward ||
      !revealStageState.unlockedItems.includes(revealReward.id) ||
      !revealStageState.equippedItems.includes(revealReward.id)
    ) {
      return null;
    }

    const equippedIds = new Set(revealStageState.equippedItems);

    return {
      stage: revealStage,
      reward: revealReward,
      equippedRewards: revealStage.rewards.filter((reward) => equippedIds.has(reward.id)),
    };
  }, [state.content, state.progress, state.user, treasureReveal]);

  return { viewModel, treasureRevealDetails };
}
