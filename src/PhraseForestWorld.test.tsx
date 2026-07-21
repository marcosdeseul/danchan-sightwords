// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  CompanionReward,
  DailyReadingBanner,
  ForestProgressPanel,
  MeaningChoices,
  PhraseBuilder,
  PhraseForestWorld,
  PhrasePrompt,
  PhraseScene,
  SceneSymbol,
  PhraseSuccessCard,
  StageWorldMission,
  stageMissionPresentation,
  stageProgressEmoji,
  stageProgressMessage,
  stageSuccessMoment,
} from "./PhraseForestWorld";
import {
  defaultPhraseForestProgress,
  defaultPhraseStageProgress,
  meaningChoicesForItem,
  phraseMissionId,
  sanitizePhraseForestProgress,
} from "./phraseForest";
import type {
  PhraseForestContent,
  PhraseItemContent,
  PhraseStageContent,
  ProgressState,
} from "./types";

function createStage(id: number): PhraseStageContent {
  const items = Array.from({ length: 75 }, (_, index): PhraseItemContent => ({
    id: `phrase-${id}-${index + 1}`,
    text: index % 3 === 0 ? "my book" : index % 3 === 1 ? "your book" : "his book",
    tokens: index % 3 === 0
      ? ["my", "book"]
      : index % 3 === 1
        ? ["your", "book"]
        : ["his", "book"],
    contrastKey: `stage-${id}-book`,
    meaningSafe: true,
    accessibilityText: index % 3 === 0
      ? "A child holding a book"
      : index % 3 === 1
        ? "A book for you"
        : "A boy holding a book",
    visual: { kind: "symbol", symbol: index % 3 === 0 ? "🧒 📘" : "👉 📘" },
  }));

  return {
    id,
    title: `Stage ${id}`,
    subtitle: id === 6 ? "Two-Word Groups" : "Describing Phrases",
    areaName: `Area ${id}`,
    companion: {
      id: id === 6 ? "fox" : "butterfly",
      name: id === 6 ? "Fox" : "Butterfly",
      emoji: id === 6 ? "🦊" : "🦋",
    },
    restoration: id === 6 ? "Forest Footbridge" : "Color Garden",
    intro: "Reconnect the forest.",
    missionCount: 20,
    chapters: [
      { id: "discover", title: "Discover", missionStart: 1, missionEnd: 5 },
      { id: "practice", title: "Practice", missionStart: 6, missionEnd: 10 },
      { id: "apply", title: "Apply", missionStart: 11, missionEnd: 15 },
      { id: "prove", title: "Prove", missionStart: 16, missionEnd: 20 },
    ],
    practicePhrases: items.slice(0, 60),
    checkpointPhrases: items.slice(60),
  };
}

function createForest(): PhraseForestContent {
  return {
    title: "Phrase Forest",
    subtitle: "Connect words. Restore the forest.",
    stages: [createStage(6), createStage(7)],
  };
}

function createProgress(forest: PhraseForestContent): ProgressState {
  const phraseForest = defaultPhraseForestProgress(forest);
  phraseForest.unlockedStageIds = [6];

  return {
    version: 7,
    activeStageId: 1,
    unlockedStageIds: [1],
    completedFieldTrips: [],
    stages: {
      1: {
        knownWords: ["my", "your", "his", "book"],
        practiceWords: [],
        currentIndex: 0,
        deckOrder: [0, 1, 2, 3],
        shuffled: false,
        unlockedItems: [],
        equippedItems: [],
        completedMazeMilestones: [],
        pendingReward: null,
        fieldTripCompleted: false,
      },
    },
    phraseForest,
  };
}

function missionIds(stageId: number, count: number): string[] {
  return Array.from({ length: count }, (_, index) => phraseMissionId(stageId, index));
}

afterEach(() => cleanup());

