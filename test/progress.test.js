"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { PUBLIC_CONTENT, REWARD_ID_ALIASES, stageById } = require("../server/content");
const { createPhraseForest } = require("../server/phrase-content");
const {
  createDefaultProgress,
  mergeProgress,
  progressForLegacyState,
  sanitizeProgress,
} = require("../server/progress");

test("staged content has the expected word counts", () => {
  assert.equal(PUBLIC_CONTENT.version, 7);
  assert.equal(PUBLIC_CONTENT.stages[0].words.length, 100);
  assert.equal(PUBLIC_CONTENT.stages[1].words.length, 150);
  assert.equal(PUBLIC_CONTENT.stages[2].words.length, 200);
  assert.equal(PUBLIC_CONTENT.stages[3].words.length, 250);
  assert.equal(PUBLIC_CONTENT.stages[4].words.length, 300);
  assert.equal(PUBLIC_CONTENT.stages[1].subtitle, "Roman Warrior");
  assert.equal(PUBLIC_CONTENT.stages[2].subtitle, "Medieval Knight");
  assert.equal(PUBLIC_CONTENT.stages[3].subtitle, "Modern Soldier");
  assert.equal(PUBLIC_CONTENT.stages[4].subtitle, "Jet Pilot");
  assert.equal(
    PUBLIC_CONTENT.stages[4].fieldTrip.creatures.every((name) => /Flying Dragon$/.test(name)),
    true,
  );
});

test("each stage has no duplicate words", () => {
  PUBLIC_CONTENT.stages.forEach((stage) => {
    const normalizedWords = stage.words.map(normalizeWord);
    const duplicates = duplicatedValues(normalizedWords);

    assert.deepEqual(duplicates, [], `${stage.title} has duplicate words`);
  });
});

test("words do not repeat across stages", () => {
  const seen = new Map();
  const duplicates = [];

  PUBLIC_CONTENT.stages.forEach((stage) => {
    stage.words.forEach((word) => {
      const normalized = normalizeWord(word);
      const previous = seen.get(normalized);

      if (previous) {
        duplicates.push(`${word}: ${previous} and ${stage.title}`);
        return;
      }

      seen.set(normalized, stage.title);
    });
  });

  assert.deepEqual(duplicates, []);
  assert.equal(seen.size, 1000);
});

test("each stage has its own reward catalog and visual keys", () => {
  const expectedRewardCounts = [10, 15, 20, 25, 30];
  const rewardNames = [];
  const visualKeys = [];

  PUBLIC_CONTENT.stages.forEach((stage, index) => {
    assert.equal(stage.rewards.length, expectedRewardCounts[index]);

    stage.rewards.forEach((reward) => {
      assert.equal(reward.stageId, stage.id);
      assert.equal(reward.visualKey, `stage${stage.id}-${reward.slot}`);
      rewardNames.push(reward.name);
      visualKeys.push(reward.visualKey);
    });
  });

  assert.equal(new Set(rewardNames).size, rewardNames.length);
  assert.equal(new Set(visualKeys).size, visualKeys.length);
  assert.equal(PUBLIC_CONTENT.stages[0].rewards[4].name, "Bone Vest");
  assert.equal(PUBLIC_CONTENT.stages[1].rewards[0].name, "Parade Gladius");
  assert.equal(PUBLIC_CONTENT.stages[2].rewards[1].name, "Iron Greaves");
  assert.equal(PUBLIC_CONTENT.stages[3].rewards[0].name, "Foam Training Gun");
  assert.equal(PUBLIC_CONTENT.stages[3].rewards[2].id, "stage4-radio");
  assert.equal(PUBLIC_CONTENT.stages[3].rewards[2].name, "Field Radio");
  assert.equal(PUBLIC_CONTENT.stages[3].rewards[2].slot, "radio");
  assert.equal(PUBLIC_CONTENT.stages[3].rewards[9].name, "Patrol Cap");
  assert.equal(PUBLIC_CONTENT.stages[4].rewards[0].name, "Control Stick");
  assert.equal(PUBLIC_CONTENT.stages[4].rewards[25].name, "Turbofan Engine");
  assert.equal(PUBLIC_CONTENT.stages[4].rewards[29].name, "Mini Jet Model");
  assert.equal(PUBLIC_CONTENT.stages[4].rewards[29].id, "stage5-jetmodel");
  assert.equal(REWARD_ID_ALIASES["stage4-shield"], "stage4-radio");
  assert.equal(
    PUBLIC_CONTENT.stages[3].rewards.some((reward) => /shield/i.test(reward.name)),
    false,
  );
});

