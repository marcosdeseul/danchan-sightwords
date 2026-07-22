import type { CSSProperties, ReactNode } from "react";
import { Character, GearIcon } from "../../GearArt";
import { MonsterArt } from "../../MonsterArt";
export { MonsterArt } from "../../MonsterArt";
import {
  MAZE_CHEST,
  MOVE_DELTAS,
  activeStage,
  activeStageState,
  currentMazeLayout,
  rewardById,
} from "../../game";
import { Icon } from "../../icons";
import type { ProgressState, SightWordsContent, StageContent } from "../../types";
import { FIELD_TRIP_ATTACK_TELEGRAPH_MS } from "../fieldTrip";
import type { TripCreature } from "../fieldTrip";
import type { FieldTripState, MazeState } from "../state";
import type { WordCheckFeedback, WordCheckState } from "../wordCheck";
import { useFittedWordFontSize } from "./Word";

const MAX_WORD_CHECK_CHOICE_FONT_SIZE = 36;
const MIN_WORD_CHECK_CHOICE_FONT_SIZE = 18;

function WordCheckChoiceLabel({ choice }: { choice: string }) {
  const [labelRef, fontSize] = useFittedWordFontSize<HTMLSpanElement>(
    choice,
    MAX_WORD_CHECK_CHOICE_FONT_SIZE,
    MIN_WORD_CHECK_CHOICE_FONT_SIZE,
  );

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

export function WordCheckOverlay({
  check,
  feedback,
  speechNotice,
  onPlay,
  onPlayChoice,
  onChoose,
}: {
  check: WordCheckState | null;
  feedback: WordCheckFeedback | null;
  speechNotice?: string;
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
        {speechNotice && (
          <p className="notice word-check-speech-notice" role="status">
            {speechNotice}
          </p>
        )}
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
export function InventoryOverlay({
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

export function MazeOverlay({
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

export function FieldTripOverlay({
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
            <span className="trip-monster-facing-character">
              <MonsterArt kind={creature.kind} stageId={stage?.id || 1} variant={creature.variant} />
            </span>
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

export function PressButton({
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
