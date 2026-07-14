"use strict";

const {
  CONTENT_VERSION,
  REWARD_ID_ALIASES,
  STAGES,
  allStageIds,
  rewardsForStage,
  stageById,
} = require("./content");

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

  return {
    version: CONTENT_VERSION,
    activeStageId,
    unlockedStageIds,
    completedFieldTrips,
    stages,
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

  return sanitizeProgress(merged);
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
