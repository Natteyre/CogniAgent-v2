import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Download,
  Cloud,
  Volume2,
  Sliders,
  Eye,
  EyeOff,
  RefreshCw,
  Layers,
  CheckCircle,
  AlertCircle,
  FileCode,
  FileDown,
  Trash2,
  ShieldCheck,
  Zap,
  Moon,
  ChevronRight,
  ExternalLink,
  FolderOpen,
  Sparkles,
  Smartphone,
  Mic,
  Settings2,
  ShieldAlert,
  Fingerprint,
  FileText,
  MessageSquare,
  DollarSign,
  Lock,
  Search
} from 'lucide-react';
import {
  HardwareState,
  KirinTelemetry,
  LlmSettings,
  OfflineModelInfo,
  DeviceProfile,
  AgentServicesConfig,
  HardwareAccelerationBackend,
  AgentSecurityPolicy,
  SecurityAuditItem,
  SecurityMode
} from '../../types';
import { hardwareManager } from '../../services/hardwareManager';
import { modelManager } from '../../services/modelManager';
import { soundAndHaptics } from '../../services/soundAndHaptics';
import { deviceProfileManager, DEVICE_PRESETS } from '../../services/deviceProfileManager';
import { securityManager } from '../../services/securityManager';
import { ModelManagerModal } from '../models/ModelManagerModal';