describe("Phrase Forest learning controls", () => {
  test("gives every stage its own world mission, progress art, and success moment", () => {
    const expectedHeadings = [
      "Choose the bridge supply",
      "Wake the matching garden",
      "Choose Rabbit’s movement",
      "Choose the workshop task",
      "Find the hiding place",
    ];
    const expectedSuccess = [
      "Bridge piece placed!",
      "The garden changed!",
      "Rabbit learned the move!",
      "Workshop task complete!",
      "Hiding place found!",
    ];

    [6, 7, 8, 9, 10].forEach((stageId, index) => {
      expect(stageMissionPresentation(stageId, "match").heading).toBe(expectedHeadings[index]);
      expect(stageMissionPresentation(stageId, "build").heading).not.toBe(expectedHeadings[index]);
      expect(stageSuccessMoment(stageId, "my book", false, false, false).title)
        .toBe(expectedSuccess[index]);
      expect(stageProgressEmoji(stageId, 0)).toBeTruthy();
      expect(stageProgressEmoji(stageId, 5)).toBeTruthy();
      expect(stageProgressEmoji(stageId, 10)).toBeTruthy();
      expect(stageProgressEmoji(stageId, 20)).toBeTruthy();
      expect(stageProgressMessage(stageId, 0, "fallback")).not.toBe("fallback");
      expect(stageProgressMessage(stageId, 20, "fallback")).not.toBe("fallback");
    });

    expect(stageMissionPresentation(99, "match").heading).toBe("Choose the bridge supply");
    expect(stageSuccessMoment(99, "my book", false, false, false).title)
      .toBe("Bridge piece placed!");
    expect(stageProgressEmoji(99, 0)).toBe(stageProgressEmoji(6, 0));
    expect(stageProgressMessage(99, 0, "fallback")).toBe("fallback");
    expect(stageSuccessMoment(6, "my book", true, true, true).title)
      .toBe("First Reading Star earned!");
    expect(stageSuccessMoment(6, "my book", true, true, false).title)
      .toBe("Bridge piece placed!");
    expect(stageSuccessMoment(6, "my book", true, true, true, true).title)
      .toBe("Reading Star earned!");
    expect(stageSuccessMoment(6, "my book", true, true, false, true).title)
      .toBe("Memory practice complete");
  });

  test("renders persistent success, session pacing, and stage mission cards", () => {
    const continueReading = vi.fn();
    const { rerender } = render(
      <StageWorldMission
        stageId={8}
        instruction="Read the action."
        missionRound={2}
        missionRounds={4}
      />,
    );
    expect(screen.getByText("Read the action.")).toBeInTheDocument();
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();

    rerender(
      <StageWorldMission
        stageId={99}
        instruction="Fallback mission."
        missionRound={1}
        missionRounds={3}
      />,
    );
    expect(screen.getByText("Fallback mission.")).toBeInTheDocument();

    rerender(
      <PhraseSuccessCard
        moment={{ emoji: "✨", title: "You did it!", message: "The world changed." }}
        onContinue={continueReading}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue reading" }));
    expect(continueReading).toHaveBeenCalledOnce();

    rerender(<DailyReadingBanner stage={createStage(6)} stars={1} />);
    expect(screen.getByRole("heading", { name: "Remember Two-Word Groups" }))
      .toBeInTheDocument();
    expect(screen.getByText(/then continue your current adventure/)).toBeInTheDocument();
  });

  test("offers whole-phrase and individual-word audio help", () => {
    const item = createStage(6).practicePhrases[0];
    const playPhrase = vi.fn();
    const playWord = vi.fn();

    render(<PhrasePrompt item={item} onPlayPhrase={playPhrase} onPlayWord={playWord} />);
    fireEvent.click(screen.getByRole("button", { name: "Hear my" }));
    fireEvent.click(screen.getByRole("button", { name: "Hear the whole phrase" }));

    expect(playWord).toHaveBeenCalledWith("my");
    expect(playPhrase).toHaveBeenCalledOnce();
  });

  test("renders semantic scene choices, word tiles, and both scene types", () => {
    const stage = createStage(6);
    const chooseScene = vi.fn();
    const chooseToken = vi.fn();
    const reset = vi.fn();
    const tokens = [
      { id: "book", text: "book" },
      { id: "my", text: "my" },
    ];
    const { rerender } = render(
      <MeaningChoices
        choices={stage.practicePhrases.slice(0, 3)}
        disabled={false}
        onChoose={chooseScene}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Scene option 2:/ }));
    expect(chooseScene).toHaveBeenCalledWith(stage.practicePhrases[1]);

    rerender(
      <PhraseBuilder
        tokens={tokens}
        selectedTokenIds={[]}
        disabled={false}
        onChoose={chooseToken}
        onReset={reset}
      />,
    );
    expect(screen.getByLabelText("Built phrase")).toHaveTextContent("Choose the first word");
    rerender(
      <PhraseBuilder
        tokens={tokens}
        selectedTokenIds={["missing", "my"]}
        disabled={false}
        onChoose={chooseToken}
        onReset={reset}
      />,
    );
    expect(screen.getByLabelText("Built phrase")).toHaveTextContent("my");
    fireEvent.click(screen.getByRole("button", { name: "book" }));
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(chooseToken).toHaveBeenCalledWith("book");
    expect(reset).toHaveBeenCalledOnce();

    rerender(
      <>
        <PhraseScene item={{
          ...stage.practicePhrases[0],
          visual: { kind: "symbol", symbol: "👥 [table]" },
        }} />
        <PhraseScene item={{
          ...stage.practicePhrases[0],
          visual: {
            kind: "location",
            relation: "under",
            anchor: "[table]",
            target: "🐿️",
          },
        }} />
        <SceneSymbol value="" />
      </>,
    );
    expect(document.querySelector(".phrase-scene.is-symbol")).not.toBeNull();
    expect(document.querySelector(".phrase-scene.relation-under")).not.toBeNull();
    expect(document.querySelectorAll(".phrase-scene-table")).toHaveLength(2);
  });

  test("shows restoration, companion collection, and permanent stage rewards", () => {
    const forest = createForest();
    const stage = forest.stages[0];
    const incomplete = defaultPhraseStageProgress();
    const stay = vi.fn();
    const continueJourney = vi.fn();
    const { rerender } = render(
      <ForestProgressPanel
        content={forest}
        stage={stage}
        stageState={incomplete}
        missionIndex={0}
        completedStageIds={[]}
      />,
    );

    expect(screen.getByText("The bridge pieces are waiting.")).toBeInTheDocument();
    expect(screen.getAllByTitle("Not found yet")).toHaveLength(2);

    const complete = {
      ...defaultPhraseStageProgress(),
      completedMissionIds: missionIds(6, 20),
      completedCheckpointIds: missionIds(6, 20).slice(15),
      completed: true,
      restoredArea: true,
      companionUnlocked: true,
    };
    rerender(
      <>
        <ForestProgressPanel
          content={forest}
          stage={stage}
          stageState={complete}
          missionIndex={19}
          completedStageIds={[6]}
        />
        <CompanionReward
          stage={stage}
          hasNextStage={true}
          onContinue={continueJourney}
          onStay={stay}
        />
      </>,
    );

    expect(screen.getByText("Forest Footbridge restored")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Fox joined you!" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Visit this area" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue the trail" }));
    expect(stay).toHaveBeenCalledOnce();
    expect(continueJourney).toHaveBeenCalledOnce();

    [7, 8, 9, 10].forEach((stageId) => {
      const candidate = createStage(stageId);
      rerender(
        <ForestProgressPanel
          content={{ ...forest, stages: [candidate] }}
          stage={candidate}
          stageState={{ ...complete, restoredArea: true, companionUnlocked: true }}
          missionIndex={19}
          completedStageIds={[stageId]}
        />,
      );
      expect(screen.getByText(`${candidate.restoration} restored`)).toBeInTheDocument();
    });

    const finalStage = createStage(10);
    rerender(
      <CompanionReward
        stage={finalStage}
        hasNextStage={false}
        onContinue={continueJourney}
        onStay={stay}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "See the restored forest" }));
    expect(continueJourney).toHaveBeenCalledTimes(2);
  });
});

