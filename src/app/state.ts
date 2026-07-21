import { MAZE_START, TRIP_TARGET } from "../game";
import type { ProgressState, SightWordsContent, User } from "../types";
import {
  FIELD_TRIP_ATTACK_MS,
  FIELD_TRIP_ATTACK_TELEGRAPH_MS,
  spawnCreature,
  type TripCreature,
} from "./fieldTrip";

export interface LastAnswerAction {
  stageId: number;
  wordIndex: number;
  previousState: ProgressState;
}

export interface TreasureRevealState {
  stageId: number;
  rewardId: string;
}

export interface MazeState {
  open: boolean;
  position: { row: number; col: number };
  message: string;
  bumpCount: number;
}

export interface FieldTripState {
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

export interface AppState {
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
  activeWorld: "words" | "phrases";
}

export type AppAction =
  | { type: "bootstrapped"; content: SightWordsContent; progress: ProgressState }
  | { type: "accountReady"; user: User | null; progress?: ProgressState; message: string }
  | { type: "setUser"; user: User | null; message: string }
  | { type: "setProgress"; progress: ProgressState; lastAnswerAction?: LastAnswerAction | null }
  | { type: "setAuthMessage"; message: string }
  | { type: "setSpeechNotice"; message: string }
  | { type: "setSpeaking"; speaking: boolean }
  | { type: "setActiveWorld"; world: "words" | "phrases" }
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

export const initialState: AppState = {
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
  activeWorld: "words",
};

export function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "bootstrapped":
      return { ...state, content: action.content, progress: action.progress, loading: false };
    case "accountReady":
      return {
        ...state,
        user: action.user,
        progress: action.progress || state.progress,
        authMessage: action.message,
        loading: false,
        activeWorld: action.user ? state.activeWorld : "words",
      };
    case "setUser":
      return {
        ...state,
        user: action.user,
        authMessage: action.message,
        activeWorld: action.user ? state.activeWorld : "words",
      };
    case "setProgress":
      return {
        ...state,
        progress: action.progress,
        activeWorld: action.progress.phraseForest.unlockedStageIds.length > 0
          ? state.activeWorld
          : "words",
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
    case "setActiveWorld":
      return { ...state, activeWorld: action.world };
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
      return { ...state, maze: { ...state.maze, open: false } };
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
      return { ...state, fieldTrip: { ...initialState.fieldTrip } };
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
