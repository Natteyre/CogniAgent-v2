import { RoutineTriggerEntity, SkillEntity } from '../types';
import { storage } from './storage';
import { routineExecutor } from './routineExecutor';
import { soundAndHaptics } from './soundAndHaptics';
import { ttsManager } from './ttsManager';

class TriggerScheduler {
  private timerId: number | null = null;
  private lastTriggeredMinute: string = '';
  private currentGeofence: string = 'Poza domem';
  private connectedBluetoothDevice: string | null = null;
  private listeners: ((currentGeofence: string, btDevice: string | null) => void)[] = [];

  constructor() {
    this.startScheduler();
  }

  private startScheduler() {
    if (typeof window === 'undefined') return;
    this.timerId = window.setInterval(() => {
      this.checkTimeTriggers();
    }, 10000); // Check every 10 seconds
  }

  stopScheduler() {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  subscribe(listener: (currentGeofence: string, btDevice: string | null) => void): () => void {
    this.listeners.push(listener);
    listener(this.currentGeofence, this.connectedBluetoothDevice);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.currentGeofence, this.connectedBluetoothDevice));
  }

  getGeofenceState(): string {
    return this.currentGeofence;
  }

  getBluetoothDeviceState(): string | null {
    return this.connectedBluetoothDevice;
  }

  /**
   * Evaluates active time triggers every minute
   */
  private checkTimeTriggers() {
    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    const currentDay = dayNames[now.getDay()];

    if (this.lastTriggeredMinute === currentHHMM) {
      return; // Already checked this minute
    }

    const triggers = storage.getTriggers();
    const activeTimeTriggers = triggers.filter(
      (t) => t.enabled && t.triggerType === 'TIME_SCHEDULE' && t.timeSchedule === currentHHMM
    );

    if (activeTimeTriggers.length > 0) {
      this.lastTriggeredMinute = currentHHMM;

      activeTimeTriggers.forEach((trigger) => {
        // Check days of week if specified
        if (trigger.daysOfWeek && trigger.daysOfWeek.length > 0) {
          if (!trigger.daysOfWeek.includes(currentDay) && !trigger.daysOfWeek.includes('ALL')) {
            return;
          }
        }

        this.fireSkillByTrigger(trigger, `Harmonogram czasowy (${currentHHMM})`);
      });
    }
  }

  /**
   * Fires the associated skill for a trigger
   */
  fireSkillByTrigger(trigger: RoutineTriggerEntity, contextReason: string) {
    const allSkills = storage.getSkills();
    const skill = allSkills.find((s) => s.name === trigger.associatedSkillName);

    if (skill) {
      console.log(`[TriggerScheduler] Odpalanie rutyny "${skill.name}" z powodu: ${contextReason}`);
      soundAndHaptics.playSuccessChime();
      ttsManager.speak(`Wyzwalacz: ${contextReason}. Uruchamiam rutynę ${skill.name}.`);
      routineExecutor.executeActionsJson(skill.actionsJson);
    }
  }

  /**
   * Simulates entering or exiting a geofence zone
   */
  simulateGeofenceEvent(location: string, event: 'ENTER' | 'EXIT') {
    this.currentGeofence = event === 'ENTER' ? location : 'Poza strefą';
    this.notify();

    const triggerType = event === 'ENTER' ? 'GEOFENCE_ENTER' : 'GEOFENCE_EXIT';
    const triggers = storage.getTriggers();
    const matched = triggers.filter(
      (t) =>
        t.enabled &&
        t.triggerType === triggerType &&
        (!t.geofenceLocation || t.geofenceLocation.toLowerCase() === location.toLowerCase())
    );

    matched.forEach((t) => {
      this.fireSkillByTrigger(t, `Geofence: ${event === 'ENTER' ? 'Wejście do' : 'Wyjście z'} ${location}`);
    });
  }

  /**
   * Simulates connecting or disconnecting a Bluetooth peripheral
   */
  simulateBluetoothDeviceEvent(deviceName: string, connected: boolean) {
    this.connectedBluetoothDevice = connected ? deviceName : null;
    this.notify();

    const triggerType = connected ? 'BLUETOOTH_CONNECTED' : 'BLUETOOTH_DISCONNECTED';
    const triggers = storage.getTriggers();
    const matched = triggers.filter(
      (t) =>
        t.enabled &&
        t.triggerType === triggerType &&
        (!t.bluetoothDeviceName || t.bluetoothDeviceName.toLowerCase().includes(deviceName.toLowerCase()))
    );

    matched.forEach((t) => {
      this.fireSkillByTrigger(t, `Bluetooth: ${connected ? 'Połączono' : 'Rozłączono'} ${deviceName}`);
    });
  }
}

export const triggerScheduler = new TriggerScheduler();
