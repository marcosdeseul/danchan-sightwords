import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { api } from "./api";
import { Character, GearIcon } from "./GearArt";
import {
  MAZE_CHEST,
  MAZE_START,
  MOVE_DELTAS,
  LANE_TOPS,
  LEGACY_STORAGE_KEY,
  TRIP_TARGET,
  activeStage,
  activeStageState,
  cloneProgress,
  completedFieldTripsFor,
  currentMazeLayout,
  currentWordFor,
  defaultProgress,
  hasNextStage,
  isOpenMazeTile,
  isStageComplete,
  loadLocalProgress,
  readJsonStorage,
  rewardById,
  sanitizeProgress,
  saveLocalProgress,
  selectWeightedWordIndex,
  shouldUseWeightedNextWord,
  sortRewardIds,
  stageById,
  totalKnownCount,
  unlockedStageIdsFor,
} from "./game";
import { Icon, IconSprite } from "./icons";
import type {
  FieldTripContent,
  ProgressState,
  RewardItem,
  SightWordsContent,
  StageContent,
  User,
} from "./types";

interface MeResponse {
  user: User | null;
}

interface ProgressResponse {
  progress: ProgressState;
}

interface AuthResponse {
  user: User;
  progress: ProgressState;
}

interface LastAnswerAction {
  stageId: number;
  wordIndex: number;
  previousState: ProgressState;
}

interface MazeState {
  open: boolean;
  position: { row: number; col: number };
  message: string;
  bumpCount: number;
}

interface TripCreature {
  x: number;
  lane: number;
  name: string;
}

interface FieldTripState {
  open: boolean;
  stageId: number | null;
  lane: number;
  progress: number;
  collected: number;
  creature: TripCreature | null;
  lastTime: number;
  hopping: boolean;
  message: string;
}

interface AppState {
  content: SightWordsContent | null;
  progress: ProgressState | null;
  user: User | null;
  authMessage: string;
  speechNotice: string;
  celebration: string;
  celebrationKey: number;
  lastAnswerAction: LastAnswerAction | null;
  maze: MazeState;
  fieldTrip: FieldTripState;
  loading: boolean;
  speaking: boolean;
}

type AppAction =
  | { type: "bootstrapped"; content: SightWordsContent; progress: ProgressState }
  | { type: "accountReady"; user: User | null; progress?: ProgressState; message: string }
  | { type: "setUser"; user: User | null; message: string }
  | { type: "setProgress"; progress: ProgressState; lastAnswerAction?: LastAnswerAction | null }
  | { type: "setAuthMessage"; message: string }
  | { type: "setSpeechNotice"; message: string }
  | { type: "setSpeaking"; speaking: boolean }
  | { type: "celebrate"; message: string }
  | { type: "clearLastAnswer" }
  | { type: "openMaze" }
  | { type: "closeMaze" }
  | { type: "moveMaze"; position: { row: number; col: number }; message: string }
  | { type: "bumpMaze"; message: string }
  | { type: "openFieldTrip"; stageId: number; creature: TripCreature; message: string }
  | { type: "closeFieldTrip" }
  | { type: "moveFieldTrip"; direction: "up" | "down" | "jump" }
  | { type: "clearFieldTripHop" }
  | { type: "tickFieldTrip"; timestamp: number; creatures: string[] }
  | { type: "stopGames" };

