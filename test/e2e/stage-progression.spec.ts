import { expect, test, type Page } from "@playwright/test";

const { CONTENT_VERSION, PHRASE_FOREST, PUBLIC_CONTENT, STAGES } = require("../../server/content") as {
  CONTENT_VERSION: number;
  PHRASE_FOREST: { stages: Array<{ id: number; title: string; practicePhrases: unknown[] }> };
  PUBLIC_CONTENT: unknown;
  STAGES: Array<{ id: number; title: string; words: string[] }>;
};

function wordStageState(stage: (typeof STAGES)[number], completed: boolean) {
  return {
    knownWords: completed ? [...stage.words] : [],
    practiceWords: [],
    currentIndex: 0,
    deckOrder: stage.words.map((_, index) => index),
    shuffled: false,
    unlockedItems: [],
    equippedItems: [],
    completedMazeMilestones: [],
    pendingReward: null,
    fieldTripCompleted: completed,
  };
}

function phraseStageState(stage: (typeof PHRASE_FOREST.stages)[number], completed: boolean) {
  const missionIds = Array.from(
    { length: 20 },
    (_, index) => `phrase-stage-${stage.id}-mission-${index + 1}`,
  );
  const checkpointIds = completed ? missionIds.slice(15, 18) : [];
  return {
    currentRoundIndex: 0,
    completedMissionIds: completed ? missionIds : [],
    completedCheckpointIds: checkpointIds,
    checkpointSessionIds: Object.fromEntries(
      checkpointIds.map((id, index) => [id, `e2e-stage-${stage.id}-${index}`]),
    ),
    checkpointAttemptSessionIds: [],
    checkpointAttempt: null,
    helpedItemIds: [],
    independentItemIds: [],
    itemResults: {},
    completed,
    mastered: completed,
    restoredArea: completed,
    companionUnlocked: completed,
  };
}

function progressFor(stageId: number) {
  const wordCompleteThrough = stageId > 5 ? 5 : stageId - 1;
  const wordStageId = Math.min(stageId, 5);
  return {
    version: CONTENT_VERSION,
    activeStageId: wordStageId,
    unlockedStageIds: STAGES.filter((stage) => stage.id <= wordStageId).map((stage) => stage.id),
    completedFieldTrips: STAGES.filter((stage) => stage.id < wordStageId).map((stage) => stage.id),
    stages: Object.fromEntries(STAGES.map((stage) => [
      String(stage.id),
      wordStageState(stage, stage.id <= wordCompleteThrough),
    ])),
    phraseForest: {
      activeStageId: Math.max(stageId, 6),
      unlockedStageIds: stageId >= 6
        ? PHRASE_FOREST.stages.filter((stage) => stage.id <= stageId).map((stage) => stage.id)
        : [],
      completedStageIds: PHRASE_FOREST.stages.filter((stage) => stage.id < stageId).map((stage) => stage.id),
      stages: Object.fromEntries(PHRASE_FOREST.stages.map((stage) => [
        String(stage.id),
        phraseStageState(stage, stage.id < stageId),
      ])),
    },
  };
}

async function mockAuthenticatedApi(page: Page, progress: ReturnType<typeof progressFor>) {
  await page.route("**/api/content", (route) => route.fulfill({ json: PUBLIC_CONTENT }));
  await page.route("**/api/me", (route) => route.fulfill({
    json: { user: { id: 7, username: "e2e-player", email: "e2e@example.com" } },
  }));
  await page.route("**/api/progress", async (route) => {
    if (route.request().method() === "PUT") {
      const body = route.request().postDataJSON() as { progress?: ReturnType<typeof progressFor> };
      if (body.progress) progress = body.progress;
    }
    await route.fulfill({ json: { progress } });
  });
}

for (const stageId of [1, 2, 3, 4, 5]) {
  test(`renders Word Academy Stage ${stageId}`, async ({ page }) => {
    await mockAuthenticatedApi(page, progressFor(stageId));
    await page.goto("/");

    await expect(page.getByRole("heading", { name: `Stage ${stageId}` })).toBeVisible();
    await expect(page.locator(".word-text")).toBeVisible();
    await expect(page.getByRole("button", { name: "I know it" })).toBeVisible();
  });
}

test("opens the quick word check after marking a Word Academy word known", async ({ page }) => {
  await mockAuthenticatedApi(page, progressFor(1));
  await page.addInitScript(() => {
    Math.random = () => 0;
  });
  await page.goto("/");

  await page.getByRole("button", { name: "I know it" }).click();
  await expect(page.getByRole("dialog", { name: "Which word did you hear?" })).toBeVisible();
});

for (const stageId of [6, 7, 8, 9, 10]) {
  test(`renders Phrase Forest Stage ${stageId}`, async ({ page }) => {
    const stage = PHRASE_FOREST.stages.find((candidate) => candidate.id === stageId)!;
    await mockAuthenticatedApi(page, progressFor(stageId));
    await page.goto("/");
    await page.getByRole("button", { name: /Phrase Forest/ }).click();

    await expect(page.getByRole("heading", { name: stage.title })).toBeVisible();
    await expect(page.locator(".phrase-forest-world")).toBeVisible();
    await expect(page.locator(".phrase-prompt")).toBeVisible();
  });
}

test("renders the Stage 6 phrase-building activity", async ({ page }) => {
  await mockAuthenticatedApi(page, progressFor(6));
  await page.goto("/");
  await page.getByRole("button", { name: /Phrase Forest/ }).click();
  await expect(page.locator(".phrase-builder")).toBeVisible();
});

test("renders the Stage 10 scene-choice activity", async ({ page }) => {
  await mockAuthenticatedApi(page, progressFor(10));
  await page.goto("/");
  await page.getByRole("button", { name: /Phrase Forest/ }).click();
  await expect(page.locator(".phrase-meaning-choices")).toBeVisible();
});

test("keeps the authored stage boundary at Stage 10", () => {
  expect(STAGES.map((stage) => stage.id)).toEqual([1, 2, 3, 4, 5]);
  expect(PHRASE_FOREST.stages.map((stage) => stage.id)).toEqual([6, 7, 8, 9, 10]);
});
