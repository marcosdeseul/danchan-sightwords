import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { cloneProgress } from "./game";
import {
  activityForPhraseItem,
  advancePhraseRound,
  advancePhraseReviewRound,
  currentPhraseMissionIndex,
  meaningChoicesForItem,
  phraseCheckpointStatus,
  phraseChapterProgress,
  phraseMissionForStage,
  phraseReviewMissionForStage,
  phraseReviewRoundIndex,
  recordPhraseEvidence,
  shuffledPhraseTokens,
} from "./phraseForest";
import {
  CompanionReward,
  DailyReadingBanner,
  ForestProgressPanel,
  MeaningChoices,
  PhraseBuilder,
  PhrasePrompt,
  PhraseScoreStrip,
  PhraseStageTabs,
  PhraseSuccessCard,
  StageWorldMission,
  stageMissionPresentation,
  stageSuccessMoment,
} from "./phraseForest/components";
export {
  CompanionReward,
  DailyReadingBanner,
  ForestProgressPanel,
  MeaningChoices,
  PhraseBuilder,
  PhrasePrompt,
  PhraseScene,
  PhraseScoreStrip,
  PhraseStageTabs,
  PhraseSuccessCard,
  SceneSymbol,
  StageWorldMission,
  stageMissionPresentation,
  stageProgressEmoji,
  stageProgressMessage,
  stageSuccessMoment,
} from "./phraseForest/components";
export type { PhraseSuccessMoment } from "./phraseForest/components";
import type { PhraseSuccessMoment } from "./phraseForest/components";
import type {
  PhraseForestContent,
  PhraseItemContent,
  PhraseStageContent,
  PhraseStageProgress,
  ProgressState,
} from "./types";