test("content helpers fall back to stage 1 for unknown stage ids", () => {
  assert.equal(stageById(999).id, 1);
});

test("default progress starts at stage 1 only", () => {
  const progress = createDefaultProgress();

  assert.equal(progress.activeStageId, 1);
  assert.deepEqual(progress.unlockedStageIds, [1]);
  assert.equal(progress.stages["1"].knownWords.length, 0);
  assert.equal(progress.stages["2"].deckOrder.length, 150);
  assert.equal(progress.stages["3"].deckOrder.length, 200);
  assert.equal(progress.stages["4"].deckOrder.length, 250);
  assert.equal(progress.stages["5"].deckOrder.length, 300);
  assert.equal(progress.phraseForest.activeStageId, 6);
  assert.deepEqual(progress.phraseForest.unlockedStageIds, []);
  assert.deepEqual(progress.phraseForest.completedStageIds, []);
  assert.equal(Object.keys(progress.phraseForest.stages).length, 5);
});

test("Phrase Forest defines five detailed stages using only the 1,000 known words", () => {
  const forest = PUBLIC_CONTENT.phraseForest;
  const allowedWords = new Set(PUBLIC_CONTENT.stages.flatMap((stage) => stage.words));
  const phraseIds = [];

  assert.equal(forest.title, "Phrase Forest");
  assert.deepEqual(forest.stages.map((stage) => stage.id), [6, 7, 8, 9, 10]);
  assert.deepEqual(
    forest.stages.map((stage) => stage.companion.name),
    ["Fox", "Butterfly", "Rabbit", "Beaver", "Owl"],
  );

  forest.stages.forEach((stage) => {
    assert.equal(stage.missionCount, 20);
    assert.deepEqual(stage.chapters.map((chapter) => chapter.title), [
      "Discover",
      "Practice",
      "Apply",
      "Prove",
    ]);
    assert.equal(stage.practicePhrases.length, 60);
    assert.equal(stage.checkpointPhrases.length, 15);

    [...stage.practicePhrases, ...stage.checkpointPhrases].forEach((item) => {
      assert.equal(item.text, item.tokens.join(" "));
      assert.equal(item.tokens.every((word) => allowedWords.has(word)), true);
      assert.equal(typeof item.accessibilityText, "string");
      assert.equal(item.accessibilityText.length > item.text.length, true);
      phraseIds.push(item.id);
    });
  });

  assert.equal(new Set(phraseIds).size, 375);

  const phraseItem = (stageId, text) => {
    const stage = forest.stages.find((candidate) => candidate.id === stageId);
    return [...stage.practicePhrases, ...stage.checkpointPhrases]
      .find((item) => item.text === text);
  };
  assert.match(phraseItem(6, "their table").visual.symbol, /\[table\]/);
  assert.match(phraseItem(9, "clean the table").visual.symbol, /\[table\]/);
  assert.equal(phraseItem(10, "on the table").visual.anchor, "[table]");
  assert.equal(phraseItem(10, "on the bed").visual.anchor, "🛏️");
});

test("Phrase Forest content generation rejects words outside its approved foundation", () => {
  assert.throws(
    () => createPhraseForest([]),
    /outside the 1,000-word foundation/,
  );
});

test("Phrase Forest stays locked until all Word Academy words are known", () => {
  const progress = createDefaultProgress();

  PUBLIC_CONTENT.stages.slice(0, -1).forEach((stage) => {
    progress.stages[String(stage.id)].knownWords = [...stage.words];
  });
  progress.phraseForest = {
    activeStageId: 10,
    unlockedStageIds: [6, 7, 8, 9, 10],
    completedStageIds: [6],
    stages: "invalid",
  };

  const clean = sanitizeProgress(progress);

  assert.deepEqual(clean.phraseForest.unlockedStageIds, []);
  assert.deepEqual(clean.phraseForest.completedStageIds, []);
  assert.equal(clean.phraseForest.activeStageId, 6);
  assert.equal(clean.phraseForest.stages["6"].completed, false);
});

