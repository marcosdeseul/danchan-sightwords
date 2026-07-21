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
  checkpointBlockedForSession,
  currentPhraseMissionIndex,
  meaningChoicesForItem,
  phraseCheckpointStatus,
  phraseChapterProgress,
  phraseMissionForStage,
  recordPhraseEvidence,
  shuffledPhraseTokens,
} from "./phraseForest";
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
}: {
  content: PhraseForestContent;
  progress: ProgressState;
  sessionId: string;
  speechNotice: string;
  commitProgress: (progress: ProgressState) => ProgressState | null;
  speakText: (text: string, options?: { clearAutoAdvance?: boolean }) => boolean;
}) {
  const activeStage = content.stages.find(
    (stage) => stage.id === progress.phraseForest.activeStageId,
  ) || content.stages[0];
  const stageState = progress.phraseForest.stages[String(activeStage.id)];
  const missionIndex = currentPhraseMissionIndex(stageState, activeStage.id);
  const mission = phraseMissionForStage(activeStage, missionIndex);
  const item = mission.items[stageState.currentRoundIndex] || mission.items[0];
  const activity = activityForPhraseItem(mission, item);
  const [selectedTokenIds, setSelectedTokenIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [advancing, setAdvancing] = useState(false);
  const [rewardStageId, setRewardStageId] = useState<number | null>(null);
  const [successMoment, setSuccessMoment] = useState<PhraseSuccessMoment | null>(null);
  const lastModeledItemId = useRef("");
  const checkpointBlocked = checkpointBlockedForSession(stageState, mission, sessionId);
  const presentation = stageMissionPresentation(activeStage.id, activity);

  useEffect(() => {
    setSelectedTokenIds([]);
    setAdvancing(false);
  }, [item.id]);

  useEffect(() => {
    setFeedback("");
    setSuccessMoment(null);
  }, [activeStage.id]);

  useEffect(() => {
    const shouldAutoModel = !mission.checkpoint && (
      activeStage.id === 6 || mission.chapterId === "discover"
    );

    if (
      shouldAutoModel &&
      !checkpointBlocked &&
      !successMoment &&
      lastModeledItemId.current !== item.id
    ) {
      lastModeledItemId.current = item.id;
      speakText(item.text, { clearAutoAdvance: false });
    }
  }, [
    activeStage.id,
    checkpointBlocked,
    item.id,
    mission.chapterId,
    mission.checkpoint,
    successMoment,
    speakText,
  ]);

  const choices = useMemo(
    () => meaningChoicesForItem(activeStage, item),
    [activeStage, item],
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
    stageId = activeStage.id,
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
    const result = advancePhraseRound(activeStage, stageState, item.id, sessionId);
    const saved = updateStageProgress(result.stageState);

    if (!saved) {
      setAdvancing(false);
      return;
    }

    if (result.stageCompleted) {
      setRewardStageId(activeStage.id);
      setFeedback(`${activeStage.restoration} restored!`);
      return;
    }

    setAdvancing(false);
    const moment = stageSuccessMoment(
      activeStage.id,
      completedText,
      result.missionCompleted,
      mission.checkpoint,
      result.checkpointQualified,
    );
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
    const nextStage = content.stages.find((stage) => stage.id === activeStage.id + 1);
    setRewardStageId(null);

    if (nextStage && progress.phraseForest.unlockedStageIds.includes(nextStage.id)) {
      selectStage(nextStage.id);
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
        stage={activeStage}
        stageState={stageState}
        completedAreas={progress.phraseForest.completedStageIds.length}
      />

      <main className="phrase-layout">
        <section
          className={`phrase-mission-panel phrase-world-stage-${activeStage.id}`}
          aria-labelledby="phraseMissionTitle"
        >
          <div className="phrase-mission-heading">
            <div>
              <p>{mission.chapterTitle} · Mission {mission.number} of {activeStage.missionCount}</p>
              <h2 id="phraseMissionTitle">
                {presentation.heading}
              </h2>
            </div>
            <span className={`phrase-mode-badge is-${mission.chapterId}`}>
              {mission.checkpoint ? "Fresh checkpoint" : mission.chapterTitle}
            </span>
          </div>

          <StageWorldMission
            stageId={activeStage.id}
            instruction={presentation.instruction}
            missionRound={stageState.currentRoundIndex + 1}
            missionRounds={mission.items.length}
          />

          {successMoment ? (
            <PhraseSuccessCard
              moment={successMoment}
              onContinue={() => {
                setSuccessMoment(null);
                setFeedback("");
              }}
            />
          ) : checkpointBlocked ? (
            <CheckpointSessionGate />
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
                  stageId={activeStage.id}
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
                  index < stageState.currentRoundIndex ? "is-complete" : "",
                  index === stageState.currentRoundIndex ? "is-current" : "",
                ].filter(Boolean).join(" ")}
              >
                <span className="sr-only">Round {index + 1}</span>
              </span>
            ))}
          </div>

          {!successMoment && !checkpointBlocked && (
            <p className="phrase-feedback" role="status" aria-live="polite" aria-atomic="true">
              {feedback || "Read every word. Help is always available."}
            </p>
          )}
          {speechNotice && <p className="notice" role="status">{speechNotice}</p>}
        </section>

        <ForestProgressPanel
          content={content}
          stage={activeStage}
          stageState={stageState}
          missionIndex={missionIndex}
          completedStageIds={progress.phraseForest.completedStageIds}
        />
      </main>

      {rewardStage && (
        <CompanionReward
          stage={rewardStage}
          hasNextStage={Boolean(content.stages.find((stage) => stage.id === rewardStage.id + 1))}
          onContinue={continueAfterReward}
          onStay={() => setRewardStageId(null)}
        />
      )}
    </div>
  );
}

