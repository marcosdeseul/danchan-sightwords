import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { api } from "./api";
import { Character, GearIcon } from "./GearArt";
import { TreasureRewardReveal } from "./TreasureRewardReveal";
import {
  MAZE_CHEST,
  MAZE_START,
  MOVE_DELTAS,
  TRIP_TARGET,
  activeStage,
  activeStageState,
  clearOfflineProgress,
  clearPreviousLocalProgress,
  cloneProgress,
  completedFieldTripsFor,
  currentMazeLayout,
  currentWordFor,
  defaultProgress,
  hasNextStage,
  isOpenMazeTile,
  isStageComplete,
  loadOfflineProgress,
  rewardById,
  sanitizeProgress,
  saveOfflineProgress,
  selectWeightedWordIndex,
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

interface WordCheckState {
  stageId: number;
  targetWordIndex: number;
  promptWordIndex: number;
  word: string;
  choices: string[];
  previousState: ProgressState;
  remainingWordIndices: number[];
  failedWordIndices: number[];
  followUpsRemaining: number;
}

interface WordCheckFeedback {
  choice: string;
  correct: boolean;
}

interface TreasureRevealState {
  stageId: number;
  rewardId: string;
}

interface MazeState {
  open: boolean;
  position: { row: number; col: number };
  message: string;
  bumpCount: number;
}

interface TripCreature {
  x: number;
  name: string;
  visualKey: string;
  variant: number;
  kind: "wolf" | "dragon" | "flying-dragon";
}

interface FieldTripState {
  open: boolean;
  stageId: number | null;
  runnerX: number;
  progress: number;
  collected: number;
  creature: TripCreature | null;
  lastTime: number;
  swinging: boolean;
  defending: boolean;
  attackCharge: number;
  attackEffectKey: number;
  blockEffectKey: number;
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
  | { type: "moveFieldTrip"; direction: "left" | "right" | "hit" | "defend"; creatures?: string[]; stageId?: number }
  | { type: "clearFieldTripSwing" }
  | { type: "clearFieldTripDefense" }
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
    message: "Move, attack, and defend against the creatures.",
  },
  loading: true,
  speaking: false,
};

