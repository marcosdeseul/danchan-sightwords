import { describe, expect, test } from "vitest";
import {
  activityForPhraseItem,
  advancePhraseRound,
  advancePhraseReviewRound,
  currentPhraseMissionIndex,
  defaultPhraseForestProgress,
  defaultPhraseStageProgress,
  meaningChoicesForItem,
  phraseChapterProgress,
  phraseCheckpointStatus,
  phraseMissionForStage,
  phraseMissionId,
  phraseReviewMissionForStage,
  phraseReviewRoundIndex,
  recordPhraseEvidence,
  sanitizePhraseForestProgress,
  sanitizePhraseStageProgress,
  shuffledPhraseTokens,
} from "./phraseForest";
import type {
  PhraseForestContent,
  PhraseItemContent,
  PhraseStageContent,
} from "./types";

function createStage(id: number): PhraseStageContent {
  const items = Array.from({ length: 75 }, (_, index): PhraseItemContent => ({
    id: `phrase-${id}-${index + 1}`,
    text: index % 2 === 0 ? "my book" : "your book",
    tokens: index % 2 === 0 ? ["my", "book"] : ["your", "book"],
    contrastKey: index < 5 ? `stage-${id}-book` : `stage-${id}-group-${index}`,
    meaningSafe: index !== 0,
    accessibilityText: index % 2 === 0 ? "A child holding a book" : "A book for you",
    visual: { kind: "symbol", symbol: index % 2 === 0 ? "🧒 📘" : "👉 📘" },
  }));

  return {
    id,
    title: `Stage ${id}`,
    subtitle: "Two-Word Groups",
    areaName: `Area ${id}`,
    companion: { id: `friend-${id}`, name: `Friend ${id}`, emoji: "🦊" },
    restoration: `Restoration ${id}`,
    intro: "Reconnect the forest.",
    missionCount: 20,
    chapters: [
      { id: "discover", title: "Discover", missionStart: 1, missionEnd: 5 },
      { id: "practice", title: "Practice", missionStart: 6, missionEnd: 10 },
      { id: "apply", title: "Apply", missionStart: 11, missionEnd: 15 },
      { id: "prove", title: "Prove", missionStart: 16, missionEnd: 20 },
    ],
    practicePhrases: items.slice(0, 60),
    checkpointPhrases: items.slice(60),
  };
}

function createForest(): PhraseForestContent {
  return {
    title: "Phrase Forest",
    subtitle: "Connect words. Restore the forest.",
    stages: [createStage(6), createStage(7)],
  };
}

function missionIds(stageId: number, count: number): string[] {
  return Array.from({ length: count }, (_, index) => phraseMissionId(stageId, index));
}

