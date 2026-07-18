"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { PUBLIC_CONTENT, REWARD_ID_ALIASES, stageById } = require("../server/content");
const {
  createDefaultProgress,
  mergeProgress,
  progressForLegacyState,
  sanitizeProgress,
} = require("../server/progress");

test("staged content has the expected word counts", () => {
  assert.equal(PUBLIC_CONTENT.version, 6);
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

test("account auth uses username and keeps email as optional settings", () => {
  const appSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "App.tsx"),
    "utf8",
  );
  const serverSource = fs.readFileSync(
    path.join(__dirname, "..", "server", "server.js"),
    "utf8",
  );
  const migration = fs.readFileSync(
    path.join(__dirname, "..", "db", "migrations", "002_username_auth.sql"),
    "utf8",
  );

  assert.match(appSource, /placeholder="Username"/);
  assert.match(appSource, /body:\s*\{\s*username,\s*password\s*\}/);
  assert.doesNotMatch(appSource, /onAuthenticate\("login", email, password\)/);
  assert.match(appSource, /placeholder="Email \(optional\)"/);
  assert.match(serverSource, /INSERT INTO users \(username, email, password_hash\)/);
  assert.match(serverSource, /UPDATE users SET email = \$1/);
  assert.match(migration, /ALTER TABLE users ALTER COLUMN email DROP NOT NULL;/);
  assert.match(migration, /users_email_unique_not_null/);
});

test("treasure gear inventory is opened from a popup instead of inline panel", () => {
  const appSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "App.tsx"),
    "utf8",
  );
  const css = fs.readFileSync(
    path.join(__dirname, "..", "public", "styles.css"),
    "utf8",
  );

  assert.match(appSource, /function InventoryOverlay/);
  assert.match(appSource, /className="button inventory-open-button"/);
  assert.doesNotMatch(appSource, /className="panel-block gear-block"/);
  assert.match(css, /\.inventory-overlay\[hidden\]/);
  assert.match(
    css,
    /body\.inventory-is-open,[\s\S]*body\.word-check-is-open,[\s\S]*body\.reward-reveal-is-open\s*\{[\s\S]*overflow:\s*hidden/,
  );
});

test("claimed treasure opens a visual equipped-item reveal before play resumes", () => {
  const appSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "App.tsx"),
    "utf8",
  );
  const revealSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "TreasureRewardReveal.tsx"),
    "utf8",
  );
  const css = fs.readFileSync(
    path.join(__dirname, "..", "public", "styles.css"),
    "utf8",
  );

  assert.match(appSource, /interface TreasureRevealState/);
  assert.match(appSource, /rewardClaimInFlight\.current = true/);
  assert.match(appSource, /setTreasureReveal\(\{ stageId: stage\.id, rewardId: reward\.id \}\)/);
  assert.match(appSource, /function App\(\)[\s\S]*<TreasureRewardReveal/);
  assert.match(appSource, /onContinue=\{continueAfterTreasureReveal\}/);
  assert.doesNotMatch(appSource, /showCelebration\(`\$\{reward\.name\} found!`\)/);
  assert.match(revealSource, /<GearIcon reward=\{reward\} \/>/);
  assert.match(revealSource, /<Character stage=\{stage\} equippedRewards=\{revealedLoadout\} \/>/);
  assert.match(revealSource, /autoFocus/);
  assert.match(css, /body\.reward-reveal-is-open\s*\{[\s\S]*overflow:\s*hidden/);
});

