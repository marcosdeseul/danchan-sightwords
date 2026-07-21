export type RewardSlot =
  | "weapon"
  | "boots"
  | "shield"
  | "radio"
  | "cape"
  | "armor"
  | "belt"
  | "gloves"
  | "helmet"
  | "banner"
  | "crown"
  | "medal"
  | "gem"
  | "pack"
  | "lantern"
  | "crest"
  | "star"
  | "map"
  | "torch"
  | "flag"
  | "trophy"
  | "compass"
  | "scroll"
  | "badge"
  | "canteen"
  | "whistle"
  | "engine"
  | "intake"
  | "gauge"
  | "afterburner"
  | "jetmodel";

export interface RewardItem {
  id: string;
  name: string;
  slot: RewardSlot;
  stageId: number;
  milestone: number;
  visualKey: string;
}

export interface FieldTripContent {
  title: string;
  intro: string;
  finish: string;
  creatures: string[];
}

export interface StageContent {
  id: number;
  title: string;
  subtitle: string;
  themeClass: string;
  heroName: string;
  words: string[];
  rewards: RewardItem[];
  fieldTrip: FieldTripContent;
}

export interface PhraseVisualContent {
  kind: "symbol" | "location";
  symbol?: string;
  relation?: string;
  anchor?: string;
  target?: string;
}

export interface PhraseItemContent {
  id: string;
  text: string;
  tokens: string[];
  contrastKey: string;
  meaningSafe: boolean;
  accessibilityText: string;
  visual: PhraseVisualContent;
}

export interface PhraseChapterContent {
  id: "discover" | "practice" | "apply" | "prove";
  title: string;
  missionStart: number;
  missionEnd: number;
}

export interface PhraseCompanionContent {
  id: string;
  name: string;
  emoji: string;
}

export interface PhraseStageContent {
  id: number;
  title: string;
  subtitle: string;
  areaName: string;
  companion: PhraseCompanionContent;
  restoration: string;
  intro: string;
  missionCount: number;
  chapters: PhraseChapterContent[];
  practicePhrases: PhraseItemContent[];
  checkpointPhrases: PhraseItemContent[];
}

export interface PhraseForestContent {
  title: string;
  subtitle: string;
  stages: PhraseStageContent[];
}

export interface SightWordsContent {
  version: number;
  rewardAliases?: Record<string, string>;
  stages: StageContent[];
  phraseForest?: PhraseForestContent;
}

export interface PendingReward {
  milestone: number;
  itemId: string;
}

export interface StageProgress {
  knownWords: string[];
  practiceWords: string[];
  currentIndex: number;
  deckOrder: number[];
  shuffled: boolean;
  unlockedItems: string[];
  equippedItems: string[];
  completedMazeMilestones: number[];
  pendingReward: PendingReward | null;
  fieldTripCompleted: boolean;
}

export interface ProgressState {
  version: number;
  activeStageId: number;
  unlockedStageIds: number[];
  completedFieldTrips: number[];
  stages: Record<string, StageProgress>;
  phraseForest: PhraseForestProgress;
}

export interface PhraseItemResult {
  correct: number;
  errors: number;
  phraseHelp: number;
  wordHelp: number;
}

export interface PhraseCheckpointAttempt {
  missionId: string;
  sessionId: string;
  itemIds: string[];
  hadError: boolean;
  usedHelp: boolean;
}

export interface PhraseStageProgress {
  currentRoundIndex: number;
  completedMissionIds: string[];
  completedCheckpointIds: string[];
  checkpointSessionIds: Record<string, string>;
  checkpointAttemptSessionIds: string[];
  checkpointAttempt: PhraseCheckpointAttempt | null;
  helpedItemIds: string[];
  independentItemIds: string[];
  itemResults: Record<string, PhraseItemResult>;
  completed: boolean;
  restoredArea: boolean;
  companionUnlocked: boolean;
}

export interface PhraseForestProgress {
  activeStageId: number;
  unlockedStageIds: number[];
  completedStageIds: number[];
  stages: Record<string, PhraseStageProgress>;
}

export interface User {
  id: number;
  username: string;
  email: string | null;
}

export interface ApiErrorResponse {
  error?: string;
}
