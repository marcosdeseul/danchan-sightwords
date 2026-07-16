import { afterEach, expect, test, vi } from "vitest";
import {
  LEGACY_STORAGE_KEY,
  MAZE_LAYOUTS,
  OFFLINE_STORAGE_PREFIX,
  STORAGE_KEY,
  activeStage,
  activeStageState,
  buildWordBuckets,
  clearOfflineProgress,
  clearPreviousLocalProgress,
  cloneProgress,
  completedFieldTripsFor,
  currentMazeLayout,
  currentWordFor,
  defaultProgress,
  hasNextStage,
  hasNextStageId,
  isOpenMazeTile,
  isStageComplete,
  loadOfflineProgress,
  newWordWeightForProgress,
  progressForLegacyState,
  readJsonStorage,
  rewardById,
  rewardByMilestone,
  sanitizeProgress,
  sanitizeStageState,
  saveOfflineProgress,
  selectWeightedWordIndex,
  shouldUseWeightedNextWord,
  sortRewardIds,
  stageById,
  totalKnownCount,
  unlockedStageIdsFor,
  offlineProgressStorageKey,
} from "./game";
import type {
  ProgressState,
  RewardSlot,
  SightWordsContent,
  StageContent,
} from "./types";

const REWARD_SLOTS: RewardSlot[] = [
  "weapon",
  "boots",
  "shield",
  "cape",
  "armor",
];

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("defaults, lookups, rewards, cloning, and current word helpers work", () => {
  const content = createContent();
  const progress = defaultProgress(content);

  progress.stages["1"].knownWords = ["stage1-word-1", "stage1-word-2"];
  progress.stages["2"].knownWords = ["stage2-word-1"];
  progress.stages["1"].deckOrder = [2, 0, ...range(3, 40)];
  progress.stages["1"].currentIndex = 0;

  expect(progress.version).toBe(7);
  expect(progress.activeStageId).toBe(1);
  expect(progress.unlockedStageIds).toEqual([1]);
  expect(progress.stages["2"].deckOrder).toHaveLength(40);
  expect(stageById(content, 999).id).toBe(1);
  expect(activeStage(content, progress).id).toBe(1);
  expect(activeStageState(content, progress)).toBe(progress.stages["1"]);
  expect(currentWordFor(content, progress)).toBe("stage1-word-3");
  expect(totalKnownCount(content, progress)).toBe(3);
  expect(hasNextStage(content, content.stages[0])).toBe(true);
  expect(hasNextStage(content, content.stages[2])).toBe(false);
  expect(hasNextStageId(content, 1)).toBe(true);
  expect(hasNextStageId(content, 3)).toBe(false);
  expect(isStageComplete(content.stages[0], progress.stages["1"])).toBe(false);
  expect(rewardById(content.stages[0], "stage1-weapon")?.name).toBe(
    "Stage 1 Weapon",
  );
  expect(rewardById(content.stages[0], "missing")).toBeUndefined();
  expect(rewardByMilestone(content.stages[0], 20)?.id).toBe("stage1-boots");
  expect(rewardByMilestone(content.stages[0], 999)).toBeUndefined();
  expect(sortRewardIds(["stage1-boots", "missing", "stage1-weapon"], content.stages[0]))
    .toEqual(["stage1-weapon", "stage1-boots"]);

  const cloned = cloneProgress(progress);
  cloned.stages["1"].knownWords.push("stage1-word-3");

  expect(cloned).not.toBe(progress);
  expect(progress.stages["1"].knownWords).toEqual([
    "stage1-word-1",
    "stage1-word-2",
  ]);
});

