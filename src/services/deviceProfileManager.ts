import { DeviceProfile, AgentServicesConfig, DeviceManufacturer } from '../types';
import { storage } from './storage';
import { soundAndHaptics } from './soundAndHaptics';

export const DEVICE_PRESETS: Record<string, DeviceProfile> = {
  universal: {
    id: 'universal',
    manufacturer: 'universal',
    modelName: 'Uniwersalny Smartfon Android',
    chipset: 'ARM64 Cortex (Uniwersalny procesor)',
    androidVersion: 'Android 10 - 15',
    ramGB: 6,
    npuAcceleration: 'AUTO_NNAPI',
    batteryOptimizationSystemName: 'Android AOSP Doze Mode & Battery Saver',
    notes: 'Standardowa konfiguracja kompatybilna z dowolnym telefonem (Sony, Motorola, Realme, Asus, OnePlus itp.)'
  },
  huawei_p30_pro: {
    id: 'huawei_p30_pro',
    manufacturer: 'huawei',
    modelName: 'Huawei P30 Pro (VOG-L29)',
    chipset: 'HiSilicon Kirin 980 (Dual-NPU)',
    androidVersion: 'EMUI 10 (Android 10)',
    ramGB: 8,
    npuAcceleration: 'HIAI_NPU',
    batteryOptimizationSystemName: 'EMUI PowerGenie Guard & Ręczny Autostart',
    notes: 'Zoptymalizowano pod podwójny procesor neuronowy HiAI oraz architekturę EMUI 10'
  },
  samsung_s23_s24: {
    id: 'samsung_s23_s24',
    manufacturer: 'samsung',
    modelName: 'Samsung Galaxy S23 / S24',
    chipset: 'Snapdragon 8 Gen 2/3 / Exynos 2400',
    androidVersion: 'One UI 6.1 (Android 14/15)',
    ramGB: 8,
    npuAcceleration: 'QNN_HEXAGON',
    batteryOptimizationSystemName: 'One UI „Nigdy nie usypiaj aplikacji” (Never Sleeping Apps)',
    notes: 'Akceleracja QNN / Hexagon Direct oraz silnik Samsung Eden'
  },
  pixel_7_8_9: {
    id: 'pixel_7_8_9',
    manufacturer: 'pixel',
    modelName: 'Google Pixel 7 / 8 / 9',
    chipset: 'Google Tensor G2 / G3 / G4',
    androidVersion: 'Czysty Android 14 / 15',
    ramGB: 12,
    npuAcceleration: 'EDGETPU',
    batteryOptimizationSystemName: 'Pixel Adaptive Battery Exemption',
    notes: 'Zintegrowany koprocesor Google EdgeTPU dla modeli SLM/LLM Gemini Nano'
  },
  xiaomi_hyperos: {
    id: 'xiaomi_hyperos',
    manufacturer: 'xiaomi',
    modelName: 'Xiaomi / Redmi / POCO',
    chipset: 'Qualcomm Snapdragon / MediaTek Dimensity',
    androidVersion: 'Xiaomi HyperOS / MIUI 14',
    ramGB: 8,
    npuAcceleration: 'GPU_VULKAN',
    batteryOptimizationSystemName: 'HyperOS „Bez ograniczeń oszczędzania energii” + Autostart',
    notes: 'Wymaga włączenia Autostartu oraz wyłączenia optymalizacji MIUI/HyperOS'
  },
  custom: {
    id: 'custom',
    manufacturer: 'custom',
    modelName: 'Własny model telefonu',
    chipset: 'Niestandardowy procesor / GPU',
    androidVersion: 'Android 10+',
    ramGB: 8,
    npuAcceleration: 'AUTO_NNAPI',
    batteryOptimizationSystemName: 'Niestandardowe zarządzanie energią',
    notes: 'Ręczna specyfikacja wprowadzona przez użytkownika'
  }
};

const DEFAULT_AGENT_SERVICES: AgentServicesConfig = {
  floatingBubbleEnabled: true,
  accessibilityServiceEnabled: true,
  screenCaptureEnabled: true,
  screenCaptureQuality: '1080p',
  backgroundHotwordEnabled: true,
  hotwordSensitivity: 'medium',
  batteryExemptionGranted: true,
  notificationListenerEnabled: true,
  bootAutostartEnabled: true,
  hapticFeedbackOnAction: true
};

const STORAGE_KEY_DEVICE = 'cogni_device_profile_v2';
const STORAGE_KEY_SERVICES = 'cogni_agent_services_config_v2';

class DeviceProfileManager {
  private activeProfile: DeviceProfile;
  private servicesConfig: AgentServicesConfig;
  private listeners: Set<(profile: DeviceProfile, services: AgentServicesConfig) => void> = new Set();

  constructor() {
    this.activeProfile = this.loadDeviceProfile();
    this.servicesConfig = this.loadServicesConfig();
  }

  private loadDeviceProfile(): DeviceProfile {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DEVICE);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load stored device profile, using universal default', e);
    }
    // Default to universal profile for broad compatibility
    return DEVICE_PRESETS.universal;
  }

  private loadServicesConfig(): AgentServicesConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SERVICES);
      if (stored) {
        return { ...DEFAULT_AGENT_SERVICES, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to load services config, using defaults', e);
    }
    return DEFAULT_AGENT_SERVICES;
  }

  getActiveProfile(): DeviceProfile {
    return this.activeProfile;
  }

  setActiveProfile(profileOrPresetKey: string | DeviceProfile) {
    if (typeof profileOrPresetKey === 'string') {
      const preset = DEVICE_PRESETS[profileOrPresetKey] || DEVICE_PRESETS.universal;
      this.activeProfile = { ...preset };
    } else {
      this.activeProfile = { ...profileOrPresetKey };
    }

    try {
      localStorage.setItem(STORAGE_KEY_DEVICE, JSON.stringify(this.activeProfile));
    } catch (e) {
      console.warn('Failed to persist device profile', e);
    }

    soundAndHaptics.playSuccessChime();
    soundAndHaptics.triggerHaptic(30);
    this.notify();
  }

  getServicesConfig(): AgentServicesConfig {
    return this.servicesConfig;
  }

  updateServicesConfig(patch: Partial<AgentServicesConfig>) {
    this.servicesConfig = {
      ...this.servicesConfig,
      ...patch
    };

    try {
      localStorage.setItem(STORAGE_KEY_SERVICES, JSON.stringify(this.servicesConfig));
    } catch (e) {
      console.warn('Failed to persist agent services config', e);
    }

    soundAndHaptics.triggerHaptic(20);
    this.notify();
  }

  subscribe(listener: (profile: DeviceProfile, services: AgentServicesConfig) => void): () => void {
    this.listeners.add(listener);
    listener(this.activeProfile, this.servicesConfig);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l(this.activeProfile, this.servicesConfig));
  }
}

export const deviceProfileManager = new DeviceProfileManager();
