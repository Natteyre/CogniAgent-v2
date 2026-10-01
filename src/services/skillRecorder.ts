import { RoutineAction, ActionType } from '../types';
import { soundAndHaptics } from './soundAndHaptics';

type RecorderListener = (isRecording: boolean, actions: RoutineAction[], elapsedTimeSec: number) => void;

class SkillRecorderService {
  private isRecording: boolean = false;
  private recordedActions: RoutineAction[] = [];
  private startTime: number = 0;
  private lastActionTime: number = 0;
  private timerInterval: any = null;
  private listeners: Set<RecorderListener> = new Set();

  startRecording() {
    this.isRecording = true;
    this.recordedActions = [];
    this.startTime = Date.now();
    this.lastActionTime = Date.now();

    soundAndHaptics.playWakeWordChime();
    soundAndHaptics.triggerHaptic([50, 50, 50]);

    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.notify();
    }, 500);

    this.notify();
  }

  stopRecording(): RoutineAction[] {
    this.isRecording = false;
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    soundAndHaptics.playSuccessChime();
    soundAndHaptics.triggerHaptic(40);

    const result = [...this.recordedActions];
    this.notify();
    return result;
  }

  recordAction(type: ActionType, parameter1: string, parameter2?: string, autoDelay: boolean = true) {
    if (!this.isRecording) return;

    const now = Date.now();
    const elapsedSinceLast = now - this.lastActionTime;

    // Automatically insert reasonable delay between user interactions (e.g. 800ms - 2500ms)
    if (autoDelay && this.recordedActions.length > 0 && elapsedSinceLast > 300) {
      const delayMs = Math.min(3000, Math.max(500, elapsedSinceLast));
      this.recordedActions.push({
        type: 'DELAY',
        parameter1: delayMs.toString()
      });
    }

    this.recordedActions.push({
      type,
      parameter1,
      parameter2
    });

    this.lastActionTime = now;
    soundAndHaptics.triggerHaptic(20);
    this.notify();
  }

  removeAction(index: number) {
    if (index >= 0 && index < this.recordedActions.length) {
      this.recordedActions.splice(index, 1);
      this.notify();
    }
  }

  clear() {
    this.recordedActions = [];
    this.notify();
  }

  getIsRecording(): boolean {
    return this.isRecording;
  }

  getRecordedActions(): RoutineAction[] {
    return [...this.recordedActions];
  }

  getElapsedTime(): number {
    if (!this.isRecording || !this.startTime) return 0;
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  subscribe(listener: RecorderListener): () => void {
    this.listeners.add(listener);
    listener(this.isRecording, this.recordedActions, this.getElapsedTime());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const elapsed = this.getElapsedTime();
    this.listeners.forEach((l) => l(this.isRecording, this.recordedActions, elapsed));
  }
}

export const skillRecorder = new SkillRecorderService();
