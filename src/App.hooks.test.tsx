// @vitest-environment jsdom

import { afterEach, expect, test, vi } from "vitest";
import { defaultProgress } from "./game";
import { SPEECH_REPLAY_DELAY_MS, SPEECH_START_TIMEOUT_MS } from "./app/speech";
import type { AppState, WordCheckFeedback, WordCheckState } from "./App";
import type { ProgressState, RewardSlot, SightWordsContent, StageContent, User } from "./types";

const testUser: User = { id: 7, username: "dan", email: null };

function createContent(): SightWordsContent {
  const slots: RewardSlot[] = ["weapon", "boots"];
  const stages: StageContent[] = [1, 2].map((id) => ({
    id,
    title: `Stage ${id}`,
    subtitle: `Hero ${id}`,
    themeClass: id === 1 ? "stage-ancient" : "stage-roman",
    heroName: `Hero ${id}`,
    words: id === 1 ? ["alpha", "apple"] : ["beta", "cat"],
    rewards: slots.map((slot, index) => ({
      id: `stage${id}-${slot}`,
      name: `Stage ${id} ${slot}`,
      slot,
      stageId: id,
      milestone: index + 1,
      visualKey: `stage${id}-${slot}`,
    })),
    fieldTrip: {
      title: `Trip ${id}`,
      intro: "Go",
      finish: "Done",
      creatures: ["Wolf"],
    },
  }));
  return { version: 1, stages };
}

function createState(content: SightWordsContent, overrides: Partial<AppState> = {}): AppState {
  return {
    content,
    progress: defaultProgress(content),
    user: testUser,
    authMessage: "",
    speechNotice: "",
    celebration: "",
    celebrationKey: 0,
    lastAnswerAction: null,
    maze: { open: false, position: { row: 0, col: 0 }, message: "", bumpCount: 0 },
    fieldTrip: {
      open: false,
      stageId: null,
      runnerX: 16,
      progress: 0,
      collected: 0,
      creature: null,
      lastTime: 0,
      swinging: false,
      defending: false,
      attackCharge: 0,
      attackEffectKey: 0,
      blockEffectKey: 0,
      message: "",
    },
    loading: false,
    speaking: false,
    ...overrides,
  };
}

interface HookHarness {
  callbacks: Array<(...args: any[]) => any>;
  effects: Array<() => void | (() => void)>;
  refs: Array<{ current: any }>;
  setters: ReturnType<typeof vi.fn>[];
  dispatch: ReturnType<typeof vi.fn>;
  api: ReturnType<typeof vi.fn>;
}

async function createHookHarness({
  state,
  wordCheck = null,
  feedback = null,
  treasure = null,
}: {
  state: AppState;
  wordCheck?: WordCheckState | null;
  feedback?: WordCheckFeedback | null;
  treasure?: { stageId: number; rewardId: string } | null;
}): Promise<HookHarness> {
  vi.resetModules();
  const callbacks: HookHarness["callbacks"] = [];
  const effects: HookHarness["effects"] = [];
  const refs: HookHarness["refs"] = [];
  const setters: HookHarness["setters"] = [];
  const dispatch = vi.fn();
  const api = vi.fn().mockResolvedValue({ ok: true });
  const stateValues = [false, wordCheck, feedback, treasure];
  let stateIndex = 0;

  vi.doMock("react", async () => {
    const actual = await vi.importActual<typeof import("react")>("react");
    return {
      ...actual,
      useReducer: () => [state, dispatch],
      useState: (initial: unknown) => {
        const value = stateIndex < stateValues.length ? stateValues[stateIndex] : initial;
        stateIndex += 1;
        const setter = vi.fn();
        setters.push(setter);
        return [value, setter];
      },
      useRef: (initial: unknown) => {
        const ref = { current: initial };
        refs.push(ref);
        return ref;
      },
      useCallback: (callback: (...args: any[]) => any) => {
        callbacks.push(callback);
        return callback;
      },
      useMemo: (factory: () => unknown) => factory(),
      useEffect: (effect: () => void | (() => void)) => {
        effects.push(effect);
      },
    };
  });
  vi.doMock("./api", () => ({ api }));

  const appModule = await import("./App");
  appModule.default();
  expect(callbacks).toHaveLength(37);
  expect(refs).toHaveLength(9);

  return { callbacks, effects, refs, setters, dispatch, api };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, "speechSynthesis");
  vi.doUnmock("react");
  vi.doUnmock("./api");
  vi.resetModules();
  vi.restoreAllMocks();
});

