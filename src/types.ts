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
  | "whistle";

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

export interface SightWordsContent {
  version: number;
  rewardAliases?: Record<string, string>;
  stages: StageContent[];
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
}

export interface User {
  id: number;
  username: string;
  email: string | null;
}

export interface ApiErrorResponse {
  error?: string;
}
