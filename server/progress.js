"use strict";

const {
  CONTENT_VERSION,
  PHRASE_FOREST,
  REWARD_ID_ALIASES,
  STAGES,
  allStageIds,
  rewardsForStage,
  stageById,
} = require("./content");

const PHRASE_MISSION_COUNT = 20;
const PHRASE_CHECKPOINT_START = 16;
const PHRASE_REQUIRED_CHECKPOINTS = 3;
const PHRASE_MISSION_ACTIVITIES = [
  "match", "build", "match", "build", "match",
  "build", "match", "build", "match", "build",
  "match", "build", "match", "build", "match",
  "build", "match", "build", "match", "match",
];

function createDefaultStageState(stage) {
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

function createDefaultProgress() {
  const stages = {};

  STAGES.forEach((stage) => {
    stages[String(stage.id)] = createDefaultStageState(stage);
  });

  return {
    version: CONTENT_VERSION,
    activeStageId: 1,
    unlockedStageIds: [1],
    completedFieldTrips: [],
    stages,
    phraseForest: createDefaultPhraseForestProgress(),
  };
}

function createDefaultPhraseStageState() {
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

function createDefaultPhraseForestProgress() {
  const stages = {};

  PHRASE_FOREST.stages.forEach((stage) => {
    stages[String(stage.id)] = createDefaultPhraseStageState();
  });

  return {
    activeStageId: PHRASE_FOREST.stages[0].id,
    unlockedStageIds: [],
    completedStageIds: [],
    stages,
  };
}

function sanitizeProgress(value) {
  const source = value && typeof value === "object" ? value : {};
  const requestedCompletedFieldTrips = new Set(
    cleanStageIdArray(source.completedFieldTrips).filter((stageId) =>
      hasNextStageId(stageId),
    ),
  );
  const stages = {};

  STAGES.forEach((stage) => {
    const savedStage =
      source.stages && typeof source.stages === "object"
        ? source.stages[String(stage.id)] || source.stages[stage.id]
        : null;

    stages[String(stage.id)] = sanitizeStageState(stage, savedStage);
  });

  STAGES.forEach((stage) => {
    if (!hasNextStage(stage)) {
      return;
    }

    const stageState = stages[String(stage.id)];
    const completedInSource =
      requestedCompletedFieldTrips.has(stage.id) || stageState.fieldTripCompleted;

    stageState.fieldTripCompleted =
      completedInSource && isStageComplete(stage, stageState);
  });

  const completedFieldTrips = completedFieldTripsFor(stages);
  const completedFieldTripSet = new Set(completedFieldTrips);

  STAGES.forEach((stage) => {
    if (hasNextStage(stage)) {
      stages[String(stage.id)].fieldTripCompleted = completedFieldTripSet.has(stage.id);
    }
  });

  const unlockedStageIds = unlockedStageIdsFor(stages);
  const requestedActiveStage = Number(source.activeStageId);
  const activeStageId = unlockedStageIds.includes(requestedActiveStage)
    ? requestedActiveStage
    : unlockedStageIds[unlockedStageIds.length - 1];

  const phraseForest = sanitizePhraseForestProgress(source.phraseForest, stages);

  return {
    version: CONTENT_VERSION,
    activeStageId,
    unlockedStageIds,
    completedFieldTrips,
    stages,
    phraseForest,
  };
}

function sanitizePhraseForestProgress(value, wordStages) {
  const source = value && typeof value === "object" ? value : {};
  const sourceStages = source.stages && typeof source.stages === "object"
    ? source.stages
    : {};
  const stages = {};

  PHRASE_FOREST.stages.forEach((stage) => {
    stages[String(stage.id)] = sanitizePhraseStageState(
      stage,
      sourceStages[String(stage.id)] || sourceStages[stage.id],
    );
  });

  const academyComplete = STAGES.every((stage) =>
    isStageComplete(stage, wordStages[String(stage.id)]),
  );
  const unlockedStageIds = [];
  const completedStageIds = [];

  if (academyComplete) {
    for (const stage of PHRASE_FOREST.stages) {
      unlockedStageIds.push(stage.id);
      const stageState = stages[String(stage.id)];

      if (!stageState.completed) {
        break;
      }

      completedStageIds.push(stage.id);
    }
  }

  const requestedActiveStageId = Number(source.activeStageId);
  const activeStageId = unlockedStageIds.includes(requestedActiveStageId)
    ? requestedActiveStageId
    : unlockedStageIds[unlockedStageIds.length - 1] || PHRASE_FOREST.stages[0].id;

  return { activeStageId, unlockedStageIds, completedStageIds, stages };
}

function sanitizePhraseStageState(stage, value) {
  const source = value && typeof value === "object" ? value : {};
  const allowedMissionIds = Array.from(
    { length: PHRASE_MISSION_COUNT },
    (_, index) => phraseMissionId(stage.id, index),
  );
  const completedMissionIds = cleanOrderedPrefix(source.completedMissionIds, allowedMissionIds);
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
  const allowedItemIds = new Set([
    ...stage.practicePhrases,
    ...stage.checkpointPhrases,
  ].map((item) => item.id));
  const helpedItemIds = cleanStringIds(source.helpedItemIds, allowedItemIds);
  const independentItemIds = cleanStringIds(source.independentItemIds, allowedItemIds)
    .filter((itemId) => !helpedItemIds.includes(itemId));
  const itemResults = cleanPhraseItemResults(source.itemResults, allowedItemIds);
  const mastered = phraseCheckpointReady(
    stage.id,
    completedMissionIds,
    completedCheckpointIds,
    checkpointSessionIds,
  );
  const completed = completedMissionIds.length >= PHRASE_MISSION_COUNT;
  const currentMissionIndex = Math.min(
    completedMissionIds.length,
    PHRASE_MISSION_COUNT - 1,
  );
  const maxRoundIndex = currentMissionIndex < PHRASE_CHECKPOINT_START - 1 ? 3 : 2;
  const currentRoundIndex = completed
    ? 0
    : clampInteger(source.currentRoundIndex, 0, maxRoundIndex);

  return {
    currentRoundIndex,
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

function sanitizeStageState(stage, value) {
  const source = value && typeof value === "object" ? value : {};
  const defaults = createDefaultStageState(stage);
  const knownWords = cleanWordArray(source.knownWords, stage.words);
  const knownSet = new Set(knownWords);
  const practiceWords = cleanWordArray(source.practiceWords, stage.words).filter(
    (word) => !knownSet.has(word),
  );
  const deckOrder = cleanDeckOrder(source.deckOrder, stage.words.length);
  const rewards = rewardsForStage(stage);
  const rewardById = new Map(rewards.map((reward) => [reward.id, reward]));
  const rewardByMilestone = new Map(
    rewards.map((reward) => [reward.milestone, reward]),
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

  const currentIndex = Number.isInteger(source.currentIndex)
    ? Math.min(Math.max(source.currentIndex, 0), deckOrder.length - 1)
    : defaults.currentIndex;

  return {
    knownWords,
    practiceWords,
    currentIndex,
    deckOrder,
    shuffled: Boolean(source.shuffled),
    unlockedItems: sortRewards(unlockedItems, rewards),
    equippedItems: sortRewards(equippedItems, rewards),
    completedMazeMilestones,
    pendingReward,
    fieldTripCompleted: Boolean(source.fieldTripCompleted),
  };
}

function isStageComplete(stage, stageState) {
  return stageState.knownWords.length >= stage.words.length;
}

function hasNextStage(stage) {
  return hasNextStageId(stage.id);
}

function hasNextStageId(stageId) {
  return allStageIds().includes(Number(stageId) + 1);
}

function completedFieldTripsFor(stages) {
  const completedFieldTrips = [];

  for (const stage of STAGES) {
    if (!hasNextStage(stage)) {
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

function unlockedStageIdsFor(stages) {
  const unlockedStageIds = [1];

  for (const stage of STAGES) {
    if (!hasNextStage(stage)) {
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

function mergeProgress(existing, incoming) {
  const base = sanitizeProgress(existing);
  const next = sanitizeProgress(incoming);
  const merged = createDefaultProgress();
  const completedFieldTrips = new Set([
    ...base.completedFieldTrips,
    ...next.completedFieldTrips,
  ]);

  STAGES.forEach((stage) => {
    const key = String(stage.id);
    const baseStage = base.stages[key];
    const nextStage = next.stages[key];
    const knownWords = unionWords(baseStage.knownWords, nextStage.knownWords, stage.words);
    const knownSet = new Set(knownWords);
    const practiceWords = unionWords(
      baseStage.practiceWords,
      nextStage.practiceWords,
      stage.words,
    ).filter((word) => !knownSet.has(word));
    const rewards = rewardsForStage(stage);

    merged.stages[key] = sanitizeStageState(stage, {
      knownWords,
      practiceWords,
      currentIndex: nextStage.currentIndex,
      deckOrder: nextStage.deckOrder,
      shuffled: nextStage.shuffled || baseStage.shuffled,
      unlockedItems: unique([...baseStage.unlockedItems, ...nextStage.unlockedItems]),
      equippedItems: unique([...baseStage.equippedItems, ...nextStage.equippedItems]),
      completedMazeMilestones: unique([
        ...baseStage.completedMazeMilestones,
        ...nextStage.completedMazeMilestones,
      ]),
      pendingReward: nextStage.pendingReward || baseStage.pendingReward,
      fieldTripCompleted:
        baseStage.fieldTripCompleted || nextStage.fieldTripCompleted,
    });

    if (
      merged.stages[key].fieldTripCompleted &&
      hasNextStage(stage) &&
      isStageComplete(stage, merged.stages[key])
    ) {
      completedFieldTrips.add(stage.id);
    }

    merged.stages[key].unlockedItems = sortRewards(
      merged.stages[key].unlockedItems,
      rewards,
    );
    merged.stages[key].equippedItems = sortRewards(
      merged.stages[key].equippedItems,
      rewards,
    );
  });

  merged.completedFieldTrips = [...completedFieldTrips].sort(
    (first, second) => first - second,
  );
  merged.unlockedStageIds = unlockedStageIdsFor(merged.stages);
  merged.activeStageId = next.activeStageId;
  merged.phraseForest = mergePhraseForestProgress(base.phraseForest, next.phraseForest);

  return sanitizeProgress(merged);
}

function mergePhraseForestProgress(base, next) {
  const merged = createDefaultPhraseForestProgress();

  PHRASE_FOREST.stages.forEach((stage) => {
    const key = String(stage.id);
    const baseStage = base.stages[key];
    const nextStage = next.stages[key];
    const completedMissionIds = unique([
      ...baseStage.completedMissionIds,
      ...nextStage.completedMissionIds,
    ]);
    const sourceWithMoreMissions = nextStage.completedMissionIds.length >=
      baseStage.completedMissionIds.length
      ? nextStage
      : baseStage;

    merged.stages[key] = {
      currentRoundIndex: sourceWithMoreMissions.currentRoundIndex,
      completedMissionIds,
      completedCheckpointIds: unique([
        ...baseStage.completedCheckpointIds,
        ...nextStage.completedCheckpointIds,
      ]),
      checkpointSessionIds: {
        ...baseStage.checkpointSessionIds,
        ...nextStage.checkpointSessionIds,
      },
      checkpointAttemptSessionIds: unique([
        ...baseStage.checkpointAttemptSessionIds,
        ...nextStage.checkpointAttemptSessionIds,
      ]),
      checkpointAttempt: sourceWithMoreMissions.checkpointAttempt,
      helpedItemIds: unique([...baseStage.helpedItemIds, ...nextStage.helpedItemIds]),
      independentItemIds: unique([
        ...baseStage.independentItemIds,
        ...nextStage.independentItemIds,
      ]),
      itemResults: mergePhraseItemResults(baseStage.itemResults, nextStage.itemResults),
    };
  });

  merged.activeStageId = next.activeStageId;
  return merged;
}

function cleanWordArray(value, words) {
  if (!Array.isArray(value)) {
    return [];
  }

  const allowed = new Set(words);
  const seen = new Set();

  value.forEach((word) => {
    if (typeof word === "string" && allowed.has(word)) {
      seen.add(word);
    }
  });

  return words.filter((word) => seen.has(word));
}

function cleanDeckOrder(value, length) {
  const defaultOrder = Array.from({ length }, (_, index) => index);

  if (!Array.isArray(value)) {
    return defaultOrder;
  }

  const clean = [];
  const seen = new Set();

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

function cleanStageIdArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const valid = new Set(allStageIds());
  return unique(value.filter((stageId) => valid.has(stageId))).sort(
    (first, second) => first - second,
  );
}

function cleanOrderedPrefix(value, allowedIds) {
  if (!Array.isArray(value)) {
    return [];
  }

  const requested = new Set(value.filter((itemId) => typeof itemId === "string"));
  const clean = [];

  for (const itemId of allowedIds) {
    if (!requested.has(itemId)) {
      break;
    }

    clean.push(itemId);
  }

  return clean;
}

function cleanStringIds(value, allowedIds) {
  if (!Array.isArray(value)) {
    return [];
  }

  return unique(value.filter((itemId) =>
    typeof itemId === "string" && allowedIds.has(itemId),
  ));
}

function cleanSessionIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return unique(value.map(cleanSessionId).filter(Boolean));
}

function cleanCheckpointSessionIds(value, allowedMissionIds) {
  if (!value || typeof value !== "object") {
    return {};
  }

  const clean = {};
  const usedSessions = new Set();
  Object.entries(value).forEach(([missionId, rawSessionId]) => {
    const sessionId = cleanSessionId(rawSessionId);
    if (!allowedMissionIds.has(missionId) || !sessionId || usedSessions.has(sessionId)) {
      return;
    }
    clean[missionId] = sessionId;
    usedSessions.add(sessionId);
  });
  return clean;
}

function cleanCheckpointAttempt(value, allowedMissionIds, allowedItemIds) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const missionId = typeof value.missionId === "string" ? value.missionId : "";
  const sessionId = cleanSessionId(value.sessionId);
  if (!allowedMissionIds.has(missionId) || !sessionId) {
    return null;
  }

  return {
    missionId,
    sessionId,
    itemIds: cleanStringIds(value.itemIds, allowedItemIds),
    hadError: value.hadError === true,
    usedHelp: value.usedHelp === true,
  };
}

function cleanSessionId(value) {
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

function cleanPhraseItemResults(value, allowedIds) {
  if (!value || typeof value !== "object") {
    return {};
  }

  const clean = {};

  Object.entries(value).forEach(([itemId, result]) => {
    if (!allowedIds.has(itemId) || !result || typeof result !== "object") {
      return;
    }

    clean[itemId] = {
      correct: clampInteger(result.correct, 0, 999),
      errors: clampInteger(result.errors, 0, 999),
      phraseHelp: clampInteger(result.phraseHelp, 0, 999),
      wordHelp: clampInteger(result.wordHelp, 0, 999),
    };
  });

  return clean;
}

function mergePhraseItemResults(first, second) {
  const merged = {};
  const itemIds = new Set([...Object.keys(first), ...Object.keys(second)]);

  itemIds.forEach((itemId) => {
    const firstResult = first[itemId] || {};
    const secondResult = second[itemId] || {};
    merged[itemId] = {
      correct: Math.max(firstResult.correct || 0, secondResult.correct || 0),
      errors: Math.max(firstResult.errors || 0, secondResult.errors || 0),
      phraseHelp: Math.max(firstResult.phraseHelp || 0, secondResult.phraseHelp || 0),
      wordHelp: Math.max(firstResult.wordHelp || 0, secondResult.wordHelp || 0),
    };
  });

  return merged;
}

function clampInteger(value, minimum, maximum) {
  const number = Number(value);
  return Number.isInteger(number)
    ? Math.min(Math.max(number, minimum), maximum)
    : minimum;
}

function phraseMissionId(stageId, missionIndex) {
  return `phrase-stage-${stageId}-mission-${missionIndex + 1}`;
}

function phraseCheckpointReady(
  stageId,
  completedMissionIds,
  completedCheckpointIds,
  checkpointSessionIds,
) {
  const qualifiedMissionIds = completedCheckpointIds.filter((missionId) =>
    Boolean(checkpointSessionIds[missionId]),
  );
  const prefix = `phrase-stage-${stageId}-mission-`;
  const activities = new Set(qualifiedMissionIds.map((missionId) => {
    const missionNumber = Number(missionId.slice(prefix.length));
    return PHRASE_MISSION_ACTIVITIES[missionNumber - 1];
  }));

  // Sanitization guarantees one distinct session per qualified mission. Three
  // of the five authored checkpoint missions also guarantee at least one match;
  // requiring a build completes the construction-plus-meaning rule.
  return completedMissionIds.length >= PHRASE_MISSION_COUNT &&
    qualifiedMissionIds.length >= PHRASE_REQUIRED_CHECKPOINTS &&
    activities.has("build");
}

function cleanItemArray(value, rewardById) {
  if (!Array.isArray(value)) {
    return [];
  }

  return unique(
    value
      .filter((itemId) => typeof itemId === "string")
      .map(resolveRewardId)
      .filter((itemId) => rewardById.has(itemId)),
  );
}

function cleanMilestones(value, rewardByMilestone) {
  if (!Array.isArray(value)) {
    return [];
  }

  return unique(value.filter((milestone) => rewardByMilestone.has(milestone))).sort(
    (first, second) => first - second,
  );
}

function cleanPendingReward(
  value,
  knownCount,
  rewardById,
  rewardByMilestone,
  completedSet,
) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const reward =
    rewardById.get(resolveRewardId(value.itemId)) ||
    rewardByMilestone.get(value.milestone);

  if (!reward || knownCount < reward.milestone || completedSet.has(reward.milestone)) {
    return null;
  }

  return {
    milestone: reward.milestone,
    itemId: reward.id,
  };
}

function sortRewards(itemIds, rewards) {
  const set = new Set(itemIds);
  return rewards.filter((reward) => set.has(reward.id)).map((reward) => reward.id);
}

function resolveRewardId(itemId) {
  return typeof itemId === "string" ? REWARD_ID_ALIASES[itemId] || itemId : "";
}

function unionWords(first, second, words) {
  const set = new Set([...first, ...second]);
  return words.filter((word) => set.has(word));
}

function unique(items) {
  return [...new Set(items)];
}

function progressForLegacyState(legacy) {
  const progress = createDefaultProgress();

  if (!legacy || typeof legacy !== "object") {
    return progress;
  }

  progress.stages["1"] = sanitizeStageState(stageById(1), {
    knownWords: legacy.knownWords,
    practiceWords: legacy.practiceWords,
    currentIndex: legacy.currentIndex,
    deckOrder: legacy.deckOrder,
    shuffled: legacy.shuffled,
    unlockedItems: legacy.unlockedItems,
    equippedItems: legacy.equippedItems,
    completedMazeMilestones: legacy.completedMazeMilestones,
    pendingReward: legacy.pendingReward,
  });

  return sanitizeProgress(progress);
}

module.exports = {
  createDefaultProgress,
  mergeProgress,
  progressForLegacyState,
  sanitizeProgress,
  sanitizeStageState,
};