interface SettingsScreenProps {
  llmSettings: LlmSettings;
  hardwareState: HardwareState;
  testConnectionStatus: string | null;
  availableVoices: string[];
  telemetry: KirinTelemetry;
  isFloatingActive: boolean;
  onUpdateSettings: (settings: LlmSettings) => void;
  onTestConnection: () => void;
  onTestVoiceSpeech: () => void;
  onToggleTorch: () => void;
  onToggleBluetooth: () => void;
  onRefreshHardware: () => void;
  onToggleFloatingService: () => void;
  onToggleAccessibility: () => void;
  onToggleNotifications: () => void;
  onExportRoutines: () => void;
  onImportRoutines: (json: string) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  llmSettings,
  hardwareState,
  testConnectionStatus,
  availableVoices,
  telemetry,
  isFloatingActive,
  onUpdateSettings,
  onTestConnection,
  onTestVoiceSpeech,
  onToggleTorch,
  onToggleBluetooth,
  onRefreshHardware,
  onToggleFloatingService,
  onToggleAccessibility,
  onToggleNotifications,
  onExportRoutines,
  onImportRoutines
}) => {
  const [apiKey, setApiKey] = useState(llmSettings.apiKey);
  const [endpointUrl, setEndpointUrl] = useState(llmSettings.endpointUrl);
  const [modelName, setModelName] = useState(llmSettings.modelName);
  const [showApiKey, setShowApiKey] = useState(false);
  const [speechRate, setSpeechRate] = useState(llmSettings.speechRate);
  const [speechPitch, setSpeechPitch] = useState(llmSettings.speechPitch);
  const [selectedVoice, setSelectedVoice] = useState(
    llmSettings.voiceLanguage || availableVoices[0] || 'Domyślny głos systemu (Polski)'
  );
  const [importJsonText, setImportJsonText] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);
  const [wizardSuccessMsg, setWizardSuccessMsg] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [offlineModels, setOfflineModels] = useState<OfflineModelInfo[]>(() => modelManager.getModels());
  const [activeOfflineModelId, setActiveOfflineModelId] = useState<string>(() => modelManager.getActiveModelId());

  // Device Profile & Agent Services State
  const [deviceProfile, setDeviceProfile] = useState<DeviceProfile>(() => deviceProfileManager.getActiveProfile());
  const [agentServices, setAgentServices] = useState<AgentServicesConfig>(() => deviceProfileManager.getServicesConfig());
  const [isEditingCustomDevice, setIsEditingCustomDevice] = useState(false);
  const [customForm, setCustomForm] = useState<DeviceProfile>(() => ({ ...deviceProfile }));

  // Security Policy & Audit Log State
  const [securityPolicy, setSecurityPolicy] = useState<AgentSecurityPolicy>(() => securityManager.getPolicy());
  const [auditLog, setAuditLog] = useState<SecurityAuditItem[]>(() => securityManager.getAuditLog());
  const [showAuditModal, setShowAuditModal] = useState(false);

  // Hardware Auto-Detection State
  const [isDetectingHardware, setIsDetectingHardware] = useState(false);
  const [detectionNotice, setDetectionNotice] = useState<string | null>(null);

  useEffect(() => {
    const unsubModels = modelManager.subscribeModelList((list) => {
      setOfflineModels(list);
      setActiveOfflineModelId(modelManager.getActiveModelId());
    });

    const unsubDevice = deviceProfileManager.subscribe((prof, srv) => {
      setDeviceProfile(prof);
      setAgentServices(srv);
      setCustomForm({ ...prof });
    });

    const unsubSecurity = securityManager.subscribePolicy((pol, log) => {
      setSecurityPolicy(pol);
      setAuditLog(log);
    });

    return () => {
      unsubModels();
      unsubDevice();
      unsubSecurity();
    };
  }, []);

  const handleSelectPreset = (key: string) => {
    if (key === 'custom') {
      setIsEditingCustomDevice(true);
    } else {
      setIsEditingCustomDevice(false);
      deviceProfileManager.setActiveProfile(key);
    }
  };

  const handleSaveCustomProfile = () => {
    deviceProfileManager.setActiveProfile(customForm);
    setIsEditingCustomDevice(false);
  };

  const handleAutoDetectHardware = () => {
    setIsDetectingHardware(true);
    setTimeout(() => {
      const res = deviceProfileManager.runAutoDetectionAndApply();
      setIsDetectingHardware(false);
      setDetectionNotice(res.summary);
      setTimeout(() => setDetectionNotice(null), 6000);
    }, 400);
  };

  const handleSaveLlm = (field: Partial<LlmSettings>) => {
    const updated = {
      ...llmSettings,
      apiKey,
      endpointUrl,
      modelName,
      speechRate,
      speechPitch,
      voiceLanguage: selectedVoice,
      ...field
    };
    onUpdateSettings(updated);
  };

  const handleRunOptimizationWizard = () => {
    hardwareManager.runFullHuaweiOptimization();
    setWizardSuccessMsg(true);
    setTimeout(() => setWizardSuccessMsg(false), 3500);
  };

  const huawei = hardwareState.huaweiOptimization;
  const isFullyOptimized =
    huawei.autostartEnabled &&
    huawei.batteryOptimizationIgnored &&
    huawei.powerGenieGuarded &&
    huawei.lockScreenKeepAlive;

  return (
    <div className="flex flex-col h-full bg-[#0a0e14] overflow-y-auto">
      {/* Top Header */}
      <header className="bg-[#121824] border-b border-[#2d3748] px-4 py-3 shrink-0 shadow-md flex items-center justify-between">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
            Konfiguracja i Diagnostyka
          </h1>
          <p className="text-xs text-[#94a3b8]">
            Profil urządzenia, LLM Cloud, modele offline i usługi asystenta
          </p>
        </div>

        <button
          type="button"
          onClick={onRefreshHardware}
          data-testid="refresh_hardware_button"
          title="Odśwież stan sprzętu"
          className="p-2 rounded-xl bg-[#1e2638] text-[#00e5ff] hover:bg-[#2d3748] transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </header>

      {/* Settings Cards List */}
      <div className="flex-1 p-4 space-y-4">
        {/* Card 0: Universal Device Profile & Hardware Acceleration */}
        <div className="bg-gradient-to-br from-[#121824] via-[#1a2233] to-[#121824] border-2 border-[#00e5ff]/40 rounded-2xl p-4 shadow-[0_0_20px_rgba(0,229,255,0.15)] space-y-3.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#00e5ff]/20 border border-[#00e5ff]/40 flex items-center justify-center shrink-0">
                <Smartphone className="w-5 h-5 text-[#00e5ff]" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>Profil Urządzenia & Akceleracja AI</span>
                  <span className="bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/30 text-[10px] font-mono px-2 py-0.5 rounded-full">
                    {deviceProfile.manufacturer.toUpperCase()}
                  </span>
                </h2>
                <p className="text-[11px] text-gray-300">
                  Dostosuj konfigurację podzespołów, silnik NPU i profil zarządzania energią do Twojego smartfona
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsEditingCustomDevice(!isEditingCustomDevice)}
              className="px-2.5 py-1.5 rounded-xl bg-[#1e2638] hover:bg-[#2d3748] text-[#00e5ff] text-xs font-semibold flex items-center gap-1.5 border border-white/5 transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5" />
              <span>{isEditingCustomDevice ? 'Ukryj edytor' : 'Edytuj parametry'}</span>
            </button>
          </div>

          {/* Hardware Auto-Detection Bar */}
          <div className="bg-[#0a0e14] p-3 rounded-xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#00e5ff]/15 flex items-center justify-center shrink-0">
                <Search className="w-4 h-4 text-[#00e5ff]" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>Automatyczne wykrywanie telefonu</span>
                  {deviceProfile.isAutoDetected && (
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono px-1.5 py-0.2 rounded font-bold">
                      ✓ Auto-Wykryto
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-400 truncate">
                  {deviceProfile.detectedHardwareInfo || 'Skanuje GPU WebGL, RAM, rdzenie CPU i system'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAutoDetectHardware}
              disabled={isDetectingHardware}
              className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-[#00e5ff] to-[#00b4d8] text-black font-extrabold text-xs shadow-md hover:opacity-95 active:scale-95 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 shrink-0"
            >
              {isDetectingHardware ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Skanowanie...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 fill-black" />
                  <span>🔍 Wykryj parametry telefonu</span>
                </>
              )}
            </button>
          </div>

          {detectionNotice && (
            <div className="bg-emerald-950/40 border border-emerald-500/40 p-2.5 rounded-xl text-xs font-semibold text-emerald-300 flex items-center gap-2 animate-fadeIn">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{detectionNotice}</span>
            </div>
          )}

          {/* Preset Selector Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Wybierz model telefonu lub profil bazowy:
            </label>
            <select
              value={isEditingCustomDevice ? 'custom' : deviceProfile.id}
              onChange={(e) => handleSelectPreset(e.target.value)}
              className="w-full bg-[#0a0e14] border border-[#2d3748] focus:border-[#00e5ff] rounded-xl px-3 py-2 text-xs text-white outline-none font-medium"
            >
              <option value="universal">🌐 Uniwersalny profil Android (Dowolny telefon: Sony, Motorola, Realme, Asus...)</option>
              <option value="huawei_p30_pro">📱 Huawei P30 Pro (HiSilicon Kirin 980 / HiAI Dual-NPU / EMUI 10)</option>
              <option value="samsung_s23_s24">📱 Samsung Galaxy S23 / S24 (Snapdragon 8 Gen 2/3 / Exynos / QNN NPU)</option>
              <option value="pixel_7_8_9">📱 Google Pixel 7 / 8 / 9 (Google Tensor / EdgeTPU / Czysty Android)</option>
              <option value="xiaomi_hyperos">📱 Xiaomi / Redmi / POCO (Snapdragon / Dimensity APU / HyperOS)</option>
              <option value="custom">⚙️ Własny model telefonu (Ręczna konfiguracja)</option>
            </select>
          </div>

          {/* Custom device specification form if open */}
          {isEditingCustomDevice && (
            <div className="bg-[#0a0e14] border border-[#00e5ff]/30 p-3.5 rounded-xl space-y-3 animate-fadeIn">
              <div className="text-xs font-bold text-[#00e5ff]">Własne parametry podzespołów smartfona:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div>
                  <label className="text-gray-400 block mb-1">Nazwa modelu telefonu:</label>
                  <input
                    type="text"
                    value={customForm.modelName}
                    onChange={(e) => setCustomForm({ ...customForm, modelName: e.target.value })}
                    className="w-full bg-[#121824] border border-[#2d3748] rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-[#00e5ff]"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Chipset / Procesor:</label>
                  <input
                    type="text"
                    value={customForm.chipset}
                    onChange={(e) => setCustomForm({ ...customForm, chipset: e.target.value })}
                    className="w-full bg-[#121824] border border-[#2d3748] rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-[#00e5ff]"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Pamięć RAM (GB):</label>
                  <input
                    type="number"
                    min="3"
                    max="24"
                    value={customForm.ramGB}
                    onChange={(e) => setCustomForm({ ...customForm, ramGB: parseInt(e.target.value, 10) || 6 })}
                    className="w-full bg-[#121824] border border-[#2d3748] rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-[#00e5ff]"
                  />
                </div>
                <div>
                  <label className="text-gray-400 block mb-1">Silnik akceleracji NPU/AI:</label>
                  <select
                    value={customForm.npuAcceleration}
                    onChange={(e) =>
                      setCustomForm({ ...customForm, npuAcceleration: e.target.value as HardwareAccelerationBackend })
                    }
                    className="w-full bg-[#121824] border border-[#2d3748] rounded-lg px-2.5 py-1.5 text-white outline-none focus:border-[#00e5ff]"
                  >
                    <option value="AUTO_NNAPI">AUTO_NNAPI (Standardowe Android Neural Networks)</option>
                    <option value="HIAI_NPU">HIAI_NPU (Huawei HiSilicon Kirin NPU)</option>
                    <option value="QNN_HEXAGON">QNN_HEXAGON (Qualcomm Snapdragon NPU / Hexagon)</option>
                    <option value="EDGETPU">EDGETPU (Google Tensor TPU)</option>
                    <option value="GPU_VULKAN">GPU_VULKAN (Akceleracja graficzna Vulkan / OpenCL)</option>
                    <option value="CPU_NEON">CPU_NEON (Optymalizacja procesora ARM Neon SIMD)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditingCustomDevice(false)}
                  className="px-3 py-1.5 text-xs text-gray-400 hover:text-white"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomProfile}
                  className="px-4 py-1.5 bg-[#00e5ff] text-black font-bold text-xs rounded-xl hover:bg-[#00b4d8] transition-colors"
                >
                  Zastosuj ten profil
                </button>
              </div>
            </div>
          )}

          {/* Active Profile Specs Grid */}
          <div className="bg-[#0a0e14]/80 p-3 rounded-xl border border-white/5 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div>
              <div className="text-[10px] text-gray-400 uppercase font-mono">Aktywny Model</div>
              <div className="font-bold text-white truncate">{deviceProfile.modelName}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400 uppercase font-mono">Procesor (SoC)</div>
              <div className="font-bold text-[#00e5ff] truncate">{deviceProfile.chipset}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400 uppercase font-mono">Akcelerator AI</div>
              <div className="font-bold text-[#8b5cf6] truncate">{deviceProfile.npuAcceleration}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400 uppercase font-mono">Pamięć RAM</div>
              <div className="font-bold text-white">{deviceProfile.ramGB} GB RAM</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400 uppercase font-mono">Wersja Systemu</div>
              <div className="font-bold text-gray-200 truncate">{deviceProfile.androidVersion}</div>
            </div>
            <div>
              <div className="text-[10px] text-gray-400 uppercase font-mono">Zarządzanie Energią</div>
              <div className="font-bold text-[#10b981] truncate">{deviceProfile.batteryOptimizationSystemName}</div>
            </div>
          </div>

          {/* System Battery Optimization Wizard for this specific device */}
          <div className="bg-[#0a0e14]/80 p-3 rounded-xl border border-white/5 space-y-2 text-xs">
            <div className="text-gray-300 font-semibold flex items-center justify-between">
              <span>Zasady ochrony procesów w tle dla {deviceProfile.modelName}:</span>
              <span className="text-[#10b981] font-mono text-[10px]">Włączona ochrona</span>
            </div>
            <p className="text-gray-400 text-[11px] leading-relaxed">
              {deviceProfile.notes}. System zabezpiecza proces asystenta przed zatrzymywaniem po wyłączeniu ekranu i
              zapewnia natychmiastową reakcję na słowo wybudzające <em>„Hej Cogni”</em>.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRunOptimizationWizard}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#00e5ff] to-[#8b5cf6] text-black font-extrabold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4 fill-black" />
            <span>⚡ Zastosuj konfigurację optymalizacji dla: {deviceProfile.modelName}</span>
          </button>

          {wizardSuccessMsg && (
            <div className="bg-[#10b981]/20 border border-[#10b981]/40 text-[#10b981] p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Pomyślnie zastosowano konfigurację tła dla urządzenia: {deviceProfile.modelName}!</span>
            </div>
          )}
        </div>

        {/* Card 1: Dynamic Hardware Telemetry & Acceleration Metrics */}
        <div
          data-testid="telemetry_card"
          className="bg-[#121824] border border-[#2d3748] rounded-2xl p-4 shadow-sm space-y-3"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#00e5ff]/20 border border-[#00e5ff]/30 flex items-center justify-center shrink-0">
                <Cpu className="w-4 h-4 text-[#00e5ff]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Panel Telemetrii Sprzętowej</span>
                  <span className="text-[10px] font-mono font-bold bg-[#00e5ff]/15 text-[#00e5ff] border border-[#00e5ff]/30 px-2 py-0.5 rounded-full">
                    {deviceProfile.modelName}
                  </span>
                </h2>
                <span className="text-[11px] text-[#00e5ff] font-semibold">
                  {deviceProfile.manufacturer === 'huawei'
                    ? `${telemetry.bigCoresActive}x Cortex-A76 Big Cores (Kirin 980 HiAI Dual-NPU aktywne)`
                    : deviceProfile.manufacturer === 'samsung'
                    ? `Qualcomm Hexagon / Samsung Eden NPU (${deviceProfile.chipset}) aktywne`
                    : deviceProfile.manufacturer === 'pixel'
                    ? `Google Tensor EdgeTPU (${deviceProfile.chipset}) aktywne`
                    : deviceProfile.manufacturer === 'xiaomi'
                    ? `Akcelerator AI HyperOS (${deviceProfile.chipset}) aktywny`
                    : `${deviceProfile.npuAcceleration} • Aktywny backend akceleracji (${deviceProfile.chipset})`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="bg-[#1e2638] text-gray-300 border border-white/5 text-[10px] font-mono px-2 py-0.5 rounded">
                RAM: {deviceProfile.ramGB} GB
              </span>
              <span className="bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/30 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                {deviceProfile.npuAcceleration}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-2 border-t border-white/5">
            <div className="bg-[#0a0e14] p-2.5 rounded-xl border border-white/5">
              <div className="text-[10px] text-gray-400">Czas inferencji</div>
              <div className="text-sm sm:text-base font-extrabold text-[#00e5ff] mt-0.5">
                {telemetry.lastLocalInferenceMs > 0 ? `${telemetry.lastLocalInferenceMs} ms` : '< 12 ms'}
              </div>
              <div className="text-[9px] text-gray-500 font-mono">NPU / On-Device</div>
            </div>

            <div className="bg-[#0a0e14] p-2.5 rounded-xl border border-white/5">
              <div className="text-[10px] text-gray-400">Zapytania lokalne</div>
              <div className="text-sm sm:text-base font-extrabold text-[#8b5cf6] mt-0.5">
                {telemetry.localQueriesHandled}
              </div>
              <div className="text-[9px] text-[#10b981] font-mono font-semibold">100% offline</div>
            </div>

            <div className="bg-[#0a0e14] p-2.5 rounded-xl border border-white/5">
              <div className="text-[10px] text-gray-400">Zapytania w chmurze</div>
              <div className="text-sm sm:text-base font-extrabold text-amber-400 mt-0.5">
                {telemetry.cloudQueriesHandled || 0}
              </div>
              <div className="text-[9px] text-gray-500 font-mono">LLM API</div>
            </div>

            <div className="bg-[#0a0e14] p-2.5 rounded-xl border border-white/5">
              <div className="text-[10px] text-gray-400">Zaoszczędzone tokeny</div>
              <div className="text-sm sm:text-base font-extrabold text-[#10b981] mt-0.5">
                {telemetry.totalSavedTokens}
              </div>
              <div className="text-[9px] text-emerald-400 font-mono">
                ~{(telemetry.savedDataKb || telemetry.localQueriesHandled * 1.8).toFixed(1)} KB danych
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Offline SLM & NLU Model Manager */}
        <div
          data-testid="model_manager_card"
          className="bg-[#121824] border border-[#2d3748] rounded-2xl p-3.5 sm:p-4 shadow-sm space-y-3.5"
        >
          {/* Header Row: Responsive Icon, Title & Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00e5ff] to-[#8b5cf6] p-0.5 shadow-[0_0_12px_rgba(0,229,255,0.3)] shrink-0">
                <div className="w-full h-full bg-[#121824] rounded-[10px] flex items-center justify-center">
                  <Cpu className="w-5 h-5 text-[#00e5ff] shrink-0" />
                </div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                  <h2 className="text-xs sm:text-sm font-bold text-white tracking-wide break-words">
                    Menedżer Modeli Offline SLM & NLU
                  </h2>
                  <span className="bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 text-[#8b5cf6] text-[10px] font-bold px-2 py-0.5 rounded-full font-mono shrink-0">
                    Gemma 2B • Phi-3
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-gray-400 mt-1 leading-relaxed break-words">
                  Formaty MediaPipe (.task / .bin), ONNX Runtime INT4, GGUF z HuggingFace Hub lub urządzenia
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsModelModalOpen(true)}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-[#00e5ff]/15 hover:bg-[#00e5ff]/25 text-[#00e5ff] border border-[#00e5ff]/30 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 self-stretch sm:self-auto shadow-sm active:scale-[0.98]"
            >
              <FolderOpen className="w-4 h-4 shrink-0" />
              <span>Otwórz Menedżer</span>
            </button>
          </div>

          {/* Active Model Overview Bar (Dual-Engine Tandem) */}
          <div className="bg-[#0a0e14] border border-white/5 rounded-xl p-3 sm:p-3.5 space-y-2.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">
                Aktywny Tandem AI na urządzeniu (Dual-Engine):
              </div>
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-extrabold px-1.5 py-0.5 rounded font-mono">
                DUAL-ENGINE AKTYWNY
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-[#121824] rounded-lg border border-emerald-500/30 space-y-1">
                <div className="text-[10px] font-extrabold text-emerald-400 flex items-center justify-between">
                  <span>⚡ SILNIK A (ROUTER NPU):</span>
                  <span className="font-mono text-gray-400">14 ms</span>
                </div>
                <div className="font-bold text-white">GLiNER Polish Multi-Intent</div>
                <div className="text-[10px] text-gray-400 leading-tight">
                  Stały kontroler systemu: latarka, bluetooth, głośność, makra, OCR i ekran.
                </div>
              </div>

              <div className="p-2.5 bg-[#121824] rounded-lg border border-[#8b5cf6]/30 space-y-1">
                <div className="text-[10px] font-extrabold text-[#8b5cf6] flex items-center justify-between">
                  <span>🧠 SILNIK B (CZAT OFFLINE):</span>
                  <span className="font-mono text-gray-400">SLM</span>
                </div>
                <div className="font-bold text-white truncate">
                  {offlineModels.find((m) => m.id === activeOfflineModelId)?.name || 'Qwen 2.5 1.5B Instruct'}
                </div>
                <div className="text-[10px] text-gray-400 leading-tight">
                  Generowanie mowy i konwersacje w 100% na urządzeniu.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="text-[11px] text-gray-400">
                Przyspieszenie: <span className="text-[#00e5ff] font-semibold">{deviceProfile.chipset} ({deviceProfile.npuAcceleration})</span>
              </div>
              <button
                type="button"
                onClick={() => setIsModelModalOpen(true)}
                className="py-1.5 px-3 rounded-xl bg-gradient-to-r from-[#00e5ff] to-[#8b5cf6] text-black font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 hover:opacity-95 shrink-0 active:scale-[0.98]"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Katalog HuggingFace</span>
              </button>
            </div>
          </div>

          {/* Quick Model Selector (installed models) */}
          <div className="space-y-2 pt-0.5">
            <div className="flex justify-between items-center text-[11px] text-gray-400">
              <span>Zainstalowane modele gotowe do inferencji offline:</span>
              <button
                type="button"
                onClick={() => setIsModelModalOpen(true)}
                className="text-[#00e5ff] hover:underline shrink-0"
              >
                Wszystkie ({offlineModels.filter((m) => m.isInstalled).length})
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {offlineModels
                .filter((m) => m.isInstalled)
                .slice(0, 4)
                .map((m) => (
                  <div
                    key={m.id}
                    onClick={() => {
                      modelManager.setActiveModel(m.id);
                      setActiveOfflineModelId(m.id);
                    }}
                    className={`p-2.5 sm:p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                      m.id === activeOfflineModelId
                        ? 'bg-[#152033] border-[#00e5ff] shadow-[0_0_10px_rgba(0,229,255,0.2)]'
                        : 'bg-[#0a0e14] border-[#2d3748] hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden min-w-0 flex-1">
                      <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${m.id === activeOfflineModelId ? 'bg-[#00e5ff] shadow-[0_0_8px_rgba(0,229,255,0.6)]' : 'bg-gray-500'}`} />
                      <div className="truncate min-w-0">
                        <div className="text-xs font-bold text-white truncate">{m.name}</div>
                        <div className="text-[10px] text-gray-400 truncate mt-0.5">
                          {m.format} • {m.sizeMB >= 1000 ? `${(m.sizeMB / 1024).toFixed(1)} GB` : `${m.sizeMB} MB`}
                        </div>
                      </div>
                    </div>
                    {m.id === activeOfflineModelId ? (
                      <span className="text-[10px] font-extrabold text-[#00e5ff] bg-[#00e5ff]/20 px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap">
                        AKTYWNY
                      </span>
                    ) : (
                      <span className="text-[10px] text-gray-400 hover:text-white shrink-0 whitespace-nowrap">
                        Wybierz
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Card 3: LLM Provider Configuration */}
        <div
          data-testid="llm_settings_card"
          className="bg-[#121824] border border-[#2d3748] rounded-2xl p-4 shadow-sm space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#00e5ff]/20 border border-[#00e5ff]/30 flex items-center justify-center">
              <Cloud className="w-4 h-4 text-[#00e5ff]" />
            </div>
            <h2 className="text-sm font-bold text-white">
              Konfiguracja Chmury LLM (OpenRouter / OpenAI)
            </h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Klucz API (OpenRouter / OpenAI)
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  handleSaveLlm({ apiKey: e.target.value });
                }}
                data-testid="api_key_input"
                placeholder="sk-or-v1-..."
                className="w-full bg-[#0a0e14] border border-[#2d3748] focus:border-[#00e5ff] rounded-xl px-3 py-2 text-xs text-white outline-none pr-10"
              />
              <button
                type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Adres bazowy Endpoint URL
            </label>
            <input
              type="text"
              value={endpointUrl}
              onChange={(e) => {
                setEndpointUrl(e.target.value);
                handleSaveLlm({ endpointUrl: e.target.value });
              }}
              data-testid="endpoint_url_input"
              className="w-full bg-[#0a0e14] border border-[#2d3748] focus:border-[#00e5ff] rounded-xl px-3 py-2 text-xs text-white outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Nazwa Modelu</label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => {
                setModelName(e.target.value);
                handleSaveLlm({ modelName: e.target.value });
              }}
              data-testid="model_name_input"
              placeholder="meta-llama/llama-3.1-8b-instruct:free"
              className="w-full bg-[#0a0e14] border border-[#2d3748] focus:border-[#00e5ff] rounded-xl px-3 py-2 text-xs text-white outline-none"
            />
          </div>

          <button
            type="button"
            onClick={onTestConnection}
            data-testid="test_connection_button"
            className="py-2 px-4 rounded-xl bg-[#00e5ff] hover:bg-[#00b4d8] text-black font-bold text-xs transition-all shadow-[0_0_10px_rgba(0,229,255,0.25)]"
          >
            Testuj Połączenie (Ping)
          </button>

          {testConnectionStatus && (
            <div
              className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
                testConnectionStatus.startsWith('✓')
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/40 border-red-500/40 text-red-300'
              }`}
            >
              {testConnectionStatus.startsWith('✓') ? (
                <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              )}
              <span>{testConnectionStatus}</span>
            </div>
          )}
        </div>

        {/* Card 4: Polish TTS/STT Calibration */}
        <div
          data-testid="tts_settings_card"
          className="bg-[#121824] border border-[#2d3748] rounded-2xl p-4 shadow-sm space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center">
              <Volume2 className="w-4 h-4 text-[#8b5cf6]" />
            </div>
            <h2 className="text-sm font-bold text-white">Kalibracja Polskiego Głosu (TTS / STT)</h2>
          </div>

          <div>
            <div className="flex justify-between text-xs text-gray-300 mb-1">
              <span>Szybkość mowy</span>
              <span className="font-mono text-[#00e5ff]">{speechRate.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={speechRate}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setSpeechRate(val);
                handleSaveLlm({ speechRate: val });
              }}
              data-testid="speech_rate_slider"
              className="w-full accent-[#00e5ff]"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs text-gray-300 mb-1">
              <span>Ton głosu (Pitch)</span>
              <span className="font-mono text-[#8b5cf6]">{speechPitch.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={speechPitch}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setSpeechPitch(val);
                handleSaveLlm({ speechPitch: val });
              }}
              data-testid="speech_pitch_slider"
              className="w-full accent-[#8b5cf6]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Silnik i profil głosu:
            </label>
            <select
              value={selectedVoice}
              onChange={(e) => {
                setSelectedVoice(e.target.value);
                handleSaveLlm({ voiceLanguage: e.target.value });
              }}
              className="w-full bg-[#0a0e14] border border-[#2d3748] rounded-xl px-3 py-2 text-xs text-white outline-none"
            >
              {availableVoices.length > 0 ? (
                availableVoices.map((voice) => (
                  <option key={voice} value={voice}>
                    {voice}
                  </option>
                ))
              ) : (
                <option value="pl-PL">Domyślny systemowy silnik TTS (Polski)</option>
              )}
            </select>
          </div>

          <button
            type="button"
            onClick={onTestVoiceSpeech}
            data-testid="test_voice_button"
            className="w-full py-2 border border-[#8b5cf6]/40 hover:bg-[#8b5cf6]/10 text-[#8b5cf6] text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5"
          >
            <Volume2 className="w-4 h-4" />
            <span>Przetestuj Wymowę Głosu (TTS)</span>
          </button>
        </div>

        {/* Card 4b: Audio Earcons & Haptics */}
        <div
          data-testid="sound_haptics_card"
          className="bg-[#121824] border border-[#2d3748] rounded-2xl p-4 shadow-sm space-y-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#00e5ff]/20 border border-[#00e5ff]/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-[#00e5ff]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Sygnały Dźwiękowe & Wibracje Haptyczne</h2>
              <p className="text-[11px] text-gray-400">Synteza Web Audio API Earcons oraz haptyka smartfona</p>
            </div>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <div>
              <div className="text-xs font-semibold text-white">Sygnały Dźwiękowe (Audio Earcons)</div>
              <div className="text-[11px] text-gray-400">Dźwięk "blip" przy słowie kluczowym, sukcesie i alarmie</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={llmSettings.soundEffectsEnabled !== false}
                onChange={(e) => handleSaveLlm({ soundEffectsEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#1e2638] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00e5ff]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <div>
              <div className="text-xs font-semibold text-white">Wibracje Haptyczne (Haptic Feedback)</div>
              <div className="text-[11px] text-gray-400">Potwierdzenie wibracją akcji sprzętowych i powiadomień</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={llmSettings.hapticFeedbackEnabled !== false}
                onChange={(e) => handleSaveLlm({ hapticFeedbackEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#1e2638] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8b5cf6]"></div>
            </label>
          </div>

          <div className="flex items-center gap-2 pt-1 flex-wrap sm:flex-nowrap">
            <button
              type="button"
              onClick={() => soundAndHaptics.playWakeWordChime()}
              className="flex-1 py-2 px-3 rounded-xl bg-[#00e5ff]/15 hover:bg-[#00e5ff]/25 text-[#00e5ff] text-xs font-bold transition-colors"
            >
              Testuj dźwięk "Hej Cogni"
            </button>
            <button
              type="button"
              onClick={() => soundAndHaptics.triggerHaptic([40, 50, 40])}
              className="flex-1 py-2 px-3 rounded-xl bg-[#8b5cf6]/15 hover:bg-[#8b5cf6]/25 text-[#8b5cf6] text-xs font-bold transition-colors"
            >
              Testuj wibrację
            </button>
          </div>
        </div>

        {/* Card 5: Agent System Services & Permissions (Cleaned & Enhanced) */}
        <div
          data-testid="hardware_state_card"
          className="bg-[#121824] border border-[#2d3748] rounded-2xl p-4 shadow-sm space-y-3.5"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00e5ff]/20 border border-[#00e5ff]/40 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5 text-[#00e5ff]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">
                Usługi Systemowe & Uprawnienia Agenta
              </h2>
              <p className="text-[11px] text-gray-400">
                Pływający dymek, usługa dostępności, zrzuty ekranu, nasłuch w tle i autostart
              </p>
            </div>
          </div>

          {/* 1. Floating Overlay Switch (Kept as requested) */}
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <Layers className={`w-4 h-4 ${isFloatingActive ? 'text-[#00e5ff]' : 'text-gray-400'}`} />
              <div>
                <div className="text-xs font-semibold text-white">
                  Pływający Dymek Asystenta (True Floating Chat Overlay)
                </div>
                <div className="text-[11px] text-gray-400">
                  {isFloatingActive ? 'Dymek aktywny nad aplikacjami (SYSTEM_ALERT_WINDOW)' : 'Wyłączony'}
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isFloatingActive}
                onChange={onToggleFloatingService}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#1e2638] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00e5ff]"></div>
            </label>
          </div>

          {/* 2. Accessibility Service (Crucial for In-App Controls) */}
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <ShieldCheck
                className={`w-4 h-4 ${
                  hardwareState.isAccessibilityActive ? 'text-[#10b981]' : 'text-gray-400'
                }`}
              />
              <div>
                <div className="text-xs font-semibold text-white">
                  Usługa Dostępności (AccessibilityService)
                </div>
                <div className="text-[11px] text-gray-400">
                  {hardwareState.isAccessibilityActive
                    ? 'Aktywna - automatyzacja kliknięć i czytanie drzewa UI innych aplikacji'
                    : 'Wymagane uprawnienie do automatyzacji innych aplikacji'}
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={hardwareState.isAccessibilityActive}
                onChange={onToggleAccessibility}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#1e2638] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#10b981]"></div>
            </label>
          </div>

          {/* 3. Screen Capture & Resolution (MediaProjection) */}
          <div className="py-2 border-b border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Eye className={`w-4 h-4 ${agentServices.screenCaptureEnabled ? 'text-[#8b5cf6]' : 'text-gray-400'}`} />
                <div>
                  <div className="text-xs font-semibold text-white">
                    Przechwytywanie Ekranu (MediaProjection OCR / VLM)
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Pobieranie klatek ekranu do analizy zawartości i skanowania pulpitu
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={agentServices.screenCaptureEnabled}
                  onChange={(e) =>
                    deviceProfileManager.updateServicesConfig({ screenCaptureEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#1e2638] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8b5cf6]"></div>
              </label>
            </div>

            {agentServices.screenCaptureEnabled && (
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-gray-400 text-[11px]">Rozdzielczość zrzutu (oszczędzanie RAM):</span>
                <div className="flex gap-1">
                  {(['1080p', '720p', '480p'] as const).map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => deviceProfileManager.updateServicesConfig({ screenCaptureQuality: q })}
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold transition-all ${
                        agentServices.screenCaptureQuality === q
                          ? 'bg-[#8b5cf6] text-white'
                          : 'bg-[#1e2638] text-gray-400 hover:text-white'
                      }`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 4. Continuous Background Wake Word Service */}
          <div className="py-2 border-b border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Mic className={`w-4 h-4 ${agentServices.backgroundHotwordEnabled ? 'text-[#00e5ff]' : 'text-gray-400'}`} />
                <div>
                  <div className="text-xs font-semibold text-white">
                    Ciągły nasłuch w tle („Hej Cogni” Wake Word)
                  </div>
                  <div className="text-[11px] text-gray-400">
                    Wykrywanie słowa wybudzającego przy wyłączonym ekranie i w innych aplikacjach
                  </div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={agentServices.backgroundHotwordEnabled}
                  onChange={(e) =>
                    deviceProfileManager.updateServicesConfig({ backgroundHotwordEnabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#1e2638] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00e5ff]"></div>
              </label>
            </div>

            {agentServices.backgroundHotwordEnabled && (
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-gray-400 text-[11px]">Czułość mikrofonu w tle:</span>
                <div className="flex gap-1">
                  {(['low', 'medium', 'high'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => deviceProfileManager.updateServicesConfig({ hotwordSensitivity: s })}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all ${
                        agentServices.hotwordSensitivity === s
                          ? 'bg-[#00e5ff] text-black font-bold'
                          : 'bg-[#1e2638] text-gray-400 hover:text-white'
                      }`}
                    >
                      {s === 'low' ? 'Niska' : s === 'medium' ? 'Średnia' : 'Wysoka'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 5. Notification Listener Access */}
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <Zap
                className={`w-4 h-4 ${
                  hardwareState.isNotificationListenerActive ? 'text-amber-400' : 'text-gray-400'
                }`}
              />
              <div>
                <div className="text-xs font-semibold text-white">
                  Dostęp do Powiadomień (NotificationListenerService)
                </div>
                <div className="text-[11px] text-gray-400">
                  {hardwareState.isNotificationListenerActive
                    ? 'Aktywny - odczyt powiadomień WhatsApp, Gmail, SMS'
                    : 'Wyłączony'}
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={hardwareState.isNotificationListenerActive}
                onChange={onToggleNotifications}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#1e2638] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-400"></div>
            </label>
          </div>

          {/* 6. Process Wakelock & Low Memory Killer Guard */}
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <ShieldCheck
                className={`w-4 h-4 ${agentServices.batteryExemptionGranted ? 'text-[#10b981]' : 'text-gray-400'}`}
              />
              <div>
                <div className="text-xs font-semibold text-white">
                  Ochrona procesu asystenta (Wakelock & LMK Guard)
                </div>
                <div className="text-[11px] text-gray-400">
                  Wyłączenie optymalizacji baterii (chroni przed ubijaniem przy małej ilości RAM)
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={agentServices.batteryExemptionGranted}
                onChange={(e) =>
                  deviceProfileManager.updateServicesConfig({ batteryExemptionGranted: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#1e2638] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#10b981]"></div>
            </label>
          </div>

          {/* 7. Autostart on Device Boot */}
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <RefreshCw
                className={`w-4 h-4 ${agentServices.bootAutostartEnabled ? 'text-[#00e5ff]' : 'text-gray-400'}`}
              />
              <div>
                <div className="text-xs font-semibold text-white">
                  Autostart po włączeniu telefonu (BOOT_COMPLETED)
                </div>
                <div className="text-[11px] text-gray-400">
                  Automatyczne uruchomienie dymka i usług asystenta zaraz po uruchomieniu telefonu
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={agentServices.bootAutostartEnabled}
                onChange={(e) =>
                  deviceProfileManager.updateServicesConfig({ bootAutostartEnabled: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#1e2638] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00e5ff]"></div>
            </label>
          </div>

          {/* 8. Haptic Feedback on Action */}
          <div className="flex items-center justify-between py-2 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <Sparkles
                className={`w-4 h-4 ${agentServices.hapticFeedbackOnAction ? 'text-[#8b5cf6]' : 'text-gray-400'}`}
              />
              <div>
                <div className="text-xs font-semibold text-white">
                  Wibracja potwierdzenia akcji (Haptic Feedback)
                </div>
                <div className="text-[11px] text-gray-400">
                  Krótka wibracja haptyczna przy automatycznym kliknięciu w innej aplikacji lub rutynie
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={agentServices.hapticFeedbackOnAction}
                onChange={(e) =>
                  deviceProfileManager.updateServicesConfig({ hapticFeedbackOnAction: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#1e2638] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#8b5cf6]"></div>
            </label>
          </div>

          {/* Backup Routines Export / Import */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={onExportRoutines}
              className="flex-1 py-2 px-3 bg-[#1e2638] hover:bg-[#2d3748] text-xs font-semibold text-[#00e5ff] rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <FileDown className="w-4 h-4" />
              <span>Eksportuj Makra (JSON)</span>
            </button>
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="flex-1 py-2 px-3 bg-[#1e2638] hover:bg-[#2d3748] text-xs font-semibold text-[#8b5cf6] rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <FileCode className="w-4 h-4" />
              <span>Importuj Makra</span>
            </button>
          </div>
        </div>

        {/* Card 6: Security Policy & Human-in-the-Loop Guardrails */}
        <div
          data-testid="security_policy_card"
          className="bg-[#121824] border border-[#2d3748] rounded-2xl p-4 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  <span>Polityka Bezpieczeństwa & Ręczna Autoryzacja</span>
                  <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                    {securityPolicy.securityMode === 'SMART_RISK_ANALYSIS'
                      ? 'TRYB SMART'
                      : securityPolicy.securityMode === 'STRICT_CONFIRMATION'
                      ? 'TRYB ŚCISŁY'
                      : 'AUTONOMICZNY'}
                  </span>
                </h2>
                <p className="text-[11px] text-gray-400">
                  Wymagaj ręcznego zatwierdzenia dla plików, wiadomości, połączeń i płatności
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAuditModal(true)}
              className="px-2.5 py-1.5 rounded-xl bg-[#1e2638] hover:bg-[#2d3748] text-[#00e5ff] text-xs font-semibold flex items-center gap-1.5 border border-white/5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Dziennik Audytu ({auditLog.length})</span>
            </button>
          </div>

          {/* Mode Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-300">
              Główny tryb ochrony (Guardrail Mode):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => securityManager.updatePolicy({ securityMode: 'SMART_RISK_ANALYSIS' })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  securityPolicy.securityMode === 'SMART_RISK_ANALYSIS'
                    ? 'bg-[#00e5ff]/15 border-[#00e5ff] text-white shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                    : 'bg-[#0a0e14] border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold text-[#00e5ff] mb-0.5 flex items-center gap-1.5">
                  <span>🧠 Tryb Smart (Zalecany)</span>
                </div>
                <div className="text-[10px] text-gray-400 leading-tight">
                  Analiza ryzyka AI. Potwierdzenie tylko dla niebezpiecznych operacji.
                </div>
              </button>

              <button
                type="button"
                onClick={() => securityManager.updatePolicy({ securityMode: 'STRICT_CONFIRMATION' })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  securityPolicy.securityMode === 'STRICT_CONFIRMATION'
                    ? 'bg-amber-500/15 border-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                    : 'bg-[#0a0e14] border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold text-amber-400 mb-0.5 flex items-center gap-1.5">
                  <span>🛡️ Tryb Ścisły (Strict)</span>
                </div>
                <div className="text-[10px] text-gray-400 leading-tight">
                  Bezwzględne żądanie kliknięcia zgody dla każdej zaznaczonej kategorii.
                </div>
              </button>

              <button
                type="button"
                onClick={() => securityManager.updatePolicy({ securityMode: 'AUTONOMOUS' })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  securityPolicy.securityMode === 'AUTONOMOUS'
                    ? 'bg-rose-500/15 border-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.2)]'
                    : 'bg-[#0a0e14] border-white/5 text-gray-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-bold text-rose-400 mb-0.5 flex items-center gap-1.5">
                  <span>⚡ Pełna Autonomia</span>
                </div>
                <div className="text-[10px] text-gray-400 leading-tight">
                  Wszystkie akcje bez potwierdzeń (dla zaawansowanych użytkowników).
                </div>
              </button>
            </div>
          </div>

          {/* Granular Security Category Toggles */}
          <div className="bg-[#0a0e14] p-3 rounded-xl border border-white/5 space-y-2 text-xs">
            <div className="text-xs font-bold text-gray-300 mb-1">
              Kategorie operacji wymagające ręcznego potwierdzenia:
            </div>

            {/* 1. File modifications */}
            <div className="flex items-center justify-between py-1.5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Modyfikacja i usuwanie plików w telefonie</div>
                  <div className="text-[10px] text-gray-400">Usuwanie, edycja dokumentów, zdjęć i pamięci masowej</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={securityPolicy.confirmFileModifications}
                  onChange={(e) => securityManager.updatePolicy({ confirmFileModifications: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#1e2638] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {/* 2. Messaging & Calls */}
            <div className="flex items-center justify-between py-1.5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#00e5ff] shrink-0" />
                <div>
                  <div className="font-semibold text-white">Wysyłanie wiadomości SMS/Email i połączenia tel.</div>
                  <div className="text-[10px] text-gray-400">Wysyłanie SMS, email, nawiązywanie połączeń głosowych</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={securityPolicy.confirmMessagingAndCalls}
                  onChange={(e) => securityManager.updatePolicy({ confirmMessagingAndCalls: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#1e2638] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00e5ff]"></div>
              </label>
            </div>

            {/* 3. App Purchases */}
            <div className="flex items-center justify-between py-1.5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Transakcje i zakupy w aplikacjach („Kup teraz”)</div>
                  <div className="text-[10px] text-gray-400">Klikanie przycisków płatności, zamówień i przelewów</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={securityPolicy.confirmAppPurchases}
                  onChange={(e) => securityManager.updatePolicy({ confirmAppPurchases: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#1e2638] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>

            {/* 4. Sensitive System Settings */}
            <div className="flex items-center justify-between py-1.5 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                <div>
                  <div className="font-semibold text-white">Krytyczne ustawienia systemowe i uprawnienia</div>
                  <div className="text-[10px] text-gray-400">Czyszczenie pamięci podręcznej, odinstalowywanie, reset</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={securityPolicy.confirmSensitiveSystemSettings}
                  onChange={(e) => securityManager.updatePolicy({ confirmSensitiveSystemSettings: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#1e2638] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500"></div>
              </label>
            </div>

            {/* 5. Biometric Prompt */}
            <div className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-[#8b5cf6] shrink-0" />
                <div>
                  <div className="font-semibold text-white">Wymagaj autoryzacji odciskiem palca (Biometria)</div>
                  <div className="text-[10px] text-gray-400">Dodatkowa ochrona biometryczna dla akcji o ryzyku krytycznym</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={securityPolicy.requireBiometricPrompt}
                  onChange={(e) => securityManager.updatePolicy({ requireBiometricPrompt: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#1e2638] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#8b5cf6]"></div>
              </label>
            </div>
          </div>

          {/* Test & Simulation button */}
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                securityManager.requestUserAuthorization({
                  actionTitle: 'Wysłanie wiadomości SMS do kontaktu Jan Kowalski',
                  category: 'communication',
                  riskLevel: 'HIGH',
                  riskReason: 'Asystent zamierza wysłać wiadomość o treści: „Spotkanie przełożone na 16:00” w Twoim imieniu z telefonu.',
                  commandText: 'Wyślij wiadomość do Jan Kowalski: Spotkanie przełożone na 16:00',
                  parameters: {
                    Odbiorca: 'Jan Kowalski (+48 600 123 456)',
                    Treść: 'Spotkanie przełożone na 16:00'
                  }
                });
              }}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600/30 via-red-500/20 to-amber-600/30 hover:bg-red-600/40 text-red-200 text-xs font-bold border border-red-500/30 transition-all flex items-center justify-center gap-2"
            >
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>🧪 Przetestuj okno autoryzacji (Symulacja wysłania wiadomości)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121824] border border-[#2d3748] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-3">
            <h2 className="text-base font-bold text-white">Importuj Kopię Zapasową Rutyn</h2>
            <p className="text-xs text-gray-400">
              Wklej wygenerowany wcześniej plik JSON z definicjami umiejętności i wyzwalaczy.
            </p>
            <textarea
              rows={6}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder='{"skills": [...], "triggers": [...]}'
              className="w-full bg-[#0a0e14] border border-[#2d3748] rounded-xl p-3 text-xs font-mono text-white outline-none focus:border-[#00e5ff]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-xs text-gray-400 hover:text-white"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={() => {
                  if (importJsonText.trim()) {
                    onImportRoutines(importJsonText.trim());
                    setShowImportModal(false);
                    setImportJsonText('');
                  }
                }}
                className="px-4 py-2 bg-[#8b5cf6] text-white text-xs font-bold rounded-xl"
              >
                Zaimportuj
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Security Audit Log Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-[#121824] border border-[#2d3748] rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
            <div className="p-4 bg-[#151e2e] border-b border-[#2d3748] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#00e5ff]/20 border border-[#00e5ff]/30 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-[#00e5ff]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Dziennik Audytu Bezpieczeństwa</h3>
                  <p className="text-[11px] text-gray-400">
                    Rejestr wszystkich zatwierdzonych, zablokowanych i dopuszczonych operacji agenta
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="text-gray-400 hover:text-white p-1 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto space-y-2.5">
              {auditLog.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400">
                  Dziennik audytu jest pusty. Brak zarejestrowanych operacji.
                </div>
              ) : (
                auditLog.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-[#0a0e14] border border-white/5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                            item.status === 'APPROVED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : item.status === 'REJECTED'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}
                        >
                          {item.status === 'APPROVED'
                            ? '✓ ZATWIERDZONO'
                            : item.status === 'REJECTED'
                            ? '✕ ODRZUCONO'
                            : '⚡ AUTO-ZGODA'}
                        </span>

                        <span className="font-semibold text-white truncate">{item.actionTitle}</span>
                      </div>

                      <div className="text-[11px] text-gray-400 pl-1">{item.details}</div>
                    </div>

                    <div className="text-[10px] font-mono text-gray-500 shrink-0 text-right">
                      {new Date(item.timestamp).toLocaleString('pl-PL')}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3.5 bg-[#0a0e14] border-t border-[#2d3748] flex items-center justify-between">
              <button
                type="button"
                onClick={() => securityManager.clearAuditLog()}
                className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-xl hover:bg-red-950/30 transition-colors"
              >
                Wyczyść dziennik
              </button>

              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-2 bg-[#1e2638] hover:bg-[#2d3748] text-white text-xs font-bold rounded-xl transition-colors"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Model Manager Modal (HuggingFace Hub / Local Device / Playground) */}
      <ModelManagerModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        onModelChanged={(model) => {
          setActiveOfflineModelId(model.id);
        }}
      />
    </div>
  );
};
