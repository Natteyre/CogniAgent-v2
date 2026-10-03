import React, { useState, useRef } from 'react';
import {
  Brain,
  X,
  Send,
  Mic,
  MicOff,
  Eye,
  Maximize2,
  Minimize2,
  MessageCircle,
  Globe,
  Music,
  Settings,
  Battery,
  Wifi,
  Signal,
  ArrowLeft,
  Sparkles,
  Smartphone,
  ChevronUp,
  Car,
  MessageSquare,
  Compass,
  FileText,
  Clock,
  SlidersHorizontal
} from 'lucide-react';
import { hardwareManager } from '../../services/hardwareManager';
import { ttsManager } from '../../services/ttsManager';
import { speechRecognizerHelper } from '../../services/speechRecognition';
import { soundAndHaptics } from '../../services/soundAndHaptics';
import { GeminiLiveWave } from '../overlay/GeminiLiveWave';

interface AndroidLauncherSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (text: string) => void;
  lastResponse?: string;
  isProcessing: boolean;
  isSpeaking?: boolean;
  rmsLevel?: number;
  onOpenHandsFree?: () => void;
  onOpenAssistantSetup?: () => void;
}

export const AndroidLauncherSimulator: React.FC<AndroidLauncherSimulatorProps> = ({
  isOpen,
  onClose,
  onSendMessage,
  lastResponse,
  isProcessing,
  isSpeaking = false,
  rmsLevel = 0,
  onOpenHandsFree,
  onOpenAssistantSetup
}) => {
  const [activeApp, setActiveApp] = useState<'home' | 'whatsapp' | 'browser' | 'spotify'>('whatsapp');
  const [isChatHeadExpanded, setIsChatHeadExpanded] = useState(false);
  const [headPos, setHeadPos] = useState({ x: 220, y: 160 });
  const [miniInputText, setMiniInputText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [mockNotification, setMockNotification] = useState<string | null>(
    'Nowa wiadomość od Mama: „Pamiętasz o zakupach i obiedzie w niedzielę?”'
  );

  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 260,
    posY: 180
  });

  if (!isOpen) return null;

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: headPos.x,
      posY: headPos.y
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    setHeadPos({
      x: Math.max(10, Math.min(window.innerWidth - 80, dragStartRef.current.posX + dx)),
      y: Math.max(40, Math.min(window.innerHeight - 80, dragStartRef.current.posY + dy))
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handleSendMini = () => {
    if (miniInputText.trim() && !isProcessing) {
      onSendMessage(miniInputText.trim());
      setMiniInputText('');
    }
  };

  const handleInspectScreen = () => {
    const appName =
      activeApp === 'whatsapp'
        ? 'WhatsApp z wiadomością od Mama: "Pamiętasz o zakupach i obiedzie w niedzielę?"'
        : activeApp === 'browser'
        ? 'Przeglądarka z artykułem o nowej misji księżycowej ESA'
        : 'Odtwarzacz Spotify z utworem Hans Zimmer - Time';
    onSendMessage(`Co jest na ekranie? Aktywna aplikacja: ${appName}`);
  };

  // Context-aware dynamic chips (Gemini style)
  const getContextChips = () => {
    switch (activeApp) {
      case 'home':
        return [
          {
            label: 'Zapytaj o ekran',
            icon: <Eye className="w-3 h-3 text-[#00e5ff]" />,
            action: handleInspectScreen
          },
          {
            label: 'Co nowego?',
            icon: <Sparkles className="w-3 h-3 text-amber-400" />,
            action: () => onSendMessage('Szybka odprawa: podsumuj krótko co nowego w telefonie i powiadomieniach')
          }
        ];
      case 'browser':
        return [
          {
            label: 'Streść tę stronę',
            icon: <Sparkles className="w-3 h-3 text-[#00e5ff]" />,
            action: () => onSendMessage('Streść ten artykuł w przeglądarce w 3 najważniejszych punktach')
          },
          {
            label: 'Wyjaśnij artykuł',
            icon: <Compass className="w-3 h-3 text-emerald-400" />,
            action: () => onSendMessage('Wyjaśnij prostym językiem o czym mówi artykuł na ekranie')
          }
        ];
      case 'whatsapp':
        return [
          {
            label: 'Odpisz na wiadomość',
            icon: <MessageCircle className="w-3 h-3 text-emerald-400" />,
            action: () => onSendMessage('Zaproponuj inteligentną i uprzejmą odpowiedź na wiadomość od Mamy na WhatsAppie')
          },
          {
            label: 'Streść rozmowę',
            icon: <FileText className="w-3 h-3 text-[#00e5ff]" />,
            action: () => onSendMessage('Podsumuj czego dotyczy ostatnia wymiana wiadomości w tym czacie')
          }
        ];
      case 'spotify':
        return [
          {
            label: 'O czym jest utwór?',
            icon: <Music className="w-3 h-3 text-[#ec4899]" />,
            action: () => onSendMessage('Opowiedz o utworze Time Hansa Zimmera ze Spotify i jego kompozycji')
          },
          {
            label: 'Zanotuj w pamięci',
            icon: <Sparkles className="w-3 h-3 text-amber-400" />,
            action: () => onSendMessage('Zapisz ten utwór w mojej lokalnej bazie wiedzy jako ulubiony soundtrack')
          }
        ];
      default:
        return [];
    }
  };

  const contextChips = getContextChips();

  const handleToggleVoice = () => {
    // Proactive Barge-In: if assistant is speaking, cut speech immediately!
    if (isSpeaking) {
      ttsManager.stop();
    }

    if (isListeningVoice) {
      speechRecognizerHelper.stopListening();
      setIsListeningVoice(false);
      soundAndHaptics.playListeningPauseChime();
    } else {
      setIsListeningVoice(true);
      soundAndHaptics.playListeningStartChime();
      speechRecognizerHelper.startListening({
        continuous: false,
        onInterimResult: (interim) => {
          if (isSpeaking && interim.trim().length > 1) {
            ttsManager.stop();
          }
        },
        onFinalResult: (text) => {
          if (isSpeaking) {
            ttsManager.stop();
          }
          setIsListeningVoice(false);
          if (text.trim()) {
            onSendMessage(text.trim());
          }
        },
        onError: () => {
          setIsListeningVoice(false);
        }
      });
    }
  };

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="fixed inset-0 z-50 bg-[#050811] text-white flex flex-col justify-between overflow-hidden select-none animate-fadeIn"
    >
      {/* Top Banner Explaining the Launcher Simulation */}
      <div className="bg-[#121824] border-b border-[#2d3748] px-4 py-2 flex items-center justify-between text-xs z-20 shrink-0">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-[#00e5ff]" />
          <span className="font-bold text-white">Symulator Pulpitu Androida (Floating Head System Service)</span>
          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-mono px-1.5 py-0.5 rounded">
            SYSTEM_ALERT_WINDOW
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onOpenAssistantSetup && (
            <button
              type="button"
              onClick={onOpenAssistantSetup}
              className="px-2.5 py-1 rounded-lg bg-[#1e2638] hover:bg-[#2d3748] border border-white/10 text-gray-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
              title="Instrukcja konfiguracji domyślnego asystenta w ustawieniach Androida"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span>Domyślny asystent</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-[#00e5ff] text-black font-bold text-xs hover:bg-[#00b4d8] transition-all flex items-center gap-1 active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Powrót do aplikacji CogniAgent</span>
          </button>
        </div>
      </div>

      {/* Simulated Android Device Screen Area */}
      <div className="flex-1 relative bg-gradient-to-b from-[#0b1329] via-[#090d1a] to-[#04060c] overflow-hidden flex flex-col">
        {/* Android Status Bar */}
        <div className="h-7 bg-black/40 backdrop-blur-sm px-4 flex items-center justify-between text-[11px] font-medium text-gray-300 z-10 shrink-0">
          <span className="font-bold text-white font-mono">12:45</span>
          <div className="flex items-center gap-2.5">
            <Wifi className="w-3.5 h-3.5 text-white" />
            <Signal className="w-3.5 h-3.5 text-white" />
            <span className="font-mono text-[10px]">88%</span>
            <Battery className="w-3.5 h-3.5 text-emerald-400" />
          </div>
        </div>

        {/* Mock Notification Toast (Floating at top) */}
        {mockNotification && (
          <div className="mx-3 mt-2 bg-[#1e2638]/95 border border-[#2d3748] rounded-xl p-2.5 shadow-xl flex items-center justify-between gap-3 text-xs z-10 animate-slideDown">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <MessageCircle className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-white text-[11px]">WhatsApp • Mama</div>
                <div className="text-gray-300 text-[10px] truncate">{mockNotification}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMockNotification(null)}
              className="text-gray-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Mock Active App Content (WhatsApp, Browser, Spotify, Home) */}
        <div className="flex-1 p-3 overflow-y-auto">
          {activeApp === 'whatsapp' && (
            <div className="max-w-md mx-auto bg-[#0b141b] rounded-2xl border border-[#202c33] p-3 shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-[#202c33] pb-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold">
                    M
                  </div>
                  <div>
                    <div className="font-bold text-white text-xs">Mama</div>
                    <div className="text-[10px] text-emerald-400">online</div>
                  </div>
                </div>
                <span className="text-[10px] text-gray-400">WhatsApp</span>
              </div>

              {/* Chat Messages */}
              <div className="space-y-2 py-2 text-xs">
                <div className="bg-[#202c33] text-gray-200 p-2.5 rounded-xl rounded-tl-none max-w-[80%]">
                  Cześć! Pamiętasz o zakupach i obiedzie w niedzielę?
                  <div className="text-[9px] text-gray-400 text-right mt-1">12:42</div>
                </div>
                <div className="bg-[#005c4b] text-white p-2.5 rounded-xl rounded-tr-none max-w-[80%] ml-auto">
                  Tak, pamiętam! Kupię wszystko po drodze.
                  <div className="text-[9px] text-emerald-200 text-right mt-1">12:44 ✓✓</div>
                </div>
              </div>

              <div className="text-[10px] text-gray-500 text-center">
                Pływający asystent CogniAgent widzi ten ekran dzięki usłudze dostępności!
              </div>
            </div>
          )}

          {activeApp === 'browser' && (
            <div className="max-w-md mx-auto bg-[#18191c] rounded-2xl border border-gray-700 p-3 shadow-2xl space-y-2">
              <div className="bg-[#26282d] rounded-xl px-3 py-1.5 text-xs text-gray-300 font-mono flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span className="truncate">https://nauka.pl/artykuly/misja-ksiezycowa-2026</span>
              </div>
              <h3 className="font-bold text-sm text-white pt-2">
                Europejska Agencja Kosmiczna ogłasza kolejny etap badań księżycowych
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed">
                Nowy program badawczy skupi się na pozyskiwaniu próbek lodu z wiecznie zacienionych kraterów bieguna południowego Księżyca...
              </p>
            </div>
          )}

          {activeApp === 'spotify' && (
            <div className="max-w-md mx-auto bg-[#121212] rounded-2xl border border-[#282828] p-4 shadow-2xl space-y-4 text-center">
              <div className="w-32 h-32 mx-auto rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-800 flex items-center justify-center shadow-lg">
                <Music className="w-12 h-12 text-white" />
              </div>
              <div>
                <div className="font-bold text-white text-sm">Time (Inception OST)</div>
                <div className="text-xs text-gray-400">Hans Zimmer</div>
              </div>
              <div className="h-1 bg-gray-700 rounded-full overflow-hidden w-full">
                <div className="h-full bg-emerald-500 w-1/3" />
              </div>
            </div>
          )}

          {activeApp === 'home' && (
            <div className="max-w-md mx-auto grid grid-cols-4 gap-4 pt-10 text-center">
              <div
                onClick={() => setActiveApp('browser')}
                className="flex flex-col items-center gap-1 cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                  <Globe className="w-6 h-6" />
                </div>
                <span className="text-[11px] text-gray-200">Chrome</span>
              </div>

              <div
                onClick={() => setActiveApp('whatsapp')}
                className="flex flex-col items-center gap-1 cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <span className="text-[11px] text-gray-200">WhatsApp</span>
              </div>

              <div
                onClick={() => setActiveApp('spotify')}
                className="flex flex-col items-center gap-1 cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-2xl bg-black border border-gray-700 flex items-center justify-center text-emerald-400 shadow-lg group-hover:scale-105 transition-transform">
                  <Music className="w-6 h-6" />
                </div>
                <span className="text-[11px] text-gray-200">Spotify</span>
              </div>

              <div
                onClick={onClose}
                className="flex flex-col items-center gap-1 cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#00e5ff] to-[#8b5cf6] flex items-center justify-center text-black font-extrabold shadow-lg group-hover:scale-105 transition-transform">
                  <Brain className="w-6 h-6" />
                </div>
                <span className="text-[11px] text-[#00e5ff] font-bold">CogniAgent</span>
              </div>
            </div>
          )}
        </div>

        {/* Android Navigation Bar */}
        <div className="h-10 bg-black/60 backdrop-blur-md px-10 flex items-center justify-between text-gray-400 shrink-0 border-t border-white/5">
          <button
            type="button"
            onClick={() => setActiveApp('home')}
            className="hover:text-white p-2"
            title="Pulpit"
          >
            <div className="w-3.5 h-3.5 rounded-full border-2 border-current" />
          </button>
          <button
            type="button"
            onClick={() => setActiveApp(activeApp === 'home' ? 'whatsapp' : 'home')}
            className="hover:text-white p-2"
            title="Przełącz aplikację"
          >
            <div className="w-3.5 h-3.5 border-2 border-current rounded-sm" />
          </button>
        </div>

        {/* --- FLOATING CHATHEAD & MINI-AGENT WIDGET --- */}
        <div
          style={{
            position: 'absolute',
            left: `${headPos.x}px`,
            top: `${headPos.y}px`,
            zIndex: 40
          }}
          className="transition-shadow"
        >
          {/* ChatHead Capsule with Gemini Live Wave Ribbon */}
          <div className="relative">
            <div
              onPointerDown={handlePointerDown}
              onClick={() => !isDragging && setIsChatHeadExpanded(!isChatHeadExpanded)}
              className="h-12 px-3 rounded-full bg-[#0c121e]/95 backdrop-blur-xl border border-[#00e5ff]/50 shadow-[0_0_25px_rgba(0,229,255,0.4)] cursor-move flex items-center gap-2 select-none active:scale-95 transition-all group hover:border-[#00e5ff]"
              title="Przeciągnij lub kliknij, aby rozwinąć asystenta"
            >
              {/* Dynamic Gemini Live Ribbon Wave */}
              <div className="w-8 h-8 rounded-full bg-[#121929] border border-white/10 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                <GeminiLiveWave
                  isSpeaking={!!isSpeaking}
                  isListening={isListeningVoice}
                  isProcessing={isProcessing}
                  rmsLevel={rmsLevel}
                  size="sm"
                />
              </div>

              <div className="flex flex-col justify-center pr-1">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-extrabold text-white tracking-tight">Cogni</span>
                  <span className="text-[8px] font-mono text-[#00e5ff] font-bold bg-[#00e5ff]/15 px-1 py-0.2 rounded">Live</span>
                </div>
                <span className="text-[9px] text-[#94a3b8] font-medium leading-none">
                  {isSpeaking ? 'Mówię (kliknij by przerwać)' : isListeningVoice ? 'Słucham...' : isProcessing ? 'Myślę...' : 'Dotknij'}
                </span>
              </div>
            </div>

            {/* Contextual Suggestion Chips floating right beside the head when not expanded (Gemini style) */}
            {!isChatHeadExpanded && contextChips.length > 0 && (
              <div className="absolute left-full ml-2.5 top-0 flex flex-col gap-1.5 animate-fadeIn pointer-events-auto z-40">
                {contextChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      chip.action();
                    }}
                    className="bg-[#121824]/95 hover:bg-[#1a2538] active:scale-95 backdrop-blur-md border border-[#00e5ff]/40 hover:border-[#00e5ff] text-white text-[10px] font-semibold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1.5 transition-all whitespace-nowrap group"
                  >
                    <span className="group-hover:scale-110 transition-transform">{chip.icon}</span>
                    <span>{chip.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Expanded Mini-Assistant Overlay Window */}
          {isChatHeadExpanded && (
            <div
              className="absolute left-0 top-16 w-80 sm:w-96 bg-[#121824]/95 backdrop-blur-xl border border-[#00e5ff]/40 rounded-2xl shadow-2xl p-3 space-y-3 z-50 animate-fadeIn"
              style={{
                transform: headPos.x > window.innerWidth - 350 ? 'translateX(-260px)' : 'none'
              }}
            >
              {/* Window Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md bg-[#00e5ff]/20 flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-[#00e5ff]" />
                  </div>
                  <span className="text-xs font-bold text-white">CogniAgent Floating Overlay</span>
                </div>
                <div className="flex items-center gap-1">
                  {onOpenHandsFree && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenHandsFree();
                      }}
                      className="text-[10px] font-bold text-amber-300 hover:text-white px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/30 flex items-center gap-1 transition-colors"
                      title="Przełącz na pełny ekran Hands-Free HUD"
                    >
                      <Car className="w-3 h-3 text-amber-400" />
                      <span>Hands-Free</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsChatHeadExpanded(false)}
                    className="p-1 rounded text-gray-400 hover:text-white"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1 rounded text-gray-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Quick Screen Context / Smart Agent Actions */}
              <div className="grid grid-cols-3 gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={handleInspectScreen}
                  className="p-2 rounded-xl bg-[#1e2638] hover:bg-[#2d3748] text-[#00e5ff] font-semibold flex flex-col items-center justify-center gap-1 transition-colors border border-[#00e5ff]/20 text-center"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Co na ekranie?</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSendMessage('Szybka odprawa: podsumuj krótko co nowego w wiadomościach, powiadomieniach i telefonie')}
                  className="p-2 rounded-xl bg-[#1e2638] hover:bg-[#2d3748] text-amber-300 font-semibold flex flex-col items-center justify-center gap-1 transition-colors border border-amber-500/20 text-center"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Szybka odprawa</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSendMessage('Zaproponuj inteligentną i uprzejmą odpowiedź na wiadomość na WhatsAppie od Mamy')}
                  className="p-2 rounded-xl bg-[#1e2638] hover:bg-[#2d3748] text-emerald-300 font-semibold flex flex-col items-center justify-center gap-1 transition-colors border border-emerald-500/20 text-center"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Odpisz Mamie</span>
                </button>
              </div>

              {/* Last Agent Response Display */}
              {lastResponse && (
                <div className="bg-[#0a0e14] border border-white/5 rounded-xl p-2.5 text-xs text-gray-200 max-h-28 overflow-y-auto leading-relaxed">
                  <span className="text-[10px] text-[#8b5cf6] font-bold block mb-1">Odpowiedź asystenta:</span>
                  {lastResponse}
                </div>
              )}

              {/* Mini Prompt Input with Voice Mic */}
              <div className="flex items-center gap-1.5 bg-[#0a0e14] border border-[#2d3748] focus-within:border-[#00e5ff] rounded-xl px-2.5 py-1">
                <input
                  type="text"
                  value={miniInputText}
                  onChange={(e) => setMiniInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMini()}
                  placeholder={isListeningVoice ? 'Słucham głosu...' : 'Zapytaj asystenta...'}
                  className="flex-1 bg-transparent text-xs text-white outline-none py-1.5"
                />
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  className={`p-1.5 rounded-lg transition-all ${
                    isListeningVoice
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-[#1e2638] text-[#00e5ff] hover:bg-[#2d3748]'
                  }`}
                  title={isListeningVoice ? 'Zatrzymaj nasłuch' : 'Mów do dymka (Głos)'}
                >
                  {isListeningVoice ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={handleSendMini}
                  disabled={!miniInputText.trim() || isProcessing}
                  className="p-1.5 rounded-lg bg-[#00e5ff] text-black font-bold disabled:opacity-40"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
