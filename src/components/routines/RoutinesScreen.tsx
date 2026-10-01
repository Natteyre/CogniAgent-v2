import React, { useState } from 'react';
import {
  Plus,
  Play,
  Trash2,
  Zap,
  Power,
  Layers,
  ArrowRight,
  Download,
  Upload,
  Check
} from 'lucide-react';
import { SkillEntity, RoutineTriggerEntity, ActionType, RoutineAction } from '../../types';

interface RoutinesScreenProps {
  skills: SkillEntity[];
  triggers: RoutineTriggerEntity[];
  onExecuteSkill: (skill: SkillEntity) => void;
  onSaveSkill: (name: string, actions: RoutineAction[]) => void;
  onDeleteSkill: (id: number) => void;
  onSaveTrigger: (triggerType: string, skillName: string) => void;
  onToggleTrigger: (trigger: RoutineTriggerEntity) => void;
  onDeleteTrigger: (id: number) => void;
  onExportJson?: () => string;
  onImportJson?: (json: string) => void;
}

const ACTION_TYPES: ActionType[] = [
  'SPEAK',
  'OPEN_APP',
  'DELAY',
  'CLICK_NODE',
  'TOGGLE_HARDWARE',
  'SWIPE_SCREEN',
  'TAP_COORDINATE',
  'SUMMARIZE_SCREEN',
  'SET_TIMER',
  'SET_ALARM',
  'SET_VOLUME'
];

