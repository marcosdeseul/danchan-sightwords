import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Character, GearIcon } from "./GearArt";
import { TreasureRewardReveal } from "./TreasureRewardReveal";
import type { RewardItem, RewardSlot, StageContent } from "./types";
import "./Characters.stories.css";

const REWARD_SLOTS: RewardSlot[] = [
  "weapon", "boots", "shield", "cape", "armor", "belt", "gloves", "helmet", "banner", "crown",
  "medal", "gem", "pack", "lantern", "crest", "star", "map", "torch", "flag", "trophy",
  "compass", "scroll", "badge", "canteen", "whistle", "engine", "intake", "gauge", "afterburner", "jetmodel",
];

const STAGE_FIXTURES = [
  stageFixture(1, "Ancient Warrior", "stage-ancient", 10, "Stone Hammer"),
  stageFixture(2, "Roman Warrior", "stage-roman", 15, "Parade Gladius"),
  stageFixture(3, "Medieval Knight", "stage-medieval", 20, "Knight Sword"),
  stageFixture(4, "Modern Soldier", "stage-modern", 25, "Foam Training Gun", { 2: "radio" }),
  stageFixture(5, "Jet Pilot", "stage-pilot", 30, "Control Stick"),
];

type Loadout = "base" | "first-item" | "fully-equipped";

interface ExplorerArgs {
  stageId: number;
  loadout: Loadout;
  rewardId?: string;
}

