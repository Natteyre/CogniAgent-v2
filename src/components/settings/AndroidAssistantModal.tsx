import React, { useState } from 'react';
import {
  Smartphone,
  X,
  ExternalLink,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Copy,
  ChevronRight,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { soundAndHaptics } from '../../services/soundAndHaptics';

interface AndroidAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchPipMode?: () => void;
}

export const AndroidAssistantModal: React.FC<AndroidAssistantModalProps> = ({
  isOpen,
  onClose,
  onLaunchPipMode
}) => {
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  const manifestSnippet = `<service
    android:name=".CogniAgentVoiceInteractionService"
    android:label="CogniAgent AI"
    android:permission="android.permission.BIND_VOICE_INTERACTION"
    android:exported="true">
    <meta-data
        android:name="android.voice_interaction"
        android:resource="@xml/voice_interaction_service" />
    <intent-filter>
        <action android:name="android.service.voice.VoiceInteractionService" />
        <action android:name="android.intent.action.ASSIST" />
    </intent-filter>
</service>`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(manifestSnippet);
    setCopiedCode(true);
    soundAndHaptics.playSuccessChime();
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handlePipClick = () => {
    soundAndHaptics.playSuccessChime();
    if (onLaunchPipMode) {
      onLaunchPipMode();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#121824] border border-[#00e5ff]/30 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#2d3748] flex items-center justify-between bg-[#151e2e]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#00e5ff]/20 to-[#8b5cf6]/20 border border-[#00e5ff]/40 flex items-center justify-center text-[#00e5ff]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5">
                <span>Domyślny Asystent Androida</span>
                <span className="text-[10px] bg-[#00e5ff]/15 text-[#00e5ff] px-1.5 py-0.2 rounded font-mono font-bold">
                  System Assist
                </span>
              </h2>
              <p className="text-[11px] text-gray-400">
                Wywoływanie gestem przeciągnięcia lub przyciskiem zasilania
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 overflow-y-auto text-xs text-gray-300">
          {/* Explanation Banner */}
          <div className="p-3 rounded-xl bg-[#1e2638]/70 border border-[#00e5ff]/20 space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <Zap className="w-4 h-4 text-[#00e5ff]" />
              <span>Jak to działa w Androidzie?</span>
            </div>
            <p className="text-[11px] leading-relaxed text-gray-300">
              W systemie Android możesz zastąpić Google Gemini / Asystenta Google aplikacją <strong>CogniAgent</strong>. Wtedy przeciągnięcie palcem z dolnego rogu ekranu lub przytrzymanie przycisku zasilania wywołuje pływający dymek z falą Gemini Live nad dowolną otwartą aplikacją.
            </p>
          </div>

          {/* Picture-in-Picture real OS Floating Window */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#00e5ff]/10 to-[#8b5cf6]/10 border border-[#00e5ff]/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-xs flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#00e5ff]" />
                <span>Pływający Dymek na Prawdziwym Pulpicie (PiP)</span>
              </span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                Dostępne w Chrome
              </span>
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              Standard Picture-in-Picture (PiP) pozwala wyświetlić miniaturowy dymek asystenta na <strong>prawdziwym pulpicie i nad dowolną aplikacją</strong> Twojego telefonu lub komputera.
            </p>
            {onLaunchPipMode && (
              <button
                type="button"
                onClick={handlePipClick}
                className="w-full py-2 px-3 rounded-xl bg-[#00e5ff] hover:bg-[#00c8e0] text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-[0_0_12px_rgba(0,229,255,0.3)]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Uruchom Pływający Dymek (PiP)</span>
              </button>
            )}
          </div>

          {/* Step-by-Step Android System Settings Guide */}
          <div className="space-y-2">
            <h3 className="font-bold text-white text-xs flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>Instrukcja ustawienia w telefonie z Androidem:</span>
            </h3>

            <div className="space-y-1.5 pl-1">
              <div className="flex items-start gap-2 bg-[#151e2e] p-2.5 rounded-xl border border-white/5">
                <span className="w-5 h-5 rounded-full bg-[#00e5ff]/20 text-[#00e5ff] font-bold text-[10px] flex items-center justify-center shrink-0">
                  1
                </span>
                <span className="text-[11px] leading-tight">
                  Otwórz <strong>Ustawienia</strong> w telefonie ➔ wejdź w zakładkę <strong>Aplikacje</strong>.
                </span>
              </div>

              <div className="flex items-start gap-2 bg-[#151e2e] p-2.5 rounded-xl border border-white/5">
                <span className="w-5 h-5 rounded-full bg-[#00e5ff]/20 text-[#00e5ff] font-bold text-[10px] flex items-center justify-center shrink-0">
                  2
                </span>
                <span className="text-[11px] leading-tight">
                  Wybierz <strong>Domyślne aplikacje</strong> ➔ kliknij <strong>Aplikacja asystenta cyfrowego</strong>.
                </span>
              </div>

              <div className="flex items-start gap-2 bg-[#151e2e] p-2.5 rounded-xl border border-white/5">
                <span className="w-5 h-5 rounded-full bg-[#00e5ff]/20 text-[#00e5ff] font-bold text-[10px] flex items-center justify-center shrink-0">
                  3
                </span>
                <span className="text-[11px] leading-tight">
                  Wskaż <strong>CogniAgent</strong> jako domyślnego asystenta. Od tego momentu gest z dołu ekranu wywołuje dymek CogniAgenta!
                </span>
              </div>
            </div>
          </div>

          {/* Developer Android Manifest Specs */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-gray-400" />
                <span>Konfiguracja APK (Capacitor / Android Studio):</span>
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[10px] text-[#00e5ff] hover:text-white flex items-center gap-1"
              >
                {copiedCode ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? 'Skopiowano!' : 'Kopiuj'}</span>
              </button>
            </div>
            <pre className="bg-[#0a0e14] border border-white/10 rounded-xl p-2.5 text-[9px] font-mono text-gray-300 overflow-x-auto select-all leading-tight">
              {manifestSnippet}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#2d3748] bg-[#151e2e] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
