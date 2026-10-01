import React, { useState, useEffect } from 'react';
import {
  Video,
  Square,
  Play,
  Trash2,
  Plus,
  MousePointer,
  Smartphone,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Layers,
  Sparkles,
  ArrowDown
} from 'lucide-react';
import { RoutineAction, SkillEntity } from '../../types';
import { skillRecorder } from '../../services/skillRecorder';
import { soundAndHaptics } from '../../services/soundAndHaptics';

interface SkillRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSkillSaved: (skill: SkillEntity) => void;
}

export const SkillRecorderModal: React.FC<SkillRecorderModalProps> = ({
  isOpen,
  onClose,
  onSkillSaved
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [actions, setActions] = useState<RoutineAction[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [skillName, setSkillName] = useState('Oznacz maile w Gmail');
  const [customNodeText, setCustomNodeText] = useState('');
  const [selectedApp, setSelectedApp] = useState('Gmail');

  useEffect(() => {
    const unsub = skillRecorder.subscribe((rec, acts, time) => {
      setIsRecording(rec);
      setActions(acts);
      setElapsedTime(time);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleStartRecording = () => {
    skillRecorder.startRecording();
  };

  const handleStopAndSave = () => {
    const recorded = skillRecorder.stopRecording();
    if (recorded.length === 0) {
      alert('Nie zarejestrowano żadnych czynności. Dodaj przynajmniej jedną akcję.');
      return;
    }

    const finalName = skillName.trim() || `Nagrany Skill ${new Date().toLocaleTimeString('pl-PL')}`;
    const newSkill: SkillEntity = {
      id: Date.now(),
      name: finalName,
      actionsJson: JSON.stringify(recorded),
      createdAt: Date.now()
    };

    onSkillSaved(newSkill);
    soundAndHaptics.playSuccessChime();
    onClose();
  };

  const handleAddAppLaunch = (appName: string) => {
    skillRecorder.recordAction('OPEN_APP', appName);
  };

  const handleAddClickNode = (text: string) => {
    if (!text.trim()) return;
    skillRecorder.recordAction('CLICK_NODE', text.trim());
    setCustomNodeText('');
  };

  const handleAddSwipe = (dir: 'up' | 'down') => {
    skillRecorder.recordAction('SWIPE_SCREEN', dir);
  };

  const handleAddSpeak = (text: string) => {
    skillRecorder.recordAction('SPEAK', text);
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#121824] border border-[#2d3748] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="bg-[#151e2e] border-b border-[#2d3748] p-3.5 sm:p-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl p-0.5 shrink-0 flex items-center justify-center ${
                isRecording
                  ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse'
                  : 'bg-gradient-to-tr from-[#00e5ff] to-[#8b5cf6]'
              }`}
            >
              <div className="w-full h-full bg-[#121824] rounded-[10px] flex items-center justify-center">
                <Video className={`w-5 h-5 ${isRecording ? 'text-red-400' : 'text-[#00e5ff]'}`} />
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>Rejestrator Skilli & Makr (Demonstracja)</span>
                {isRecording ? (
                  <span className="bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                    REC {formatSeconds(elapsedTime)}
                  </span>
                ) : (
                  <span className="bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/30 text-[10px] font-mono px-2 py-0.5 rounded-full">
                    Accessibility Recorder
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                Zarejestruj sekwencję czynności w aplikacjach, a agent powtórzy ją na komendę głosową
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Recording Control Strip */}
        <div className="bg-[#0a0e14] border-b border-[#2d3748] p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {!isRecording ? (
              <button
                type="button"
                onClick={handleStartRecording}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.4)] active:scale-95 transition-all"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></div>
                <span>Rozpocznij Nagrywanie</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopAndSave}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#10b981] to-[#059669] text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.4)] active:scale-95 transition-all"
              >
                <Square className="w-3.5 h-3.5 fill-white" />
                <span>Zakończ i Zapisz Skill ({actions.length} akcji)</span>
              </button>
            )}

            <div className="text-xs text-gray-400">
              Kroki w pamięci: <span className="font-bold text-white">{actions.length}</span>
            </div>
          </div>

          {/* Quick presets for Gmail demo requested by user */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-gray-400 hidden sm:inline">Przykłady:</span>
            <button
              type="button"
              onClick={() => {
                skillRecorder.startRecording();
                skillRecorder.recordAction('OPEN_APP', 'Gmail');
                skillRecorder.recordAction('CLICK_NODE', 'Zaznacz wszystkie');
                skillRecorder.recordAction('CLICK_NODE', 'Oznacz jako przeczytane');
                skillRecorder.recordAction('SPEAK', 'Wszystkie wiadomości w Gmail zostały oznaczone jako przeczytane.');
                setSkillName('Oznacz maile w Gmail');
              }}
              className="px-2.5 py-1 bg-[#1e2638] hover:bg-[#2d3748] text-[#00e5ff] text-[11px] font-semibold rounded-lg border border-[#00e5ff]/20 transition-all"
            >
              Demo: Oznacz maile w Gmail
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Demonstration Action Injection Panel (when recording) */}
          <div className="bg-[#152033] border border-white/10 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <MousePointer className="w-4 h-4 text-[#00e5ff]" />
                <span>Panel Demonstracji Czynności (Accessibility Simulator)</span>
              </h3>
              <span className="text-[10px] text-gray-400 font-mono">
                {isRecording ? 'STATUS: NAGRYWANIE AKTYWNE' : 'WŁĄCZ NAGRYWANIE, ABY REJESTROWAĆ'}
              </span>
            </div>

            {/* Quick App launcher clicks */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-gray-400 font-semibold block">
                1. Otwarcie aplikacji w tle:
              </label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {['Gmail', 'YouTube', 'Spotify', 'Aparat', 'Wiadomości', 'Chrome', 'Mapy'].map((app) => (
                  <button
                    key={app}
                    type="button"
                    disabled={!isRecording}
                    onClick={() => handleAddAppLaunch(app)}
                    className="px-2.5 py-1 rounded-lg bg-[#0a0e14] hover:bg-[#1e2638] disabled:opacity-40 text-xs font-medium text-gray-200 border border-white/5 transition-all"
                  >
                    + Otwórz {app}
                  </button>
                ))}
              </div>
            </div>

            {/* In-App Element Clicks */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-gray-400 font-semibold block">
                2. Kliknięcie elementu interfejsu (UI Node):
              </label>
              <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {['Zaznacz wszystkie', 'Oznacz jako przeczytane', 'Subskrybuj', 'Wyślij', 'Odtwórz', 'Kup teraz'].map(
                  (btn) => (
                    <button
                      key={btn}
                      type="button"
                      disabled={!isRecording}
                      onClick={() => handleAddClickNode(btn)}
                      className="px-2.5 py-1 rounded-lg bg-[#00e5ff]/15 hover:bg-[#00e5ff]/25 disabled:opacity-40 text-xs font-medium text-[#00e5ff] border border-[#00e5ff]/30 transition-all"
                    >
                      + Kliknij „{btn}”
                    </button>
                  )
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customNodeText}
                  onChange={(e) => setCustomNodeText(e.target.value)}
                  placeholder="Wpisz dowolną nazwę przycisku..."
                  disabled={!isRecording}
                  className="flex-1 bg-[#0a0e14] border border-[#2d3748] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#00e5ff] disabled:opacity-40"
                />
                <button
                  type="button"
                  disabled={!isRecording || !customNodeText.trim()}
                  onClick={() => handleAddClickNode(customNodeText)}
                  className="px-3 py-1.5 rounded-xl bg-[#00e5ff] text-black font-bold text-xs hover:bg-[#00b4d8] disabled:opacity-40 transition-all"
                >
                  Dodaj kliknięcie
                </button>
              </div>
            </div>

            {/* Gesture actions */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <button
                type="button"
                disabled={!isRecording}
                onClick={() => handleAddSwipe('down')}
                className="px-3 py-1.5 rounded-xl bg-[#1e2638] hover:bg-[#2d3748] disabled:opacity-40 text-xs text-gray-300 transition-colors"
              >
                + Przewiń ekran w dół
              </button>
              <button
                type="button"
                disabled={!isRecording}
                onClick={() => handleAddSwipe('up')}
                className="px-3 py-1.5 rounded-xl bg-[#1e2638] hover:bg-[#2d3748] disabled:opacity-40 text-xs text-gray-300 transition-colors"
              >
                + Przewiń w górę
              </button>
              <button
                type="button"
                disabled={!isRecording}
                onClick={() => handleAddSpeak('Operacja została zakończona sukcesem.')}
                className="px-3 py-1.5 rounded-xl bg-[#8b5cf6]/20 hover:bg-[#8b5cf6]/30 text-[#8b5cf6] disabled:opacity-40 text-xs font-semibold border border-[#8b5cf6]/30 transition-colors"
              >
                + Wypowiedź TTS
              </button>
            </div>
          </div>

          {/* Timeline of Recorded Steps */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-gray-300">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#8b5cf6]" />
                <span>Zarejestrowana Oś Czasu ({actions.length} kroków):</span>
              </span>
              {actions.length > 0 && (
                <button
                  type="button"
                  onClick={() => skillRecorder.clear()}
                  className="text-gray-400 hover:text-red-400 transition-colors text-[11px]"
                >
                  Wyczyść kroki
                </button>
              )}
            </div>

            {actions.length === 0 ? (
              <div className="bg-[#0a0e14] p-6 rounded-2xl border border-white/5 text-center text-xs text-gray-400 space-y-1">
                <Video className="w-6 h-6 mx-auto text-gray-500 mb-2 opacity-50" />
                <p>Brak zarejestrowanych czynności.</p>
                <p className="text-[11px] text-gray-500">
                  Naciśnij „Rozpocznij Nagrywanie”, aby przechwytywać kroki demonstracji.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
                {actions.map((act, index) => (
                  <div
                    key={index}
                    className="p-3 bg-[#0a0e14] border border-white/5 rounded-xl flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 h-6 rounded-full bg-[#1e2638] text-gray-400 font-mono font-bold flex items-center justify-center text-[10px] shrink-0">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#00e5ff] font-mono text-[11px]">
                            {act.type}
                          </span>
                          <span className="text-white truncate font-medium">{act.parameter1}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => skillRecorder.removeAction(index)}
                      className="p-1 text-gray-500 hover:text-red-400 transition-colors shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Skill Name & Save Section */}
          <div className="bg-[#0a0e14] p-4 rounded-2xl border border-[#2d3748] space-y-2.5">
            <label className="block text-xs font-semibold text-gray-300">
              Nazwa skilla (będzie rozpoznawana głosem, np. „Uruchom [nazwa]”):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={skillName}
                onChange={(e) => setSkillName(e.target.value)}
                placeholder="Np. Oznacz maile w Gmail, Subskrybuj kanał..."
                className="flex-1 bg-[#152033] border border-[#2d3748] rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-[#00e5ff]"
              />
              <button
                type="button"
                onClick={handleStopAndSave}
                disabled={actions.length === 0}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#00e5ff] to-[#8b5cf6] text-black font-extrabold text-xs hover:opacity-95 disabled:opacity-40 transition-all shadow-md shrink-0"
              >
                Zapisz Skill
              </button>
            </div>
          </div>

          {/* Android System Architecture Info Note */}
          <div className="bg-[#121824] p-3.5 rounded-xl border border-white/5 text-[11px] text-gray-400 space-y-1">
            <div className="font-bold text-[#00e5ff] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Jak to działa w natywnym systemie Android (EMUI 10 / AccessibilityService)?</span>
            </div>
            <p>
              Rejestrator nasłuchuje zdarzeń systemowych <code>TYPE_VIEW_CLICKED</code> oraz{' '}
              <code>TYPE_WINDOW_STATE_CHANGED</code>. Po włączeniu nagrywania użytkownik wykonuje czynności w
              dowolnej aplikacji, a asystent zapisuje identyfikatory węzłów, tekst przycisków i czasy opóźnień do
              bazy Room/SQLite. Komenda głosowa <em>„Uruchom [nazwa skilla]”</em> natychmiast odtwarza nagrane makro.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
