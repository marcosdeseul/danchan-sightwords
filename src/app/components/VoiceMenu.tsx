import { useEffect, useState } from "react";
import { Icon } from "../../icons";
import {
  MAX_SPEECH_RATE,
  MIN_SPEECH_RATE,
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
    <details className="voice-menu">
      <summary>
        <Icon name="speaker" />
        <span>Voice</span>
        <strong>{selectedVoice?.name || "Unavailable"}</strong>
      </summary>
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
        <label htmlFor="readingSpeed">Reading speed</label>
        <input
          id="readingSpeed"
          type="range"
          min={MIN_SPEECH_RATE}
          max={MAX_SPEECH_RATE}
          step="0.01"
          value={speechRate}
          onChange={(event) => chooseSpeechRate(Number(event.currentTarget.value))}
        />
        <output htmlFor="readingSpeed">{speechRate.toFixed(2)}×</output>
      </div>
      <p>Voice and speed are saved on this device.</p>
    </details>
  );
}
