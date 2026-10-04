import { HardwareState, ActiveTimer, HuaweiOptimizationState } from '../types';
import { androidNativeBridge } from './androidNativeBridge';

export type TriggerListener = (triggerType: string) => void;

class HardwareManager {
  private state: HardwareState = {
    batteryPercent: 88,
    isCharging: false,
    isTorchOn: false,
    isBluetoothEnabled: true,
    isAccessibilityActive: false,
    isNotificationListenerActive: false,
    brightnessPercent: 100,
    isDndActive: false,
    activeTimers: [],
    huaweiOptimization: {
      autostartEnabled: false,
      batteryOptimizationIgnored: false,
      powerGenieGuarded: false,
      lockScreenKeepAlive: false
    }
  };

  private listeners: Set<(state: HardwareState) => void> = new Set();
  private triggerListeners: Set<TriggerListener> = new Set();
  private torchMediaTrack: MediaStreamTrack | null = null;
  private currentVolume: number = 65;
  private timerInterval: any = null;

  constructor() {
    this.initBattery();
    this.startTimerTicker();
    this.loadPersistedHwSettings();
  }

  private loadPersistedHwSettings() {
    try {
      const saved = localStorage.getItem('cogni_hw_settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.brightnessPercent !== undefined) this.state.brightnessPercent = parsed.brightnessPercent;
        if (parsed.isDndActive !== undefined) this.state.isDndActive = parsed.isDndActive;
        if (parsed.huaweiOptimization) this.state.huaweiOptimization = parsed.huaweiOptimization;
      }
    } catch {
      // Ignore
    }
  }

  private savePersistedHwSettings() {
    try {
      localStorage.setItem(
        'cogni_hw_settings',
        JSON.stringify({
          brightnessPercent: this.state.brightnessPercent,
          isDndActive: this.state.isDndActive,
          huaweiOptimization: this.state.huaweiOptimization
        })
      );
    } catch {
      // Ignore
    }
  }

  private async initBattery() {
    try {
      if (typeof navigator !== 'undefined' && (navigator as any).getBattery) {
        const battery = await (navigator as any).getBattery();
        this.state.batteryPercent = Math.round(battery.level * 100);
        this.state.isCharging = battery.charging;
        this.notify();

        battery.addEventListener('chargingchange', () => {
          this.state.isCharging = battery.charging;
          this.notify();
          this.dispatchTrigger(
            battery.charging ? 'ACTION_POWER_CONNECTED' : 'ACTION_POWER_DISCONNECTED'
          );
        });

        battery.addEventListener('levelchange', () => {
          this.state.batteryPercent = Math.round(battery.level * 100);
          this.notify();
        });
      }
    } catch {
      // Fallback
    }
  }

  private startTimerTicker() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      if (this.state.activeTimers.length === 0) return;

      let changed = false;
      const updatedTimers: ActiveTimer[] = [];

