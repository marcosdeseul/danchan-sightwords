import { useEffect, useReducer, useRef, useState } from "react";
import { TreasureRewardReveal } from "./TreasureRewardReveal";
import { PhraseForestWorld } from "./PhraseForestWorld";
import {
  activeStage,
  activeStageState,
  clearOfflineProgress,
  clearPreviousLocalProgress,
  cloneProgress,
  defaultProgress,
  loadOfflineProgress,
  sanitizeProgress,
  stageById,
  wordAcademyComplete,
} from "./game";
import { Icon, IconSprite } from "./icons";
import { useCoreActions } from "./app/hooks/useCoreActions";
import { useFieldTripFlow } from "./app/hooks/useFieldTripFlow";
import { useGameplayEffects } from "./app/hooks/useGameplayEffects";
import { useAppInitialization } from "./app/hooks/useAppInitialization";
import { usePersistence } from "./app/hooks/usePersistence";
import { useSession } from "./app/hooks/useSession";
import { useStageFlow } from "./app/hooks/useStageFlow";
import { useTreasureFlow } from "./app/hooks/useTreasureFlow";
import { useViewModel } from "./app/hooks/useViewModel";
import { useWordFlow } from "./app/hooks/useWordFlow";
import { phraseReadingDayId, readingDayControl } from "./app/phraseDays";
export { phraseReadingDayId, readingDayControl } from "./app/phraseDays";
import { AuthPanel, Brand, ScoreStrip, StageTabs } from "./app/components/Shell";
import { ProgressPanel, WordCard, fittedWordFontSize } from "./app/components/Word";
import {
  FieldTripOverlay,
  InventoryOverlay,
  MazeOverlay,
  MonsterArt,
  PressButton,
  WordCheckOverlay,
} from "./app/components/Overlays";
import { rewardStatus } from "./app/view";
import type { ProgressState } from "./types";

import { initialState, reducer } from "./app/state";
import type {
  AppAction,
  AppState,
  FieldTripState,
  LastAnswerAction,
  MazeState,
  TreasureRevealState,
} from "./app/state";

import type { WordCheckFeedback, WordCheckState } from "./app/wordCheck";
import type { TripCreature } from "./app/fieldTrip";