describe("Phrase Forest progress", () => {
  test("creates locked defaults with one progress record per authored stage", () => {
    const forest = createForest();

    expect(defaultPhraseForestProgress()).toEqual({
      activeStageId: 6,
      unlockedStageIds: [],
      completedStageIds: [],
      stages: {},
    });
    expect(defaultPhraseForestProgress(forest)).toMatchObject({
      activeStageId: 6,
      unlockedStageIds: [],
      completedStageIds: [],
      stages: {
        6: defaultPhraseStageProgress(),
        7: defaultPhraseStageProgress(),
      },
    });
  });

  test("keeps the world locked before Word Academy completion and repairs invalid evidence", () => {
    const forest = createForest();
    const stage = forest.stages[0];
    const helped = stage.practicePhrases[0].id;
    const independent = stage.practicePhrases[1].id;
    const value = {
      activeStageId: 99,
      stages: {
        6: {
          currentRoundIndex: 99,
          completedMissionIds: [phraseMissionId(6, 0), phraseMissionId(6, 2)],
          helpedItemIds: [helped, helped, "unknown"],
          independentItemIds: [helped, independent, "unknown"],
          itemResults: {
            [helped]: { correct: 1000, errors: -1, phraseHelp: 2, wordHelp: "bad" },
            unknown: { correct: 3 },
          },
        },
      },
    };

    const locked = sanitizePhraseForestProgress(forest, value, false);
    const cleanStage = locked.stages["6"];

    expect(locked.unlockedStageIds).toEqual([]);
    expect(locked.activeStageId).toBe(6);
    expect(cleanStage.completedMissionIds).toEqual([phraseMissionId(6, 0)]);
    expect(cleanStage.currentRoundIndex).toBe(3);
    expect(cleanStage.helpedItemIds).toEqual([helped]);
    expect(cleanStage.independentItemIds).toEqual([independent]);
    expect(cleanStage.itemResults[helped]).toEqual({
      correct: 999,
      errors: 0,
      phraseHelp: 2,
      wordHelp: 0,
    });
    expect(sanitizePhraseForestProgress(undefined, value, true).stages).toEqual({});
  });

  test("derives sequential stage unlocks, checkpoint completion, and permanent rewards", () => {
    const forest = createForest();
    const clean = sanitizePhraseForestProgress(forest, {
      activeStageId: 7,
      stages: {
        6: {
          currentRoundIndex: 2,
          completedMissionIds: missionIds(6, 20),
          completedCheckpointIds: missionIds(6, 18).slice(15),
          checkpointSessionIds: {
            [phraseMissionId(6, 15)]: "session-1",
            [phraseMissionId(6, 16)]: "session-2",
            [phraseMissionId(6, 17)]: "session-3",
          },
        },
        7: { currentRoundIndex: 99, completedMissionIds: missionIds(7, 15) },
      },
    }, true);

    expect(clean.unlockedStageIds).toEqual([6, 7]);
    expect(clean.completedStageIds).toEqual([6]);
    expect(clean.activeStageId).toBe(7);
    expect(clean.stages["6"]).toMatchObject({
      currentRoundIndex: 0,
      completedCheckpointIds: missionIds(6, 18).slice(15),
      completed: true,
      restoredArea: true,
      companionUnlocked: true,
    });
    expect(clean.stages["7"].currentRoundIndex).toBe(2);
  });

  test("sanitizes checkpoint sessions, attempts, retries, and legacy mastery", () => {
    const forest = createForest();
    const stage = forest.stages[0];
    const mission16 = phraseMissionId(6, 15);
    const mission17 = phraseMissionId(6, 16);
    const mission18 = phraseMissionId(6, 17);
    const clean = sanitizePhraseStageProgress(stage, {
      completedMissionIds: missionIds(6, 18),
      completedCheckpointIds: [mission16, mission17, mission18, "made-up"],
      checkpointSessionIds: {
        [mission16]: "same-session",
        [mission17]: "same-session",
        [mission18]: "",
        "made-up": "other-session",
      },
      checkpointAttemptSessionIds: [" current-session ", 42, "", "current-session"],
      checkpointAttempt: {
        missionId: mission17,
        sessionId: " current-session ",
        itemIds: [stage.checkpointPhrases[3].id, "made-up"],
        hadError: true,
        usedHelp: true,
      },
    });

    expect(clean.completedCheckpointIds).toEqual([mission16]);
    expect(clean.checkpointSessionIds).toEqual({ [mission16]: "same-session" });
    expect(clean.checkpointAttemptSessionIds).toEqual(["current-session"]);
    expect(clean.checkpointAttempt).toEqual({
      missionId: mission17,
      sessionId: "current-session",
      itemIds: [stage.checkpointPhrases[3].id],
      hadError: true,
      usedHelp: true,
    });
    expect(sanitizePhraseStageProgress(stage, {
      checkpointAttempt: { missionId: 42, sessionId: 7 },
    }).checkpointAttempt).toBeNull();

    const legacy = sanitizePhraseStageProgress(stage, {
      completedMissionIds: missionIds(6, 20),
      completedCheckpointIds: missionIds(6, 20).slice(15),
      completed: true,
    });
    expect(legacy.completed).toBe(true);
    expect(legacy.completedCheckpointIds).toEqual(missionIds(6, 18).slice(15));
    expect(new Set(Object.values(legacy.checkpointSessionIds)).size).toBe(3);

    const allAttempted = defaultPhraseStageProgress();
    allAttempted.completedMissionIds = missionIds(6, 20);
    allAttempted.completedCheckpointIds = missionIds(6, 20).slice(15);
    expect(currentPhraseMissionIndex(allAttempted, 6)).toBe(19);
    expect(phraseCheckpointStatus(6, {
      ...allAttempted,
      completedCheckpointIds: ["wrong-stage-id"],
      checkpointSessionIds: { "wrong-stage-id": "session" },
    })).toMatchObject({ hasConstruction: false, hasMeaning: false, ready: false });
  });
});

