import { HardwareState } from '../types';

export type TriggerListener = (triggerType: string) => void;

class HardwareManager {
  private state: HardwareState = {
    batteryPercent: 88,
    isCharging: false,
    isTorchOn: false,
    isBluetoothEnabled: true,
    isAccessibilityActive: true,
    isNotificationListenerActive: true
  };

  private listeners: Set<(state: HardwareState) => void> = new Set();
  private triggerListeners: Set<TriggerListener> = new Set();
  private torchMediaTrack: MediaStreamTrack | null = null;
  private currentVolume: number = 65;

  constructor() {
    this.initBattery();
  }

  private async initBattery() {
    try {
      // @ts-expect-error - Battery API typing
      if (typeof navigator !== 'undefined' && navigator.getBattery) {
        // @ts-expect-error - Battery API typing
        const battery = await navigator.getBattery();
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
      // Fallback to internal state
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
    const copy = { ...this.state };
    this.listeners.forEach((fn) => fn(copy));
  }

  getState(): HardwareState {
    return { ...this.state };
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
      // If hardware camera flash is not accessible, simulation handles state
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
    return this.state.isAccessibilityActive;
  }

  toggleNotificationListener(): boolean {
    this.state.isNotificationListenerActive = !this.state.isNotificationListenerActive;
    this.notify();
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

  setTimer(seconds: number, label: string = 'CogniAgent Timer'): boolean {
    console.log(`Timer set for ${seconds}s with label: ${label}`);
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
        audio.play().catch(() => {});
      }
    }, seconds * 1000);
    return true;
  }

  setAlarm(hour: number, minute: number, label: string = 'CogniAgent Alarm'): boolean {
    console.log(`Alarm scheduled for ${hour}:${minute} (${label})`);
    return true;
  }
}

export const hardwareManager = new HardwareManager();