test("reset progress is kept in collapsed parent controls away from game actions", () => {
  const appSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "App.tsx"),
    "utf8",
  );
  const css = fs.readFileSync(
    path.join(__dirname, "..", "public", "styles.css"),
    "utf8",
  );
  const secondaryActions = appSource.match(
    /<div className="secondary-actions">[\s\S]*?<\/div>/,
  )?.[0] || "";

  assert.match(appSource, /<details className="parent-controls">/);
  assert.match(appSource, /<summary>Parent controls<\/summary>/);
  assert.match(appSource, /<span>Reset all progress<\/span>/);
  assert.doesNotMatch(secondaryActions, /Reset progress|onClick=\{resetProgress\}/);
  assert.match(css, /\.parent-controls\s*\{/);
  assert.match(css, /\.danger-account-button\s*\{/);
  assert.match(css, /\.secondary-actions\s*\{[\s\S]*grid-template-columns:\s*minmax\(88px, 0\.8fr\) 52px 1fr/);
});

test("field trip uses movement, attacks, shield defense, and creature-shaped monsters", () => {
  const appSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "App.tsx"),
    "utf8",
  );
  const css = fs.readFileSync(
    path.join(__dirname, "..", "public", "styles.css"),
    "utf8",
  );
  const contentSource = fs.readFileSync(
    path.join(__dirname, "..", "server", "content.js"),
    "utf8",
  );

  assert.match(appSource, /direction:\s*"left"\s*\|\s*"right"\s*\|\s*"hit"\s*\|\s*"defend"/);
  assert.match(appSource, /ArrowLeft:\s*"left"/);
  assert.match(appSource, /ArrowRight:\s*"right"/);
  assert.match(appSource, /ArrowDown:\s*"defend"/);
  assert.match(appSource, /ariaLabel="Hit monster"/);
  assert.match(appSource, /ariaLabel="Defend with shield"/);
  assert.match(appSource, /FIELD_TRIP_ATTACK_TELEGRAPH_MS = 650/);
  assert.match(appSource, /FIELD_TRIP_ATTACK_MS = 1_700/);
  assert.match(appSource, /FIELD_TRIP_DEFEND_MS = 1_300/);
  assert.match(appSource, /window\.clearTimeout\(fieldTripDefenseTimer\.current\)/);
  assert.match(appSource, /Great block!/);
  assert.match(appSource, /className="trip-defense-aura"/);
  assert.match(appSource, /className="trip-attack-warning"/);
  assert.match(appSource, /const fieldTripRewards = stage\?\.rewards \|\| \[\]/);
  assert.match(appSource, /<Character stage=\{stage\} equippedRewards=\{fieldTripRewards\} \/>/);
  assert.match(appSource, /function MonsterArt/);
  assert.match(appSource, /wolf-creature-art/);
  assert.match(appSource, /dragon-creature-art/);
  assert.match(appSource, /kind:\s*"wolf"\s*\|\s*"dragon"\s*\|\s*"flying-dragon"/);
  assert.match(appSource, /monster-stage-\$\{stage\?\.id \|\| 1\}/);
  assert.match(contentSource, /"Cave Wolf"/);
  assert.match(contentSource, /"Ember Dragon"/);
  assert.match(contentSource, /"Cyber Wolf"/);
  assert.match(contentSource, /"Sky Dragon"/);
  assert.match(contentSource, /"Cloudwing Flying Dragon"/);
  assert.match(appSource, /flying-dragon-creature-art/);
  assert.match(appSource, /normalizedName\.includes\("flying dragon"\)/);
  assert.doesNotMatch(appSource, /ariaLabel="Jump"/);
  assert.doesNotMatch(appSource, /className="trip-creature"/);
  assert.match(css, /\.trip-monster/);
  assert.match(css, /\.trip-monster\.monster-stage-1/);
  assert.match(css, /\.trip-monster\.monster-stage-2/);
  assert.match(css, /\.trip-monster\.monster-stage-3/);
  assert.match(css, /\.trip-monster\.monster-stage-4/);
  assert.match(css, /\.trip-monster\.monster-stage-5/);
  assert.match(css, /\.trip-monster\.monster-kind-flying-dragon/);
  assert.match(css, /\.trip-runner \.character-svg/);
  assert.match(css, /\.trip-runner\.is-swinging \.weapon-layer/);
  assert.match(css, /\.trip-runner\.is-defending \.shield-layer/);
  assert.match(css, /\.trip-monster\.is-winding-up/);
  assert.match(css, /\.trip-defend\s*\{/);
  assert.match(css, /@keyframes trip-weapon-swing/);
  assert.match(css, /@keyframes trip-shield-raise/);
  assert.match(css, /@keyframes trip-creature-windup/);
  assert.doesNotMatch(css, /\.trip-runner::after/);
  assert.doesNotMatch(css, /\.trip-monster::before/);
  assert.doesNotMatch(css, /\.trip-lanes/);
});