test("offline progress storage is account-specific and handles unavailable storage", () => {
  const content = createContent();
  const saved = defaultProgress(content);
  saved.stages["1"].knownWords = ["stage1-word-1"];
  const storage = stubLocalStorage(new Map());
  const offlineKey = offlineProgressStorageKey(7);

  expect(offlineKey).toBe(`${OFFLINE_STORAGE_PREFIX}:7`);
  expect(loadOfflineProgress(content, 7)).toBeNull();

  storage.data.set(offlineKey, JSON.stringify("invalid"));
  expect(loadOfflineProgress(content, 7)).toBeNull();

  storage.data.set(offlineKey, JSON.stringify({ userId: 8, progress: saved }));
  expect(loadOfflineProgress(content, 7)).toBeNull();

  storage.data.set(offlineKey, JSON.stringify({ userId: 7 }));
  expect(loadOfflineProgress(content, 7)).toBeNull();

  expect(saveOfflineProgress(7, saved)).toBe(true);
  expect(loadOfflineProgress(content, 7)?.stages["1"].knownWords).toEqual([
    "stage1-word-1",
  ]);

  clearOfflineProgress(7);
  expect(storage.data.has(offlineKey)).toBe(false);

  storage.data.set(STORAGE_KEY, JSON.stringify(saved));
  storage.data.set(LEGACY_STORAGE_KEY, JSON.stringify(saved));
  clearPreviousLocalProgress();
  expect(storage.data.has(STORAGE_KEY)).toBe(false);
  expect(storage.data.has(LEGACY_STORAGE_KEY)).toBe(false);

  storage.data.set(STORAGE_KEY, "{bad json");
  expect(readJsonStorage(STORAGE_KEY)).toBeNull();

  storage.setShouldThrow(true);
  expect(readJsonStorage(STORAGE_KEY)).toBeNull();
  expect(saveOfflineProgress(7, saved)).toBe(false);
  expect(() => clearOfflineProgress(7)).not.toThrow();
  expect(() => clearPreviousLocalProgress()).not.toThrow();
});

test("progress sanitizer repairs invalid shapes, stage state, deck order, and rewards", () => {
  const content = createContent();
  const cleanFromNull = sanitizeProgress(content, null);
  const cleanFromInvalidStages = sanitizeProgress(content, { stages: "bad" });
  const clean = sanitizeProgress(content, {
    activeStageId: 99,
    completedFieldTrips: "bad",
    stages: {
      1: {
        knownWords: ["stage1-word-1", "bad", "stage1-word-1", 1],
        practiceWords: ["stage1-word-1", "stage1-word-2", "bad"],
        currentIndex: 999,
        deckOrder: [2, 2, 0, 900],
        shuffled: true,
        unlockedItems: [
          "stage1-boots",
          "bad",
          "stage1-weapon",
          "stage1-weapon",
        ],
        equippedItems: ["stage1-boots", "stage1-cape"],
        completedMazeMilestones: [20, 10, 20, 999],
        pendingReward: { itemId: "stage1-shield" },
        fieldTripCompleted: true,
      },
    },
  });

  expect(cleanFromNull.activeStageId).toBe(1);
  expect(cleanFromInvalidStages.stages["1"].knownWords).toEqual([]);
  expect(clean.activeStageId).toBe(1);
  expect(clean.completedFieldTrips).toEqual([]);
  expect(clean.stages["1"].knownWords).toEqual(["stage1-word-1"]);
  expect(clean.stages["1"].practiceWords).toEqual(["stage1-word-2"]);
  expect(clean.stages["1"].currentIndex).toBe(39);
  expect(clean.stages["1"].deckOrder.slice(0, 4)).toEqual([2, 0, 1, 3]);
  expect(clean.stages["1"].shuffled).toBe(true);
  expect(clean.stages["1"].unlockedItems).toEqual([
    "stage1-weapon",
    "stage1-boots",
  ]);
  expect(clean.stages["1"].equippedItems).toEqual(["stage1-boots"]);
  expect(clean.stages["1"].completedMazeMilestones).toEqual([10, 20]);
  expect(clean.stages["1"].pendingReward).toBeNull();
  expect(clean.stages["1"].fieldTripCompleted).toBe(false);
});