export function PhraseStageTabs({
  content,
  progress,
  onSelect,
}: {
  content: PhraseForestContent;
  progress: ProgressState;
  onSelect: (stageId: number) => void;
}) {
  return (
    <nav className="phrase-stage-tabs" aria-label="Phrase Forest stages">
      {content.stages.map((stage) => {
        const state = progress.phraseForest.stages[String(stage.id)];
        const unlocked = progress.phraseForest.unlockedStageIds.includes(stage.id);
        return (
          <button
            type="button"
            key={stage.id}
            className={`phrase-stage-tab${progress.phraseForest.activeStageId === stage.id ? " is-active" : ""}`}
            disabled={!unlocked}
            onClick={() => onSelect(stage.id)}
          >
            <span className="phrase-stage-companion" aria-hidden="true">
              {state.companionUnlocked ? stage.companion.emoji : "🌱"}
            </span>
            <span>
              <strong>{stage.title}</strong>
              <small>{stage.subtitle}</small>
            </span>
            <em>{state.completedMissionIds.length}/{stage.missionCount}</em>
          </button>
        );
      })}
    </nav>
  );
}

export function PhraseScoreStrip({
  stage,
  stageState,
  completedAreas,
}: {
  stage: PhraseStageContent;
  stageState: PhraseStageProgress;
  completedAreas: number;
}) {
  const missionIndex = currentPhraseMissionIndex(stageState, stage.id);
  const mission = phraseMissionForStage(stage, missionIndex);
  const checkpointStatus = phraseCheckpointStatus(stage.id, stageState);
  return (
    <div className="score-strip phrase-score-strip" aria-label="Phrase Forest progress summary">
      <div className="metric"><strong>{stageState.completedMissionIds.length}</strong><span>Missions</span></div>
      <div className="metric"><strong>{mission.chapterTitle}</strong><span>Chapter</span></div>
      <div className="metric"><strong>{phraseChapterProgress(missionIndex)}/5</strong><span>Chapter path</span></div>
      <div className="metric"><strong>{checkpointStatus.qualified}/{checkpointStatus.required}</strong><span>Independent</span></div>
      <div className="metric"><strong>{completedAreas}</strong><span>Areas restored</span></div>
    </div>
  );
}

export interface PhraseSuccessMoment {
  emoji: string;
  title: string;
  message: string;
}

interface StageMissionPresentation {
  emoji: string;
  matchHeading: string;
  buildHeading: string;
  matchInstruction: string;
  buildInstruction: string;
  successTitle: string;
  successMessage: (phrase: string) => string;
  successEmoji: string;
}