test("Phrase Forest sanitizes mission order, support evidence, and checkpoint rounds", () => {
  const progress = completedWordAcademyProgress();
  const stage = PUBLIC_CONTENT.phraseForest.stages[0];
  const helpedItem = stage.practicePhrases[0].id;
  const independentItem = stage.practicePhrases[1].id;

  progress.phraseForest = {
    activeStageId: 99,
    stages: {
      6: {
        currentRoundIndex: 99,
        completedMissionIds: [
          "phrase-stage-6-mission-1",
          "phrase-stage-6-mission-3",
          42,
        ],
        completedCheckpointIds: ["made-up"],
        helpedItemIds: [helpedItem, helpedItem, "made-up", 42],
        independentItemIds: [helpedItem, independentItem, "made-up"],
        itemResults: {
          [helpedItem]: {
            correct: 1000,
            errors: -2,
            phraseHelp: 3,
            wordHelp: "not-a-number",
          },
          [independentItem]: null,
          "made-up": { correct: 5 },
        },
      },
      7: "invalid",
      8: { itemResults: "invalid" },
      9: {
        itemResults: {
          [PUBLIC_CONTENT.phraseForest.stages[3].practicePhrases[0].id]: "invalid",
        },
      },
    },
  };

  const clean = sanitizeProgress(progress);
  const cleanStage = clean.phraseForest.stages["6"];

  assert.deepEqual(clean.phraseForest.unlockedStageIds, [6]);
  assert.equal(clean.phraseForest.activeStageId, 6);
  assert.deepEqual(cleanStage.completedMissionIds, ["phrase-stage-6-mission-1"]);
  assert.equal(cleanStage.currentRoundIndex, 3);
  assert.deepEqual(cleanStage.completedCheckpointIds, []);
  assert.deepEqual(cleanStage.helpedItemIds, [helpedItem]);
  assert.deepEqual(cleanStage.independentItemIds, [independentItem]);
  assert.deepEqual(cleanStage.itemResults[helpedItem], {
    correct: 999,
    errors: 0,
    phraseHelp: 3,
    wordHelp: 0,
  });
  assert.equal(cleanStage.itemResults[independentItem], undefined);
  assert.equal(cleanStage.completed, false);
  assert.equal(cleanStage.restoredArea, false);
  assert.equal(cleanStage.companionUnlocked, false);
});

test("finishing all 20 missions restores an area and unlocks the next phrase stage", () => {
  const progress = completedWordAcademyProgress();
  progress.phraseForest = {
    activeStageId: 7,
    stages: {
      6: {
        currentRoundIndex: 2,
        completedMissionIds: phraseMissionIds(6, 20),
        completedCheckpointIds: phraseMissionIds(6, 18).slice(15),
        checkpointSessionIds: {
          "phrase-stage-6-mission-16": "session-1",
          "phrase-stage-6-mission-17": "session-2",
          "phrase-stage-6-mission-18": "session-3",
        },
      },
      7: {
        currentRoundIndex: 99,
        completedMissionIds: phraseMissionIds(7, 15),
      },
    },
  };

  const clean = sanitizeProgress(progress);

  assert.deepEqual(clean.phraseForest.unlockedStageIds, [6, 7]);
  assert.deepEqual(clean.phraseForest.completedStageIds, [6]);
  assert.equal(clean.phraseForest.activeStageId, 7);
  assert.deepEqual(
    clean.phraseForest.stages["6"].completedCheckpointIds,
    phraseMissionIds(6, 18).slice(15),
  );
  assert.deepEqual(clean.phraseForest.stages["6"].checkpointSessionIds, {
    "phrase-stage-6-mission-16": "session-1",
    "phrase-stage-6-mission-17": "session-2",
    "phrase-stage-6-mission-18": "session-3",
  });
  assert.equal(clean.phraseForest.stages["6"].currentRoundIndex, 0);
  assert.equal(clean.phraseForest.stages["6"].completed, true);
  assert.equal(clean.phraseForest.stages["6"].mastered, true);
  assert.equal(clean.phraseForest.stages["6"].restoredArea, true);
  assert.equal(clean.phraseForest.stages["6"].companionUnlocked, true);
  assert.equal(clean.phraseForest.stages["7"].currentRoundIndex, 2);
});

