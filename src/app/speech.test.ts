// @vitest-environment jsdom

import { describe, expect, test, vi } from "vitest";
import {
  SPEECH_VOICE_STORAGE_KEY,
  englishSpeechVoices,
  getSpeechVoices,
  loadSpeechVoiceUri,
  preferredEnglishVoice,
  saveSpeechVoiceUri,
  speechFailureNotice,
} from "./speech";

function voice(
  lang: string,
  { localService = false, name = lang }: { localService?: boolean; name?: string } = {},
): SpeechSynthesisVoice {
  return {
    default: false,
    lang,
    localService,
    name,
    voiceURI: name,
  };
}

describe("device speech compatibility", () => {
  test("reads voices defensively when a browser speech engine is incomplete", () => {
    const voices = [voice("en-US")];
    const synthesis = { getVoices: vi.fn(() => voices) } as unknown as SpeechSynthesis;
    expect(getSpeechVoices(synthesis)).toBe(voices);

    const brokenSynthesis = {
      getVoices: () => {
        throw new Error("engine unavailable");
      },
    } as unknown as SpeechSynthesis;
    expect(getSpeechVoices(brokenSynthesis)).toEqual([]);
  });

  test("prefers local US English, then other usable English voices", () => {
    const localUs = voice("en_US", { localService: true, name: "Local US" });
    const remoteUs = voice("en-US", { name: "Remote US" });
    const localUk = voice("en-GB", { localService: true, name: "Local UK" });
    const remoteUk = voice("en-GB", { name: "Remote UK" });
    const korean = voice("ko-KR", { localService: true });

    expect(preferredEnglishVoice([remoteUs, localUs])).toBe(localUs);
    expect(preferredEnglishVoice([remoteUs, localUk])).toBe(remoteUs);
    expect(preferredEnglishVoice([korean, localUk, remoteUk])).toBe(localUk);
    expect(preferredEnglishVoice([korean, remoteUk])).toBe(remoteUk);
    expect(preferredEnglishVoice([voice("en")])).toHaveProperty("lang", "en");
    expect(preferredEnglishVoice([korean])).toBeNull();
    expect(preferredEnglishVoice([])).toBeNull();
    expect(englishSpeechVoices([localUs, korean])).toEqual([localUs]);
  });

  test("uses and persists a chosen English voice defensively", () => {
    const localUs = voice("en-US", { localService: true, name: "Local US" });
    const chosenUk = voice("en-GB", { name: "Chosen UK" });
    expect(preferredEnglishVoice([localUs, chosenUk], chosenUk.voiceURI)).toBe(chosenUk);
    expect(preferredEnglishVoice([localUs], "missing")).toBe(localUs);

    const values = new Map<string, string>();
    const storage = {
      getItem: vi.fn((key: string) => values.get(key) || null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
      removeItem: vi.fn((key: string) => values.delete(key)),
    };
    expect(loadSpeechVoiceUri(storage)).toBe("");
    saveSpeechVoiceUri(chosenUk.voiceURI, storage);
    expect(storage.setItem).toHaveBeenCalledWith(
      SPEECH_VOICE_STORAGE_KEY,
      chosenUk.voiceURI,
    );
    expect(loadSpeechVoiceUri(storage)).toBe(chosenUk.voiceURI);
    saveSpeechVoiceUri("", storage);
    expect(storage.removeItem).toHaveBeenCalledWith(SPEECH_VOICE_STORAGE_KEY);

    const unavailableStorage = {
      getItem: () => { throw new Error("blocked"); },
      setItem: () => { throw new Error("blocked"); },
      removeItem: () => { throw new Error("blocked"); },
    };
    expect(loadSpeechVoiceUri(unavailableStorage)).toBe("");
    expect(() => saveSpeechVoiceUri("voice", unavailableStorage)).not.toThrow();
  });

  test("turns browser speech failures into useful device guidance", () => {
    expect(speechFailureNotice("not-allowed")).toMatch(/Tap Play sound again/);
    expect(speechFailureNotice("synthesis-unavailable")).toMatch(/speech service/);
    expect(speechFailureNotice("voice-unavailable")).toMatch(/speech service/);
    expect(speechFailureNotice("audio-busy")).toMatch(/audio is busy/);
    expect(speechFailureNotice("audio-hardware")).toMatch(/audio is busy/);
    expect(speechFailureNotice("network")).toMatch(/internet connection/);
    expect(speechFailureNotice("unknown")).toMatch(/media volume/);
    expect(speechFailureNotice()).toMatch(/media volume/);
  });
});
