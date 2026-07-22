// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { SPEECH_VOICE_STORAGE_KEY } from "../speech";
import { VoiceMenu } from "./VoiceMenu";

function voice(
  name: string,
  lang: string,
  localService: boolean,
): SpeechSynthesisVoice {
  return {
    default: false,
    lang,
    localService,
    name,
    voiceURI: `voice:${name}`,
  };
}

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      get length() { return values.size; },
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      key: (index: number) => [...values.keys()][index] ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, String(value)),
    } satisfies Storage,
  });
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  Reflect.deleteProperty(window, "speechSynthesis");
  vi.restoreAllMocks();
});

test("shows an unavailable voice menu when browser speech is missing", () => {
  Reflect.deleteProperty(window, "speechSynthesis");
  render(<VoiceMenu onPreview={vi.fn()} />);

  expect(screen.getByText("Unavailable")).toBeInTheDocument();
  expect(screen.getByRole("combobox", { name: "Reading voice" })).toBeDisabled();
  expect(screen.getByRole("option")).toHaveTextContent("No English voices found");
  expect(screen.getByRole("button", { name: "Test voice" })).toBeDisabled();
});

test("lists English voices, saves a choice, previews it, and follows device updates", () => {
  const localUs = voice("Clear US", "en-US", true);
  const onlineUk = voice("Warm UK", "en-GB", false);
  const korean = voice("Korean", "ko-KR", true);
  let voices = [localUs, onlineUk, korean];
  let voicesChanged: (() => void) | undefined;
  const synthesis = {
    getVoices: vi.fn(() => voices),
    addEventListener: vi.fn((_name: string, callback: () => void) => {
      voicesChanged = callback;
    }),
    removeEventListener: vi.fn(),
    cancel: vi.fn(),
  } as unknown as SpeechSynthesis;
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: synthesis,
  });
  window.localStorage.setItem(SPEECH_VOICE_STORAGE_KEY, onlineUk.voiceURI);
  const preview = vi.fn();

  const view = render(<VoiceMenu onPreview={preview} />);
  const select = screen.getByRole("combobox", { name: "Reading voice" });
  expect(select).toHaveValue(onlineUk.voiceURI);
  expect(screen.getByText("Warm UK", { selector: "strong" })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: /Clear US.*on device/ })).toBeInTheDocument();
  expect(screen.getByRole("option", { name: /Warm UK.*online/ })).toBeInTheDocument();
  expect(screen.queryByRole("option", { name: /Korean/ })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Test voice" }));
  expect(preview).toHaveBeenCalledOnce();
  fireEvent.change(select, { target: { value: localUs.voiceURI } });
  expect(synthesis.cancel).toHaveBeenCalledOnce();
  expect(window.localStorage.getItem(SPEECH_VOICE_STORAGE_KEY)).toBe(localUs.voiceURI);

  fireEvent.change(select, { target: { value: "" } });
  expect(window.localStorage.getItem(SPEECH_VOICE_STORAGE_KEY)).toBeNull();
  expect(select).toHaveValue("");

  voices = [];
  act(() => voicesChanged?.());
  expect(select).toBeDisabled();

  view.unmount();
  expect(synthesis.removeEventListener).toHaveBeenCalledWith("voiceschanged", voicesChanged);
});