const STAGE_MISSION_PRESENTATIONS: Record<number, StageMissionPresentation> = {
  6: {
    emoji: "🌉",
    matchHeading: "Choose the bridge supply",
    buildHeading: "Build the supply label",
    matchInstruction: "Read the whole phrase and choose the exact piece the Fox needs.",
    buildInstruction: "Put the words together to label the next bridge piece.",
    successTitle: "Bridge piece placed!",
    successMessage: (phrase) => `“${phrase}” connected another part of the path.`,
    successEmoji: "🪵",
  },
  7: {
    emoji: "🌼",
    matchHeading: "Wake the matching garden",
    buildHeading: "Build the garden label",
    matchInstruction: "Read the describing word so the correct garden scene can bloom.",
    buildInstruction: "Put the describing phrase in order to wake the flowers.",
    successTitle: "The garden changed!",
    successMessage: (phrase) => `“${phrase}” brought the matching colors and details back.`,
    successEmoji: "🌷",
  },
  8: {
    emoji: "🐇",
    matchHeading: "Choose Rabbit’s movement",
    buildHeading: "Build the action card",
    matchInstruction: "Read the complete action phrase before choosing Rabbit’s move.",
    buildInstruction: "Put the action words in order to teach Rabbit the move.",
    successTitle: "Rabbit learned the move!",
    successMessage: (phrase) => `Rabbit followed the “${phrase}” action card.`,
    successEmoji: "🐇💨",
  },
  9: {
    emoji: "🛠️",
    matchHeading: "Choose the workshop task",
    buildHeading: "Build the repair card",
    matchInstruction: "Read both the action and the object to choose the exact repair task.",
    buildInstruction: "Put the task words in order for the Beaver’s repair list.",
    successTitle: "Workshop task complete!",
    successMessage: (phrase) => `The Beaver completed “${phrase}” on the repair list.`,
    successEmoji: "🦫✅",
  },
  10: {
    emoji: "📍",
    matchHeading: "Find the hiding place",
    buildHeading: "Build the location clue",
    matchInstruction: "Read the location word and find the squirrel in that exact place.",
    buildInstruction: "Put the location clue in order to guide the Owl.",
    successTitle: "Hiding place found!",
    successMessage: (phrase) => `The Owl used “${phrase}” to find the right place.`,
    successEmoji: "🦉📍",
  },
};

export function stageMissionPresentation(stageId: number, activity: "build" | "match") {
  const presentation = STAGE_MISSION_PRESENTATIONS[stageId] || STAGE_MISSION_PRESENTATIONS[6];
  return {
    emoji: presentation.emoji,
    heading: activity === "match" ? presentation.matchHeading : presentation.buildHeading,
    instruction: activity === "match"
      ? presentation.matchInstruction
      : presentation.buildInstruction,
  };
}

export function stageSuccessMoment(
  stageId: number,
  phrase: string,
  missionCompleted: boolean,
  checkpoint: boolean,
  checkpointQualified: boolean,
): PhraseSuccessMoment {
  if (checkpoint && missionCompleted) {
    return checkpointQualified
      ? {
        emoji: "✨",
        title: "Independent checkpoint saved!",
        message: `You read “${phrase}” without help. This checkpoint counts.`,
      }
      : {
        emoji: "🌱",
        title: "Good practice saved",
        message: "This supported checkpoint stays as practice. A fresh checkpoint will return later.",
      };
  }

  const presentation = STAGE_MISSION_PRESENTATIONS[stageId] || STAGE_MISSION_PRESENTATIONS[6];
  return {
    emoji: presentation.successEmoji,
    title: presentation.successTitle,
    message: presentation.successMessage(phrase),
  };
}

export function StageWorldMission({
  stageId,
  instruction,
  missionRound,
  missionRounds,
}: {
  stageId: number;
  instruction: string;
  missionRound: number;
  missionRounds: number;
}) {
  const presentation = STAGE_MISSION_PRESENTATIONS[stageId] || STAGE_MISSION_PRESENTATIONS[6];
  return (
    <div className={`stage-world-mission is-stage-${stageId}`}>
      <span className="stage-world-mission-emoji" aria-hidden="true">{presentation.emoji}</span>
      <div>
        <strong>World mission</strong>
        <p>{instruction}</p>
      </div>
      <span className="stage-world-mission-count">Step {missionRound} of {missionRounds}</span>
    </div>
  );
}

export function PhraseSuccessCard({
  moment,
  onContinue,
}: {
  moment: PhraseSuccessMoment;
  onContinue: () => void;
}) {
  return (
    <section className="phrase-success-card" aria-live="polite" aria-atomic="true">
      <span aria-hidden="true">{moment.emoji}</span>
      <h3>{moment.title}</h3>
      <p>{moment.message}</p>
      <button type="button" onClick={onContinue}>Continue reading</button>
    </section>
  );
}

export function CheckpointSessionGate() {
  return (
    <section className="checkpoint-session-gate" role="status" aria-live="polite">
      <span aria-hidden="true">🌙</span>
      <h3>Checkpoint saved for this reading session</h3>
      <p>
        Great focused reading. The next fresh checkpoint opens when you come back
        for another reading session.
      </p>
    </section>
  );
}

