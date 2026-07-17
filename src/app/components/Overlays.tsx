import type { CSSProperties, ReactNode } from "react";
import { Character, GearIcon } from "../../GearArt";
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

export function WordCheckOverlay({
  check,
  feedback,
  onPlay,
  onPlayChoice,
  onChoose,
}: {
  check: WordCheckState | null;
  feedback: WordCheckFeedback | null;
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
                  <span className="word-check-choice-label">{choice}</span>
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
            <MonsterArt kind={creature.kind} stageId={stage?.id || 1} variant={creature.variant} />
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

export function MonsterArt({
  kind,
  stageId,
  variant,
}: {
  kind: TripCreature["kind"];
  stageId: number;
  variant: number;
}) {
  const accentClass = `monster-accent monster-accent-${variant}`;

  if (kind === "flying-dragon") {
    return (
      <svg
        className={`trip-monster-art flying-dragon-creature-art stage-creature-${stageId}`}
        viewBox="0 0 148 104"
        focusable="false"
        aria-hidden="true"
      >
        <path className="monster-shadow" d="M25 92c22-8 75-8 96 0 8 4 2 8-48 8s-56-4-48-8Z" />
        <path className="monster-wing monster-wing-left" d="M67 51C47 13 20 7 5 14l27 17-18 9 43 26Z" />
        <path className="monster-wing monster-wing-right" d="M77 49c18-35 46-39 63-30l-28 14 18 11-43 22Z" />
        <path className="monster-tail" d="M52 62C30 61 15 72 7 67c8 18 32 24 55 8Z" />
        <path className="monster-body" d="M47 44c10-17 42-17 55 0 9 13 4 34-11 43H56c-17-9-20-29-9-43Z" />
        <path className={accentClass} d="M57 51c9-7 27-7 36 0-2 13-8 23-18 30-10-7-16-17-18-30Z" />
        <path className="monster-body monster-head" d="M91 35c7-14 28-16 41-5 8 8 3 22-9 27H99c-10-4-13-13-8-22Z" />
        <path className="monster-crest" d="m98 31-2-16 12 11 9-16 4 19Z" />
        <path className="monster-snout" d="M118 40h25l-6 13h-22Z" />
        <path className="monster-leg" d="M59 78l-7 12 13-5M86 78l8 11 5-7" />
        <circle className="monster-eye" cx="118" cy="34" r="3.5" />
        <circle className="monster-nose" cx="140" cy="46" r="3" />
        <path className="monster-mouth" d="M122 50c5 2 10 1 14-2" />
      </svg>
    );
  }

  if (kind === "dragon") {
    return (
      <svg
        className={`trip-monster-art dragon-creature-art stage-creature-${stageId}`}
        viewBox="0 0 124 92"
        focusable="false"
        aria-hidden="true"
      >
        <path className="monster-shadow" d="M20 81c16-8 67-8 83 0 7 4 2 8-41 8s-49-4-42-8Z" />
        <path className="monster-wing" d="M53 43C36 16 14 13 8 14l19 22-14 4 30 20Z" />
        <path className="monster-tail" d="M39 58C19 56 12 68 5 66c9 12 27 13 44 2Z" />
        <path className="monster-body" d="M35 43c7-17 38-20 53-5 10 10 11 29 1 39H45c-13-8-18-23-10-34Z" />
        <path className={accentClass} d="M45 49c9-7 28-7 37 0-2 13-10 21-19 26-10-5-17-13-18-26Z" />
        <path className="monster-body monster-head" d="M78 28c5-13 25-17 37-6 7 7 5 20-4 27H84c-9-4-11-13-6-21Z" />
        <path className="monster-crest" d="m84 23-2-15 12 11 8-15 4 17Z" />
        <path className="monster-leg" d="M45 67v15h12l3-15M76 67l4 15h12l-3-19" />
        <circle className="monster-eye" cx="101" cy="29" r="3.5" />
        <path className="monster-mouth" d="M101 39c5 2 9 1 13-2" />
        <circle className="monster-nose" cx="115" cy="34" r="2.5" />
      </svg>
    );
  }

  return (
    <svg
      className={`trip-monster-art wolf-creature-art stage-creature-${stageId}`}
      viewBox="0 0 124 92"
      focusable="false"
      aria-hidden="true"
    >
      <path className="monster-shadow" d="M18 81c16-8 68-8 84 0 7 4 2 8-42 8s-49-4-42-8Z" />
      <path className="monster-tail" d="M33 55C14 53 9 39 18 27c0 12 9 16 22 18Z" />
      <path className="monster-body" d="M31 43c11-15 47-17 64-2 10 9 8 27-4 36H42c-13-7-19-22-11-34Z" />
      <path className={accentClass} d="M43 47c11-7 33-8 45-1-4 9-9 16-18 22-11-4-20-11-27-21Z" />
      <path className="monster-body monster-head" d="M79 32c5-16 29-20 41-7 7 8 2 22-10 27H87c-9-3-13-11-8-20Z" />
      <path className="monster-crest" d="m84 26-1-17 15 13 10-15 5 20Z" />
      <path className="monster-snout" d="M104 36h18l-3 11h-17Z" />
      <path className="monster-leg" d="M42 65v18h13l3-18M78 65l3 18h13l-2-21" />
      <circle className="monster-eye" cx="102" cy="29" r="3.5" />
      <circle className="monster-nose" cx="119" cy="40" r="3" />
      <path className="monster-mouth" d="M106 45c4 3 8 3 12 1" />
    </svg>
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
