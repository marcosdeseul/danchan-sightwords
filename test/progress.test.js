"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { PUBLIC_CONTENT } = require("../server/content");
const {
  createDefaultProgress,
  mergeProgress,
  progressForLegacyState,
  sanitizeProgress,
} = require("../server/progress");

test("staged content has the expected word counts", () => {
  assert.equal(PUBLIC_CONTENT.stages[0].words.length, 100);
  assert.equal(PUBLIC_CONTENT.stages[1].words.length, 150);
  assert.equal(PUBLIC_CONTENT.stages[2].words.length, 200);
  assert.equal(PUBLIC_CONTENT.stages[3].words.length, 250);
  assert.equal(PUBLIC_CONTENT.stages[1].subtitle, "Roman Warrior");
  assert.equal(PUBLIC_CONTENT.stages[2].subtitle, "Medieval Knight");
  assert.equal(PUBLIC_CONTENT.stages[3].subtitle, "Modern Soldier");
});

test("each stage has its own reward catalog and visual keys", () => {
  const expectedRewardCounts = [10, 15, 20, 25];
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
  assert.equal(PUBLIC_CONTENT.stages[3].rewards[9].name, "Guide Cap");
});

test("default progress starts at stage 1 only", () => {
  const progress = createDefaultProgress();

  assert.equal(progress.activeStageId, 1);
  assert.deepEqual(progress.unlockedStageIds, [1]);
  assert.equal(progress.stages["1"].knownWords.length, 0);
  assert.equal(progress.stages["2"].deckOrder.length, 150);
  assert.equal(progress.stages["3"].deckOrder.length, 200);
  assert.equal(progress.stages["4"].deckOrder.length, 250);
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
    path.join(__dirname, "..", "public", "styles.css"),
    "utf8",
  );

  assert.match(css, /\[hidden\]\s*\{[^}]*display:\s*none\s*!important;/);
});

test("logged-out users start on the auth gate instead of the game", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8",
  );
  const css = fs.readFileSync(
    path.join(__dirname, "..", "public", "styles.css"),
    "utf8",
  );

  assert.match(html, /<body class="[^"]*\bauth-required\b/);
  assert.match(html, /\/src\/main\.tsx/);
  assert.match(css, /body\.auth-required\s+\.game-layout\s*\{[^}]*display:\s*none;/);
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
