import React, { useState, useRef, useEffect } from 'react';
import {
  Brain,
  Mic,
  MicOff,
  Send,
  Wrench,
  Flashlight,
  BatteryCharging,
  Trash2,
  Radio,
  Eye,
  Loader2
} from 'lucide-react';
import { ChatMessage, HardwareState } from '../../types';
import { ChatMessageBubble } from './ChatMessageBubble';
import { NeonAudioVisualizer } from './NeonAudioVisualizer';

interface ChatScreenProps {
  messages: ChatMessage[];
  hardwareState: HardwareState;
  isProcessing: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  wakeWordActive: boolean;
  rmsLevel: number;
  onSendMessage: (text: string) => void;
  onStartVoice: () => void;
  onStopVoice: () => void;
  onToggleWakeWord: () => void;
  onSummarizeScreen: () => void;
  onToggleTorch: () => void;
  onClearChat: () => void;
  onSpeakMessage: (text: string) => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  messages,
  hardwareState,
  isProcessing,
  isListening,
  isSpeaking,
  wakeWordActive,
  rmsLevel,
  onSendMessage,
  onStartVoice,
  onStopVoice,
  onToggleWakeWord,
  onSummarizeScreen,
  onToggleTorch,
  onClearChat,
  onSpeakMessage
}) => {
  const [inputText, setInputText] = useState('');
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const handleSend = () => {
    if (inputText.trim() && !isProcessing) {
      onSendMessage(inputText.trim());
      setInputText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const quickPrompts = [
    { label: 'Włącz latarkę', command: 'włącz latarkę' },
    { label: 'Wyłącz latarkę', command: 'wyłącz latarkę' },
    { label: 'Stan baterii', command: 'sprawdź poziom baterii' },
    { label: 'Włącz Bluetooth', command: 'włącz bluetooth' },
    { label: 'Otwórz YouTube', command: 'otwórz YouTube' },
    { label: 'Przewiń w dół', command: 'przewiń w dół' }
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0e14]">
      {/* Top Header Bar */}
      <header className="bg-[#121824] border-b border-[#2d3748] px-4 py-3 shrink-0 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#00e5ff]/15 flex items-center justify-center border border-[#00e5ff]/30 shadow-[0_0_10px_rgba(0,229,255,0.2)]">
              <Brain className="w-5 h-5 text-[#00e5ff]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-wide">CogniAgent v2</h1>
                <span className="bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 text-[#8b5cf6] text-[10px] font-semibold px-1.5 py-0.5 rounded">
                  Kirin 980 NLU
                </span>
              </div>
              <p className="text-xs text-[#94a3b8]">
                {isSpeaking ? (
                  <span className="text-[#00e5ff] font-medium">Głos: Asystent mówi...</span>
                ) : isProcessing ? (
                  <span className="text-[#8b5cf6] font-medium">Przetwarzanie kognitywne...</span>
                ) : (
                  'Hybrydowy: Lokalny + Chmura'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Wake Word Continuous Listening Button */}
            <button
              type="button"
              onClick={onToggleWakeWord}
              data-testid="wake_word_toggle_button"
              title={wakeWordActive ? 'Wyłącz nasłuch słowa kluczowego' : 'Włącz nasłuch (Hej Cogni)'}
              className={`p-2 rounded-lg transition-colors ${
                wakeWordActive
                  ? 'bg-[#00e5ff]/20 text-[#00e5ff] ring-1 ring-[#00e5ff]/50'
                  : 'text-[#94a3b8] hover:bg-white/5'
              }`}
            >
              <Radio className={`w-5 h-5 ${wakeWordActive ? 'animate-pulse' : ''}`} />
            </button>

            {/* Clear Chat Button */}
            <button
              type="button"
              onClick={onClearChat}
              data-testid="clear_chat_button"
              title="Wyczyść historię czatu"
              className="p-2 rounded-lg text-[#94a3b8] hover:bg-white/5 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Quick Suggestion Chips Bar */}
      <div className="bg-[#0f141f] border-b border-[#2d3748]/50 px-3 py-2 shrink-0 flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={onSummarizeScreen}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#00e5ff]/20 text-[#00e5ff] hover:bg-[#00e5ff]/30 shrink-0 border border-[#00e5ff]/40 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>Co jest na ekranie?</span>
        </button>

        {quickPrompts.map(({ label, command }) => (
          <button
            key={label}
            type="button"
            onClick={() => onSendMessage(command)}
            data-testid={`quick_chip_${label.toLowerCase().replace(/\s+/g, '_')}`}
            className="px-3 py-1 rounded-full text-xs text-[#cbd5e1] bg-[#1e2638] hover:bg-[#2d3748] shrink-0 border border-white/5 transition-colors whitespace-nowrap"
          >
            {label}
          </button>
        ))}
      </div>

      {/* Messages List Viewport */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 space-y-2 select-text"
        data-testid="chat_messages_list"
      >
        {messages.map((message) => (
          <ChatMessageBubble
            key={message.id}
            message={message}
            onSpeakMessage={onSpeakMessage}
          />
        ))}

        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-[#00e5ff] bg-[#121824] border border-[#00e5ff]/20 w-fit px-3 py-2 rounded-xl animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-[#00e5ff]" />
            <span>CogniAgent analizuje polecenie...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Control Bar */}
      <footer className="bg-[#121824] border-t border-[#2d3748] p-3 shrink-0 shadow-lg">
        {/* Active Listening Banner */}
        {isListening && (
          <div className="mb-2 bg-red-950/60 border border-red-500/40 rounded-xl px-3 py-2 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2 text-xs text-red-200">
              <Radio className="w-4 h-4 text-red-400 animate-pulse" />
              <span>Nasłuchiwanie głosu... Mów teraz w języku polskim</span>
            </div>
            <button
              type="button"
              onClick={onStopVoice}
              className="text-xs font-bold text-red-400 hover:text-red-300 px-2 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors"
            >
              Zatrzymaj
            </button>
          </div>
        )}

        {/* Audio Visualizer during Voice Input */}
        {isListening && <NeonAudioVisualizer rmsLevel={rmsLevel} />}

        {/* Input Controls Row */}
        <div className="flex items-center gap-2 relative">
          {/* Tools Menu Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowToolsMenu(!showToolsMenu)}
              data-testid="tools_button"
              title="Menu narzędzi sprzętowych"
              className="p-2.5 rounded-full text-[#94a3b8] hover:text-white hover:bg-white/10 transition-colors"
            >
              <Wrench className="w-5 h-5" />
            </button>

            {showToolsMenu && (
              <div className="absolute bottom-12 left-0 w-48 bg-[#1e2638] border border-[#2d3748] rounded-xl shadow-xl py-1 z-30 animate-fadeIn">
                <button
                  type="button"
                  onClick={() => {
                    onToggleTorch();
                    setShowToolsMenu(false);
                  }}
                  className="w-full px-3 py-2 flex items-center gap-2.5 text-xs text-left text-white hover:bg-white/10 transition-colors"
                >
                  <Flashlight className={`w-4 h-4 ${hardwareState.isTorchOn ? 'text-[#00e5ff]' : 'text-gray-400'}`} />
                  <span>{hardwareState.isTorchOn ? 'Wyłącz latarkę' : 'Włącz latarkę'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSendMessage('Sprawdź stan baterii');
                    setShowToolsMenu(false);
                  }}
                  className="w-full px-3 py-2 flex items-center gap-2.5 text-xs text-left text-white hover:bg-white/10 transition-colors"
                >
                  <BatteryCharging className="w-4 h-4 text-[#10b981]" />
                  <span>Stan baterii ({hardwareState.batteryPercent}%)</span>
                </button>
              </div>
            )}
          </div>

          {/* Text Input */}
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            data-testid="chat_text_input"
            placeholder="Wpisz polecenie lub pytanie..."
            className="flex-1 bg-[#0a0e14] border border-[#2d3748] focus:border-[#00e5ff] rounded-full px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-colors"
          />

          {/* Voice Input FAB */}
          <button
            type="button"
            onClick={isListening ? onStopVoice : onStartVoice}
            data-testid="voice_input_fab"
            title={isListening ? 'Zatrzymaj nasłuch' : 'Rozpocznij nasłuchiwanie głosu'}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-md shrink-0 ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 text-white scale-110 shadow-[0_0_15px_rgba(239,68,68,0.5)]'
                : 'bg-gradient-to-r from-[#00e5ff] to-[#8b5cf6] text-black hover:opacity-95 shadow-[0_0_12px_rgba(0,229,255,0.3)]'
            }`}
          >
            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5 text-[#0a0e14]" />}
          </button>

          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim() || isProcessing}
            data-testid="send_button"
            title="Wyślij wiadomość"
            className={`p-2.5 rounded-full transition-colors ${
              inputText.trim() && !isProcessing
                ? 'text-[#00e5ff] hover:bg-[#00e5ff]/10'
                : 'text-gray-600 cursor-not-allowed'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  );
};
