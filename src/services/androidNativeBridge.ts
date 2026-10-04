/**
 * Android Native Bridge service for deep links, system intent dispatches,
 * and genuine hardware permission acquisition.
 */

export interface SystemPermissionsState {
  microphone: boolean;
  camera: boolean;
  ttsTested: boolean;
  accessibilityVisited: boolean;
  defaultAssistVisited: boolean;
  overlayVisited: boolean;
  notificationsVisited: boolean;
}

const STORAGE_KEY = 'cogni_system_permissions_v2';

class AndroidNativeBridge {
  private permissions: SystemPermissionsState = {
    microphone: false,
    camera: false,
    ttsTested: false,
    accessibilityVisited: false,
    defaultAssistVisited: false,
    overlayVisited: false,
    notificationsVisited: false
  };

  private listeners: Set<(state: SystemPermissionsState) => void> = new Set();

  constructor() {
    this.loadState();
    this.checkInitialPermissions();
  }

  private loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.permissions = { ...this.permissions, ...JSON.parse(saved) };
      }
    } catch {
      // Ignore
    }
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.permissions));
      this.listeners.forEach((fn) => fn({ ...this.permissions }));
    } catch {
      // Ignore
    }
  }

  getPermissions(): SystemPermissionsState {
    return { ...this.permissions };
  }

  subscribe(listener: (state: SystemPermissionsState) => void): () => void {
    this.listeners.add(listener);
    listener({ ...this.permissions });
    return () => this.listeners.delete(listener);
  }

  async checkInitialPermissions() {
    if (typeof navigator !== 'undefined' && navigator.permissions && navigator.permissions.query) {
      try {
        const micStatus = await navigator.permissions.query({ name: 'microphone' as any });
        if (micStatus.state === 'granted') {
          this.permissions.microphone = true;
        }
      } catch {
        // Query might not be supported for mic on some WebViews
      }

      try {
        const camStatus = await navigator.permissions.query({ name: 'camera' as any });
        if (camStatus.state === 'granted') {
          this.permissions.camera = true;
        }
      } catch {
        // Query might not be supported for camera on some WebViews
      }

      this.saveState();
    }
  }

  /**
   * Prompts the native Android OS Microphone permission dialog (RECORD_AUDIO)
   */
  async requestMicrophonePermission(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not available');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Release tracks immediately
      stream.getTracks().forEach((track) => track.stop());

      this.permissions.microphone = true;
      this.saveState();
      return true;
    } catch (err) {
      console.warn('Microphone permission denied or failed:', err);
      this.permissions.microphone = false;
      this.saveState();
      return false;
    }
  }

  /**
   * Prompts the native Android OS Camera permission dialog (CAMERA)
   */
  async requestCameraPermission(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('MediaDevices API not available');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      // Release tracks immediately
      stream.getTracks().forEach((track) => track.stop());

      this.permissions.camera = true;
      this.saveState();
      return true;
    } catch (err) {
      console.warn('Camera permission denied or failed:', err);
      this.permissions.camera = false;
      this.saveState();
      return false;
    }
  }

  markTtsTested() {
    this.permissions.ttsTested = true;
    this.saveState();
  }

  /**
   * Launches Android System Accessibility Settings
   */
  openAccessibilitySettings() {
    this.permissions.accessibilityVisited = true;
    this.saveState();
    this.launchIntent('android.settings.ACCESSIBILITY_SETTINGS');
  }

  /**
   * Launches Android System Default Digital Assistant & Voice Input settings
   */
  openDefaultAssistantSettings() {
    this.permissions.defaultAssistVisited = true;
    this.saveState();
    this.launchIntent('android.settings.VOICE_INPUT_SETTINGS');
  }

  /**
   * Launches Android System Notification Listener Access settings
   */
  openNotificationListenerSettings() {
    this.permissions.notificationsVisited = true;
    this.saveState();
    this.launchIntent('android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS');
  }

  /**
   * Launches Android System Draw Over Other Apps (Overlay) settings for this package
   */
  openOverlayPermissionSettings() {
    this.permissions.overlayVisited = true;
    this.saveState();
    this.launchIntent('android.settings.action.MANAGE_OVERLAY_PERMISSION;package=com.cogniagent.app');
  }

  /**
   * Launches Android System App Info / Permissions details screen
   */
  openAppDetailsSettings() {
    this.launchIntent('android.settings.APPLICATION_DETAILS_SETTINGS;package=com.cogniagent.app');
  }

  /**
   * Opens Huawei Phone Dialler with phone number
   */
  makePhoneCall(phoneNumber: string) {
    const cleanNumber = phoneNumber.replace(/[^0-9+*#]/g, '');
    if (!cleanNumber) return;
    window.location.href = `tel:${cleanNumber}`;
  }

  /**
   * Opens Android SMS Messenger
   */
  sendSms(phoneNumber: string, message = '') {
    const cleanNumber = phoneNumber.replace(/[^0-9+*#]/g, '');
    const encodedMsg = encodeURIComponent(message);
    window.location.href = `sms:${cleanNumber}?body=${encodedMsg}`;
  }

  private launchIntent(action: string) {
    try {
      const intentUrl = `intent:#Intent;action=${action};end`;
      window.location.href = intentUrl;
    } catch (e) {
      console.warn('Intent launch failed, attempting fallback', e);
    }
  }
}

export const androidNativeBridge = new AndroidNativeBridge();