describe("Phrase Forest world", () => {
  test("falls back safely when saved stage and round pointers are stale", () => {
    const forest = createForest();
    const progress = createProgress(forest);
    progress.phraseForest.activeStageId = 99;
    progress.phraseForest.stages["6"].currentRoundIndex = 99;

    render(
      <PhraseForestWorld
        content={forest}
        progress={progress}
        sessionId="fallback-session"
        speechNotice=""
        speakText={() => true}
        commitProgress={(next) => next}
      />,
    );
    expect(screen.getByLabelText("Phrase: my book")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Choose the bridge supply" })).toBeInTheDocument();
  });

  test("automatically models every guided Stage 6 phrase but keeps checkpoints silent", () => {
    const forest = createForest();
    const speakText = vi.fn(() => true);
    const practiceProgress = createProgress(forest);
    practiceProgress.phraseForest.stages["6"].completedMissionIds = missionIds(6, 5);

    const { rerender } = render(
      <PhraseForestWorld
        content={forest}
        progress={practiceProgress}
        sessionId="guided-session"
        speechNotice=""
        speakText={speakText}
        commitProgress={(next) => next}
      />,
    );

    expect(speakText).toHaveBeenCalledTimes(1);
    expect(speakText).toHaveBeenLastCalledWith(
      forest.stages[0].practicePhrases[20].text,
      { clearAutoAdvance: false },
    );

    const nextPhraseProgress = createProgress(forest);
    nextPhraseProgress.phraseForest.stages["6"].completedMissionIds = missionIds(6, 5);
    nextPhraseProgress.phraseForest.stages["6"].currentRoundIndex = 1;
    rerender(
      <PhraseForestWorld
        content={forest}
        progress={nextPhraseProgress}
        sessionId="guided-session"
        speechNotice=""
        speakText={speakText}
        commitProgress={(next) => next}
      />,
    );

    expect(speakText).toHaveBeenCalledTimes(2);
    expect(speakText).toHaveBeenLastCalledWith(
      forest.stages[0].practicePhrases[21].text,
      { clearAutoAdvance: false },
    );

    const checkpointProgress = createProgress(forest);
    checkpointProgress.phraseForest.stages["6"].completedMissionIds = missionIds(6, 15);
    rerender(
      <PhraseForestWorld
        content={forest}
        progress={checkpointProgress}
        sessionId="checkpoint-session"
        speechNotice=""
        speakText={speakText}
        commitProgress={(next) => next}
      />,
    );

    expect(screen.getByText("Prove · Mission 16 of 20")).toBeInTheDocument();
    expect(speakText).toHaveBeenCalledTimes(2);
  });

  test("keeps all five Prove missions playable in one reading session", () => {
    const forest = createForest();
    const progress = createProgress(forest);
    progress.phraseForest.stages["6"].completedMissionIds = missionIds(6, 16);
    progress.phraseForest.stages["6"].completedCheckpointIds = [phraseMissionId(6, 15)];
    progress.phraseForest.stages["6"].checkpointSessionIds = {
      [phraseMissionId(6, 15)]: "reading-session-1",
    };
    progress.phraseForest.stages["6"].checkpointAttemptSessionIds = ["reading-session-1"];

    render(
      <PhraseForestWorld
        content={forest}
        progress={progress}
        sessionId="reading-session-1"
        speechNotice=""
        speakText={() => true}
        commitProgress={(next) => next}
      />,
    );
    expect(screen.getByText("Prove · Mission 17 of 20")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hear the whole phrase" })).toBeInTheDocument();
  });

  test("starts a later visit with Daily Reading and then returns to new content", () => {
    const forest = createForest();
    const initial = createProgress(forest);
    initial.phraseForest.activeStageId = 7;
    initial.phraseForest.unlockedStageIds = [6, 7];
    initial.phraseForest.completedStageIds = [6];
    initial.phraseForest.stages["6"] = {
      ...defaultPhraseStageProgress(),
      completedMissionIds: missionIds(6, 20),
      completedCheckpointIds: [phraseMissionId(6, 15)],
      checkpointSessionIds: { [phraseMissionId(6, 15)]: "reading-day-1" },
      checkpointAttemptSessionIds: ["reading-day-1"],
      completed: true,
      restoredArea: true,
      companionUnlocked: true,
    };

    function Harness() {
      const [progress, setProgress] = useState(initial);
      return (
        <PhraseForestWorld
          content={forest}
          progress={progress}
          sessionId="reading-day-2"
          speechNotice=""
          speakText={() => true}
          commitProgress={(next) => {
            setProgress(next);
            return next;
          }}
        />
      );
    }

    render(<Harness />);
    expect(screen.getByRole("heading", { name: "Remember Two-Word Groups" }))
      .toBeInTheDocument();
    expect(screen.getByText("Daily Reading · Stage 6")).toBeInTheDocument();
    expect(screen.getByText("Memory challenge")).toBeInTheDocument();

    const stage = forest.stages[0];
    const reviewItems = stage.checkpointPhrases.slice(3, 6);
    reviewItems.forEach((reviewItem, index) => {
      const choices = meaningChoicesForItem(stage, reviewItem);
      const targetIndex = choices.findIndex((choice) => choice.id === reviewItem.id);
      fireEvent.click(screen.getByRole("button", {
        name: new RegExp(`Scene option ${targetIndex + 1}:`),
      }));
      if (index < reviewItems.length - 1) {
        fireEvent.click(screen.getByRole("button", { name: "Continue reading" }));
      }
    });

    expect(screen.getByRole("heading", { name: "Reading Star earned!" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue reading" }));
    expect(screen.getByText("Discover · Mission 1 of 20")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Stage 7/ })).toHaveClass("is-active");
  });

  test("continues from a completed Stage 6 replay to the unlocked Stage 7 adventure", () => {
    const forest = createForest();
    const initial = createProgress(forest);
    initial.phraseForest.unlockedStageIds = [6, 7];
    initial.phraseForest.completedStageIds = [6];
    initial.phraseForest.stages["6"] = {
      ...defaultPhraseStageProgress(),
      completedMissionIds: missionIds(6, 20),
      completedCheckpointIds: [
        phraseMissionId(6, 15),
        phraseMissionId(6, 16),
        phraseMissionId(6, 17),
      ],
      checkpointSessionIds: {
        [phraseMissionId(6, 15)]: "reading-day-1",
        [phraseMissionId(6, 16)]: "reading-day-2",
        [phraseMissionId(6, 17)]: "reading-day-3",
      },
      checkpointAttemptSessionIds: [
        "reading-day-1",
        "reading-day-2",
        "reading-day-3",
      ],
      completed: true,
      mastered: true,
      restoredArea: true,
      companionUnlocked: true,
    };

    function Harness() {
      const [progress, setProgress] = useState(initial);
      return (
        <PhraseForestWorld
          content={forest}
          progress={progress}
          sessionId="reading-day-3"
          speechNotice=""
          speakText={() => true}
          commitProgress={(next) => {
            setProgress(next);
            return next;
          }}
        />
      );
    }

    render(<Harness />);
    const stage = forest.stages[0];
    const target = stage.checkpointPhrases[12];
    const choices = meaningChoicesForItem(stage, target);
    const targetIndex = choices.findIndex((choice) => choice.id === target.id);

    fireEvent.click(screen.getByRole("button", {
      name: new RegExp(`Scene option ${targetIndex + 1}:`),
    }));
    expect(screen.getByRole("heading", { name: "Bridge piece placed!" }))
      .toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Continue reading" }));
    expect(screen.getByText("Discover · Mission 1 of 20")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Stage 7/ })).toHaveClass("is-active");
  });

  test("records gentle correction and help, then advances after understanding", () => {
    const forest = createForest();
    const speakText = vi.fn(() => true);

    function Harness() {
      const [progress, setProgress] = useState(() => createProgress(forest));
      return (
        <>
          <PhraseForestWorld
            content={forest}
            progress={progress}
            sessionId="reading-session-1"
            speechNotice=""
            speakText={speakText}
            commitProgress={(next) => {
              setProgress(next);
              return next;
            }}
          />
          <output data-testid="round">{progress.phraseForest.stages["6"].currentRoundIndex}</output>
        </>
      );
    }

    render(<Harness />);
    expect(screen.getByRole("button", { name: /Stage 7/ })).toBeDisabled();

    const stage = forest.stages[0];
    const target = stage.practicePhrases[0];
    const choices = meaningChoicesForItem(stage, target);
    const targetIndex = choices.findIndex((choice) => choice.id === target.id);
    const wrongIndex = targetIndex === 0 ? 1 : 0;

    fireEvent.click(screen.getByRole("button", { name: "Hear the whole phrase" }));
    expect(speakText).toHaveBeenCalledWith("my book", { clearAutoAdvance: false });
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`Scene option ${wrongIndex + 1}:`) }));
    expect(screen.getByText(/Not quite\. Read the whole phrase/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(`Scene option ${targetIndex + 1}:`) }));

    expect(screen.getByTestId("round")).toHaveTextContent("1");
    expect(screen.getByRole("heading", { name: "Bridge piece placed!" })).toBeInTheDocument();
    expect(screen.getByText(/connected another part of the path/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue reading" }));
    expect(screen.queryByRole("heading", { name: "Bridge piece placed!" })).not.toBeInTheDocument();
  });

  test("builds a stage-specific phrase, supports reset, and keeps failed saves safe", () => {
    const forest = createForest();
    const initial = createProgress(forest);
    initial.phraseForest.stages["6"].completedMissionIds = [phraseMissionId(6, 0)];

    function BuildHarness({ save = true }: { save?: boolean }) {
      const [progress, setProgress] = useState(initial);
      return (
        <PhraseForestWorld
          content={forest}
          progress={progress}
          sessionId="build-session"
          speechNotice=""
          speakText={() => true}
          commitProgress={(next) => {
            if (!save) return null;
            setProgress(next);
            return next;
          }}
        />
      );
    }

    const { unmount } = render(<BuildHarness />);
    expect(screen.getByRole("heading", { name: "Build the supply label" })).toBeInTheDocument();
    const item = forest.stages[0].practicePhrases[4];
    fireEvent.click(screen.getByRole("button", { name: item.tokens[0] }));
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));
    expect(screen.getByLabelText("Built phrase")).toHaveTextContent("Choose the first word");

    const bank = screen.getByLabelText("Available words");
    Array.from(bank.querySelectorAll("button")).forEach((button) => fireEvent.click(button));
    expect(screen.getByText(/Almost\. Listen to the complete phrase/)).toBeInTheDocument();

    item.tokens.forEach((token) => fireEvent.click(screen.getByRole("button", { name: token })));
    expect(screen.getByRole("heading", { name: "Bridge piece placed!" })).toBeInTheDocument();
    unmount();

    render(<BuildHarness save={false} />);
    item.tokens.forEach((token) => fireEvent.click(screen.getByRole("button", { name: token })));
    expect(screen.queryByRole("heading", { name: "Bridge piece placed!" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Build the supply label" })).toBeInTheDocument();
  });

  test("keeps a supported Prove mission as practice and continues the capstone", () => {
    const forest = createForest();
    const initial = createProgress(forest);
    const stage = forest.stages[0];
    initial.phraseForest.stages["6"].completedMissionIds = missionIds(6, 15);
    initial.phraseForest.stages["6"].currentRoundIndex = 2;
    initial.phraseForest.stages["6"].checkpointAttempt = {
      missionId: phraseMissionId(6, 15),
      sessionId: "supported-session",
      itemIds: stage.checkpointPhrases.slice(0, 2).map((item) => item.id),
      hadError: true,
      usedHelp: true,
    };

    function Harness() {
      const [progress, setProgress] = useState(initial);
      return (
        <PhraseForestWorld
          content={forest}
          progress={progress}
          sessionId="supported-session"
          speechNotice="Speech help is ready."
          speakText={() => true}
          commitProgress={(next) => {
            setProgress(next);
            return next;
          }}
        />
      );
    }

    render(<Harness />);
    const item = stage.checkpointPhrases[2];
    fireEvent.click(screen.getByRole("button", { name: `Hear ${item.tokens[0]}` }));
    fireEvent.click(screen.getByRole("button", { name: "Hear the whole phrase" }));
    Array.from(screen.getByLabelText("Available words").querySelectorAll("button"))
      .forEach((button) => fireEvent.click(button));
    expect(screen.getByText(/Almost\. Listen to the complete phrase/)).toBeInTheDocument();
    item.tokens.forEach((token) => fireEvent.click(screen.getByRole("button", { name: token })));
    expect(screen.getByRole("heading", { name: "Bridge piece placed!" })).toBeInTheDocument();
    expect(screen.getByText("Speech help is ready.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue reading" }));
    expect(screen.getByText("Prove · Mission 17 of 20")).toBeInTheDocument();
  });

  test("restores the area, unlocks its companion, and continues to the next stage", () => {
    const forest = createForest();
    const initialProgress = createProgress(forest);
    initialProgress.phraseForest.stages["6"].completedMissionIds = missionIds(6, 19);
    initialProgress.phraseForest.stages["6"].completedCheckpointIds = [
      phraseMissionId(6, 15),
      phraseMissionId(6, 16),
    ];
    initialProgress.phraseForest.stages["6"].checkpointSessionIds = {
      [phraseMissionId(6, 15)]: "reading-session-1",
      [phraseMissionId(6, 16)]: "reading-session-2",
    };
    initialProgress.phraseForest.stages["6"].currentRoundIndex = 2;
    initialProgress.phraseForest.stages["6"].checkpointAttempt = {
      missionId: phraseMissionId(6, 19),
      sessionId: "reading-session-3",
      itemIds: forest.stages[0].checkpointPhrases.slice(12, 14).map((item) => item.id),
      hadError: false,
      usedHelp: false,
    };

    function Harness() {
      const [progress, setProgress] = useState(initialProgress);
      return (
        <PhraseForestWorld
          content={forest}
          progress={progress}
          sessionId="reading-session-3"
          speechNotice=""
          speakText={() => true}
          commitProgress={(next) => {
            const clean = {
              ...next,
              phraseForest: sanitizePhraseForestProgress(forest, next.phraseForest, true),
            };
            setProgress(clean);
            return clean;
          }}
        />
      );
    }

    const { unmount } = render(<Harness />);
    const stage = forest.stages[0];
    const target = stage.checkpointPhrases[14];
    const choices = meaningChoicesForItem(stage, target);
    const targetIndex = choices.findIndex((choice) => choice.id === target.id);

    fireEvent.click(screen.getByRole("button", {
      name: new RegExp(`Scene option ${targetIndex + 1}:`),
    }));
    expect(screen.getByRole("dialog", { name: "Fox joined you!" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Continue the trail" }));

    expect(screen.getByText("Area 7")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Stage 7/ })).toHaveClass("is-active");
    fireEvent.click(screen.getByRole("button", { name: /Stage 6/ }));
    expect(screen.getByRole("button", { name: /Stage 6/ })).toHaveClass("is-active");

    unmount();
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", {
      name: new RegExp(`Scene option ${targetIndex + 1}:`),
    }));
    fireEvent.click(screen.getByRole("button", { name: "Visit this area" }));
    expect(screen.queryByRole("dialog", { name: "Fox joined you!" })).not.toBeInTheDocument();
  });

  test("keeps the reader in the restored area when the next stage is still locked", () => {
    const forest = createForest();
    const initialProgress = createProgress(forest);
    initialProgress.phraseForest.stages["6"].completedMissionIds = missionIds(6, 19);
    initialProgress.phraseForest.stages["6"].completedCheckpointIds = [
      phraseMissionId(6, 15),
      phraseMissionId(6, 16),
    ];
    initialProgress.phraseForest.stages["6"].checkpointSessionIds = {
      [phraseMissionId(6, 15)]: "reading-session-1",
      [phraseMissionId(6, 16)]: "reading-session-2",
    };
    initialProgress.phraseForest.stages["6"].currentRoundIndex = 2;
    initialProgress.phraseForest.stages["6"].checkpointAttempt = {
      missionId: phraseMissionId(6, 19),
      sessionId: "reading-session-3",
      itemIds: forest.stages[0].checkpointPhrases.slice(12, 14).map((item) => item.id),
      hadError: false,
      usedHelp: false,
    };

    function Harness() {
      const [progress, setProgress] = useState(initialProgress);
      return (
        <PhraseForestWorld
          content={forest}
          progress={progress}
          sessionId="reading-session-3"
          speechNotice=""
          speakText={() => true}
          commitProgress={(next) => {
            setProgress(next);
            return next;
          }}
        />
      );
    }

    render(<Harness />);
    const stage = forest.stages[0];
    const target = stage.checkpointPhrases[14];
    const choices = meaningChoicesForItem(stage, target);
    const targetIndex = choices.findIndex((choice) => choice.id === target.id);

    fireEvent.click(screen.getByRole("button", {
      name: new RegExp(`Scene option ${targetIndex + 1}:`),
    }));
    fireEvent.click(screen.getByRole("button", { name: "See the restored forest" }));

    expect(screen.getByRole("button", { name: /Stage 6/ })).toHaveClass("is-active");
    expect(screen.getByRole("button", { name: /Stage 7/ })).toBeDisabled();
  });
});
