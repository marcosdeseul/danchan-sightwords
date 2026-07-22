import type { RewardItem } from "../types";

export type StageVariant = "ancient" | "roman" | "medieval" | "modern" | "pilot";

export function VariantMark({ reward }: { reward: RewardItem }) {
  const variant = variantForReward(reward);

  if (variant === "ancient") {
    return <circle fill="var(--gear-accent)" stroke="none" cx="50" cy="50" r="4" />;
  }

  if (variant === "roman") {
    return <path fill="none" stroke="var(--gear-accent)" strokeWidth="3" strokeLinecap="round" d="M12 54c7-6 33-6 40 0" />;
  }

  if (variant === "medieval") {
    return <path fill="var(--gear-accent)" stroke="none" d="m51 49 2 4 5 1-4 3 1 5-4-2-4 2 1-5-4-3 5-1Z" />;
  }

  if (variant === "pilot") {
    return <path className="pilot-accent-line" d="M8 55c14-7 30-7 48 0" />;
  }

  return <><circle fill="var(--gear-accent)" stroke="none" cx="51" cy="49" r="3" /><circle fill="var(--gear-accent)" stroke="none" cx="57" cy="55" r="2" /></>;
}

export function variantForReward(reward: RewardItem): StageVariant {
  if (reward.stageId === 1) {
    return "ancient";
  }

  if (reward.stageId === 2) {
    return "roman";
  }

  if (reward.stageId === 3) {
    return "medieval";
  }

  if (reward.stageId === 5) {
    return "pilot";
  }

  return "modern";
}