test("long sight words fit on one line with measured font sizing", () => {
  const appSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "App.tsx"),
    "utf8",
  );
  const css = fs.readFileSync(
    path.join(__dirname, "..", "public", "styles.css"),
    "utf8",
  );
  const wordBlock = css.match(/\.word\s*\{[^}]*\}/)?.[0] || "";

  assert.match(appSource, /function fittedWordFontSize/);
  assert.match(appSource, /measureText\(word\)/);
  assert.match(appSource, /ResizeObserver/);
  assert.match(appSource, /className="word-text"/);
  assert.match(wordBlock, /font-size:\s*var\(--word-font-size,\s*168px\)/);
  assert.match(wordBlock, /white-space:\s*nowrap/);
  assert.match(wordBlock, /word-break:\s*keep-all/);
  assert.doesNotMatch(wordBlock, /overflow-wrap:\s*anywhere/);
  assert.doesNotMatch(css, /\.word\s*\{[^}]*vw/);
});

test("word card includes a compact equipped character preview", () => {
  const appSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "App.tsx"),
    "utf8",
  );
  const css = fs.readFileSync(
    path.join(__dirname, "..", "public", "styles.css"),
    "utf8",
  );

  assert.match(appSource, /const equippedRewards = stage\.rewards\.filter/);
  assert.match(appSource, /className="word-character-preview"/);
  assert.match(appSource, /<Character stage=\{stage\} equippedRewards=\{equippedRewards\} \/>/);
  assert.match(css, /\.word-character-preview\s*\{/);
  assert.match(css, /\.word-character-preview \.character-svg/);
  assert.match(css, /\.word\s*\{[^}]*width:\s*calc\(100% - 72px\)/);
});

