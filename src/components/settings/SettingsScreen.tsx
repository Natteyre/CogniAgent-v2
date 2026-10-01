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
  Flashlight,
  Bluetooth,
  Battery,
  BatteryCharging,
  Layers,
  CheckCircle,
  AlertCircle,
  FileCode,
  FileDown,
  Trash2,
  ShieldCheck,
  Zap,
  Moon,
  Sun,
  BellOff,
  ChevronRight,
  ExternalLink,
  FolderOpen
} from 'lucide-react';
import { HardwareState, KirinTelemetry, LlmSettings, DownloadState, OfflineModelInfo } from '../../types';
import { hardwareManager } from '../../services/hardwareManager';
import { modelManager } from '../../services/modelManager';
import { ModelManagerModal } from '../models/ModelManagerModal';

interface SettingsScreenProps {
  llmSettings: LlmSettings;
  hardwareState: HardwareState;
  testConnectionStatus: string | null;
  availableVoices: string[];
  telemetry: KirinTelemetry;
  downloadState: DownloadState;
  isNluModelInstalled: boolean;
  modelSizeMB: number;
  isFloatingActive: boolean;
  onUpdateSettings: (settings: LlmSettings) => void;
  onTestConnection: () => void;
  onTestVoiceSpeech: () => void;
  onToggleTorch: () => void;
  onToggleBluetooth: () => void;
  onRefreshHardware: () => void;
  onDownloadModel: () => void;
  onDeleteModel: () => void;
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
  downloadState,
  isNluModelInstalled,
  modelSizeMB,
  isFloatingActive,
  onUpdateSettings,
  onTestConnection,
  onTestVoiceSpeech,
  onToggleTorch,
  onToggleBluetooth,
  onRefreshHardware,
  onDownloadModel,
  onDeleteModel,
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

  useEffect(() => {
    const unsub = modelManager.subscribeModelList((list) => {
      setOfflineModels(list);
      setActiveOfflineModelId(modelManager.getActiveModelId());
    });
    return unsub;
  }, []);

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

  const handleRunHuaweiWizard = () => {
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
            LLM Cloud, EMUI 10 Battery Wizard, Kirin 980 Hardware
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
        {/* Huawei / EMUI 10 Optimization & PowerGenie Wizard */}
        <div className="bg-gradient-to-br from-[#121824] via-[#1a2233] to-[#121824] border-2 border-[#00e5ff]/40 rounded-2xl p-4 shadow-[0_0_20px_rgba(0,229,255,0.15)] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#00e5ff]/20 border border-[#00e5ff]/40 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-[#00e5ff]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Przewodnik Huawei / EMUI 10 (PowerGenie Guard)</span>
                  {isFullyOptimized && (
                    <span className="bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30 text-[10px] px-1.5 py-0.2 rounded font-bold">
                      Aktywny
                    </span>
                  )}
                </h2>
                <p className="text-[11px] text-gray-300">
                  Ochrona procesów Kirin 980 przed ubijaniem w tle po wygaszeniu ekranu
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#0a0e14]/80 p-3 rounded-xl border border-white/5 space-y-2 text-xs">
            <div className="flex items-center justify-between text-gray-300">
              <span className="flex items-center gap-2">
                <CheckCircle className={`w-4 h-4 ${huawei.autostartEnabled ? 'text-[#10b981]' : 'text-gray-500'}`} />
                <span>Autostart i ochrona w tle (Huawei Protected Apps)</span>
              </span>
              <button
                type="button"
                onClick={() => hardwareManager.updateHuaweiOptimization({ autostartEnabled: !huawei.autostartEnabled })}
                className="text-[11px] font-semibold text-[#00e5ff] hover:underline"
              >
                {huawei.autostartEnabled ? 'Włączone' : 'Włącz'}
              </button>
            </div>

            <div className="flex items-center justify-between text-gray-300">
              <span className="flex items-center gap-2">
                <CheckCircle className={`w-4 h-4 ${huawei.batteryOptimizationIgnored ? 'text-[#10b981]' : 'text-gray-500'}`} />
                <span>Wyłączenie optymalizacji baterii (IGNORE_BATTERY)</span>
              </span>
              <button
                type="button"
                onClick={() => hardwareManager.updateHuaweiOptimization({ batteryOptimizationIgnored: !huawei.batteryOptimizationIgnored })}
                className="text-[11px] font-semibold text-[#00e5ff] hover:underline"
              >
                {huawei.batteryOptimizationIgnored ? 'Wyłączona' : 'Wyłącz'}
              </button>
            </div>

            <div className="flex items-center justify-between text-gray-300">
              <span className="flex items-center gap-2">
                <CheckCircle className={`w-4 h-4 ${huawei.powerGenieGuarded ? 'text-[#10b981]' : 'text-gray-500'}`} />
                <span>Blokada zabijania usług przez PowerGenie</span>
              </span>
              <button
                type="button"
                onClick={() => hardwareManager.updateHuaweiOptimization({ powerGenieGuarded: !huawei.powerGenieGuarded })}
                className="text-[11px] font-semibold text-[#00e5ff] hover:underline"
              >
                {huawei.powerGenieGuarded ? 'Aktywna' : 'Włącz'}
              </button>
            </div>

            <div className="flex items-center justify-between text-gray-300">
              <span className="flex items-center gap-2">
                <CheckCircle className={`w-4 h-4 ${huawei.lockScreenKeepAlive ? 'text-[#10b981]' : 'text-gray-500'}`} />
                <span>Nasłuch słowa kluczowego przy wygaszonym ekranie</span>
              </span>
              <button
                type="button"
                onClick={() => hardwareManager.updateHuaweiOptimization({ lockScreenKeepAlive: !huawei.lockScreenKeepAlive })}
                className="text-[11px] font-semibold text-[#00e5ff] hover:underline"
              >
                {huawei.lockScreenKeepAlive ? 'Aktywny' : 'Włącz'}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRunHuaweiWizard}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#00e5ff] to-[#8b5cf6] text-black font-extrabold text-xs shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4 fill-black" />
            <span>⚡ Zastosuj pełną konfigurację Huawei P30 Pro / EMUI 10</span>
          </button>