test("internal App callbacks execute defensive guards without rendering stale UI", async () => {
  const content = createContent();
  const progress = defaultProgress(content);
  const emptyState = createState(content, { content: null, progress: null, user: null });
  const harness = await createHookHarness({ state: emptyState });
  const { callbacks, refs } = harness;

  await callbacks[0]();
  expect(callbacks[1](progress)).toBeNull();
  await callbacks[34]("login", "dan", "pass");
  refs[0].current = createState(content, { user: null });
  expect(callbacks[1](progress)).toEqual(progress);
  refs[0].current = emptyState;
  callbacks[7]();
  callbacks[8](1);
  callbacks[9](content.stages[0], progress);
  callbacks[15](0);
  callbacks[16]();
  callbacks[17]({ stageId: 1, wordIndex: 0, previousState: progress });
  expect(callbacks[18]({ stageId: 1, wordIndex: 0, previousState: progress })).toBeNull();
  callbacks[19]();
  callbacks[20]();
  callbacks[21]();
  callbacks[23]("alpha");
  callbacks[24]("alpha");
  callbacks[25]();
  callbacks[26]();
  callbacks[27]();
  callbacks[28]("missing");
  callbacks[29]("right");

  const incompleteState = createState(content);
  refs[0].current = incompleteState;
  callbacks[8](1);
  refs[0].current = createState(content, {
    progress: {
      ...incompleteState.progress!,
      stages: { ...incompleteState.progress!.stages, 1: undefined as never },
    },
  });
  callbacks[8](1);
  refs[0].current = createState(content);
  refs[0].current.progress.stages["1"].knownWords = [...content.stages[0].words];
  refs[0].current.progress.stages["1"].fieldTripCompleted = true;
  callbacks[8](1);
  callbacks[8](2);
  callbacks[9](content.stages[0], refs[0].current.progress);

  refs[0].current = createState(content);
  refs[0].current.progress.stages["1"].knownWords = [...content.stages[0].words];
  callbacks[16]();
  refs[0].current.progress.stages["1"].fieldTripCompleted = true;
  callbacks[16]();
  refs[0].current.progress.activeStageId = 2;
  refs[0].current.progress.stages["2"].knownWords = [...content.stages[1].words];
  callbacks[16]();

  const emptyWordsContent = createContent();
  emptyWordsContent.stages[0].words = [];
  const emptyWordsState = createState(emptyWordsContent);
  emptyWordsState.progress!.stages["1"].fieldTripCompleted = true;
  refs[0].current = emptyWordsState;
  callbacks[16]();

  const missingDeckState = createState(content);
  missingDeckState.progress!.stages["1"].deckOrder = [];
  refs[0].current = missingDeckState;
  callbacks[16]();

  const repeatKnownState = createState(content);
  repeatKnownState.progress!.stages["1"].knownWords = [content.stages[0].words[0]];
  refs[0].current = repeatKnownState;
  callbacks[19]();

  callbacks[11](1, 0);
  callbacks[11](1, 0);
  callbacks[30]();
  callbacks[31]();
  callbacks[32]("hit");
  callbacks[33]();
  await callbacks[34]("login", "dan", "pass");

  refs[0].current = createState(content, {
    user: null,
    maze: { open: true, position: { row: 0, col: 0 }, message: "", bumpCount: 0 },
  });
  callbacks[27]();
  callbacks[28]("missing");
  callbacks[29]("right");
  callbacks[32]("defend");
});

test("internal App callbacks cover stale word, quiz, reward, and field-trip states", async () => {
  const content = createContent();
  const progress = defaultProgress(content);
  const state = createState(content);
  const harness = await createHookHarness({ state });
  const { callbacks, refs } = harness;

  refs[4].current = 42;
  callbacks[14]();
  callbacks[15](999);
  callbacks[17]({ stageId: 1, wordIndex: 999, previousState: progress });
  callbacks[17]({ stageId: 1, wordIndex: 0, previousState: { ...progress, stages: {} } });
  expect(callbacks[18]({ stageId: 1, wordIndex: 999, previousState: progress })).toBeNull();
  expect(callbacks[18]({ stageId: 1, wordIndex: 0, previousState: { ...progress, stages: {} } })).toBeNull();
  callbacks[28]("missing");
  callbacks[29]("right");

  refs[7].current = true;
  callbacks[30]();
  refs[7].current = false;
  refs[0].current = createState(content, { content: null, progress: null });
  callbacks[30]();
  refs[0].current = createState(content);
  callbacks[30]();
  const claimState = createState(content);
  claimState.progress!.stages["1"].knownWords = [...content.stages[0].words];
  claimState.progress!.stages["1"].completedMazeMilestones = [1];
  claimState.progress!.stages["1"].unlockedItems = [content.stages[0].rewards[0].id];
  claimState.progress!.stages["1"].equippedItems = [content.stages[0].rewards[0].id];
  claimState.progress!.stages["1"].pendingReward = {
    milestone: 2,
    itemId: content.stages[0].rewards[1].id,
  };
  refs[0].current = claimState;
  callbacks[30]();

  refs[0].current = createState(content, {
    fieldTrip: { ...state.fieldTrip, open: true, stageId: null },
  });
  callbacks[32]("left");
  callbacks[33]();
  refs[0].current = createState(content, {
    fieldTrip: { ...state.fieldTrip, open: true, stageId: 1 },
  });
  callbacks[33]();
});

