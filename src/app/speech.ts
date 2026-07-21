export const SPEECH_REPLAY_DELAY_MS = 80;
export const SPEECH_START_TIMEOUT_MS = 2_500;

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

export function getSpeechVoices(synthesis: SpeechSynthesis): SpeechSynthesisVoice[] {
  try {
    return synthesis.getVoices();
  } catch {
    return [];
  }
}

export function preferredEnglishVoice(
  voices: SpeechSynthesisVoice[],
): SpeechSynthesisVoice | null {
  return voices.find((voice) => isUnitedStatesEnglishVoice(voice) && voice.localService)
    || voices.find(isUnitedStatesEnglishVoice)
    || voices.find((voice) => isEnglishVoice(voice) && voice.localService)
    || voices.find(isEnglishVoice)
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
