// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { TreasureRewardReveal } from "./TreasureRewardReveal";
import type { StageContent } from "./types";

afterEach(cleanup);

const stage: StageContent = {
  id: 1,
  title: "Stage 1",
  subtitle: "Ancient Warrior",
  themeClass: "stage-ancient",
  heroName: "Ancient Warrior",
  words: ["one", "two"],
  fieldTrip: {
    title: "Valley Trip",
    intro: "Cross the valley.",
    finish: "Stage 2 unlocked!",
    creatures: ["Cave Wolf"],
  },
  rewards: [
    {
      id: "stage1-weapon",
      name: "Stone Hammer",
      slot: "weapon",
      stageId: 1,
      milestone: 1,
      visualKey: "stage1-weapon",
    },
    {
      id: "stage1-boots",
      name: "Hide Boots",
      slot: "boots",
      stageId: 1,
      milestone: 2,
      visualKey: "stage1-boots",
    },
  ],
};

test("reveals the exact reward, complete loadout, and requires Continue", () => {
  const onContinue = vi.fn();
  const { container } = render(
    <TreasureRewardReveal
      stage={stage}
      reward={stage.rewards[1]}
      equippedRewards={[stage.rewards[0], stage.rewards[1]]}
      onContinue={onContinue}
    />,
  );

  expect(screen.getByRole("dialog", { name: "Hide Boots" })).toHaveClass("stage-ancient");
  expect(screen.getByLabelText("New item: Hide Boots")).toBeInTheDocument();
  expect(screen.getByText("Ancient Warrior is wearing it!")).toBeInTheDocument();
  expect(container.querySelectorAll('[data-visual-key="stage1-boots"]')).not.toHaveLength(0);

  const button = screen.getByRole("button", { name: "Continue" });
  expect(button).toHaveFocus();
  fireEvent.click(button);
  expect(onContinue).toHaveBeenCalledOnce();
});

test("adds the revealed reward when the supplied loadout does not yet contain it", () => {
  const { container } = render(
    <TreasureRewardReveal
      stage={stage}
      reward={stage.rewards[1]}
      equippedRewards={[stage.rewards[0]]}
      onContinue={() => undefined}
    />,
  );

  expect(container.querySelectorAll('[data-visual-key="stage1-boots"]')).not.toHaveLength(0);
});