          {wizardSuccessMsg && (
            <div className="bg-[#10b981]/20 border border-[#10b981]/40 text-[#10b981] p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Pomyślnie zoptymalizowano ustawienia zasilania i autostartu dla Huawei EMUI 10!</span>
            </div>
          )}
        </div>

        {/* Card 1: Kirin 980 Telemetry & Savings */}
        <div
          data-testid="telemetry_card"
          className="bg-[#121824] border border-[#2d3748] rounded-2xl p-4 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-[#00e5ff]/20 border border-[#00e5ff]/30 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-[#00e5ff]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Panel Telemetrii Kirin 980 NLU</h2>
              <span className="text-[11px] text-[#00e5ff] font-semibold">
                {telemetry.bigCoresActive} rdzenie Cortex-A76 Big Cores aktywne
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-white/5">
            <div className="bg-[#0a0e14] p-2 rounded-xl border border-white/5">
              <div className="text-[11px] text-gray-400">Czas NLU</div>
              <div className="text-base sm:text-lg font-extrabold text-[#00e5ff] mt-0.5">
                {telemetry.lastLocalInferenceMs > 0 ? `${telemetry.lastLocalInferenceMs} ms` : '< 15 ms'}
              </div>
            </div>

            <div className="bg-[#0a0e14] p-2 rounded-xl border border-white/5">
              <div className="text-[11px] text-gray-400">Zapytania lokalne</div>
              <div className="text-base sm:text-lg font-extrabold text-[#8b5cf6] mt-0.5">
                {telemetry.localQueriesHandled}
              </div>
            </div>

            <div className="bg-[#0a0e14] p-2 rounded-xl border border-white/5">
              <div className="text-[11px] text-gray-400">Zaoszczędzone tokeny</div>
              <div className="text-base sm:text-lg font-extrabold text-[#10b981] mt-0.5">
                {telemetry.totalSavedTokens}
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

          {/* Active Model Overview Bar */}
          <div className="bg-[#0a0e14] border border-white/5 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] text-gray-400 uppercase font-mono tracking-wider">
                Aktywny silnik offline na urządzeniu:
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-white flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="text-[#00e5ff] break-words">
                  {offlineModels.find((m) => m.id === activeOfflineModelId)?.name || 'GLiNER Polish NLU'}
                </span>
                <span className="bg-[#1e2638] text-gray-300 text-[10px] font-mono px-2 py-0.5 rounded border border-white/5 shrink-0">
                  {offlineModels.find((m) => m.id === activeOfflineModelId)?.format || 'ONNX'}
                </span>
                <span className="bg-[#8b5cf6]/20 text-[#8b5cf6] text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0">
                  {offlineModels.find((m) => m.id === activeOfflineModelId)?.precision || 'INT4'}
                </span>
              </div>
              <div className="text-[11px] text-gray-400 mt-1.5 leading-relaxed break-words">
                Wymagania: <span className="text-[#00e5ff] font-semibold">{offlineModels.find((m) => m.id === activeOfflineModelId)?.recommendedHardware || 'Kirin 980'}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 sm:pt-0 shrink-0">
              <button
                type="button"
                onClick={() => setIsModelModalOpen(true)}
                className="w-full sm:w-auto py-2 px-3.5 rounded-xl bg-gradient-to-r from-[#00e5ff] to-[#8b5cf6] text-black font-extrabold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 hover:opacity-95 shrink-0 active:scale-[0.98]"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Pobierz z HuggingFace</span>
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