export function PhraseForestWorld({
  content,
  progress,
  sessionId,
  speechNotice,
  commitProgress,
  speakText,
  onStartNextReadingDay,
}: {
  content: PhraseForestContent;
  progress: ProgressState;
  sessionId: string;
  speechNotice: string;
  commitProgress: (progress: ProgressState) => ProgressState | null;
  speakText: (text: string, options?: { clearAutoAdvance?: boolean }) => boolean;
  onStartNextReadingDay?: () => void;
}) {
  const activeStage = content.stages.find(
    (stage) => stage.id === progress.phraseForest.activeStageId,
  ) || content.stages[0];
  const activeStageState = progress.phraseForest.stages[String(activeStage.id)];
  const dailyReviewAlreadyCompleted = content.stages.some((stage) =>
    progress.phraseForest.stages[String(stage.id)]
      .checkpointAttemptSessionIds.includes(sessionId)
  );
  const dailyReview = dailyReviewAlreadyCompleted
    ? null
    : content.stages.map((stage) => {
      const state = progress.phraseForest.stages[String(stage.id)];
      const mission = phraseReviewMissionForStage(stage, state, sessionId);
      return mission ? { stage, state, mission } : null;
    }).find((candidate) => candidate !== null) || null;
  const playStage = dailyReview?.stage || activeStage;
  const stageState = dailyReview?.state || activeStageState;
  const missionIndex = dailyReview
    ? dailyReview.mission.index
    : currentPhraseMissionIndex(stageState, playStage.id);
  const mission = dailyReview?.mission || phraseMissionForStage(playStage, missionIndex);
  const roundIndex = dailyReview
    ? phraseReviewRoundIndex(stageState, mission, sessionId)
    : stageState.currentRoundIndex;
  const item = mission.items[roundIndex] || mission.items[0];
  const activity = activityForPhraseItem(mission, item);
  const [selectedTokenIds, setSelectedTokenIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [advancing, setAdvancing] = useState(false);
  const [rewardStageId, setRewardStageId] = useState<number | null>(null);
  const [rewardNextStageId, setRewardNextStageId] = useState<number | null>(null);
  const [successMoment, setSuccessMoment] = useState<PhraseSuccessMoment | null>(null);
  const [completedDailyReview, setCompletedDailyReview] = useState(false);
  const lastModeledItemId = useRef("");
  const presentation = stageMissionPresentation(playStage.id, activity);

  useEffect(() => {
    setSelectedTokenIds([]);
    setAdvancing(false);
  }, [item.id]);

  useEffect(() => {
    setFeedback("");
    setSuccessMoment(null);
  }, [activeStage.id]);

  useEffect(() => {
    const shouldAutoModel = !dailyReview && !mission.checkpoint && (
      playStage.id === 6 || mission.chapterId === "discover"
    );

    if (
      shouldAutoModel &&
      !successMoment &&
      lastModeledItemId.current !== item.id
    ) {
      lastModeledItemId.current = item.id;
      speakText(item.text, { clearAutoAdvance: false });
    }
  }, [
    dailyReview,
    item.id,
    mission.chapterId,
    mission.checkpoint,
    playStage.id,
    successMoment,
    speakText,
  ]);

  const choices = useMemo(
    () => meaningChoicesForItem(playStage, item),
    [playStage, item],
  );
  const tokens = useMemo(() => shuffledPhraseTokens(item), [item]);
  const selectedTokens = selectedTokenIds.map((tokenId) =>
    tokens.find((token) => token.id === tokenId),
  ).filter((token): token is { id: string; text: string } => Boolean(token));
  const rewardStage = rewardStageId === null
    ? null
    : content.stages.find((stage) => stage.id === rewardStageId)!;

  const updateStageProgress = (
    nextStageState: PhraseStageProgress,
    stageId = playStage.id,
  ) => {
    const nextProgress = cloneProgress(progress);
    nextProgress.phraseForest.stages[String(stageId)] = nextStageState;
    return commitProgress(nextProgress);
  };

  const recordHelp = (kind: "phraseHelp" | "wordHelp", text: string) => {
    updateStageProgress(recordPhraseEvidence(
      stageState,
      item.id,
      kind,
      mission.checkpoint ? { mission, sessionId } : undefined,
    ));
    speakText(text, { clearAutoAdvance: false });
  };

  const recordError = (message: string) => {
    updateStageProgress(recordPhraseEvidence(
      stageState,
      item.id,
      "error",
      mission.checkpoint ? { mission, sessionId } : undefined,
    ));
    setFeedback(message);
  };

  const completeCurrentRound = () => {
    setAdvancing(true);
    const completedText = item.text;
    const result = dailyReview
      ? advancePhraseReviewRound(playStage, stageState, mission, item.id, sessionId)
      : advancePhraseRound(playStage, stageState, item.id, sessionId);
    const saved = updateStageProgress(result.stageState);

    if (!saved) {
      setAdvancing(false);
      return;
    }

    if (!dailyReview && !stageState.completed && result.stageCompleted) {
      setRewardStageId(playStage.id);
      const nextStage = content.stages.find((candidate) => candidate.id === playStage.id + 1);
      setRewardNextStageId(
        nextStage && saved.phraseForest.unlockedStageIds.includes(nextStage.id)
          ? nextStage.id
          : null,
      );
      setFeedback(`${playStage.restoration} restored!`);
      return;
    }

    setAdvancing(false);
    const moment = stageSuccessMoment(
      playStage.id,
      completedText,
      result.missionCompleted,
      mission.checkpoint,
      result.checkpointQualified,
      Boolean(dailyReview),
    );
    if (dailyReview && result.missionCompleted) {
      setCompletedDailyReview(true);
    }
    setSuccessMoment(moment);
    setFeedback(moment.message);
  };

  const chooseScene = (choice: PhraseItemContent) => {
    if (choice.id === item.id) {
      completeCurrentRound();
      return;
    }

    recordError("Not quite. Read the whole phrase and look for the word that changes the scene.");
  };

  const chooseToken = (tokenId: string) => {
    const nextIds = [...selectedTokenIds, tokenId];
    setSelectedTokenIds(nextIds);

    if (nextIds.length !== tokens.length) {
      return;
    }

    const builtText = nextIds.map((id) => tokens.find((token) => token.id === id)!.text)
      .join(" ");

    if (builtText === item.text) {
      completeCurrentRound();
      return;
    }

    recordError("Almost. Listen to the complete phrase, then put the words in that order.");
    setSelectedTokenIds([]);
  };

  const selectStage = (stageId: number) => {
    const nextProgress = cloneProgress(progress);
    nextProgress.phraseForest.activeStageId = stageId;
    commitProgress(nextProgress);
  };

  const continueAfterReward = () => {
    setRewardStageId(null);
    if (rewardNextStageId !== null) {
      const nextStageId = rewardNextStageId;
      setRewardNextStageId(null);
      selectStage(nextStageId);
    }
  };

  return (
    <div className="phrase-forest-world">
      <PhraseStageTabs
        content={content}
        progress={progress}
        onSelect={selectStage}
      />

      <PhraseScoreStrip
        stage={playStage}
        stageState={stageState}
        completedAreas={progress.phraseForest.completedStageIds.length}
      />

      {dailyReview && (
        <DailyReadingBanner
          stage={playStage}
          stars={phraseCheckpointStatus(playStage.id, stageState).qualified}
        />
      )}

      <main className="phrase-layout">
        <section
          className={`phrase-mission-panel phrase-world-stage-${playStage.id}`}
          aria-labelledby="phraseMissionTitle"
        >
          <div className="phrase-mission-heading">
            <div>
              <p>{dailyReview
                ? `Daily Reading · ${playStage.title}`
                : `${mission.chapterTitle} · Mission ${mission.number} of ${playStage.missionCount}`}</p>
              <h2 id="phraseMissionTitle">
                {presentation.heading}
              </h2>
            </div>
            <span className={`phrase-mode-badge is-${mission.chapterId}`}>
              {dailyReview ? "Memory challenge" : mission.chapterTitle}
            </span>
          </div>

          <StageWorldMission
            stageId={playStage.id}
            instruction={presentation.instruction}
            missionRound={roundIndex + 1}
            missionRounds={mission.items.length}
          />

          {successMoment ? (
            <PhraseSuccessCard
              moment={successMoment}
              onContinue={() => {
                setSuccessMoment(null);
                setFeedback("");
                if (completedDailyReview) {
                  setCompletedDailyReview(false);
                }
                const nextAdventure = content.stages.find((candidate) =>
                  progress.phraseForest.unlockedStageIds.includes(candidate.id) &&
                  !progress.phraseForest.stages[String(candidate.id)].completed
                );
                if (nextAdventure && nextAdventure.id !== activeStage.id) {
                  selectStage(nextAdventure.id);
                }
              }}
            />
          ) : (
            <>
              <PhrasePrompt
                item={item}
                onPlayPhrase={() => recordHelp("phraseHelp", item.text)}
                onPlayWord={(word) => recordHelp("wordHelp", word)}
              />

              {activity === "match" ? (
                <MeaningChoices
                  choices={choices}
                  disabled={advancing}
                  onChoose={chooseScene}
                  stageId={playStage.id}
                />
              ) : (
                <PhraseBuilder
                  tokens={tokens}
                  selectedTokenIds={selectedTokenIds}
                  disabled={advancing}
                  onChoose={chooseToken}
                  onReset={() => {
                    setSelectedTokenIds([]);
                    setFeedback("");
                  }}
                />
              )}
            </>
          )}

          <div className="phrase-round-progress" aria-label="Mission round progress">
            {mission.items.map((roundItem, index) => (
              <span
                key={roundItem.id}
                className={[
                  index < roundIndex ? "is-complete" : "",
                  index === roundIndex ? "is-current" : "",
                ].filter(Boolean).join(" ")}
              >
                <span className="sr-only">Round {index + 1}</span>
              </span>
            ))}
          </div>

          {!successMoment && (
            <p className="phrase-feedback" role="status" aria-live="polite" aria-atomic="true">
              {feedback || "Read every word. Help is always available."}
            </p>
          )}
          {speechNotice && <p className="notice" role="status">{speechNotice}</p>}
        </section>

        <ForestProgressPanel
          content={content}
          stage={playStage}
          stageState={stageState}
          missionIndex={missionIndex}
          completedStageIds={progress.phraseForest.completedStageIds}
        />
      </main>

      {onStartNextReadingDay && !dailyReview && progress.phraseForest.completedStageIds.length > 0 && (
        <button className="reading-day-test-button" type="button" onClick={onStartNextReadingDay}>
          Test next reading day
        </button>
      )}

      {rewardStage && (
        <CompanionReward
          stage={rewardStage}
          hasNextStage={rewardNextStageId !== null}
          onContinue={continueAfterReward}
          onStay={() => {
            setRewardStageId(null);
            setRewardNextStageId(null);
          }}
        />
      )}
    </div>
  );
}
