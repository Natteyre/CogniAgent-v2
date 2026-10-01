import React, { useState, useRef, useEffect } from 'react';
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
  Copy,
  Check,
  FileCode,
  Sparkles,
  Sliders,
  Sun,
  BellOff,
  Clock,
  MapPin,
  Bluetooth,
  Radio,
  Navigation,
  Video
} from 'lucide-react';
import { SkillEntity, RoutineTriggerEntity, ActionType, RoutineAction, RoutinesBackup } from '../../types';
import { triggerScheduler } from '../../services/triggerScheduler';
import { SkillRecorderModal } from './SkillRecorderModal';

interface RoutinesScreenProps {
  skills: SkillEntity[];
  triggers: RoutineTriggerEntity[];
  onExecuteSkill: (skill: SkillEntity) => void;
  onSaveSkill: (name: string, actions: RoutineAction[]) => void;
  onDeleteSkill: (id: number) => void;
  onSaveTrigger: (
    triggerType: string,
    skillName: string,
    timeSchedule?: string,
    daysOfWeek?: string[],
    geofenceLocation?: string,
    bluetoothDeviceName?: string
  ) => void;
  onToggleTrigger: (trigger: RoutineTriggerEntity) => void;
  onDeleteTrigger: (id: number) => void;
  onExportJson?: () => string;
  onImportJson?: (json: string) => void;
}

const ACTION_TYPES: { type: ActionType; label: string; placeholder: string }[] = [
  { type: 'SPEAK', label: 'Wypowiedź (TTS)', placeholder: 'Tekst do wypowiedzenia w języku polskim' },
  { type: 'OPEN_APP', label: 'Uruchomienie aplikacji', placeholder: 'Nazwa aplikacji (np. YouTube, Aparat)' },
  { type: 'DELAY', label: 'Opóźnienie (Pauza)', placeholder: 'Czas w milisekundach (np. 1500)' },
  { type: 'SET_TIMER', label: 'Ustaw minutnik', placeholder: 'Czas w sekundach (np. 300 = 5 minut)' },
  { type: 'SET_ALARM', label: 'Ustaw budzik', placeholder: 'Godzina budzika (np. 07:00)' },
  { type: 'SET_VOLUME', label: 'Głośność multimediów', placeholder: 'Poziom w procentach 0-100 (np. 60)' },
  { type: 'SET_BRIGHTNESS', label: 'Jasność ekranu', placeholder: 'Poziom jasności 10-100 (np. 40)' },
  { type: 'SET_DND', label: 'Tryb Nie Przeszkadzać (DND)', placeholder: 'Wartość: on lub off' },
  { type: 'TOGGLE_HARDWARE', label: 'Przełącznik sprzętowy', placeholder: 'torch lub bluetooth' },
  { type: 'CLICK_NODE', label: 'Kliknięcie przycisku UI', placeholder: 'Tekst przycisku do kliknięcia' },
  { type: 'SWIPE_SCREEN', label: 'Przewinięcie ekranu', placeholder: 'Kierunek: up, down, left, right' },
  { type: 'TAP_COORDINATE', label: 'Kliknięcie w punkcie X,Y', placeholder: 'Współrzędne (np. 300, 500)' },
  { type: 'SUMMARIZE_SCREEN', label: 'Podsumowanie ekranu', placeholder: 'Odczyt bieżącego ekranu' }
];