      for (const timer of this.state.activeTimers) {
        if (timer.remainingSeconds <= 1) {
          changed = true;
          this.playAlarmSound();
          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            new Notification('CogniAgent Minutnik', {
              body: `Czas upłynął dla minutnika: ${timer.label}!`,
              icon: '/favicon.ico'
            });
          }
        } else {
          updatedTimers.push({
            ...timer,
            remainingSeconds: timer.remainingSeconds - 1
          });
          changed = true;
        }
      }

      if (changed) {
        this.state.activeTimers = updatedTimers;
        this.notify();
      }
    }, 1000);
  }

  private playAlarmSound() {
    try {
      const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
      audio.volume = Math.max(0.2, this.currentVolume / 100);
      audio.play().catch(() => {});
    } catch {
      // Ignore
    }
  }

  subscribe(listener: (state: HardwareState) => void): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeTriggers(listener: TriggerListener): () => void {
    this.triggerListeners.add(listener);
    return () => {
      this.triggerListeners.delete(listener);
    };
  }

  private dispatchTrigger(triggerType: string) {
    this.triggerListeners.forEach((listener) => {
      try {
        listener(triggerType);
      } catch (e) {
        console.error('Trigger listener error:', e);
      }
    });
  }

  private notify() {
    const copy = { ...this.state, activeTimers: [...this.state.activeTimers] };
    this.listeners.forEach((fn) => fn(copy));
    this.savePersistedHwSettings();
  }

  getState(): HardwareState {
    return { ...this.state, activeTimers: [...this.state.activeTimers] };
  }

  async setTorch(enable: boolean): Promise<boolean> {
    this.state.isTorchOn = enable;
    this.notify();

    try {
      if (enable && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            advanced: [{ torch: true }]
          } as any
        });
        this.torchMediaTrack = stream.getVideoTracks()[0];
        await (this.torchMediaTrack as any).applyConstraints({ advanced: [{ torch: true }] });
      } else if (!enable && this.torchMediaTrack) {
        this.torchMediaTrack.stop();
        this.torchMediaTrack = null;
      }
    } catch {
      // Simulation mode
    }

    return true;
  }

  toggleTorch(): Promise<boolean> {
    return this.setTorch(!this.state.isTorchOn);
  }

  setBluetooth(enable: boolean): boolean {
    this.state.isBluetoothEnabled = enable;
    this.notify();
    return true;
  }

  toggleBluetooth(): boolean {
    return this.setBluetooth(!this.state.isBluetoothEnabled);
  }

  setCharging(charging: boolean) {
    this.state.isCharging = charging;
    this.notify();
    this.dispatchTrigger(charging ? 'ACTION_POWER_CONNECTED' : 'ACTION_POWER_DISCONNECTED');
  }

  setBatteryPercent(percent: number) {
    this.state.batteryPercent = Math.max(0, Math.min(100, percent));
    this.notify();
  }

  toggleAccessibilityService(): boolean {
    this.state.isAccessibilityActive = !this.state.isAccessibilityActive;
    this.notify();
    // Launch native Android Accessibility Settings screen
    androidNativeBridge.openAccessibilitySettings();
    return this.state.isAccessibilityActive;
  }

  toggleNotificationListener(): boolean {
    this.state.isNotificationListenerActive = !this.state.isNotificationListenerActive;
    this.notify();
    // Launch native Android Notification Access Settings screen
    androidNativeBridge.openNotificationListenerSettings();
    return this.state.isNotificationListenerActive;
  }

  getBatteryMetrics(): [number, boolean] {
    return [this.state.batteryPercent, this.state.isCharging];
  }

  setDeviceVolume(percent: number): boolean {
    this.currentVolume = Math.max(0, Math.min(100, percent));
    return true;
  }

  getDeviceVolume(): number {
    return this.currentVolume;
  }

  // Brightness Control
  setBrightness(percent: number): boolean {
    this.state.brightnessPercent = Math.max(10, Math.min(100, percent));
    this.notify();
    return true;
  }

  // DND Mode
  setDndMode(enabled: boolean): boolean {
    this.state.isDndActive = enabled;
    this.notify();
    return true;
  }

  toggleDndMode(): boolean {
    return this.setDndMode(!this.state.isDndActive);
  }

  // Timers
  setTimer(seconds: number, label: string = 'CogniAgent Minutnik'): boolean {
    const newTimer: ActiveTimer = {
      id: `timer_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      label: label || 'CogniAgent Minutnik',
      totalSeconds: seconds,
      remainingSeconds: seconds,
      createdAt: Date.now()
    };
    this.state.activeTimers = [...this.state.activeTimers, newTimer];
    this.notify();
    return true;
  }

  cancelTimer(id: string) {
    this.state.activeTimers = this.state.activeTimers.filter((t) => t.id !== id);
    this.notify();
  }

  // Alarms
  setAlarm(hour: number, minute: number, label: string = 'CogniAgent Budzik'): boolean {
    const now = new Date();
    const target = new Date();
    target.setHours(hour, minute, 0, 0);
    if (target.getTime() <= now.getTime()) {
      target.setDate(target.getDate() + 1);
    }
    const diffSeconds = Math.max(1, Math.round((target.getTime() - now.getTime()) / 1000));
    this.setTimer(diffSeconds, `${label} (${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')})`);
    return true;
  }

  // Huawei / EMUI 10 Optimization Wizard
  updateHuaweiOptimization(partial: Partial<HuaweiOptimizationState>) {
    this.state.huaweiOptimization = {
      ...this.state.huaweiOptimization,
      ...partial
    };
    this.notify();
  }

  runFullHuaweiOptimization() {
    this.state.huaweiOptimization = {
      autostartEnabled: true,
      batteryOptimizationIgnored: true,
      powerGenieGuarded: true,
      lockScreenKeepAlive: true
    };
    this.notify();
  }
}

export const hardwareManager = new HardwareManager();
