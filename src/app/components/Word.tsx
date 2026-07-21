import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Character } from "../../GearArt";
import { activeStageState, hasNextStage } from "../../game";
import { Icon } from "../../icons";
import type { RewardItem, SightWordsContent, StageContent } from "../../types";
import { rewardStatus } from "../view";

export function WordCard({
  stage,
  stageState,
  word,
  known,
  practice,
  equippedRewards,
  celebration,
  celebrationKey,
}: {
  stage: StageContent;
  stageState: ReturnType<typeof activeStageState>;
  word: string;
  known: boolean;
  practice: boolean;
  equippedRewards: RewardItem[];
  celebration: string;
  celebrationKey: number;
}) {
  const [wordRef, wordFontSize] = useFittedWordFontSize<HTMLDivElement>(word);

  return (
    <div className="word-card">
      <div className="star-field" aria-hidden="true">
        <svg className="star star-a" viewBox="0 0 24 24" focusable="false"><use href="#icon-star" /></svg>
        <svg className="star star-b" viewBox="0 0 24 24" focusable="false"><use href="#icon-star" /></svg>
        <svg className="star star-c" viewBox="0 0 24 24" focusable="false"><use href="#icon-star" /></svg>
      </div>
      <p className="word-position">{stage.title} - Word {stageState.currentIndex + 1} of {stage.words.length}</p>
      <div className="word-character-preview" aria-hidden="true">
        <Character stage={stage} equippedRewards={equippedRewards} />
      </div>
      <div
        ref={wordRef}
        className="word"
        style={{ "--word-font-size": `${wordFontSize}px` } as CSSProperties}
        aria-live="polite"
        aria-atomic="true"
        aria-label={`Current word: ${word}`}
      >
        <span className="word-text">{word}</span>
      </div>
      <p className={`word-state${known ? " is-known" : ""}${practice ? " is-practice" : ""}`}>
        {known ? "Known" : practice ? "Practice" : "New word"}
      </p>
      <p
        key={celebrationKey}
        className={`celebration${celebration ? " is-visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {celebration}
      </p>
      <h2 className="sr-only" id="currentWordLabel">Current sight word</h2>
    </div>
  );
}
const MAX_WORD_FONT_SIZE = 168;
const MIN_WORD_FONT_SIZE = 38;
const WORD_FONT_FAMILY = 'Inter, ui-rounded, "Arial Rounded MT Bold", "Trebuchet MS", Arial, sans-serif';
let wordMeasureCanvas: HTMLCanvasElement | null = null;

export function useFittedWordFontSize<T extends HTMLElement>(
  word: string,
  maxFontSize = MAX_WORD_FONT_SIZE,
  minFontSize = MIN_WORD_FONT_SIZE,
) {
  const elementRef = useRef<T>(null);
  const [fontSize, setFontSize] = useState(maxFontSize);

  useLayoutEffect(() => {
    const element = elementRef.current as T;

    let cancelled = false;
    const updateSize = () => {
      if (cancelled) {
        return;
      }

      const nextSize = fittedWordFontSize(
        word,
        element.clientWidth,
        maxFontSize,
        minFontSize,
      );
      setFontSize((currentSize) =>
        Math.abs(currentSize - nextSize) > 0.5 ? nextSize : currentSize,
      );
    };

    updateSize();

    if (document.fonts?.ready) {
      document.fonts.ready.then(updateSize).catch(() => undefined);
    }

    if (typeof ResizeObserver === "undefined") {
      return () => {
        cancelled = true;
      };
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [maxFontSize, minFontSize, word]);

  return [elementRef, fontSize] as const;
}

export function fittedWordFontSize(
  word: string,
  containerWidth: number,
  maxFontSize = MAX_WORD_FONT_SIZE,
  minFontSize = MIN_WORD_FONT_SIZE,
): number {
  if (!containerWidth || typeof document === "undefined") {
    return maxFontSize;
  }

  if (!wordMeasureCanvas) {
    wordMeasureCanvas = document.createElement("canvas");
  }

  const context = wordMeasureCanvas.getContext("2d");

  if (!context) {
    return maxFontSize;
  }

  context.font = `950 ${maxFontSize}px ${WORD_FONT_FAMILY}`;

  const measuredWidth = Math.max(1, context.measureText(word).width);
  const availableWidth = Math.max(120, containerWidth - 12);
  const fittedSize = Math.floor(maxFontSize * Math.min(1, availableWidth / measuredWidth));

  return Math.max(minFontSize, Math.min(maxFontSize, fittedSize));
}

export function ProgressPanel({
  content,
  stage,
  stageState,
  knownPercent,
  onStartFieldTrip,
  onOpenInventory,
}: {
  content: SightWordsContent;
  stage: StageContent;
  stageState: ReturnType<typeof activeStageState>;
  knownPercent: number;
  onStartFieldTrip: () => void;
  onOpenInventory: () => void;
}) {
  const unlocked = new Set(stageState.unlockedItems);
  const equipped = new Set(stageState.equippedItems);
  const equippedRewards = stage.rewards.filter((reward) => equipped.has(reward.id));
  const equippedNames = equippedRewards.map((reward) => reward.name).join(", ");
  const fieldTripReady =
    hasNextStage(content, stage) &&
    stageState.knownWords.length >= stage.words.length &&
    !stageState.fieldTripCompleted;

  return (
    <aside className="progress-panel" aria-label="Sight word progress">
      <section className="panel-block character-block">
        <h2>{stage.heroName}</h2>
        <div className="character-stage" aria-live="polite">
          <Character stage={stage} equippedRewards={equippedRewards} />
        </div>
        <p>{equippedRewards.length === 0 ? "No gear yet" : `Wearing: ${equippedNames}`}</p>
        <p>{rewardStatus(stage, stageState)}</p>
        <button className="button inventory-open-button" type="button" onClick={onOpenInventory}>
          <Icon name="bag" />
          <span>Open inventory</span>
          <strong>{unlocked.size}/{stage.rewards.length}</strong>
        </button>
      </section>

      <section className="panel-block">
        <h2>Progress</h2>
        <div className="progress-track" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${knownPercent}%` }} />
        </div>
        <p>{stageState.knownWords.length} of {stage.words.length} known</p>
        {fieldTripReady && (
          <button className="button field-trip-button" type="button" onClick={onStartFieldTrip}>
            Start {stage.fieldTrip.title}
          </button>
        )}
      </section>

      <section className="panel-block">
        <h2>Practice List</h2>
        <div className="practice-list" aria-live="polite">
          {stageState.practiceWords.length === 0
            ? <span className="empty-list">Practice list is clear</span>
            : stageState.practiceWords.map((practiceWord) => (
              <span className="practice-chip" key={practiceWord}>{practiceWord}</span>
            ))}
        </div>
      </section>
    </aside>
  );
}
