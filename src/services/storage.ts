import {
  ChatMessage,
  SkillEntity,
  RoutineTriggerEntity,
  LlmSettings,
  KirinTelemetry,
  RoutineAction
} from '../types';

const STORAGE_KEYS = {
  MESSAGES: 'cogni_messages',
  SKILLS: 'cogni_skills',
  TRIGGERS: 'cogni_triggers',
  SETTINGS: 'cogni_llm_settings',
  TELEMETRY: 'cogni_telemetry',
  VIRTUAL_FS: 'cogni_virtual_fs',
  NLU_MODEL_INSTALLED: 'cogni_nlu_model_installed'
};

const DEFAULT_SETTINGS: LlmSettings = {
  apiKey: '',
  endpointUrl: 'https://openrouter.ai/api/v1/chat/completions',
  modelName: 'meta-llama/llama-3.1-8b-instruct:free',
  speechRate: 1.0,
  speechPitch: 1.0,
  voiceLanguage: 'pl-PL'
};

const DEFAULT_SKILLS: SkillEntity[] = [
  {
    id: 1,
    name: 'Poranny Rozruch',
    actionsJson: JSON.stringify([
      { type: 'SPEAK', parameter1: 'Dzień dobry! Rozpoczynam poranną rutynę.' },
      { type: 'DELAY', parameter1: '1000' },
      { type: 'TOGGLE_HARDWARE', parameter1: 'bluetooth', parameter2: 'on' },
      { type: 'SET_VOLUME', parameter1: '70' },
      { type: 'SPEAK', parameter1: 'Bluetooth włączony, głośność ustawiona.' }
    ] as RoutineAction[]),
    createdAt: Date.now() - 3600000
  },
  {
    id: 2,
    name: 'Tryb Kinowy',
    actionsJson: JSON.stringify([
      { type: 'SPEAK', parameter1: 'Aktywuję tryb kinowy.' },
      { type: 'DELAY', parameter1: '800' },
      { type: 'TOGGLE_HARDWARE', parameter1: 'torch', parameter2: 'off' },
      { type: 'SET_VOLUME', parameter1: '15' }
    ] as RoutineAction[]),
    createdAt: Date.now() - 1800000
  }
];

const DEFAULT_TRIGGERS: RoutineTriggerEntity[] = [
  {
    id: 1,
    triggerType: 'ACTION_POWER_CONNECTED',
    associatedSkillName: 'Poranny Rozruch',
    enabled: true
  }
];

const DEFAULT_TELEMETRY: KirinTelemetry = {
  lastLocalInferenceMs: 14,
  localQueriesHandled: 8,
  cloudQueriesHandled: 2,
  totalSavedTokens: 1420,
  savedDataKb: 284,
  bigCoresActive: 4
};

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 1,
    text: 'Witaj! Jestem CogniAgent v2 – zaawansowanym asystentem kognitywnym z hybrydowym NLU zoptymalizowanym pod kątem Kirin 980 i obsługą chmury LLM. W czym mogę Ci dzisiaj pomóc?',
    isUser: false,
    timestamp: Date.now() - 60000
  }
];

export const storage = {
  getMessages(): ChatMessage[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      return data ? JSON.parse(data) : INITIAL_MESSAGES;
    } catch {
      return INITIAL_MESSAGES;
    }
  },

  saveMessages(messages: ChatMessage[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save messages', e);
    }
  },

  getSkills(): SkillEntity[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SKILLS);
      return data ? JSON.parse(data) : DEFAULT_SKILLS;
    } catch {
      return DEFAULT_SKILLS;
    }
  },

  saveSkills(skills: SkillEntity[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(skills));
    } catch (e) {
      console.error('Failed to save skills', e);
    }
  },

  getTriggers(): RoutineTriggerEntity[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TRIGGERS);
      return data ? JSON.parse(data) : DEFAULT_TRIGGERS;
    } catch {
      return DEFAULT_TRIGGERS;
    }
  },

  saveTriggers(triggers: RoutineTriggerEntity[]) {
    try {
      localStorage.setItem(STORAGE_KEYS.TRIGGERS, JSON.stringify(triggers));
    } catch (e) {
      console.error('Failed to save triggers', e);
    }
  },

  getSettings(): LlmSettings {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: LlmSettings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  },

  getTelemetry(): KirinTelemetry {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TELEMETRY);
      return data ? JSON.parse(data) : DEFAULT_TELEMETRY;
    } catch {
      return DEFAULT_TELEMETRY;
    }
  },

  saveTelemetry(telemetry: KirinTelemetry) {
    try {
      localStorage.setItem(STORAGE_KEYS.TELEMETRY, JSON.stringify(telemetry));
    } catch (e) {
      console.error('Failed to save telemetry', e);
    }
  },

  isNluModelInstalled(): boolean {
    return localStorage.getItem(STORAGE_KEYS.NLU_MODEL_INSTALLED) === 'true';
  },

  setNluModelInstalled(installed: boolean) {
    localStorage.setItem(STORAGE_KEYS.NLU_MODEL_INSTALLED, String(installed));
  },

  // Virtual Filesystem for LLM Tools (read_file / write_file)
  readFile(fileName: string): string | null {
    try {
      const fsData = localStorage.getItem(STORAGE_KEYS.VIRTUAL_FS);
      const fs = fsData ? JSON.parse(fsData) : {};
      return fs[fileName] ?? null;
    } catch {
      return null;
    }
  },

  writeFile(fileName: string, content: string) {
    try {
      const fsData = localStorage.getItem(STORAGE_KEYS.VIRTUAL_FS);
      const fs = fsData ? JSON.parse(fsData) : {};
      fs[fileName] = content;
      localStorage.setItem(STORAGE_KEYS.VIRTUAL_FS, JSON.stringify(fs));
    } catch (e) {
      console.error('Failed to write file', e);
    }
  }
};
