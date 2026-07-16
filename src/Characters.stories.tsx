import type { Meta, StoryObj } from "@storybook/react-vite";
import { Character } from "./GearArt";
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
  render: ({ stageId, loadout }) => (
    <CharacterGallery
      stages={[STAGE_FIXTURES.find((stage) => stage.id === Number(stageId)) || STAGE_FIXTURES[0]]}
      loadout={loadout}
      single
    />
  ),
};

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