const initialState: AppState = {
  content: null,
  progress: null,
  user: null,
  authMessage: "Checking account...",
  speechNotice: "",
  celebration: "",
  celebrationKey: 0,
  lastAnswerAction: null,
  maze: { open: false, position: { ...MAZE_START }, message: "Move one square at a time.", bumpCount: 0 },
  fieldTrip: {
    open: false,
    stageId: null,
    lane: 1,
    progress: 0,
    collected: 0,
    creature: null,
    lastTime: 0,
    hopping: false,
    message: "Move lanes and collect friends.",
  },
  loading: true,
  speaking: false,
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "bootstrapped":
      return {
        ...state,
        content: action.content,
        progress: action.progress,
        loading: false,
      };
    case "accountReady":
      return {
        ...state,
        user: action.user,
        progress: action.progress || state.progress,
        authMessage: action.message,
        loading: false,
      };
    case "setUser":
      return { ...state, user: action.user, authMessage: action.message };
    case "setProgress":
      return {
        ...state,
        progress: action.progress,
        lastAnswerAction:
          action.lastAnswerAction === undefined
            ? state.lastAnswerAction
            : action.lastAnswerAction,
      };
    case "setAuthMessage":
      return { ...state, authMessage: action.message };
    case "setSpeechNotice":
      return { ...state, speechNotice: action.message };
    case "setSpeaking":
      return { ...state, speaking: action.speaking };
    case "celebrate":
      return {
        ...state,
        celebration: action.message,
        celebrationKey: state.celebrationKey + 1,
      };
    case "clearLastAnswer":
      return { ...state, lastAnswerAction: null };
    case "openMaze":
      return {
        ...state,
        maze: {
          open: true,
          position: { ...MAZE_START },
          message: "Move one square at a time.",
          bumpCount: state.maze.bumpCount,
        },
      };
    case "closeMaze":
      return {
        ...state,
        maze: { ...state.maze, open: false },
      };
    case "moveMaze":
      return {
        ...state,
        maze: { ...state.maze, position: action.position, message: action.message },
      };
    case "bumpMaze":
      return {
        ...state,
        maze: {
          ...state.maze,
          message: action.message,
          bumpCount: state.maze.bumpCount + 1,
        },
      };
    case "openFieldTrip":
      return {
        ...state,
        fieldTrip: {
          open: true,
          stageId: action.stageId,
          lane: 1,
          progress: 0,
          collected: 0,
          creature: action.creature,
          lastTime: 0,
          hopping: false,
          message: action.message,
        },
      };
    case "closeFieldTrip":
      return {
        ...state,
        fieldTrip: { ...initialState.fieldTrip },
      };
    case "moveFieldTrip": {
      if (!state.fieldTrip.open) {
        return state;
      }

      if (action.direction === "up") {
        return {
          ...state,
          fieldTrip: {
            ...state.fieldTrip,
            lane: Math.max(0, state.fieldTrip.lane - 1),
          },
        };
      }

      if (action.direction === "down") {
        return {
          ...state,
          fieldTrip: {
            ...state.fieldTrip,
            lane: Math.min(2, state.fieldTrip.lane + 1),
          },
        };
      }

      return {
        ...state,
        fieldTrip: { ...state.fieldTrip, hopping: true },
      };
    }
    case "clearFieldTripHop":
      return { ...state, fieldTrip: { ...state.fieldTrip, hopping: false } };
    case "tickFieldTrip": {
      const trip = state.fieldTrip;

      if (!trip.open || !trip.creature) {
        return state;
      }

      const delta = trip.lastTime ? Math.min(50, action.timestamp - trip.lastTime) : 0;
      let creature = { ...trip.creature, x: trip.creature.x - delta * 0.035 };
      let collected = trip.collected;
      let message = trip.message;

      if (creature.x < 26 && creature.x > 7 && creature.lane === trip.lane) {
        collected += 1;
        message = `${creature.name} joined! ${collected}/${TRIP_TARGET}`;
        creature = spawnCreature(action.creatures);
      } else if (creature.x < -8) {
        message = "Keep running. Another friend is coming.";
        creature = spawnCreature(action.creatures);
      }

      return {
        ...state,
        fieldTrip: {
          ...trip,
          progress: Math.min(100, trip.progress + delta * 0.006),
          collected,
          creature,
          lastTime: action.timestamp,
          message,
        },
      };
    }
    case "stopGames":
      return {
        ...state,
        maze: { ...state.maze, open: false },
        fieldTrip: { ...initialState.fieldTrip },
        speechNotice: "",
        speaking: false,
      };
    default:
      return state;
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  const autoAdvanceTimer = useRef<number>(0);
  const syncTimer = useRef<number>(0);

  stateRef.current = state;

  const commitProgress = useCallback((nextProgress: ProgressState, options: {
    sync?: boolean;
    lastAnswerAction?: LastAnswerAction | null;
  } = {}) => {
    const content = stateRef.current.content;

    if (!content) {
      return;
    }

    const cleanProgress = sanitizeProgress(content, nextProgress);
    saveLocalProgress(cleanProgress);
    dispatch({
      type: "setProgress",
      progress: cleanProgress,
      lastAnswerAction: options.lastAnswerAction,
    });

    if (stateRef.current.user && options.sync !== false) {
      window.clearTimeout(syncTimer.current);
      syncTimer.current = window.setTimeout(async () => {
        try {
          const result = await api<ProgressResponse>("/api/progress", {
            method: "PUT",
            body: { progress: cleanProgress },
          });
          const latestContent = stateRef.current.content;

          if (!latestContent) {
            return;
          }

          const syncedProgress = sanitizeProgress(latestContent, result.progress);
          saveLocalProgress(syncedProgress);
          dispatch({ type: "setProgress", progress: syncedProgress });
        } catch {
          dispatch({
            type: "setAuthMessage",
            message: "Progress is saved here and will sync after login works.",
          });
        }
      }, 350);
    }
  }, []);

  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceTimer.current) {
      window.clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = 0;
    }
  }, []);

  const showCelebration = useCallback((message: string) => {
    dispatch({ type: "celebrate", message });
  }, []);

  const stopSpeech = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    dispatch({ type: "setSpeaking", speaking: false });
  }, []);

  const speakWord = useCallback((word: string, options: { clearAutoAdvance?: boolean } = {}) => {
    if (options.clearAutoAdvance !== false) {
      clearAutoAdvance();
    }

    dispatch({ type: "setSpeechNotice", message: "" });

    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      dispatch({
        type: "setSpeechNotice",
        message: "Speech is not available in this browser.",
      });
      return false;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.76;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onstart = () => dispatch({ type: "setSpeaking", speaking: true });
    utterance.onend = () => dispatch({ type: "setSpeaking", speaking: false });
    utterance.onerror = () => {
      dispatch({ type: "setSpeaking", speaking: false });
      dispatch({ type: "setSpeechNotice", message: "Speech could not play. Try again." });
    };

    dispatch({ type: "setSpeaking", speaking: true });
    window.speechSynthesis.speak(utterance);
    return true;
  }, [clearAutoAdvance]);

  const requireAuthenticated = useCallback(() => {
    if (stateRef.current.user) {
      return true;
    }

    clearAutoAdvance();
    stopSpeech();
    dispatch({ type: "stopGames" });
    dispatch({ type: "setAuthMessage", message: "Log in or sign up to play." });
    return false;
  }, [clearAutoAdvance, stopSpeech]);

  const openPendingMaze = useCallback(() => {
    const current = stateRef.current;

    if (!current.content || !current.progress) {
      return;
    }

    const stage = activeStage(current.content, current.progress);
    const stageState = activeStageState(current.content, current.progress);

    if (!stageState.pendingReward || !rewardById(stage, stageState.pendingReward.itemId)) {
      return;
    }

    clearAutoAdvance();
    stopSpeech();
    dispatch({ type: "openMaze" });
  }, [clearAutoAdvance, stopSpeech]);

  const openFieldTrip = useCallback((stageId: number) => {
    const current = stateRef.current;

    if (!current.content || !current.progress) {
      return;
    }

    const stage = stageById(current.content, stageId);
    const stageState = current.progress.stages[String(stage.id)];

    if (
      !hasNextStage(current.content, stage) ||
      !stageState ||
      stageState.knownWords.length < stage.words.length ||
      stageState.fieldTripCompleted
    ) {
      return;
    }

    clearAutoAdvance();
    stopSpeech();
    dispatch({
      type: "openFieldTrip",
      stageId: stage.id,
      creature: spawnCreature(stage.fieldTrip.creatures),
      message: `Collect ${TRIP_TARGET} friends and reach the finish.`,
    });
  }, [clearAutoAdvance, stopSpeech]);

  const handleStageComplete = useCallback((stage: StageContent, progress: ProgressState) => {
    const content = stateRef.current.content;

    if (!content) {
      return;
    }

    const stageState = progress.stages[String(stage.id)];

    if (hasNextStage(content, stage) && !stageState.fieldTripCompleted) {
      window.setTimeout(() => openFieldTrip(stage.id), 700);
      return;
    }

    if (!hasNextStage(content, stage)) {
      showCelebration("All stages complete!");
    }
  }, [openFieldTrip, showCelebration]);

  const scheduleNextWord = useCallback((delay: number) => {
    clearAutoAdvance();
    autoAdvanceTimer.current = window.setTimeout(() => {
      advanceToNextWord();
    }, delay);
  }, [clearAutoAdvance]);

  const goToWord = useCallback((nextIndex: number) => {
    const current = stateRef.current;

    if (!current.content || !current.progress) {
      return;
    }

    clearAutoAdvance();
    const nextProgress = cloneProgress(current.progress);
    const stage = activeStage(current.content, nextProgress);
    const stageState = activeStageState(current.content, nextProgress);
    const lastIndex = stageState.deckOrder.length - 1;

    if (nextIndex < 0) {
      stageState.currentIndex = lastIndex;
    } else if (nextIndex > lastIndex) {
      stageState.currentIndex = 0;
    } else {
      stageState.currentIndex = nextIndex;
    }

    commitProgress(nextProgress);
  }, [clearAutoAdvance, commitProgress]);

  const advanceToNextWord = useCallback(() => {
    const current = stateRef.current;

    if (!current.content || !current.progress) {
      return;
    }

    const stage = activeStage(current.content, current.progress);
    const stageState = activeStageState(current.content, current.progress);

    if (
      isStageComplete(stage, stageState) &&
      hasNextStage(current.content, stage) &&
      !stageState.fieldTripCompleted
    ) {
      openFieldTrip(stage.id);
      return;
    }

    if (!shouldUseWeightedNextWord(current.content, current.progress)) {
      goToWord(stageState.currentIndex + 1);
      return;
    }

    const nextWordIndex = selectWeightedWordIndex(current.content, current.progress);
    const nextDeckIndex =
      nextWordIndex === null ? -1 : stageState.deckOrder.indexOf(nextWordIndex);
    goToWord(nextDeckIndex === -1 ? stageState.currentIndex + 1 : nextDeckIndex);
  }, [goToWord, openFieldTrip]);

  const markKnown = useCallback(() => {
    const current = stateRef.current;

    if (!current.content || !current.progress || !requireAuthenticated()) {
      return;
    }

    clearAutoAdvance();
    const stage = activeStage(current.content, current.progress);
    const stageState = activeStageState(current.content, current.progress);
    const word = currentWordFor(current.content, current.progress);
    const answerSnapshot: LastAnswerAction = {
      stageId: stage.id,
      wordIndex: stage.words.indexOf(word),
      previousState: cloneProgress(current.progress),
    };
    const nextProgress = cloneProgress(current.progress);
    const nextStageState = activeStageState(current.content, nextProgress);
    const knownWords = new Set(nextStageState.knownWords);
    const practiceWords = new Set(nextStageState.practiceWords);
    const previousKnownCount = stageState.knownWords.length;

    speakWord(word, { clearAutoAdvance: false });
    knownWords.add(word);
    practiceWords.delete(word);
    nextStageState.knownWords = stage.words.filter((stageWord) => knownWords.has(stageWord));
    nextStageState.practiceWords = stage.words.filter((stageWord) => practiceWords.has(stageWord));

    const milestoneReward = stage.rewards.find(
      (reward) =>
        previousKnownCount < reward.milestone &&
        nextStageState.knownWords.length >= reward.milestone &&
        !nextStageState.completedMazeMilestones.includes(reward.milestone) &&
        nextStageState.pendingReward?.milestone !== reward.milestone,
    );

    if (milestoneReward) {
      nextStageState.pendingReward = {
        milestone: milestoneReward.milestone,
        itemId: milestoneReward.id,
      };
      commitProgress(nextProgress, { lastAnswerAction: answerSnapshot });
      showCelebration("You knew it!");
      window.setTimeout(openPendingMaze, 650);
      return;
    }

    commitProgress(nextProgress, { lastAnswerAction: answerSnapshot });
    showCelebration("You knew it!");

    if (isStageComplete(stage, nextStageState)) {
      handleStageComplete(stage, nextProgress);
      return;
    }

    scheduleNextWord(850);
  }, [
    clearAutoAdvance,
    commitProgress,
    handleStageComplete,
    openPendingMaze,
    requireAuthenticated,
    scheduleNextWord,
    showCelebration,
    speakWord,
  ]);

  const markPractice = useCallback(() => {
    const current = stateRef.current;

    if (!current.content || !current.progress || !requireAuthenticated()) {
      return;
    }

    clearAutoAdvance();
    const stage = activeStage(current.content, current.progress);
    const word = currentWordFor(current.content, current.progress);
    const answerSnapshot: LastAnswerAction = {
      stageId: stage.id,
      wordIndex: stage.words.indexOf(word),
      previousState: cloneProgress(current.progress),
    };
    const nextProgress = cloneProgress(current.progress);
    const nextStageState = activeStageState(current.content, nextProgress);
    const knownWords = new Set(nextStageState.knownWords);
    const practiceWords = new Set(nextStageState.practiceWords);

    speakWord(word, { clearAutoAdvance: false });
    knownWords.delete(word);
    practiceWords.add(word);
    nextStageState.knownWords = stage.words.filter((stageWord) => knownWords.has(stageWord));
    nextStageState.practiceWords = stage.words.filter((stageWord) => practiceWords.has(stageWord));
    commitProgress(nextProgress, { lastAnswerAction: answerSnapshot });
    scheduleNextWord(900);
  }, [clearAutoAdvance, commitProgress, requireAuthenticated, scheduleNextWord, speakWord]);

  const goBackOrUndo = useCallback(() => {
    const current = stateRef.current;

    if (!current.content || !current.progress || !requireAuthenticated()) {
      return;
    }

    clearAutoAdvance();

    if (current.lastAnswerAction) {
      const snapshot = current.lastAnswerAction;
      const nextProgress = sanitizeProgress(current.content, snapshot.previousState);
      nextProgress.activeStageId = snapshot.stageId;

      const stageState = activeStageState(current.content, nextProgress);
      const deckIndex = stageState.deckOrder.indexOf(snapshot.wordIndex);

      if (deckIndex >= 0) {
        stageState.currentIndex = deckIndex;
      }

      commitProgress(nextProgress, { lastAnswerAction: null });
      showCelebration("Answer undone");
      return;
    }

    goToWord(activeStageState(current.content, current.progress).currentIndex - 1);
  }, [clearAutoAdvance, commitProgress, goToWord, requireAuthenticated, showCelebration]);

  const shuffleDeck = useCallback(() => {
    const current = stateRef.current;

    if (!current.content || !current.progress || !requireAuthenticated()) {
      return;
    }

    clearAutoAdvance();
    const nextProgress = cloneProgress(current.progress);
    const stage = activeStage(current.content, nextProgress);
    const stageState = activeStageState(current.content, nextProgress);
    const wordBeforeShuffle = currentWordFor(current.content, nextProgress);
    const order = stage.words.map((_, index) => index);

    for (let index = order.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
    }

    stageState.deckOrder = order;
    stageState.currentIndex = order.indexOf(stage.words.indexOf(wordBeforeShuffle));
    stageState.shuffled = true;
    commitProgress(nextProgress);
  }, [clearAutoAdvance, commitProgress, requireAuthenticated]);

  const resetProgress = useCallback(() => {
    const current = stateRef.current;

    if (!current.content || !requireAuthenticated()) {
      return;
    }

    clearAutoAdvance();

    if (!window.confirm("Reset this sight word progress?")) {
      return;
    }

    stopSpeech();
    dispatch({ type: "stopGames" });
    commitProgress(defaultProgress(current.content), { lastAnswerAction: null });
  }, [clearAutoAdvance, commitProgress, requireAuthenticated, stopSpeech]);

  const toggleGearItem = useCallback((itemId: string) => {
    const current = stateRef.current;

    if (!current.content || !current.progress || !requireAuthenticated()) {
      return;
    }

    const nextProgress = cloneProgress(current.progress);
    const stage = activeStage(current.content, nextProgress);
    const stageState = activeStageState(current.content, nextProgress);

    if (!stageState.unlockedItems.includes(itemId)) {
      return;
    }

    const equippedItems = new Set(stageState.equippedItems);

    if (equippedItems.has(itemId)) {
      equippedItems.delete(itemId);
    } else {
      equippedItems.add(itemId);
    }

    stageState.equippedItems = sortRewardIds([...equippedItems], stage);
    commitProgress(nextProgress);
  }, [commitProgress, requireAuthenticated]);

  const moveMaze = useCallback((direction: keyof typeof MOVE_DELTAS) => {
    const current = stateRef.current;

    if (!current.content || !current.progress || !current.maze.open || !requireAuthenticated()) {
      return;
    }

    const delta = MOVE_DELTAS[direction];
    const stage = activeStage(current.content, current.progress);
    const layout = currentMazeLayout(current.progress, stage);
    const nextPosition = {
      row: current.maze.position.row + delta.row,
      col: current.maze.position.col + delta.col,
    };

    if (!isOpenMazeTile(layout, nextPosition)) {
      dispatch({ type: "bumpMaze", message: "That path is blocked. Try another way." });
      return;
    }

    dispatch({ type: "moveMaze", position: nextPosition, message: "Keep going." });

    if (nextPosition.row === MAZE_CHEST.row && nextPosition.col === MAZE_CHEST.col) {
      claimPendingReward();
    }
  }, [requireAuthenticated]);

  const claimPendingReward = useCallback(() => {
    const current = stateRef.current;

    if (!current.content || !current.progress) {
      dispatch({ type: "closeMaze" });
      return;
    }

    const nextProgress = cloneProgress(current.progress);
    const stage = activeStage(current.content, nextProgress);
    const stageState = activeStageState(current.content, nextProgress);
    const reward = stageState.pendingReward
      ? rewardById(stage, stageState.pendingReward.itemId)
      : undefined;

    if (!reward) {
      dispatch({ type: "closeMaze" });
      return;
    }

    const unlockedItems = new Set(stageState.unlockedItems);
    const equippedItems = new Set(stageState.equippedItems);
    const completedMazeMilestones = new Set(stageState.completedMazeMilestones);

    unlockedItems.add(reward.id);
    equippedItems.add(reward.id);
    completedMazeMilestones.add(reward.milestone);
    stageState.unlockedItems = sortRewardIds([...unlockedItems], stage);
    stageState.equippedItems = sortRewardIds([...equippedItems], stage);
    stageState.completedMazeMilestones = [...completedMazeMilestones].sort(
      (first, second) => first - second,
    );
    stageState.pendingReward = null;

    commitProgress(nextProgress);
    dispatch({ type: "closeMaze" });
    showCelebration(`${reward.name} found!`);

    if (isStageComplete(stage, stageState)) {
      handleStageComplete(stage, nextProgress);
    } else {
      scheduleNextWord(1000);
    }
  }, [commitProgress, handleStageComplete, scheduleNextWord, showCelebration]);

  const moveFieldTrip = useCallback((direction: "up" | "down" | "jump") => {
    if (!requireAuthenticated()) {
      return;
    }

    dispatch({ type: "moveFieldTrip", direction });

    if (direction === "jump") {
      window.setTimeout(() => dispatch({ type: "clearFieldTripHop" }), 180);
    }
  }, [requireAuthenticated]);

  const completeFieldTrip = useCallback(() => {
    const current = stateRef.current;

    if (!current.content || !current.progress || current.fieldTrip.stageId === null) {
      dispatch({ type: "closeFieldTrip" });
      return;
    }

    const nextProgress = cloneProgress(current.progress);
    const stage = stageById(current.content, current.fieldTrip.stageId);
    const stageState = nextProgress.stages[String(stage.id)];

    if (!hasNextStage(current.content, stage) || !isStageComplete(stage, stageState)) {
      dispatch({ type: "closeFieldTrip" });
      return;
    }

    stageState.fieldTripCompleted = true;
    nextProgress.completedFieldTrips = completedFieldTripsFor(
      current.content,
      nextProgress.stages,
    );
    nextProgress.unlockedStageIds = unlockedStageIdsFor(
      current.content,
      nextProgress.stages,
    );
    nextProgress.activeStageId = nextProgress.unlockedStageIds.includes(stage.id + 1)
      ? stage.id + 1
      : stage.id;
    commitProgress(nextProgress);
    dispatch({ type: "closeFieldTrip" });
    showCelebration(stage.fieldTrip.finish);
  }, [commitProgress, showCelebration]);

  const authenticate = useCallback(async (mode: "login" | "signup", email: string, password: string) => {
    const current = stateRef.current;

    if (!current.content || !current.progress) {
      return;
    }

    dispatch({
      type: "setAuthMessage",
      message: mode === "signup" ? "Creating account..." : "Logging in...",
    });

    try {
      const result = await api<AuthResponse>(`/api/auth/${mode}`, {
        method: "POST",
        body: { email, password },
      });
      const imported = await api<ProgressResponse>("/api/progress/import-local", {
        method: "POST",
        body: { progress: current.progress },
      });
      const nextProgress = sanitizeProgress(current.content, imported.progress || result.progress);
      saveLocalProgress(nextProgress);
      dispatch({
        type: "accountReady",
        user: result.user,
        progress: nextProgress,
        message: "Progress is syncing to your account.",
      });

      window.setTimeout(openPendingMaze, 0);
    } catch (error) {
      dispatch({
        type: "setAuthMessage",
        message: error instanceof Error ? error.message : "Could not log in.",
      });
    }
  }, [openPendingMaze]);

  const logout = useCallback(async () => {
    try {
      await api<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
    } catch {
      // Local play remains blocked behind login even if logout request fails.
    }

    clearAutoAdvance();
    stopSpeech();
    dispatch({ type: "stopGames" });
    dispatch({ type: "setUser", user: null, message: "Logged out. Log in or sign up to play." });
  }, [clearAutoAdvance, stopSpeech]);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const content = await api<SightWordsContent>("/api/content");
        const localProgress = loadLocalProgress(content);

        if (cancelled) {
          return;
        }

        dispatch({ type: "bootstrapped", content, progress: localProgress });

        try {
          const me = await api<MeResponse>("/api/me");

          if (cancelled) {
            return;
          }

          if (!me.user) {
            dispatch({
              type: "accountReady",
              user: null,
              message: "Log in or sign up to play.",
            });
            return;
          }

          const serverProgress = await api<ProgressResponse>("/api/progress");
          const cleanServerProgress = sanitizeProgress(content, serverProgress.progress);
          const localKnown = totalKnownCount(content, localProgress);
          const serverKnown = totalKnownCount(content, cleanServerProgress);
          let nextProgress = cleanServerProgress;
          let message = "";

          if (localKnown > serverKnown || readJsonStorage(LEGACY_STORAGE_KEY)) {
            const imported = await api<ProgressResponse>("/api/progress/import-local", {
              method: "POST",
              body: { progress: localProgress },
            });
            nextProgress = sanitizeProgress(content, imported.progress);
            message = "Progress imported and synced.";
          }

          saveLocalProgress(nextProgress);
          dispatch({
            type: "accountReady",
            user: me.user,
            progress: nextProgress,
            message,
          });

          if (activeStageState(content, nextProgress).pendingReward) {
            window.setTimeout(openPendingMaze, 0);
          }
        } catch {
          dispatch({
            type: "accountReady",
            user: null,
            message: "Log in or sign up to play.",
          });
        }
      } catch {
        if (!cancelled) {
          dispatch({
            type: "setAuthMessage",
            message: "The game could not load. Refresh and try again.",
          });
        }
      }
    }

    initialize();

    return () => {
      cancelled = true;
    };
  }, [openPendingMaze]);

  useEffect(() => {
    const current = stateRef.current;
    const stage = current.content && current.progress
      ? activeStage(current.content, current.progress)
      : null;
    const stageClasses = ["stage-ancient", "stage-roman", "stage-medieval", "stage-modern"];

    document.body.classList.remove(...stageClasses);
    document.body.classList.add(stage?.themeClass || "stage-ancient");
    document.body.classList.toggle("auth-required", !state.user);
    document.body.classList.toggle("is-speaking", state.speaking);
    document.body.classList.toggle("maze-is-open", state.maze.open);
    document.body.classList.toggle("trip-is-open", state.fieldTrip.open);
  }, [state.user, state.speaking, state.maze.open, state.fieldTrip.open, state.content, state.progress]);

  useEffect(() => {
    if (!state.fieldTrip.open || state.fieldTrip.stageId === null || !state.content) {
      return;
    }

    const stage = stageById(state.content, state.fieldTrip.stageId);
    let frame = 0;
    const tick = (timestamp: number) => {
      dispatch({
        type: "tickFieldTrip",
        timestamp,
        creatures: stage.fieldTrip.creatures,
      });
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(frame);
  }, [state.fieldTrip.open, state.fieldTrip.stageId, state.content]);

  useEffect(() => {
    if (
      state.fieldTrip.open &&
      state.fieldTrip.progress >= 100 &&
      state.fieldTrip.collected >= TRIP_TARGET
    ) {
      completeFieldTrip();
    }
  }, [state.fieldTrip.open, state.fieldTrip.progress, state.fieldTrip.collected, completeFieldTrip]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const current = stateRef.current;

      if (!current.user) {
        return;
      }

      if (current.maze.open) {
        const directionByKey: Record<string, keyof typeof MOVE_DELTAS | undefined> = {
          ArrowUp: "up",
          ArrowDown: "down",
          ArrowLeft: "left",
          ArrowRight: "right",
        };
        const direction = directionByKey[event.key];

        if (direction) {
          event.preventDefault();
          moveMaze(direction);
        }
        return;
      }

      if (current.fieldTrip.open) {
        const directionByKey: Record<string, "up" | "down" | "jump" | undefined> = {
          ArrowUp: "up",
          ArrowDown: "down",
          " ": "jump",
        };
        const direction = directionByKey[event.key];

        if (direction) {
          event.preventDefault();
          moveFieldTrip(direction);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [moveFieldTrip, moveMaze]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const viewModel = useMemo(() => {
    if (!state.content || !state.progress) {
      return null;
    }

    const stage = activeStage(state.content, state.progress);
    const stageState = activeStageState(state.content, state.progress);
    const word = currentWordFor(state.content, state.progress);
    const knownSet = new Set(stageState.knownWords);
    const practiceSet = new Set(stageState.practiceWords);
    const knownCount = stageState.knownWords.length;

    return {
      stage,
      stageState,
      word,
      knownSet,
      practiceSet,
      knownCount,
      practiceCount: stageState.practiceWords.length,
      leftCount: stage.words.length - knownCount,
      totalCount: totalKnownCount(state.content, state.progress),
      knownPercent: (knownCount / stage.words.length) * 100,
    };
  }, [state.content, state.progress]);

  if (state.loading || !state.content || !state.progress || !viewModel) {
    return (
      <>
        <IconSprite />
        <div className="app-shell">
          <header className="topbar">
            <Brand subtitle="Dan's Sight Words" title="Loading..." />
            <p className="auth-message" role="status" aria-live="polite">{state.authMessage}</p>
          </header>
        </div>
      </>
    );
  }

  const { stage, stageState, word, knownSet, practiceSet } = viewModel;

  return (
    <>
      <IconSprite />
      <div className="app-shell">
        <header className="topbar">
          <Brand
            subtitle={state.user ? stage.subtitle : "Dan's Sight Words"}
            title={state.user ? stage.title : "Sign up or log in"}
          />
          <AuthPanel
            user={state.user}
            message={state.authMessage}
            onAuthenticate={authenticate}
            onLogout={logout}
          />
        </header>

        <StageTabs
          content={state.content}
          progress={state.progress}
          onSelect={(stageId) => {
            if (!requireAuthenticated()) {
              return;
            }
            const nextProgress = cloneProgress(stateRef.current.progress as ProgressState);
            nextProgress.activeStageId = stageId;
            commitProgress(nextProgress);
            window.setTimeout(openPendingMaze, 0);
          }}
        />

        <ScoreStrip
          known={viewModel.knownCount}
          practice={viewModel.practiceCount}
          left={viewModel.leftCount}
          total={viewModel.totalCount}
        />

        <main className="game-layout">
          <section className="word-panel" aria-labelledby="currentWordLabel">
            <WordCard
              stage={stage}
              stageState={stageState}
              word={word}
              known={knownSet.has(word)}
              practice={practiceSet.has(word)}
              celebration={state.celebration}
              celebrationKey={state.celebrationKey}
            />

            <div className="primary-actions">
              <button className="button button-play" type="button" onClick={() => speakWord(word)}>
                <Icon name="speaker" />
                <span>Play word</span>
              </button>
              <button className="button button-known" type="button" onClick={markKnown}>
                <Icon name="check" />
                <span>I know it</span>
              </button>
              <button className="button button-practice" type="button" onClick={markPractice}>
                <Icon name="refresh" />
                <span>Practice again</span>
              </button>
            </div>

            <div className="secondary-actions">
              <button
                className={`icon-button wide-icon-button back-button${state.lastAnswerAction ? " is-undo" : ""}`}
                type="button"
                aria-label={state.lastAnswerAction ? "Undo last answer and go back" : "Back to previous word"}
                title={state.lastAnswerAction ? "Undo last answer and go back" : "Back to previous word"}
                onClick={goBackOrUndo}
              >
                <Icon name="left" />
                <span>{state.lastAnswerAction ? "Undo" : "Back"}</span>
              </button>
              <button
                className="icon-button"
                type="button"
                aria-label="Next word"
                title="Next word"
                onClick={advanceToNextWord}
              >
                <Icon name="right" />
              </button>
              <button
                className="icon-button wide-icon-button"
                type="button"
                aria-label="Shuffle words"
                title="Shuffle words"
                onClick={shuffleDeck}
              >
                <Icon name="shuffle" />
                <span>Shuffle</span>
              </button>
              <button
                className="icon-button wide-icon-button danger"
                type="button"
                aria-label="Reset progress"
                title="Reset progress"
                onClick={resetProgress}
              >
                <Icon name="trash" />
                <span>Reset</span>
              </button>
            </div>

            {state.speechNotice && (
              <p className="notice" role="status">{state.speechNotice}</p>
            )}
          </section>

          <ProgressPanel
            content={state.content}
            progress={state.progress}
            stage={stage}
            stageState={stageState}
            knownPercent={viewModel.knownPercent}
            onStartFieldTrip={() => openFieldTrip(stage.id)}
            onToggleGear={toggleGearItem}
          />
        </main>
      </div>

      <MazeOverlay
        open={state.maze.open}
        content={state.content}
        progress={state.progress}
        maze={state.maze}
        onMove={moveMaze}
      />
      <FieldTripOverlay
        open={state.fieldTrip.open}
        stage={state.fieldTrip.stageId === null ? null : stageById(state.content, state.fieldTrip.stageId)}
        fieldTrip={state.fieldTrip}
        onMove={moveFieldTrip}
      />
    </>
  );
}

function Brand({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    <div className="brand">
      <div className="badge" aria-hidden="true">
        <svg viewBox="0 0 64 64" focusable="false">
          <circle cx="32" cy="32" r="30" />
          <path d="m32 11 5.9 12 13.2 1.9-9.6 9.3 2.3 13.1L32 41.1 20.2 47.3l2.3-13.1-9.6-9.3 13.2-1.9L32 11Z" />
        </svg>
      </div>
      <div>
        <p>{subtitle}</p>
        <h1>{title}</h1>
      </div>
    </div>
  );
}

function AuthPanel({
  user,
  message,
  onAuthenticate,
  onLogout,
}: {
  user: User | null;
  message: string;
  onAuthenticate: (mode: "login" | "signup", email: string, password: string) => void;
  onLogout: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  if (user) {
    return (
      <section className="auth-panel" aria-label="Account">
        <div className="auth-user">
          <Icon name="user" />
          <span>{user.email}</span>
          <button className="auth-button secondary" type="button" onClick={onLogout}>Log out</button>
        </div>
        <p className="auth-message" role="status" aria-live="polite">{message}</p>
      </section>
    );
  }

  return (
    <section className="auth-panel" aria-label="Account">
      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          onAuthenticate("login", email, password);
          setPassword("");
        }}
      >
        <input
          type="email"
          autoComplete="email"
          placeholder="Email"
          aria-label="Email"
          value={email}
          onChange={(event) => setEmail(event.currentTarget.value)}
        />
        <input
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          aria-label="Password"
          value={password}
          onChange={(event) => setPassword(event.currentTarget.value)}
        />
        <button className="auth-button" type="submit">Log in</button>
        <button
          className="auth-button secondary"
          type="button"
          onClick={() => {
            onAuthenticate("signup", email, password);
            setPassword("");
          }}
        >
          Sign up
        </button>
      </form>
      <p className="auth-message" role="status" aria-live="polite">{message}</p>
    </section>
  );
}

function StageTabs({
  content,
  progress,
  onSelect,
}: {
  content: SightWordsContent;
  progress: ProgressState;
  onSelect: (stageId: number) => void;
}) {
  return (
    <nav className="stage-tabs" aria-label="Stages">
      {content.stages.map((stage) => {
        const stageState = progress.stages[String(stage.id)];
        const isUnlocked = progress.unlockedStageIds.includes(stage.id);

        return (
          <button
            key={stage.id}
            type="button"
            className={`stage-tab${progress.activeStageId === stage.id ? " is-active" : ""}`}
            disabled={!isUnlocked}
            onClick={() => onSelect(stage.id)}
          >
            <strong>{stage.title}</strong>
            <span>{stage.subtitle} - {stageState.knownWords.length}/{stage.words.length}</span>
          </button>
        );
      })}
    </nav>
  );
}

function ScoreStrip({ known, practice, left, total }: {
  known: number;
  practice: number;
  left: number;
  total: number;
}) {
  return (
    <div className="score-strip" aria-label="Progress summary">
      <div className="metric"><strong>{known}</strong><span>Known</span></div>
      <div className="metric"><strong>{practice}</strong><span>Practice</span></div>
      <div className="metric"><strong>{left}</strong><span>Left</span></div>
      <div className="metric"><strong>{total}</strong><span>Total</span></div>
    </div>
  );
}

function WordCard({
  stage,
  stageState,
  word,
  known,
  practice,
  celebration,
  celebrationKey,
}: {
  stage: StageContent;
  stageState: ReturnType<typeof activeStageState>;
  word: string;
  known: boolean;
  practice: boolean;
  celebration: string;
  celebrationKey: number;
}) {
  return (
    <div className="word-card">
      <div className="star-field" aria-hidden="true">
        <svg className="star star-a" viewBox="0 0 24 24" focusable="false"><use href="#icon-star" /></svg>
        <svg className="star star-b" viewBox="0 0 24 24" focusable="false"><use href="#icon-star" /></svg>
        <svg className="star star-c" viewBox="0 0 24 24" focusable="false"><use href="#icon-star" /></svg>
      </div>
      <p className="word-position">{stage.title} - Word {stageState.currentIndex + 1} of {stage.words.length}</p>
      <div className="word" aria-live="polite" aria-atomic="true" aria-label={`Current word: ${word}`}>
        {word}
      </div>
      <p className={`word-state${known ? " is-known" : ""}${practice ? " is-practice" : ""}`}>
        {known ? "Known" : practice ? "Practice" : "New word"}
      </p>
      <p
        key={celebrationKey}
        className={`celebration${celebration ? " is-visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {celebration}
      </p>
      <h2 className="sr-only" id="currentWordLabel">Current sight word</h2>
    </div>
  );
}

function ProgressPanel({
  content,
  progress,
  stage,
  stageState,
  knownPercent,
  onStartFieldTrip,
  onToggleGear,
}: {
  content: SightWordsContent;
  progress: ProgressState;
  stage: StageContent;
  stageState: ReturnType<typeof activeStageState>;
  knownPercent: number;
  onStartFieldTrip: () => void;
  onToggleGear: (itemId: string) => void;
}) {
  const unlocked = new Set(stageState.unlockedItems);
  const equipped = new Set(stageState.equippedItems);
  const equippedRewards = stage.rewards.filter((reward) => equipped.has(reward.id));
  const equippedNames = equippedRewards.map((reward) => reward.name).join(", ");
  const fieldTripReady =
    hasNextStage(content, stage) &&
    stageState.knownWords.length >= stage.words.length &&
    !stageState.fieldTripCompleted;

  return (
    <aside className="progress-panel" aria-label="Sight word progress">
      <section className="panel-block character-block">
        <h2>{stage.heroName}</h2>
        <div className="character-stage" aria-live="polite">
          <Character stage={stage} equippedRewards={equippedRewards} />
        </div>
        <p>{equippedRewards.length === 0 ? "No gear yet" : `Wearing: ${equippedNames}`}</p>
        <p>{rewardStatus(stage, stageState)}</p>
      </section>

      <section className="panel-block">
        <h2>Progress</h2>
        <div className="progress-track" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${knownPercent}%` }} />
        </div>
        <p>{stageState.knownWords.length} of {stage.words.length} known</p>
        {fieldTripReady && (
          <button className="button field-trip-button" type="button" onClick={onStartFieldTrip}>
            Start {stage.fieldTrip.title}
          </button>
        )}
      </section>

      <section className="panel-block gear-block">
        <h2>Treasure Gear</h2>
        <div className="inventory-grid" aria-live="polite">
          {stage.rewards.map((reward) => {
            const isUnlocked = unlocked.has(reward.id);
            const isEquipped = equipped.has(reward.id);

            return (
              <button
                key={reward.id}
                type="button"
                className={`gear-card${isUnlocked ? " is-unlocked" : ""}${isEquipped ? " is-equipped" : ""}`}
                disabled={!isUnlocked}
                aria-pressed={isUnlocked && isEquipped}
                aria-label={
                  isUnlocked
                    ? `${reward.name}, ${isEquipped ? "equipped" : "not equipped"}`
                    : `${reward.name}, locked until ${reward.milestone} known words`
                }
                onClick={() => onToggleGear(reward.id)}
              >
                <span className="gear-card-preview" aria-hidden="true">
                  <GearIcon reward={reward} />
                </span>
                <span className="gear-card-name">{reward.name}</span>
                <span className="gear-card-status">
                  {isUnlocked ? isEquipped ? "Equipped" : "Unlocked" : `${reward.milestone} words`}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel-block">
        <h2>Practice List</h2>
        <div className="practice-list" aria-live="polite">
          {stageState.practiceWords.length === 0
            ? <span className="empty-list">Practice list is clear</span>
            : stageState.practiceWords.map((practiceWord) => (
              <span className="practice-chip" key={practiceWord}>{practiceWord}</span>
            ))}
        </div>
      </section>
    </aside>
  );
}

function MazeOverlay({
  open,
  content,
  progress,
  maze,
  onMove,
}: {
  open: boolean;
  content: SightWordsContent;
  progress: ProgressState;
  maze: MazeState;
  onMove: (direction: keyof typeof MOVE_DELTAS) => void;
}) {
  const stage = activeStage(content, progress);
  const stageState = activeStageState(content, progress);
  const reward = stageState.pendingReward
    ? rewardById(stage, stageState.pendingReward.itemId)
    : undefined;
  const layout = currentMazeLayout(progress, stage);

  return (
    <section
      className="maze-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mazeTitle"
      tabIndex={-1}
      hidden={!open}
    >
      <div className="maze-modal">
        <div className="maze-header">
          <p>Treasure Maze</p>
          <h2 id="mazeTitle">Find the treasure chest</h2>
          <span>{reward ? `Reach the chest to earn ${reward.name}.` : "Reach the chest to earn the reward."}</span>
        </div>
        <div
          key={maze.bumpCount}
          className={`maze-board${maze.bumpCount ? " is-bumped" : ""}`}
          role="grid"
          aria-label="Treasure maze"
        >
          {layout.map((rowLayout, row) =>
            [...rowLayout].map((tileType, col) => {
              const isWall = tileType === "#";
              const isPlayer = maze.position.row === row && maze.position.col === col;
              const isChest = MAZE_CHEST.row === row && MAZE_CHEST.col === col;

              return (
                <div
                  key={`${row}-${col}`}
                  className={`maze-tile ${isWall ? "is-wall" : "is-path"}${isChest ? " is-chest" : ""}${isPlayer ? " has-player" : ""}`}
                  role="gridcell"
                  aria-label={isPlayer ? "Adventurer" : isChest ? "Treasure chest" : isWall ? "Wall" : "Path"}
                >
                  {isPlayer && <span className="maze-player" />}
                  {!isPlayer && isChest && <span className="maze-chest" />}
                </div>
              );
            }),
          )}
        </div>
        <p className="maze-message" role="status" aria-live="polite">{maze.message}</p>
        <div className="maze-controls no-zoom-controls" aria-label="Maze movement controls">
          <span />
          <PressButton className="maze-move" ariaLabel="Move up" onPress={() => onMove("up")}>
            <Icon name="up" />
          </PressButton>
          <span />
          <PressButton className="maze-move" ariaLabel="Move left" onPress={() => onMove("left")}>
            <Icon name="left" />
          </PressButton>
          <PressButton className="maze-move" ariaLabel="Move down" onPress={() => onMove("down")}>
            <Icon name="down" />
          </PressButton>
          <PressButton className="maze-move" ariaLabel="Move right" onPress={() => onMove("right")}>
            <Icon name="right" />
          </PressButton>
        </div>
      </div>
    </section>
  );
}

function FieldTripOverlay({
  open,
  stage,
  fieldTrip,
  onMove,
}: {
  open: boolean;
  stage: StageContent | null;
  fieldTrip: FieldTripState;
  onMove: (direction: "up" | "down" | "jump") => void;
}) {
  const creature = fieldTrip.creature || { x: 92, lane: 1, name: "" };
  const runnerStyle = {
    "--runner-top": `${LANE_TOPS[fieldTrip.lane]}%`,
    "--runner-hop": fieldTrip.hopping ? "-18px" : "0",
  } as CSSProperties;
  const creatureStyle = {
    "--creature-x": `${creature.x}%`,
    "--creature-top": `${LANE_TOPS[creature.lane]}%`,
  } as CSSProperties;
  const tripStageStyle = {
    "--sky-offset": `${-fieldTrip.progress * 1.2}px`,
  } as CSSProperties;

  return (
    <section
      className="trip-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tripTitle"
      tabIndex={-1}
      hidden={!open}
    >
      <div className="trip-modal">
        <div className="trip-header">
          <p>Field Trip</p>
          <h2 id="tripTitle">{stage?.fieldTrip.title || "Run to the finish"}</h2>
          <span>{stage?.fieldTrip.intro || "Collect friendly creatures."}</span>
        </div>
        <div className="trip-stage" aria-label="Left to right field trip" style={tripStageStyle}>
          <div className="trip-sky" />
          <div className="trip-finish" aria-hidden="true" />
          <div className="trip-runner" aria-hidden="true" style={runnerStyle} />
          <div
            className="trip-creature"
            aria-hidden="true"
            data-creature={creature.name}
            style={creatureStyle}
          />
          <div className="trip-lanes" aria-hidden="true"><span /><span /><span /></div>
        </div>
        <div className="trip-progress" aria-hidden="true">
          <div id="tripProgressFill" style={{ width: `${fieldTrip.progress}%` }} />
        </div>
        <p className="trip-message" role="status" aria-live="polite">{fieldTrip.message}</p>
        <div className="trip-controls no-zoom-controls" aria-label="Field trip controls">
          <PressButton className="trip-move" ariaLabel="Move up" onPress={() => onMove("up")}>
            <Icon name="up" />
            <span>Up</span>
          </PressButton>
          <PressButton className="trip-move" ariaLabel="Jump" onPress={() => onMove("jump")}>
            <span>Jump</span>
          </PressButton>
          <PressButton className="trip-move" ariaLabel="Move down" onPress={() => onMove("down")}>
            <Icon name="down" />
            <span>Down</span>
          </PressButton>
        </div>
      </div>
    </section>
  );
}

function PressButton({
  className,
  ariaLabel,
  onPress,
  children,
}: {
  className: string;
  ariaLabel: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <button
      className={className}
      type="button"
      aria-label={ariaLabel}
      onPointerDown={(event) => {
        event.preventDefault();
        onPress();
      }}
      onClick={(event) => {
        if (event.detail === 0) {
          onPress();
        }

        event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

function rewardStatus(stage: StageContent, stageState: ReturnType<typeof activeStageState>): string {
  if (stageState.pendingReward) {
    const reward = rewardById(stage, stageState.pendingReward.itemId);
    return reward
      ? `Find the treasure chest to claim ${reward.name}.`
      : "Find the treasure chest to claim the reward.";
  }

  const completed = new Set(stageState.completedMazeMilestones);
  const nextReward = stage.rewards.find((reward) => !completed.has(reward.milestone));

  if (!nextReward) {
    return "All treasure gear found for this stage.";
  }

  const wordsNeeded = Math.max(0, nextReward.milestone - stageState.knownWords.length);

  return wordsNeeded === 0
    ? `Treasure is ready for ${nextReward.name}.`
    : `${wordsNeeded} more known word${wordsNeeded === 1 ? "" : "s"} to find ${nextReward.name}.`;
}

function spawnCreature(creatures: FieldTripContent["creatures"]): TripCreature {
  return {
    x: 92 + Math.random() * 10,
    lane: Math.floor(Math.random() * 3),
    name: creatures[Math.floor(Math.random() * creatures.length)] || "friend",
  };
}
