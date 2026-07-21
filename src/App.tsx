import { useEffect, useReducer, useRef, useState } from "react";
import { api } from "./api";
import { TreasureRewardReveal } from "./TreasureRewardReveal";
import { PhraseForestWorld } from "./PhraseForestWorld";
import {
  MOVE_DELTAS,
  TRIP_TARGET,
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
import { usePersistence } from "./app/hooks/usePersistence";
import { useSession } from "./app/hooks/useSession";
import { useStageFlow } from "./app/hooks/useStageFlow";
import { useTreasureFlow } from "./app/hooks/useTreasureFlow";
import { useViewModel } from "./app/hooks/useViewModel";
import { useWordFlow } from "./app/hooks/useWordFlow";
import { getSpeechVoices } from "./app/speech";
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
import type { ProgressState, SightWordsContent } from "./types";
import type { MeResponse, ProgressResponse } from "./app/apiTypes";

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

const PHRASE_READING_SESSION_ID =
  `phrase-session-${Date.now()}-${Math.random().toString(36).slice(2)}`;

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
    const synthesis = "speechSynthesis" in window
      ? window.speechSynthesis
      : null;
    const prepareVoices = () => {
      if (synthesis) {
        getSpeechVoices(synthesis);
      }
    };
    const handleBeforeUnload = () => {
      stopSpeech();
    };

    prepareVoices();
    synthesis?.addEventListener("voiceschanged", prepareVoices);
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      synthesis?.removeEventListener("voiceschanged", prepareVoices);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      if (speechControl.current.replayTimer) {
        window.clearTimeout(speechControl.current.replayTimer);
      }
      if (speechControl.current.startTimer) {
        window.clearTimeout(speechControl.current.startTimer);
      }
      synthesis?.cancel();
    };
  }, [stopSpeech]);

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
            sessionId={PHRASE_READING_SESSION_ID}
            speechNotice={state.speechNotice}
            commitProgress={commitProgress}
            speakText={speakWord}
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