const WORD_CHECK_CHANCE = 0.35;
const WORD_CHECK_FOLLOW_UPS_AFTER_MISS = 2;
const WORD_CHECK_CORRECT_FEEDBACK_MS = 1_500;
const WORD_CHECK_WRONG_FEEDBACK_MS = 4_000;
const FIELD_TRIP_ATTACK_TELEGRAPH_MS = 650;
const FIELD_TRIP_ATTACK_MS = 1_700;
const FIELD_TRIP_DEFEND_MS = 1_300;

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
          runnerX: 16,
          progress: 0,
          collected: 0,
          creature: action.creature,
          lastTime: 0,
          swinging: false,
          defending: false,
          attackCharge: 0,
          attackEffectKey: 0,
          blockEffectKey: 0,
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

      if (action.direction === "left") {
        return {
          ...state,
          fieldTrip: {
            ...state.fieldTrip,
            runnerX: Math.max(10, state.fieldTrip.runnerX - 7),
          },
        };
      }

      if (action.direction === "right") {
        return {
          ...state,
          fieldTrip: {
            ...state.fieldTrip,
            runnerX: Math.min(48, state.fieldTrip.runnerX + 7),
          },
        };
      }

      if (action.direction === "defend") {
        return {
          ...state,
          fieldTrip: {
            ...state.fieldTrip,
            defending: true,
            message: "Shield up! Watch the creature's warning.",
          },
        };
      }

      if (!state.fieldTrip.creature) {
        return {
          ...state,
          fieldTrip: { ...state.fieldTrip, swinging: true },
        };
      }

      const distance = Math.abs(state.fieldTrip.creature.x - state.fieldTrip.runnerX);

      if (distance > 15) {
        return {
          ...state,
          fieldTrip: {
            ...state.fieldTrip,
            swinging: true,
            message: "Move closer, then hit.",
          },
        };
      }

      const collected = Math.min(TRIP_TARGET, state.fieldTrip.collected + 1);

      return {
        ...state,
        fieldTrip: {
          ...state.fieldTrip,
          progress: Math.min(100, (collected / TRIP_TARGET) * 100),
          collected,
          creature: collected >= TRIP_TARGET
            ? null
            : spawnCreature(action.creatures || [], action.stageId || state.fieldTrip.stageId || 1),
          swinging: true,
          attackCharge: 0,
          message: `${state.fieldTrip.creature.name} bonked! ${collected}/${TRIP_TARGET}`,
        },
      };
    }
    case "clearFieldTripSwing":
      return { ...state, fieldTrip: { ...state.fieldTrip, swinging: false } };
    case "clearFieldTripDefense":
      return { ...state, fieldTrip: { ...state.fieldTrip, defending: false } };
    case "tickFieldTrip": {
      const trip = state.fieldTrip;

      if (!trip.open || !trip.creature) {
        return state;
      }

      const delta = trip.lastTime ? Math.min(50, action.timestamp - trip.lastTime) : 0;
      const gap = trip.runnerX - trip.creature.x;
      const speed = delta * 0.03;
      const nextX = Math.abs(gap) <= 5
        ? trip.creature.x
        : trip.creature.x + Math.sign(gap) * speed;
      let creature = {
        ...trip.creature,
        x: Math.max(8, Math.min(92, nextX)),
      };
      let message = trip.message;
      let runnerX = trip.runnerX;
      let attackCharge = Math.abs(creature.x - trip.runnerX) <= 11
        ? trip.attackCharge + delta
        : 0;
      let attackEffectKey = trip.attackEffectKey;
      let blockEffectKey = trip.blockEffectKey;

      if (attackCharge >= FIELD_TRIP_ATTACK_MS) {
        const blocked = trip.defending;
        attackCharge = 0;
        attackEffectKey += 1;
        creature = {
          ...creature,
          x: Math.min(92, creature.x + (blocked ? 18 : 10)),
        };

        if (blocked) {
          blockEffectKey += 1;
          message = `Great block! ${creature.name} bounced back.`;
        } else {
          runnerX = Math.max(10, trip.runnerX - 7);
          message = `${creature.name} pushed you back. Defend when you see the warning!`;
        }
      } else if (attackCharge >= FIELD_TRIP_ATTACK_TELEGRAPH_MS) {
        message = `${creature.name} is about to attack. Defend!`;
      } else if (Math.abs(creature.x - trip.runnerX) <= 11) {
        message = `${creature.name} is close. Attack or get ready to defend.`;
      }

      return {
        ...state,
        fieldTrip: {
          ...trip,
          progress: Math.min(100, (trip.collected / TRIP_TARGET) * 100),
          creature,
          runnerX,
          attackCharge,
          attackEffectKey,
          blockEffectKey,
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
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [wordCheck, setWordCheck] = useState<WordCheckState | null>(null);
  const [wordCheckFeedback, setWordCheckFeedback] = useState<WordCheckFeedback | null>(null);
  const [treasureReveal, setTreasureReveal] = useState<TreasureRevealState | null>(null);
  const stateRef = useRef(state);
  const autoAdvanceTimer = useRef<number>(0);
  const queuedProgress = useRef<ProgressState | null>(null);
  const syncInFlight = useRef(false);
  const wordCheckFeedbackTimer = useRef<number>(0);
  const fieldTripDefenseTimer = useRef<number>(0);
  const pendingWordCheckIndices = useRef<Record<number, number[]>>({});
  const rewardClaimInFlight = useRef(false);

  stateRef.current = state;

  const flushProgressToServer = useCallback(async () => {
    const current = stateRef.current;
    const user = current.user;

    if (!user || syncInFlight.current) {
      return;
    }

    if (!queuedProgress.current && current.content) {
      queuedProgress.current = loadOfflineProgress(current.content, user.id);
    }

    if (!queuedProgress.current) {
      return;
    }

    syncInFlight.current = true;
    let recoveredOfflineProgress = Boolean(
      current.content && loadOfflineProgress(current.content, user.id),
    );

    try {
      while (queuedProgress.current) {
        const progressToSave = queuedProgress.current;
        queuedProgress.current = null;

        try {
          const result = await api<ProgressResponse>("/api/progress", {
            method: "PUT",
            body: { progress: progressToSave },
          });

          if (queuedProgress.current) {
            continue;
          }

          const latest = stateRef.current;

          clearOfflineProgress(user.id);
          clearPreviousLocalProgress();

          if (latest.user?.id !== user.id || !latest.content) {
            return;
          }

          const syncedProgress = sanitizeProgress(latest.content, result.progress);
          dispatch({ type: "setProgress", progress: syncedProgress });
          dispatch({
            type: "setAuthMessage",
            message: recoveredOfflineProgress ? "Back online. Progress synced." : "",
          });
          recoveredOfflineProgress = false;
        } catch {
          const latestProgress = queuedProgress.current || progressToSave;
          queuedProgress.current = latestProgress;
          const savedOffline = saveOfflineProgress(user.id, latestProgress);

          dispatch({
            type: "setAuthMessage",
            message: savedOffline
              ? "Offline. Progress is saved on this device and will sync automatically."
              : "Server unavailable. Keep this page open so progress can retry.",
          });
          return;
        }
      }
    } finally {
      syncInFlight.current = false;
    }
  }, []);

  const commitProgress = useCallback((nextProgress: ProgressState, options: {
    sync?: boolean;
    lastAnswerAction?: LastAnswerAction | null;
  } = {}): ProgressState | null => {
    const content = stateRef.current.content;

    if (!content) {
      return null;
    }

    const cleanProgress = sanitizeProgress(content, nextProgress);
    dispatch({
      type: "setProgress",
      progress: cleanProgress,
      lastAnswerAction: options.lastAnswerAction,
    });

    if (stateRef.current.user && options.sync !== false) {
      const user = stateRef.current.user;
      queuedProgress.current = cleanProgress;

      if (window.navigator.onLine === false) {
        const savedOffline = saveOfflineProgress(user.id, cleanProgress);
        dispatch({
          type: "setAuthMessage",
          message: savedOffline
            ? "Offline. Progress is saved on this device and will sync automatically."
            : "Server unavailable. Keep this page open so progress can retry.",
        });
      } else {
        void flushProgressToServer();
      }
    }

    return cleanProgress;
  }, [flushProgressToServer]);

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
    rewardClaimInFlight.current = false;
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
      creature: spawnCreature(stage.fieldTrip.creatures, stage.id),
      message: `Defeat ${TRIP_TARGET} creatures and block their attacks.`,
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

  const rememberWordCheckCandidate = useCallback((stageId: number, wordIndex: number) => {
    const currentStageIndices = pendingWordCheckIndices.current[stageId] || [];

    if (!currentStageIndices.includes(wordIndex)) {
      pendingWordCheckIndices.current[stageId] = [...currentStageIndices, wordIndex];
    }
  }, []);

  const forgetWordCheckCandidate = useCallback((stageId: number, wordIndex: number) => {
    const currentStageIndices = pendingWordCheckIndices.current[stageId] || [];
    pendingWordCheckIndices.current[stageId] = currentStageIndices.filter(
      (candidateIndex) => candidateIndex !== wordIndex,
    );
  }, []);

  const clearWordCheckCandidates = useCallback((stageId: number) => {
    pendingWordCheckIndices.current[stageId] = [];
  }, []);

  const clearWordCheckFeedback = useCallback(() => {
    if (wordCheckFeedbackTimer.current) {
      window.clearTimeout(wordCheckFeedbackTimer.current);
      wordCheckFeedbackTimer.current = 0;
    }

    setWordCheckFeedback(null);
  }, []);

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

    const nextWordIndex = selectWeightedWordIndex(current.content, current.progress);
    const nextDeckIndex =
      nextWordIndex === null ? -1 : stageState.deckOrder.indexOf(nextWordIndex);
    goToWord(nextDeckIndex === -1 ? stageState.currentIndex + 1 : nextDeckIndex);
  }, [goToWord, openFieldTrip]);

  const applyKnownWord = useCallback(({
    stageId,
    wordIndex,
    previousState,
    speak = true,
  }: {
    stageId: number;
    wordIndex: number;
    previousState: ProgressState;
    speak?: boolean;
  }) => {
    const current = stateRef.current;

    if (!current.content) {
      return;
    }

    clearAutoAdvance();
    const stage = stageById(current.content, stageId);
    const word = stage.words[wordIndex];

    if (!word) {
      return;
    }

    const nextProgress = cloneProgress(previousState);
    nextProgress.activeStageId = stage.id;
    const previousStageState = previousState.stages[String(stage.id)];
    const nextStageState = nextProgress.stages[String(stage.id)];

    if (!previousStageState || !nextStageState) {
      return;
    }

    const answerSnapshot: LastAnswerAction = {
      stageId: stage.id,
      wordIndex,
      previousState: cloneProgress(previousState),
    };
    const knownWords = new Set(nextStageState.knownWords);
    const practiceWords = new Set(nextStageState.practiceWords);
    const previousKnownCount = previousStageState.knownWords.length;

    if (speak) {
      speakWord(word, { clearAutoAdvance: false });
    }

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
    scheduleNextWord,
    showCelebration,
    speakWord,
  ]);

  const applyPracticeWord = useCallback(({
    stageId,
    wordIndex,
    previousState,
    speak = true,
    message,
    advance = true,
  }: {
    stageId: number;
    wordIndex: number;
    previousState: ProgressState;
    speak?: boolean;
    message?: string;
    advance?: boolean;
  }): ProgressState | null => {
    const current = stateRef.current;

    if (!current.content) {
      return null;
    }

    clearAutoAdvance();
    const stage = stageById(current.content, stageId);
    const word = stage.words[wordIndex];

    if (!word) {
      return null;
    }

    const nextProgress = cloneProgress(previousState);
    nextProgress.activeStageId = stage.id;
    const nextStageState = nextProgress.stages[String(stage.id)];

    if (!nextStageState) {
      return null;
    }

    const answerSnapshot: LastAnswerAction = {
      stageId: stage.id,
      wordIndex,
      previousState: cloneProgress(previousState),
    };
    const knownWords = new Set(nextStageState.knownWords);
    const practiceWords = new Set(nextStageState.practiceWords);

    if (speak) {
      speakWord(word, { clearAutoAdvance: false });
    }

    knownWords.delete(word);
    practiceWords.add(word);
    nextStageState.knownWords = stage.words.filter((stageWord) => knownWords.has(stageWord));
    nextStageState.practiceWords = stage.words.filter((stageWord) => practiceWords.has(stageWord));
    forgetWordCheckCandidate(stage.id, wordIndex);
    const committedProgress = commitProgress(nextProgress, { lastAnswerAction: answerSnapshot });

    if (message) {
      showCelebration(message);
    }

    if (advance) {
      scheduleNextWord(900);
    }

    return committedProgress;
  }, [
    clearAutoAdvance,
    commitProgress,
    forgetWordCheckCandidate,
    scheduleNextWord,
    showCelebration,
    speakWord,
  ]);

  const markKnown = useCallback(() => {
    const current = stateRef.current;

    if (!current.content || !current.progress || !requireAuthenticated()) {
      return;
    }

    clearAutoAdvance();
    const stage = activeStage(current.content, current.progress);
    const stageState = activeStageState(current.content, current.progress);
    const word = currentWordFor(current.content, current.progress);
    const wordIndex = stage.words.indexOf(word);
    const previousState = cloneProgress(current.progress);
    const isNewKnownWord = !stageState.knownWords.includes(word);
    const candidateWordIndices = buildWordCheckCandidateIndices(
      stage,
      stageState,
      pendingWordCheckIndices.current[stage.id] || [],
      wordIndex,
    );
    const shouldCheck =
      isNewKnownWord &&
      !wordCheck &&
      stage.words.length > 1 &&
      candidateWordIndices.length > 0 &&
      Math.random() < WORD_CHECK_CHANCE;

    if (shouldCheck) {
      const nextCheck = createWordCheckState({
        stage,
        targetWordIndex: wordIndex,
        candidateWordIndices,
        previousState,
        failedWordIndices: [],
        followUpsRemaining: 0,
      });

      if (nextCheck) {
        clearWordCheckFeedback();
        setWordCheck(nextCheck);
        speakWord(nextCheck.word, { clearAutoAdvance: false });
        return;
      }

      rememberWordCheckCandidate(stage.id, wordIndex);
      applyKnownWord({ stageId: stage.id, wordIndex, previousState });
      return;
    }

    if (isNewKnownWord) {
      rememberWordCheckCandidate(stage.id, wordIndex);
    }

    applyKnownWord({ stageId: stage.id, wordIndex, previousState });
  }, [
    applyKnownWord,
    clearAutoAdvance,
    clearWordCheckFeedback,
    rememberWordCheckCandidate,
    requireAuthenticated,
    speakWord,
    wordCheck,
  ]);

  const markPractice = useCallback(() => {
    const current = stateRef.current;

    if (!current.content || !current.progress || !requireAuthenticated()) {
      return;
    }

    clearAutoAdvance();
    const stage = activeStage(current.content, current.progress);
    const word = currentWordFor(current.content, current.progress);
    applyPracticeWord({
      stageId: stage.id,
      wordIndex: stage.words.indexOf(word),
      previousState: cloneProgress(current.progress),
    });
  }, [applyPracticeWord, clearAutoAdvance, requireAuthenticated]);

  const playWordCheck = useCallback(() => {
    if (!wordCheck) {
      return;
    }

    speakWord(wordCheck.word);
  }, [speakWord, wordCheck]);

  const playWordCheckChoice = useCallback((choice: string) => {
    speakWord(choice, { clearAutoAdvance: false });
  }, [speakWord]);

  const answerWordCheck = useCallback((choice: string) => {
    if (!wordCheck) {
      return;
    }

    const current = stateRef.current;

    if (!current.content) {
      return;
    }

    const check = wordCheck;
    const stage = stageById(current.content, check.stageId);

    if (choice === check.word) {
      const followUpsRemaining = Math.max(0, check.followUpsRemaining - 1);

      if (followUpsRemaining > 0 && check.remainingWordIndices.length > 0) {
        const nextCheck = createWordCheckState({
          stage,
          targetWordIndex: check.targetWordIndex,
          candidateWordIndices: check.remainingWordIndices,
          previousState: check.previousState,
          failedWordIndices: check.failedWordIndices,
          followUpsRemaining,
        });

        if (nextCheck) {
          setWordCheck(nextCheck);
          speakWord(nextCheck.word, { clearAutoAdvance: false });
          return;
        }
      }

      setWordCheck(null);
      clearWordCheckCandidates(check.stageId);

      if (check.failedWordIndices.includes(check.targetWordIndex)) {
        showCelebration("Practice this one");
        scheduleNextWord(900);
        return;
      }

      applyKnownWord({
        stageId: check.stageId,
        wordIndex: check.targetWordIndex,
        previousState: check.previousState,
        speak: false,
      });
      return;
    }

    const failedWordIndices = [...new Set([
      ...check.failedWordIndices,
      check.promptWordIndex,
    ])];
    const committedProgress = applyPracticeWord({
      stageId: check.stageId,
      wordIndex: check.promptWordIndex,
      previousState: check.previousState,
      speak: false,
      message: "Practice this one",
      advance: false,
    });
    const nextCandidateWordIndices = check.remainingWordIndices.filter(
      (candidateIndex) => !failedWordIndices.includes(candidateIndex),
    );
    const nextFollowUpsRemaining = Math.max(
      check.followUpsRemaining,
      WORD_CHECK_FOLLOW_UPS_AFTER_MISS,
    );

    if (nextCandidateWordIndices.length > 0) {
      const nextCheck = createWordCheckState({
        stage,
        targetWordIndex: check.targetWordIndex,
        candidateWordIndices: nextCandidateWordIndices,
        previousState: committedProgress || check.previousState,
        failedWordIndices,
        followUpsRemaining: nextFollowUpsRemaining,
      });

      if (nextCheck) {
        setWordCheck(nextCheck);
        speakWord(nextCheck.word, { clearAutoAdvance: false });
        return;
      }
    }

    setWordCheck(null);
    clearWordCheckCandidates(check.stageId);

    if (!failedWordIndices.includes(check.targetWordIndex)) {
      applyKnownWord({
        stageId: check.stageId,
        wordIndex: check.targetWordIndex,
        previousState: committedProgress || check.previousState,
        speak: false,
      });
      return;
    }

    scheduleNextWord(900);
  }, [
    applyKnownWord,
    applyPracticeWord,
    clearWordCheckCandidates,
    scheduleNextWord,
    showCelebration,
    speakWord,
    wordCheck,
  ]);

  const chooseWordCheck = useCallback((choice: string) => {
    if (!wordCheck || wordCheckFeedback) {
      return;
    }

    const correct = choice === wordCheck.word;
    setWordCheckFeedback({ choice, correct });

    if (wordCheckFeedbackTimer.current) {
      window.clearTimeout(wordCheckFeedbackTimer.current);
    }

    wordCheckFeedbackTimer.current = window.setTimeout(() => {
      wordCheckFeedbackTimer.current = 0;
      setWordCheckFeedback(null);
      answerWordCheck(choice);
    }, correct ? WORD_CHECK_CORRECT_FEEDBACK_MS : WORD_CHECK_WRONG_FEEDBACK_MS);
  }, [answerWordCheck, wordCheck, wordCheckFeedback]);

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
    rewardClaimInFlight.current = false;
    setTreasureReveal(null);
    dispatch({ type: "stopGames" });
    clearWordCheckFeedback();
    setWordCheck(null);
    pendingWordCheckIndices.current = {};
    commitProgress(defaultProgress(current.content), { lastAnswerAction: null });
  }, [
    clearAutoAdvance,
    clearWordCheckFeedback,
    commitProgress,
    requireAuthenticated,
    stopSpeech,
  ]);

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

    if (rewardClaimInFlight.current) {
      return;
    }

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

    rewardClaimInFlight.current = true;

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
    setTreasureReveal({ stageId: stage.id, rewardId: reward.id });
  }, [commitProgress]);

  const continueAfterTreasureReveal = useCallback(() => {
    const current = stateRef.current;
    const claimedReward = treasureReveal;

    setTreasureReveal(null);
    rewardClaimInFlight.current = false;

    if (!claimedReward || !current.content || !current.progress) {
      return;
    }

    const stage = current.content.stages.find(
      (candidate) => candidate.id === claimedReward.stageId,
    );
    const stageState = current.progress.stages[String(claimedReward.stageId)];

    if (!stage || !stageState) {
      return;
    }

    if (isStageComplete(stage, stageState)) {
      handleStageComplete(stage, current.progress);
    } else {
      scheduleNextWord(0);
    }
  }, [handleStageComplete, scheduleNextWord, treasureReveal]);

  const moveFieldTrip = useCallback((direction: "left" | "right" | "hit" | "defend") => {
    if (!requireAuthenticated()) {
      return;
    }

    const current = stateRef.current;
    const stage = current.content && current.fieldTrip.stageId !== null
      ? stageById(current.content, current.fieldTrip.stageId)
      : null;

    dispatch({
      type: "moveFieldTrip",
      direction,
      creatures: stage?.fieldTrip.creatures,
      stageId: stage?.id,
    });

    if (direction === "hit") {
      window.setTimeout(() => dispatch({ type: "clearFieldTripSwing" }), 180);
    }

    if (direction === "defend") {
      window.clearTimeout(fieldTripDefenseTimer.current);
      fieldTripDefenseTimer.current = window.setTimeout(
        () => {
          fieldTripDefenseTimer.current = 0;
          dispatch({ type: "clearFieldTripDefense" });
        },
        FIELD_TRIP_DEFEND_MS,
      );
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

  const authenticate = useCallback(async (mode: "login" | "signup", username: string, password: string) => {
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
        body: { username, password },
      });
      const offlineProgress = loadOfflineProgress(current.content, result.user.id);
      let nextProgress = sanitizeProgress(current.content, result.progress);
      let message = "";

      if (offlineProgress) {
        try {
          const synced = await api<ProgressResponse>("/api/progress", {
            method: "PUT",
            body: { progress: offlineProgress },
          });
          nextProgress = sanitizeProgress(current.content, synced.progress);
          clearOfflineProgress(result.user.id);
          message = "Back online. Progress synced.";
        } catch {
          nextProgress = offlineProgress;
          queuedProgress.current = offlineProgress;
          message = "Offline. Progress is saved on this device and will sync automatically.";
        }
      }

      clearPreviousLocalProgress();
      pendingWordCheckIndices.current = {};
      rewardClaimInFlight.current = false;
      setTreasureReveal(null);
      clearWordCheckFeedback();
      setWordCheck(null);
      dispatch({
        type: "accountReady",
        user: result.user,
        progress: nextProgress,
        message,
      });

      window.setTimeout(openPendingMaze, 0);
    } catch (error) {
      dispatch({
        type: "setAuthMessage",
        message: error instanceof Error ? error.message : "Could not log in.",
      });
    }
  }, [clearWordCheckFeedback, openPendingMaze]);

  const updateAccountEmail = useCallback(async (email: string) => {
    dispatch({
      type: "setAuthMessage",
      message: "Saving account settings...",
    });

    try {
      const result = await api<MeResponse>("/api/me", {
        method: "PUT",
        body: { email },
      });

      dispatch({
        type: "setUser",
        user: result.user,
        message: "Account settings saved.",
      });
    } catch (error) {
      dispatch({
        type: "setAuthMessage",
        message: error instanceof Error ? error.message : "Could not save settings.",
      });
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await api<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
    } catch {
      // Local play remains blocked behind login even if logout request fails.
    }

    clearAutoAdvance();
    stopSpeech();
    dispatch({ type: "stopGames" });
    setInventoryOpen(false);
    rewardClaimInFlight.current = false;
    setTreasureReveal(null);
    clearWordCheckFeedback();
    setWordCheck(null);
    pendingWordCheckIndices.current = {};
    queuedProgress.current = null;
    dispatch({ type: "setUser", user: null, message: "Logged out. Log in or sign up to play." });
  }, [clearAutoAdvance, clearWordCheckFeedback, stopSpeech]);

  useEffect(() => {
    rewardClaimInFlight.current = false;
    setTreasureReveal(null);
  }, [state.user?.id]);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const content = await api<SightWordsContent>("/api/content");
        const initialProgress = defaultProgress(content);

        if (cancelled) {
          return;
        }

        dispatch({ type: "bootstrapped", content, progress: initialProgress });

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

          const offlineProgress = loadOfflineProgress(content, me.user.id);
          let nextProgress: ProgressState;
          let message = "";

          try {
            const serverProgress = await api<ProgressResponse>("/api/progress");
            nextProgress = sanitizeProgress(content, serverProgress.progress);
          } catch (error) {
            if (!offlineProgress) {
              throw error;
            }

            nextProgress = offlineProgress;
            queuedProgress.current = offlineProgress;
            message = "Offline. Progress is saved on this device and will sync automatically.";
          }

          if (offlineProgress && message === "") {
            try {
              const synced = await api<ProgressResponse>("/api/progress", {
                method: "PUT",
                body: { progress: offlineProgress },
              });
              nextProgress = sanitizeProgress(content, synced.progress);
              clearOfflineProgress(me.user.id);
              message = "Back online. Progress synced.";
            } catch {
              nextProgress = offlineProgress;
              queuedProgress.current = offlineProgress;
              message = "Offline. Progress is saved on this device and will sync automatically.";
            }
          }

          clearPreviousLocalProgress();
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
            message: window.navigator.onLine === false
              ? "Server unavailable. Reconnect to log in."
              : "Log in or sign up to play.",
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
    const retrySync = () => {
      void flushProgressToServer();
    };
    const retryVisibleSync = () => {
      if (document.visibilityState === "visible") {
        retrySync();
      }
    };
    const interval = window.setInterval(retrySync, 10_000);

    window.addEventListener("online", retrySync);
    window.addEventListener("focus", retrySync);
    document.addEventListener("visibilitychange", retryVisibleSync);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("online", retrySync);
      window.removeEventListener("focus", retrySync);
      document.removeEventListener("visibilitychange", retryVisibleSync);
    };
  }, [flushProgressToServer, state.user?.id]);

  useEffect(() => {
    const current = stateRef.current;
    const stage = current.content && current.progress
      ? activeStage(current.content, current.progress)
      : null;
    const stageClasses = [
      "stage-ancient",
      "stage-roman",
      "stage-medieval",
      "stage-modern",
      "stage-pilot",
    ];

    document.body.classList.remove(...stageClasses);
    document.body.classList.add(stage?.themeClass || "stage-ancient");
    document.body.classList.toggle("auth-required", !state.user);
    document.body.classList.toggle("is-speaking", state.speaking);
    document.body.classList.toggle("maze-is-open", state.maze.open);
    document.body.classList.toggle("trip-is-open", state.fieldTrip.open);
    document.body.classList.toggle("inventory-is-open", inventoryOpen);
    document.body.classList.toggle("word-check-is-open", Boolean(wordCheck));
    document.body.classList.toggle("reward-reveal-is-open", Boolean(treasureReveal));
  }, [state.user, state.speaking, state.maze.open, state.fieldTrip.open, state.content, state.progress, inventoryOpen, wordCheck, treasureReveal]);

  useEffect(() => () => {
    if (wordCheckFeedbackTimer.current) {
      window.clearTimeout(wordCheckFeedbackTimer.current);
    }

    if (fieldTripDefenseTimer.current) {
      window.clearTimeout(fieldTripDefenseTimer.current);
    }
  }, []);

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
      state.fieldTrip.collected >= TRIP_TARGET
    ) {
      completeFieldTrip();
    }
  }, [state.fieldTrip.open, state.fieldTrip.collected, completeFieldTrip]);

	  useEffect(() => {
	    const handleKeyDown = (event: KeyboardEvent) => {
	      const current = stateRef.current;

	      if (!current.user) {
	        return;
	      }

      if (treasureReveal) {
        return;
      }

      if (inventoryOpen && event.key === "Escape") {
        event.preventDefault();
        setInventoryOpen(false);
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
        const directionByKey: Record<string, "left" | "right" | "hit" | "defend" | undefined> = {
          ArrowLeft: "left",
          ArrowRight: "right",
          ArrowDown: "defend",
          " ": "hit",
          Enter: "hit",
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
	  }, [inventoryOpen, moveFieldTrip, moveMaze, treasureReveal]);

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
    const equipped = new Set(stageState.equippedItems);
    const equippedRewards = stage.rewards.filter((reward) => equipped.has(reward.id));
    const knownCount = stageState.knownWords.length;

    return {
      stage,
      stageState,
      word,
      knownSet,
      practiceSet,
      equippedRewards,
      knownCount,
      practiceCount: stageState.practiceWords.length,
      leftCount: stage.words.length - knownCount,
      totalCount: totalKnownCount(state.content, state.progress),
      knownPercent: (knownCount / stage.words.length) * 100,
    };
  }, [state.content, state.progress]);

  const treasureRevealDetails = useMemo(() => {
    if (!treasureReveal || !state.user || !state.content || !state.progress) {
      return null;
    }

    const revealStage = state.content.stages.find(
      (candidate) => candidate.id === treasureReveal.stageId,
    );
    const revealStageState = state.progress.stages[String(treasureReveal.stageId)];
    const revealReward = revealStage
      ? rewardById(revealStage, treasureReveal.rewardId)
      : undefined;

    if (
      !revealStage ||
      !revealStageState ||
      !revealReward ||
      !revealStageState.unlockedItems.includes(revealReward.id) ||
      !revealStageState.equippedItems.includes(revealReward.id)
    ) {
      return null;
    }

    const equippedIds = new Set(revealStageState.equippedItems);

    return {
      stage: revealStage,
      reward: revealReward,
      equippedRewards: revealStage.rewards.filter((reward) => equippedIds.has(reward.id)),
    };
  }, [state.content, state.progress, state.user, treasureReveal]);

  useEffect(() => {
    if (treasureReveal && !treasureRevealDetails) {
      rewardClaimInFlight.current = false;
      setTreasureReveal(null);
    }
  }, [treasureReveal, treasureRevealDetails]);

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

  const { stage, stageState, word, knownSet, practiceSet, equippedRewards } = viewModel;

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
            onUpdateEmail={updateAccountEmail}
            onLogout={logout}
            onResetProgress={resetProgress}
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
              equippedRewards={equippedRewards}
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
            </div>

            {state.speechNotice && (
              <p className="notice" role="status">{state.speechNotice}</p>
            )}
          </section>

          <ProgressPanel
            content={state.content}
            stage={stage}
            stageState={stageState}
            knownPercent={viewModel.knownPercent}
            onStartFieldTrip={() => openFieldTrip(stage.id)}
            onOpenInventory={() => setInventoryOpen(true)}
          />
        </main>
      </div>

      <InventoryOverlay
        open={inventoryOpen}
        stage={stage}
        stageState={stageState}
        onClose={() => setInventoryOpen(false)}
        onToggleGear={toggleGearItem}
      />

      <WordCheckOverlay
        check={wordCheck}
        feedback={wordCheckFeedback}
        onPlay={playWordCheck}
        onPlayChoice={playWordCheckChoice}
        onChoose={chooseWordCheck}
      />

      <MazeOverlay
        open={state.maze.open}
        content={state.content}
        progress={state.progress}
        maze={state.maze}
        onMove={moveMaze}
      />
      {treasureRevealDetails && (
        <TreasureRewardReveal
          stage={treasureRevealDetails.stage}
          reward={treasureRevealDetails.reward}
          equippedRewards={treasureRevealDetails.equippedRewards}
          onContinue={continueAfterTreasureReveal}
        />
      )}
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
  onUpdateEmail,
  onLogout,
  onResetProgress,
}: {
  user: User | null;
  message: string;
  onAuthenticate: (mode: "login" | "signup", username: string, password: string) => void;
  onUpdateEmail: (email: string) => void;
  onLogout: () => void;
  onResetProgress: () => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [settingsEmail, setSettingsEmail] = useState(user?.email || "");

  useEffect(() => {
    setSettingsEmail(user?.email || "");
  }, [user?.email]);

  if (user) {
    return (
      <section className="auth-panel" aria-label="Account">
        <div className="auth-user">
          <Icon name="user" />
          <span>{user.username}</span>
          <button className="auth-button secondary" type="button" onClick={onLogout}>Log out</button>
        </div>
        <form
          className="account-settings"
          onSubmit={(event) => {
            event.preventDefault();
            onUpdateEmail(settingsEmail);
          }}
        >
          <label className="sr-only" htmlFor="accountEmail">Email</label>
          <input
            id="accountEmail"
            type="email"
            autoComplete="email"
            placeholder="Email (optional)"
            value={settingsEmail}
            onChange={(event) => setSettingsEmail(event.currentTarget.value)}
          />
          <button className="auth-button" type="submit">Save</button>
        </form>
        <details className="parent-controls">
          <summary>Parent controls</summary>
          <button
            className="auth-button danger-account-button"
            type="button"
            onClick={onResetProgress}
          >
            <Icon name="trash" />
            <span>Reset all progress</span>
          </button>
        </details>
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
          onAuthenticate("login", username, password);
          setPassword("");
        }}
      >
        <input
          type="text"
          autoComplete="username"
          inputMode="text"
          placeholder="Username"
          aria-label="Username"
          value={username}
          onChange={(event) => setUsername(event.currentTarget.value)}
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
            onAuthenticate("signup", username, password);
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
  equippedRewards,
  celebration,
  celebrationKey,
}: {
  stage: StageContent;
  stageState: ReturnType<typeof activeStageState>;
  word: string;
  known: boolean;
  practice: boolean;
  equippedRewards: RewardItem[];
  celebration: string;
  celebrationKey: number;
}) {
  const wordRef = useRef<HTMLDivElement>(null);
  const [wordFontSize, setWordFontSize] = useState(MAX_WORD_FONT_SIZE);

  useLayoutEffect(() => {
    const wordElement = wordRef.current;

    if (!wordElement) {
      return undefined;
    }

    let cancelled = false;
    const updateWordSize = () => {
      if (cancelled) {
        return;
      }

      const nextSize = fittedWordFontSize(word, wordElement.clientWidth);
      setWordFontSize((currentSize) =>
        Math.abs(currentSize - nextSize) > 0.5 ? nextSize : currentSize,
      );
    };

    updateWordSize();

    if (document.fonts?.ready) {
      document.fonts.ready.then(updateWordSize).catch(() => undefined);
    }

    if (typeof ResizeObserver === "undefined") {
      return () => {
        cancelled = true;
      };
    }

    const observer = new ResizeObserver(updateWordSize);
    observer.observe(wordElement);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [word]);

  return (
    <div className="word-card">
      <div className="star-field" aria-hidden="true">
        <svg className="star star-a" viewBox="0 0 24 24" focusable="false"><use href="#icon-star" /></svg>
        <svg className="star star-b" viewBox="0 0 24 24" focusable="false"><use href="#icon-star" /></svg>
        <svg className="star star-c" viewBox="0 0 24 24" focusable="false"><use href="#icon-star" /></svg>
      </div>
      <p className="word-position">{stage.title} - Word {stageState.currentIndex + 1} of {stage.words.length}</p>
      <div className="word-character-preview" aria-hidden="true">
        <Character stage={stage} equippedRewards={equippedRewards} />
      </div>
      <div
        ref={wordRef}
        className="word"
        style={{ "--word-font-size": `${wordFontSize}px` } as CSSProperties}
        aria-live="polite"
        aria-atomic="true"
        aria-label={`Current word: ${word}`}
      >
        <span className="word-text">{word}</span>
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

const MAX_WORD_FONT_SIZE = 168;
const MIN_WORD_FONT_SIZE = 38;
const WORD_FONT_FAMILY = 'Inter, ui-rounded, "Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif';
let wordMeasureCanvas: HTMLCanvasElement | null = null;

function fittedWordFontSize(
  word: string,
  containerWidth: number,
  maxFontSize = MAX_WORD_FONT_SIZE,
  minFontSize = MIN_WORD_FONT_SIZE,
): number {
  if (!containerWidth || typeof document === "undefined") {
    return maxFontSize;
  }

  if (!wordMeasureCanvas) {
    wordMeasureCanvas = document.createElement("canvas");
  }

  const context = wordMeasureCanvas.getContext("2d");

  if (!context) {
    return maxFontSize;
  }

  context.font = `950 ${maxFontSize}px ${WORD_FONT_FAMILY}`;

  const measuredWidth = Math.max(1, context.measureText(word).width);
  const availableWidth = Math.max(120, containerWidth - 12);
  const fittedSize = Math.floor(maxFontSize * Math.min(1, availableWidth / measuredWidth));

  return Math.max(minFontSize, Math.min(maxFontSize, fittedSize));
}

function ProgressPanel({
  content,
  stage,
  stageState,
  knownPercent,
  onStartFieldTrip,
  onOpenInventory,
}: {
  content: SightWordsContent;
  stage: StageContent;
  stageState: ReturnType<typeof activeStageState>;
  knownPercent: number;
  onStartFieldTrip: () => void;
  onOpenInventory: () => void;
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
        <button className="button inventory-open-button" type="button" onClick={onOpenInventory}>
          <Icon name="bag" />
          <span>Open inventory</span>
          <strong>{unlocked.size}/{stage.rewards.length}</strong>
        </button>
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

const MAX_WORD_CHECK_CHOICE_FONT_SIZE = 36;
const MIN_WORD_CHECK_CHOICE_FONT_SIZE = 18;

function WordCheckChoiceLabel({ choice }: { choice: string }) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const [fontSize, setFontSize] = useState(MAX_WORD_CHECK_CHOICE_FONT_SIZE);

  useLayoutEffect(() => {
    const labelElement = labelRef.current;

    if (!labelElement) {
      return undefined;
    }

    let cancelled = false;
    const updateChoiceSize = () => {
      if (cancelled) {
        return;
      }

      const nextSize = fittedWordFontSize(
        choice,
        labelElement.clientWidth,
        MAX_WORD_CHECK_CHOICE_FONT_SIZE,
        MIN_WORD_CHECK_CHOICE_FONT_SIZE,
      );
      setFontSize((currentSize) =>
        Math.abs(currentSize - nextSize) > 0.5 ? nextSize : currentSize,
      );
    };

    updateChoiceSize();

    if (document.fonts?.ready) {
      document.fonts.ready.then(updateChoiceSize).catch(() => undefined);
    }

    if (typeof ResizeObserver === "undefined") {
      return () => {
        cancelled = true;
      };
    }

    const observer = new ResizeObserver(updateChoiceSize);
    observer.observe(labelElement);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [choice]);

  return (
    <span
      ref={labelRef}
      className="word-check-choice-label"
      style={{ "--word-check-choice-font-size": `${fontSize}px` } as CSSProperties}
    >
      {choice}
    </span>
  );
}

function WordCheckOverlay({
  check,
  feedback,
  onPlay,
  onPlayChoice,
  onChoose,
}: {
  check: WordCheckState | null;
  feedback: WordCheckFeedback | null;
  onPlay: () => void;
  onPlayChoice: (choice: string) => void;
  onChoose: (choice: string) => void;
}) {
  if (!check) {
    return null;
  }

  const hasFeedback = Boolean(feedback);
  const showChoiceSounds = feedback?.correct === false;

  return (
    <section
      className="word-check-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wordCheckTitle"
    >
      <div
        className="word-check-modal"
        key={`${check.stageId}:${check.promptWordIndex}`}
      >
        <div className="word-check-header">
          <p>Quick word check</p>
          <h2 id="wordCheckTitle">Which word did you hear?</h2>
        </div>
        <button
          className="button word-check-play"
          type="button"
          onClick={onPlay}
          disabled={hasFeedback}
        >
          <Icon name="speaker" />
          <span>Play sound again</span>
        </button>
        <div className="word-check-choices" aria-label="Word choices">
          {check.choices.map((choice) => {
            const isSelected = feedback?.choice === choice;
            const isCorrectChoice = feedback && choice === check.word;
            const isWrongSelection = feedback && isSelected && choice !== check.word;
            const className = [
              "word-check-choice",
              hasFeedback ? "is-locked" : "",
              isCorrectChoice ? "is-correct" : "",
              isWrongSelection ? "is-wrong" : "",
              hasFeedback && !isSelected && !isCorrectChoice ? "is-dimmed" : "",
            ].filter(Boolean).join(" ");

            return (
              <div
                className={`word-check-option${showChoiceSounds ? " has-playback" : ""}`}
                key={choice}
              >
                <button
                  className={className}
                  type="button"
                  onClick={() => onChoose(choice)}
                  disabled={hasFeedback}
                >
                  <WordCheckChoiceLabel choice={choice} />
                  {(isCorrectChoice || isWrongSelection) && (
                    <span className="word-check-mark" aria-hidden="true">
                      {isCorrectChoice ? "O" : "X"}
                    </span>
                  )}
                </button>
                {showChoiceSounds && (
                  <button
                    className="word-check-choice-play"
                    type="button"
                    aria-label={`Play ${choice}`}
                    title={`Play ${choice}`}
                    onClick={() => onPlayChoice(choice)}
                  >
                    <Icon name="speaker" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {feedback && (
          <p
            className={`word-check-feedback ${feedback.correct ? "is-correct" : "is-wrong"}`}
            role="status"
            aria-live="polite"
          >
            <span className="word-check-feedback-mark" aria-hidden="true">
              {feedback.correct ? "O" : "X"}
            </span>
            <span className="word-check-feedback-text">
              {feedback.correct
                ? "Correct"
                : `Not quite. The correct word is "${check.word}".`}
            </span>
          </p>
        )}
      </div>
    </section>
  );
}

function InventoryOverlay({
  open,
  stage,
  stageState,
  onClose,
  onToggleGear,
}: {
  open: boolean;
  stage: StageContent;
  stageState: ReturnType<typeof activeStageState>;
  onClose: () => void;
  onToggleGear: (itemId: string) => void;
}) {
  const unlocked = new Set(stageState.unlockedItems);
  const equipped = new Set(stageState.equippedItems);

  return (
    <section
      className="inventory-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inventoryTitle"
      tabIndex={-1}
      hidden={!open}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="inventory-modal">
        <div className="inventory-header">
          <div>
            <p>Treasure Gear</p>
            <h2 id="inventoryTitle">{stage.heroName} inventory</h2>
            <span>{unlocked.size} of {stage.rewards.length} found</span>
          </div>
          <button className="icon-button inventory-close-button" type="button" aria-label="Close inventory" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
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
      </div>
    </section>
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
  onMove: (direction: "left" | "right" | "hit" | "defend") => void;
}) {
  const creature = fieldTrip.creature || {
    x: 92,
    name: "",
    visualKey: "stage1-wolf-0",
    variant: 0,
    kind: "wolf" as const,
  };
  const fieldTripRewards = stage?.rewards || [];
  const isTelegraphing = fieldTrip.attackCharge >= FIELD_TRIP_ATTACK_TELEGRAPH_MS;
  const runnerStyle = {
    "--runner-x": `${fieldTrip.runnerX}%`,
  } as CSSProperties;
  const creatureStyle = {
    "--creature-x": `${creature.x}%`,
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
          <span>{stage?.fieldTrip.intro || "Move, attack, and block each creature's charge."}</span>
        </div>
        <div className="trip-stage" aria-label="Left to right field trip" style={tripStageStyle}>
          <div className="trip-sky" />
          <div className="trip-finish" aria-hidden="true" />
          <div
            className={`trip-runner${fieldTrip.swinging ? " is-swinging" : ""}${fieldTrip.defending ? " is-defending" : ""}`}
            aria-hidden="true"
            style={runnerStyle}
          >
            {stage && <Character stage={stage} equippedRewards={fieldTripRewards} />}
            {fieldTrip.defending && <span className="trip-defense-aura" />}
            {fieldTrip.blockEffectKey > 0 && (
              <span className="trip-block-flash" key={fieldTrip.blockEffectKey}>Blocked!</span>
            )}
          </div>
          <div
            className={`trip-monster monster-stage-${stage?.id || 1} monster-kind-${creature.kind} monster-variant-${creature.variant}${isTelegraphing ? " is-winding-up" : ""}`}
            aria-hidden="true"
            data-creature={creature.name}
            data-visual-key={creature.visualKey}
            style={creatureStyle}
          >
            <MonsterArt kind={creature.kind} stageId={stage?.id || 1} variant={creature.variant} />
            {isTelegraphing && <span className="trip-attack-warning">!</span>}
            {fieldTrip.attackEffectKey > 0 && (
              <span className="trip-attack-effect" key={fieldTrip.attackEffectKey}>
                <i /><i /><i />
              </span>
            )}
            <span className="trip-monster-label">{creature.name}</span>
          </div>
          <div className="trip-ground-lines" aria-hidden="true"><span /><span /><span /></div>
        </div>
        <div className="trip-progress" aria-hidden="true">
          <div id="tripProgressFill" style={{ width: `${fieldTrip.progress}%` }} />
        </div>
        <p className="trip-message" role="status" aria-live="polite">{fieldTrip.message}</p>
        <div className="trip-controls no-zoom-controls" aria-label="Field trip controls">
          <PressButton className="trip-move" ariaLabel="Move left" onPress={() => onMove("left")}>
            <Icon name="left" />
            <span>Left</span>
          </PressButton>
          <PressButton className="trip-move trip-hit" ariaLabel="Hit monster" onPress={() => onMove("hit")}>
            <span>Hit</span>
          </PressButton>
          <PressButton className="trip-move trip-defend" ariaLabel="Defend with shield" onPress={() => onMove("defend")}>
            <Icon name="shield" />
            <span>Defend</span>
          </PressButton>
          <PressButton className="trip-move" ariaLabel="Move right" onPress={() => onMove("right")}>
            <Icon name="right" />
            <span>Right</span>
          </PressButton>
        </div>
      </div>
    </section>
  );
}

export function MonsterArt({
  kind,
  stageId,
  variant,
}: {
  kind: TripCreature["kind"];
  stageId: number;
  variant: number;
}) {
  const accentClass = `monster-accent monster-accent-${variant}`;

  if (kind === "flying-dragon") {
    return (
      <svg
        className={`trip-monster-art flying-dragon-creature-art stage-creature-${stageId}`}
        viewBox="0 0 148 104"
        focusable="false"
        aria-hidden="true"
      >
        <path className="monster-shadow" d="M25 92c22-8 75-8 96 0 8 4 2 8-48 8s-56-4-48-8Z" />
        <path className="monster-wing monster-wing-left" d="M67 51C47 13 20 7 5 14l27 17-18 9 43 26Z" />
        <path className="monster-wing monster-wing-right" d="M77 49c18-35 46-39 63-30l-28 14 18 11-43 22Z" />
        <path className="monster-tail" d="M52 62C30 61 15 72 7 67c8 18 32 24 55 8Z" />
        <path className="monster-body" d="M47 44c10-17 42-17 55 0 9 13 4 34-11 43H56c-17-9-20-29-9-43Z" />
        <path className={accentClass} d="M57 51c9-7 27-7 36 0-2 13-8 23-18 30-10-7-16-17-18-30Z" />
        <path className="monster-body monster-head" d="M91 35c7-14 28-16 41-5 8 8 3 22-9 27H99c-10-4-13-13-8-22Z" />
        <path className="monster-crest" d="m98 31-2-16 12 11 9-16 4 19Z" />
        <path className="monster-snout" d="M118 40h25l-6 13h-22Z" />
        <path className="monster-leg" d="M59 78l-7 12 13-5M86 78l8 11 5-7" />
        <circle className="monster-eye" cx="118" cy="34" r="3.5" />
        <circle className="monster-nose" cx="140" cy="46" r="3" />
        <path className="monster-mouth" d="M122 50c5 2 10 1 14-2" />
      </svg>
    );
  }

  if (kind === "dragon") {
    return (
      <svg
        className={`trip-monster-art dragon-creature-art stage-creature-${stageId}`}
        viewBox="0 0 124 92"
        focusable="false"
        aria-hidden="true"
      >
        <path className="monster-shadow" d="M20 81c16-8 67-8 83 0 7 4 2 8-41 8s-49-4-42-8Z" />
        <path className="monster-wing" d="M53 43C36 16 14 13 8 14l19 22-14 4 30 20Z" />
        <path className="monster-tail" d="M39 58C19 56 12 68 5 66c9 12 27 13 44 2Z" />
        <path className="monster-body" d="M35 43c7-17 38-20 53-5 10 10 11 29 1 39H45c-13-8-18-23-10-34Z" />
        <path className={accentClass} d="M45 49c9-7 28-7 37 0-2 13-10 21-19 26-10-5-17-13-18-26Z" />
        <path className="monster-body monster-head" d="M78 28c5-13 25-17 37-6 7 7 5 20-4 27H84c-9-4-11-13-6-21Z" />
        <path className="monster-crest" d="m84 23-2-15 12 11 8-15 4 17Z" />
        <path className="monster-leg" d="M45 67v15h12l3-15M76 67l4 15h12l-3-19" />
        <circle className="monster-eye" cx="101" cy="29" r="3.5" />
        <path className="monster-mouth" d="M101 39c5 2 9 1 13-2" />
        <circle className="monster-nose" cx="115" cy="34" r="2.5" />
      </svg>
    );
  }

  return (
    <svg
      className={`trip-monster-art wolf-creature-art stage-creature-${stageId}`}
      viewBox="0 0 124 92"
      focusable="false"
      aria-hidden="true"
    >
      <path className="monster-shadow" d="M18 81c16-8 68-8 84 0 7 4 2 8-42 8s-49-4-42-8Z" />
      <path className="monster-tail" d="M33 55C14 53 9 39 18 27c0 12 9 16 22 18Z" />
      <path className="monster-body" d="M31 43c11-15 47-17 64-2 10 9 8 27-4 36H42c-13-7-19-22-11-34Z" />
      <path className={accentClass} d="M43 47c11-7 33-8 45-1-4 9-9 16-18 22-11-4-20-11-27-21Z" />
      <path className="monster-body monster-head" d="M79 32c5-16 29-20 41-7 7 8 2 22-10 27H87c-9-3-13-11-8-20Z" />
      <path className="monster-crest" d="m84 26-1-17 15 13 10-15 5 20Z" />
      <path className="monster-snout" d="M104 36h18l-3 11h-17Z" />
      <path className="monster-leg" d="M42 65v18h13l3-18M78 65l3 18h13l-2-21" />
      <circle className="monster-eye" cx="102" cy="29" r="3.5" />
      <circle className="monster-nose" cx="119" cy="40" r="3" />
      <path className="monster-mouth" d="M106 45c4 3 8 3 12 1" />
    </svg>
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

function buildWordCheckCandidateIndices(
  stage: StageContent,
  stageState: ReturnType<typeof activeStageState>,
  rememberedWordIndices: number[],
  targetWordIndex: number,
): number[] {
  const knownWords = new Set(stageState.knownWords);
  const checkedWordIndices = [
    ...rememberedWordIndices.filter(
      (wordIndex) =>
        wordIndex >= 0 &&
        wordIndex < stage.words.length &&
        knownWords.has(stage.words[wordIndex]),
    ),
    targetWordIndex,
  ];

  return [...new Set(checkedWordIndices)].filter(
    (wordIndex) => wordIndex >= 0 && wordIndex < stage.words.length,
  );
}

function createWordCheckState({
  stage,
  targetWordIndex,
  candidateWordIndices,
  previousState,
  failedWordIndices,
  followUpsRemaining,
}: {
  stage: StageContent;
  targetWordIndex: number;
  candidateWordIndices: number[];
  previousState: ProgressState;
  failedWordIndices: number[];
  followUpsRemaining: number;
}): WordCheckState | null {
  const availableWordIndices = [...new Set(candidateWordIndices)].filter(
    (wordIndex) => wordIndex >= 0 && wordIndex < stage.words.length,
  );
  const promptWordIndex = randomWordIndex(availableWordIndices);

  if (promptWordIndex === null) {
    return null;
  }

  const word = stage.words[promptWordIndex];

  return {
    stageId: stage.id,
    targetWordIndex,
    promptWordIndex,
    word,
    choices: buildWordCheckChoices(stage, word),
    previousState,
    remainingWordIndices: availableWordIndices.filter(
      (wordIndex) => wordIndex !== promptWordIndex,
    ),
    failedWordIndices,
    followUpsRemaining,
  };
}

function buildWordCheckChoices(stage: StageContent, word: string): string[] {
  const firstLetter = firstWordLetter(word);
  const availableWords = stage.words.filter((stageWord) => stageWord !== word);
  const sameLetterDistractors = shuffleWords(
    availableWords.filter((stageWord) => firstWordLetter(stageWord) === firstLetter),
  );
  const fallbackDistractors = shuffleWords(
    availableWords.filter((stageWord) => firstWordLetter(stageWord) !== firstLetter),
  );
  const distractors = [
    ...sameLetterDistractors,
    ...fallbackDistractors,
  ].slice(0, 3);

  return shuffleWords([word, ...distractors]);
}

function firstWordLetter(word: string): string {
  return word.trim().toLocaleLowerCase("en-US").match(/[a-z]/)?.[0] || "";
}

function shuffleWords(words: string[]): string[] {
  return [...words].sort(() => Math.random() - 0.5);
}

function randomWordIndex(wordIndices: number[]): number | null {
  return wordIndices.length
    ? wordIndices[Math.floor(Math.random() * wordIndices.length)]
    : null;
}

function spawnCreature(creatures: FieldTripContent["creatures"], stageId: number): TripCreature {
  const names = creatures.length ? creatures : ["monster"];
  const index = Math.floor(Math.random() * names.length);
  const name = names[index] || "monster";
  const kind = creatureKind(name);

  return {
    x: 84 + Math.random() * 8,
    name,
    visualKey: `stage${stageId}-${kind}-${index}`,
    variant: index % 5,
    kind,
  };
}

function creatureKind(name: string): TripCreature["kind"] {
  const normalizedName = name.toLowerCase();

  if (normalizedName.includes("flying dragon")) {
    return "flying-dragon";
  }

  return normalizedName.includes("dragon") ? "dragon" : "wolf";
}
