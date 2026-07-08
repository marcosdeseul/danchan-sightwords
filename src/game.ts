import type {
  PendingReward,
  ProgressState,
  RewardItem,
  SightWordsContent,
  StageContent,
  StageProgress,
} from "./types";

export const STORAGE_KEY = "danSightWords:v2";
export const LEGACY_STORAGE_KEY = "danSightWords:v1";
export const LOW_NEW_WORD_THRESHOLD = 30;
export const NEXT_WORD_BUCKETS = Object.freeze([
  { name: "new", weight: 80 },
  { name: "practice", weight: 15 },
  { name: "known", weight: 5 },
] as const);
export const MAZE_LAYOUTS = Object.freeze([
  ["...#...", "##...#.", "#....#.", "###....", "...#...", ".#.#.#.", "...#..."],
  ["..#.#..", ".#...#.", ".#.##..", "...#.#.", ".###...", "...##.#", "......."],
  [".......", "###.##.", "..#..#.", ".#.##..", ".#...#.", ".###.#.", "...#..."],
  ["..#.#..", "#..#.#.", ".#..#.#", "#.#..#.", ".#.#...", "##.##..", "...##.."],
  ["...##..", ".#..#..", ".#.##..", ".#.....", ".###.#.", "...#.#.", "##....."],
  [".....#.", "###..#.", "...#...", ".#.###.", ".#.....", ".#####.", "......."],
  ["..#....", "..#.##.", "....#..", "###.#..", "...#..#", ".#....#", ".#.##.."],
  ["....#..", ".##.#..", "..#....", "..###.#", "......#", ".####.#", "......."],
  [".#.....", ".#.###.", "...#...", "##.#.#.", "...#.#.", ".###.#.", ".....#."],
  ["....#..", "###.#..", "..#.#..", "..#....", "#.###.#", "#.....#", "###...."],
]);
export const MAZE_START = Object.freeze({ row: 0, col: 0 });
export const MAZE_CHEST = Object.freeze({ row: 6, col: 6 });
export const MOVE_DELTAS = Object.freeze({
  up: { row: -1, col: 0 },
  down: { row: 1, col: 0 },
  left: { row: 0, col: -1 },
  right: { row: 0, col: 1 },
});
export const TRIP_TARGET = 5;
export const LANE_TOPS = [43, 58, 73] as const;

export type MoveDirection = keyof typeof MOVE_DELTAS;
export type WordBucketName = (typeof NEXT_WORD_BUCKETS)[number]["name"];

export interface WordBuckets {
  new: number[];
  practice: number[];
  known: number[];
}

export function defaultProgress(content: SightWordsContent): ProgressState {
  const stages: Record<string, StageProgress> = {};

  content.stages.forEach((stage) => {
    stages[String(stage.id)] = defaultStageState(stage);
  });

  return {
    version: content.version,
    activeStageId: 1,
    unlockedStageIds: [1],
    completedFieldTrips: [],
    stages,
  };
}

export function defaultStageState(stage: StageContent): StageProgress {
  return {
    knownWords: [],
    practiceWords: [],
    currentIndex: 0,
    deckOrder: stage.words.map((_, index) => index),
    shuffled: false,
    unlockedItems: [],
    equippedItems: [],
    completedMazeMilestones: [],
    pendingReward: null,
    fieldTripCompleted: false,
  };
}

