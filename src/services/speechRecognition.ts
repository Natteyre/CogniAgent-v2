// Speech Recognition & Real-time Microphone Audio Level helper

export interface SpeechHelperListeners {
  onListeningChange?: (isListening: boolean) => void;
  onRmsLevelChange?: (level: number) => void;
}

class SpeechRecognizerHelper {
  private isListeningState: boolean = false;
  private rmsLevelState: number = 0;
  private listeners: SpeechHelperListeners = {};

  private recognition: any = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;

  constructor() {
    this.initRecognition();
  }

  private initRecognition() {
    if (typeof window === 'undefined') return;

    const win = window as any;
    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'pl-PL';
    }
  }

  setListeners(listeners: SpeechHelperListeners) {
    this.listeners = listeners;
  }

  get isListening(): boolean {
    return this.isListeningState;
  }

  get rmsLevel(): number {
    return this.rmsLevelState;
  }

  private setListening(val: boolean) {
    this.isListeningState = val;
    this.listeners.onListeningChange?.(val);
  }

  private setRms(val: number) {
    this.rmsLevelState = val;
    this.listeners.onRmsLevelChange?.(val);
  }

  async startListening(
    onResult: (text: string) => void,
    onError: (err: string) => void
  ) {
    if (this.isListeningState) return;

    if (!this.recognition) {
      onError('Przeglądarka nie obsługuje SpeechRecognition. Wpisz polecenie tekstowo.');
      return;
    }

    try {
      this.setListening(true);

      // Start Microphone stream for neon visualizer
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        const source = this.audioContext.createMediaStreamSource(this.mediaStream);
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = 64;
        source.connect(this.analyser);

        const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        const updateLevel = () => {
          if (!this.analyser || !this.isListeningState) return;
          this.analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          // Scale to 0.1 - 10.0 range matching original Android RMS
          const normalized = Math.max(0.2, (avg / 255) * 8);
          this.setRms(normalized);
          this.animFrameId = requestAnimationFrame(updateLevel);
        };
        updateLevel();
      } catch {
        // Fallback simulated RMS oscillation
        let phase = 0;
        const interval = setInterval(() => {
          if (!this.isListeningState) {
            clearInterval(interval);
            return;
          }
          phase += 0.2;
          this.setRms(1.5 + Math.sin(phase) * 1.2 + Math.random() * 0.5);
        }, 100);
      }

      this.recognition.onresult = (event: any) => {
        const text = event.results[0][0].transcript;
        this.stopAudioAnalysis();
        this.setListening(false);
        onResult(text);
      };

      this.recognition.onerror = (event: any) => {
        this.stopAudioAnalysis();
        this.setListening(false);
        onError(`Błąd rozpoznawania mowy: ${event.error || 'Nieznany'}`);
      };

      this.recognition.onend = () => {
        this.stopAudioAnalysis();
        this.setListening(false);
      };

      this.recognition.start();
    } catch (e: any) {
      this.stopAudioAnalysis();
      this.setListening(false);
      onError(e.message || 'Błąd uruchamiania mikrofonu');
    }
  }

  stopListening() {
    if (this.recognition && this.isListeningState) {
      try {
        this.recognition.stop();
      } catch {
        // Ignore
      }
    }
    this.stopAudioAnalysis();
    this.setListening(false);
  }

  private stopAudioAnalysis() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
    this.setRms(0);
  }
}

export const speechRecognizerHelper = new SpeechRecognizerHelper();
