import React, { useState } from 'react';
import { Brain, X, Send, Mic, Volume2 } from 'lucide-react';
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

  if (!isOpen) return null;

  const latestAgentMessage = [...messages].reverse().find((m) => !m.isUser);

  const handleSend = () => {
    if (text.trim() && !isProcessing) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end">
      {/* Expanded Quick Chat Card */}
      {isExpanded && (
        <div className="w-80 bg-[#121824] border border-[#00e5ff]/50 rounded-2xl shadow-2xl p-4 mb-3 animate-fadeIn flex flex-col max-h-96">
          <div className="flex items-center justify-between border-b border-[#2d3748] pb-2 mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-[#00e5ff]/20 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5 text-[#00e5ff]" />
              </div>
              <span className="text-xs font-bold text-white">CogniAgent Floating Head</span>
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-gray-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 py-2 text-xs">
            {latestAgentMessage && (
              <div className="bg-[#1a2233] p-2.5 rounded-xl border border-white/5 text-[#f1f5f9]">
                <p className="font-semibold text-[11px] text-[#00e5ff] mb-1">Ostatnia odpowiedź:</p>
                <p>{latestAgentMessage.text}</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5 pt-2 border-t border-[#2d3748]">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Szybkie polecenie..."
              className="flex-1 bg-[#0a0e14] border border-[#2d3748] focus:border-[#00e5ff] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!text.trim() || isProcessing}
              className="p-1.5 bg-[#00e5ff] hover:bg-[#00b4d8] text-black rounded-lg transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Head Trigger Button */}
      <div className="relative group">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-13 h-13 rounded-full bg-gradient-to-tr from-[#00e5ff] via-[#00b4d8] to-[#8b5cf6] p-0.5 shadow-[0_0_20px_rgba(0,229,255,0.5)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
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
