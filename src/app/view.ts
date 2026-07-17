import { rewardById } from "../game";
import type { StageContent, StageProgress } from "../types";

export function rewardStatus(stage: StageContent, stageState: StageProgress): string {
  if (stageState.pendingReward) {
    const reward = rewardById(stage, stageState.pendingReward.itemId);
    return reward
      ? `Find the treasure chest to claim ${reward.name}.`
      : "Find the treasure chest to claim the reward.";
  }

  const completed = new Set(stageState.completedMazeMilestones);
  const nextReward = stage.rewards.find((reward) => !completed.has(reward.milestone));

  if (!nextReward) {
    return "All treasure gear found for this stage.";
  }

  const wordsNeeded = Math.max(0, nextReward.milestone - stageState.knownWords.length);

  return wordsNeeded === 0
    ? `Treasure is ready for ${nextReward.name}.`
    : `${wordsNeeded} more known word${wordsNeeded === 1 ? "" : "s"} to find ${nextReward.name}.`;
}
