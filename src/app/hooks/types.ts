import type { Dispatch, SetStateAction } from "react";
import type { ProgressState } from "../../types";
import type {
  AppAction,
  AppState,
  LastAnswerAction,
  TreasureRevealState,
} from "../state";
import type { WordCheckFeedback, WordCheckState } from "../wordCheck";

export interface CurrentRef<T> {
  current: T;
}

export type AppDispatch = Dispatch<AppAction>;

export type CommitProgress = (
  nextProgress: ProgressState,
  options?: { lastAnswerAction?: LastAnswerAction | null },
) => ProgressState | null;

export type SpeakWord = (
  word: string,
  options?: { clearAutoAdvance?: boolean },
) => boolean;

export type SetWordCheck = Dispatch<SetStateAction<WordCheckState | null>>;
export type SetWordCheckFeedback = Dispatch<SetStateAction<WordCheckFeedback | null>>;
export type SetTreasureReveal = Dispatch<SetStateAction<TreasureRevealState | null>>;

export interface AppStateRef extends CurrentRef<AppState> {}
