import React, { useState } from 'react';
import { Copy, Volume2, Check, Zap, Brain } from 'lucide-react';
import { ChatMessage } from '../../types';

interface ChatMessageBubbleProps {
  message: ChatMessage;
  onSpeakMessage?: (text: string) => void;
  isSpeakingThis?: boolean;
}

export const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({
  message,
  onSpeakMessage,
  isSpeakingThis = false
}) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.isUser;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div
      className={`flex w-full mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}
      data-testid={isUser ? 'user_message_bubble' : 'agent_message_bubble'}
    >
      <div
        className={`max-w-[88%] sm:max-w-md rounded-2xl px-4 py-3 shadow-md transition-all relative ${
          isUser
            ? 'bg-[#1e293b] text-[#f1f5f9] border border-[#00e5ff]/30 rounded-br-sm'
            : message.isError
            ? 'bg-red-950/40 text-red-200 border border-red-500/40 rounded-bl-sm'
            : 'bg-[#121824] text-[#f1f5f9] border border-[#2d3748] rounded-bl-sm'
        }`}
      >
        {/* CogniAgent Title Header */}
        {!isUser && (
          <div className="flex items-center justify-between gap-1.5 mb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 rounded-full bg-[#00e5ff]/20 flex items-center justify-center">
                <Brain className="w-3 h-3 text-[#00e5ff]" />
              </div>
              <span className="text-xs font-bold text-[#00e5ff] tracking-wide">CogniAgent</span>
            </div>

            {copied && (
              <span className="text-[10px] font-semibold text-[#10b981] animate-fadeIn bg-[#10b981]/15 px-1.5 py-0.5 rounded">
                Skopiowano!
              </span>
            )}
          </div>
        )}

        {/* Tool Invocation badge if tool was executed */}
        {message.toolInvocation && (
          <div className="mb-2 bg-[#0a0e14]/70 border border-[#8b5cf6]/30 rounded-lg px-2.5 py-1.5 flex items-center gap-2 text-xs text-[#cbd5e1]">
            <Zap className="w-3.5 h-3.5 text-[#f59e0b] shrink-0" />
            <span className="font-mono text-[11px] leading-tight break-all text-[#e2e8f0]">
              {message.toolInvocation}
            </span>
          </div>
        )}

        {/* Message Text */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap select-text">
          {message.text}
        </p>

        {/* Footer with actions and time */}
        <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5 text-[11px] text-[#94a3b8]">
          {!isUser ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopy}
                title="Kopiuj tekst do schowka"
                className={`p-1.5 rounded-md transition-colors flex items-center gap-1 ${
                  copied
                    ? 'bg-[#10b981]/20 text-[#10b981]'
                    : 'text-[#00e5ff] hover:bg-white/10'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {onSpeakMessage && (
                <button
                  type="button"
                  onClick={() => onSpeakMessage(message.text)}
                  title="Odsłuchaj ponownie (TTS)"
                  className={`p-1.5 rounded-md transition-colors ${
                    isSpeakingThis
                      ? 'bg-[#8b5cf6]/30 text-[#8b5cf6] animate-pulse'
                      : 'text-[#8b5cf6] hover:bg-white/10'
                  }`}
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <div />
          )}

          <span className="text-[10px] text-gray-400 font-mono">{formattedTime}</span>
        </div>
      </div>
    </div>
  );
};
