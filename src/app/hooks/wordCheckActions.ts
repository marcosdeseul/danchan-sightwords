import { stageById } from "../../game";
import type { ProgressState } from "../../types";
import { WORD_CHECK_FOLLOW_UPS_AFTER_MISS, createWordCheckState } from "../wordCheck";
import type { WordCheckState } from "../wordCheck";
import type { AppStateRef } from "./types";

interface WordActionInput {
  stageId: number;
  wordIndex: number;
  previousState: ProgressState;
  speak?: boolean;
  message?: string;
  advance?: boolean;
}

export function answerWordCheckAction({
  choice,
  wordCheck,
  stateRef,
  setWordCheck,
  clearWordCheckCandidates,
  showCelebration,
  scheduleNextWord,
  speakWord,
  applyKnownWord,
  applyPracticeWord,
}: {
  choice: string;
  wordCheck: WordCheckState | null;
  stateRef: AppStateRef;
  setWordCheck: (check: WordCheckState | null) => void;
  clearWordCheckCandidates: (stageId: number) => void;
  showCelebration: (message: string) => void;
  scheduleNextWord: (delay: number) => void;
  speakWord: (word: string, options?: { clearAutoAdvance?: boolean }) => boolean;
  applyKnownWord: (input: WordActionInput) => void;
  applyPracticeWord: (input: WordActionInput) => ProgressState | null;
}) {
  if (!wordCheck || !stateRef.current.content) {
    return;
  }

  const check = wordCheck;
  const stage = stageById(stateRef.current.content, check.stageId);

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
      }) as WordCheckState;

      setWordCheck(nextCheck);
      speakWord(nextCheck.word, { clearAutoAdvance: false });
      return;
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

  const failedWordIndices = [...new Set([...check.failedWordIndices, check.promptWordIndex])];
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
    }) as WordCheckState;

    setWordCheck(nextCheck);
    speakWord(nextCheck.word, { clearAutoAdvance: false });
    return;
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
}