test("stage state sanitizer restores pending rewards and clamps current indexes", () => {
  const content = createContent();
  const stage = content.stages[0];

  const pendingByMilestone = sanitizeStageState(content, stage, {
    knownWords: stage.words.slice(0, 10),
    currentIndex: -5,
    pendingReward: { milestone: 10 },
  });
  const pendingByItem = sanitizeStageState(content, stage, {
    knownWords: stage.words.slice(0, 20),
    currentIndex: "2",
    pendingReward: { itemId: "stage1-boots" },
  });
  const tooEarly = sanitizeStageState(content, stage, {
    knownWords: stage.words.slice(0, 9),
    pendingReward: { milestone: 10 },
  });
  const completed = sanitizeStageState(content, stage, {
    knownWords: stage.words.slice(0, 10),
    completedMazeMilestones: [10],
    pendingReward: { itemId: "stage1-weapon" },
  });
  const invalidReward = sanitizeStageState(content, stage, {
    knownWords: stage.words.slice(0, 40),
    pendingReward: { milestone: "bad" },
  });

  expect(pendingByMilestone.currentIndex).toBe(0);
  expect(pendingByMilestone.pendingReward).toEqual({
    milestone: 10,
    itemId: "stage1-weapon",
  });
  expect(pendingByItem.currentIndex).toBe(0);
  expect(pendingByItem.pendingReward).toEqual({
    milestone: 20,
    itemId: "stage1-boots",
  });
  expect(tooEarly.pendingReward).toBeNull();
  expect(completed.pendingReward).toBeNull();
  expect(invalidReward.pendingReward).toBeNull();
});

test("reward aliases migrate renamed local item ids", () => {
  const content = createContent();
  const stage = content.stages[2];

  content.rewardAliases = { "stage3-shield": "stage3-radio" };
  stage.rewards[2] = {
    id: "stage3-radio",
    name: "Stage 3 Radio",
    slot: "radio",
    stageId: 3,
    milestone: 30,
    visualKey: "stage3-radio",
  };

  const clean = sanitizeStageState(content, stage, {
    knownWords: stage.words.slice(0, 30),
    unlockedItems: ["stage3-shield"],
    equippedItems: ["stage3-shield"],
    pendingReward: { itemId: "stage3-shield" },
  });

  expect(clean.unlockedItems).toEqual(["stage3-radio"]);
  expect(clean.equippedItems).toEqual(["stage3-radio"]);
  expect(clean.pendingReward).toEqual({
    milestone: 30,
    itemId: "stage3-radio",
  });
});

test("field trips unlock later stages only in order", () => {
  const content = createContent();
  const progress = defaultProgress(content);

  progress.stages["1"].knownWords = [...content.stages[0].words];
  progress.stages["1"].fieldTripCompleted = true;
  progress.completedFieldTrips = [1];

  const stageTwoUnlocked = sanitizeProgress(content, progress);
  expect(stageTwoUnlocked.completedFieldTrips).toEqual([1]);
  expect(stageTwoUnlocked.unlockedStageIds).toEqual([1, 2]);

  progress.stages["2"].knownWords = [...content.stages[1].words];
  progress.stages["2"].fieldTripCompleted = true;
  progress.completedFieldTrips = [2, 1, 3];
  progress.activeStageId = 3;

  const stageThreeUnlocked = sanitizeProgress(content, progress);
  expect(completedFieldTripsFor(content, stageThreeUnlocked.stages)).toEqual([1, 2]);
  expect(unlockedStageIdsFor(content, stageThreeUnlocked.stages)).toEqual([1, 2, 3]);
  expect(stageThreeUnlocked.completedFieldTrips).toEqual([1, 2]);
  expect(stageThreeUnlocked.activeStageId).toBe(3);

  const outOfOrder = defaultProgress(content);
  outOfOrder.stages["2"].knownWords = [...content.stages[1].words];
  outOfOrder.stages["2"].fieldTripCompleted = true;

  expect(completedFieldTripsFor(content, outOfOrder.stages)).toEqual([]);
  expect(unlockedStageIdsFor(content, outOfOrder.stages)).toEqual([1]);
});