describe("Phrase Forest missions", () => {
  test("maps all four chapters to 15 practice and 5 fresh checkpoint missions", () => {
    const stage = createStage(6);
    const first = phraseMissionForStage(stage, -10);
    const practice = phraseMissionForStage(stage, 5);
    const checkpoint = phraseMissionForStage(stage, 15);
    const capstone = phraseMissionForStage(stage, 99);

    expect(first).toMatchObject({
      id: phraseMissionId(6, 0),
      number: 1,
      chapterId: "discover",
      requestedActivity: "match",
      checkpoint: false,
      capstone: false,
    });
    expect(first.items).toEqual(stage.practicePhrases.slice(0, 4));
    expect(practice).toMatchObject({ number: 6, chapterId: "practice" });
    expect(practice.items).toEqual(stage.practicePhrases.slice(20, 24));
    expect(checkpoint).toMatchObject({
      number: 16,
      chapterId: "prove",
      requestedActivity: "build",
      checkpoint: true,
    });
    expect(checkpoint.items).toEqual(stage.checkpointPhrases.slice(0, 3));
    expect(capstone).toMatchObject({ number: 20, checkpoint: true, capstone: true });
    expect(capstone.items).toEqual(stage.checkpointPhrases.slice(12, 15));
    const fallbackChapter = phraseMissionForStage({
      ...stage,
      chapters: [{ id: "practice", title: "Fallback", missionStart: 99, missionEnd: 100 }],
    }, 0);
    expect(fallbackChapter.chapterTitle).toBe("Fallback");
    expect(phraseChapterProgress(0)).toBe(1);
    expect(phraseChapterProgress(9)).toBe(5);
  });

  test("uses meaning-safe fallbacks, controlled choices, and deterministic word tiles", () => {
    const stage = createStage(6);
    const mission = phraseMissionForStage(stage, 0);
    const unsafeItem = stage.practicePhrases[0];
    const safeItem = stage.practicePhrases[1];

    expect(activityForPhraseItem(mission, unsafeItem)).toBe("build");
    expect(activityForPhraseItem(mission, safeItem)).toBe("match");
    expect(activityForPhraseItem({ ...mission, requestedActivity: "build" }, safeItem)).toBe("build");

    const choices = meaningChoicesForItem(stage, safeItem);
    expect(choices).toHaveLength(3);
    expect(choices).toContain(safeItem);
    expect(choices.every((item) => item.contrastKey === safeItem.contrastKey)).toBe(true);

    const shuffled = shuffledPhraseTokens(safeItem);
    expect(shuffled.map((token) => token.text)).not.toEqual(safeItem.tokens);
    expect(new Set(shuffled.map((token) => token.text))).toEqual(new Set(safeItem.tokens));
    expect(shuffledPhraseTokens({ ...safeItem, id: "single", text: "book", tokens: ["book"] }))
      .toEqual([{ id: "single-token-0", text: "book" }]);
  });

  test("records help without punishment and enforces independent checkpoint mastery", () => {
    const stage = createStage(6);
    const itemId = stage.practicePhrases[0].id;
    let evidence = defaultPhraseStageProgress();

    evidence = recordPhraseEvidence(evidence, itemId, "error");
    evidence = recordPhraseEvidence(evidence, itemId, "correct");
    evidence.independentItemIds = [itemId];
    evidence = recordPhraseEvidence(evidence, itemId, "phraseHelp");
    evidence = recordPhraseEvidence(evidence, itemId, "wordHelp");
    expect(evidence.itemResults[itemId]).toEqual({
      correct: 1,
      errors: 1,
      phraseHelp: 1,
      wordHelp: 1,
    });
    expect(evidence.helpedItemIds).toEqual([itemId]);
    expect(evidence.independentItemIds).toEqual([]);

    const checkpointMission = phraseMissionForStage(stage, 15);
    const checkpointItem = checkpointMission.items[0].id;
    let checkpointEvidence = recordPhraseEvidence(
      defaultPhraseStageProgress(),
      checkpointItem,
      "error",
      { mission: checkpointMission, sessionId: "attempt-session" },
    );
    checkpointEvidence = recordPhraseEvidence(
      checkpointEvidence,
      checkpointItem,
      "phraseHelp",
      { mission: checkpointMission, sessionId: "attempt-session" },
    );
    checkpointEvidence = recordPhraseEvidence(
      checkpointEvidence,
      checkpointItem,
      "wordHelp",
      { mission: checkpointMission, sessionId: "attempt-session" },
    );
    checkpointEvidence = recordPhraseEvidence(
      checkpointEvidence,
      checkpointItem,
      "correct",
      { mission: checkpointMission, sessionId: "attempt-session" },
    );
    checkpointEvidence = recordPhraseEvidence(
      checkpointEvidence,
      checkpointItem,
      "correct",
      { mission: checkpointMission, sessionId: "attempt-session" },
    );
    expect(checkpointEvidence.checkpointAttempt).toEqual({
      missionId: checkpointMission.id,
      sessionId: "attempt-session",
      itemIds: [checkpointItem],
      hadError: true,
      usedHelp: true,
    });

    evidence.independentItemIds = [itemId];
    const correctedWithSupport = advancePhraseRound(stage, evidence, itemId);
    expect(correctedWithSupport.stageState.independentItemIds).toEqual([]);

    const independent = advancePhraseRound(
      stage,
      defaultPhraseStageProgress(),
      stage.practicePhrases[0].id,
    );
    expect(independent).toMatchObject({ missionCompleted: false, stageCompleted: false });
    expect(independent.stageState.currentRoundIndex).toBe(1);
    expect(independent.stageState.independentItemIds).toEqual([stage.practicePhrases[0].id]);

    const alreadyIndependent = defaultPhraseStageProgress();
    alreadyIndependent.independentItemIds = [stage.practicePhrases[0].id];
    expect(advancePhraseRound(
      stage,
      alreadyIndependent,
      stage.practicePhrases[0].id,
    ).stageState.independentItemIds).toEqual([stage.practicePhrases[0].id]);

    const endPractice = defaultPhraseStageProgress();
    endPractice.currentRoundIndex = 3;
    const practiceResult = advancePhraseRound(stage, endPractice, stage.practicePhrases[3].id);
    expect(practiceResult).toMatchObject({ missionCompleted: true, stageCompleted: false });
    expect(practiceResult.stageState.completedMissionIds).toEqual([phraseMissionId(6, 0)]);

    const endCheckpoint = defaultPhraseStageProgress();
    endCheckpoint.completedMissionIds = missionIds(6, 15);
    endCheckpoint.currentRoundIndex = 2;
    endCheckpoint.checkpointAttempt = {
      missionId: phraseMissionId(6, 15),
      sessionId: "session-1",
      itemIds: stage.checkpointPhrases.slice(0, 2).map((item) => item.id),
      hadError: false,
      usedHelp: false,
    };
    const checkpointResult = advancePhraseRound(
      stage,
      endCheckpoint,
      stage.checkpointPhrases[2].id,
      "session-1",
    );
    expect(checkpointResult.stageState.completedCheckpointIds).toEqual([phraseMissionId(6, 15)]);
    expect(checkpointResult.checkpointQualified).toBe(true);
    expect(currentPhraseMissionIndex(checkpointResult.stageState, 6)).toBe(16);

    const endStage = defaultPhraseStageProgress();
    endStage.completedMissionIds = missionIds(6, 19);
    endStage.completedCheckpointIds = [phraseMissionId(6, 15), phraseMissionId(6, 16)];
    endStage.checkpointSessionIds = {
      [phraseMissionId(6, 15)]: "session-1",
      [phraseMissionId(6, 16)]: "session-2",
    };
    endStage.currentRoundIndex = 2;
    endStage.checkpointAttempt = {
      missionId: phraseMissionId(6, 19),
      sessionId: "session-3",
      itemIds: stage.checkpointPhrases.slice(12, 14).map((item) => item.id),
      hadError: false,
      usedHelp: false,
    };
    const capstoneResult = advancePhraseRound(
      stage,
      endStage,
      stage.checkpointPhrases[14].id,
      "session-3",
    );
    expect(capstoneResult).toMatchObject({ missionCompleted: true, stageCompleted: true });
    expect(capstoneResult.stageState).toMatchObject({
      completed: true,
      mastered: true,
      restoredArea: true,
      companionUnlocked: true,
      currentRoundIndex: 0,
    });
    expect(currentPhraseMissionIndex(capstoneResult.stageState)).toBe(19);
    expect(phraseCheckpointStatus(6, capstoneResult.stageState)).toMatchObject({
      qualified: 3,
      separateSessions: 3,
      hasConstruction: true,
      hasMeaning: true,
      ready: true,
    });

    const supported = defaultPhraseStageProgress();
    supported.completedMissionIds = missionIds(6, 15);
    supported.currentRoundIndex = 2;
    supported.checkpointAttempt = {
      missionId: phraseMissionId(6, 15),
      sessionId: "supported-session",
      itemIds: stage.checkpointPhrases.slice(0, 2).map((item) => item.id),
      hadError: true,
      usedHelp: true,
    };
    const supportedResult = advancePhraseRound(
      stage,
      supported,
      stage.checkpointPhrases[2].id,
      "supported-session",
    );
    expect(supportedResult.checkpointQualified).toBe(false);
    expect(supportedResult.stageState.completedCheckpointIds).toEqual([]);
    expect(supportedResult.stageState.completed).toBe(false);

  });

  test("completes the adventure before durable mastery and schedules one daily review", () => {
    const stage = createStage(6);
    const state = defaultPhraseStageProgress();
    state.completedMissionIds = missionIds(6, 19);
    state.currentRoundIndex = 2;
    state.checkpointAttemptSessionIds = ["day-1"];
    state.completedCheckpointIds = [phraseMissionId(6, 15)];
    state.checkpointSessionIds = { [phraseMissionId(6, 15)]: "day-1" };
    state.checkpointAttempt = {
      missionId: phraseMissionId(6, 19),
      sessionId: "day-1",
      itemIds: stage.checkpointPhrases.slice(12, 14).map((item) => item.id),
      hadError: false,
      usedHelp: false,
    };

    const capstone = advancePhraseRound(
      stage,
      state,
      stage.checkpointPhrases[14].id,
      "day-1",
    );
    expect(capstone.stageState).toMatchObject({ completed: true, mastered: false });
    expect(phraseReviewMissionForStage(stage, capstone.stageState, "day-1")).toBeNull();

    const review = phraseReviewMissionForStage(stage, capstone.stageState, "day-2");
    expect(review?.number).toBe(17);
    expect(phraseReviewRoundIndex(capstone.stageState, review!, "day-2")).toBe(0);

    let reviewState = capstone.stageState;
    review!.items.forEach((reviewItem, index) => {
      const result = advancePhraseReviewRound(stage, reviewState, review!, reviewItem.id, "day-2");
      reviewState = result.stageState;
      expect(result.missionCompleted).toBe(index === review!.items.length - 1);
    });
    expect(reviewState.completedCheckpointIds).toContain(review!.id);
    expect(reviewState.completed).toBe(true);
    expect(reviewState.mastered).toBe(false);
    expect(phraseReviewMissionForStage(stage, reviewState, "day-2")).toBeNull();
  });

  test("selects review activities and rejects unusable checkpoint attempts", () => {
    const stage = createStage(6);
    const completed = defaultPhraseStageProgress();
    completed.completedMissionIds = missionIds(6, 20);
    completed.completed = true;

    expect(phraseReviewMissionForStage(stage, completed, "new-day")?.number).toBe(16);

    const mixedEvidence = {
      ...completed,
      completedCheckpointIds: [phraseMissionId(6, 15), phraseMissionId(6, 16)],
      checkpointSessionIds: {
        [phraseMissionId(6, 15)]: "same-day",
        [phraseMissionId(6, 16)]: "same-day",
      },
    };
    expect(phraseReviewMissionForStage(stage, mixedEvidence, "new-day")?.number).toBe(18);

    const exhausted = {
      ...completed,
      completedCheckpointIds: missionIds(6, 20).slice(15),
      checkpointSessionIds: Object.fromEntries(
        missionIds(6, 20).slice(15).map((missionId) => [missionId, "same-day"]),
      ),
    };
    expect(phraseReviewMissionForStage(stage, exhausted, "new-day")).toBeNull();

    const invalidAttempt = {
      ...completed,
      checkpointAttempt: {
        missionId: "not-a-stage-mission",
        sessionId: "new-day",
        itemIds: [],
        hadError: false,
        usedHelp: false,
      },
    };
    expect(phraseReviewMissionForStage(stage, invalidAttempt, "new-day")).toBeNull();
    invalidAttempt.checkpointAttempt.missionId = phraseMissionId(6, 98);
    expect(phraseReviewMissionForStage(stage, invalidAttempt, "new-day")).toBeNull();

    const replay = {
      ...completed,
      currentRoundIndex: 2,
      checkpointAttempt: {
        missionId: phraseMissionId(6, 19),
        sessionId: "replay-day",
        itemIds: stage.checkpointPhrases.slice(12, 14).map((item) => item.id),
        hadError: false,
        usedHelp: false,
      },
    };
    const replayResult = advancePhraseRound(
      stage,
      replay,
      stage.checkpointPhrases[14].id,
      "replay-day",
    );
    expect(replayResult.stageState.completedMissionIds).toHaveLength(20);
  });

  test("sanitizes a phrase stage independently", () => {
    const stage = createStage(6);

    expect(sanitizePhraseStageProgress(stage, "invalid")).toEqual(defaultPhraseStageProgress());
  });
});