        {/* Card 5: Hardware Diagnostics & System States */}
        <div
          data-testid="hardware_state_card"
          className="bg-[#121824] border border-[#2d3748] rounded-2xl p-4 shadow-sm space-y-3"
        >
          <h2 className="text-sm font-bold text-white mb-2">
            Stan Sprzętu i Usług (Kirin 980)
          </h2>

          {/* Floating Overlay Switch */}
          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <Layers className={`w-4 h-4 ${isFloatingActive ? 'text-[#00e5ff]' : 'text-gray-400'}`} />
              <div>
                <div className="text-xs font-semibold text-white">
                  Pływający Dymek Asystenta (True Floating Chat Overlay)
                </div>
                <div className="text-[11px] text-gray-400">
                  {isFloatingActive ? 'Dymek aktywny nad aplikacjami' : 'Wyłączony'}
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

          {/* Do Not Disturb (DND) Switch */}
          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <BellOff className={`w-4 h-4 ${hardwareState.isDndActive ? 'text-red-400' : 'text-gray-400'}`} />
              <div>
                <div className="text-xs font-semibold text-white">Tryb Nie Przeszkadzać (DND)</div>
                <div className="text-[11px] text-gray-400">
                  {hardwareState.isDndActive ? 'Wyciszenie powiadomień aktywne' : 'Wyłączony'}
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={hardwareState.isDndActive}
                onChange={() => hardwareManager.toggleDndMode()}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#1e2638] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-500"></div>
            </label>
          </div>

          {/* Screen Brightness Slider */}
          <div className="py-1.5 border-b border-white/5 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2 text-white">
                <Sun className="w-4 h-4 text-amber-400" />
                <span>Jasność ekranu</span>
              </span>
              <span className="font-mono text-[#00e5ff] font-bold">{hardwareState.brightnessPercent}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              value={hardwareState.brightnessPercent}
              onChange={(e) => hardwareManager.setBrightness(parseInt(e.target.value, 10))}
              className="w-full accent-[#00e5ff]"
            />
          </div>

          {/* Battery Indicator */}
          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              {hardwareState.isCharging ? (
                <BatteryCharging className="w-4 h-4 text-[#10b981]" />
              ) : (
                <Battery className="w-4 h-4 text-gray-400" />
              )}
              <div>
                <div className="text-xs font-semibold text-white">Bateria</div>
                <div className="text-[11px] text-gray-400">
                  {hardwareState.isCharging ? 'Ładowanie aktywne' : 'Praca na baterii'}
                </div>
              </div>
            </div>
            <span className="text-xs font-bold text-[#00e5ff] font-mono">
              {hardwareState.batteryPercent}%
            </span>
          </div>

          {/* Bluetooth Switch */}
          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <Bluetooth
                className={`w-4 h-4 ${
                  hardwareState.isBluetoothEnabled ? 'text-[#00e5ff]' : 'text-gray-400'
                }`}
              />
              <div>
                <div className="text-xs font-semibold text-white">Bluetooth</div>
                <div className="text-[11px] text-gray-400">
                  {hardwareState.isBluetoothEnabled ? 'Włączony' : 'Wyłączony'}
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={hardwareState.isBluetoothEnabled}
                onChange={onToggleBluetooth}
                data-testid="bluetooth_switch"
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#1e2638] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00e5ff]"></div>
            </label>
          </div>

          {/* Flashlight Switch */}
          <div className="flex items-center justify-between py-1.5 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <Flashlight
                className={`w-4 h-4 ${hardwareState.isTorchOn ? 'text-amber-400' : 'text-gray-400'}`}
              />
              <div>
                <div className="text-xs font-semibold text-white">
                  Latarka LED (Camera Torch)
                </div>
                <div className="text-[11px] text-gray-400">
                  {hardwareState.isTorchOn ? 'Dioda aktywna' : 'Dioda wyłączona'}
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={hardwareState.isTorchOn}
                onChange={onToggleTorch}
                data-testid="torch_switch"
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#1e2638] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-400"></div>
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