export function readJsonStorage(key: string): unknown {
  try {
    return JSON.parse(window.localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

export function loadLocalProgress(content: SightWordsContent): ProgressState {
  const saved = readJsonStorage(STORAGE_KEY);

  if (saved) {
    return sanitizeProgress(content, saved);
  }

  const legacy = readJsonStorage(LEGACY_STORAGE_KEY);

  if (legacy) {
    return progressForLegacyState(content, legacy);
  }

  return defaultProgress(content);
}

export function saveLocalProgress(progress: ProgressState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // The current session can continue if browser storage is unavailable.
  }
}

export function progressForLegacyState(
  content: SightWordsContent,
  legacy: unknown,
): ProgressState {
  const progress = defaultProgress(content);
  const stage = stageById(content, 1);
  const source = legacy && typeof legacy === "object" ? legacy as Record<string, unknown> : {};

  progress.stages["1"] = sanitizeStageState(content, stage, {
    knownWords: source.knownWords,
    practiceWords: source.practiceWords,
    currentIndex: source.currentIndex,
    deckOrder: source.deckOrder,
    shuffled: source.shuffled,
    unlockedItems: source.unlockedItems,
    equippedItems: source.equippedItems,
    completedMazeMilestones: source.completedMazeMilestones,
    pendingReward: source.pendingReward,
  });

  return sanitizeProgress(content, progress);
}

export function sanitizeProgress(
  content: SightWordsContent,
  value: unknown,
): ProgressState {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const progress = defaultProgress(content);
  const requestedCompletedFieldTrips = new Set(
    cleanStageIds(content, source.completedFieldTrips).filter((stageId) =>
      hasNextStageId(content, stageId),
    ),
  );

  content.stages.forEach((stage) => {
    const sourceStages =
      source.stages && typeof source.stages === "object"
        ? source.stages as Record<string, unknown>
        : {};
    progress.stages[String(stage.id)] = sanitizeStageState(
      content,
      stage,
      sourceStages[String(stage.id)],
    );
  });

  content.stages.forEach((stage) => {
    if (!hasNextStage(content, stage)) {
      return;
    }

    const stageState = progress.stages[String(stage.id)];
    const completedInSource =
      requestedCompletedFieldTrips.has(stage.id) || stageState.fieldTripCompleted;

    stageState.fieldTripCompleted =
      completedInSource && isStageComplete(stage, stageState);
  });

  progress.completedFieldTrips = completedFieldTripsFor(content, progress.stages);
  const completedFieldTripSet = new Set(progress.completedFieldTrips);

  content.stages.forEach((stage) => {
    if (hasNextStage(content, stage)) {
      progress.stages[String(stage.id)].fieldTripCompleted =
        completedFieldTripSet.has(stage.id);
    }
  });

  progress.unlockedStageIds = unlockedStageIdsFor(content, progress.stages);
  const activeStageId = Number(source.activeStageId);
  progress.activeStageId = progress.unlockedStageIds.includes(activeStageId)
    ? activeStageId
    : progress.unlockedStageIds[progress.unlockedStageIds.length - 1] || 1;

  return progress;
}

export function sanitizeStageState(
  content: SightWordsContent,
  stage: StageContent,
  value: unknown,
): StageProgress {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const defaults = defaultStageState(stage);
  const knownWords = cleanWordArray(source.knownWords, stage.words);
  const knownSet = new Set(knownWords);
  const practiceWords = cleanWordArray(source.practiceWords, stage.words).filter(
    (word) => !knownSet.has(word),
  );
  const deckOrder = cleanDeckOrder(source.deckOrder, stage.words.length);
  const rewardById = new Map(stage.rewards.map((reward) => [reward.id, reward]));
  const rewardByMilestone = new Map(
    stage.rewards.map((reward) => [reward.milestone, reward]),
  );
  const completedMazeMilestones = cleanMilestones(
    source.completedMazeMilestones,
    rewardByMilestone,
  );
  const completedSet = new Set(completedMazeMilestones);
  const unlockedItems = cleanItemArray(source.unlockedItems, rewardById);
  const equippedItems = cleanItemArray(source.equippedItems, rewardById).filter(
    (itemId) => unlockedItems.includes(itemId),
  );
  const pendingReward = cleanPendingReward(
    source.pendingReward,
    knownWords.length,
    rewardById,
    rewardByMilestone,
    completedSet,
  );

  completedMazeMilestones.forEach((milestone) => {
    const reward = rewardByMilestone.get(milestone);

    if (reward && !unlockedItems.includes(reward.id)) {
      unlockedItems.push(reward.id);
    }
  });

  return {
    knownWords,
    practiceWords,
    currentIndex: Number.isInteger(source.currentIndex)
      ? Math.min(Math.max(Number(source.currentIndex), 0), deckOrder.length - 1)
      : defaults.currentIndex,
    deckOrder,
    shuffled: Boolean(source.shuffled),
    unlockedItems: sortRewardIds(unlockedItems, stage),
    equippedItems: sortRewardIds(equippedItems, stage),
    completedMazeMilestones,
    pendingReward,
    fieldTripCompleted: Boolean(source.fieldTripCompleted),
  };
}

export function stageById(content: SightWordsContent, stageId: number): StageContent {
  return content.stages.find((stage) => stage.id === Number(stageId)) || content.stages[0];
}

export function activeStage(
  content: SightWordsContent,
  progress: ProgressState,
): StageContent {
  return stageById(content, progress.activeStageId);
}

export function activeStageState(
  content: SightWordsContent,
  progress: ProgressState,
): StageProgress {
  return progress.stages[String(activeStage(content, progress).id)];
}

export function currentWordFor(
  content: SightWordsContent,
  progress: ProgressState,
): string {
  const stage = activeStage(content, progress);
  const stageState = activeStageState(content, progress);
  return stage.words[stageState.deckOrder[stageState.currentIndex]] || stage.words[0];
}

export function totalKnownCount(
  content: SightWordsContent,
  progress: ProgressState,
): number {
  return content.stages.reduce(
    (sum, stage) => sum + progress.stages[String(stage.id)].knownWords.length,
    0,
  );
}

export function hasNextStage(content: SightWordsContent, stage: StageContent): boolean {
  return hasNextStageId(content, stage.id);
}

export function hasNextStageId(content: SightWordsContent, stageId: number): boolean {
  return content.stages.some((stage) => stage.id === Number(stageId) + 1);
}

export function isStageComplete(stage: StageContent, stageState: StageProgress): boolean {
  return stageState.knownWords.length >= stage.words.length;
}

export function completedFieldTripsFor(
  content: SightWordsContent,
  stages: Record<string, StageProgress>,
): number[] {
  const completedFieldTrips: number[] = [];

  for (const stage of content.stages) {
    if (!hasNextStage(content, stage)) {
      break;
    }

    const stageState = stages[String(stage.id)];

    if (!stageState?.fieldTripCompleted || !isStageComplete(stage, stageState)) {
      break;
    }

    completedFieldTrips.push(stage.id);
  }

  return completedFieldTrips;
}

export function unlockedStageIdsFor(
  content: SightWordsContent,
  stages: Record<string, StageProgress>,
): number[] {
  const unlockedStageIds = [1];
  const validStageIds = new Set(content.stages.map((stage) => stage.id));

  for (const stage of content.stages) {
    if (!hasNextStage(content, stage)) {
      break;
    }

    const stageState = stages[String(stage.id)];

    if (!stageState?.fieldTripCompleted || !isStageComplete(stage, stageState)) {
      break;
    }

    if (validStageIds.has(stage.id + 1)) {
      unlockedStageIds.push(stage.id + 1);
    }
  }

  return unlockedStageIds;
}

export function rewardById(stage: StageContent, itemId: string): RewardItem | undefined {
  return stage.rewards.find((reward) => reward.id === itemId);
}

export function rewardByMilestone(
  stage: StageContent,
  milestone: number,
): RewardItem | undefined {
  return stage.rewards.find((reward) => reward.milestone === milestone);
}

export function sortRewardIds(itemIds: string[], stage: StageContent): string[] {
  const itemSet = new Set(itemIds);
  return stage.rewards.filter((reward) => itemSet.has(reward.id)).map((reward) => reward.id);
}

export function cloneProgress(progress: ProgressState): ProgressState {
  return JSON.parse(JSON.stringify(progress)) as ProgressState;
}

export function buildWordBuckets(
  content: SightWordsContent,
  progress: ProgressState,
  excludeCurrentWord: boolean,
): WordBuckets {
  const stage = activeStage(content, progress);
  const stageState = activeStageState(content, progress);
  const knownSet = new Set(stageState.knownWords);
  const practiceSet = new Set(stageState.practiceWords);
  const current = currentWordFor(content, progress);
  const buckets: WordBuckets = { new: [], practice: [], known: [] };

  stage.words.forEach((word, index) => {
    if (excludeCurrentWord && word === current) {
      return;
    }

    if (knownSet.has(word)) {
      buckets.known.push(index);
    } else if (practiceSet.has(word)) {
      buckets.practice.push(index);
    } else {
      buckets.new.push(index);
    }
  });

  return buckets;
}

export function shouldUseWeightedNextWord(
  content: SightWordsContent,
  progress: ProgressState,
): boolean {
  const stage = activeStage(content, progress);
  const stageState = activeStageState(content, progress);

  return (
    stage.words.length - stageState.knownWords.length - stageState.practiceWords.length <
    LOW_NEW_WORD_THRESHOLD
  );
}

export function selectWeightedWordIndex(
  content: SightWordsContent,
  progress: ProgressState,
): number | null {
  let buckets = buildWordBuckets(content, progress, true);
  let weightedBuckets = NEXT_WORD_BUCKETS.filter(
    (bucket) => buckets[bucket.name].length > 0,
  );

  if (weightedBuckets.length === 0) {
    buckets = buildWordBuckets(content, progress, false);
    weightedBuckets = NEXT_WORD_BUCKETS.filter(
      (bucket) => buckets[bucket.name].length > 0,
    );
  }

  const totalWeight = weightedBuckets.reduce((sum, bucket) => sum + bucket.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const bucket of weightedBuckets) {
    roll -= bucket.weight;

    if (roll <= 0) {
      return randomItem(buckets[bucket.name]);
    }
  }

  const fallbackBucket = weightedBuckets[weightedBuckets.length - 1];
  return fallbackBucket ? randomItem(buckets[fallbackBucket.name]) : null;
}

export function currentMazeLayout(progress: ProgressState, stage: StageContent): readonly string[] {
  const stageState = progress.stages[String(stage.id)];
  const milestone = stageState.pendingReward?.milestone || 10;
  const layoutIndex = Math.max(0, Math.floor(milestone / 10) - 1) % MAZE_LAYOUTS.length;
  return MAZE_LAYOUTS[layoutIndex];
}

export function isOpenMazeTile(layout: readonly string[], position: { row: number; col: number }): boolean {
  return (
    position.row >= 0 &&
    position.row < layout.length &&
    position.col >= 0 &&
    position.col < layout[position.row].length &&
    layout[position.row][position.col] !== "#"
  );
}

function cleanWordArray(value: unknown, words: string[]): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const allowed = new Set(words);
  const seen = new Set<string>();

  value.forEach((word) => {
    if (typeof word === "string" && allowed.has(word)) {
      seen.add(word);
    }
  });

  return words.filter((word) => seen.has(word));
}

function cleanDeckOrder(value: unknown, length: number): number[] {
  const defaultOrder = Array.from({ length }, (_, index) => index);

  if (!Array.isArray(value)) {
    return defaultOrder;
  }

  const seen = new Set<number>();
  const clean: number[] = [];

  value.forEach((index) => {
    if (Number.isInteger(index) && index >= 0 && index < length && !seen.has(index)) {
      seen.add(index);
      clean.push(index);
    }
  });

  defaultOrder.forEach((index) => {
    if (!seen.has(index)) {
      clean.push(index);
    }
  });

  return clean.length === length ? clean : defaultOrder;
}

function cleanStageIds(content: SightWordsContent, value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const valid = new Set(content.stages.map((stage) => stage.id));
  return [...new Set(value.filter((stageId) => valid.has(Number(stageId))).map(Number))].sort(
    (first, second) => first - second,
  );
}

function cleanItemArray(value: unknown, rewardById: Map<string, RewardItem>): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value.filter((itemId) => typeof itemId === "string" && rewardById.has(itemId)),
    ),
  ] as string[];
}

function cleanMilestones(
  value: unknown,
  rewardByMilestone: Map<number, RewardItem>,
): number[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value.filter((milestone) => Number.isInteger(milestone) && rewardByMilestone.has(milestone)),
    ),
  ].sort((first, second) => first - second) as number[];
}

function cleanPendingReward(
  value: unknown,
  knownCount: number,
  rewardByIdMap: Map<string, RewardItem>,
  rewardByMilestoneMap: Map<number, RewardItem>,
  completedSet: Set<number>,
): PendingReward | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const source = value as Record<string, unknown>;
  const itemId = typeof source.itemId === "string" ? source.itemId : "";
  const milestone = Number.isInteger(source.milestone) ? Number(source.milestone) : 0;
  const reward = rewardByIdMap.get(itemId) || rewardByMilestoneMap.get(milestone);

  if (!reward || knownCount < reward.milestone || completedSet.has(reward.milestone)) {
    return null;
  }

  return { milestone: reward.milestone, itemId: reward.id };
}

function randomItem(items: number[]): number {
  return items[Math.floor(Math.random() * items.length)];
}
