export const SPEECH_REPLAY_DELAY_MS = 80;
export const SPEECH_START_TIMEOUT_MS = 2_500;
export const SPEECH_VOICE_STORAGE_KEY = "dan-sight-words-speech-voice";
export const SPEECH_RATE_STORAGE_KEY = "dan-sight-words-speech-rate";
export const DEFAULT_SPEECH_RATE = 0.76;
export const SPEECH_RATE_PRESETS = [
  { label: "Slow", rate: 0.65 },
  { label: "Learning", rate: DEFAULT_SPEECH_RATE },
  { label: "Normal", rate: 1 },
  { label: "Fast", rate: 1.15 },
] as const;

export const SPEECH_START_TIMEOUT_NOTICE =
  "No sound started. Turn up media volume and enable text-to-speech in your device settings, then try again.";

function normalizedLanguage(voice: SpeechSynthesisVoice): string {
  return voice.lang.trim().toLocaleLowerCase("en-US").replaceAll("_", "-");
}

function isEnglishVoice(voice: SpeechSynthesisVoice): boolean {
  const language = normalizedLanguage(voice);
  return language === "en" || language.startsWith("en-");
}

function isUnitedStatesEnglishVoice(voice: SpeechSynthesisVoice): boolean {
  return normalizedLanguage(voice) === "en-us";
}

export function englishSpeechVoices(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice[] {
  return voices.filter(isEnglishVoice);
}

export function loadSpeechVoiceUri(
  storage: Pick<Storage, "getItem"> = window.localStorage,
): string {
  try {
    return storage.getItem(SPEECH_VOICE_STORAGE_KEY) || "";
  } catch {
    return "";
  }
}

export function saveSpeechVoiceUri(
  voiceUri: string,
  storage: Pick<Storage, "removeItem" | "setItem"> = window.localStorage,
): void {
  try {
    if (voiceUri) {
      storage.setItem(SPEECH_VOICE_STORAGE_KEY, voiceUri);
    } else {
      storage.removeItem(SPEECH_VOICE_STORAGE_KEY);
    }
  } catch {
    // Speech still works with the automatic voice when storage is unavailable.
  }
}

export function normalizedSpeechRate(rate: number): number {
  if (!Number.isFinite(rate)) {
    return DEFAULT_SPEECH_RATE;
  }

  return SPEECH_RATE_PRESETS.reduce((closestRate, preset) => (
    Math.abs(preset.rate - rate) < Math.abs(closestRate - rate)
      ? preset.rate
      : closestRate
  ), DEFAULT_SPEECH_RATE);
}

export function loadSpeechRate(
  storage: Pick<Storage, "getItem"> = window.localStorage,
): number {
  try {
    const savedRate = storage.getItem(SPEECH_RATE_STORAGE_KEY);
    return savedRate === null
      ? DEFAULT_SPEECH_RATE
      : normalizedSpeechRate(Number(savedRate));
  } catch {
    return DEFAULT_SPEECH_RATE;
  }
}

export function saveSpeechRate(
  rate: number,
  storage: Pick<Storage, "setItem"> = window.localStorage,
): void {
  try {
    storage.setItem(SPEECH_RATE_STORAGE_KEY, String(normalizedSpeechRate(rate)));
  } catch {
    // Speech still works at the default rate when storage is unavailable.
  }
}

export function getSpeechVoices(synthesis: SpeechSynthesis): SpeechSynthesisVoice[] {
  try {
    return synthesis.getVoices();
  } catch {
    return [];
  }
}

export function preferredEnglishVoice(
  voices: SpeechSynthesisVoice[],
  voiceUri = "",
): SpeechSynthesisVoice | null {
  const englishVoices = englishSpeechVoices(voices);
  return englishVoices.find((voice) => voice.voiceURI === voiceUri)
    || englishVoices.find((voice) => isUnitedStatesEnglishVoice(voice) && voice.localService)
    || englishVoices.find(isUnitedStatesEnglishVoice)
    || englishVoices.find((voice) => voice.localService)
    || englishVoices[0]
    || null;
}

export function speechFailureNotice(error?: string): string {
  if (error === "not-allowed") {
    return "Speech was blocked. Tap Play sound again to allow it on this device.";
  }

  if (error === "synthesis-unavailable" || error === "voice-unavailable") {
    return "No English text-to-speech voice is available. Enable or install a speech service in your device settings.";
  }

  if (error === "audio-busy" || error === "audio-hardware") {
    return "Your device audio is busy or unavailable. Close other audio apps and try again.";
  }

  if (error === "network") {
    return "This speech voice needs an internet connection. Check the connection and try again.";
  }

  return "Speech could not play. Check media volume and try again.";
}