test("Phrase Forest sanitizes session evidence and preserves legacy completed stages", () => {
  const progress = completedWordAcademyProgress();
  const stage = PUBLIC_CONTENT.phraseForest.stages[0];
  const mission16 = "phrase-stage-6-mission-16";
  const mission17 = "phrase-stage-6-mission-17";
  progress.phraseForest = {
    activeStageId: 6,
    stages: {
      6: {
        completedMissionIds: phraseMissionIds(6, 18),
        completedCheckpointIds: [mission16, mission17, "phrase-stage-6-mission-18"],
        checkpointSessionIds: {
          [mission16]: "same-session",
          [mission17]: "same-session",
          "phrase-stage-6-mission-18": "",
          madeUp: "other-session",
        },
        checkpointAttemptSessionIds: [" current-session ", 42, "", "current-session"],
        checkpointAttempt: {
          missionId: mission17,
          sessionId: " current-session ",
          itemIds: [stage.checkpointPhrases[3].id, "made-up"],
          hadError: true,
          usedHelp: true,
        },
      },
      7: {
        checkpointAttempt: { missionId: "phrase-stage-7-mission-16", sessionId: 7 },
      },
      8: {
        checkpointAttempt: { missionId: 42, sessionId: "session-8" },
      },
    },
  };

  const clean = sanitizeProgress(progress);
  assert.deepEqual(clean.phraseForest.stages["6"].completedCheckpointIds, [mission16]);
  assert.deepEqual(clean.phraseForest.stages["6"].checkpointSessionIds, {
    [mission16]: "same-session",
  });
  assert.deepEqual(clean.phraseForest.stages["6"].checkpointAttemptSessionIds, [
    "current-session",
  ]);
  assert.deepEqual(clean.phraseForest.stages["6"].checkpointAttempt, {
    missionId: mission17,
    sessionId: "current-session",
    itemIds: [stage.checkpointPhrases[3].id],
    hadError: true,
    usedHelp: true,
  });
  assert.equal(clean.phraseForest.stages["7"].checkpointAttempt, null);
  assert.equal(clean.phraseForest.stages["8"].checkpointAttempt, null);

  const legacy = completedWordAcademyProgress();
  legacy.phraseForest = {
    activeStageId: 6,
    stages: {
      6: {
        completedMissionIds: phraseMissionIds(6, 20),
        completedCheckpointIds: phraseMissionIds(6, 20).slice(15),
        completed: true,
      },
    },
  };
  const migrated = sanitizeProgress(legacy).phraseForest.stages["6"];
  assert.equal(migrated.completed, true);
  assert.deepEqual(migrated.completedCheckpointIds, phraseMissionIds(6, 18).slice(15));
  assert.equal(new Set(Object.values(migrated.checkpointSessionIds)).size, 3);

  const meaningOnly = completedWordAcademyProgress();
  meaningOnly.phraseForest = {
    activeStageId: 6,
    stages: {
      6: {
        completedMissionIds: phraseMissionIds(6, 20),
        completedCheckpointIds: [
          "phrase-stage-6-mission-17",
          "phrase-stage-6-mission-19",
          "phrase-stage-6-mission-20",
        ],
        checkpointSessionIds: {
          "phrase-stage-6-mission-17": "meaning-1",
          "phrase-stage-6-mission-19": "meaning-2",
          "phrase-stage-6-mission-20": "meaning-3",
        },
      },
    },
  };
  const meaningOnlyStage = sanitizeProgress(meaningOnly).phraseForest.stages["6"];
  assert.equal(meaningOnlyStage.completed, true);
  assert.equal(meaningOnlyStage.mastered, false);
});

test("version 5 progress gains a fresh stage 5 without losing earlier progress", () => {
  const stageFourWords = PUBLIC_CONTENT.stages[3].words.slice(0, 12);
  const clean = sanitizeProgress({
    version: 5,
    activeStageId: 4,
    stages: {
      4: {
        knownWords: stageFourWords,
        practiceWords: [PUBLIC_CONTENT.stages[3].words[12]],
      },
    },
  });

  assert.deepEqual(clean.stages["4"].knownWords, stageFourWords);
  assert.deepEqual(clean.stages["4"].practiceWords, [PUBLIC_CONTENT.stages[3].words[12]]);
  assert.deepEqual(clean.stages["5"].knownWords, []);
  assert.equal(clean.stages["5"].deckOrder.length, 300);
});

