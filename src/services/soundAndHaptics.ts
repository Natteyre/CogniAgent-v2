import { storage } from './storage';

class SoundAndHapticsService {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  private isSoundEnabled(): boolean {
    const settings = storage.getSettings();
    return settings.soundEffectsEnabled !== false;
  }

  private isHapticEnabled(): boolean {
    const settings = storage.getSettings();
    return settings.hapticFeedbackEnabled !== false;
  }

  /**
   * Pleasant ascending dual-tone chime when "Hej Cogni" wake word is heard
   */
  playWakeWordChime() {
    if (!this.isSoundEnabled()) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // A5
      osc1.frequency.exponentialRampToValueAtTime(1318.51, now + 0.12); // E6

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1760, now + 0.05);

      osc1.connect(gain);
      osc2.connect(gain);

      osc1.start(now);
      osc2.start(now + 0.05);
      osc1.stop(now + 0.36);
      osc2.stop(now + 0.36);

      this.triggerHaptic([20, 30, 30]);
    } catch (e) {
      console.warn('Audio earcon error:', e);
    }
  }

  /**
   * Warm harmony chord when a hardware command or routine completes
   */
  playSuccessChime() {
    if (!this.isSoundEnabled()) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99]; // C5, E5, G5 major triad

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        gain.connect(ctx.destination);
        const startTime = now + idx * 0.06;
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.12, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);
        osc.connect(gain);

        osc.start(startTime);
        osc.stop(startTime + 0.42);
      });

      this.triggerHaptic(25);
    } catch (e) {
      console.warn('Audio earcon error:', e);
    }
  }

  /**
   * Clean notification ping for incoming SMS / WhatsApp / System alerts
   */
  playNotificationPing() {
    if (!this.isSoundEnabled()) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1046.5, now); // C6
      osc.frequency.exponentialRampToValueAtTime(1318.5, now + 0.08); // E6

      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.3);

      this.triggerHaptic([35, 40, 20]);
    } catch (e) {
      console.warn('Audio earcon error:', e);
    }
  }

  /**
   * Pulsing alert alarm when a countdown timer reaches 0
   */
  playTimerAlarm() {
    if (!this.isSoundEnabled()) return;
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // 3 pulses
      [0, 0.2, 0.4].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        gain.connect(ctx.destination);
        const startTime = now + offset;
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.exponentialRampToValueAtTime(0.2, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.14);

        osc.type = 'square';
        osc.frequency.setValueAtTime(987.77, startTime); // B5

        osc.connect(gain);
        osc.start(startTime);
        osc.stop(startTime + 0.15);
      });

      this.triggerHaptic([80, 50, 80, 50, 100]);
    } catch (e) {
      console.warn('Timer earcon error:', e);
    }
  }

  /**
   * Subtle haptic feedback wrapper
   */
  triggerHaptic(pattern: number | number[] = 25) {
    if (!this.isHapticEnabled()) return;
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(pattern);
      }
    } catch {
      // Haptics not allowed or unsupported in current environment
    }
  }
}

export const soundAndHaptics = new SoundAndHapticsService();
