// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import App, {
  AuthPanel,
  Brand,
  FieldTripOverlay,
  InventoryOverlay,
  MazeOverlay,
  MonsterArt,
  PressButton,
  ProgressPanel,
  ScoreStrip,
  StageTabs,
  WordCard,
  WordCheckOverlay,
  buildWordCheckCandidateIndices,
  buildWordCheckChoices,
  createWordCheckState,
  creatureKind,
  firstWordLetter,
  fittedWordFontSize,
  initialState,
  phraseReadingDayId,
  randomWordIndex,
  reducer,
  rewardStatus,
  shuffleWords,
  spawnCreature,
} from "./App";
import { api } from "./api";
import { MAZE_LAYOUTS, MAZE_START, TRIP_TARGET, defaultProgress } from "./game";
import type {
  AppAction,
  AppState,
  FieldTripState,
  MazeState,
  WordCheckFeedback,
  WordCheckState,
} from "./App";
import type {
  PhraseForestContent,
  PhraseItemContent,
  ProgressState,
  RewardItem,
  RewardSlot,
  SightWordsContent,
  StageContent,
  User,
} from "./types";
import { SPEECH_REPLAY_DELAY_MS, SPEECH_START_TIMEOUT_MS } from "./app/speech";

vi.mock("./api", () => ({ api: vi.fn() }));

const apiMock = vi.mocked(api);

const user: User = { id: 7, username: "dan", email: "dan@example.com" };
const rewardSlots: RewardSlot[] = ["weapon", "boots", "shield", "cape"];

test("groups Phrase Forest mastery evidence by local reading day", () => {
  expect(phraseReadingDayId(new Date(2026, 6, 21, 12, 30)))
    .toBe("phrase-reading-day-2026-07-21");
});

function createStage(id: number, words = ["alpha", "apple", "beta", "cat"]): StageContent {
  return {
    id,
    title: `Stage ${id}`,
    subtitle: `Hero ${id}`,
    themeClass: id === 1 ? "stage-ancient" : "stage-roman",
    heroName: `Hero ${id}`,
    words,
    rewards: rewardSlots.map((slot, index) => ({
      id: `stage${id}-${slot}`,
      name: `Stage ${id} ${slot}`,
      slot,
      stageId: id,
      milestone: index + 1,
      visualKey: `stage${id}-${slot}`,
    })),
    fieldTrip: {
      title: `Trip ${id}`,
      intro: `Trip ${id} intro`,
      finish: `Stage ${id + 1} unlocked!`,
      creatures: ["Cave Wolf", "Ember Dragon", "Sky Flying Dragon"],
    },
  };
}

function createContent(): SightWordsContent {
  return { version: 1, stages: [createStage(1), createStage(2, ["dog", "door", "eel", "fox"])] };
}

function createPhraseForestContent(): PhraseForestContent {
  const items = Array.from({ length: 75 }, (_, index): PhraseItemContent => ({
    id: `phrase-6-${index + 1}`,
    text: index % 2 === 0 ? "my book" : "your book",
    tokens: index % 2 === 0 ? ["my", "book"] : ["your", "book"],
    contrastKey: "stage-6-book",
    meaningSafe: true,
    accessibilityText: index % 2 === 0 ? "A child holding a book" : "A book for you",
    visual: { kind: "symbol", symbol: index % 2 === 0 ? "🧒 📘" : "👉 📘" },
  }));

  return {
    title: "Phrase Forest",
    subtitle: "Connect words. Restore the forest.",
    stages: [{
      id: 6,
      title: "Stage 6",
      subtitle: "Two-Word Groups",
      areaName: "First Crossing",
      companion: { id: "fox", name: "Fox", emoji: "🦊" },
      restoration: "Forest Footbridge",
      intro: "Pair familiar words to reconnect the first forest path.",
      missionCount: 20,
      chapters: [
        { id: "discover", title: "Discover", missionStart: 1, missionEnd: 5 },
        { id: "practice", title: "Practice", missionStart: 6, missionEnd: 10 },
        { id: "apply", title: "Apply", missionStart: 11, missionEnd: 15 },
        { id: "prove", title: "Prove", missionStart: 16, missionEnd: 20 },
      ],
      practicePhrases: items.slice(0, 60),
      checkpointPhrases: items.slice(60),
    }],
  };
}

function createContentWithPhraseForest(): SightWordsContent {
  return { ...createContentWithoutRewards(), phraseForest: createPhraseForestContent() };
}

function createContentWithoutRewards(): SightWordsContent {
  const content = createContent();
  content.stages.forEach((stage) => {
    stage.rewards = [];
  });
  return content;
}

function createAppState(overrides: Partial<AppState> = {}): AppState {
  const content = createContent();
  return {
    ...initialState,
    content,
    progress: defaultProgress(content),
    user,
    loading: false,
    maze: { ...initialState.maze, position: { ...initialState.maze.position } },
    fieldTrip: { ...initialState.fieldTrip },
    ...overrides,
  };
}

function createCheck(overrides: Partial<WordCheckState> = {}): WordCheckState {
  const content = createContent();
  return {
    stageId: 1,
    targetWordIndex: 0,
    promptWordIndex: 0,
    word: "alpha",
    choices: ["alpha", "apple", "beta", "cat"],
    previousState: defaultProgress(content),
    remainingWordIndices: [1],
    failedWordIndices: [],
    followUpsRemaining: 0,
    ...overrides,
  };
}

function createTrip(overrides: Partial<FieldTripState> = {}): FieldTripState {
  return {
    ...initialState.fieldTrip,
    open: true,
    stageId: 1,
    creature: {
      x: 25,
      name: "Cave Wolf",
      visualKey: "stage1-wolf-0",
      variant: 0,
      kind: "wolf",
    },
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  Reflect.deleteProperty(window, "speechSynthesis");
  vi.useRealTimers();
});

beforeEach(() => {
  apiMock.mockReset();
  const localData = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      get length() {
        return localData.size;
      },
      clear: () => localData.clear(),
      getItem: (key: string) => localData.get(key) ?? null,
      key: (index: number) => [...localData.keys()][index] ?? null,
      removeItem: (key: string) => localData.delete(key),
      setItem: (key: string, value: string) => localData.set(key, String(value)),
    } satisfies Storage,
  });
  document.body.innerHTML = "";
  Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { ready: Promise.resolve() },
  });
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    font: "",
    measureText: () => ({ width: 100 }),
  } as unknown as CanvasRenderingContext2D);
  Object.defineProperty(window, "requestAnimationFrame", {
    configurable: true,
    writable: true,
    value: window.requestAnimationFrame || (() => 1),
  });
  Object.defineProperty(window, "cancelAnimationFrame", {
    configurable: true,
    writable: true,
    value: window.cancelAnimationFrame || (() => undefined),
  });
  vi.spyOn(window, "requestAnimationFrame").mockReturnValue(1);
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

function createVoice(
  overrides: Partial<SpeechSynthesisVoice> = {},
): SpeechSynthesisVoice {
  return {
    default: true,
    lang: "en-US",
    localService: true,
    name: "Android English",
    voiceURI: "android-en-us",
    ...overrides,
  };
}

function installSpeech(voices: SpeechSynthesisVoice[] = []) {
  const utterances: FakeUtterance[] = [];
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
  const speechSynthesis = {
    speaking: false,
    pending: false,
    paused: false,
    getVoices: vi.fn(() => voices),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    resume: vi.fn(),
    cancel: vi.fn(),
    speak: vi.fn(),
  };
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: speechSynthesis,
  });
  return { utterances, speechSynthesis };
}

function mockLoggedInApi(content: SightWordsContent, progress = defaultProgress(content)) {
  apiMock.mockImplementation(async (path, options = {}) => {
    if (path === "/api/content") return content;
    if (path === "/api/me" && options.method === "PUT") {
      return { user: { ...user, email: String((options.body as { email: string }).email) } };
    }
    if (path === "/api/me") return { user };
    if (path === "/api/progress" && options.method === "PUT") {
      return { progress: (options.body as { progress: ProgressState }).progress };
    }
    if (path === "/api/progress") return { progress };
    if (path === "/api/auth/logout") return { ok: true };
    throw new Error(`Unexpected API request: ${path}`);
  });
}