test("sanitizer falls back cleanly for invalid saved shapes", () => {
  const defaultFromNull = sanitizeProgress(null);
  const defaultFromInvalidStages = sanitizeProgress({ stages: "not-an-object" });
  const clean = sanitizeProgress({
    activeStageId: 99,
    completedFieldTrips: "not-an-array",
    stages: {
      1: {
        knownWords: "not-an-array",
        practiceWords: "not-an-array",
        deckOrder: "not-an-array",
        unlockedItems: "not-an-array",
        equippedItems: "not-an-array",
        completedMazeMilestones: "not-an-array",
        pendingReward: "not-an-object",
      },
    },
  });

  assert.equal(defaultFromNull.activeStageId, 1);
  assert.equal(defaultFromInvalidStages.activeStageId, 1);
  assert.equal(defaultFromInvalidStages.stages["1"].deckOrder.length, 100);
  assert.equal(clean.activeStageId, 1);
  assert.deepEqual(clean.completedFieldTrips, []);
  assert.deepEqual(clean.stages["1"].knownWords, []);
  assert.deepEqual(clean.stages["1"].practiceWords, []);
  assert.equal(clean.stages["1"].deckOrder.length, 100);
  assert.deepEqual(clean.stages["1"].unlockedItems, []);
  assert.deepEqual(clean.stages["1"].equippedItems, []);
  assert.deepEqual(clean.stages["1"].completedMazeMilestones, []);
  assert.equal(clean.stages["1"].pendingReward, null);
});

test("sanitizer repairs partial deck order and unlocks completed milestone rewards", () => {
  const stageTwo = PUBLIC_CONTENT.stages[1];
  const clean = sanitizeProgress({
    activeStageId: 1,
    stages: {
      2: {
        knownWords: stageTwo.words.slice(0, 20),
        deckOrder: [2, 2, 0, 500],
        completedMazeMilestones: [20, 10],
      },
    },
  });

  assert.deepEqual(clean.stages["2"].deckOrder.slice(0, 3), [2, 0, 1]);
  assert.equal(clean.stages["2"].deckOrder.length, stageTwo.words.length);
  assert.deepEqual(clean.stages["2"].completedMazeMilestones, [10, 20]);
  assert.deepEqual(clean.stages["2"].unlockedItems, [
    "stage2-weapon",
    "stage2-boots",
  ]);
});

test("pending rewards can be restored by milestone or discarded when invalid", () => {
  const stageOne = PUBLIC_CONTENT.stages[0];
  const validByMilestone = sanitizeProgress({
    stages: {
      1: {
        knownWords: stageOne.words.slice(0, 10),
        pendingReward: { milestone: 10 },
      },
    },
  });
  const tooEarly = sanitizeProgress({
    stages: {
      1: {
        knownWords: stageOne.words.slice(0, 9),
        pendingReward: { milestone: 10 },
      },
    },
  });
  const alreadyCompleted = sanitizeProgress({
    stages: {
      1: {
        knownWords: stageOne.words.slice(0, 10),
        completedMazeMilestones: [10],
        pendingReward: { itemId: "stage1-weapon" },
      },
    },
  });

  assert.deepEqual(validByMilestone.stages["1"].pendingReward, {
    milestone: 10,
    itemId: "stage1-weapon",
  });
  assert.equal(tooEarly.stages["1"].pendingReward, null);
  assert.equal(alreadyCompleted.stages["1"].pendingReward, null);
});

test("all completed stages stop field-trip unlock scanning at the final stage", () => {
  const progress = createDefaultProgress();

  PUBLIC_CONTENT.stages.forEach((stage) => {
    progress.stages[String(stage.id)].knownWords = [...stage.words];
    progress.stages[String(stage.id)].fieldTripCompleted = true;
  });
  progress.completedFieldTrips = [1, 2, 3, 4, 5];
  progress.activeStageId = 5;

  const clean = sanitizeProgress(progress);

  assert.deepEqual(clean.completedFieldTrips, [1, 2, 3, 4]);
  assert.deepEqual(clean.unlockedStageIds, [1, 2, 3, 4, 5]);
  assert.equal(clean.activeStageId, 5);
});

test("completed field trip unlocks the next stage", () => {
  const progress = createDefaultProgress();

  progress.stages["1"].knownWords = [...PUBLIC_CONTENT.stages[0].words];
  progress.completedFieldTrips = [1];
  progress.stages["1"].fieldTripCompleted = true;

  const clean = sanitizeProgress(progress);

  assert.deepEqual(clean.unlockedStageIds, [1, 2]);
  assert.equal(clean.activeStageId, 1);
});

test("completed field trip does not unlock next stage until all previous words are known", () => {
  const progress = createDefaultProgress();

  progress.stages["1"].knownWords = ["the", "of"];
  progress.completedFieldTrips = [1];
  progress.stages["1"].fieldTripCompleted = true;
  progress.activeStageId = 2;

  const clean = sanitizeProgress(progress);

  assert.deepEqual(clean.unlockedStageIds, [1]);
  assert.equal(clean.activeStageId, 1);
  assert.equal(clean.stages["1"].fieldTripCompleted, false);
  assert.deepEqual(clean.completedFieldTrips, []);
});