test("legacy progress imports stage one data and invalid legacy data becomes default", () => {
  const content = createContent();
  const legacy = progressForLegacyState(content, {
    knownWords: ["stage1-word-1"],
    practiceWords: ["stage1-word-2"],
    currentIndex: 1,
  });
  const invalid = progressForLegacyState(content, null);

  expect(legacy.stages["1"].knownWords).toEqual(["stage1-word-1"]);
  expect(legacy.stages["1"].practiceWords).toEqual(["stage1-word-2"]);
  expect(legacy.stages["1"].currentIndex).toBe(1);
  expect(invalid).toEqual(defaultProgress(content));
});

test("word buckets and weighted selection follow stage progress ratios", () => {
  const content = createContent();
  const progress = defaultProgress(content);

  progress.stages["1"].knownWords = ["stage1-word-1", "stage1-word-2"];
  progress.stages["1"].practiceWords = ["stage1-word-3"];
  progress.stages["1"].currentIndex = 0;

  expect(buildWordBuckets(content, progress, true)).toMatchObject({
    known: [1],
    practice: [2],
  });
  expect(buildWordBuckets(content, progress, false).known).toEqual([0, 1]);
  expect(shouldUseWeightedNextWord(content, progress)).toBe(true);
  expect(newWordWeightForProgress(0.25)).toBe(100);
  expect(newWordWeightForProgress(0.26)).toBe(90);
  expect(newWordWeightForProgress(0.51)).toBe(80);
  expect(newWordWeightForProgress(0.76)).toBe(70);

  progress.stages["1"].knownWords = content.stages[0].words.slice(0, 10);
  progress.stages["1"].practiceWords = ["stage1-word-11"];
  progress.stages["1"].currentIndex = 0;

  vi.spyOn(Math, "random").mockReturnValueOnce(0.99).mockReturnValueOnce(0);
  expect(selectWeightedWordIndex(content, progress)).toBe(11);

  progress.stages["1"].knownWords = content.stages[0].words.slice(0, 12);
  progress.stages["1"].practiceWords = ["stage1-word-13"];
  vi.spyOn(Math, "random").mockReturnValueOnce(0.89).mockReturnValueOnce(0);
  expect(selectWeightedWordIndex(content, progress)).toBe(13);

  vi.spyOn(Math, "random")
    .mockReturnValueOnce(0.91)
    .mockReturnValueOnce(0.79)
    .mockReturnValueOnce(0);
  expect(selectWeightedWordIndex(content, progress)).toBe(12);

  vi.spyOn(Math, "random")
    .mockReturnValueOnce(0.91)
    .mockReturnValueOnce(0.81)
    .mockReturnValueOnce(0);
  expect(selectWeightedWordIndex(content, progress)).toBe(1);

  progress.stages["1"].knownWords = content.stages[0].words.slice(0, 21);
  progress.stages["1"].practiceWords = ["stage1-word-22"];
  vi.spyOn(Math, "random").mockReturnValueOnce(0.79).mockReturnValueOnce(0);
  expect(selectWeightedWordIndex(content, progress)).toBe(22);

  progress.stages["1"].knownWords = content.stages[0].words.slice(0, 31);
  progress.stages["1"].practiceWords = ["stage1-word-32"];
  vi.spyOn(Math, "random").mockReturnValueOnce(0.71).mockReturnValueOnce(0).mockReturnValueOnce(0);
  expect(selectWeightedWordIndex(content, progress)).toBe(31);

  progress.stages["1"].practiceWords = [];
  vi.spyOn(Math, "random").mockReturnValueOnce(0.71).mockReturnValueOnce(0);
  expect(selectWeightedWordIndex(content, progress)).toBe(1);

  const practiceOnlyContent = createContent([2]);
  const practiceOnlyProgress = defaultProgress(practiceOnlyContent);
  practiceOnlyProgress.stages["1"].practiceWords = ["stage1-word-2"];
  vi.spyOn(Math, "random").mockReturnValueOnce(0);
  expect(selectWeightedWordIndex(practiceOnlyContent, practiceOnlyProgress)).toBe(1);

  const oneWordContent = createContent([1]);
  const oneWordProgress = defaultProgress(oneWordContent);
  expect(shouldUseWeightedNextWord(oneWordContent, oneWordProgress)).toBe(false);
  vi.spyOn(Math, "random").mockReturnValueOnce(0).mockReturnValueOnce(0);
  expect(selectWeightedWordIndex(oneWordContent, oneWordProgress)).toBe(0);

  const emptyContent = createContent([0]);
  expect(selectWeightedWordIndex(emptyContent, defaultProgress(emptyContent))).toBeNull();
});