const meta: Meta<ExplorerArgs> = {
  title: "Characters",
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<ExplorerArgs>;

export const AllStages: Story = {
  name: "All stages",
  render: () => (
    <CharacterGallery stages={STAGE_FIXTURES} loadout="fully-equipped" />
  ),
};

export const CharacterExplorer: Story = {
  name: "Character explorer",
  args: {
    stageId: 1,
    loadout: "fully-equipped",
  },
  argTypes: {
    stageId: {
      control: { type: "select" },
      options: STAGE_FIXTURES.map((stage) => stage.id),
      mapping: Object.fromEntries(STAGE_FIXTURES.map((stage) => [stage.id, stage.id])),
    },
    loadout: {
      control: { type: "inline-radio" },
      options: ["base", "first-item", "fully-equipped"],
    },
  },
  render: ({ stageId, loadout }) => {
    const stage = STAGE_FIXTURES.find((candidate) => candidate.id === Number(stageId)) || STAGE_FIXTURES[0];

    return (
      <CharacterEquipmentExplorer
        key={`${stage.id}:${loadout}`}
        stage={stage}
        initialLoadout={loadout}
      />
    );
  },
};

const REWARD_OPTIONS = STAGE_FIXTURES.flatMap((stage) =>
  stage.rewards.map((reward) => reward.id),
);
const REWARD_OPTION_LABELS = Object.fromEntries(
  STAGE_FIXTURES.flatMap((stage) =>
    stage.rewards.map((reward) => [
      reward.id,
      `${stage.title} · ${reward.milestone} words · ${reward.name}`,
    ]),
  ),
);

export const TreasureRewardRevealStory: Story = {
  name: "Treasure reward reveal",
  args: {
    stageId: 1,
    loadout: "first-item",
    rewardId: STAGE_FIXTURES[0].rewards[0].id,
  },
  argTypes: {
    stageId: { table: { disable: true } },
    loadout: { table: { disable: true } },
    rewardId: {
      name: "Treasure reward",
      control: {
        type: "select",
        labels: REWARD_OPTION_LABELS,
      },
      options: REWARD_OPTIONS,
    },
  },
  render: ({ rewardId }) => {
    const selection = rewardSelection(rewardId);

    return (
      <TreasureRewardRevealPreview
        key={selection.reward.id}
        stage={selection.stage}
        reward={selection.reward}
        equippedRewards={selection.stage.rewards.slice(0, selection.rewardIndex + 1)}
      />
    );
  },
};

function TreasureRewardRevealPreview({
  stage,
  reward,
  equippedRewards,
}: {
  stage: StageContent;
  reward: RewardItem;
  equippedRewards: RewardItem[];
}) {
  const [visible, setVisible] = useState(true);

  return (
    <main className={`reward-reveal-story-page ${stage.themeClass}`}>
      {visible ? (
        <TreasureRewardReveal
          stage={stage}
          reward={reward}
          equippedRewards={equippedRewards}
          onContinue={() => setVisible(false)}
        />
      ) : (
        <section className="reward-reveal-story-reset">
          <p>Reward reveal closed</p>
          <h1>{reward.name} is equipped</h1>
          <button className="button" type="button" onClick={() => setVisible(true)}>
            Show again
          </button>
        </section>
      )}
    </main>
  );
}

function rewardSelection(rewardId: string | undefined): {
  stage: StageContent;
  reward: RewardItem;
  rewardIndex: number;
} {
  for (const stage of STAGE_FIXTURES) {
    const rewardIndex = stage.rewards.findIndex((reward) => reward.id === rewardId);

    if (rewardIndex >= 0) {
      return { stage, reward: stage.rewards[rewardIndex], rewardIndex };
    }
  }

  return {
    stage: STAGE_FIXTURES[0],
    reward: STAGE_FIXTURES[0].rewards[0],
    rewardIndex: 0,
  };
}

function CharacterEquipmentExplorer({
  stage,
  initialLoadout,
}: {
  stage: StageContent;
  initialLoadout: Loadout;
}) {
  const [equippedIds, setEquippedIds] = useState<Set<string>>(
    () => new Set(rewardsForLoadout(stage.rewards, initialLoadout).map((reward) => reward.id)),
  );
  const equippedRewards = stage.rewards.filter((reward) => equippedIds.has(reward.id));

  const toggleReward = (rewardId: string) => {
    setEquippedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(rewardId)) {
        nextIds.delete(rewardId);
      } else {
        nextIds.add(rewardId);
      }

      return nextIds;
    });
  };

  return (
    <main className="character-story-page">
      <section className={`character-equipment-story ${stage.themeClass}`}>
        <article className="character-equipment-preview">
          <p>Character explorer</p>
          <h1>{stage.title}: {stage.heroName}</h1>
          <div className="character-stage">
            <Character stage={stage} equippedRewards={equippedRewards} />
          </div>
          <strong>{equippedRewards.length} of {stage.rewards.length} items equipped</strong>
        </article>

        <section className="character-equipment-panel" aria-label={`${stage.heroName} equipment options`}>
          <header>
            <div>
              <p>Equipment options</p>
              <h2>Put items on or take them off</h2>
            </div>
            <div className="character-equipment-presets">
              <button type="button" onClick={() => setEquippedIds(new Set(stage.rewards.map((reward) => reward.id)))}>
                Equip all
              </button>
              <button type="button" onClick={() => setEquippedIds(new Set())}>
                Remove all
              </button>
            </div>
          </header>

          <div className="character-equipment-grid">
            {stage.rewards.map((reward) => {
              const isEquipped = equippedIds.has(reward.id);

              return (
                <button
                  className={`character-equipment-option${isEquipped ? " is-equipped" : ""}`}
                  key={reward.id}
                  type="button"
                  aria-pressed={isEquipped}
                  aria-label={`${reward.name}, ${isEquipped ? "equipped; remove item" : "not equipped; put on item"}`}
                  onClick={() => toggleReward(reward.id)}
                >
                  <span className="character-equipment-icon" aria-hidden="true">
                    <GearIcon reward={reward} />
                  </span>
                  <span className="character-equipment-name">{reward.name}</span>
                  <span className="character-equipment-status">
                    {isEquipped ? "Equipped" : "Off"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}

function CharacterGallery({
  stages,
  loadout,
  single = false,
}: {
  stages: StageContent[];
  loadout: Loadout;
  single?: boolean;
}) {
  return (
    <main className="character-story-page">
      <header className="character-story-header">
        <h1>Stage Characters</h1>
        <p>Production character artwork with {loadoutLabel(loadout).toLowerCase()}.</p>
      </header>
      <div className={`character-story-grid${single ? " is-single" : ""}`}>
        {stages.map((stage) => {
          const equippedRewards = rewardsForLoadout(stage.rewards, loadout);

          return (
            <article className={`character-story-card ${stage.themeClass}`} key={stage.id}>
              <h2>{stage.title}: {stage.heroName}</h2>
              <div className="character-stage">
                <Character stage={stage} equippedRewards={equippedRewards} />
              </div>
              <p>{loadoutLabel(loadout)} · {equippedRewards.length} of {stage.rewards.length} items</p>
            </article>
          );
        })}
      </div>
    </main>
  );
}

function rewardsForLoadout(rewards: RewardItem[], loadout: Loadout): RewardItem[] {
  if (loadout === "base") {
    return [];
  }

  return loadout === "first-item" ? rewards.slice(0, 1) : rewards;
}

function loadoutLabel(loadout: Loadout): string {
  if (loadout === "base") {
    return "Base character";
  }

  return loadout === "first-item" ? "First reward" : "Fully equipped";
}

function stageFixture(
  id: number,
  heroName: string,
  themeClass: string,
  rewardCount: number,
  firstRewardName: string,
  slotOverrides: Record<number, RewardSlot> = {},
): StageContent {
  const rewards = REWARD_SLOTS.slice(0, rewardCount).map((defaultSlot, index) => {
    const slot = slotOverrides[index] || defaultSlot;

    return {
      id: `stage${id}-${slot}`,
      name: index === 0 ? firstRewardName : `${heroName} ${slot}`,
      slot,
      stageId: id,
      milestone: (index + 1) * 10,
      visualKey: `stage${id}-${slot}`,
    };
  });

  return {
    id,
    title: `Stage ${id}`,
    subtitle: heroName,
    themeClass,
    heroName,
    words: [],
    rewards,
    fieldTrip: {
      title: "",
      intro: "",
      finish: "",
      creatures: [],
    },
  };
}