test("completed words do not unlock the next stage without a field trip", () => {
  const progress = createDefaultProgress();

  progress.stages["1"].knownWords = [...PUBLIC_CONTENT.stages[0].words];
  progress.activeStageId = 2;

  const clean = sanitizeProgress(progress);

  assert.deepEqual(clean.unlockedStageIds, [1]);
  assert.equal(clean.activeStageId, 1);
  assert.equal(clean.stages["1"].fieldTripCompleted, false);
});

test("later stages cannot unlock when earlier stages are incomplete", () => {
  const progress = createDefaultProgress();

  progress.stages["2"].knownWords = [...PUBLIC_CONTENT.stages[1].words];
  progress.completedFieldTrips = [2];
  progress.stages["2"].fieldTripCompleted = true;
  progress.activeStageId = 3;

  const clean = sanitizeProgress(progress);

  assert.deepEqual(clean.unlockedStageIds, [1]);
  assert.deepEqual(clean.completedFieldTrips, []);
  assert.equal(clean.activeStageId, 1);
  assert.equal(clean.stages["2"].fieldTripCompleted, false);
});

test("hidden field trip controls stay hidden despite button display styles", () => {
  const css = fs.readFileSync(
    path.join(__dirname, "..", "src", "styles.css"),
    "utf8",
  );

  assert.match(css, /\[hidden\]\s*\{[^}]*display:\s*none\s*!important;/);
});

test("quick-check choices keep long words on one line", () => {
  const css = fs.readFileSync(
    path.join(__dirname, "..", "src", "styles.css"),
    "utf8",
  );
  const choiceLabelRule = css.match(/\.word-check-choice-label\s*\{[^}]*\}/)?.[0] || "";

  assert.match(choiceLabelRule, /white-space:\s*nowrap;/);
  assert.match(choiceLabelRule, /overflow-wrap:\s*normal;/);
  assert.match(choiceLabelRule, /word-break:\s*keep-all;/);
});

test("field-trip monsters face the player character", () => {
  const css = fs.readFileSync(
    path.join(__dirname, "..", "src", "styles.css"),
    "utf8",
  );

  assert.match(
    css,
    /\.trip-monster-facing-character\s*\{[^}]*transform:\s*scaleX\(-1\);/,
  );
});

test("logged-out users start on the auth gate instead of the game", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  const css = fs.readFileSync(
    path.join(__dirname, "..", "src", "styles.css"),
    "utf8",
  );

  assert.match(html, /<body class="[^"]*\bauth-required\b/);
  assert.match(html, /\/src\/main\.tsx/);
  assert.match(css, /body\.auth-required\s+\.game-layout\s*\{[^}]*display:\s*none;/);
});

test("modern soldier weapon is rendered as a gun-shaped item", () => {
  const gearSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "GearArt.tsx"),
    "utf8",
  );
  const css = fs.readFileSync(
    path.join(__dirname, "..", "src", "styles.css"),
    "utf8",
  );

  assert.match(gearSource, /weapon-body/);
  assert.match(gearSource, /weapon-barrel/);
  assert.match(gearSource, /weapon-trigger/);
  assert.match(css, /\.weapon-layer \.weapon-body/);
  assert.match(css, /\.weapon-layer \.weapon-barrel/);
});

test("modern soldier third reward renders as radio art instead of shield art", () => {
  const gearSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "GearArt.tsx"),
    "utf8",
  );
  const css = fs.readFileSync(
    path.join(__dirname, "..", "src", "styles.css"),
    "utf8",
  );

  assert.match(gearSource, /case "radio":/);
  assert.match(gearSource, /radio-body/);
  assert.match(gearSource, /radio-antenna/);
  assert.match(css, /\.radio-layer \.radio-body/);
  assert.match(css, /\.radio-layer \.radio-antenna/);
});