async function renderLoggedInApp(
  content: SightWordsContent = createContentWithoutRewards(),
  progress: ProgressState = defaultProgress(content),
) {
  mockLoggedInApi(content, progress);
  const result = render(<App />);
  const expectedStage = content.stages.find((stage) => stage.id === progress.activeStageId) || content.stages[0];
  await screen.findByRole("heading", { name: expectedStage.title });
  return result;
}

function pathThroughMaze(layout: readonly string[]): Array<"up" | "down" | "left" | "right"> {
  const directions = [
    ["up", -1, 0],
    ["down", 1, 0],
    ["left", 0, -1],
    ["right", 0, 1],
  ] as const;
  const queue: Array<{ row: number; col: number; path: Array<"up" | "down" | "left" | "right"> }> = [
    { row: 0, col: 0, path: [] },
  ];
  const visited = new Set(["0:0"]);

  while (queue.length) {
    const current = queue.shift()!;
    if (current.row === 6 && current.col === 6) return current.path;
    for (const [direction, rowDelta, colDelta] of directions) {
      const row = current.row + rowDelta;
      const col = current.col + colDelta;
      const key = `${row}:${col}`;
      if (row < 0 || row >= layout.length || col < 0 || col >= layout[row].length || layout[row][col] === "#" || visited.has(key)) {
        continue;
      }
      visited.add(key);
      queue.push({ row, col, path: [...current.path, direction] });
    }
  }

  throw new Error("Maze fixture has no path");
}

describe("App reducer", () => {
  test("covers bootstrap, account, message, progress, celebration, and cleanup actions", () => {
    const content = createContent();
    const progress = defaultProgress(content);
    const alternate = structuredClone(progress);
    alternate.activeStageId = 2;
    alternate.phraseForest.unlockedStageIds = [6];
    let state = reducer(initialState, { type: "bootstrapped", content, progress });

    expect(state).toMatchObject({ content, progress, loading: false });
    state = reducer(state, { type: "setActiveWorld", world: "phrases" });
    expect(state.activeWorld).toBe("phrases");
    state = reducer(state, { type: "accountReady", user, message: "ready" });
    expect(state.progress).toBe(progress);
    expect(state.activeWorld).toBe("phrases");
    state = reducer(state, { type: "accountReady", user: null, progress: alternate, message: "signed out" });
    expect(state.progress).toBe(alternate);
    expect(state.activeWorld).toBe("words");
    state = reducer(state, { type: "setUser", user, message: "hello" });
    state = reducer(state, { type: "setActiveWorld", world: "phrases" });
    state = reducer(state, { type: "setProgress", progress: alternate });
    expect(state.activeWorld).toBe("phrases");
    state = reducer(state, { type: "setProgress", progress });
    expect(state.activeWorld).toBe("words");
    expect(state.lastAnswerAction).toBeNull();
    const lastAnswerAction = { stageId: 1, wordIndex: 0, previousState: progress };
    state = reducer(state, { type: "setProgress", progress: alternate, lastAnswerAction });
    expect(state.lastAnswerAction).toBe(lastAnswerAction);
    state = reducer(state, { type: "setProgress", progress, lastAnswerAction: null });
    state = reducer(state, { type: "setAuthMessage", message: "auth" });
    state = reducer(state, { type: "setSpeechNotice", message: "speech" });
    state = reducer(state, { type: "setSpeaking", speaking: true });
    state = reducer(state, { type: "celebrate", message: "great" });
    expect(state).toMatchObject({
      authMessage: "auth",
      speechNotice: "speech",
      speaking: true,
      celebration: "great",
      celebrationKey: 1,
    });
    state = reducer({ ...state, lastAnswerAction }, { type: "clearLastAnswer" });
    expect(state.lastAnswerAction).toBeNull();
    state = reducer({
      ...state,
      maze: { ...state.maze, open: true },
      fieldTrip: createTrip(),
    }, { type: "stopGames" });
    expect(state.maze.open).toBe(false);
    expect(state.fieldTrip).toEqual(initialState.fieldTrip);
    expect(state.speechNotice).toBe("");
    expect(state.speaking).toBe(false);
    expect(reducer(state, { type: "unknown" } as unknown as AppAction)).toBe(state);
  });

  test("covers every maze action", () => {
    const base = createAppState({
      maze: { open: false, position: { row: 4, col: 4 }, message: "old", bumpCount: 3 },
    });
    const opened = reducer(base, { type: "openMaze" });
    expect(opened.maze).toEqual({
      open: true,
      position: MAZE_START,
      message: "Move one square at a time.",
      bumpCount: 3,
    });
    const moved = reducer(opened, {
      type: "moveMaze",
      position: { row: 1, col: 2 },
      message: "move",
    });
    expect(moved.maze.position).toEqual({ row: 1, col: 2 });
    const bumped = reducer(moved, { type: "bumpMaze", message: "blocked" });
    expect(bumped.maze).toMatchObject({ message: "blocked", bumpCount: 4 });
    expect(reducer(bumped, { type: "closeMaze" }).maze.open).toBe(false);
  });

  test("covers field-trip opening, movement, hits, defense, and completion counters", () => {
    const creature = spawnCreature(["Cave Wolf"], 1);
    const closed = createAppState();
    expect(reducer(closed, { type: "moveFieldTrip", direction: "left" })).toBe(closed);

    let state = reducer(closed, {
      type: "openFieldTrip",
      stageId: 1,
      creature,
      message: "start",
    });
    expect(state.fieldTrip).toMatchObject({ open: true, stageId: 1, collected: 0, message: "start" });
    state = reducer({ ...state, fieldTrip: { ...state.fieldTrip, runnerX: 10 } }, {
      type: "moveFieldTrip",
      direction: "left",
    });
    expect(state.fieldTrip.runnerX).toBe(10);
    state = reducer({ ...state, fieldTrip: { ...state.fieldTrip, runnerX: 48 } }, {
      type: "moveFieldTrip",
      direction: "right",
    });
    expect(state.fieldTrip.runnerX).toBe(48);
    state = reducer(state, { type: "moveFieldTrip", direction: "defend" });
    expect(state.fieldTrip).toMatchObject({ defending: true, message: "Shield up! Watch the creature's warning." });

    state = reducer({ ...state, fieldTrip: { ...state.fieldTrip, creature: null } }, {
      type: "moveFieldTrip",
      direction: "hit",
    });
    expect(state.fieldTrip.swinging).toBe(true);

    const farTrip = createTrip({ runnerX: 10, creature: { ...creature, x: 90 } });
    state = reducer({ ...state, fieldTrip: farTrip }, { type: "moveFieldTrip", direction: "hit" });
    expect(state.fieldTrip.message).toBe("Move closer, then hit.");

    const closeTrip = createTrip({ runnerX: 20, collected: 0, creature: { ...creature, x: 21 } });
    state = reducer({ ...state, fieldTrip: closeTrip }, {
      type: "moveFieldTrip",
      direction: "hit",
      creatures: ["Ember Dragon"],
      stageId: 2,
    });
    expect(state.fieldTrip.collected).toBe(1);
    expect(state.fieldTrip.creature?.kind).toBe("dragon");

    state = reducer({
      ...state,
      fieldTrip: createTrip({
        stageId: null,
        runnerX: 20,
        collected: 0,
        creature: { ...creature, x: 20 },
      }),
    }, { type: "moveFieldTrip", direction: "hit" });
    expect(state.fieldTrip.creature?.visualKey).toBe("stage1-wolf-0");

    state = reducer({
      ...state,
      fieldTrip: createTrip({ runnerX: 20, collected: TRIP_TARGET - 1, creature: { ...creature, x: 20 } }),
    }, { type: "moveFieldTrip", direction: "hit" });
    expect(state.fieldTrip).toMatchObject({ collected: TRIP_TARGET, progress: 100, creature: null });
    expect(reducer(state, { type: "clearFieldTripSwing" }).fieldTrip.swinging).toBe(false);
    expect(reducer(state, { type: "clearFieldTripDefense" }).fieldTrip.defending).toBe(false);
    expect(reducer(state, { type: "closeFieldTrip" }).fieldTrip).toEqual(initialState.fieldTrip);
  });

  test("covers field-trip ticks, approach messages, attacks, and blocks", () => {
    const closed = createAppState();
    expect(reducer(closed, { type: "tickFieldTrip", timestamp: 10, creatures: [] })).toBe(closed);
    expect(reducer({ ...closed, fieldTrip: createTrip({ creature: null }) }, {
      type: "tickFieldTrip",
      timestamp: 10,
      creatures: [],
    })).toBeDefined();

    let state = reducer({
      ...closed,
      fieldTrip: createTrip({ runnerX: 20, lastTime: 0, attackCharge: 0 }),
    }, { type: "tickFieldTrip", timestamp: 100, creatures: [] });
    expect(state.fieldTrip.lastTime).toBe(100);
    expect(state.fieldTrip.message).toContain("close");

    state = reducer({
      ...state,
      fieldTrip: createTrip({ runnerX: 80, lastTime: 100, creature: { ...createTrip().creature!, x: 10 } }),
    }, { type: "tickFieldTrip", timestamp: 300, creatures: [] });
    expect(state.fieldTrip.creature!.x).toBeGreaterThan(10);

    state = reducer({
      ...state,
      fieldTrip: createTrip({ runnerX: 20, lastTime: 100, attackCharge: 640 }),
    }, { type: "tickFieldTrip", timestamp: 120, creatures: [] });
    expect(state.fieldTrip.message).toContain("about to attack");

    state = reducer({
      ...state,
      fieldTrip: createTrip({ runnerX: 20, lastTime: 100, attackCharge: 1_690, defending: false }),
    }, { type: "tickFieldTrip", timestamp: 120, creatures: [] });
    expect(state.fieldTrip.message).toContain("pushed you back");
    expect(state.fieldTrip.attackEffectKey).toBe(1);

    state = reducer({
      ...state,
      fieldTrip: createTrip({ runnerX: 20, lastTime: 100, attackCharge: 1_690, defending: true }),
    }, { type: "tickFieldTrip", timestamp: 120, creatures: [] });
    expect(state.fieldTrip.message).toContain("Great block");
    expect(state.fieldTrip.blockEffectKey).toBe(1);

    state = reducer({
      ...state,
      fieldTrip: createTrip({ runnerX: 20, lastTime: 100, attackCharge: 0, creature: { ...createTrip().creature!, x: 70 } }),
    }, { type: "tickFieldTrip", timestamp: 120, creatures: [] });
    expect(state.fieldTrip.message).toBe(initialState.fieldTrip.message);
  });
});

