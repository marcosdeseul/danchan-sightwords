import { useCallback } from "react";
import {
  activeStage,
  activeStageState,
  cloneProgress,
  currentWordFor,
  defaultProgress,
  hasNextStage,
  isStageComplete,
  sanitizeProgress,
  selectWeightedWordIndex,
  sortRewardIds,
  stageById,
} from "../../game";
import type { ProgressState, StageContent } from "../../types";
import type { LastAnswerAction, TreasureRevealState } from "../state";
import {
  WORD_CHECK_CHANCE,
  WORD_CHECK_CORRECT_FEEDBACK_MS,
  WORD_CHECK_WRONG_FEEDBACK_MS,
  buildWordCheckCandidateIndices,
  createWordCheckState,
} from "../wordCheck";
import type { WordCheckFeedback, WordCheckState } from "../wordCheck";
import type {
  AppDispatch,
  AppStateRef,
  CommitProgress,
  CurrentRef,
  SetTreasureReveal,
  SetWordCheck,
  SetWordCheckFeedback,
  SpeakWord,
} from "./types";
import { answerWordCheckAction } from "./wordCheckActions";

export function useWordFlow({
  stateRef,
  autoAdvanceTimer,
  wordCheckFeedbackTimer,
  pendingWordCheckIndices,
  rewardClaimInFlight,
  wordCheck,
  wordCheckFeedback,
  setWordCheck,
  setWordCheckFeedback,
  setTreasureReveal,
  dispatch,
  commitProgress,
  clearAutoAdvance,
  showCelebration,
  stopSpeech,
  speakWord,
  requireAuthenticated,
  openPendingMaze,
  openFieldTrip,
  handleStageComplete,
}: {
  stateRef: AppStateRef;
  autoAdvanceTimer: CurrentRef<number>;
  wordCheckFeedbackTimer: CurrentRef<number>;
  pendingWordCheckIndices: CurrentRef<Record<number, number[]>>;
  rewardClaimInFlight: CurrentRef<boolean>;
  wordCheck: WordCheckState | null;
  wordCheckFeedback: WordCheckFeedback | null;
  setWordCheck: SetWordCheck;
  setWordCheckFeedback: SetWordCheckFeedback;
  setTreasureReveal: SetTreasureReveal;
  dispatch: AppDispatch;
  commitProgress: CommitProgress;
  clearAutoAdvance: () => void;
  showCelebration: (message: string) => void;
  stopSpeech: () => void;
  speakWord: SpeakWord;
  requireAuthenticated: () => boolean;
  openPendingMaze: () => void;
  openFieldTrip: (stageId: number) => void;
  handleStageComplete: (stage: StageContent, progress: ProgressState) => void;
}) {
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
      }) as WordCheckState;

      clearWordCheckFeedback();
      setWordCheck(nextCheck);
      speakWord(nextCheck.word, { clearAutoAdvance: false });
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

  const playWordCheckChoice = useCallback((choice: string) => speakWord(choice, { clearAutoAdvance: false }), [speakWord]);

  const answerWordCheck = useCallback((choice: string) => {
    answerWordCheckAction({
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
    });
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

  return {
    scheduleNextWord,
    rememberWordCheckCandidate,
    forgetWordCheckCandidate,
    clearWordCheckCandidates,
    clearWordCheckFeedback,
    goToWord,
    advanceToNextWord,
    applyKnownWord,
    applyPracticeWord,
    markKnown,
    markPractice,
    playWordCheck,
    playWordCheckChoice,
    answerWordCheck,
    chooseWordCheck,
    goBackOrUndo,
    shuffleDeck,
    resetProgress,
    toggleGearItem,
  };
}
