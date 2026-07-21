import type {
  PhraseForestContent,
  PhraseForestProgress,
  PhraseItemContent,
  PhraseItemResult,
  PhraseStageContent,
  PhraseStageProgress,
} from "./types";
import {
  checkpointAttemptFor, cleanCheckpointAttempt, cleanCheckpointSessionIds,
  cleanItemResults, cleanOrderedPrefix, cleanSessionIds, cleanStringIds,
  clampInteger, cloneStageProgress, phraseMissionIndexFromId, recordFrom, stableNumber,
} from "./phraseForest/utils";

export const PHRASE_MISSION_COUNT = 20;
export const PHRASE_CHECKPOINT_START = 16;
export const PHRASE_REQUIRED_CHECKPOINTS = 3;

export type PhraseActivity = "build" | "match";

export interface PhraseMission {
  id: string;
  index: number;
  number: number;
  chapterId: "discover" | "practice" | "apply" | "prove";
  chapterTitle: string;
  requestedActivity: PhraseActivity;
  items: PhraseItemContent[];
  checkpoint: boolean;
  capstone: boolean;
}

export type PhraseEvidenceEvent = "correct" | "error" | "phraseHelp" | "wordHelp";

export interface PhraseRoundAdvance {
  stageState: PhraseStageProgress;
  missionCompleted: boolean;
  stageCompleted: boolean;
  checkpointQualified: boolean;
}

export interface PhraseCheckpointStatus {
  qualified: number;
  required: number;
  separateSessions: number;
  hasConstruction: boolean;
  hasMeaning: boolean;
  ready: boolean;
}

const MISSION_ACTIVITIES: PhraseActivity[] = [
  "match", "build", "match", "build", "match",
  "build", "match", "build", "match", "build",
  "match", "build", "match", "build", "match",
  "build", "match", "build", "match", "match",
];

export function defaultPhraseForestProgress(
  content?: PhraseForestContent,
): PhraseForestProgress {
  const stages: Record<string, PhraseStageProgress> = {};

  content?.stages.forEach((stage) => {
    stages[String(stage.id)] = defaultPhraseStageProgress();
  });

  return {
    activeStageId: content?.stages[0]?.id || 6,
    unlockedStageIds: [],
    completedStageIds: [],
    stages,
  };
}

export function defaultPhraseStageProgress(): PhraseStageProgress {
  return {
    currentRoundIndex: 0,
    completedMissionIds: [],
    completedCheckpointIds: [],
    checkpointSessionIds: {},
    checkpointAttemptSessionIds: [],
    checkpointAttempt: null,
    helpedItemIds: [],
    independentItemIds: [],
    itemResults: {},
    completed: false,
    mastered: false,
    restoredArea: false,
    companionUnlocked: false,
  };
}

export function sanitizePhraseForestProgress(
  content: PhraseForestContent | undefined,
  value: unknown,
  academyComplete: boolean,
): PhraseForestProgress {
  const defaults = defaultPhraseForestProgress(content);

  if (!content) {
    return defaults;
  }

  const source = recordFrom(value);
  const sourceStages = recordFrom(source.stages);
  const stages: Record<string, PhraseStageProgress> = {};

  content.stages.forEach((stage) => {
    stages[String(stage.id)] = sanitizePhraseStageProgress(
      stage,
      sourceStages[String(stage.id)],
    );
  });

  const unlockedStageIds: number[] = [];
  const completedStageIds: number[] = [];

  if (academyComplete) {
    for (const stage of content.stages) {
      unlockedStageIds.push(stage.id);

      if (!stages[String(stage.id)].completed) {
        break;
      }

      completedStageIds.push(stage.id);
    }
  }

  const requestedActiveStageId = Number(source.activeStageId);
  const activeStageId = unlockedStageIds.includes(requestedActiveStageId)
    ? requestedActiveStageId
    : unlockedStageIds[unlockedStageIds.length - 1] || content.stages[0].id;

  return { activeStageId, unlockedStageIds, completedStageIds, stages };
}

