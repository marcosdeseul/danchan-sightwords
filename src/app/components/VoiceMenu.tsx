import { useEffect, useState } from "react";
import { Icon } from "../../icons";
import {
  SPEECH_RATE_PRESETS,
  englishSpeechVoices,
  getSpeechVoices,
  loadSpeechRate,
  loadSpeechVoiceUri,
  normalizedSpeechRate,
  preferredEnglishVoice,
  saveSpeechRate,
  saveSpeechVoiceUri,
} from "../speech";

function voiceLabel(voice: SpeechSynthesisVoice): string {
  const service = voice.localService ? "on device" : "online";
  return `${voice.name} (${voice.lang}, ${service})`;
}

export function VoiceMenu({ onPreview }: { onPreview: () => void }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceUri, setVoiceUri] = useState(loadSpeechVoiceUri);
  const [speechRate, setSpeechRate] = useState(loadSpeechRate);
  const synthesis = "speechSynthesis" in window ? window.speechSynthesis : null;
  const selectedVoice = preferredEnglishVoice(voices, voiceUri);
  const selectedVoiceAvailable = voices.some((voice) => voice.voiceURI === voiceUri);
  const selectValue = voiceUri && selectedVoiceAvailable ? voiceUri : "";

  useEffect(() => {
    if (!synthesis) {
      return undefined;
    }

    const updateVoices = () => {
      setVoices(englishSpeechVoices(getSpeechVoices(synthesis)));
    };

    updateVoices();
    synthesis.addEventListener("voiceschanged", updateVoices);
    return () => synthesis.removeEventListener("voiceschanged", updateVoices);
  }, [synthesis]);

  const chooseVoice = (nextVoiceUri: string) => {
    synthesis?.cancel();
    saveSpeechVoiceUri(nextVoiceUri);
    setVoiceUri(nextVoiceUri);
  };

  const chooseSpeechRate = (nextRate: number) => {
    const normalizedRate = normalizedSpeechRate(nextRate);
    synthesis?.cancel();
    saveSpeechRate(normalizedRate);
    setSpeechRate(normalizedRate);
  };

  return (
    <section className="voice-menu" aria-labelledby="voiceMenuTitle">
      <div className="voice-menu-heading">
        <Icon name="speaker" />
        <span id="voiceMenuTitle">Voice</span>
        <strong>{selectedVoice?.name || "Unavailable"}</strong>
      </div>
      <div className="voice-menu-controls">
        <label htmlFor="readingVoice">Reading voice</label>
        <select
          id="readingVoice"
          value={selectValue}
          disabled={!synthesis || voices.length === 0}
          onChange={(event) => chooseVoice(event.currentTarget.value)}
        >
          <option value="">
            {selectedVoice ? `Automatic - ${selectedVoice.name}` : "No English voices found"}
          </option>
          {voices.map((voice) => (
            <option key={voice.voiceURI} value={voice.voiceURI}>
              {voiceLabel(voice)}
            </option>
          ))}
        </select>
        <button
          className="auth-button secondary"
          type="button"
          disabled={!synthesis}
          onClick={onPreview}
        >
          Test voice
        </button>
      </div>
      <div className="voice-speed-controls">
        <span id="readingSpeedLabel">Reading speed</span>
        <div
          className="voice-speed-options"
          role="group"
          aria-labelledby="readingSpeedLabel"
        >
          {SPEECH_RATE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={speechRate === preset.rate ? "is-active" : ""}
              aria-pressed={speechRate === preset.rate}
              onClick={() => chooseSpeechRate(preset.rate)}
            >
              <span>{preset.label}</span>
              <strong>{preset.rate.toFixed(2)}×</strong>
            </button>
          ))}
        </div>
      </div>
      <p>Voice and speed are saved on this device.</p>
    </section>
  );
}