export { initialState, reducer };
export {
  buildWordCheckCandidateIndices,
  buildWordCheckChoices,
  createWordCheckState,
  firstWordLetter,
  randomWordIndex,
  shuffleWords,
} from "./app/wordCheck";
export { creatureKind, spawnCreature } from "./app/fieldTrip";
export type {
  AppAction,
  AppState,
  FieldTripState,
  LastAnswerAction,
  MazeState,
  TripCreature,
  WordCheckFeedback,
  WordCheckState,
};

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [wordCheck, setWordCheck] = useState<WordCheckState | null>(null);
  const [wordCheckFeedback, setWordCheckFeedback] = useState<WordCheckFeedback | null>(null);
  const [treasureReveal, setTreasureReveal] = useState<TreasureRevealState | null>(null);
  const [readingDayOffset, setReadingDayOffset] = useState(0);
  const stateRef = useRef(state);
  const autoAdvanceTimer = useRef<number>(0);
  const queuedProgress = useRef<ProgressState | null>(null);
  const syncInFlight = useRef(false);
  const wordCheckFeedbackTimer = useRef<number>(0);
  const fieldTripDefenseTimer = useRef<number>(0);
  const pendingWordCheckIndices = useRef<Record<number, number[]>>({});
  const rewardClaimInFlight = useRef(false);
  const speechControl = useRef({ replayTimer: 0, startTimer: 0, requestId: 0 });

  stateRef.current = state;

  const { flushProgressToServer, commitProgress } = usePersistence({
    stateRef,
    queuedProgress,
    syncInFlight,
    dispatch,
  });
  const {
    clearAutoAdvance,
    showCelebration,
    stopSpeech,
    speakWord,
    requireAuthenticated,
  } = useCoreActions({ stateRef, autoAdvanceTimer, speechControl, dispatch });
  const { openPendingMaze, openFieldTrip, handleStageComplete } = useStageFlow({
    stateRef,
    rewardClaimInFlight,
    dispatch,
    clearAutoAdvance,
    stopSpeech,
    showCelebration,
  });
  const {
    scheduleNextWord,
    clearWordCheckFeedback,
    advanceToNextWord,
    markKnown,
    markPractice,
    playWordCheck,
    playWordCheckChoice,
    chooseWordCheck,
    goBackOrUndo,
    shuffleDeck,
    resetProgress,
    toggleGearItem,
  } = useWordFlow({
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
  });
  const { moveMaze, continueAfterTreasureReveal } = useTreasureFlow({
    stateRef,
    rewardClaimInFlight,
    treasureReveal,
    setTreasureReveal,
    dispatch,
    commitProgress,
    requireAuthenticated,
    handleStageComplete,
    scheduleNextWord,
  });
  const { moveFieldTrip, completeFieldTrip } = useFieldTripFlow({
    stateRef,
    fieldTripDefenseTimer,
    dispatch,
    requireAuthenticated,
    commitProgress,
    showCelebration,
  });
  const { authenticate, updateAccountEmail, logout } = useSession({
    stateRef,
    queuedProgress,
    pendingWordCheckIndices,
    rewardClaimInFlight,
    setInventoryOpen,
    setTreasureReveal,
    setWordCheck,
    dispatch,
    clearAutoAdvance,
    clearWordCheckFeedback,
    stopSpeech,
    openPendingMaze,
  });
  useGameplayEffects({
    state,
    stateRef,
    inventoryOpen,
    setInventoryOpen,
    treasureReveal,
    moveMaze,
    moveFieldTrip,
    completeFieldTrip,
    dispatch,
    wordCheckFeedbackTimer,
    fieldTripDefenseTimer,
    speechControl,
    stopSpeech,
  });

  useEffect(() => {
    rewardClaimInFlight.current = false;
    setTreasureReveal(null);
  }, [state.user?.id]);

  useAppInitialization({ stateRef, queuedProgress, dispatch, openPendingMaze });

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
      "phrase-forest",
    ];

    document.body.classList.remove(...stageClasses);
    document.body.classList.add(
      state.activeWorld === "phrases" ? "phrase-forest" : stage?.themeClass || "stage-ancient",
    );
    document.body.classList.toggle("auth-required", !state.user);
    document.body.classList.toggle("is-speaking", state.speaking);
    document.body.classList.toggle("maze-is-open", state.maze.open);
    document.body.classList.toggle("trip-is-open", state.fieldTrip.open);
    document.body.classList.toggle("inventory-is-open", inventoryOpen);
    document.body.classList.toggle("word-check-is-open", Boolean(wordCheck));
    document.body.classList.toggle("reward-reveal-is-open", Boolean(treasureReveal));
  }, [state.user, state.speaking, state.maze.open, state.fieldTrip.open, state.content, state.progress, state.activeWorld, inventoryOpen, wordCheck, treasureReveal]);

  const { viewModel, treasureRevealDetails } = useViewModel(state, treasureReveal);

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
  const phraseWorldAvailable = Boolean(
    state.user &&
    state.content.phraseForest &&
    state.progress.phraseForest.unlockedStageIds.length > 0 &&
    wordAcademyComplete(state.content, state.progress),
  );
  const phraseWorldActive = state.activeWorld === "phrases" && phraseWorldAvailable;
  const phraseStage = phraseWorldActive
    ? state.content.phraseForest!.stages.find(
      (candidate) => candidate.id === state.progress!.phraseForest.activeStageId,
    )!
    : null;
  const readingDay = new Date();
  readingDay.setDate(readingDay.getDate() + readingDayOffset);
  const phraseReadingSessionId = phraseReadingDayId(readingDay);
  const startNextReadingDay = readingDayControl(
    import.meta.env.DEV,
    () => setReadingDayOffset((offset) => offset + 1),
  );

  const switchWorld = (world: "words" | "phrases") => {
    clearAutoAdvance();
    stopSpeech();
    setInventoryOpen(false);
    setWordCheck(null);
    setTreasureReveal(null);
    dispatch({ type: "stopGames" });
    dispatch({ type: "setActiveWorld", world });
  };

  return (
    <>
      <IconSprite />
      <div className="app-shell">
        <header className="topbar">
          <Brand
            subtitle={state.user
              ? phraseWorldActive
                ? phraseStage!.areaName
                : stage.subtitle
              : "Dan's Sight Words"}
            title={state.user
              ? phraseWorldActive
                ? phraseStage!.title
                : stage.title
              : "Sign up or log in"}
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

        <nav className="world-tabs" aria-label="Learning worlds">
          <button
            type="button"
            className={!phraseWorldActive ? "is-active" : ""}
            onClick={() => switchWorld("words")}
          >
            <span aria-hidden="true">⭐</span>
            <span><strong>Word Academy</strong><small>Stages 1-5</small></span>
          </button>
          <button
            type="button"
            className={phraseWorldActive ? "is-active" : ""}
            disabled={!phraseWorldAvailable}
            onClick={() => switchWorld("phrases")}
          >
            <span aria-hidden="true">🌲</span>
            <span><strong>Phrase Forest</strong><small>{phraseWorldAvailable ? "Stages 6-10" : "Complete 1,000 words"}</small></span>
          </button>
        </nav>

        {phraseWorldActive && state.content.phraseForest ? (
          <PhraseForestWorld
            content={state.content.phraseForest}
            progress={state.progress}
            sessionId={phraseReadingSessionId}
            speechNotice={state.speechNotice}
            commitProgress={commitProgress}
            speakText={speakWord}
            onStartNextReadingDay={startNextReadingDay}
          />
        ) : (
          <>
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
          </>
        )}
      </div>

      {!phraseWorldActive && (
        <>
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
            speechNotice={state.speechNotice}
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
      )}
    </>
  );
}

export {
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
  fittedWordFontSize,
  rewardStatus,
};