export function PhrasePrompt({
  item,
  onPlayPhrase,
  onPlayWord,
}: {
  item: PhraseItemContent;
  onPlayPhrase: () => void;
  onPlayWord: (word: string) => void;
}) {
  return (
    <div className="phrase-prompt">
      <div className="phrase-text" aria-label={`Phrase: ${item.text}`}>
        {item.tokens.map((word, index) => (
          <button
            type="button"
            key={`${item.id}-word-${index}`}
            onClick={() => onPlayWord(word)}
            aria-label={`Hear ${word}`}
          >
            {word}
          </button>
        ))}
      </div>
      <button className="phrase-play-button" type="button" onClick={onPlayPhrase}>
        <span aria-hidden="true">🔊</span>
        Hear the whole phrase
      </button>
    </div>
  );
}

export function MeaningChoices({
  choices,
  disabled,
  onChoose,
  stageId,
}: {
  choices: PhraseItemContent[];
  disabled: boolean;
  onChoose: (choice: PhraseItemContent) => void;
  stageId?: number;
}) {
  return (
    <div className="phrase-meaning-choices" aria-label="Scene choices">
      {choices.map((choice, index) => (
        <button
          key={choice.id}
          type="button"
          disabled={disabled}
          aria-label={`Scene option ${index + 1}: ${choice.accessibilityText}`}
          onClick={() => onChoose(choice)}
        >
          <PhraseScene item={choice} stageId={stageId} />
        </button>
      ))}
    </div>
  );
}

export function PhraseBuilder({
  tokens,
  selectedTokenIds,
  disabled,
  onChoose,
  onReset,
}: {
  tokens: Array<{ id: string; text: string }>;
  selectedTokenIds: string[];
  disabled: boolean;
  onChoose: (tokenId: string) => void;
  onReset: () => void;
}) {
  const selected = selectedTokenIds.map((id) => tokens.find((token) => token.id === id))
    .filter((token): token is { id: string; text: string } => Boolean(token));
  return (
    <div className="phrase-builder">
      <div className="phrase-build-line" aria-label="Built phrase">
        {selected.length === 0
          ? <span>Choose the first word</span>
          : selected.map((token) => <strong key={token.id}>{token.text}</strong>)}
      </div>
      <div className="phrase-token-bank" aria-label="Available words">
        {tokens.map((token) => (
          <button
            key={token.id}
            type="button"
            disabled={disabled || selectedTokenIds.includes(token.id)}
            onClick={() => onChoose(token.id)}
          >
            {token.text}
          </button>
        ))}
      </div>
      <button className="phrase-reset-button" type="button" onClick={onReset} disabled={disabled}>
        Start over
      </button>
    </div>
  );
}

export function PhraseScene({ item, stageId }: { item: PhraseItemContent; stageId?: number }) {
  const visual = item.visual;
  const stageClass = stageId ? ` world-stage-${stageId}` : "";

  if (visual.kind === "location") {
    return (
      <span className={`phrase-scene is-location relation-${visual.relation}${stageClass}`} aria-hidden="true">
        <span className="phrase-scene-anchor">{visual.anchor}</span>
        <span className="phrase-scene-target">{visual.target}</span>
      </span>
    );
  }

  return (
    <span className={`phrase-scene is-symbol${stageClass}`} aria-hidden="true">
      {visual.symbol}
    </span>
  );
}