export const RoutinesScreen: React.FC<RoutinesScreenProps> = ({
  skills,
  triggers,
  onExecuteSkill,
  onSaveSkill,
  onDeleteSkill,
  onSaveTrigger,
  onToggleTrigger,
  onDeleteTrigger,
  onExportJson,
  onImportJson
}) => {
  const [selectedTab, setSelectedTab] = useState<0 | 1>(0);
  const [showCreateSkillModal, setShowCreateSkillModal] = useState(false);
  const [showCreateTriggerModal, setShowCreateTriggerModal] = useState(false);
  const [executingSkillId, setExecutingSkillId] = useState<number | null>(null);

  // New Skill Form State
  const [newSkillName, setNewSkillName] = useState('');
  const [newActions, setNewActions] = useState<RoutineAction[]>([
    { type: 'SPEAK', parameter1: 'Rozpoczynam rutynę' },
    { type: 'DELAY', parameter1: '1000' }
  ]);

  // New Trigger Form State
  const [newTriggerType, setNewTriggerType] = useState('ACTION_POWER_CONNECTED');
  const [newTriggerSkill, setNewTriggerSkill] = useState(skills[0]?.name || '');

  const handleSaveSkill = () => {
    if (newSkillName.trim() && newActions.length > 0) {
      onSaveSkill(newSkillName.trim(), newActions);
      setNewSkillName('');
      setNewActions([
        { type: 'SPEAK', parameter1: 'Rozpoczynam rutynę' },
        { type: 'DELAY', parameter1: '1000' }
      ]);
      setShowCreateSkillModal(false);
    }
  };

  const handleSaveTrigger = () => {
    if (newTriggerSkill.trim()) {
      onSaveTrigger(newTriggerType, newTriggerSkill.trim());
      setShowCreateTriggerModal(false);
    }
  };

  const handleRunSkill = async (skill: SkillEntity) => {
    setExecutingSkillId(skill.id);
    await onExecuteSkill(skill);
    setTimeout(() => setExecutingSkillId(null), 1000);
  };

  const getActionsCount = (actionsJson: string): number => {
    try {
      return JSON.parse(actionsJson).length;
    } catch {
      return 0;
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0e14] overflow-y-auto">
      {/* Header */}
      <header className="bg-[#121824] border-b border-[#2d3748] px-4 py-3 shrink-0 shadow-md">
        <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
          Kreator Makr i Umiejętności
        </h1>
        <p className="text-xs text-[#94a3b8]">
          Automatyzacja procesów Kirin 980 i wyzwalacze zdarzeń
        </p>

        {/* Tab Switcher */}
        <div className="flex mt-3 border-b border-[#2d3748]">
          <button
            type="button"
            onClick={() => setSelectedTab(0)}
            data-testid="tab_skills"
            className={`flex-1 py-2 text-xs sm:text-sm font-semibold transition-all border-b-2 ${
              selectedTab === 0
                ? 'border-[#00e5ff] text-[#00e5ff]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Umiejętności ({skills.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedTab(1)}
            data-testid="tab_triggers"
            className={`flex-1 py-2 text-xs sm:text-sm font-semibold transition-all border-b-2 ${
              selectedTab === 1
                ? 'border-[#8b5cf6] text-[#8b5cf6]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Wyzwalacze ({triggers.length})
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 p-4 space-y-4">
        {selectedTab === 0 ? (
          <div>
            {/* Add Skill Button */}
            <button
              type="button"
              onClick={() => setShowCreateSkillModal(true)}
              data-testid="add_skill_button"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#00e5ff] to-[#00b4d8] text-[#0a0e14] font-bold text-sm shadow-[0_0_15px_rgba(0,229,255,0.25)] hover:opacity-95 transition-all mb-4"
            >
              <Plus className="w-5 h-5" />
              <span>Stwórz nową umiejętność (+ Add Skill)</span>
            </button>

            {skills.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl bg-[#121824] border border-[#2d3748] text-gray-400 text-sm">
                Brak zdefiniowanych umiejętności. Kliknij powyższy przycisk, aby stworzyć pierwsze makro.
              </div>
            ) : (
              <div className="space-y-3">
                {skills.map((skill) => {
                  const count = getActionsCount(skill.actionsJson);
                  const isRunning = executingSkillId === skill.id;

                  return (
                    <div
                      key={skill.id}
                      data-testid={`skill_card_${skill.id}`}
                      className="bg-[#121824] border border-[#2d3748] rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-[#00e5ff]/40 transition-all"
                    >
                      <div className="flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-[#00e5ff]" />
                          <h3 className="font-bold text-sm sm:text-base text-white">{skill.name}</h3>
                        </div>
                        <p className="text-xs text-[#94a3b8] mt-1">
                          Liczba akcji w sekwencji: <span className="text-[#00e5ff] font-semibold">{count}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRunSkill(skill)}
                          data-testid={`run_skill_${skill.id}`}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            isRunning
                              ? 'bg-[#10b981] text-white animate-pulse'
                              : 'bg-[#00e5ff] hover:bg-[#00b4d8] text-black shadow-[0_0_10px_rgba(0,229,255,0.3)]'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{isRunning ? 'Działa...' : 'Uruchom'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onDeleteSkill(skill.id)}
                          data-testid={`delete_skill_${skill.id}`}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Add Trigger Button */}
            <button
              type="button"
              onClick={() => {
                setNewTriggerSkill(skills[0]?.name || '');
                setShowCreateTriggerModal(true);
              }}
              data-testid="add_trigger_button"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#8b5cf6] to-[#6d28d9] text-white font-bold text-sm shadow-[0_0_15px_rgba(139,92,246,0.3)] hover:opacity-95 transition-all mb-4"
            >
              <Zap className="w-5 h-5 text-amber-300" />
              <span>Powiąż wyzwalacz sprzętowy (+ Add Trigger)</span>
            </button>

            {triggers.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-2xl bg-[#121824] border border-[#2d3748] text-gray-400 text-sm">
                Brak powiązanych wyzwalaczy. Możesz dodać reakcję na podłączenie lub odłączenie ładowarki.
              </div>
            ) : (
              <div className="space-y-3">
                {triggers.map((trigger) => {
                  const triggerLabel =
                    trigger.triggerType === 'ACTION_POWER_CONNECTED'
                      ? 'Podłączenie ładowarki (Zasilanie)'
                      : trigger.triggerType === 'ACTION_POWER_DISCONNECTED'
                      ? 'Odłączenie ładowarki'
                      : trigger.triggerType;

                  return (
                    <div
                      key={trigger.id}
                      data-testid={`trigger_card_${trigger.id}`}
                      className="bg-[#121824] border border-[#2d3748] rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-[#8b5cf6]/40 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center shrink-0">
                          <Power className="w-5 h-5 text-[#8b5cf6]" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-white">{triggerLabel}</h3>
                          <p className="text-xs text-[#00e5ff] font-medium mt-0.5">
                            Umiejętność: {trigger.associatedSkillName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Toggle Switch */}
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={trigger.enabled}
                            onChange={() => onToggleTrigger(trigger)}
                            data-testid={`toggle_trigger_${trigger.id}`}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-[#1e2638] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00e5ff]"></div>
                        </label>

                        <button
                          type="button"
                          onClick={() => onDeleteTrigger(trigger.id)}
                          data-testid={`delete_trigger_${trigger.id}`}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Create Skill */}
      {showCreateSkillModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121824] border border-[#2d3748] rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <h2 className="text-base font-bold text-white tracking-wide">Kreator Umiejętności</h2>

            <div className="space-y-3 flex-1 overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Nazwa umiejętności
                </label>
                <input
                  type="text"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  data-testid="skill_name_input"
                  placeholder="np. Tryb Kinowy"
                  className="w-full bg-[#0a0e14] border border-[#2d3748] focus:border-[#00e5ff] rounded-xl px-3 py-2 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Sekwencja Akcji:
                </label>

                <div className="space-y-2">
                  {newActions.map((action, idx) => (
                    <div
                      key={idx}
                      className="bg-[#1a2233] border border-[#2d3748] rounded-xl p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#00e5ff]">
                          Krok {idx + 1}: {action.type}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...newActions];
                            updated.splice(idx, 1);
                            setNewActions(updated);
                          }}
                          className="text-gray-400 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Action Type Dropdown */}
                      <select
                        value={action.type}
                        onChange={(e) => {
                          const updated = [...newActions];
                          updated[idx] = { ...action, type: e.target.value as ActionType };
                          setNewActions(updated);
                        }}
                        className="w-full bg-[#0a0e14] border border-[#2d3748] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                      >
                        {ACTION_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>

                      {/* Parameter 1 */}
                      <input
                        type="text"
                        value={action.parameter1}
                        onChange={(e) => {
                          const updated = [...newActions];
                          updated[idx] = { ...action, parameter1: e.target.value };
                          setNewActions(updated);
                        }}
                        placeholder={
                          action.type === 'SPEAK'
                            ? 'Tekst do wypowiedzenia'
                            : action.type === 'DELAY'
                            ? 'Czas opóźnienia w ms (np. 1500)'
                            : action.type === 'TOGGLE_HARDWARE'
                            ? 'torch lub bluetooth'
                            : action.type === 'SET_VOLUME'
                            ? 'Głośność w % (0-100)'
                            : action.type === 'SET_TIMER'
                            ? 'Czas w sekundach (np. 300)'
                            : 'Parametr akcji'
                        }
                        className="w-full bg-[#0a0e14] border border-[#2d3748] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                      />

                      {/* Parameter 2 if hardware or alarm/timer */}
                      {(action.type === 'TOGGLE_HARDWARE' ||
                        action.type === 'SET_TIMER' ||
                        action.type === 'SET_ALARM') && (
                        <input
                          type="text"
                          value={action.parameter2 || ''}
                          onChange={(e) => {
                            const updated = [...newActions];
                            updated[idx] = { ...action, parameter2: e.target.value };
                            setNewActions(updated);
                          }}
                          placeholder={
                            action.type === 'TOGGLE_HARDWARE' ? 'on lub off' : 'Etykieta / Nazwa'
                          }
                          className="w-full bg-[#0a0e14] border border-[#2d3748] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setNewActions([
                      ...newActions,
                      { type: 'SPEAK', parameter1: 'Nowa akcja rutyny' }
                    ])
                  }
                  data-testid="add_action_in_dialog_button"
                  className="w-full mt-2 py-2 border border-dashed border-[#00e5ff]/40 rounded-xl text-xs font-semibold text-[#00e5ff] hover:bg-[#00e5ff]/10 transition-colors flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Dodaj Akcję</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2d3748]">
              <button
                type="button"
                onClick={() => setShowCreateSkillModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white transition-colors"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleSaveSkill}
                disabled={!newSkillName.trim() || newActions.length === 0}
                data-testid="save_skill_button"
                className="px-4 py-2 rounded-xl bg-[#00e5ff] text-black font-bold text-xs hover:bg-[#00b4d8] disabled:opacity-50 transition-all shadow-[0_0_10px_rgba(0,229,255,0.3)]"
              >
                Zapisz Umiejętność
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Create Trigger */}
      {showCreateTriggerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121824] border border-[#2d3748] rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-white tracking-wide">
              Powiąż Wyzwalacz Sprzętowy
            </h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Zdarzenie systemowe:
                </label>
                <select
                  value={newTriggerType}
                  onChange={(e) => setNewTriggerType(e.target.value)}
                  className="w-full bg-[#0a0e14] border border-[#2d3748] rounded-xl px-3 py-2 text-xs text-white outline-none"
                >
                  <option value="ACTION_POWER_CONNECTED">
                    Podłączenie ładowarki (Power Connected)
                  </option>
                  <option value="ACTION_POWER_DISCONNECTED">
                    Odłączenie ładowarki (Power Disconnected)
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Przypisz umiejętność:
                </label>
                {skills.length === 0 ? (
                  <p className="text-xs text-red-400">
                    Najpierw utwórz przynajmniej jedną umiejętność w zakładce Umiejętności.
                  </p>
                ) : (
                  <select
                    value={newTriggerSkill}
                    onChange={(e) => setNewTriggerSkill(e.target.value)}
                    className="w-full bg-[#0a0e14] border border-[#2d3748] rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    {skills.map((skill) => (
                      <option key={skill.id} value={skill.name}>
                        {skill.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2d3748]">
              <button
                type="button"
                onClick={() => setShowCreateTriggerModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-gray-400 hover:text-white transition-colors"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleSaveTrigger}
                disabled={!newTriggerSkill.trim()}
                data-testid="save_trigger_button"
                className="px-4 py-2 rounded-xl bg-[#8b5cf6] text-white font-bold text-xs hover:bg-[#7c3aed] disabled:opacity-50 transition-all shadow-[0_0_10px_rgba(139,92,246,0.3)]"
              >
                Zapisz Powiązanie
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
