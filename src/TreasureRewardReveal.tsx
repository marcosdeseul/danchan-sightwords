import { useId } from "react";
import { Character, GearIcon } from "./GearArt";
import type { RewardItem, StageContent } from "./types";

export interface TreasureRewardRevealProps {
  stage: StageContent;
  reward: RewardItem;
  equippedRewards: RewardItem[];
  onContinue: () => void;
}

export function TreasureRewardReveal({
  stage,
  reward,
  equippedRewards,
  onContinue,
}: TreasureRewardRevealProps) {
  const titleId = useId();
  const descriptionId = useId();
  const equippedIds = new Set([
    ...equippedRewards.map((equippedReward) => equippedReward.id),
    reward.id,
  ]);
  const revealedLoadout = stage.rewards.filter((stageReward) => equippedIds.has(stageReward.id));

  return (
    <section
      className={`reward-reveal-overlay ${stage.themeClass}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
    >
      <div className="reward-reveal-card">
        <div className="reward-reveal-sparkles" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>

        <header className="reward-reveal-header">
          <p>Treasure unlocked!</p>
          <h2 id={titleId}>{reward.name}</h2>
          <span id={descriptionId}>A new item has been added to your character.</span>
        </header>

        <div className="reward-reveal-content">
          <section className="reward-reveal-panel reward-reveal-item-panel" aria-label={`New item: ${reward.name}`}>
            <span className="reward-reveal-panel-label">New item</span>
            <div className="reward-reveal-item-spotlight" aria-hidden="true">
              <GearIcon reward={reward} />
            </div>
            <strong>{reward.name}</strong>
          </section>

          <section className="reward-reveal-panel reward-reveal-character-panel">
            <span className="reward-reveal-panel-label">Now equipped</span>
            <div className="reward-reveal-character-stage">
              <Character stage={stage} equippedRewards={revealedLoadout} />
            </div>
            <strong>{stage.heroName} is wearing it!</strong>
          </section>
        </div>

        <button
          className="button reward-reveal-continue"
          type="button"
          autoFocus
          onClick={onContinue}
        >
          Continue
        </button>
      </div>
    </section>
  );
}
