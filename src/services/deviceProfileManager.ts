import { DeviceProfile, AgentServicesConfig, DeviceManufacturer, HardwareAccelerationBackend } from '../types';
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

interface HardwareProbe {
  gpuRenderer: string;
  gpuVendor: string;
  deviceMemoryGB: number;
  cpuCores: number;
  userAgent: string;
  isAndroid: boolean;
  androidVersionStr: string;
  nativeBridgeAvailable: boolean;
}

class DeviceProfileManager {
  private activeProfile: DeviceProfile;
  private servicesConfig: AgentServicesConfig;
  private listeners: Set<(profile: DeviceProfile, services: AgentServicesConfig) => void> = new Set();

  constructor() {
    this.servicesConfig = this.loadServicesConfig();
    this.activeProfile = this.loadOrAutoDetectProfile();
  }

  /**
   * Probes the runtime hardware, WebGL unmasked GPU renderer, system memory,
   * CPU cores and User-Agent signatures.
   */
  public probeHardware(): HardwareProbe {
    let gpuRenderer = '';
    let gpuVendor = '';

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl && gl instanceof WebGLRenderingContext) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
          gpuVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
        }
      }
    } catch (e) {
      console.warn('WebGL hardware probe unmasked renderer unavailable', e);
    }

    const deviceMemoryGB = (navigator as any).deviceMemory || 6;
    const cpuCores = navigator.hardwareConcurrency || 8;
    const userAgent = navigator.userAgent || '';
    const isAndroid = /Android/i.test(userAgent);

    let androidVersionStr = 'Android 10+';
    const androidMatch = /Android\s+([0-9.]+)/i.exec(userAgent);
    if (androidMatch && androidMatch[1]) {
      androidVersionStr = `Android ${androidMatch[1]}`;
    }

    const nativeBridgeAvailable =
      typeof (window as any).AndroidDeviceBridge !== 'undefined' ||
      typeof (window as any).Android !== 'undefined';

    return {
      gpuRenderer,
      gpuVendor,
      deviceMemoryGB,
      cpuCores,
      userAgent,
      isAndroid,
      androidVersionStr,
      nativeBridgeAvailable
    };
  }

  /**
   * Intelligently analyzes hardware probes and generates an optimal DeviceProfile
   */
  public autoDetectDeviceProfile(): { profile: DeviceProfile; summary: string } {
    const probe = this.probeHardware();
    const ua = probe.userAgent.toUpperCase();
    const gpu = probe.gpuRenderer.toUpperCase();
    const ram = Math.max(4, Math.min(24, probe.deviceMemoryGB || 6));

    let detected: DeviceProfile;
    let summary = '';

    // 1. Check Native Android Bridge if present in native APK container
    const native = (window as any).AndroidDeviceBridge || (window as any).Android;
    if (native && typeof native.getModel === 'function') {
      try {
        const model = native.getModel() || 'Android Device';
        const brand = (native.getManufacturer() || 'universal').toLowerCase() as DeviceManufacturer;
        const chipset = native.getSocName() || 'ARM64 Octa-Core';
        const osVer = native.getAndroidVersion() || probe.androidVersionStr;
        const totalRam = native.getRamGB() || ram;

        let npu: HardwareAccelerationBackend = 'AUTO_NNAPI';
        if (chipset.toLowerCase().includes('kirin')) npu = 'HIAI_NPU';
        else if (chipset.toLowerCase().includes('snapdragon')) npu = 'QNN_HEXAGON';
        else if (chipset.toLowerCase().includes('tensor')) npu = 'EDGETPU';

        detected = {
          id: 'auto_native',
          manufacturer: brand,
          modelName: model,
          chipset,
          androidVersion: osVer,
          ramGB: totalRam,
          npuAcceleration: npu,
          batteryOptimizationSystemName: `${brand.toUpperCase()} System Battery Optimization`,
          notes: 'Wykryto bezpośrednio przez natywną magistralę Android Bridge',
          isAutoDetected: true,
          detectedHardwareInfo: `${model} • ${chipset} • ${totalRam}GB RAM`
        };
        summary = `Wykryto natywnie: ${model} (${chipset}, ${totalRam}GB RAM)`;
        return { profile: detected, summary };
      } catch (e) {
        console.warn('Native bridge inspection failed, using browser hardware probes', e);
      }
    }

    // 2. Probing Huawei / HiSilicon Kirin (e.g. P30 Pro, Mate 20, Kirin 980)
    if (
      ua.includes('VOG-L29') ||
      ua.includes('ELE-L29') ||
      ua.includes('LYA-L29') ||
      ua.includes('HUAWEI') ||
      ua.includes('HONOR') ||
      gpu.includes('MALI-G76') ||
      ua.includes('EMUI')
    ) {
      detected = {
        ...DEVICE_PRESETS.huawei_p30_pro,
        ramGB: ram >= 8 ? 8 : 6,
        androidVersion: probe.androidVersionStr.includes('Android') ? `${probe.androidVersionStr} (EMUI)` : 'EMUI 10',
        isAutoDetected: true,
        detectedHardwareInfo: `Huawei P30 Pro / Kirin 980 • GPU: ${probe.gpuRenderer || 'Mali-G76'} • ${ram}GB RAM`
      };
      summary = `Wykryto smartfon Huawei (Kirin 980 HiAI Dual-NPU, ${ram}GB RAM, GPU: ${probe.gpuRenderer || 'Mali-G76'})`;
    }
    // 3. Probing Samsung Galaxy (One UI, Snapdragon / Exynos, Xclipse)
    else if (
      ua.includes('SM-') ||
      ua.includes('SAMSUNG') ||
      gpu.includes('XCLIPSE') ||
      gpu.includes('ADRENO (TM) 740') ||
      gpu.includes('ADRENO (TM) 750')
    ) {
      detected = {
        ...DEVICE_PRESETS.samsung_s23_s24,
        ramGB: ram >= 8 ? ram : 8,
        androidVersion: probe.androidVersionStr,
        isAutoDetected: true,
        detectedHardwareInfo: `Samsung Galaxy • GPU: ${probe.gpuRenderer || 'Adreno/Xclipse'} • ${ram}GB RAM`
      };
      summary = `Wykryto smartfon Samsung Galaxy (Snapdragon/Exynos QNN NPU, ${ram}GB RAM)`;
    }
    // 4. Probing Google Pixel (Tensor, EdgeTPU)
    else if (ua.includes('PIXEL') || gpu.includes('MALI-G710') || gpu.includes('IMMORTALIS')) {
      detected = {
        ...DEVICE_PRESETS.pixel_7_8_9,
        ramGB: ram >= 8 ? ram : 12,
        androidVersion: probe.androidVersionStr,
        isAutoDetected: true,
        detectedHardwareInfo: `Google Pixel • GPU: ${probe.gpuRenderer || 'Mali-G710'} • ${ram}GB RAM`
      };
      summary = `Wykryto Google Pixel (Google Tensor EdgeTPU, ${ram}GB RAM)`;
    }
    // 5. Probing Xiaomi / Redmi / POCO (HyperOS / MIUI)
    else if (ua.includes('XIAOMI') || ua.includes('REDMI') || ua.includes('POCO') || ua.includes('MIUI')) {
      detected = {
        ...DEVICE_PRESETS.xiaomi_hyperos,
        ramGB: ram,
        androidVersion: `${probe.androidVersionStr} (HyperOS/MIUI)`,
        isAutoDetected: true,
        detectedHardwareInfo: `Xiaomi / POCO • GPU: ${probe.gpuRenderer || 'Adreno/Mali'} • ${ram}GB RAM`
      };
      summary = `Wykryto Xiaomi / Redmi / POCO (HyperOS, ${ram}GB RAM)`;
    }
    // 6. Generic Android Smartphone
    else if (probe.isAndroid) {
      let socDesc = 'ARM64 Cortex';
      let npuAcc: HardwareAccelerationBackend = 'AUTO_NNAPI';

      if (gpu.includes('ADRENO')) {
        socDesc = `Qualcomm Snapdragon (${probe.gpuRenderer.replace(/ANGLE \(/i, '').replace(/\)/g, '')})`;
        npuAcc = 'QNN_HEXAGON';
      } else if (gpu.includes('MALI')) {
        socDesc = `ARM Mali (${probe.gpuRenderer.replace(/ANGLE \(/i, '').replace(/\)/g, '')})`;
        npuAcc = 'GPU_VULKAN';
      }

      detected = {
        id: 'auto_android',
        manufacturer: 'universal',
        modelName: `Smartfon Android (${probe.cpuCores} rdzeni)`,
        chipset: socDesc,
        androidVersion: probe.androidVersionStr,
        ramGB: ram,
        npuAcceleration: npuAcc,
        batteryOptimizationSystemName: 'Standardowe zarządzanie AOSP Doze Mode',
        notes: `Automatycznie dopasowano do podzespołów: ${probe.cpuCores} rdzeni CPU, ${ram}GB RAM, GPU: ${probe.gpuRenderer || 'Mali/Adreno'}`,
        isAutoDetected: true,
        detectedHardwareInfo: `${probe.androidVersionStr} • ${socDesc} • ${ram}GB RAM • ${probe.cpuCores} CPU Cores`
      };
      summary = `Wykryto smartfon z systemem ${probe.androidVersionStr} (${socDesc}, ${ram}GB RAM, ${probe.cpuCores} rdzeni)`;
    }
    // 7. Desktop / PC Dev Environment Preview
    else {
      detected = {
        id: 'universal',
        manufacturer: 'universal',
        modelName: `Środowisko Android (${probe.cpuCores} vCPU)`,
        chipset: probe.gpuRenderer ? `Akceleracja GPU: ${probe.gpuRenderer}` : 'Uniwersalny procesor ARM64/x86',
        androidVersion: 'Android 14 (Zgodność środowiska)',
        ramGB: ram,
        npuAcceleration: 'AUTO_NNAPI',
        batteryOptimizationSystemName: 'Standardowe reguły oszczędzania energii',
        notes: `Wykryto podzespoły hosta: ${probe.cpuCores} rdzeni, ${ram}GB pamięci RAM, GPU: ${probe.gpuRenderer || 'Domyślne'}`,
        isAutoDetected: true,
        detectedHardwareInfo: `Host: ${probe.gpuRenderer || 'Standardowe GPU'} • ${ram}GB RAM • ${probe.cpuCores} Cores`
      };
      summary = `Wykryto konfigurację sprzętową: ${probe.gpuRenderer || 'Akceleracja graficzna'}, ${ram}GB RAM, ${probe.cpuCores} rdzeni CPU`;
    }

    return { profile: detected, summary };
  }

  /**
   * Loads saved profile, or automatically detects and sets default on first launch.
   */
  private loadOrAutoDetectProfile(): DeviceProfile {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_DEVICE);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load stored device profile, running auto-detection', e);
    }

    // FIRST LAUNCH: Run hardware discovery automatically!
    const { profile, summary } = this.autoDetectDeviceProfile();
    console.log('[DeviceProfileManager] Pierwsze uruchomienie! Automatycznie wykryto profil:', summary);

    try {
      localStorage.setItem(STORAGE_KEY_DEVICE, JSON.stringify(profile));
    } catch (e) {
      console.warn('Failed to save auto-detected device profile', e);
    }

    return profile;
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

  /**
   * Manually trigger auto-detection from UI button and apply it
   */
  runAutoDetectionAndApply(): { profile: DeviceProfile; summary: string } {
    const { profile, summary } = this.autoDetectDeviceProfile();
    this.activeProfile = { ...profile };

    try {
      localStorage.setItem(STORAGE_KEY_DEVICE, JSON.stringify(this.activeProfile));
    } catch (e) {
      console.warn('Failed to persist auto-detected profile', e);
    }

    soundAndHaptics.playSuccessChime();
    soundAndHaptics.triggerHaptic([40, 60, 40]);
    this.notify();

    return { profile, summary };
  }

  setActiveProfile(profileOrPresetKey: string | DeviceProfile) {
    if (typeof profileOrPresetKey === 'string') {
      const preset = DEVICE_PRESETS[profileOrPresetKey] || DEVICE_PRESETS.universal;
      this.activeProfile = { ...preset, isAutoDetected: false };
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