describe("App pure helpers", () => {
  test("builds reward status for pending, ready, singular, plural, and completed rewards", () => {
    const stage = createStage(1);
    const progress = defaultProgress(createContent()).stages["1"];
    progress.pendingReward = { milestone: 1, itemId: stage.rewards[0].id };
    expect(rewardStatus(stage, progress)).toContain(stage.rewards[0].name);
    progress.pendingReward = { milestone: 1, itemId: "missing" };
    expect(rewardStatus(stage, progress)).toBe("Find the treasure chest to claim the reward.");
    progress.pendingReward = null;
    expect(rewardStatus(stage, progress)).toContain("1 more known word");
    progress.knownWords = [stage.words[0]];
    expect(rewardStatus(stage, progress)).toContain("Treasure is ready");
    progress.completedMazeMilestones = [1];
    expect(rewardStatus(stage, progress)).toContain("1 more known word");
    progress.knownWords = [];
    expect(rewardStatus(stage, progress)).toContain("2 more known words");
    progress.completedMazeMilestones = stage.rewards.map((reward) => reward.milestone);
    expect(rewardStatus(stage, progress)).toBe("All treasure gear found for this stage.");
  });

  test("selects and creates deterministic quick word checks", () => {
    const content = createContent();
    const stage = content.stages[0];
    const progress = defaultProgress(content);
    const stageState = progress.stages["1"];
    stageState.knownWords = ["alpha", "apple"];

    expect(buildWordCheckCandidateIndices(stage, stageState, [-1, 0, 0, 1, 99], 2))
      .toEqual([0, 1, 2]);
    vi.spyOn(Math, "random").mockReturnValue(0);
    const check = createWordCheckState({
      stage,
      targetWordIndex: 2,
      candidateWordIndices: [-1, 0, 0, 99],
      previousState: progress,
      failedWordIndices: [1],
      followUpsRemaining: 2,
    });
    expect(check).toMatchObject({ promptWordIndex: 0, word: "alpha", failedWordIndices: [1] });
    expect(check?.remainingWordIndices).toEqual([]);
    expect(createWordCheckState({
      stage,
      targetWordIndex: 0,
      candidateWordIndices: [],
      previousState: progress,
      failedWordIndices: [],
      followUpsRemaining: 0,
    })).toBeNull();
    expect(buildWordCheckChoices(stage, "alpha")).toEqual(expect.arrayContaining(stage.words));
    expect(firstWordLetter("  Apple")).toBe("a");
    expect(firstWordLetter("123")).toBe("");
    expect(shuffleWords(["a", "b"])).toEqual(["b", "a"]);
    expect(randomWordIndex([3, 4])).toBe(3);
    expect(randomWordIndex([])).toBeNull();
  });

  test("creates all creature artwork kinds and fallback creatures", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(creatureKind("Cloud Flying Dragon")).toBe("flying-dragon");
    expect(creatureKind("Ember Dragon")).toBe("dragon");
    expect(creatureKind("Cave Wolf")).toBe("wolf");
    expect(spawnCreature([], 3)).toMatchObject({ name: "monster", kind: "wolf", variant: 0 });
    expect(spawnCreature([""], 3).name).toBe("monster");
    expect(spawnCreature(["Ember Dragon"], 2)).toMatchObject({
      visualKey: "stage2-dragon-0",
      kind: "dragon",
    });
  });

  test("fits word text with browser, canvas, and fallback sizing branches", () => {
    expect(fittedWordFontSize("word", 0)).toBe(168);
    const context = {
      font: "",
      measureText: vi.fn().mockReturnValue({ width: 1_000 }),
    };
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValueOnce(null)
      .mockReturnValue(context as unknown as CanvasRenderingContext2D);
    expect(fittedWordFontSize("word", 500)).toBe(168);
    expect(fittedWordFontSize("word", 500)).toBe(81);
    context.measureText.mockReturnValue({ width: 0 });
    expect(fittedWordFontSize("word", 50)).toBe(168);
    context.measureText.mockReturnValue({ width: 10_000 });
    expect(fittedWordFontSize("word", 121)).toBe(38);
    expect(fittedWordFontSize("word", 500, 36, 18)).toBe(18);
    expect(getContext).toHaveBeenCalled();
  });
});

