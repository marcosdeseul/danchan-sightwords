import type { ProgressState, StageContent, StageProgress } from "../types";

export const WORD_CHECK_CHANCE = 0.35;
export const WORD_CHECK_FOLLOW_UPS_AFTER_MISS = 2;
export const WORD_CHECK_CORRECT_FEEDBACK_MS = 1_500;
export const WORD_CHECK_WRONG_FEEDBACK_MS = 4_000;

export interface WordCheckState {
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

export interface WordCheckFeedback {
  choice: string;
  correct: boolean;
}

export function buildWordCheckCandidateIndices(
  stage: StageContent,
  stageState: StageProgress,
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

export function createWordCheckState({
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

export function buildWordCheckChoices(stage: StageContent, word: string): string[] {
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

export function firstWordLetter(word: string): string {
  return word.trim().toLocaleLowerCase("en-US").match(/[a-z]/)?.[0] || "";
}

export function shuffleWords(words: string[]): string[] {
  return [...words].sort(() => Math.random() - 0.5);
}

export function randomWordIndex(wordIndices: number[]): number | null {
  return wordIndices.length
    ? wordIndices[Math.floor(Math.random() * wordIndices.length)]
    : null;
}
