class TtsManager {
  private speechRate: number = 1.0;
  private speechPitch: number = 1.0;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private isSpeakingState: boolean = false;
  private speakingListeners: Set<(isSpeaking: boolean) => void> = new Set();
  private voices: SpeechSynthesisVoice[] = [];
  private voicesListeners: Set<(voices: SpeechSynthesisVoice[]) => void> = new Set();

  constructor() {
    this.initVoices();
  }

  private initVoices() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      this.voices = window.speechSynthesis.getVoices();
      // Prefer Polish voices if available
      const plVoice = this.voices.find(
        (v) => v.lang.toLowerCase().includes('pl') || v.name.toLowerCase().includes('polish')
      );
      if (plVoice && !this.selectedVoice) {
        this.selectedVoice = plVoice;
      }
      this.voicesListeners.forEach((fn) => fn(this.voices));
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  subscribeVoices(listener: (voices: SpeechSynthesisVoice[]) => void): () => void {
    this.voicesListeners.add(listener);
    if (this.voices.length > 0) listener(this.voices);
    return () => this.voicesListeners.delete(listener);
  }

  subscribeSpeaking(listener: (isSpeaking: boolean) => void): () => void {
    this.speakingListeners.add(listener);
    listener(this.isSpeakingState);
    return () => this.speakingListeners.delete(listener);
  }

  private setSpeaking(speaking: boolean) {
    this.isSpeakingState = speaking;
    this.speakingListeners.forEach((fn) => fn(speaking));
  }

  setSpeechRate(rate: number) {
    this.speechRate = Math.max(0.5, Math.min(2.0, rate));
  }

  setSpeechPitch(pitch: number) {
    this.speechPitch = Math.max(0.5, Math.min(2.0, pitch));
  }

  setSelectedVoiceByName(name: string) {
    const v = this.voices.find((voice) => voice.name === name);
    if (v) this.selectedVoice = v;
  }

  speak(text: string, onEnd?: () => void) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      onEnd?.();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = this.speechRate;
      utterance.pitch = this.speechPitch;
      utterance.lang = 'pl-PL';

      if (this.selectedVoice) {
        utterance.voice = this.selectedVoice;
      } else {
        const plVoice = this.voices.find(
          (v) => v.lang.toLowerCase().includes('pl') || v.name.toLowerCase().includes('polish')
        );
        if (plVoice) utterance.voice = plVoice;
      }

      utterance.onstart = () => {
        this.setSpeaking(true);
      };

      utterance.onend = () => {
        this.setSpeaking(false);
        onEnd?.();
      };

      utterance.onerror = () => {
        this.setSpeaking(false);
        onEnd?.();
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      this.setSpeaking(false);
      onEnd?.();
    }
  }

  stop() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.setSpeaking(false);
  }
}

export const ttsManager = new TtsManager();