export function sanitizePhraseStageProgress(
  stage: PhraseStageContent,
  value: unknown,
): PhraseStageProgress {
  const source = recordFrom(value);
  const allowedMissionIds = Array.from(
    { length: PHRASE_MISSION_COUNT },
    (_, index) => phraseMissionId(stage.id, index),
  );
  const completedMissionIds = cleanOrderedPrefix(
    source.completedMissionIds,
    allowedMissionIds,
  );
  const completedSet = new Set(completedMissionIds);
  const allowedCheckpointIds = allowedMissionIds.slice(PHRASE_CHECKPOINT_START - 1);
  const allowedCheckpointSet = new Set(allowedCheckpointIds);
  let completedCheckpointIds = cleanStringIds(source.completedCheckpointIds, allowedCheckpointSet)
    .filter((missionId) => completedSet.has(missionId));
  let checkpointSessionIds = cleanCheckpointSessionIds(
    source.checkpointSessionIds,
    new Set(completedCheckpointIds),
  );
  if (
    source.completed === true &&
    completedMissionIds.length === PHRASE_MISSION_COUNT &&
    Object.keys(checkpointSessionIds).length === 0
  ) {
    completedCheckpointIds = allowedCheckpointIds.slice(0, PHRASE_REQUIRED_CHECKPOINTS);
    checkpointSessionIds = Object.fromEntries(completedCheckpointIds.map(
      (missionId, index) => [missionId, `legacy-stage-${stage.id}-${index + 1}`],
    ));
  }
  completedCheckpointIds = completedCheckpointIds.filter((missionId) =>
    Boolean(checkpointSessionIds[missionId]),
  );
  const checkpointAttemptSessionIds = cleanSessionIds(source.checkpointAttemptSessionIds);
  const allowedItemIds = new Set(
    [...stage.practicePhrases, ...stage.checkpointPhrases].map((item) => item.id),
  );
  const helpedItemIds = cleanStringIds(source.helpedItemIds, allowedItemIds);
  const independentItemIds = cleanStringIds(source.independentItemIds, allowedItemIds)
    .filter((itemId) => !helpedItemIds.includes(itemId));
  const itemResults = cleanItemResults(source.itemResults, allowedItemIds);
  const partialState = {
    ...defaultPhraseStageProgress(),
    completedMissionIds,
    completedCheckpointIds,
    checkpointSessionIds,
  };
  const completed = completedMissionIds.length >= PHRASE_MISSION_COUNT;
  const mastered = phraseCheckpointStatus(stage.id, partialState).ready;
  const currentMissionIndex = currentPhraseMissionIndex(partialState, stage.id);
  const maxRoundIndex = currentMissionIndex < PHRASE_CHECKPOINT_START - 1 ? 3 : 2;

  return {
    currentRoundIndex: completed
      ? 0
      : clampInteger(source.currentRoundIndex, 0, maxRoundIndex),
    completedMissionIds,
    completedCheckpointIds,
    checkpointSessionIds,
    checkpointAttemptSessionIds,
    checkpointAttempt: cleanCheckpointAttempt(
      source.checkpointAttempt,
      allowedCheckpointSet,
      allowedItemIds,
    ),
    helpedItemIds,
    independentItemIds,
    itemResults,
    completed,
    mastered,
    restoredArea: completed,
    companionUnlocked: completed,
  };
}

export function phraseMissionForStage(
  stage: PhraseStageContent,
  missionIndex: number,
): PhraseMission {
  const cleanIndex = Math.min(Math.max(missionIndex, 0), PHRASE_MISSION_COUNT - 1);
  const checkpoint = cleanIndex >= PHRASE_CHECKPOINT_START - 1;
  const source = checkpoint ? stage.checkpointPhrases : stage.practicePhrases;
  const count = checkpoint ? 3 : 4;
  const sourceIndex = checkpoint
    ? (cleanIndex - (PHRASE_CHECKPOINT_START - 1)) * count
    : cleanIndex * count;
  const chapter = stage.chapters.find((candidate) =>
    cleanIndex + 1 >= candidate.missionStart && cleanIndex + 1 <= candidate.missionEnd,
  ) || stage.chapters[0];

  return {
    id: phraseMissionId(stage.id, cleanIndex),
    index: cleanIndex,
    number: cleanIndex + 1,
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    requestedActivity: MISSION_ACTIVITIES[cleanIndex],
    items: source.slice(sourceIndex, sourceIndex + count),
    checkpoint,
    capstone: cleanIndex === PHRASE_MISSION_COUNT - 1,
  };
}

export function activityForPhraseItem(
  mission: PhraseMission,
  item: PhraseItemContent,
): PhraseActivity {
  return mission.requestedActivity === "match" && !item.meaningSafe
    ? "build"
    : mission.requestedActivity;
}

export function meaningChoicesForItem(
  stage: PhraseStageContent,
  item: PhraseItemContent,
): PhraseItemContent[] {
  const allItems = [...stage.practicePhrases, ...stage.checkpointPhrases];
  const group = allItems.filter((candidate) =>
    candidate.contrastKey === item.contrastKey && candidate.id !== item.id,
  );
  const choices = [item, ...group.slice(0, 2)];
  const rotation = stableNumber(item.id) % choices.length;

  return [...choices.slice(rotation), ...choices.slice(0, rotation)];
}

