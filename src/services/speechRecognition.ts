// Speech Recognition & Real-time Microphone Audio Level helper

export interface SpeechHelperListeners {
  onListeningChange?: (isListening: boolean) => void;
  onRmsLevelChange?: (level: number) => void;
}

export interface StartListeningConfig {
  continuous?: boolean;
  onInterimResult?: (interimText: string) => void;
  onFinalResult: (text: string) => void;
  onError?: (err: string) => void;
  onEnd?: () => void;
}

class SpeechRecognizerHelper {
  private isListeningState: boolean = false;
  private rmsLevelState: number = 0;
  private listeners: SpeechHelperListeners = {};

  private recognitionInstance: any = null;
  private animInterval: any = null;
  private isExplicitlyStopped: boolean = false;

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

  private startRmsSimulation() {
    this.stopRmsSimulation();
    let phase = 0;
    this.animInterval = setInterval(() => {
      if (!this.isListeningState) {
        this.stopRmsSimulation();
        return;
      }
      phase += 0.25;
      // Gentle pulsing matching voice wave
      const level = Math.max(0.3, 1.8 + Math.sin(phase) * 1.5 + (Math.random() - 0.5) * 0.8);
      this.setRms(level);
    }, 80);
  }

  private stopRmsSimulation() {
    if (this.animInterval) {
      clearInterval(this.animInterval);
      this.animInterval = null;
    }
    this.setRms(0);
  }

  /**
   * Starts speech recognition with either single-shot or continuous mode
   */
  startListening(
    configOrResult: StartListeningConfig | ((text: string) => void),
    onErrorFallback?: (err: string) => void
  ) {
    // If already active, stop previous cleanly first
    if (this.isListeningState) {
      this.stopListening();
    }

    const config: StartListeningConfig =
      typeof configOrResult === 'function'
        ? {
            continuous: false,
            onFinalResult: configOrResult,
            onError: onErrorFallback
          }
        : configOrResult;

    const win = typeof window !== 'undefined' ? (window as any) : null;
    if (!win) return;

    const SpeechRecognitionClass = win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      config.onError?.('Twoja przeglądarka nie obsługuje Web Speech API. Wpisz polecenie tekstowo.');
      return;
    }

    try {
      this.isExplicitlyStopped = false;
      const recog = new SpeechRecognitionClass();
      this.recognitionInstance = recog;

      recog.continuous = !!config.continuous;
      recog.interimResults = true;
      recog.lang = 'pl-PL';
      recog.maxAlternatives = 1;

      let finalAccumulated = '';

      recog.onstart = () => {
        this.setListening(true);
        this.startRmsSimulation();
      };

      recog.onresult = (event: any) => {
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const transcript = item[0].transcript;
          if (item.isFinal) {
            finalAccumulated += (finalAccumulated ? ' ' : '') + transcript;
          } else {
            interimText += transcript;
          }
        }

        if (interimText && config.onInterimResult) {
          config.onInterimResult(interimText.trim());
        }

        if (finalAccumulated) {
          const textToSend = finalAccumulated.trim();
          finalAccumulated = '';
          config.onFinalResult(textToSend);
          if (!config.continuous) {
            this.stopListening();
          }
        }
      };

      recog.onerror = (event: any) => {
        const err = event.error || 'unknown';

        // Benign non-fatal errors in Web Speech API
        if (err === 'no-speech' || err === 'aborted') {
          // If in continuous mode and not explicitly stopped, do not treat as fatal error
          return;
        }

        this.stopRmsSimulation();
        this.setListening(false);

        if (err === 'not-allowed') {
          config.onError?.('Dostęp do mikrofonu został zablokowany w przeglądarce.');
        } else {
          config.onError?.(`Rozpoznawanie mowy: ${err}`);
        }
      };

      recog.onend = () => {
        // If continuous mode and not explicitly stopped by user, attempt clean restart
        if (config.continuous && !this.isExplicitlyStopped && this.recognitionInstance === recog) {
          try {
            recog.start();
            return;
          } catch {
            // If restart fails, close cleanly
          }
        }

        this.stopRmsSimulation();
        this.setListening(false);
        config.onEnd?.();
      };

      recog.start();
    } catch (e: any) {
      this.stopRmsSimulation();
      this.setListening(false);
      // Avoid alerting on InvalidStateError if transitioning
      if (e?.name !== 'InvalidStateError') {
        config.onError?.(e.message || 'Nie można uruchomić mikrofonu.');
      }
    }
  }

  stopListening() {
    this.isExplicitlyStopped = true;
    if (this.recognitionInstance) {
      try {
        this.recognitionInstance.abort?.();
      } catch {
        // Ignore
      }
      try {
        this.recognitionInstance.stop?.();
      } catch {
        // Ignore
      }
      this.recognitionInstance = null;
    }
    this.stopRmsSimulation();
    this.setListening(false);
  }
}

export const speechRecognizerHelper = new SpeechRecognizerHelper();