test("known-word clicks can require an audio word check before awarding progress", () => {
  const appSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "App.tsx"),
    "utf8",
  );
  const css = fs.readFileSync(
    path.join(__dirname, "..", "public", "styles.css"),
    "utf8",
  );

  assert.match(appSource, /const WORD_CHECK_CHANCE = 0\.35/);
  assert.match(appSource, /const WORD_CHECK_FOLLOW_UPS_AFTER_MISS = 2/);
  assert.match(appSource, /const WORD_CHECK_CORRECT_FEEDBACK_MS = 1_500/);
  assert.match(appSource, /const WORD_CHECK_WRONG_FEEDBACK_MS = 4_000/);
  assert.match(appSource, /interface WordCheckState/);
  assert.match(appSource, /targetWordIndex/);
  assert.match(appSource, /promptWordIndex/);
  assert.match(appSource, /remainingWordIndices/);
  assert.match(appSource, /failedWordIndices/);
  assert.match(appSource, /followUpsRemaining/);
  assert.match(appSource, /interface WordCheckFeedback/);
  assert.match(appSource, /wordCheckFeedbackTimer/);
  assert.match(appSource, /pendingWordCheckIndices/);
  assert.match(appSource, /function WordCheckOverlay/);
  assert.match(appSource, /feedback:\s*WordCheckFeedback \| null/);
  assert.match(appSource, /className="word-check-overlay"/);
  assert.match(appSource, /Play sound again/);
  assert.match(appSource, /onPlayChoice=\{playWordCheckChoice\}/);
  assert.match(appSource, /const showChoiceSounds = feedback\?\.correct === false/);
  assert.match(appSource, /\{showChoiceSounds && \(/);
  assert.match(appSource, /aria-label=\{`Play \$\{choice\}`\}/);
  assert.match(appSource, /className="word-check-choice-play"/);
  assert.match(appSource, /The correct word is/);
  assert.match(
    appSource,
    /correct \? WORD_CHECK_CORRECT_FEEDBACK_MS : WORD_CHECK_WRONG_FEEDBACK_MS/,
  );
  assert.match(appSource, /word-check-mark/);
  assert.match(appSource, /feedback\.correct \? "O" : "X"/);
  assert.match(appSource, /setWordCheckFeedback\(\{ choice, correct \}\)/);
  assert.match(appSource, /buildWordCheckCandidateIndices/);
  assert.match(appSource, /createWordCheckState/);
  assert.match(appSource, /buildWordCheckChoices\(stage, word\)/);
  assert.match(appSource, /sameLetterDistractors/);
  assert.match(appSource, /firstWordLetter\(stageWord\) === firstLetter/);
  assert.match(appSource, /fallbackDistractors/);
  assert.match(appSource, /function firstWordLetter/);
  assert.match(appSource, /Math\.random\(\) < WORD_CHECK_CHANCE/);
  assert.match(appSource, /rememberWordCheckCandidate\(stage\.id, wordIndex\)/);
  assert.match(appSource, /clearWordCheckCandidates\(check\.stageId\)/);
  assert.match(appSource, /nextCandidateWordIndices/);
  assert.match(appSource, /advance: false/);
  assert.match(appSource, /applyKnownWord\(\{[\s\S]*speak: false/);
  assert.match(appSource, /applyPracticeWord\(\{[\s\S]*message: "Practice this one"/);
  assert.match(css, /\.word-check-overlay\s*\{/);
  assert.match(css, /body\.word-check-is-open/);
  assert.match(css, /\.word-check-choice/);
  assert.match(css, /\.word-check-choice\.is-correct/);
  assert.match(css, /\.word-check-choice\.is-wrong/);
  assert.match(css, /\.word-check-option\s*\{/);
  assert.match(css, /\.word-check-option\.has-playback\s*\{/);
  assert.match(css, /\.word-check-choice-play\s*\{/);
  assert.match(css, /\.word-check-feedback\.is-correct/);
  assert.match(css, /\.word-check-feedback\.is-wrong/);
});

test("long quick-check choices fit on one line with measured font sizing", () => {
  const appSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "App.tsx"),
    "utf8",
  );
  const css = fs.readFileSync(
    path.join(__dirname, "..", "public", "styles.css"),
    "utf8",
  );
  const labelBlock = css.match(/\.word-check-choice-label\s*\{[^}]*\}/)?.[0] || "";

  assert.match(appSource, /function WordCheckChoiceLabel/);
  assert.match(appSource, /fittedWordFontSize\(\s*choice,/);
  assert.match(appSource, /observer\.observe\(labelElement\)/);
  assert.match(appSource, /<WordCheckChoiceLabel choice=\{choice\} \/>/);
  assert.match(
    labelBlock,
    /font-size:\s*var\(--word-check-choice-font-size,\s*36px\)/,
  );
  assert.match(labelBlock, /white-space:\s*nowrap/);
  assert.match(labelBlock, /word-break:\s*keep-all/);
  assert.match(labelBlock, /overflow-wrap:\s*normal/);
  assert.doesNotMatch(labelBlock, /overflow-wrap:\s*anywhere/);
});

test("progress uses Postgres while connected and local storage only as an offline queue", () => {
  const appSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "App.tsx"),
    "utf8",
  );
  const gameSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "game.ts"),
    "utf8",
  );

  assert.match(appSource, /method: "PUT",[\s\S]*body: \{ progress: progressToSave \}/);
  assert.match(appSource, /window\.addEventListener\("online", retrySync\)/);
  assert.match(appSource, /window\.setInterval\(retrySync, 10_000\)/);
  assert.match(appSource, /loadOfflineProgress\(current\.content, user\.id\)/);
  assert.match(appSource, /clearOfflineProgress\(user\.id\)/);
  assert.match(gameSource, /danSightWords:offline:v1/);
  assert.match(gameSource, /JSON\.stringify\(\{ userId, progress \}\)/);
  assert.doesNotMatch(appSource, /api\/progress\/import-local/);
  assert.doesNotMatch(appSource, /saveLocalProgress/);
  assert.doesNotMatch(appSource, /loadLocalProgress/);
});

test("modern soldier weapon is rendered as a gun-shaped item", () => {
  const gearSource = fs.readFileSync(
    path.join(__dirname, "..", "src", "GearArt.tsx"),
    "utf8",
  );
  const css = fs.readFileSync(
    path.join(__dirname, "..", "public", "styles.css"),
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
    path.join(__dirname, "..", "public", "styles.css"),
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
    path.join(__dirname, "..", "public", "styles.css"),
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