test("internal quiz callbacks cover stale content, failed targets, and locked feedback", async () => {
  const content = createContent();
  const progress = defaultProgress(content);
  const baseCheck: WordCheckState = {
    stageId: 1,
    targetWordIndex: 0,
    promptWordIndex: 0,
    word: "alpha",
    choices: ["alpha", "apple"],
    previousState: progress,
    remainingWordIndices: [],
    failedWordIndices: [0],
    followUpsRemaining: 0,
  };
  const harness = await createHookHarness({ state: createState(content), wordCheck: baseCheck });
  harness.callbacks[21]();
  harness.refs[0].current = createState(content, { content: null });
  harness.callbacks[23]("alpha");
  harness.refs[0].current = createState(content);
  harness.callbacks[23]("alpha");

  const wrongCheck: WordCheckState = {
    ...baseCheck,
    targetWordIndex: 0,
    promptWordIndex: 1,
    word: "apple",
    failedWordIndices: [],
  };
  const wrongHarness = await createHookHarness({ state: createState(content), wordCheck: wrongCheck });
  wrongHarness.callbacks[23]("not-apple");

  const missingProgressCheck: WordCheckState = {
    ...wrongCheck,
    previousState: { ...progress, stages: {} },
    remainingWordIndices: [0],
  };
  const missingProgressHarness = await createHookHarness({
    state: createState(content),
    wordCheck: missingProgressCheck,
  });
  missingProgressHarness.callbacks[23]("not-apple");

  const missingNoRemainingHarness = await createHookHarness({
    state: createState(content),
    wordCheck: { ...missingProgressCheck, remainingWordIndices: [] },
  });
  missingNoRemainingHarness.callbacks[23]("not-apple");

  const lockedHarness = await createHookHarness({
    state: createState(content),
    wordCheck: baseCheck,
    feedback: { choice: "alpha", correct: true },
  });
  lockedHarness.callbacks[24]("alpha");

  const timerHarness = await createHookHarness({ state: createState(content), wordCheck: baseCheck });
  vi.useFakeTimers();
  timerHarness.refs[4].current = window.setTimeout(() => undefined, 10);
  timerHarness.callbacks[24]("alpha");
  vi.runAllTimers();

  const backState = createState(content, {
    lastAnswerAction: { stageId: 1, wordIndex: 999, previousState: progress },
  });
  const backHarness = await createHookHarness({ state: backState });
  backHarness.callbacks[25]();
});

test("internal reward continuation and stale sync paths remain safe", async () => {
  const content = createContent();
  const progress = defaultProgress(content);
  progress.stages["1"].knownWords = [...content.stages[0].words];
  const treasure = { stageId: 1, rewardId: content.stages[0].rewards[0].id };
  const harness = await createHookHarness({ state: createState(content, { progress }), treasure });
  harness.callbacks[31]();

  const invalidHarness = await createHookHarness({
    state: createState(content),
    treasure: { stageId: 999, rewardId: "missing" },
  });
  invalidHarness.callbacks[31]();
  const invalidRevealEffect = invalidHarness.effects.at(-1)!;
  invalidRevealEffect();
  expect(invalidHarness.setters[3]).toHaveBeenCalledWith(null);

  const syncProgress = defaultProgress(content);
  const syncHarness = await createHookHarness({ state: createState(content) });
  syncHarness.refs[2].current = syncProgress;
  let resolveSave!: (value: { progress: ProgressState }) => void;
  syncHarness.api.mockImplementationOnce(() => new Promise((resolve) => {
    resolveSave = resolve as (value: { progress: ProgressState }) => void;
  }));
  const saving = syncHarness.callbacks[0]();
  syncHarness.refs[0].current = createState(content, { user: { ...testUser, id: 8 } });
  resolveSave({ progress: syncProgress });
  await saving;

  const failedSyncHarness = await createHookHarness({ state: createState(content) });
  failedSyncHarness.refs[2].current = syncProgress;
  failedSyncHarness.api.mockRejectedValueOnce(new Error("offline"));
  await failedSyncHarness.callbacks[0]();

  const fallbackContent = createContent();
  const thirdStage = structuredClone(fallbackContent.stages[1]);
  thirdStage.id = 3;
  thirdStage.title = "Stage 3";
  thirdStage.rewards.forEach((reward) => {
    reward.id = reward.id.replace("stage2", "stage3");
    reward.stageId = 3;
  });
  fallbackContent.stages.push(thirdStage);
  const fallbackProgress = defaultProgress(fallbackContent);
  fallbackProgress.stages["2"].knownWords = [...fallbackContent.stages[1].words];
  const fallbackState = createState(fallbackContent, {
    progress: fallbackProgress,
  });
  fallbackState.fieldTrip = { ...fallbackState.fieldTrip, open: true, stageId: 2 };
  const completionHarness = await createHookHarness({ state: fallbackState });
  completionHarness.callbacks[33]();

  const nonErrorHarness = await createHookHarness({ state: createState(content) });
  nonErrorHarness.api.mockRejectedValue("not an error");
  await nonErrorHarness.callbacks[34]("login", "dan", "pass");
  await nonErrorHarness.callbacks[35]("dan@example.com");
});