describe("App integration", () => {
  test("shows loading, handles a content failure, and ignores a late bootstrap after unmount", async () => {
    apiMock.mockRejectedValueOnce(new Error("content down"));
    const first = render(<App />);
    expect(screen.getByRole("heading", { name: "Loading..." })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("could not load"));
    first.unmount();

    let resolveContent!: (content: SightWordsContent) => void;
    apiMock.mockReset();
    apiMock.mockImplementationOnce(() => new Promise((resolve) => {
      resolveContent = resolve as (content: SightWordsContent) => void;
    }));
    const second = render(<App />);
    second.unmount();
    resolveContent(createContent());
    await Promise.resolve();
  });

  test("boots logged out, blocks play, reports login errors, and signs up", async () => {
    const content = createContentWithoutRewards();
    let signup = false;
    apiMock.mockImplementation(async (path) => {
      if (path === "/api/content") return content;
      if (path === "/api/me") return { user: null };
      if (path === "/api/auth/login") throw new Error("Wrong password");
      if (path === "/api/auth/signup") {
        signup = true;
        return { user, progress: defaultProgress(content) };
      }
      throw new Error(`Unexpected API request: ${path}`);
    });
    render(<App />);
    await screen.findByRole("heading", { name: "Sign up or log in" });
    expect(screen.getAllByRole("status").some((node) => node.textContent?.includes("Log in or sign up"))).toBe(true);

    for (const name of ["I know it", "Practice again", "Back to previous word", "Shuffle words"]) {
      fireEvent.click(screen.getByRole("button", { name }));
      expect(screen.getAllByRole("status").some((node) => node.textContent?.includes("Log in or sign up to play"))).toBe(true);
    }
    fireEvent.keyDown(document, { key: "ArrowRight" });
    fireEvent.click(screen.getByRole("button", { name: /Stage 1/ }));

    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "dan" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "bad" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    await screen.findByText("Wrong password");
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "good" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign up" }));
    await screen.findByText("dan");
    expect(signup).toBe(true);
  });

  test("unlocks Phrase Forest after Word Academy and switches safely between worlds", async () => {
    const content = createContentWithPhraseForest();
    const lockedProgress = defaultProgress(content);
    const first = await renderLoggedInApp(content, lockedProgress);
    const lockedButton = screen.getByRole("button", { name: /Phrase Forest/ });

    expect(lockedButton).toBeDisabled();
    expect(lockedButton).toHaveTextContent("Complete 1,000 words");
    lockedButton.removeAttribute("disabled");
    fireEvent.click(lockedButton);
    expect(screen.getByLabelText("Current word: alpha")).toBeInTheDocument();
    first.unmount();

    const completeProgress = defaultProgress(content);
    content.stages.forEach((stage) => {
      completeProgress.stages[String(stage.id)].knownWords = [...stage.words];
    });
    await renderLoggedInApp(content, completeProgress);

    const phraseButton = screen.getByRole("button", { name: /Phrase Forest/ });
    expect(phraseButton).toBeEnabled();
    expect(phraseButton).toHaveTextContent("Stages 6-10");
    fireEvent.click(phraseButton);

    await screen.findByRole("heading", { name: "Choose the bridge supply" });
    expect(screen.getByRole("heading", { name: "Stage 6" })).toBeInTheDocument();
    expect(screen.getAllByText("First Crossing")).toHaveLength(2);
    expect(document.body).toHaveClass("phrase-forest");

    fireEvent.click(screen.getByRole("button", { name: /Word Academy/ }));
    await screen.findByLabelText("Current word: alpha");
    expect(document.body).toHaveClass("stage-ancient");
  });

  test("handles speech fallbacks and callbacks, word actions, undo, navigation, shuffle, and stage selection", async () => {
    const content = createContentWithoutRewards();
    const progress = defaultProgress(content);
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    await renderLoggedInApp(content, progress);

    fireEvent.click(screen.getByRole("button", { name: "Play word" }));
    expect(screen.getByText("Speech is not available in this browser.")).toBeInTheDocument();

    const androidVoice = createVoice();
    const speech = installSpeech([androidVoice]);
    fireEvent.click(screen.getByRole("button", { name: "Play word" }));
    const utterance = speech.utterances.at(-1)!;
    expect(utterance).toMatchObject({
      text: "alpha",
      lang: "en-US",
      rate: 0.76,
      pitch: 1,
      volume: 1,
      voice: androidVoice,
    });
    expect(speech.speechSynthesis.cancel).not.toHaveBeenCalled();
    expect(speech.speechSynthesis.resume).toHaveBeenCalledOnce();
    speech.speechSynthesis.pending = true;
    fireEvent.click(screen.getByRole("button", { name: "Play word" }));
    expect(speech.speechSynthesis.cancel).toHaveBeenCalled();
    act(() => utterance.onstart?.());
    act(() => utterance.onend?.());
    act(() => utterance.onerror?.());
    await waitFor(() => expect(speech.speechSynthesis.speak).toHaveBeenCalledTimes(2), {
      timeout: SPEECH_REPLAY_DELAY_MS + 500,
    });
    const replayedUtterance = speech.utterances.at(-1)!;
    act(() => replayedUtterance.onstart?.());
    expect(document.body).toHaveClass("is-speaking");
    act(() => replayedUtterance.onend?.());
    expect(document.body).not.toHaveClass("is-speaking");
    act(() => replayedUtterance.onerror?.({ error: "network" }));
    expect(screen.getByText("This speech voice needs an internet connection. Check the connection and try again.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Practice again" }));
    await screen.findByText("Practice", { selector: ".word-state" });
    expect(screen.getByRole("button", { name: "Undo last answer and go back" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Undo last answer and go back" }));
    await screen.findByText("Answer undone");
    fireEvent.click(screen.getByRole("button", { name: "Back to previous word" }));
    expect(screen.getByLabelText("Current word: cat")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next word" }));
    fireEvent.click(screen.getByRole("button", { name: "Shuffle words" }));

  });

  test("reports a silent device speech engine instead of leaving Android users without feedback", async () => {
    const content = createContentWithoutRewards();
    await renderLoggedInApp(content, defaultProgress(content));
    const speech = installSpeech();
    vi.useFakeTimers();

    fireEvent.click(screen.getByRole("button", { name: "Play word" }));
    expect(speech.speechSynthesis.speak).toHaveBeenCalledOnce();
    act(() => vi.advanceTimersByTime(SPEECH_START_TIMEOUT_MS));

    expect(screen.getByText(/No sound started.*enable text-to-speech/i)).toBeInTheDocument();
    expect(speech.speechSynthesis.cancel).toHaveBeenCalledOnce();
  });

  test("selects an unlocked stage and applies its theme", async () => {
    const content = createContentWithoutRewards();
    const progress = defaultProgress(content);
    progress.stages["1"].knownWords = [...content.stages[0].words];
    progress.stages["1"].fieldTripCompleted = true;
    await renderLoggedInApp(content, progress);
    fireEvent.click(screen.getByRole("button", { name: /Stage 2/ }));
    await screen.findByRole("heading", { name: "Stage 2" });
    expect(document.body).toHaveClass("stage-roman");
  });

  test("updates account email, handles save failures, confirms resets, and logs out despite request failure", async () => {
    const content = createContentWithoutRewards();
    const progress = defaultProgress(content);
    let emailSaveCount = 0;
    mockLoggedInApi(content, progress);
    apiMock.mockImplementation(async (path, options = {}) => {
      if (path === "/api/content") return content;
      if (path === "/api/me" && options.method === "PUT") {
        emailSaveCount += 1;
        if (emailSaveCount === 2) throw new Error("Email failed");
        return { user: { ...user, email: (options.body as { email: string }).email } };
      }
      if (path === "/api/me") return { user };
      if (path === "/api/progress" && options.method === "PUT") {
        return { progress: (options.body as { progress: ProgressState }).progress };
      }
      if (path === "/api/progress") return { progress };
      if (path === "/api/auth/logout") throw new Error("logout network error");
      throw new Error(`Unexpected API request: ${path}`);
    });
    render(<App />);
    await screen.findByText("dan");

    const email = screen.getByLabelText("Email");
    fireEvent.change(email, { target: { value: "new@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Account settings saved.");
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "bad@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("Email failed");

    vi.mocked(window.confirm).mockReturnValueOnce(false).mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole("button", { name: /Reset all progress/ }));
    expect(window.confirm).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: /Reset all progress/ }));
    await waitFor(() => expect(apiMock).toHaveBeenCalledWith(
      "/api/progress",
      expect.objectContaining({ method: "PUT" }),
    ));

    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    await screen.findByRole("heading", { name: "Sign up or log in" });
    expect(screen.getByText(/Logged out/)).toBeInTheDocument();
  });

  test("saves offline, retries on online and visibility events, and reports storage failure", async () => {
    const content = createContentWithoutRewards();
    const progress = defaultProgress(content);
    mockLoggedInApi(content, progress);
    await renderLoggedInApp(content, progress);
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false });
    fireEvent.click(screen.getByRole("button", { name: "Practice again" }));
    await screen.findByText("Offline. Progress is saved on this device and will sync automatically.");
    expect(window.localStorage.getItem("danSightWords:offline:v1:7")).not.toBeNull();

    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    fireEvent(window, new Event("online"));
    await screen.findByText("Back online. Progress synced.");
    expect(window.localStorage.getItem("danSightWords:offline:v1:7")).toBeNull();
    fireEvent(window, new Event("focus"));
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    fireEvent(document, new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    fireEvent(document, new Event("visibilitychange"));

    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false });
    vi.spyOn(window.localStorage, "setItem").mockImplementationOnce(() => {
      throw new Error("storage blocked");
    });
    fireEvent.click(screen.getByRole("button", { name: "Practice again" }));
    await screen.findByText("Server unavailable. Keep this page open so progress can retry.");
  });

  test("queues failed online saves and synchronizes them on retry", async () => {
    const content = createContentWithoutRewards();
    const progress = defaultProgress(content);
    let putCount = 0;
    apiMock.mockImplementation(async (path, options = {}) => {
      if (path === "/api/content") return content;
      if (path === "/api/me") return { user };
      if (path === "/api/progress" && !options.method) return { progress };
      if (path === "/api/progress") {
        putCount += 1;
        if (putCount === 1) throw new Error("offline");
        return { progress: (options.body as { progress: ProgressState }).progress };
      }
      throw new Error(`Unexpected API request: ${path}`);
    });
    render(<App />);
    await screen.findByText("dan");
    fireEvent.click(screen.getByRole("button", { name: "Practice again" }));
    await screen.findByText("Offline. Progress is saved on this device and will sync automatically.");
    fireEvent(window, new Event("online"));
    await screen.findByText("Back online. Progress synced.");
    expect(putCount).toBe(2);
  });

  test("reports storage failures after a failed online save", async () => {
    const content = createContentWithoutRewards();
    const progress = defaultProgress(content);
    apiMock.mockImplementation(async (path, options = {}) => {
      if (path === "/api/content") return content;
      if (path === "/api/me") return { user };
      if (path === "/api/progress" && !options.method) return { progress };
      if (path === "/api/progress") throw new Error("server down");
      throw new Error(`Unexpected API request: ${path}`);
    });
    render(<App />);
    await screen.findByText("dan");
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });

    fireEvent.click(screen.getByRole("button", { name: "Practice again" }));

    await screen.findByText("Server unavailable. Keep this page open so progress can retry.");
  });

  test("claims a pending maze reward exactly once, reveals it, continues, and manages inventory", async () => {
    const content = createContent();
    const progress = defaultProgress(content);
    const stage = content.stages[0];
    progress.stages["1"].knownWords = [stage.words[0]];
    progress.stages["1"].pendingReward = {
      milestone: stage.rewards[0].milestone,
      itemId: stage.rewards[0].id,
    };
    const speech = installSpeech();
    mockLoggedInApi(content, progress);
    render(<App />);
    await screen.findByRole("dialog", { name: "Find the treasure chest" });
    expect(document.body).toHaveClass("maze-is-open");

    fireEvent.keyDown(document, { key: "x" });
    fireEvent.keyDown(document, { key: "ArrowLeft" });
    expect(screen.getByText("That path is blocked. Try another way.")).toBeInTheDocument();
    expect(screen.getByRole("grid")).toHaveClass("is-bumped");

    const keyForDirection = {
      up: "ArrowUp",
      down: "ArrowDown",
      left: "ArrowLeft",
      right: "ArrowRight",
    } as const;
    for (const direction of pathThroughMaze(MAZE_LAYOUTS[0])) {
      fireEvent.keyDown(document, { key: keyForDirection[direction] });
    }

    await screen.findByRole("dialog", { name: stage.rewards[0].name });
    expect(document.body).toHaveClass("reward-reveal-is-open");
    fireEvent.keyDown(document, { key: "ArrowRight" });
    const progressWritesBeforeContinue = apiMock.mock.calls.filter(
      ([path, options]) => path === "/api/progress" && options?.method === "PUT",
    );
    expect(progressWritesBeforeContinue).toHaveLength(1);
    expect(progressWritesBeforeContinue[0][1]?.body).toEqual(expect.objectContaining({
      progress: expect.objectContaining({
        stages: expect.objectContaining({
          1: expect.objectContaining({
            unlockedItems: [stage.rewards[0].id],
            equippedItems: [stage.rewards[0].id],
            pendingReward: null,
          }),
        }),
      }),
    }));

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: stage.rewards[0].name })).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Open inventory/ }));
    expect(document.body).toHaveClass("inventory-is-open");
    const equippedButton = screen.getByRole("button", { name: `${stage.rewards[0].name}, equipped` });
    fireEvent.click(equippedButton);
    await waitFor(() => expect(screen.getByRole("button", { name: `${stage.rewards[0].name}, not equipped` })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: `${stage.rewards[0].name}, not equipped` }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.body).not.toHaveClass("inventory-is-open");
    fireEvent.click(screen.getByRole("button", { name: /Open inventory/ }));
    fireEvent.click(screen.getByRole("button", { name: "Close inventory" }));
    fireEvent(window, new Event("beforeunload"));
    expect(speech.speechSynthesis.cancel).toHaveBeenCalled();
  });

  test("opens and completes a field trip with pointer and keyboard controls", async () => {
    const content = createContentWithoutRewards();
    const progress = defaultProgress(content);
    progress.stages["1"].knownWords = [...content.stages[0].words];
    let animationFrame: FrameRequestCallback | null = null;
    vi.mocked(window.requestAnimationFrame).mockImplementation((callback) => {
      animationFrame = callback;
      return 9;
    });
    vi.spyOn(Math, "random").mockReturnValue(0);
    await renderLoggedInApp(content, progress);
    fireEvent.click(screen.getByRole("button", { name: `Start ${content.stages[0].fieldTrip.title}` }));
    await screen.findByRole("dialog", { name: content.stages[0].fieldTrip.title });
    expect(document.body).toHaveClass("trip-is-open");

    fireEvent.keyDown(document, { key: "q" });
    fireEvent.keyDown(document, { key: "Enter" });
    expect(screen.getByText("Move closer, then hit.")).toBeInTheDocument();
    vi.useFakeTimers();
    fireEvent.keyDown(document, { key: "ArrowDown" });
    expect(screen.getByText("Shield up! Watch the creature's warning.")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1_300));
    vi.useRealTimers();

    for (let index = 0; index < 5; index += 1) {
      fireEvent.pointerDown(screen.getByRole("button", { name: "Move right" }));
    }
    let timestamp = 0;
    for (let collected = 1; collected <= TRIP_TARGET; collected += 1) {
      act(() => {
        for (let frame = 0; frame < 28; frame += 1) {
          timestamp += 50;
          animationFrame?.(timestamp);
        }
      });
      fireEvent.keyDown(document, { key: " " });
      if (collected < TRIP_TARGET) {
        expect(screen.getByText(new RegExp(`${collected}/${TRIP_TARGET}`))).toBeInTheDocument();
      }
    }

    await screen.findByRole("heading", { name: "Stage 2" });
    expect(screen.getByText(content.stages[0].fieldTrip.finish)).toBeInTheDocument();
    expect(document.body).not.toHaveClass("trip-is-open");
    expect(window.cancelAnimationFrame).toHaveBeenCalledWith(9);
  });

  test("recovers offline progress during boot and authentication, including failed sync", async () => {
    const content = createContentWithoutRewards();
    const offline = defaultProgress(content);
    offline.stages["1"].practiceWords = [content.stages[0].words[0]];
    window.localStorage.setItem(
      "danSightWords:offline:v1:7",
      JSON.stringify({ userId: 7, progress: offline }),
    );
    let bootPutCount = 0;
    apiMock.mockImplementation(async (path, options = {}) => {
      if (path === "/api/content") return content;
      if (path === "/api/me") return { user };
      if (path === "/api/progress" && !options.method) return { progress: defaultProgress(content) };
      if (path === "/api/progress") {
        bootPutCount += 1;
        return { progress: offline };
      }
      throw new Error(`Unexpected API request: ${path}`);
    });
    const first = render(<App />);
    await screen.findByText("Back online. Progress synced.");
    expect(screen.getByText("Practice", { selector: ".word-state" })).toBeInTheDocument();
    expect(bootPutCount).toBe(1);
    first.unmount();

    window.localStorage.setItem(
      "danSightWords:offline:v1:7",
      JSON.stringify({ userId: 7, progress: offline }),
    );
    apiMock.mockReset();
    apiMock.mockImplementation(async (path, options = {}) => {
      if (path === "/api/content") return content;
      if (path === "/api/me") return { user };
      if (path === "/api/progress" && !options.method) throw new Error("server down");
      throw new Error("sync down");
    });
    const second = render(<App />);
    await screen.findByText("Offline. Progress is saved on this device and will sync automatically.");
    second.unmount();

    apiMock.mockReset();
    apiMock.mockImplementation(async (path) => {
      if (path === "/api/content") return content;
      if (path === "/api/me") return { user: null };
      if (path === "/api/auth/login") return { user, progress: defaultProgress(content) };
      if (path === "/api/progress") throw new Error("still down");
      throw new Error(`Unexpected API request: ${path}`);
    });
    render(<App />);
    await screen.findByRole("heading", { name: "Sign up or log in" });
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "dan" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "pass" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    await screen.findByText("Offline. Progress is saved on this device and will sync automatically.");
  });

  test("synchronizes offline progress during login and keeps it queued when boot sync fails", async () => {
    const content = createContentWithoutRewards();
    const offline = defaultProgress(content);
    offline.stages["1"].practiceWords = [content.stages[0].words[0]];
    window.localStorage.setItem(
      "danSightWords:offline:v1:7",
      JSON.stringify({ userId: 7, progress: offline }),
    );
    apiMock.mockImplementation(async (path, options = {}) => {
      if (path === "/api/content") return content;
      if (path === "/api/me") return { user: null };
      if (path === "/api/auth/login") return { user, progress: defaultProgress(content) };
      if (path === "/api/progress" && options.method === "PUT") return { progress: offline };
      throw new Error(`Unexpected API request: ${path}`);
    });
    const first = render(<App />);
    await screen.findByRole("heading", { name: "Sign up or log in" });
    fireEvent.change(screen.getByLabelText("Username"), { target: { value: "dan" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "pass" } });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));
    await screen.findByText("Back online. Progress synced.", {}, { timeout: 3_000 });
    first.unmount();

    window.localStorage.setItem(
      "danSightWords:offline:v1:7",
      JSON.stringify({ userId: 7, progress: offline }),
    );
    apiMock.mockReset();
    apiMock.mockImplementation(async (path, options = {}) => {
      if (path === "/api/content") return content;
      if (path === "/api/me") return { user };
      if (path === "/api/progress" && !options.method) return { progress: defaultProgress(content) };
      if (path === "/api/progress") throw new Error("sync failed");
      throw new Error(`Unexpected API request: ${path}`);
    });
    render(<App />);
    await screen.findByText("Offline. Progress is saved on this device and will sync automatically.");
  });

  test("falls back cleanly when account and progress bootstrap requests fail", async () => {
    const content = createContentWithoutRewards();
    apiMock.mockResolvedValueOnce(content).mockRejectedValueOnce(new Error("me down"));
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: false });
    const first = render(<App />);
    await screen.findByText("Server unavailable. Reconnect to log in.");
    first.unmount();

    apiMock.mockReset();
    apiMock.mockResolvedValueOnce(content)
      .mockResolvedValueOnce({ user })
      .mockRejectedValueOnce(new Error("progress down"));
    Object.defineProperty(window.navigator, "onLine", { configurable: true, value: true });
    const second = render(<App />);
    await screen.findByText("Log in or sign up to play.");
    second.unmount();

    let resolveMe!: (value: { user: User }) => void;
    apiMock.mockReset();
    apiMock.mockResolvedValueOnce(content).mockImplementationOnce(() => new Promise((resolve) => {
      resolveMe = resolve as (value: { user: User }) => void;
    }));
    const third = render(<App />);
    await screen.findByRole("heading", { name: "Sign up or log in" });
    third.unmount();
    resolveMe({ user });
    await Promise.resolve();
  });

  test("creates milestone mazes and handles next-stage and final-stage completion", async () => {
    const content = createContent();
    vi.spyOn(Math, "random").mockReturnValue(0.9);
    const first = await renderLoggedInApp(content);
    fireEvent.click(screen.getByRole("button", { name: "I know it" }));
    await screen.findByText("You knew it!");
    await screen.findByRole("dialog", { name: "Find the treasure chest" }, { timeout: 1_000 });
    first.unmount();

    const noRewards = createContentWithoutRewards();
    const nearlyComplete = defaultProgress(noRewards);
    nearlyComplete.stages["1"].knownWords = noRewards.stages[0].words.slice(0, -1);
    nearlyComplete.stages["1"].currentIndex = noRewards.stages[0].words.length - 1;
    const second = await renderLoggedInApp(noRewards, nearlyComplete);
    fireEvent.click(screen.getByRole("button", { name: "I know it" }));
    await screen.findByRole("dialog", { name: noRewards.stages[0].fieldTrip.title }, { timeout: 1_200 });
    second.unmount();

    const finalProgress = defaultProgress(noRewards);
    finalProgress.stages["1"].knownWords = [...noRewards.stages[0].words];
    finalProgress.stages["1"].fieldTripCompleted = true;
    finalProgress.activeStageId = 2;
    finalProgress.stages["2"].knownWords = noRewards.stages[1].words.slice(0, -1);
    finalProgress.stages["2"].currentIndex = noRewards.stages[1].words.length - 1;
    await renderLoggedInApp(noRewards, finalProgress);
    fireEvent.click(screen.getByRole("button", { name: "I know it" }));
    await screen.findByText("All stages complete!");
  });

  test("announces Phrase Forest when the final Word Academy word is completed", async () => {
    const content = createContentWithPhraseForest();
    const progress = defaultProgress(content);
    vi.spyOn(Math, "random").mockReturnValue(0.9);

    progress.stages["1"].knownWords = [...content.stages[0].words];
    progress.stages["1"].fieldTripCompleted = true;
    progress.activeStageId = 2;
    progress.stages["2"].knownWords = content.stages[1].words.slice(0, -1);
    progress.stages["2"].currentIndex = content.stages[1].words.length - 1;

    await renderLoggedInApp(content, progress);
    fireEvent.click(screen.getByRole("button", { name: "I know it" }));

    await screen.findByText("Phrase Forest unlocked!");
    expect(screen.getByRole("button", { name: /Phrase Forest/ })).toBeEnabled();
  });

  test("cleans up active quiz and defense timers on logout and unmount", async () => {
    const content = createContentWithoutRewards();
    vi.spyOn(Math, "random").mockReturnValue(0);
    const first = await renderLoggedInApp(content);
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "I know it" }));
    fireEvent.click(screen.getByRole("button", { name: "beta" }));
    fireEvent.click(screen.getByRole("button", { name: "Log out" }));
    act(() => vi.runOnlyPendingTimers());
    vi.useRealTimers();
    first.unmount();

    const progress = defaultProgress(content);
    progress.stages["1"].knownWords = [...content.stages[0].words];
    const second = await renderLoggedInApp(content, progress);
    fireEvent.click(screen.getByRole("button", { name: `Start ${content.stages[0].fieldTrip.title}` }));
    vi.useFakeTimers();
    fireEvent.pointerDown(screen.getByRole("button", { name: "Defend with shield" }));
    second.unmount();
    act(() => vi.runAllTimers());
  });

  test("finishes a failed single-candidate quick check by scheduling the next word", async () => {
    const content = createContentWithoutRewards();
    await renderLoggedInApp(content);
    vi.spyOn(Math, "random").mockReturnValue(0);
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "I know it" }));
    fireEvent.click(screen.getByRole("button", { name: "beta" }));
    act(() => vi.advanceTimersByTime(4_000));
    expect(screen.queryByRole("dialog", { name: "Which word did you hear?" })).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(900));
  });

  test("runs sequential quick checks without retaining the previous selection", async () => {
    const content = createContentWithoutRewards();
    await renderLoggedInApp(content);
    const random = vi.spyOn(Math, "random");

    random.mockReturnValue(0.9);
    fireEvent.click(screen.getByRole("button", { name: "I know it" }));
    await screen.findByText("You knew it!");
    random.mockReturnValue(0);
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    expect(screen.getByLabelText("Current word: apple")).toBeInTheDocument();

    random.mockReturnValue(0.9);
    fireEvent.click(screen.getByRole("button", { name: "I know it" }));
    random.mockReturnValue(0);
    await new Promise((resolve) => window.setTimeout(resolve, 900));
    expect(screen.getByLabelText("Current word: beta")).toBeInTheDocument();

    random.mockReturnValue(0);
    fireEvent.click(screen.getByRole("button", { name: "I know it" }));
    await screen.findByRole("dialog", { name: "Which word did you hear?" });
    fireEvent.click(screen.getByRole("button", { name: "beta" }));
    expect(screen.getByText("Not quite. The correct word is \"alpha\".")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Play alpha" }));
    await new Promise((resolve) => window.setTimeout(resolve, 4_100));

    const appleButton = screen.getByRole("button", { name: "apple" });
    expect(appleButton).not.toHaveClass("is-wrong", "is-correct");
    fireEvent.click(appleButton);
    expect(screen.getByText("Correct")).toBeInTheDocument();
    await new Promise((resolve) => window.setTimeout(resolve, 1_600));

    const finalBeta = screen.getByRole("button", { name: "beta" });
    expect(finalBeta).not.toHaveClass("is-wrong", "is-correct");
    fireEvent.click(finalBeta);
    await new Promise((resolve) => window.setTimeout(resolve, 1_600));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Which word did you hear?" })).not.toBeInTheDocument());
  }, 15_000);
});

