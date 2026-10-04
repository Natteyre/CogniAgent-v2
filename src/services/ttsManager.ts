class TtsManager {
  private speechRate: number = 1.0;
  private speechPitch: number = 1.0;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private isSpeakingState: boolean = false;
  private speakingListeners: Set<(isSpeaking: boolean) => void> = new Set();
  private voices: SpeechSynthesisVoice[] = [];
  private voicesListeners: Set<(voices: SpeechSynthesisVoice[]) => void> = new Set();
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudioFallback: HTMLAudioElement | null = null;
  private isAudioUnlocked: boolean = false;

  constructor() {
    this.initVoices();
  }

  private initVoices() {
    if (typeof window === 'undefined') return;

    const loadVoices = () => {
      if (window.speechSynthesis) {
        this.voices = window.speechSynthesis.getVoices() || [];
        // Look for Polish voice
        const plVoice = this.voices.find(
          (v) =>
            v.lang.toLowerCase().replace('_', '-').startsWith('pl') ||
            v.name.toLowerCase().includes('polish') ||
            v.name.toLowerCase().includes('polski')
        );
        if (plVoice && !this.selectedVoice) {
          this.selectedVoice = plVoice;
        }
        this.voicesListeners.forEach((fn) => fn(this.voices));
      }
    };

    loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
      // Retry after 500ms as WebView may take time to populate
      setTimeout(loadVoices, 500);
      setTimeout(loadVoices, 1500);
    }
  }

  unlockAudio() {
    if (this.isAudioUnlocked) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          ctx.resume();
        }
      }
      if (window.speechSynthesis) {
        // Prime synthesis with an empty/silent utterance to unlock WebView audio
        const dummy = new SpeechSynthesisUtterance('');
        dummy.volume = 0;
        window.speechSynthesis.speak(dummy);
      }
      this.isAudioUnlocked = true;
    } catch (e) {
      console.warn('Audio unlock warning:', e);
    }
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }

  getSelectedVoice(): SpeechSynthesisVoice | null {
    return this.selectedVoice;
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

  getSpeechRate(): number {
    return this.speechRate;
  }

  setSpeechPitch(pitch: number) {
    this.speechPitch = Math.max(0.5, Math.min(2.0, pitch));
  }

  getSpeechPitch(): number {
    return this.speechPitch;
  }

  setSelectedVoiceByName(name: string) {
    const v = this.voices.find((voice) => voice.name === name);
    if (v) this.selectedVoice = v;
  }

  /**
   * Primary speech method: attempts Web Speech API, with automatic fallback to high-quality audio stream.
   */
  speak(text: string, onEnd?: () => void): void {
    this.unlockAudio();
    this.stop();

    const trimmed = text.trim();
    if (!trimmed) {
      onEnd?.();
      return;
    }

    // Try Web Speech API first if supported and has voices or platform support
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        const utterance = new SpeechSynthesisUtterance(trimmed);
        utterance.rate = this.speechRate;
        utterance.pitch = this.speechPitch;
        utterance.lang = 'pl-PL';

        if (this.selectedVoice) {
          utterance.voice = this.selectedVoice;
        } else {
          const plVoice = this.voices.find(
            (v) =>
              v.lang.toLowerCase().replace('_', '-').startsWith('pl') ||
              v.name.toLowerCase().includes('polish') ||
              v.name.toLowerCase().includes('polski')
          );
          if (plVoice) utterance.voice = plVoice;
        }

        let didStart = false;
        utterance.onstart = () => {
          didStart = true;
          this.setSpeaking(true);
        };

        utterance.onend = () => {
          this.currentUtterance = null;
          this.setSpeaking(false);
          onEnd?.();
        };

        utterance.onerror = (err) => {
          console.warn('SpeechSynthesis error, falling back to audio stream:', err);
          this.currentUtterance = null;
          this.fallbackAudioSpeak(trimmed, onEnd);
        };

        // Guard against Chrome bug where onstart never fires
        setTimeout(() => {
          if (!didStart && this.isSpeakingState) {
            console.warn('SpeechSynthesis stuck, falling back to audio stream');
            this.fallbackAudioSpeak(trimmed, onEnd);
          }
        }, 1200);

        this.currentUtterance = utterance;
        this.setSpeaking(true);
        window.speechSynthesis.speak(utterance);
        return;
      } catch (e) {
        console.warn('Failed to speak via Web Speech API:', e);
      }
    }

    // Fallback to audio stream if speech synthesis is not supported
    this.fallbackAudioSpeak(trimmed, onEnd);
  }

  /**
   * Fallback online high-definition Polish TTS audio stream (e.g. for Android WebViews without local TTS engines)
   */
  private fallbackAudioSpeak(text: string, onEnd?: () => void) {
    try {
      this.stop();
      const encoded = encodeURIComponent(text.substring(0, 180));
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=pl&q=${encoded}`;
      const audio = new Audio(url);
      this.currentAudioFallback = audio;

      audio.onplay = () => {
        this.setSpeaking(true);
      };

      audio.onended = () => {
        this.currentAudioFallback = null;
        this.setSpeaking(false);
        onEnd?.();
      };

      audio.onerror = () => {
        console.warn('Audio fallback error');
        this.currentAudioFallback = null;
        this.setSpeaking(false);
        onEnd?.();
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Audio play failed:', err);
          this.setSpeaking(false);
          onEnd?.();
        });
      }
    } catch {
      this.setSpeaking(false);
      onEnd?.();
    }
  }

  /**
   * Explicit test function with audio feedback
   */
  async testVoice(sampleText = 'Witaj. System syntezy mowy CogniAgent działa poprawnie na Twoim telefonie.'): Promise<boolean> {
    this.unlockAudio();
    return new Promise((resolve) => {
      this.speak(sampleText, () => {
        resolve(true);
      });
      // Safety timeout
      setTimeout(() => resolve(true), 4000);
    });
  }

  stop() {
    if (this.currentAudioFallback) {
      try {
        this.currentAudioFallback.pause();
        this.currentAudioFallback.currentTime = 0;
      } catch {
        // Ignore
      }
      this.currentAudioFallback = null;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore
      }
    }

    this.currentUtterance = null;
    this.setSpeaking(false);
  }
}

export const ttsManager = new TtsManager();
