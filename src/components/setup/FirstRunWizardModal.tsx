import React, { useState, useEffect } from 'react';
import {
  Mic,
  Camera,
  Volume2,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Zap,
  Sliders,
  Sparkles,
  Layers,
  ChevronRight,
  Info,
  Lock,
  ArrowRight
} from 'lucide-react';
import { androidNativeBridge, SystemPermissionsState } from '../../services/androidNativeBridge';
import { ttsManager } from '../../services/ttsManager';
import { soundAndHaptics } from '../../services/soundAndHaptics';
import { LlmSettings } from '../../types';

interface FirstRunWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  llmSettings: LlmSettings;
  onUpdateSettings: (settings: LlmSettings) => void;
  onOpenModelManager: () => void;
}

export const FirstRunWizardModal: React.FC<FirstRunWizardModalProps> = ({
  isOpen,
  onClose,
  llmSettings,
  onUpdateSettings,
  onOpenModelManager
}) => {
  const [step, setStep] = useState<number>(1);
  const [permissions, setPermissions] = useState<SystemPermissionsState>(() =>
    androidNativeBridge.getPermissions()
  );
  const [isMicRequesting, setIsMicRequesting] = useState(false);
  const [isCamRequesting, setIsCamRequesting] = useState(false);
  const [isTtsTesting, setIsTtsTesting] = useState(false);
  const [ttsSuccess, setTtsSuccess] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(llmSettings.apiKey || '');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(
    llmSettings.voiceLanguage || ''
  );

  useEffect(() => {
    const unsub = androidNativeBridge.subscribe((state) => {
      setPermissions(state);
    });
    const unsubVoices = ttsManager.subscribeVoices((voices) => {
      setAvailableVoices(voices);
      if (!selectedVoiceName && voices.length > 0) {
        const pl = voices.find((v) => v.lang.toLowerCase().includes('pl'));
        setSelectedVoiceName(pl ? pl.name : voices[0].name);
      }
    });

    return () => {
      unsub();
      unsubVoices();
    };
  }, [selectedVoiceName]);

  if (!isOpen) return null;

  const handleRequestMic = async () => {
    setIsMicRequesting(true);
    soundAndHaptics.playClick();
    const granted = await androidNativeBridge.requestMicrophonePermission();
    setIsMicRequesting(false);
    if (granted) {
      soundAndHaptics.playSuccessChime();
    }
  };

  const handleRequestCam = async () => {
    setIsCamRequesting(true);
    soundAndHaptics.playClick();
    const granted = await androidNativeBridge.requestCameraPermission();
    setIsCamRequesting(false);
    if (granted) {
      soundAndHaptics.playSuccessChime();
    }
  };

  const handleTestTts = async () => {
    setIsTtsTesting(true);
    soundAndHaptics.playClick();
    ttsManager.setSelectedVoiceByName(selectedVoiceName);
    const success = await ttsManager.testVoice(
      'Cześć! System syntezy głosu CogniAgent działa poprawnie na Twoim telefonie.'
    );
    setIsTtsTesting(false);
    setTtsSuccess(success);
    androidNativeBridge.markTtsTested();
    soundAndHaptics.playSuccessChime();
  };

  const handleSaveApiKey = () => {
    const updated = { ...llmSettings, apiKey: apiKeyInput.trim(), voiceLanguage: selectedVoiceName };
    onUpdateSettings(updated);
    soundAndHaptics.playSuccessChime();
  };

  const handleFinishWizard = () => {
    localStorage.setItem('cogni_onboarding_completed', 'true');
    handleSaveApiKey();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-[#0f172a] border border-cyan-500/30 rounded-2xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl shadow-cyan-950/50 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white tracking-wide">
                Konfigurator Asystenta CogniAgent
              </h2>
              <p className="text-xs text-slate-400">
                Krok {step} z 4 • Niezbędne uprawnienia i konfiguracja silnika
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
          >
            Pomiń
          </button>
        </div>

        {/* Step Indicator */}
        <div className="grid grid-cols-4 gap-1 p-2 bg-slate-950/40 border-b border-slate-800/80">
          {[
            { num: 1, label: 'Sprzęt' },
            { num: 2, label: 'Głos TTS' },
            { num: 3, label: 'System' },
            { num: 4, label: 'Mózg AI' }
          ].map((item) => (
            <button
              key={item.num}
              onClick={() => setStep(item.num)}
              className={`py-1.5 px-2 text-center rounded-lg text-xs font-medium transition-all ${
                step === item.num
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.num}. {item.label}
            </button>
          ))}
        </div>

        {/* Wizard Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4 text-sm text-slate-300">
          {/* STEP 1: Hardware Permissions */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="bg-slate-900/50 p-3.5 rounded-xl border border-slate-800">
                <h3 className="font-medium text-white mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  Rzeczywiste uprawnienia sprzętowe Androida
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Aby CogniAgent mógł nasłuchiwać Twoich poleceń głosowych oraz widzieć otoczenie w trybie Gemini Live Vision, konieczne jest wywołanie natywnego okna uprawnień systemu Android.
                </p>
              </div>

              {/* Microphone Card */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      permissions.microphone
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Mic className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-white flex items-center gap-2">
                      Mikrofon
                      {permissions.microphone ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-normal">
                          Przyznano
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-normal">
                          Wymagane
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      Do ciągłego nasłuchu mowy i przerywania Barge-In
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleRequestMic}
                  disabled={isMicRequesting}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    permissions.microphone
                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/60'
                      : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20'
                  }`}
                >
                  {permissions.microphone ? 'Zezwolono ✓' : 'Zezwól na Mikrofon'}
                </button>
              </div>

              {/* Camera Card */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      permissions.camera
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium text-white flex items-center gap-2">
                      Kamera
                      {permissions.camera ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-normal">
                          Przyznano
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-normal">
                          Opcjonalne
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      Do analizy wizualnej Gemini Live Vision
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleRequestCam}
                  disabled={isCamRequesting}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    permissions.camera
                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/60'
                      : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20'
                  }`}
                >
                  {permissions.camera ? 'Zezwolono ✓' : 'Zezwól na Aparat'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Speech Synthesis & TTS */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="bg-slate-900/50 p-3.5 rounded-xl border border-slate-800">
                <h3 className="font-medium text-white mb-1 flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-cyan-400" />
                  Synteza Mowy (Głos Asystenta)
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  CogniAgent posiada dwuwarstwowy silnik głosu: natywny Web Speech API oraz bezpieczny strumień audio wysokiej rozdzielczości (dla WebView w telefonach bez fabrycznego syntezatora).
                </p>
              </div>

              {/* Voice selection */}
              <div>
                <label className="text-xs font-medium text-slate-300 mb-1.5 block">
                  Wybierz preferowany głos:
                </label>
                <select
                  value={selectedVoiceName}
                  onChange={(e) => setSelectedVoiceName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Automatyczny polski głos</option>
                  {availableVoices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>

              {/* Test Button */}
              <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col items-center text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <Volume2 className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="font-medium text-white">Przetestuj głośnik telefonu</div>
                  <div className="text-xs text-slate-400 max-w-xs mt-0.5">
                    Kliknij poniższy przycisk, aby usłyszeć wypowiedź testową i odblokować bufor audio w systemie Android.
                  </div>
                </div>

                <button
                  onClick={handleTestTts}
                  disabled={isTtsTesting}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium text-xs hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-cyan-500/20"
                >
                  {isTtsTesting ? 'Odtwarzanie dźwięku...' : '▶️ Odtwórz test mowy (TTS)'}
                </button>

                {ttsSuccess && (
                  <div className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Dźwięk został pomyślnie wygenerowany!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Android System Integration */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-slate-900/50 p-3.5 rounded-xl border border-slate-800">
                <h3 className="font-medium text-white mb-1 flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-cyan-400" />
                  Integracja z systemem Android (Huawei EMUI)
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Aplikacja została skompilowana z filtrem intencji <code className="text-cyan-400">android.intent.action.ASSIST</code>, dzięki czemu możesz ustawić ją jako domyślnego asystenta urządzenia!
                </p>
              </div>

              {/* Default Assistant Button */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-medium text-white text-xs">Domyślna aplikacja asystenta</div>
                  <div className="text-[11px] text-slate-400">
                    Wybierz CogniAgent zamiast Asystenta Google / Huawei Celia
                  </div>
                </div>
                <button
                  onClick={() => androidNativeBridge.openDefaultAssistantSettings()}
                  className="px-3 py-1.5 rounded-lg bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs hover:bg-cyan-600/50 flex items-center gap-1"
                >
                  Otwórz <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {/* Accessibility Service Button */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-medium text-white text-xs">Usługa Dostępności Androida</div>
                  <div className="text-[11px] text-slate-400">
                    Wymagane do automatyzacji klikania i czytania ekranu
                  </div>
                </div>
                <button
                  onClick={() => androidNativeBridge.openAccessibilitySettings()}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs flex items-center gap-1"
                >
                  Ustawienia <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {/* Overlay Permission Button */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-medium text-white text-xs">Rysowanie nad aplikacjami (Dymek)</div>
                  <div className="text-[11px] text-slate-400">
                    Pozwala wyświetlać pływającą wstęgę asystenta nad WhatsAppem i pulpitem
                  </div>
                </div>
                <button
                  onClick={() => androidNativeBridge.openOverlayPermissionSettings()}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs flex items-center gap-1"
                >
                  Ustawienia <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              {/* Notification Access Button */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-medium text-white text-xs">Dostęp do Powiadomień</div>
                  <div className="text-[11px] text-slate-400">
                    Do odczytywania powiadomień SMS i komunikatorów
                  </div>
                </div>
                <button
                  onClick={() => androidNativeBridge.openNotificationListenerSettings()}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs flex items-center gap-1"
                >
                  Ustawienia <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: AI Engine Setup */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="bg-slate-900/50 p-3.5 rounded-xl border border-slate-800">
                <h3 className="font-medium text-white mb-1 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  Wybór Mózgu AI (Bez atrap!)
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Modele językowe (SLM) o wielkości 1-2 GB nie mogą być wbudowane w plik instalacyjny APK (przekroczyłyby limit Androida). Wybierz sposób zasilania asystenta:
                </p>
              </div>

              {/* Mode A: Gemini Cloud (Recommended) */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/40 to-blue-950/40 border border-cyan-500/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-white text-xs flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    Opcja 1: Chmura Gemini 2.5 Flash (Zalecane)
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                    Błyskawiczne
                  </span>
                </div>
                <div className="text-xs text-slate-300">
                  Działa natychmiast, bez pobierania gigabajtów danych. Umożliwia zaawansowane rozumowanie, widzenie na żywo oraz sterowanie telefonem.
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="Wklej swój Google Gemini API Key (lub pozostaw puste dla trybu lokalnego)"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Mode B: Local SLM (HuggingFace) */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-white text-xs flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    Opcja 2: Lokalny model offline (HuggingFace)
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    Wymaga pobrania
                  </span>
                </div>
                <div className="text-xs text-slate-400">
                  Możesz pobrać model Qwen 2.5 (350–980 MB) bezpośrednio do pamięci telefonu przez menedżer modeli w aplikacji (zalecane połączenie Wi-Fi).
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onOpenModelManager();
                  }}
                  className="w-full py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
                >
                  Otwórz Menedżer Modeli i Pobierz Wagi
                </button>
              </div>

              {/* Mode C: Built-in Rule-Based Fast Path */}
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs text-slate-400">
                💡 <strong className="text-slate-300">Działanie offline bez modeli:</strong> Nawet bez pobierania modeli SLM, wbudowany silnik regułowy błyskawicznie obsługuje polecenia: latarka, telefon, SMS, głośność, bateria, timer, jasność ekranu.
              </div>
            </div>
          )}
        </div>

        {/* Wizard Footer Buttons */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-medium"
            >
              Wstecz
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-cyan-600/20"
            >
              Dalej <ChevronRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleFinishWizard}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-medium flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
            >
              Zapisz i Uruchom Asystenta <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