describe("presentational components", () => {
  test("renders brand, score metrics, stage tabs, and tab interaction", async () => {
    const content = createContent();
    const progress = defaultProgress(content);
    progress.unlockedStageIds = [1, 2];
    progress.activeStageId = 2;
    progress.stages["1"].knownWords = ["alpha"];
    const onSelect = vi.fn();
    const browserUser = userEvent.setup();
    const { rerender } = render(<Brand subtitle="Sub" title="Title" />);
    expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
    rerender(<ScoreStrip known={1} practice={2} left={3} total={4} />);
    expect(screen.getByLabelText("Progress summary")).toHaveTextContent(/1Known2Practice3Left4Total/);
    rerender(<StageTabs content={content} progress={progress} onSelect={onSelect} />);
    const stageOne = screen.getByRole("button", { name: /Stage 1/ });
    expect(screen.getByRole("button", { name: /Stage 2/ })).toHaveClass("is-active");
    await browserUser.click(stageOne);
    expect(onSelect).toHaveBeenCalledWith(1);
    progress.unlockedStageIds = [1];
    rerender(<StageTabs content={content} progress={progress} onSelect={onSelect} />);
    expect(screen.getByRole("button", { name: /Stage 2/ })).toBeDisabled();
  });

  test("handles logged-out authentication and signup forms", async () => {
    const onAuthenticate = vi.fn();
    const browserUser = userEvent.setup();
    render(
      <AuthPanel
        user={null}
        message="Please log in"
        onAuthenticate={onAuthenticate}
        onUpdateEmail={() => undefined}
        onLogout={() => undefined}
        onResetProgress={() => undefined}
      />,
    );
    await browserUser.type(screen.getByLabelText("Username"), "dan");
    await browserUser.type(screen.getByLabelText("Password"), "secret");
    await browserUser.click(screen.getByRole("button", { name: "Log in" }));
    expect(onAuthenticate).toHaveBeenCalledWith("login", "dan", "secret");
    expect(screen.getByLabelText("Password")).toHaveValue("");
    await browserUser.type(screen.getByLabelText("Password"), "newpass");
    await browserUser.click(screen.getByRole("button", { name: "Sign up" }));
    expect(onAuthenticate).toHaveBeenLastCalledWith("signup", "dan", "newpass");
  });

  test("handles account settings, logout, reset, and changing account email props", async () => {
    const onUpdateEmail = vi.fn();
    const onLogout = vi.fn();
    const onResetProgress = vi.fn();
    const browserUser = userEvent.setup();
    const { rerender } = render(
      <AuthPanel
        user={user}
        message="Ready"
        onAuthenticate={() => undefined}
        onUpdateEmail={onUpdateEmail}
        onLogout={onLogout}
        onResetProgress={onResetProgress}
      />,
    );
    const email = screen.getByLabelText("Email");
    expect(email).toHaveValue("dan@example.com");
    await browserUser.clear(email);
    await browserUser.type(email, "new@example.com");
    await browserUser.click(screen.getByRole("button", { name: "Save" }));
    expect(onUpdateEmail).toHaveBeenCalledWith("new@example.com");
    await browserUser.click(screen.getByRole("button", { name: "Log out" }));
    await browserUser.click(screen.getByRole("button", { name: /Reset all progress/ }));
    expect(onLogout).toHaveBeenCalledOnce();
    expect(onResetProgress).toHaveBeenCalledOnce();
    rerender(
      <AuthPanel
        user={{ ...user, email: null }}
        message="Ready"
        onAuthenticate={() => undefined}
        onUpdateEmail={onUpdateEmail}
        onLogout={onLogout}
        onResetProgress={onResetProgress}
      />,
    );
    await waitFor(() => expect(screen.getByLabelText("Email")).toHaveValue(""));
  });

  test("renders and resizes every WordCard state with and without browser observers", async () => {
    const content = createContent();
    const stage = content.stages[0];
    const stageState = defaultProgress(content).stages["1"];
    let observerCallback: ResizeObserverCallback | null = null;
    const disconnect = vi.fn();
    vi.stubGlobal("ResizeObserver", class {
      constructor(callback: ResizeObserverCallback) {
        observerCallback = callback;
      }
      observe = vi.fn();
      disconnect = disconnect;
      unobserve = vi.fn();
    });
    const ready = Promise.resolve();
    Object.defineProperty(document, "fonts", { configurable: true, value: { ready } });
    Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, get: () => 400 });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      font: "",
      measureText: () => ({ width: 400 }),
    } as unknown as CanvasRenderingContext2D);
    const { rerender, unmount } = render(
      <WordCard
        stage={stage}
        stageState={stageState}
        word="alpha"
        known={false}
        practice={false}
        equippedRewards={[]}
        celebration=""
        celebrationKey={0}
      />,
    );
    expect(screen.getByText("New word")).toBeInTheDocument();
    rerender(
      <WordCard
        stage={stage}
        stageState={stageState}
        word="apple"
        known
        practice={false}
        equippedRewards={[stage.rewards[0]]}
        celebration="Great"
        celebrationKey={1}
      />,
    );
    expect(screen.getByText("Known")).toBeInTheDocument();
    expect(screen.getByText("Great")).toHaveClass("is-visible");
    rerender(
      <WordCard
        stage={stage}
        stageState={stageState}
        word="beta"
        known={false}
        practice
        equippedRewards={[]}
        celebration=""
        celebrationKey={2}
      />,
    );
    expect(screen.getByText("Practice")).toBeInTheDocument();
    (observerCallback as unknown as ResizeObserverCallback)([], {} as ResizeObserver);
    unmount();
    (observerCallback as unknown as ResizeObserverCallback)([], {} as ResizeObserver);
    expect(disconnect).toHaveBeenCalled();

    vi.unstubAllGlobals();
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: Promise.reject(new Error("font failure")) },
    });
    render(
      <WordCard
        stage={stage}
        stageState={stageState}
        word="cat"
        known={false}
        practice={false}
        equippedRewards={[]}
        celebration=""
        celebrationKey={3}
      />,
    );
    await Promise.resolve();

    cleanup();
    Object.defineProperty(document, "fonts", { configurable: true, value: undefined });
    render(
      <WordCard
        stage={stage}
        stageState={stageState}
        word="alpha"
        known={false}
        practice={false}
        equippedRewards={[]}
        celebration=""
        celebrationKey={4}
      />,
    );
  });

  test("renders progress states, gear, practice words, and field-trip actions", async () => {
    const content = createContent();
    const stage = content.stages[0];
    const stageState = defaultProgress(content).stages["1"];
    const onStartFieldTrip = vi.fn();
    const onOpenInventory = vi.fn();
    const browserUser = userEvent.setup();
    const { rerender } = render(
      <ProgressPanel
        content={content}
        stage={stage}
        stageState={stageState}
        knownPercent={0}
        onStartFieldTrip={onStartFieldTrip}
        onOpenInventory={onOpenInventory}
      />,
    );
    expect(screen.getByText("No gear yet")).toBeInTheDocument();
    expect(screen.getByText("Practice list is clear")).toBeInTheDocument();
    await browserUser.click(screen.getByRole("button", { name: /Open inventory/ }));
    expect(onOpenInventory).toHaveBeenCalledOnce();

    stageState.knownWords = [...stage.words];
    stageState.practiceWords = [stage.words[0]];
    stageState.unlockedItems = [stage.rewards[0].id];
    stageState.equippedItems = [stage.rewards[0].id];
    rerender(
      <ProgressPanel
        content={content}
        stage={stage}
        stageState={stageState}
        knownPercent={100}
        onStartFieldTrip={onStartFieldTrip}
        onOpenInventory={onOpenInventory}
      />,
    );
    expect(screen.getByText(/Wearing:/)).toHaveTextContent(stage.rewards[0].name);
    expect(screen.getByText(stage.words[0])).toHaveClass("practice-chip");
    await browserUser.click(screen.getByRole("button", { name: `Start ${stage.fieldTrip.title}` }));
    expect(onStartFieldTrip).toHaveBeenCalledOnce();
  });

  test("renders and operates every quick-check feedback variant", () => {
    const onPlay = vi.fn();
    const onPlayChoice = vi.fn();
    const onChoose = vi.fn();
    const check = createCheck();
    Object.defineProperty(HTMLElement.prototype, "clientWidth", {
      configurable: true,
      get: () => 240,
    });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      font: "",
      measureText: () => ({ width: 1_000 }),
    } as unknown as CanvasRenderingContext2D);
    const { rerender } = render(
      <WordCheckOverlay check={null} feedback={null} onPlay={onPlay} onPlayChoice={onPlayChoice} onChoose={onChoose} />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    rerender(
      <WordCheckOverlay check={check} feedback={null} onPlay={onPlay} onPlayChoice={onPlayChoice} onChoose={onChoose} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Play sound again" }));
    fireEvent.click(screen.getByRole("button", { name: "alpha" }));
    expect(onPlay).toHaveBeenCalledOnce();
    expect(onChoose).toHaveBeenCalledWith("alpha");
    const longestWords = ["information", "instruments", "interesting", "temperature"];
    rerender(
      <WordCheckOverlay
        check={{ ...check, word: longestWords[0], choices: longestWords }}
        feedback={null}
        onPlay={onPlay}
        onPlayChoice={onPlayChoice}
        onChoose={onChoose}
      />,
    );
    longestWords.forEach((word) => {
      const label = screen.getByText(word);
      expect(label).toHaveClass("word-check-choice-label");
      expect(label.style.getPropertyValue("--word-check-choice-font-size")).toBe("18px");
    });
    rerender(
      <WordCheckOverlay
        check={check}
        feedback={null}
        speechNotice="Enable text-to-speech in device settings."
        onPlay={onPlay}
        onPlayChoice={onPlayChoice}
        onChoose={onChoose}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Enable text-to-speech in device settings.");

    const correctFeedback: WordCheckFeedback = { choice: "alpha", correct: true };
    rerender(
      <WordCheckOverlay check={check} feedback={correctFeedback} onPlay={onPlay} onPlayChoice={onPlayChoice} onChoose={onChoose} />,
    );
    expect(screen.getByText("Correct")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "alpha" })).toHaveClass("is-correct");

    const wrongFeedback: WordCheckFeedback = { choice: "beta", correct: false };
    rerender(
      <WordCheckOverlay check={check} feedback={wrongFeedback} onPlay={onPlay} onPlayChoice={onPlayChoice} onChoose={onChoose} />,
    );
    expect(screen.getByText(/Not quite/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "beta" })).toHaveClass("is-wrong");
    expect(screen.getByRole("button", { name: "apple" })).toHaveClass("is-dimmed");
    fireEvent.click(screen.getByRole("button", { name: "Play beta" }));
    expect(onPlayChoice).toHaveBeenCalledWith("beta");
  });

  test("renders inventory lock states, toggles gear, and closes from button or backdrop", () => {
    const content = createContent();
    const stage = content.stages[0];
    const stageState = defaultProgress(content).stages["1"];
    stageState.unlockedItems = [stage.rewards[0].id, stage.rewards[1].id];
    stageState.equippedItems = [stage.rewards[0].id];
    const onClose = vi.fn();
    const onToggleGear = vi.fn();
    const { container } = render(
      <InventoryOverlay
        open
        stage={stage}
        stageState={stageState}
        onClose={onClose}
        onToggleGear={onToggleGear}
      />,
    );
    expect(screen.getByRole("button", { name: `${stage.rewards[0].name}, equipped` })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: `${stage.rewards[1].name}, not equipped` })).toHaveTextContent("Unlocked");
    expect(screen.getByRole("button", { name: /locked until 3 known words/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: `${stage.rewards[1].name}, not equipped` }));
    expect(onToggleGear).toHaveBeenCalledWith(stage.rewards[1].id);
    fireEvent.mouseDown(container.querySelector(".inventory-modal")!);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(container.querySelector(".inventory-overlay")!);
    fireEvent.click(screen.getByRole("button", { name: "Close inventory" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  test("renders maze tiles, reward fallbacks, bump state, and all movement controls", () => {
    const content = createContent();
    const progress = defaultProgress(content);
    const stage = content.stages[0];
    const maze: MazeState = {
      open: true,
      position: { row: 0, col: 0 },
      message: "Go",
      bumpCount: 1,
    };
    const onMove = vi.fn();
    progress.stages["1"].pendingReward = { milestone: 1, itemId: stage.rewards[0].id };
    const { rerender } = render(
      <MazeOverlay open content={content} progress={progress} maze={maze} onMove={onMove} />,
    );
    expect(screen.getByText(new RegExp(stage.rewards[0].name))).toBeInTheDocument();
    expect(screen.getByRole("grid")).toHaveClass("is-bumped");
    expect(screen.getAllByRole("gridcell", { name: "Wall" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("gridcell", { name: "Adventurer" })).toBeInTheDocument();
    expect(screen.getByRole("gridcell", { name: "Treasure chest" })).toBeInTheDocument();
    for (const [name, direction] of [["Move up", "up"], ["Move left", "left"], ["Move down", "down"], ["Move right", "right"]] as const) {
      fireEvent.pointerDown(screen.getByRole("button", { name }));
      expect(onMove).toHaveBeenLastCalledWith(direction);
    }
    fireEvent.click(screen.getByRole("button", { name: "Move up" }), { detail: 0 });
    fireEvent.click(screen.getByRole("button", { name: "Move up" }), { detail: 1 });

    progress.stages["1"].pendingReward = { milestone: 1, itemId: "missing" };
    rerender(<MazeOverlay open={false} content={content} progress={progress} maze={{ ...maze, bumpCount: 0 }} onMove={onMove} />);
    expect(screen.getByText("Reach the chest to earn the reward.")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { hidden: true })).toHaveAttribute("hidden");
  });

  test("renders field-trip fallbacks, animations, attack effects, and controls", () => {
    const stage = createStage(1);
    const onMove = vi.fn();
    const { rerender, container } = render(
      <FieldTripOverlay open={false} stage={null} fieldTrip={initialState.fieldTrip} onMove={onMove} />,
    );
    expect(screen.getByRole("heading", { name: "Run to the finish", hidden: true })).toBeInTheDocument();
    expect(screen.getByRole("dialog", { hidden: true })).toHaveAttribute("hidden");

    const trip = createTrip({
      progress: 50,
      swinging: true,
      defending: true,
      attackCharge: 700,
      attackEffectKey: 1,
      blockEffectKey: 1,
    });
    rerender(<FieldTripOverlay open stage={stage} fieldTrip={trip} onMove={onMove} />);
    expect(screen.getByRole("heading", { name: stage.fieldTrip.title })).toBeInTheDocument();
    expect(container.querySelector(".trip-runner")).toHaveClass("is-swinging", "is-defending");
    expect(container.querySelector(".trip-monster")).toHaveClass("is-winding-up");
    expect(container.querySelector(".trip-monster-facing-character")).toContainElement(
      container.querySelector(".trip-monster-art"),
    );
    expect(screen.getByText("Blocked!")).toBeInTheDocument();
    expect(container.querySelector(".trip-attack-effect")).toBeInTheDocument();
    for (const [name, direction] of [["Move left", "left"], ["Hit monster", "hit"], ["Defend with shield", "defend"], ["Move right", "right"]] as const) {
      fireEvent.pointerDown(screen.getByRole("button", { name }));
      expect(onMove).toHaveBeenLastCalledWith(direction);
    }
  });

  test("renders every monster artwork variant and PressButton input path", () => {
    const onPress = vi.fn();
    const { rerender, container } = render(<MonsterArt kind="flying-dragon" stageId={5} variant={2} />);
    expect(container.querySelector(".flying-dragon-creature-art")).toBeInTheDocument();
    rerender(<MonsterArt kind="dragon" stageId={2} variant={1} />);
    expect(container.querySelector(".dragon-creature-art")).toBeInTheDocument();
    rerender(<MonsterArt kind="wolf" stageId={1} variant={0} />);
    expect(container.querySelector(".wolf-creature-art")).toBeInTheDocument();
    rerender(<PressButton className="press" ariaLabel="Press me" onPress={onPress}>Child</PressButton>);
    const button = screen.getByRole("button", { name: "Press me" });
    fireEvent.pointerDown(button);
    fireEvent.click(button, { detail: 0 });
    fireEvent.click(button, { detail: 1 });
    expect(onPress).toHaveBeenCalledTimes(2);
  });
});
