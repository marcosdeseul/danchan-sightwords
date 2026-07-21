import type { Meta, StoryObj } from "@storybook/react-vite";
import { WordCheckOverlay } from "./app/components/Overlays";
import type { WordCheckState } from "./app/wordCheck";

const LONGEST_STORY_WORDS = [
  "information",
  "instruments",
  "interesting",
  "temperature",
];

const longWordCheck: WordCheckState = {
  stageId: 5,
  targetWordIndex: 0,
  promptWordIndex: 0,
  word: LONGEST_STORY_WORDS[0],
  choices: LONGEST_STORY_WORDS,
  previousState: {
    version: 7,
    activeStageId: 5,
    unlockedStageIds: [1, 2, 3, 4, 5],
    completedFieldTrips: [1, 2, 3, 4],
    stages: {},
    phraseForest: {
      activeStageId: 6,
      unlockedStageIds: [],
      completedStageIds: [],
      stages: {},
    },
  },
  remainingWordIndices: [],
  failedWordIndices: [],
  followUpsRemaining: 0,
};

const meta: Meta = {
  title: "Game/Quick quiz",
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj;

export const LongestWords: Story = {
  name: "Longest words on a tablet",
  render: () => (
    <WordCheckOverlay
      check={longWordCheck}
      feedback={null}
      onPlay={() => undefined}
      onPlayChoice={() => undefined}
      onChoose={() => undefined}
    />
  ),
};