export function shuffledPhraseTokens(item: PhraseItemContent): Array<{
  id: string;
  text: string;
}> {
  const tokens = item.tokens.map((text, index) => ({
    id: `${item.id}-token-${index}`,
    text,
  }));

  if (tokens.length < 2) {
    return tokens;
  }

  const rotation = (stableNumber(item.id) % (tokens.length - 1)) + 1;
  return [...tokens.slice(rotation), ...tokens.slice(0, rotation)];
}

export function phraseMissionId(stageId: number, missionIndex: number): string {
  return `phrase-stage-${stageId}-mission-${missionIndex + 1}`;
}

export function currentPhraseMissionIndex(
  stageState: PhraseStageProgress,
  _stageId?: number,
): number {
  return Math.min(stageState.completedMissionIds.length, PHRASE_MISSION_COUNT - 1);
}

export function phraseReviewMissionForStage(
  stage: PhraseStageContent,
  stageState: PhraseStageProgress,
  sessionId: string,
): PhraseMission | null {
  const status = phraseCheckpointStatus(stage.id, stageState);
  if (!stageState.completed || status.ready) {
    return null;
  }

  if (
    stageState.checkpointAttempt?.sessionId === sessionId &&
    !stageState.checkpointAttemptSessionIds.includes(sessionId)
  ) {
    const missionIndex = phraseMissionIndexFromId(stage.id, stageState.checkpointAttempt.missionId);
    return missionIndex === null ? null : phraseMissionForStage(stage, missionIndex);
  }

  if (stageState.checkpointAttemptSessionIds.includes(sessionId)) {
    return null;
  }

  const candidates = Array.from(
    { length: PHRASE_MISSION_COUNT - PHRASE_CHECKPOINT_START + 1 },
    (_, index) => PHRASE_CHECKPOINT_START - 1 + index,
  ).filter((missionIndex) =>
    !stageState.completedCheckpointIds.includes(phraseMissionId(stage.id, missionIndex)),
  );
  const neededActivity = !status.hasConstruction
    ? "build"
    : !status.hasMeaning
      ? "match"
      : null;
  const missionIndex = candidates.find((candidate) =>
    neededActivity === null || MISSION_ACTIVITIES[candidate] === neededActivity
  ) ?? candidates[0];

  return missionIndex === undefined ? null : phraseMissionForStage(stage, missionIndex);
}

export function phraseReviewRoundIndex(
  stageState: PhraseStageProgress,
  mission: PhraseMission,
  sessionId: string,
): number {
  const attempt = stageState.checkpointAttempt;
  return attempt?.missionId === mission.id && attempt.sessionId === sessionId
    ? Math.min(attempt.itemIds.length, mission.items.length - 1)
    : 0;
}

export function phraseChapterProgress(missionIndex: number): number {
  return (missionIndex % 5) + 1;
}

export function recordPhraseEvidence(
  stageState: PhraseStageProgress,
  itemId: string,
  event: PhraseEvidenceEvent,
  checkpoint?: { mission: PhraseMission; sessionId: string },
): PhraseStageProgress {
  const next = cloneStageProgress(stageState);
  const result = next.itemResults[itemId] || {
    correct: 0,
    errors: 0,
    phraseHelp: 0,
    wordHelp: 0,
  };

  if (event === "correct") {
    result.correct += 1;
  } else if (event === "error") {
    result.errors += 1;
  } else {
    result[event] += 1;
    if (!next.helpedItemIds.includes(itemId)) {
      next.helpedItemIds.push(itemId);
    }
    next.independentItemIds = next.independentItemIds.filter((id) => id !== itemId);
  }

  next.itemResults[itemId] = result;
  if (checkpoint?.mission.checkpoint) {
    const attempt = checkpointAttemptFor(
      next,
      checkpoint.mission.id,
      checkpoint.sessionId,
    );
    if (event === "correct" && !attempt.itemIds.includes(itemId)) {
      attempt.itemIds.push(itemId);
    } else if (event === "error") {
      attempt.hadError = true;
    } else if (event === "phraseHelp" || event === "wordHelp") {
      attempt.usedHelp = true;
    }
    next.checkpointAttempt = attempt;
  }
  return next;
}

