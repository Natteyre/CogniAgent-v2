import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  X,
  Radio,
  Car,
  MessageSquare,
  ShieldCheck,
  Send,
  Zap,
  Sparkles
} from 'lucide-react';
import { hardwareManager } from '../../services/hardwareManager';
import { speechRecognizerHelper } from '../../services/speechRecognition';
import { soundAndHaptics } from '../../services/soundAndHaptics';
import { ttsManager } from '../../services/ttsManager';

interface HandsFreeCarModeProps {
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (text: string) => void;
  lastUserText?: string;
  lastBotReply?: string;
  isProcessing: boolean;
  isSpeaking: boolean;
  rmsLevel: number;
}

export const HandsFreeCarMode: React.FC<HandsFreeCarModeProps> = ({
  isOpen,
  onClose,
  onSendMessage,
  lastUserText,
  lastBotReply,
  isProcessing,
  isSpeaking,
  rmsLevel
}) => {
  const [isListening, setIsListening] = useState(true);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [noisyEnvText, setNoisyEnvText] = useState('');

  const isMountedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;
    isMountedRef.current = true;

    // Subtle audio chime on entering hands-free mode
    soundAndHaptics.playListeningStartChime();
    setIsListening(true);
    setCurrentTranscript('');

    // Start continuous speech capture with Proactive Barge-In (interruption of assistant)
    speechRecognizerHelper.startListening({
      continuous: true,
      onInterimResult: (interim) => {
        if (!isMountedRef.current) return;
        setCurrentTranscript(interim);
        // Proactive Barge-In: if user speaks while assistant is talking, cut speech immediately!
        if (isSpeaking && interim.trim().length > 1) {
          ttsManager.stop();
        }
      },
      onFinalResult: (finalText) => {
        if (!isMountedRef.current) return;
        // Ensure TTS is stopped when user finishes an interruption command
        if (isSpeaking) {
          ttsManager.stop();
        }
        setCurrentTranscript(finalText);
        if (finalText.trim().length > 1) {
          onSendMessage(finalText.trim());
          setTimeout(() => {
            if (isMountedRef.current) {
              setCurrentTranscript('');
            }
          }, 3000);
        }
      },
      onError: (err) => {
        console.warn('HandsFree listening note:', err);
      }
    });

    return () => {
      isMountedRef.current = false;
      speechRecognizerHelper.stopListening();
    };
  }, [isOpen, onSendMessage]);

  if (!isOpen) return null;

  const handleToggleListening = () => {
    if (isListening) {
      speechRecognizerHelper.stopListening();
      setIsListening(false);
      soundAndHaptics.playListeningPauseChime();
    } else {
      setIsListening(true);
      soundAndHaptics.playListeningStartChime();
      speechRecognizerHelper.startListening({
        continuous: true,
        onInterimResult: (interim) => setCurrentTranscript(interim),
        onFinalResult: (finalText) => {
          setCurrentTranscript(finalText);
          if (finalText.trim().length > 1) {
            onSendMessage(finalText.trim());
            setTimeout(() => setCurrentTranscript(''), 3000);
          }
        }
      });
    }
  };

  const handleQuickCommand = (cmd: string) => {
    onSendMessage(cmd);
  };

  const handleSendNoisyText = () => {
    if (noisyEnvText.trim() && !isProcessing) {
      onSendMessage(noisyEnvText.trim());
      setNoisyEnvText('');
    }
  };

  // Dynamic scale of the quantum orb based on microphone RMS level and assistant speaking
  const orbScale = isSpeaking ? 1.2 : 1 + Math.min(rmsLevel * 0.4, 0.25);
  const orbColor = isSpeaking
    ? 'from-[#8b5cf6] to-[#ec4899] shadow-[0_0_60px_rgba(236,72,153,0.4)]'
    : isProcessing
    ? 'from-[#f59e0b] to-[#ef4444] shadow-[0_0_60px_rgba(245,158,11,0.4)]'
    : isListening
    ? 'from-[#00e5ff] to-[#3b82f6] shadow-[0_0_60px_rgba(0,229,255,0.35)]'
    : 'from-gray-600 to-gray-800 shadow-[0_0_20px_rgba(100,100,100,0.2)]';

  return (
    <div className="fixed inset-0 z-50 bg-[#06090f] text-white flex flex-col justify-between p-4 sm:p-7 select-none animate-fadeIn">
      {/* Top HUD Bar */}
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#00e5ff]/20 to-[#8b5cf6]/20 flex items-center justify-center border border-[#00e5ff]/30 shadow-md">
            <Car className="w-5 h-5 text-[#00e5ff]" />
          </div>
          <div>
            <div className="text-xs uppercase font-extrabold tracking-widest text-[#00e5ff] flex items-center gap-1.5">
              <span>TRYB GŁOŚNOMÓWIĄCY (HANDS-FREE)</span>
              {isListening && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
            </div>
            <div className="text-xs text-gray-300">Duży kontrast • Ciągły nasłuch • Samochód / Spacer</div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition-all active:scale-95"
          title="Zamknij tryb Hands-Free"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Center Quantum Voice Orb & Large Text Display */}
      <div className="flex-1 flex flex-col items-center justify-center my-3 space-y-5 text-center max-w-xl mx-auto w-full">
        {/* Pulsing Quantum Orb - Clickable to toggle listen */}
        <div
          onClick={handleToggleListening}
          className="relative cursor-pointer transition-transform duration-200 ease-out active:scale-95"
          style={{ transform: `scale(${orbScale})` }}
          title={isListening ? 'Kliknij, aby wstrzymać nasłuch' : 'Kliknij, aby wznowić nasłuch'}
        >
          <div
            className={`w-32 h-32 sm:w-44 sm:h-44 rounded-full bg-gradient-to-tr ${orbColor} p-1 flex items-center justify-center transition-all duration-300`}
          >
            <div className="w-full h-full bg-[#0a0f1d] rounded-full flex flex-col items-center justify-center gap-1.5 p-4">
              {isSpeaking ? (
                <Volume2 className="w-10 h-10 text-[#ec4899] animate-pulse" />
              ) : isListening ? (
                <Mic className="w-10 h-10 text-[#00e5ff] animate-pulse" />
              ) : (
                <MicOff className="w-10 h-10 text-gray-500" />
              )}
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400">
                {isSpeaking ? 'ODPOWIADAM...' : isProcessing ? 'MYŚLĘ...' : isListening ? 'SŁUCHAM...' : 'PAUZA'}
              </span>
            </div>
          </div>
        </div>

        {/* Large Caption Area for Safe Glance */}
        <div className="w-full space-y-2.5 px-2">
          {currentTranscript ? (
            <div className="bg-[#121824]/90 border border-[#00e5ff]/50 rounded-2xl p-3.5 shadow-lg">
              <div className="text-[10px] text-[#00e5ff] font-extrabold uppercase tracking-wider mb-1">Rozpoznano:</div>
              <div className="text-base sm:text-xl font-bold text-white leading-snug">
                „{currentTranscript}”
              </div>
            </div>
          ) : lastUserText ? (
            <div className="text-xs sm:text-sm text-gray-400 font-medium">
              Ostatnie polecenie: <span className="text-white font-bold">„{lastUserText}”</span>
            </div>
          ) : (
            <div className="text-xs sm:text-sm text-gray-400">
              Mów swobodnie do telefonu – asystent odpowie na głos przez głośnik.
            </div>
          )}

          {lastBotReply && (
            <div className="bg-[#151e2e]/90 border border-[#2d3748] rounded-2xl p-3 shadow-lg max-h-32 overflow-y-auto">
              <div className="text-[10px] text-[#8b5cf6] font-extrabold uppercase tracking-wider mb-1">Odpowiedź asystenta:</div>
              <div className="text-xs sm:text-sm font-medium text-gray-200 leading-relaxed">
                {lastBotReply}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Large Touch Controls */}
      <div className="shrink-0 space-y-2.5 max-w-xl mx-auto w-full">
        {/* Quick Driving/Walking Actions */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => handleQuickCommand('Podsumuj krótko w 2 zdaniach: co nowego w telefonie, wiadomościach i statusie baterii')}
            className="py-3 px-2 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-orange-500/15 border border-amber-500/40 text-amber-300 font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1 transition-all active:scale-95 hover:bg-amber-500/25"
          >
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>Co nowego?</span>
          </button>

          <button
            type="button"
            onClick={() => handleQuickCommand('Podsumuj moje nieprzeczytane powiadomienia')}
            className="py-3 px-2 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
          >
            <MessageSquare className="w-5 h-5 text-[#00e5ff]" />
            <span>Powiadomienia</span>
          </button>

          <button
            type="button"
            onClick={handleToggleListening}
            className={`py-3 px-2 rounded-2xl border font-bold text-xs sm:text-sm flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${
              isListening
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-red-500/20 border-red-500/50 text-red-300'
            }`}
          >
            {isListening ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            <span>{isListening ? 'Mikrofon WŁ' : 'Wznów'}</span>
          </button>
        </div>

        {/* Text Input Fallback if noisy environment */}
        <div className="flex items-center gap-1.5 bg-[#121824] border border-[#2d3748] rounded-xl px-2.5 py-1">
          <input
            type="text"
            value={noisyEnvText}
            onChange={(e) => setNoisyEnvText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendNoisyText()}
            placeholder="Wpisz jeśli wokół jest za głośno..."
            className="flex-1 bg-transparent text-xs text-white outline-none py-1"
          />
          <button
            type="button"
            onClick={handleSendNoisyText}
            disabled={!noisyEnvText.trim() || isProcessing}
            className="p-1 rounded-lg bg-[#00e5ff] text-black font-bold disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Safety Notice */}
        <div className="text-center text-[10px] text-gray-500 flex items-center justify-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Odpowiedzi są odczytywane automatycznie na głos przez syntezator mowy TTS.</span>
        </div>
      </div>
    </div>
  );
};