test("maze helpers pick layouts and reject walls or out-of-bounds tiles", () => {
  const content = createContent();
  const progress = defaultProgress(content);
  const stage = content.stages[0];

  expect(currentMazeLayout(progress, stage)).toBe(MAZE_LAYOUTS[0]);
  progress.stages["1"].pendingReward = { milestone: 20, itemId: "stage1-boots" };
  expect(currentMazeLayout(progress, stage)).toBe(MAZE_LAYOUTS[1]);
  progress.stages["1"].pendingReward = { milestone: 110, itemId: "stage1-boots" };
  expect(currentMazeLayout(progress, stage)).toBe(MAZE_LAYOUTS[0]);

  const layout = MAZE_LAYOUTS[0];
  expect(isOpenMazeTile(layout, { row: 0, col: 0 })).toBe(true);
  expect(isOpenMazeTile(layout, { row: 0, col: 3 })).toBe(false);
  expect(isOpenMazeTile(layout, { row: -1, col: 0 })).toBe(false);
  expect(isOpenMazeTile(layout, { row: layout.length, col: 0 })).toBe(false);
  expect(isOpenMazeTile(layout, { row: 0, col: -1 })).toBe(false);
  expect(isOpenMazeTile(layout, { row: 0, col: layout[0].length })).toBe(false);
});

function createContent(wordCounts = [40, 40, 40]): SightWordsContent {
  return {
    version: 7,
    stages: wordCounts.map((wordCount, index) => createStage(index + 1, wordCount)),
  };
}

function createStage(id: number, wordCount: number): StageContent {
  return {
    id,
    title: `Stage ${id}`,
    subtitle: `Theme ${id}`,
    themeClass: `stage-${id}`,
    heroName: `Hero ${id}`,
    words: Array.from({ length: wordCount }, (_, index) => `stage${id}-word-${index + 1}`),
    rewards: REWARD_SLOTS.map((slot, index) => ({
      id: `stage${id}-${slot}`,
      name: `Stage ${id} ${titleCase(slot)}`,
      slot,
      stageId: id,
      milestone: (index + 1) * 10,
      visualKey: `stage${id}-${slot}`,
    })),
    fieldTrip: {
      title: `Trip ${id}`,
      intro: `Intro ${id}`,
      finish: `Finish ${id}`,
      creatures: [`Friend ${id}`],
    },
  };
}

function stubLocalStorage(data: Map<string, string>) {
  let shouldThrow = false;
  const localStorage = {
    getItem: vi.fn((key: string) => {
      if (shouldThrow) {
        throw new Error("storage unavailable");
      }

      return data.get(key) ?? null;
    }),
    setItem: vi.fn((key: string, value: string) => {
      if (shouldThrow) {
        throw new Error("storage unavailable");
      }

      data.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      if (shouldThrow) {
        throw new Error("storage unavailable");
      }

      data.delete(key);
    }),
  };

  vi.stubGlobal("window", { localStorage });

  return {
    data,
    setShouldThrow(value: boolean) {
      shouldThrow = value;
    },
  };
}

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start }, (_, index) => start + index);
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