export const RoutinesScreen: React.FC<RoutinesScreenProps> = ({
  skills,
  triggers,
  onExecuteSkill,
  onSaveSkill,
  onDeleteSkill,
  onSaveTrigger,
  onToggleTrigger,
  onDeleteTrigger
}) => {
  const [selectedTab, setSelectedTab] = useState<0 | 1>(0);
  const [showCreateSkillModal, setShowCreateSkillModal] = useState(false);
  const [showRecorderModal, setShowRecorderModal] = useState(false);
  const [showCreateTriggerModal, setShowCreateTriggerModal] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
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
  const [newTimeSchedule, setNewTimeSchedule] = useState('07:30');
  const [newDaysOfWeek, setNewDaysOfWeek] = useState<string[]>(['MON', 'TUE', 'WED', 'THU', 'FRI']);
  const [newGeofenceLocation, setNewGeofenceLocation] = useState('Dom');
  const [newBluetoothDevice, setNewBluetoothDevice] = useState('Słuchawki Sony WH-1000XM4');

  // Live simulation states from triggerScheduler
  const [currentGeofence, setCurrentGeofence] = useState('Poza domem');
  const [connectedBtDevice, setConnectedBtDevice] = useState<string | null>(null);

  useEffect(() => {
    const unsub = triggerScheduler.subscribe((geo, bt) => {
      setCurrentGeofence(geo);
      setConnectedBtDevice(bt);
    });
    return unsub;
  }, []);

  // Backup State
  const [jsonText, setJsonText] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      onSaveTrigger(
        newTriggerType,
        newTriggerSkill.trim(),
        newTriggerType === 'TIME_SCHEDULE' ? newTimeSchedule : undefined,
        newTriggerType === 'TIME_SCHEDULE' ? newDaysOfWeek : undefined,
        newTriggerType.startsWith('GEOFENCE') ? newGeofenceLocation : undefined,
        newTriggerType.startsWith('BLUETOOTH') ? newBluetoothDevice : undefined
      );
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

  // Generate JSON string
  const generateBackupJson = () => {
    const backup: RoutinesBackup = {
      version: 2,
      exportedAt: Date.now(),
      skills: skills.map((s) => ({
        name: s.name,
        actionsJson: s.actionsJson
      })),
      triggers: triggers.map((t) => ({
        triggerType: t.triggerType,
        skillName: t.associatedSkillName,
        enabled: t.enabled
      }))
    };
    return JSON.stringify(backup, null, 2);
  };

  const handleOpenBackupModal = () => {
    setJsonText(generateBackupJson());
    setImportFeedback(null);
    setShowBackupModal(true);
  };

  const handleDownloadFile = () => {
    const str = generateBackupJson();
    const blob = new Blob([str], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cogniagent_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleFileUploaded = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setJsonText(content);
        executeImportJson(content);
      }
    };
    reader.readAsText(file);
  };

  const executeImportJson = (textToImport: string) => {
    try {
      const parsed = JSON.parse(textToImport);
      let countSkills = 0;
      let countTriggers = 0;

      if (parsed.skills && Array.isArray(parsed.skills)) {
        parsed.skills.forEach((s: any) => {
          if (s.name && s.actionsJson) {
            try {
              const acts = JSON.parse(s.actionsJson);
              onSaveSkill(s.name, acts);
              countSkills++;
            } catch {
              // Ignore
            }
          }
        });
      }

      if (parsed.triggers && Array.isArray(parsed.triggers)) {
        parsed.triggers.forEach((t: any) => {
          if (t.triggerType && t.skillName) {
            onSaveTrigger(t.triggerType, t.skillName);
            countTriggers++;
          }
        });
      }

      setImportFeedback(`✓ Sukces! Zaimportowano ${countSkills} umiejętności oraz ${countTriggers} wyzwalaczy.`);
    } catch (e: any) {
      setImportFeedback(`✗ Błąd importu JSON: ${e.message}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0e14] overflow-y-auto">
      {/* Header */}
      <header className="bg-[#121824] border-b border-[#2d3748] px-4 py-3 shrink-0 shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-wide">
              Kreator Makr i Umiejętności
            </h1>
            <p className="text-xs text-[#94a3b8]">
              Automatyzacja procesów Kirin 980 i wyzwalacze zdarzeń
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenBackupModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1e2638] hover:bg-[#2d3748] text-xs font-semibold text-[#00e5ff] border border-[#00e5ff]/30 shadow-sm transition-all"
          >
            <FileCode className="w-4 h-4" />
            <span>Kopia JSON</span>
          </button>
        </div>

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
            {/* Action Buttons: Add Skill & Record Skill */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
              <button
                type="button"
                onClick={() => setShowCreateSkillModal(true)}
                data-testid="add_skill_button"
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#00e5ff] to-[#00b4d8] text-[#0a0e14] font-bold text-xs sm:text-sm shadow-[0_0_15px_rgba(0,229,255,0.25)] hover:opacity-95 transition-all"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Ręczny edytor skilli (+ Add)</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRecorderModal(true)}
                data-testid="record_skill_button"
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 text-white font-bold text-xs sm:text-sm shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:opacity-95 active:scale-98 transition-all"
              >
                <div className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></div>
                <span>🔴 Nagraj skill przez demonstrację</span>
              </button>
            </div>

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
          <div className="space-y-4">
            {/* Live Environment Simulator (Geofence & Bluetooth) */}
            <div className="bg-[#121824] border border-[#2d3748] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-[#00e5ff]" />
                  <span>Symulator Środowiska (Geofence & Bluetooth)</span>
                </span>
                <span className="text-[10px] text-gray-400 font-mono">
                  TriggerScheduler: Aktywny
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Geofence Simulator */}
                <div className="bg-[#0a0e14] p-3 rounded-xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-400" />
                      Lokalizacja:
                    </span>
                    <span className="font-bold text-[#00e5ff]">{currentGeofence}</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => triggerScheduler.simulateGeofenceEvent('Dom', 'ENTER')}
                      className="px-2 py-1 bg-[#1e2638] hover:bg-[#2d3748] text-[11px] font-semibold text-gray-200 rounded-lg border border-white/5 active:scale-95"
                    >
                      Wejdź: Dom
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerScheduler.simulateGeofenceEvent('Praca', 'ENTER')}
                      className="px-2 py-1 bg-[#1e2638] hover:bg-[#2d3748] text-[11px] font-semibold text-gray-200 rounded-lg border border-white/5 active:scale-95"
                    >
                      Wejdź: Praca
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerScheduler.simulateGeofenceEvent('Dom', 'EXIT')}
                      className="px-2 py-1 bg-[#1e2638] hover:bg-[#2d3748] text-[11px] font-semibold text-gray-400 rounded-lg border border-white/5 active:scale-95"
                    >
                      Wyjdź
                    </button>
                  </div>
                </div>

                {/* Bluetooth Device Simulator */}
                <div className="bg-[#0a0e14] p-3 rounded-xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400 flex items-center gap-1">
                      <Bluetooth className="w-3.5 h-3.5 text-[#00e5ff]" />
                      Urządzenie BT:
                    </span>
                    <span className="font-bold text-[#8b5cf6] truncate max-w-[120px]">
                      {connectedBtDevice || 'Brak'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() =>
                        triggerScheduler.simulateBluetoothDeviceEvent('Słuchawki Sony WH-1000XM4', true)
                      }
                      className="px-2 py-1 bg-[#00e5ff]/15 hover:bg-[#00e5ff]/25 text-[11px] font-semibold text-[#00e5ff] rounded-lg border border-[#00e5ff]/30 active:scale-95"
                    >
                      Podłącz słuchawki
                    </button>
                    {connectedBtDevice && (
                      <button
                        type="button"
                        onClick={() =>
                          triggerScheduler.simulateBluetoothDeviceEvent(connectedBtDevice, false)
                        }
                        className="px-2 py-1 bg-red-500/15 hover:bg-red-500/25 text-[11px] font-semibold text-red-400 rounded-lg border border-red-500/30 active:scale-95"
                      >
                        Rozłącz
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

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
                Brak powiązanych wyzwalaczy. Możesz dodać harmonogram czasowy, strefę GPS lub ładowarkę.
              </div>
            ) : (
              <div className="space-y-3">
                {triggers.map((trigger) => {
                  let triggerLabel = trigger.triggerType;
                  let icon = <Power className="w-5 h-5 text-[#8b5cf6]" />;

                  if (trigger.triggerType === 'ACTION_POWER_CONNECTED') {
                    triggerLabel = 'Podłączenie ładowarki (Power Connected)';
                    icon = <Power className="w-5 h-5 text-[#10b981]" />;
                  } else if (trigger.triggerType === 'ACTION_POWER_DISCONNECTED') {
                    triggerLabel = 'Odłączenie ładowarki';
                    icon = <Power className="w-5 h-5 text-amber-400" />;
                  } else if (trigger.triggerType === 'TIME_SCHEDULE') {
                    triggerLabel = `Harmonogram czasowy: ${trigger.timeSchedule || '07:00'}`;
                    icon = <Clock className="w-5 h-5 text-[#00e5ff]" />;
                  } else if (trigger.triggerType === 'GEOFENCE_ENTER') {
                    triggerLabel = `Wejście do strefy: ${trigger.geofenceLocation || 'Dom'}`;
                    icon = <MapPin className="w-5 h-5 text-amber-400" />;
                  } else if (trigger.triggerType === 'GEOFENCE_EXIT') {
                    triggerLabel = `Wyjście ze strefy: ${trigger.geofenceLocation || 'Dom'}`;
                    icon = <Navigation className="w-5 h-5 text-gray-400" />;
                  } else if (trigger.triggerType === 'BLUETOOTH_CONNECTED') {
                    triggerLabel = `Połączono z: ${trigger.bluetoothDeviceName || 'Urządzenie BT'}`;
                    icon = <Bluetooth className="w-5 h-5 text-[#00e5ff]" />;
                  }

                  return (
                    <div
                      key={trigger.id}
                      data-testid={`trigger_card_${trigger.id}`}
                      className="bg-[#121824] border border-[#2d3748] rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-[#8b5cf6]/40 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center shrink-0">
                          {icon}
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

      {/* Modal: Create Skill with Extended Action Types */}
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
                  placeholder="np. Tryb Kinowy / Poranny Rozruch"
                  className="w-full bg-[#0a0e14] border border-[#2d3748] focus:border-[#00e5ff] rounded-xl px-3 py-2 text-sm text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2">
                  Sekwencja Akcji:
                </label>

                <div className="space-y-2">
                  {newActions.map((action, idx) => {
                    const actionInfo = ACTION_TYPES.find((a) => a.type === action.type) || ACTION_TYPES[0];

                    return (
                      <div
                        key={idx}
                        className="bg-[#1a2233] border border-[#2d3748] rounded-xl p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#00e5ff]">
                            Krok {idx + 1}: {actionInfo.label}
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
                            const t = e.target.value as ActionType;
                            updated[idx] = { ...action, type: t };
                            setNewActions(updated);
                          }}
                          className="w-full bg-[#0a0e14] border border-[#2d3748] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                        >
                          {ACTION_TYPES.map(({ type, label }) => (
                            <option key={type} value={type}>
                              {label} ({type})
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
                          placeholder={actionInfo.placeholder}
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
                    );
                  })}
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
                  <option value="TIME_SCHEDULE">
                    Harmonogram czasowy (Godzina & Dni)
                  </option>
                  <option value="GEOFENCE_ENTER">
                    Geofence: Wejście do strefy (np. Dom, Praca)
                  </option>
                  <option value="GEOFENCE_EXIT">
                    Geofence: Wyjście ze strefy
                  </option>
                  <option value="BLUETOOTH_CONNECTED">
                    Połączenie z urządzeniem Bluetooth
                  </option>
                </select>
              </div>

              {/* Dynamic input for TIME_SCHEDULE */}
              {newTriggerType === 'TIME_SCHEDULE' && (
                <div className="space-y-2 bg-[#0a0e14] p-3 rounded-xl border border-white/5 animate-fadeIn">
                  <label className="block text-[11px] font-semibold text-[#00e5ff]">
                    Godzina wykonania (HH:MM):
                  </label>
                  <input
                    type="time"
                    value={newTimeSchedule}
                    onChange={(e) => setNewTimeSchedule(e.target.value)}
                    className="w-full bg-[#152033] border border-[#2d3748] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#00e5ff]"
                  />
                  <div className="text-[10px] text-gray-400">
                    Aktywne dni: Poniedziałek - Piątek (Dni robocze)
                  </div>
                </div>
              )}

              {/* Dynamic input for GEOFENCE */}
              {newTriggerType.startsWith('GEOFENCE') && (
                <div className="space-y-2 bg-[#0a0e14] p-3 rounded-xl border border-white/5 animate-fadeIn">
                  <label className="block text-[11px] font-semibold text-amber-400">
                    Nazwa strefy / lokalizacji:
                  </label>
                  <input
                    type="text"
                    value={newGeofenceLocation}
                    onChange={(e) => setNewGeofenceLocation(e.target.value)}
                    placeholder="Np. Dom, Praca, Siłownia"
                    className="w-full bg-[#152033] border border-[#2d3748] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-amber-400"
                  />
                </div>
              )}

              {/* Dynamic input for BLUETOOTH */}
              {newTriggerType.startsWith('BLUETOOTH') && (
                <div className="space-y-2 bg-[#0a0e14] p-3 rounded-xl border border-white/5 animate-fadeIn">
                  <label className="block text-[11px] font-semibold text-[#8b5cf6]">
                    Nazwa urządzenia Bluetooth:
                  </label>
                  <input
                    type="text"
                    value={newBluetoothDevice}
                    onChange={(e) => setNewBluetoothDevice(e.target.value)}
                    placeholder="Np. Słuchawki Sony WH-1000XM4, Radio samochodowe"
                    className="w-full bg-[#152033] border border-[#2d3748] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#8b5cf6]"
                  />
                </div>
              )}

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

      {/* Modal: Full Backup / Restore JSON Manager */}
      {showBackupModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121824] border border-[#2d3748] rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileCode className="w-5 h-5 text-[#00e5ff]" />
                <span>Kopia Zapasowa Rutyn (JSON Backup)</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowBackupModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-300">
              Pobierz plik z definicjami makr, skopiuj JSON do schowka lub załaduj kopię zapasową z dysku.
            </p>

            {/* Quick Actions Row */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleDownloadFile}
                className="px-3 py-1.5 rounded-xl bg-[#00e5ff] text-black text-xs font-bold hover:bg-[#00b4d8] flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Pobierz plik .json</span>
              </button>

              <button
                type="button"
                onClick={handleCopyJson}
                className="px-3 py-1.5 rounded-xl bg-[#1e2638] hover:bg-[#2d3748] text-xs font-semibold text-white flex items-center gap-1.5 border border-white/10"
              >
                {copySuccess ? <Check className="w-3.5 h-3.5 text-[#10b981]" /> : <Copy className="w-3.5 h-3.5 text-[#00e5ff]" />}
                <span>{copySuccess ? 'Skopiowano!' : 'Kopiuj do schowka'}</span>
              </button>

              <label className="px-3 py-1.5 rounded-xl bg-[#8b5cf6] text-white text-xs font-bold hover:bg-[#7c3aed] flex items-center gap-1.5 shadow-sm cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Wczytaj plik .json</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUploaded}
                  className="hidden"
                />
              </label>
            </div>

            {/* JSON Textarea Editor */}
            <div className="flex-1 flex flex-col min-h-[160px]">
              <textarea
                rows={8}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder='{"skills": [...], "triggers": [...]}'
                className="w-full flex-1 bg-[#0a0e14] border border-[#2d3748] rounded-xl p-3 text-xs font-mono text-[#00e5ff] outline-none focus:border-[#00e5ff] resize-none"
              />
            </div>

            {importFeedback && (
              <div
                className={`p-2 rounded-xl text-xs font-semibold ${
                  importFeedback.startsWith('✓')
                    ? 'bg-[#10b981]/20 border border-[#10b981]/40 text-[#10b981]'
                    : 'bg-red-950/40 border border-red-500/40 text-red-300'
                }`}
              >
                {importFeedback}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[#2d3748]">
              <span className="text-[11px] text-gray-500">Wersja formatu: v2</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowBackupModal(false)}
                  className="px-4 py-2 text-xs text-gray-400 hover:text-white"
                >
                  Zamknij
                </button>
                <button
                  type="button"
                  onClick={() => executeImportJson(jsonText)}
                  disabled={!jsonText.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-[#00e5ff] to-[#8b5cf6] text-black font-bold text-xs rounded-xl shadow-md hover:opacity-95 disabled:opacity-50"
                >
                  Zaimportuj ten JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Skill Recorder (Demonstration Macro Recorder) */}
      <SkillRecorderModal
        isOpen={showRecorderModal}
        onClose={() => setShowRecorderModal(false)}
        onSkillSaved={(newSkill) => {
          onSaveSkill(newSkill.name, JSON.parse(newSkill.actionsJson));
        }}
      />
    </div>
  );
};
