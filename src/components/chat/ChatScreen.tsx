import React, { useState, useRef, useEffect } from 'react';
import {
  Brain,
  Mic,
  MicOff,
  Send,
  Plus,
  Image,
  FileText,
  PlayCircle,
  Trash2,
  Radio,
  Eye,
  Loader2,
  Clock,
  BellOff,
  Sun,
  X,
  Cpu,
  Bell,
  Layers,
  Sparkles,
  ChevronDown,
  Lock,
  Globe,
  Car,
  BookOpen,
  Smartphone,
  Camera
} from 'lucide-react';
import { ChatMessage, HardwareState } from '../../types';
import { ChatMessageBubble } from './ChatMessageBubble';
import { NeonAudioVisualizer } from './NeonAudioVisualizer';
import { hardwareManager } from '../../services/hardwareManager';
import { notificationManager } from '../../services/notificationManager';
import { NotificationCenterModal } from '../notifications/NotificationCenterModal';
import { MemoryManagerModal } from '../memory/MemoryManagerModal';
import { SessionDrawerModal } from './SessionDrawerModal';
import { ScreenInspectionModal } from '../screen/ScreenInspectionModal';

interface ChatScreenProps {
  messages: ChatMessage[];
  hardwareState: HardwareState;
  isProcessing: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  wakeWordActive: boolean;
  rmsLevel: number;
  activeModelName?: string;
  activeSessionTitle?: string;
  isStrictOffline?: boolean;
  onToggleStrictOffline?: () => void;
  onSwitchSession?: (sessionId: string) => void;
  onSendMessage: (text: string, attachment?: { image?: string; fileName?: string; fileSize?: string }) => void;
  onStartVoice: () => void;
  onStopVoice: () => void;
  onToggleWakeWord: () => void;
  onSummarizeScreen: () => void;
  onToggleTorch: () => void;
  onClearChat: () => void;
  onSpeakMessage: (text: string) => void;
  onOpenModelManager?: () => void;
  onOpenHandsFree?: () => void;
  onOpenKnowledgeBase?: () => void;
  onOpenLauncherSimulator?: () => void;
  onOpenLiveCamera?: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  messages,
  hardwareState,
  isProcessing,
  isListening,
  isSpeaking,
  wakeWordActive,
  rmsLevel,
  activeModelName,
  activeSessionTitle,
  isStrictOffline = false,
  onToggleStrictOffline,
  onSwitchSession,
  onSendMessage,
  onStartVoice,
  onStopVoice,
  onToggleWakeWord,
  onSummarizeScreen,
  onToggleTorch,
  onClearChat,
  onSpeakMessage,
  onOpenModelManager,
  onOpenHandsFree,
  onOpenKnowledgeBase,
  onOpenLauncherSimulator,
  onOpenLiveCamera
}) => {
  const [inputText, setInputText] = useState('');
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isNotifModalOpen, setIsNotifModalOpen] = useState(false);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
  const [isScreenModalOpen, setIsScreenModalOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Attachment state for multimodal images / files
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [pendingAttachment, setPendingAttachment] = useState<{
    file: File;
    previewUrl?: string;
    fileName: string;
    fileSize: string;
    isImage: boolean;
  } | null>(null);

  useEffect(() => {
    const unsub = notificationManager.subscribe((_, unread) => {
      setUnreadNotifCount(unread);
    });
    return unsub;
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    const sizeKB = (file.size / 1024).toFixed(1);
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const sizeStr = file.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (loadEvent) => {
        setPendingAttachment({
          file,
          previewUrl: loadEvent.target?.result as string,
          fileName: file.name,
          fileSize: sizeStr,
          isImage: true
        });
      };
      reader.readAsDataURL(file);
    } else {
      setPendingAttachment({
        file,
        fileName: file.name,
        fileSize: sizeStr,
        isImage: false
      });
    }

    e.target.value = '';
  };

  const handleSend = () => {
    const textToSend = inputText.trim();
    if ((!textToSend && !pendingAttachment) || isProcessing) return;

    if (pendingAttachment) {
      onSendMessage(textToSend, {
        image: pendingAttachment.previewUrl,
        fileName: pendingAttachment.fileName,
        fileSize: pendingAttachment.fileSize
      });
      setPendingAttachment(null);
    } else {
      onSendMessage(textToSend);
    }

    setInputText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const quickPrompts = [
    { label: 'Co jest na ekranie?', command: 'Co jest na ekranie?' },
    { label: 'Podsumuj powiadomienia', command: 'podsumuj powiadomienia' },
    { label: 'Przeszukaj umowę (RAG)', command: 'Co w mojej umowie pisze o okresie wypowiedzenia?' },
    { label: 'Nagraj rutynę / makro', command: 'nagraj nową rutynę' },
    { label: 'Odczytaj paragon (OCR)', command: 'Odczytaj pozycje z paragonu' },
    { label: 'Zapamiętaj fakt o mnie', command: 'Zapamiętaj fakt o moich preferencjach' }
  ];

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0e14]">
      {/* Top Header Bar */}
      <header className="bg-[#121824] border-b border-[#2d3748] px-3 sm:px-4 py-2 sm:py-2.5 shrink-0 shadow-md">
        <div className="flex items-center justify-between gap-2">
          {/* Left Brand & Tandem Status */}
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#00e5ff]/15 flex items-center justify-center border border-[#00e5ff]/30 shadow-[0_0_10px_rgba(0,229,255,0.2)] shrink-0">
              <Brain className="w-4 h-4 text-[#00e5ff]" />
            </div>

            <div className="min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs sm:text-sm font-extrabold text-white tracking-tight whitespace-nowrap">
                    CogniAgent
                  </span>
                  <span className="text-[9px] font-mono text-[#00e5ff] bg-[#00e5ff]/15 px-1 py-0.2 rounded font-bold">
                    v2
                  </span>
                </div>

                {/* Model Tandem Pill */}
                <button
                  type="button"
                  onClick={onOpenModelManager}
                  title="Kliknij, aby otworzyć Menedżer Modeli (Router GLiNER NPU + Lokalny SLM Czat)"
                  className="bg-[#8b5cf6]/20 hover:bg-[#8b5cf6]/35 border border-[#8b5cf6]/35 text-[#8b5cf6] text-[10px] font-semibold px-2 py-0.5 rounded flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Cpu className="w-2.5 h-2.5 text-[#00e5ff] shrink-0" />
                  <span>GLiNER+{activeModelName ? activeModelName.split(' ')[0] : 'Qwen'}</span>
                </button>

                {/* 100% Offline / Hybrid Air-Gap Toggle */}
                {onToggleStrictOffline && (
                  <button
                    type="button"
                    onClick={onToggleStrictOffline}
                    data-testid="offline_mode_toggle"
                    title={
                      isStrictOffline
                        ? 'Tryb 100% Offline (Air-Gap) aktywny. Kliknij, aby przejść w tryb hybrydowy.'
                        : 'Tryb Hybrydowy aktywny. Kliknij, aby przejść w tryb 100% Offline.'
                    }
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      isStrictOffline
                        ? 'bg-emerald-500/25 border border-emerald-500/50 text-emerald-300'
                        : 'bg-[#1e2638] hover:bg-[#2d3748] border border-white/10 text-gray-300'
                    }`}
                  >
                    {isStrictOffline ? (
                      <Lock className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Globe className="w-2.5 h-2.5 text-[#00e5ff] shrink-0" />
                    )}
                    <span>{isStrictOffline ? 'Offline' : 'Hybryda'}</span>
                  </button>
                )}

                {hardwareState.isDndActive && (
                  <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-[9px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0">
                    <BellOff className="w-2.5 h-2.5" />
                    <span>DND</span>
                  </span>
                )}
              </div>

              {/* Dynamic live status - only shown when speaking or processing */}
              {(isSpeaking || isProcessing) && (
                <div className="text-[10px] leading-tight mt-0.5 animate-fadeIn">
                  {isSpeaking ? (
                    <span className="text-[#00e5ff] font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00e5ff] animate-ping shrink-0" />
                      Mówi na głos...
                    </span>
                  ) : (
                    <span className="text-[#8b5cf6] font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-ping shrink-0" />
                      Przetwarzanie NPU...
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Hands-Free Car & Walk Mode */}
            {onOpenHandsFree && (
              <button
                type="button"
                onClick={onOpenHandsFree}
                data-testid="hands_free_car_button"
                title="Włącz tryb głośnomówiący Hands-Free (Samochód / Spacer)"
                className="p-1.5 rounded-lg text-amber-400 bg-amber-400/10 hover:bg-amber-400/25 border border-amber-400/20 transition-all flex items-center gap-1 active:scale-95"
              >
                <Car className="w-4 h-4" />
                <span className="hidden md:inline text-[10px] font-bold">Auto</span>
              </button>
            )}

            {/* Wake Word Continuous Listening Button */}
            <button
              type="button"
              onClick={onToggleWakeWord}
              data-testid="wake_word_toggle_button"
              title={wakeWordActive ? 'Wyłącz nasłuch słowa kluczowego' : 'Włącz nasłuch (Hej Cogni)'}
              className={`p-1.5 rounded-lg transition-colors ${
                wakeWordActive
                  ? 'bg-[#00e5ff]/20 text-[#00e5ff] ring-1 ring-[#00e5ff]/50'
                  : 'text-[#94a3b8] hover:bg-white/5'
              }`}
            >
              <Radio className={`w-4 h-4 ${wakeWordActive ? 'animate-pulse' : ''}`} />
            </button>

            {/* Clear Chat Button */}
            <button
              type="button"
              onClick={onClearChat}
              data-testid="clear_chat_button"
              title="Wyczyść historię czatu"
              className="p-1.5 rounded-lg text-[#94a3b8] hover:bg-white/5 hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* 100% Offline Air-Gap Status Banner */}
      {isStrictOffline && (
        <div className="bg-emerald-950/40 border-b border-emerald-500/30 px-3.5 py-1.5 flex items-center justify-between text-xs text-emerald-300 shrink-0 animate-fadeIn">
          <div className="flex items-center gap-2 min-w-0">
            <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">
              <strong>Tryb 100% Offline (Air-Gap):</strong> Wszystkie zapytania są przetwarzane wyłącznie na NPU telefonu. Zero danych w sieci.
            </span>
          </div>
          {onToggleStrictOffline && (
            <button
              type="button"
              onClick={onToggleStrictOffline}
              className="text-[10px] bg-emerald-500/20 hover:bg-emerald-500/35 px-2 py-0.5 rounded border border-emerald-500/40 font-semibold text-emerald-200 shrink-0 ml-2 transition-colors"
            >
              Wyłącz
            </button>
          )}
        </div>
      )}

      {/* Sessions & Smart Tools Sub-Bar */}
      <div className="bg-[#0e141f] border-b border-[#2d3748] px-3 sm:px-4 py-2 flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setIsSessionModalOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#152033] hover:bg-[#1a2840] border border-[#2d3748] hover:border-[#00e5ff]/40 text-xs text-white transition-all min-w-0"
        >
          <Layers className="w-3.5 h-3.5 text-[#00e5ff] shrink-0" />
          <span className="font-semibold truncate max-w-[130px] sm:max-w-[200px]">
            {activeSessionTitle || 'Główny asystent'}
          </span>
          <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Local Knowledge Base (RAG) */}
          {onOpenKnowledgeBase && (
            <button
              type="button"
              onClick={onOpenKnowledgeBase}
              data-testid="knowledge_base_button"
              title="Lokalna Baza Wiedzy (Offline RAG / Dokumenty)"
              className="p-1.5 rounded-xl bg-[#121824] hover:bg-[#1e2638] text-gray-300 hover:text-[#00e5ff] border border-[#2d3748] transition-colors"
            >
              <BookOpen className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Android Launcher Simulator */}
          {onOpenLauncherSimulator && (
            <button
              type="button"
              onClick={onOpenLauncherSimulator}
              data-testid="launcher_simulator_button"
              title="Symulator pulpitu Androida (Pływający dymek)"
              className="p-1.5 rounded-xl bg-[#121824] hover:bg-[#1e2638] text-gray-300 hover:text-[#8b5cf6] border border-[#2d3748] transition-colors"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Notifications Button with unread badge */}
          <button
            type="button"
            onClick={() => setIsNotifModalOpen(true)}
            title="Centrum Powiadomień & Smart Reply"
            className="relative p-1.5 rounded-xl bg-[#121824] hover:bg-[#1e2638] text-gray-300 hover:text-white border border-[#2d3748] transition-colors"
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadNotifCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                {unreadNotifCount}
              </span>
            )}
          </button>

          {/* Screen Inspection Button */}
          <button
            type="button"
            onClick={() => setIsScreenModalOpen(true)}
            title="Wizualna Inspekcja Ekranu & OCR"
            className="p-1.5 rounded-xl bg-[#121824] hover:bg-[#1e2638] text-gray-300 hover:text-[#00e5ff] border border-[#2d3748] transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          {/* Long-Term Memory Profile Button */}
          <button
            type="button"
            onClick={() => setIsMemoryModalOpen(true)}
            title="Pamięć Długoterminowa Asystenta"
            className="p-1.5 rounded-xl bg-[#121824] hover:bg-[#1e2638] text-amber-300/80 hover:text-amber-300 border border-[#2d3748] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Active Timers Banner if any timer is running */}
      {hardwareState.activeTimers.length > 0 && (
        <div className="bg-[#1e1b4b]/80 border-b border-[#8b5cf6]/40 px-4 py-2 flex items-center gap-2 overflow-x-auto">
          <Clock className="w-4 h-4 text-[#00e5ff] shrink-0 animate-spin" />
          <span className="text-xs font-semibold text-[#f1f5f9] shrink-0">Aktywne minutniki:</span>
          {hardwareState.activeTimers.map((timer) => (
            <div
              key={timer.id}
              className="flex items-center gap-1.5 bg-[#121824] border border-[#8b5cf6]/50 rounded-lg px-2.5 py-1 text-xs text-white shrink-0"
            >
              <span className="text-gray-300">{timer.label}:</span>
              <span className="font-mono font-bold text-[#00e5ff]">
                {formatSeconds(timer.remainingSeconds)}
              </span>
              <button
                type="button"
                onClick={() => hardwareManager.cancelTimer(timer.id)}
                title="Anuluj minutnik"
                className="text-gray-400 hover:text-red-400 ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

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
          <div className="mb-2 bg-[#0d1624] border border-[#00e5ff]/40 rounded-xl px-3 py-2 flex items-center justify-between shadow-[0_0_15px_rgba(0,229,255,0.15)] animate-fadeIn">
            <div className="flex items-center gap-2 text-xs text-[#00e5ff] font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00e5ff] animate-ping shrink-0" />
              <span>Słucham... Powiedz swoje polecenie lub pytanie</span>
            </div>
            <button
              type="button"
              onClick={onStopVoice}
              className="text-xs font-bold text-gray-300 hover:text-white px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors shrink-0"
            >
              Zatrzymaj
            </button>
          </div>
        )}

        {/* Audio Visualizer (Waveform & Quantum Orb) during Voice Input */}
        {isListening && <NeonAudioVisualizer rmsLevel={rmsLevel} />}

        {/* Hidden Camera Picker Input */}
        <input
          type="file"
          ref={cameraInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
          capture="environment"
        />

        {/* Hidden Gallery Picker Input */}
        <input
          type="file"
          ref={galleryInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*"
        />

        {/* Hidden Document Picker Input */}
        <input
          type="file"
          ref={docInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.txt,.doc,.docx,.md,.csv,.json"
        />

        {/* Pending Attachment Preview Bar */}
        {pendingAttachment && (
          <div className="mb-2 bg-[#0a0e14] border border-[#00e5ff]/40 rounded-xl p-2 flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2.5 min-w-0">
              {pendingAttachment.isImage && pendingAttachment.previewUrl ? (
                <img
                  src={pendingAttachment.previewUrl}
                  alt={pendingAttachment.fileName}
                  className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-[#00e5ff]/15 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-[#00e5ff]" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {pendingAttachment.fileName}
                </div>
                <div className="text-[10px] text-gray-400 font-mono">
                  {pendingAttachment.fileSize} • Gotowy do analizy przez agenta
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setPendingAttachment(null)}
              title="Usuń załącznik"
              className="p-1 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input Controls Row */}
        <div className="flex items-center gap-2 relative">
          {/* Agent Action Sheet / Tools Menu Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowToolsMenu(!showToolsMenu)}
              data-testid="tools_button"
              title="Narzędzia Agenta AI & Załączniki"
              className={`p-2.5 rounded-full transition-all shrink-0 ${
                showToolsMenu
                  ? 'bg-[#00e5ff]/20 text-[#00e5ff] rotate-45'
                  : 'text-[#94a3b8] hover:text-white hover:bg-white/10'
              }`}
            >
              <Plus className="w-5 h-5 transition-transform duration-200" />
            </button>

            {showToolsMenu && (
              <div className="absolute bottom-12 left-0 w-72 sm:w-80 bg-[#121824] border border-[#2d3748] rounded-2xl shadow-2xl p-2 z-40 animate-fadeIn backdrop-blur-md">
                <div className="px-3 py-1.5 border-b border-white/5 flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-[#00e5ff]" />
                    <span>Załączniki i multimedia</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowToolsMenu(false)}
                    className="text-gray-400 hover:text-white p-0.5 rounded"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  {/* 1. Live Camera Vision (Gemini Live Stream) */}
                  {onOpenLiveCamera && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenLiveCamera();
                      }}
                      className="w-full p-2.5 rounded-xl bg-gradient-to-r from-[#00e5ff]/15 to-[#8b5cf6]/15 hover:from-[#00e5ff]/25 hover:to-[#8b5cf6]/25 border border-[#00e5ff]/40 flex items-center gap-3 text-left transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#00e5ff]/20 border border-[#00e5ff]/50 flex items-center justify-center shrink-0">
                        <Eye className="w-4 h-4 text-[#00e5ff] animate-pulse" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white group-hover:text-[#00e5ff] transition-colors flex items-center gap-1.5">
                          <span>Wizja Na Żywo (Kamera Live)</span>
                          <span className="text-[9px] bg-[#00e5ff]/20 text-[#00e5ff] px-1 rounded font-bold">Gemini Live</span>
                        </div>
                        <div className="text-[11px] text-gray-300 truncate">
                          Obraz z aparatu w czasie rzeczywistym + głos
                        </div>
                      </div>
                    </button>
                  )}

                  {/* 2. Camera Snapshot Capture */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowToolsMenu(false);
                      cameraInputRef.current?.click();
                    }}
                    className="w-full p-2.5 rounded-xl hover:bg-[#1e2638] flex items-center gap-3 text-left transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#00e5ff]/15 group-hover:bg-[#00e5ff]/25 border border-[#00e5ff]/30 flex items-center justify-center shrink-0">
                      <Camera className="w-4 h-4 text-[#00e5ff]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white group-hover:text-[#00e5ff] transition-colors">
                        Zrób zdjęcie (Aparat)
                      </div>
                      <div className="text-[11px] text-gray-400 truncate">
                        Szybkie zdjęcie paragonu, etykiety lub obiektu
                      </div>
                    </div>
                  </button>

                  {/* 2. Gallery Photos */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowToolsMenu(false);
                      galleryInputRef.current?.click();
                    }}
                    className="w-full p-2.5 rounded-xl hover:bg-[#1e2638] flex items-center gap-3 text-left transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#8b5cf6]/15 group-hover:bg-[#8b5cf6]/25 border border-[#8b5cf6]/30 flex items-center justify-center shrink-0">
                      <Image className="w-4 h-4 text-[#8b5cf6]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white group-hover:text-[#8b5cf6] transition-colors">
                        Wybierz z Galerii (Zdjęcia)
                      </div>
                      <div className="text-[11px] text-gray-400 truncate">
                        Zrzut ekranu, wykres lub zdjęcie z pamięci telefonu
                      </div>
                    </div>
                  </button>

                  {/* 3. Document / File */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowToolsMenu(false);
                      docInputRef.current?.click();
                    }}
                    className="w-full p-2.5 rounded-xl hover:bg-[#1e2638] flex items-center gap-3 text-left transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 group-hover:bg-amber-500/25 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-amber-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                        Dołącz Plik / Dokument
                      </div>
                      <div className="text-[11px] text-gray-400 truncate">
                        PDF, TXT, DOCX, specyfikacje i notatki
                      </div>
                    </div>
                  </button>

                  {/* 4. Local Knowledge Base (RAG) */}
                  {onOpenKnowledgeBase && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowToolsMenu(false);
                        onOpenKnowledgeBase();
                      }}
                      className="w-full p-2.5 rounded-xl hover:bg-[#1e2638] flex items-center gap-3 text-left transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/15 group-hover:bg-emerald-500/25 border border-emerald-500/30 flex items-center justify-center shrink-0">
                        <BookOpen className="w-4 h-4 text-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                          Lokalna Baza Wiedzy (Offline RAG)
                        </div>
                        <div className="text-[11px] text-gray-400 truncate">
                          Wyszukaj lub dodaj umowę do pamięci urządzenia
                        </div>
                      </div>
                    </button>
                  )}
                </div>
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

      {/* Session Drawer Modal */}
      <SessionDrawerModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        onSessionSwitched={(id) => onSwitchSession?.(id)}
      />

      {/* Android Notification Center Modal */}
      <NotificationCenterModal
        isOpen={isNotifModalOpen}
        onClose={() => setIsNotifModalOpen(false)}
      />

      {/* Long-Term Memory Profile Modal */}
      <MemoryManagerModal
        isOpen={isMemoryModalOpen}
        onClose={() => setIsMemoryModalOpen(false)}
      />

      {/* Visual Screen Inspection & OCR Modal */}
      <ScreenInspectionModal
        isOpen={isScreenModalOpen}
        onClose={() => setIsScreenModalOpen(false)}
      />
    </div>
  );
};
