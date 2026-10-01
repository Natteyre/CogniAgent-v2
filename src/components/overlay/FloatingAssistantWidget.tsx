import React, { useState, useRef, useEffect } from 'react';
import {
  Brain,
  X,
  Send,
  Mic,
  MicOff,
  Minimize2,
  Maximize2,
  Eye,
  Flashlight,
  Clock,
  Sparkles,
  Move
} from 'lucide-react';
import { ChatMessage } from '../../types';

interface FloatingAssistantWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isProcessing: boolean;
}

export const FloatingAssistantWidget: React.FC<FloatingAssistantWidgetProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  isProcessing
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [text, setText] = useState('');
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 20,
    posY: 80
  });

  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isExpanded]);

  if (!isOpen) return null;

  const handleSend = () => {
    if (text.trim() && !isProcessing) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = dragStartRef.current.startX - e.clientX;
    const deltaY = dragStartRef.current.startY - e.clientY;
    setPosition({
      x: Math.max(10, Math.min(window.innerWidth - 70, dragStartRef.current.posX + deltaX)),
      y: Math.max(20, Math.min(window.innerHeight - 80, dragStartRef.current.posY + deltaY))
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  };

  return (
    <div
      style={{
        right: `${position.x}px`,
        bottom: `${position.y}px`
      }}
      className="fixed z-50 flex flex-col items-end select-none transition-all duration-75"
    >
      {/* True Floating Chat Overlay Window (Mini-okno dialogowe nad aplikacjami) */}
      {isExpanded && (
        <div className="w-[330px] sm:w-[380px] bg-[#121824]/95 backdrop-blur-xl border border-[#00e5ff]/50 rounded-2xl shadow-[0_10px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(0,229,255,0.25)] p-3 mb-3 animate-fadeIn flex flex-col max-h-[460px] h-[440px]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#2d3748] pb-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#00e5ff]/20 border border-[#00e5ff]/40 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5 text-[#00e5ff]" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>CogniAgent Mini-Overlay</span>
                  <span className="bg-[#8b5cf6]/30 text-[#8b5cf6] text-[9px] px-1 py-0.2 rounded font-mono">
                    Kirin 980
                  </span>
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                title="Zminimalizuj do dymku"
                className="p-1 rounded text-gray-400 hover:text-white hover:bg-white/10"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onClose}
                title="Zamknij dymek"
                className="p-1 rounded text-gray-400 hover:text-red-400 hover:bg-red-500/10"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Action Chips in Overlay */}
          <div className="flex items-center gap-1.5 pb-2 mb-2 overflow-x-auto no-scrollbar shrink-0 border-b border-white/5">
            <button
              type="button"
              onClick={() => onSendMessage('Co jest na ekranie?')}
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#00e5ff]/20 text-[#00e5ff] hover:bg-[#00e5ff]/30 shrink-0 border border-[#00e5ff]/30 flex items-center gap-1"
            >
              <Eye className="w-3 h-3" />
              <span>Ekran</span>
            </button>
            <button
              type="button"
              onClick={() => onSendMessage('przełącz latarkę')}
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#1e2638] text-gray-300 hover:bg-[#2d3748] shrink-0 border border-white/5 flex items-center gap-1"
            >
              <Flashlight className="w-3 h-3 text-amber-300" />
              <span>Latarka</span>
            </button>
            <button
              type="button"
              onClick={() => onSendMessage('ustaw minutnik na 5 minut')}
              className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#1e2638] text-gray-300 hover:bg-[#2d3748] shrink-0 border border-white/5 flex items-center gap-1"
            >
              <Clock className="w-3 h-3 text-[#8b5cf6]" />
              <span>Minutnik 5m</span>
            </button>
          </div>

          {/* Conversation history viewport */}
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto space-y-2 py-1 pr-1 text-xs select-text"
          >
            {messages.slice(-6).map((msg) => (
              <div
                key={msg.id}
                className={`p-2 rounded-xl text-xs ${
                  msg.isUser
                    ? 'bg-[#1e293b] text-white ml-6 border border-[#00e5ff]/30'
                    : 'bg-[#0f141f] text-gray-200 mr-4 border border-white/10'
                }`}
              >
                {!msg.isUser && (
                  <span className="text-[10px] font-bold text-[#00e5ff] block mb-0.5">
                    CogniAgent:
                  </span>
                )}
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
            ))}

            {isProcessing && (
              <div className="p-2 bg-[#0f141f] rounded-xl text-xs text-[#00e5ff] border border-[#00e5ff]/20 animate-pulse flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>Przetwarzanie...</span>
              </div>
            )}
          </div>

          {/* Input field */}
          <div className="flex items-center gap-1.5 pt-2 border-t border-[#2d3748] shrink-0">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Zapytaj lub wydaj polecenie..."
              className="flex-1 bg-[#0a0e14] border border-[#2d3748] focus:border-[#00e5ff] rounded-xl px-3 py-1.5 text-xs text-white outline-none"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!text.trim() || isProcessing}
              className="p-2 bg-[#00e5ff] hover:bg-[#00b4d8] text-black rounded-xl transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Head Trigger Button with Drag Handle */}
      <div className="relative group flex items-center">
        {/* Drag handle tooltip */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          title="Przeciągnij dymek w dowolne miejsce"
          className="cursor-grab active:cursor-grabbing p-1.5 rounded-l-full bg-[#1e2638]/80 hover:bg-[#2d3748] text-gray-400 hover:text-[#00e5ff] -mr-1 z-10 border-l border-y border-[#00e5ff]/30 shadow-md"
        >
          <Move className="w-3.5 h-3.5" />
        </div>

        {/* Head button */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          title="Otwórz mini-okno asystenta CogniAgent"
          className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#00e5ff] via-[#00b4d8] to-[#8b5cf6] p-0.5 shadow-[0_0_20px_rgba(0,229,255,0.6)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
        >
          <div className="w-full h-full rounded-full bg-[#121824] flex items-center justify-center">
            <Brain className="w-6 h-6 text-[#00e5ff] animate-pulse" />
          </div>
        </button>

        {/* Close overlay icon */}
        <button
          type="button"
          onClick={onClose}
          title="Zamknij dymek"
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