test("stage 5 uses dedicated pilot and fighter-jet part art", () => {
  const gearSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "GearArt.tsx"),
    "utf8",
  );
  const typeSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "types.ts"),
    "utf8",
  );
  const css = fs.readFileSync(
    path.join(__dirname, "..", "src", "styles.css"),
    "utf8",
  );

  assert.match(gearSource, /type StageVariant =[^;]*"pilot"/);
  assert.match(gearSource, /stage\.id === 5 && <PilotBaseDetails/);
  assert.match(gearSource, /function PilotGearShape/);
  assert.match(gearSource, /case "engine":/);
  assert.match(gearSource, /case "intake":/);
  assert.match(gearSource, /case "gauge":/);
  assert.match(gearSource, /case "afterburner":/);
  assert.match(gearSource, /case "jetmodel":/);
  assert.match(typeSource, /\| "engine"/);
  assert.match(typeSource, /\| "jetmodel"/);
  assert.match(gearSource, /character-stage-\$\{stage\.id\} \$\{stage\.themeClass\}/);
  assert.match(css, /body\.stage-pilot,\s*\.character-svg\.stage-pilot\s*\{/);
  assert.match(css, /\.pilot-base-details/);
  assert.match(css, /\.gear-variant-pilot\s*\{/);
});

test("old stable reward ids still sanitize and load", () => {
  const progress = createDefaultProgress();

  progress.stages["2"].knownWords = PUBLIC_CONTENT.stages[1].words.slice(0, 10);
  progress.stages["2"].unlockedItems = ["stage2-weapon"];
  progress.stages["2"].equippedItems = ["stage2-weapon"];
  progress.stages["2"].completedMazeMilestones = [10];

  const clean = sanitizeProgress(progress);

  assert.deepEqual(clean.stages["2"].unlockedItems, ["stage2-weapon"]);
  assert.deepEqual(clean.stages["2"].equippedItems, ["stage2-weapon"]);
  assert.deepEqual(clean.stages["2"].completedMazeMilestones, [10]);
});

test("legacy modern shield reward ids migrate to the field radio", () => {
  const progress = createDefaultProgress();

  progress.stages["4"].knownWords = PUBLIC_CONTENT.stages[3].words.slice(0, 30);
  progress.stages["4"].unlockedItems = ["stage4-shield"];
  progress.stages["4"].equippedItems = ["stage4-shield"];
  progress.stages["4"].pendingReward = { itemId: "stage4-shield" };

  const clean = sanitizeProgress(progress);

  assert.deepEqual(clean.stages["4"].unlockedItems, ["stage4-radio"]);
  assert.deepEqual(clean.stages["4"].equippedItems, ["stage4-radio"]);
  assert.deepEqual(clean.stages["4"].pendingReward, {
    milestone: 30,
    itemId: "stage4-radio",
  });
});

test("merge preserves best known-word progress without unlocking incomplete stages", () => {
  const existing = createDefaultProgress();
  const incoming = createDefaultProgress();

  existing.stages["1"].knownWords = ["the", "of"];
  incoming.stages["1"].knownWords = ["and", "a"];
  incoming.completedFieldTrips = [1];
  incoming.stages["1"].fieldTripCompleted = true;
  incoming.activeStageId = 2;

  const merged = mergeProgress(existing, incoming);

  assert.deepEqual(merged.stages["1"].knownWords, ["the", "of", "and", "a"]);
  assert.deepEqual(merged.unlockedStageIds, [1]);
  assert.equal(merged.activeStageId, 1);
});

test("merge unlocks next stage when previous words and field trip are complete", () => {
  const existing = createDefaultProgress();
  const incoming = createDefaultProgress();
  const stageOneWords = PUBLIC_CONTENT.stages[0].words;

  existing.stages["1"].knownWords = stageOneWords.slice(0, 50);
  incoming.stages["1"].knownWords = [...stageOneWords];
  incoming.completedFieldTrips = [1];
  incoming.stages["1"].fieldTripCompleted = true;
  incoming.activeStageId = 2;

  const merged = mergeProgress(existing, incoming);

  assert.equal(merged.stages["1"].knownWords.length, stageOneWords.length);
  assert.deepEqual(merged.unlockedStageIds, [1, 2]);
  assert.equal(merged.activeStageId, 2);
});

test("merge removes newly known practice words and sorts completed trips", () => {
  const existing = createDefaultProgress();
  const incoming = createDefaultProgress();
  const stageOneWords = PUBLIC_CONTENT.stages[0].words;
  const stageTwoWords = PUBLIC_CONTENT.stages[1].words;

  existing.stages["1"].knownWords = stageOneWords.slice(1);
  existing.stages["1"].practiceWords = ["the"];
  incoming.stages["1"].knownWords = [...stageOneWords];
  incoming.stages["1"].fieldTripCompleted = true;
  incoming.stages["2"].knownWords = [...stageTwoWords];
  incoming.stages["2"].fieldTripCompleted = true;
  incoming.completedFieldTrips = [2, 1];
  incoming.activeStageId = 3;

  const merged = mergeProgress(existing, incoming);

  assert.deepEqual(merged.stages["1"].practiceWords, []);
  assert.deepEqual(merged.completedFieldTrips, [1, 2]);
  assert.deepEqual(merged.unlockedStageIds, [1, 2, 3]);
  assert.equal(merged.activeStageId, 3);
});

