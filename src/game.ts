import type {
  PendingReward,
  ProgressState,
  RewardItem,
  SightWordsContent,
  StageContent,
  StageProgress,
} from "./types";
import {
  clearOfflineProgress,
  clearPreviousLocalProgress,
  LEGACY_STORAGE_KEY,
  OFFLINE_STORAGE_PREFIX,
  offlineProgressStorageKey,
  readJsonStorage,
  saveOfflineProgress,
  STORAGE_KEY,
} from "./game/storage";
export {
  clearOfflineProgress,
  clearPreviousLocalProgress,
  LEGACY_STORAGE_KEY,
  OFFLINE_STORAGE_PREFIX,
  offlineProgressStorageKey,
  readJsonStorage,
  saveOfflineProgress,
  STORAGE_KEY,
} from "./game/storage";

import {
  defaultPhraseForestProgress,
  sanitizePhraseForestProgress,
} from "./phraseForest";
import { newWordWeightForProgress } from "./game/wordSelection";

export { newWordWeightForProgress } from "./game/wordSelection";

export const REVIEW_PRACTICE_WEIGHT = 80;
export const REVIEW_KNOWN_WEIGHT = 20;
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

export { isOpenMazeTile } from "./game/maze";

export type MoveDirection = keyof typeof MOVE_DELTAS;
export type WordBucketName = "new" | "practice" | "known";

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
    phraseForest: defaultPhraseForestProgress(content.phraseForest),
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

export function loadOfflineProgress(
  content: SightWordsContent,
  userId: number,
): ProgressState | null {
  const saved = readJsonStorage(offlineProgressStorageKey(userId));

  if (!saved || typeof saved !== "object") {
    return null;
  }

  const record = saved as Record<string, unknown>;

  if (Number(record.userId) !== userId || !record.progress) {
    return null;
  }

  return sanitizeProgress(content, record.progress);
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
    : progress.unlockedStageIds[progress.unlockedStageIds.length - 1];
  progress.phraseForest = sanitizePhraseForestProgress(
    content.phraseForest,
    source.phraseForest,
    wordAcademyComplete(content, progress),
  );

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
  const unlockedItems = cleanItemArray(content, source.unlockedItems, rewardById);
  const equippedItems = cleanItemArray(content, source.equippedItems, rewardById).filter(
    (itemId) => unlockedItems.includes(itemId),
  );
  const pendingReward = cleanPendingReward(
    content,
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

export function wordAcademyComplete(
  content: SightWordsContent,
  progress: ProgressState,
): boolean {
  return content.stages.every((stage) =>
    isStageComplete(stage, progress.stages[String(stage.id)]),
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

  for (const stage of content.stages) {
    if (!hasNextStage(content, stage)) {
      break;
    }

    const stageState = stages[String(stage.id)];

    if (!stageState?.fieldTripCompleted || !isStageComplete(stage, stageState)) {
      break;
    }

    unlockedStageIds.push(stage.id + 1);
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
  const buckets = buildWordBuckets(content, progress, true);

  return hasAnyWordBucket(buckets);
}

export function selectWeightedWordIndex(
  content: SightWordsContent,
  progress: ProgressState,
): number | null {
  let buckets = buildWordBuckets(content, progress, true);

  if (!hasAnyWordBucket(buckets)) {
    buckets = buildWordBuckets(content, progress, false);
  }

  if (!hasAnyWordBucket(buckets)) {
    return null;
  }

  const stage = activeStage(content, progress);
  const stageState = activeStageState(content, progress);
  const progressRatio = stageState.knownWords.length / stage.words.length;
  const newWordWeight = newWordWeightForProgress(progressRatio);
  const hasNewWords = buckets.new.length > 0;
  const hasPracticeWords = buckets.practice.length > 0;
  const hasKnownWords = buckets.known.length > 0;
  const hasReviewWords = hasPracticeWords || hasKnownWords;

  if (hasNewWords && (!hasReviewWords || Math.random() * 100 < newWordWeight)) {
    return randomItem(buckets.new);
  }

  if (hasPracticeWords && hasKnownWords) {
    return Math.random() * (REVIEW_PRACTICE_WEIGHT + REVIEW_KNOWN_WEIGHT) <
      REVIEW_PRACTICE_WEIGHT
      ? randomItem(buckets.practice)
      : randomItem(buckets.known);
  }

  return hasPracticeWords ? randomItem(buckets.practice) : randomItem(buckets.known);
}

export function currentMazeLayout(progress: ProgressState, stage: StageContent): readonly string[] {
  const milestone = progress.stages[String(stage.id)].pendingReward?.milestone || 10;
  return MAZE_LAYOUTS[Math.max(0, Math.floor(milestone / 10) - 1) % MAZE_LAYOUTS.length];
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

  return clean;
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

function cleanItemArray(
  content: SightWordsContent,
  value: unknown,
  rewardById: Map<string, RewardItem>,
): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .filter((itemId): itemId is string => typeof itemId === "string")
        .map((itemId) => resolveRewardId(content, itemId))
        .filter((itemId) => rewardById.has(itemId)),
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
  content: SightWordsContent,
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
  const itemId = typeof source.itemId === "string"
    ? resolveRewardId(content, source.itemId)
    : "";
  const milestone = Number.isInteger(source.milestone) ? Number(source.milestone) : 0;
  const reward = rewardByIdMap.get(itemId) || rewardByMilestoneMap.get(milestone);

  if (!reward || knownCount < reward.milestone || completedSet.has(reward.milestone)) {
    return null;
  }

  return { milestone: reward.milestone, itemId: reward.id };
}

function resolveRewardId(content: SightWordsContent, itemId: string): string {
  return content.rewardAliases?.[itemId] || itemId;
}

function hasAnyWordBucket(buckets: WordBuckets): boolean { return buckets.new.length > 0 || buckets.practice.length > 0 || buckets.known.length > 0; }
function randomItem(items: number[]): number { return items[Math.floor(Math.random() * items.length)]; }