test("internal effects clean timers and browser listeners", async () => {
  const content = createContent();
  const harness = await createHookHarness({ state: createState(content) });
  vi.useFakeTimers();
  harness.refs[4].current = window.setTimeout(() => undefined, 20);
  harness.refs[5].current = window.setTimeout(() => undefined, 20);
  harness.refs[8].current.replayTimer = window.setTimeout(() => undefined, 20);
  harness.refs[8].current.startTimer = window.setTimeout(() => undefined, 20);
  const cleanTimers = harness.effects[4]();
  cleanTimers?.();

  const keyEffectCleanup = harness.effects[7]();
  harness.refs[0].current = createState(content, { user: null });
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
  harness.refs[0].current = createState(content);
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "x" }));
  keyEffectCleanup?.();

  Reflect.deleteProperty(window, "speechSynthesis");
  const unloadCleanup = harness.effects[8]();
  window.dispatchEvent(new Event("beforeunload"));
  harness.refs[8].current.startTimer = window.setTimeout(() => undefined, 20);
  unloadCleanup?.();

  const cancelledHarness = await createHookHarness({ state: createState(content) });
  cancelledHarness.api.mockRejectedValueOnce(new Error("late failure"));
  const cancelInitialize = cancelledHarness.effects[1]();
  cancelInitialize?.();
  await Promise.resolve();
});

test("device speech ignores stale events and contains browser engine failures", async () => {
  const content = createContent();
  const harness = await createHookHarness({ state: createState(content) });
  const utterances: Array<{
    onstart: (() => void) | null;
    onend: (() => void) | null;
    onerror: ((event?: { error?: string }) => void) | null;
  }> = [];
  class FakeUtterance {
    lang = "";
    rate = 0;
    pitch = 0;
    volume = 0;
    voice: SpeechSynthesisVoice | null = null;
    onstart: (() => void) | null = null;
    onend: (() => void) | null = null;
    onerror: ((event?: { error?: string }) => void) | null = null;

    constructor(public text: string) {
      utterances.push(this);
    }
  }
  const synthesis = {
    speaking: false,
    pending: false,
    paused: false,
    getVoices: vi.fn(() => []),
    resume: vi.fn(),
    cancel: vi.fn(),
    speak: vi.fn(),
  };
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  Object.defineProperty(window, "SpeechSynthesisUtterance", {
    configurable: true,
    value: FakeUtterance,
  });
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: synthesis,
  });
  vi.useFakeTimers();

  harness.callbacks[5]("alpha");
  const staleUtterance = utterances.at(-1)!;
  synthesis.pending = true;
  harness.callbacks[5]("apple");
  staleUtterance.onstart?.();
  staleUtterance.onend?.();
  staleUtterance.onerror?.();
  harness.refs[8].current.requestId += 1;
  vi.advanceTimersByTime(SPEECH_REPLAY_DELAY_MS);

  synthesis.pending = false;
  harness.callbacks[5]("beta");
  harness.refs[8].current.requestId += 1;
  vi.advanceTimersByTime(SPEECH_START_TIMEOUT_MS);

  synthesis.speak.mockImplementationOnce(() => {
    throw new Error("speech engine crashed");
  });
  harness.callbacks[5]("cat");

  expect(synthesis.cancel).toHaveBeenCalled();
  expect(harness.dispatch).toHaveBeenCalledWith({
    type: "setSpeechNotice",
    message: "Speech could not play. Check media volume and try again.",
  });
});