test("merge preserves the furthest Phrase Forest mission and strongest reading evidence", () => {
  const existing = completedWordAcademyProgress();
  const incoming = completedWordAcademyProgress();
  const stage = PUBLIC_CONTENT.phraseForest.stages[0];
  const firstItem = stage.practicePhrases[0].id;
  const secondItem = stage.practicePhrases[1].id;
  const thirdItem = stage.practicePhrases[2].id;

  existing.phraseForest = {
    activeStageId: 6,
    stages: {
      6: {
        currentRoundIndex: 2,
        completedMissionIds: phraseMissionIds(6, 2),
        helpedItemIds: [firstItem],
        independentItemIds: [secondItem],
        itemResults: {
          [firstItem]: { correct: 2, errors: 1, phraseHelp: 1, wordHelp: 0 },
          [thirdItem]: { correct: 1, errors: 0, phraseHelp: 0, wordHelp: 0 },
        },
      },
    },
  };
  incoming.phraseForest = {
    activeStageId: 6,
    stages: {
      6: {
        currentRoundIndex: 1,
        completedMissionIds: phraseMissionIds(6, 1),
        helpedItemIds: [secondItem],
        independentItemIds: [firstItem],
        itemResults: {
          [firstItem]: { correct: 1, errors: 4, phraseHelp: 0, wordHelp: 2 },
          [secondItem]: { correct: 3, errors: 0, phraseHelp: 1, wordHelp: 0 },
        },
      },
    },
  };

  const merged = mergeProgress(existing, incoming);
  const mergedStage = merged.phraseForest.stages["6"];

  assert.deepEqual(mergedStage.completedMissionIds, phraseMissionIds(6, 2));
  assert.equal(mergedStage.currentRoundIndex, 2);
  assert.deepEqual(mergedStage.helpedItemIds, [firstItem, secondItem]);
  assert.deepEqual(mergedStage.independentItemIds, []);
  assert.deepEqual(mergedStage.itemResults[firstItem], {
    correct: 2,
    errors: 4,
    phraseHelp: 1,
    wordHelp: 2,
  });
  assert.deepEqual(mergedStage.itemResults[secondItem], {
    correct: 3,
    errors: 0,
    phraseHelp: 1,
    wordHelp: 0,
  });
  assert.deepEqual(mergedStage.itemResults[thirdItem], {
    correct: 1,
    errors: 0,
    phraseHelp: 0,
    wordHelp: 0,
  });
});

test("legacy state imports into stage 1", () => {
  const progress = progressForLegacyState({
    knownWords: ["the", "of"],
    practiceWords: ["and"],
    currentIndex: 2,
  });

  assert.deepEqual(progress.stages["1"].knownWords, ["the", "of"]);
  assert.deepEqual(progress.stages["1"].practiceWords, ["and"]);
  assert.equal(progress.stages["1"].currentIndex, 2);
});

test("invalid legacy state imports as default progress", () => {
  const progress = progressForLegacyState(null);

  assert.equal(progress.activeStageId, 1);
  assert.deepEqual(progress.unlockedStageIds, [1]);
  assert.deepEqual(progress.stages["1"].knownWords, []);
});

function normalizeWord(word) {
  return word.trim().toLocaleLowerCase("en-US");
}

function duplicatedValues(values) {
  const seen = new Set();
  const duplicates = new Set();

  values.forEach((value) => {
    if (seen.has(value)) {
      duplicates.add(value);
      return;
    }

    seen.add(value);
  });

  return [...duplicates].sort();
}

function completedWordAcademyProgress() {
  const progress = createDefaultProgress();

  PUBLIC_CONTENT.stages.forEach((stage) => {
    progress.stages[String(stage.id)].knownWords = [...stage.words];
  });

  return progress;
}

function phraseMissionIds(stageId, count) {
  return Array.from(
    { length: count },
    (_, index) => `phrase-stage-${stageId}-mission-${index + 1}`,
  );
}