export function ForestProgressPanel({
  content,
  stage,
  stageState,
  missionIndex,
  completedStageIds,
}: {
  content: PhraseForestContent;
  stage: PhraseStageContent;
  stageState: PhraseStageProgress;
  missionIndex: number;
  completedStageIds: number[];
}) {
  return (
    <aside className="forest-progress-panel" aria-label="Phrase Forest restoration">
      <section className={`forest-scene-card world-stage-${stage.id}`}>
        <div className="forest-sky" aria-hidden="true">☀️</div>
        <div className="forest-trees" aria-hidden="true">🌲 🌳 🌲</div>
        <div className="forest-landmark" aria-hidden="true">
          {stageState.restoredArea
            ? restoredAreaEmoji(stage.id)
            : stageProgressEmoji(stage.id, stageState.completedMissionIds.length)}
        </div>
        <div className="forest-companion" aria-hidden="true">
          {stageState.companionUnlocked ? stage.companion.emoji : "❔"}
        </div>
        <h2>{stage.areaName}</h2>
        <p>{stageState.restoredArea
          ? `${stage.restoration} restored`
          : stageProgressMessage(stage.id, stageState.completedMissionIds.length, stage.intro)}</p>
      </section>

      <section className="forest-path-block">
        <h2>Restoration path</h2>
        <div className="forest-mission-path" aria-label={`${stageState.completedMissionIds.length} of ${stage.missionCount} missions complete`}>
          {Array.from({ length: stage.missionCount }, (_, index) => (
            <span
              key={index}
              className={[
                index < stageState.completedMissionIds.length ? "is-complete" : "",
                index === missionIndex && !stageState.completed ? "is-current" : "",
              ].filter(Boolean).join(" ")}
            >
              {index + 1}
            </span>
          ))}
        </div>
      </section>

      <section className="forest-companion-block">
        <h2>Forest companions</h2>
        <div className="forest-companion-list">
          {content.stages.map((candidate) => (
            <span
              key={candidate.id}
              className={completedStageIds.includes(candidate.id) ? "is-unlocked" : ""}
              title={completedStageIds.includes(candidate.id) ? candidate.companion.name : "Not found yet"}
            >
              {completedStageIds.includes(candidate.id) ? candidate.companion.emoji : "❔"}
            </span>
          ))}
        </div>
      </section>
    </aside>
  );
}

export function CompanionReward({
  stage,
  hasNextStage,
  onContinue,
  onStay,
}: {
  stage: PhraseStageContent;
  hasNextStage: boolean;
  onContinue: () => void;
  onStay: () => void;
}) {
  return (
    <section className="companion-reward-overlay" role="dialog" aria-modal="true" aria-labelledby="companionRewardTitle">
      <div className="companion-reward-card">
        <p className="companion-reward-emoji" aria-hidden="true">{stage.companion.emoji}</p>
        <p>Area restored</p>
        <h2 id="companionRewardTitle">{stage.companion.name} joined you!</h2>
        <strong>{stage.restoration}</strong>
        <p>You restored a Great Library page by reading every phrase mission.</p>
        <div className="companion-reward-actions">
          <button type="button" onClick={onStay}>Visit this area</button>
          <button type="button" className="is-primary" onClick={onContinue}>
            {hasNextStage ? "Continue the trail" : "See the restored forest"}
          </button>
        </div>
      </div>
    </section>
  );
}

function restoredAreaEmoji(stageId: number): string {
  if (stageId === 6) return "🌉";
  if (stageId === 7) return "🌷🌼🌻";
  if (stageId === 8) return "🌿🎯🌿";
  if (stageId === 9) return "🛖🛠️";
  return "🌳🏡🌳";
}

export function stageProgressEmoji(stageId: number, completedMissions: number): string {
  const chapter = Math.min(Math.floor(completedMissions / 5), 3);
  const progress: Record<number, string[]> = {
    6: ["🪵 · · · 🪵", "🪵 ━ · 🪵", "🪵 ━━ 🪵", "🌉 · ✨"],
    7: ["🌱 · 🌱", "🌱 🌷 🌱", "🌼 🌷 🌱", "🌼 🌷 🌻"],
    8: ["🌿 · 🌿", "🌿 🐇 🌿", "🌿 🐇 🎯", "🌿 🎯 🌿"],
    9: ["🪵 · 🔧", "🪵 🛠️ 🔧", "🛖 🛠️ 🔧", "🛖 🧰 ✨"],
    10: ["🌳 · 🌳", "🌳 🐿️ 🌳", "🌳 🏡 🌳", "🌳 🏡 🦉"],
  };
  return (progress[stageId] || progress[6])[chapter];
}

export function stageProgressMessage(
  stageId: number,
  completedMissions: number,
  fallback: string,
): string {
  const chapter = Math.min(Math.floor(completedMissions / 5), 3);
  const messages: Record<number, string[]> = {
    6: ["The bridge pieces are waiting.", "The first bridge section is connected.", "The crossing is taking shape.", "One final set of phrase gates remains."],
    7: ["The garden is sleeping.", "The first flowers are awake.", "Descriptions are repainting the garden.", "The garden scavenger hunt is ready."],
    8: ["The clearing is still.", "Rabbit has started moving.", "More action stations are awake.", "The final action course is ready."],
    9: ["The repair list is waiting.", "The first workshop tools are working.", "Habitats are being repaired.", "The final repair list is ready."],
    10: ["The grove friends are hidden.", "The first hiding places are mapped.", "The treehouse clues are taking shape.", "The final grove search is ready."],
  };
  return (messages[stageId] || [fallback, fallback, fallback, fallback])[chapter];
}
