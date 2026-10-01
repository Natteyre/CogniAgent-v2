import React, { useState, useEffect } from 'react';
import {
  Eye,
  X,
  RefreshCw,
  MousePointer,
  FileText,
  Languages,
  CheckCircle,
  Copy,
  Camera,
  Smartphone,
  Layers,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { ScreenInspectionData } from '../../types';
import { screenInspector } from '../../services/screenInspector';
import { soundAndHaptics } from '../../services/soundAndHaptics';

interface ScreenInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ScreenInspectionModal: React.FC<ScreenInspectionModalProps> = ({
  isOpen,
  onClose
}) => {
  const [data, setData] = useState<ScreenInspectionData | null>(null);
  const [activeTab, setActiveTab] = useState<'nodes' | 'ocr' | 'screenshot' | 'summary' | 'architecture'>('nodes');
  const [copied, setCopied] = useState(false);
  const [lastClickedNode, setLastClickedNode] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);

  const runLocalDomInspection = () => {
    setCaptureError(null);
    const res = screenInspector.inspectCurrentScreen();
    setData(res);
    soundAndHaptics.playSuccessChime();
  };

  const handleCaptureRealScreen = async () => {
    setIsCapturing(true);
    setCaptureError(null);
    try {
      const res = await screenInspector.captureRealDeviceScreen();
      setData(res);
      setActiveTab('screenshot');
    } catch (err: any) {
      setCaptureError(err.message || 'Nie udało się przechwycić ekranu.');
    } finally {
      setIsCapturing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runLocalDomInspection();
    }
  }, [isOpen]);

  if (!isOpen || !data) return null;

  const handleCopyOcr = () => {
    navigator.clipboard.writeText(data.fullOcrText);
    setCopied(true);
    soundAndHaptics.triggerHaptic(20);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNodeClick = (text: string) => {
    setLastClickedNode(text);
    const success = screenInspector.clickNodeByText(text);
    if (success) {
      setTimeout(() => {
        runLocalDomInspection();
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#121824] border border-[#2d3748] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="bg-[#151e2e] border-b border-[#2d3748] p-3.5 sm:p-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00e5ff] to-[#8b5cf6] p-0.5 shadow-[0_0_15px_rgba(0,229,255,0.4)] shrink-0">
              <div className="w-full h-full bg-[#121824] rounded-[10px] flex items-center justify-center">
                <Eye className="w-5 h-5 text-[#00e5ff]" />
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>Inspekcja Ekranu & OCR</span>
                <span className="bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/30 text-[10px] font-mono px-2 py-0.5 rounded-full">
                  MediaProjection / VLM
                </span>
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                Rozpoznawanie węzłów interfejsu UI, formularzy i tekstu w czasie rzeczywistym
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={runLocalDomInspection}
              title="Odśwież analizę ekranu"
              className="p-2 rounded-xl text-gray-400 hover:text-[#00e5ff] hover:bg-[#00e5ff]/10 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mode Selector & Toolbar */}
        <div className="bg-[#0e141f] border-b border-[#2d3748] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={runLocalDomInspection}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                !data.isExternalAppCapture
                  ? 'bg-[#00e5ff] text-black font-extrabold shadow-sm'
                  : 'bg-[#1e2638] text-gray-300 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Aplikacja (DOM)</span>
            </button>

            <button
              type="button"
              onClick={handleCaptureRealScreen}
              disabled={isCapturing}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                data.isExternalAppCapture
                  ? 'bg-[#8b5cf6] text-white font-extrabold shadow-sm'
                  : 'bg-[#1e2638] text-gray-300 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-[#00e5ff]" />
              <span>{isCapturing ? 'Przechwytywanie...' : 'Pulpit / Inne aplikacje'}</span>
            </button>
          </div>

          <div className="text-[11px] text-gray-400 font-mono">
            {new Date(data.timestamp).toLocaleTimeString('pl-PL')}
          </div>
        </div>

        {/* Capture Error Banner if any */}
        {captureError && (
          <div className="bg-amber-950/40 border-b border-amber-500/30 px-4 py-2 text-xs text-amber-300 flex items-center gap-2 shrink-0">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{captureError}</span>
          </div>
        )}

        {/* Tab switcher */}
        <div className="bg-[#0e141f] border-b border-[#2d3748] px-4 flex items-center gap-4 shrink-0 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('nodes')}
            className={`py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'nodes'
                ? 'border-[#00e5ff] text-[#00e5ff]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <MousePointer className="w-3.5 h-3.5" />
            <span>Węzły UI ({data.nodes.length})</span>
          </button>

          {data.screenshotDataUrl && (
            <button
              type="button"
              onClick={() => setActiveTab('screenshot')}
              className={`py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeTab === 'screenshot'
                  ? 'border-[#00e5ff] text-[#00e5ff]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Zrzut Ekranu</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab('ocr')}
            className={`py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'ocr'
                ? 'border-[#8b5cf6] text-[#8b5cf6]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Tekst OCR</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('summary')}
            className={`py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'summary'
                ? 'border-[#10b981] text-[#10b981]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>Wyjaśnienie VLM</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('architecture')}
            className={`py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'architecture'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Architektura Androida</span>
          </button>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4">
          {activeTab === 'screenshot' && data.screenshotDataUrl && (
            <div className="space-y-3 animate-fadeIn">
              <div className="text-xs text-gray-300 flex items-center justify-between">
                <span>Rzeczywisty zrzut ekranu pulpitu / innej aplikacji:</span>
                <span className="text-[#00e5ff] font-mono text-[10px]">MediaProjection Stream</span>
              </div>
              <div className="bg-[#0a0e14] p-2 rounded-2xl border border-white/10 flex items-center justify-center overflow-hidden max-h-[60vh]">
                <img
                  src={data.screenshotDataUrl}
                  alt="Zrzut ekranu zewnętrznego"
                  className="rounded-xl max-h-[55vh] object-contain shadow-2xl"
                />
              </div>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="space-y-3.5 animate-fadeIn text-xs leading-relaxed">
              <div className="bg-[#152033] border border-[#00e5ff]/30 p-4 rounded-2xl space-y-2">
                <h4 className="font-bold text-[#00e5ff] text-sm flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Działanie na Pulpicie i w Innych Aplikacjach (Android EMUI 10)
                </h4>
                <p className="text-gray-200">
                  Tak! W docelowej architekturze systemu Android asystent operuje ponad wszystkimi aplikacjami dzięki trzem kluczowym usługom systemowym:
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                <div className="bg-[#0a0e14] p-3.5 rounded-xl border border-white/5 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="w-4 h-4 text-[#10b981]" />
                    <span>1. AccessibilityService (Usługa Dostępności)</span>
                  </div>
                  <p className="text-gray-400 text-[11px]">
                    Umożliwia czytanie struktury drzewa interfejsu (<code>AccessibilityNodeInfo</code>) w dowolnej uruchomionej aplikacji (np. WhatsApp, YouTube, Chrome) oraz na pulpicie telefonu (Launcherze), a także programowe klikanie przycisków i gesty przewijania (swipes).
                  </p>
                </div>

                <div className="bg-[#0a0e14] p-3.5 rounded-xl border border-white/5 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                    <Camera className="w-4 h-4 text-[#8b5cf6]" />
                    <span>2. MediaProjectionManager & VirtualDisplay</span>
                  </div>
                  <p className="text-gray-400 text-[11px]">
                    Pobiera bezpośredni bufor klatek wideo całego ekranu telefonu (niezależnie od tego, co jest wyświetlane), przekazując zrzut do lokalnego silnika OCR / VLM opartego o procesor NPU Kirin 980.
                  </p>
                </div>

                <div className="bg-[#0a0e14] p-3.5 rounded-xl border border-white/5 space-y-1">
                  <div className="font-bold text-white flex items-center gap-1.5 text-xs">
                    <Layers className="w-4 h-4 text-[#00e5ff]" />
                    <span>3. CogniFloatingService (Pływający Dymek Nad Ekranem)</span>
                  </div>
                  <p className="text-gray-400 text-[11px]">
                    Dzięki uprawnieniu <code>SYSTEM_ALERT_WINDOW</code> asystent posiada pływający dymek zawsze widoczny na wierzchu ekranu. Dotknięcie dymka natychmiast analizuje bieżący ekran innej aplikacji bez konieczności przełączania okien.
                  </p>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'nodes' && (
            <div className="space-y-2.5">
              {lastClickedNode && (
                <div className="bg-[#10b981]/15 border border-[#10b981]/30 text-[#10b981] text-xs p-2 rounded-xl flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span className="truncate">Kliknięto element: "{lastClickedNode}"</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {data.nodes.map((node) => (
                  <div
                    key={node.id}
                    className="p-3 bg-[#0a0e14] border border-white/5 hover:border-[#00e5ff]/40 rounded-xl transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="bg-[#1e2638] text-gray-300 px-2 py-0.5 rounded font-mono font-bold">
                        {node.type.toUpperCase()}
                      </span>
                      <span className="text-gray-400 font-mono">
                        [{node.bounds.x}, {node.bounds.y}] {node.bounds.width}x{node.bounds.height}
                      </span>
                    </div>

                    <p className="text-xs text-white font-semibold line-clamp-2">
                      {node.text}
                    </p>

                    {node.clickable && (
                      <div className="pt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleNodeClick(node.text)}
                          className="px-2.5 py-1 rounded-lg bg-[#00e5ff]/15 hover:bg-[#00e5ff]/25 text-[#00e5ff] text-[11px] font-bold transition-colors flex items-center gap-1"
                        >
                          <MousePointer className="w-3 h-3" />
                          <span>Kliknij element</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'ocr' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleCopyOcr}
                  className="px-3 py-1.5 rounded-xl bg-[#1e2638] hover:bg-[#2d3748] text-[#00e5ff] text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copied ? 'Skopiowano!' : 'Kopiuj cały tekst'}</span>
                </button>
              </div>

              <pre className="bg-[#0a0e14] p-3.5 rounded-2xl border border-white/5 text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-y-auto">
                {data.fullOcrText || 'Nie wykryto żadnego tekstu na ekranie.'}
              </pre>
            </div>
          )}

          {activeTab === 'summary' && (
            <div className="space-y-3">
              <div className="bg-[#152033] border border-[#10b981]/40 rounded-2xl p-4 space-y-2">
                <h4 className="text-xs font-bold text-[#10b981] flex items-center gap-1.5">
                  <Languages className="w-4 h-4" />
                  Kognitywne podsumowanie i kontekst ekranu
                </h4>
                <p className="text-xs text-gray-200 leading-relaxed">
                  {screenInspector.translateOrExplainScreen()}
                </p>
              </div>

              <div className="bg-[#0a0e14] p-3.5 rounded-2xl border border-white/5 space-y-2 text-xs text-gray-400">
                <div className="font-bold text-white">Podpowiedź komend głosowych:</div>
                <ul className="space-y-1 list-disc list-inside">
                  <li>"Co mam na ekranie?"</li>
                  <li>"Przetłumacz ten ekran"</li>
                  <li>"Kliknij [nazwa przycisku]"</li>
                  <li>"Podsumuj treść bieżącej aplikacji"</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
