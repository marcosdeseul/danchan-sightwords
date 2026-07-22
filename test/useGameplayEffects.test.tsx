// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { defaultProgress } from "../src/game";
import type { SightWordsContent, StageContent } from "../src/types";
import type { AppState } from "../src/app/state";
import { useGameplayEffects } from "../src/app/hooks/useGameplayEffects";

type Props = Parameters<typeof useGameplayEffects>[0];

const content: SightWordsContent = {
  version: 1,
  stages: [
    {
      id: 1,
      title: "Stage 1",
      subtitle: "Hero",
      themeClass: "stage-ancient",
      heroName: "Hero",
      words: ["alpha"],
      rewards: [],
      fieldTrip: { title: "Trip", intro: "Go", finish: "Done", creatures: ["Wolf"] },
    } satisfies StageContent,
  ],
};

function state(overrides: Partial<AppState> = {}): AppState {
  return {
    content,
    progress: defaultProgress(content),
    user: { id: 1, username: "dan", email: null },
    authMessage: "",
    speechNotice: "",
    celebration: "",
    celebrationKey: 0,
    lastAnswerAction: null,
    maze: { open: false, position: { row: 0, col: 0 }, message: "", bumpCount: 0 },
    fieldTrip: {
      open: false,
      stageId: null,
      runnerX: 0,
      progress: 0,
      collected: 0,
      creature: null,
      lastTime: 0,
      swinging: false,
      defending: false,
      attackCharge: 0,
      attackEffectKey: 0,
      blockEffectKey: 0,
      message: "",
    },
    loading: false,
    speaking: false,
    activeWorld: "words",
    ...overrides,
  };
}

function Harness(props: Props) {
  useGameplayEffects(props);
  return null;
}

function props(nextState = state(), overrides: Partial<Props> = {}): Props {
  return {
    state: nextState,
    stateRef: { current: nextState },
    inventoryOpen: false,
    setInventoryOpen: vi.fn(),
    treasureReveal: null,
    moveMaze: vi.fn(),
    moveFieldTrip: vi.fn(),
    completeFieldTrip: vi.fn(),
    dispatch: vi.fn(),
    wordCheckFeedbackTimer: { current: 0 },
    fieldTripDefenseTimer: { current: 0 },
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
  Reflect.deleteProperty(window, "speechSynthesis");
});

test("cleans timers and drives the field-trip animation and completion", () => {
  vi.useFakeTimers();
  const current = state({ fieldTrip: { ...state().fieldTrip, open: true, stageId: 1, collected: 5 } });
  const input = props(current);
  input.wordCheckFeedbackTimer.current = window.setTimeout(() => undefined, 100);
  input.fieldTripDefenseTimer.current = window.setTimeout(() => undefined, 100);
  const frameCallbacks: FrameRequestCallback[] = [];
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    frameCallbacks.push(callback);
    return frameCallbacks.length;
  });
  const cancelFrame = vi.spyOn(window, "cancelAnimationFrame");
  const view = render(<Harness {...input} />);

  act(() => frameCallbacks[0](100));
  expect(input.dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: "tickFieldTrip" }));
  expect(input.completeFieldTrip).toHaveBeenCalledOnce();
  view.unmount();
  expect(cancelFrame).toHaveBeenCalled();

  render(<Harness {...props(state({ fieldTrip: { ...state().fieldTrip, open: true, stageId: null } }))} />);
});

test("handles browser controls while leaving unrelated keys alone", () => {
  const base = state();
  const input = props(base, { inventoryOpen: true });
  const view = render(<Harness {...input} />);

  document.dispatchEvent(new KeyboardEvent("keydown", { key: "x" }));
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  expect(input.setInventoryOpen).toHaveBeenCalledWith(false);

  input.stateRef.current = state({ maze: { ...base.maze, open: true } });
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }));
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "x" }));
  expect(input.moveMaze).toHaveBeenCalledWith("up");

  input.stateRef.current = state({ fieldTrip: { ...base.fieldTrip, open: true, stageId: 1 } });
  document.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "x" }));
  expect(input.moveFieldTrip).toHaveBeenCalledWith("hit");
  view.unmount();

  const blocked = props(state({ user: null }), { treasureReveal: { stageId: 1, rewardId: "none" } });
  render(<Harness {...blocked} />);
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
  expect(blocked.moveMaze).not.toHaveBeenCalled();
});

test("cancels speech when the browser supports it", () => {
  const noSpeechView = render(<Harness {...props()} />);
  window.dispatchEvent(new Event("beforeunload"));
  noSpeechView.unmount();

  const cancel = vi.fn();
  Object.defineProperty(window, "speechSynthesis", { configurable: true, value: { cancel } });
  const view = render(<Harness {...props()} />);
  window.dispatchEvent(new Event("beforeunload"));
  expect(cancel).toHaveBeenCalledOnce();
  view.unmount();
});