export function advancePhraseRound(
  stage: PhraseStageContent,
  stageState: PhraseStageProgress,
  itemId: string,
  sessionId = "legacy-reading-session",
): PhraseRoundAdvance {
  const missionIndex = currentPhraseMissionIndex(stageState, stage.id);
  const mission = phraseMissionForStage(stage, missionIndex);
  let next = recordPhraseEvidence(
    stageState,
    itemId,
    "correct",
    mission.checkpoint ? { mission, sessionId } : undefined,
  );
  const itemResult = next.itemResults[itemId];
  const independentlyRead = !next.helpedItemIds.includes(itemId) && itemResult.errors === 0;

  if (independentlyRead && !next.independentItemIds.includes(itemId)) {
    next.independentItemIds.push(itemId);
  } else if (!independentlyRead) {
    next.independentItemIds = next.independentItemIds.filter((id) => id !== itemId);
  }

  const missionCompleted = next.currentRoundIndex + 1 >= mission.items.length;

  if (!missionCompleted) {
    next.currentRoundIndex += 1;
    return {
      stageState: next,
      missionCompleted: false,
      stageCompleted: false,
      checkpointQualified: false,
    };
  }

  if (!next.completedMissionIds.includes(mission.id)) {
    next.completedMissionIds.push(mission.id);
  }
  let checkpointQualified = false;
  if (mission.checkpoint) {
    checkpointQualified = finishCheckpointAttempt(next, mission, sessionId);
  }
  next.currentRoundIndex = 0;
  const stageCompleted = next.completedMissionIds.length >= PHRASE_MISSION_COUNT;
  next.completed = stageCompleted;
  next.mastered = phraseCheckpointStatus(stage.id, next).ready;
  next.restoredArea = stageCompleted;
  next.companionUnlocked = stageCompleted;

  return {
    stageState: next,
    missionCompleted: true,
    stageCompleted,
    checkpointQualified,
  };
}

export function advancePhraseReviewRound(
  stage: PhraseStageContent,
  stageState: PhraseStageProgress,
  mission: PhraseMission,
  itemId: string,
  sessionId: string,
): PhraseRoundAdvance {
  const next = recordPhraseEvidence(
    stageState,
    itemId,
    "correct",
    { mission, sessionId },
  );
  const missionCompleted = mission.items.every((missionItem) =>
    next.checkpointAttempt?.itemIds.includes(missionItem.id)
  );

  if (!missionCompleted) {
    return {
      stageState: next,
      missionCompleted: false,
      stageCompleted: next.completed,
      checkpointQualified: false,
    };
  }

  const checkpointQualified = finishCheckpointAttempt(next, mission, sessionId);
  next.mastered = phraseCheckpointStatus(stage.id, next).ready;

  return {
    stageState: next,
    missionCompleted: true,
    stageCompleted: next.completed,
    checkpointQualified,
  };
}

export function phraseCheckpointStatus(
  stageId: number,
  stageState: PhraseStageProgress,
): PhraseCheckpointStatus {
  const qualifiedMissionIds = stageState.completedCheckpointIds.filter((missionId) =>
    Boolean(stageState.checkpointSessionIds[missionId]),
  );
  const sessionIds = new Set(qualifiedMissionIds.map(
    (missionId) => stageState.checkpointSessionIds[missionId],
  ));
  const qualifiedActivities = new Set(qualifiedMissionIds.map((missionId) => {
    const prefix = `phrase-stage-${stageId}-mission-`;
    const missionNumber = missionId.startsWith(prefix)
      ? Number(missionId.slice(prefix.length))
      : 0;
    return MISSION_ACTIVITIES[missionNumber - 1];
  }));
  const qualified = qualifiedMissionIds.length;
  const hasConstruction = qualifiedActivities.has("build");
  const hasMeaning = qualifiedActivities.has("match");
  const ready = stageState.completedMissionIds.length >= PHRASE_MISSION_COUNT &&
    qualified >= PHRASE_REQUIRED_CHECKPOINTS &&
    sessionIds.size >= PHRASE_REQUIRED_CHECKPOINTS &&
    hasConstruction &&
    hasMeaning;

  return {
    qualified,
    required: PHRASE_REQUIRED_CHECKPOINTS,
    separateSessions: sessionIds.size,
    hasConstruction,
    hasMeaning,
    ready,
  };
}

function finishCheckpointAttempt(
  stageState: PhraseStageProgress,
  mission: PhraseMission,
  sessionId: string,
): boolean {
  const attempt = stageState.checkpointAttempt;
  const completedInOneSession = Boolean(
    attempt &&
    attempt.missionId === mission.id &&
    attempt.sessionId === sessionId &&
    mission.items.every((missionItem) => attempt.itemIds.includes(missionItem.id)),
  );
  const sessionAlreadyQualified = Object.values(stageState.checkpointSessionIds)
    .includes(sessionId);
  const checkpointQualified = Boolean(
    completedInOneSession &&
    !attempt?.hadError &&
    !attempt?.usedHelp &&
    !sessionAlreadyQualified,
  );

  if (checkpointQualified && !stageState.completedCheckpointIds.includes(mission.id)) {
    stageState.completedCheckpointIds.push(mission.id);
    stageState.checkpointSessionIds[mission.id] = sessionId;
  }
  if (!stageState.checkpointAttemptSessionIds.includes(sessionId)) {
    stageState.checkpointAttemptSessionIds.push(sessionId);
  }
  stageState.checkpointAttempt = null;
  return checkpointQualified;
}
