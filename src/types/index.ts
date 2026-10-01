export type ActionType =
  | 'SPEAK'
  | 'OPEN_APP'
  | 'DELAY'
  | 'CLICK_NODE'
  | 'TOGGLE_HARDWARE'
  | 'SWIPE_SCREEN'
  | 'TAP_COORDINATE'
  | 'SUMMARIZE_SCREEN'
  | 'SET_TIMER'
  | 'SET_ALARM'
  | 'SET_VOLUME';

export interface RoutineAction {
  type: ActionType;
  parameter1: string;
  parameter2?: string;
}

export interface ChatMessage {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: number;
  toolInvocation?: string | null;
  isError?: boolean;
}

export interface ExtractedEntity {
  label: string; // action, target_app, contact, message, setting_name, setting_value, hardware_toggle, search_query
  value: string;
  confidence?: number;
}

export interface ParsedIntent {
  originalText: string;
  intentType: string;
  entities: ExtractedEntity[];
  confidence?: number;
}

export interface MultiIntentPlan {
  originalQuery: string;
  subIntents: ParsedIntent[];
}

export interface SkillEntity {
  id: number;
  name: string;
  actionsJson: string;
  createdAt: number;
}

export interface RoutineTriggerEntity {
  id: number;
  triggerType: string; // e.g. "ACTION_POWER_CONNECTED", "ACTION_POWER_DISCONNECTED", "SCHEDULE_TIME"
  associatedSkillName: string;
  enabled: boolean;
}

export interface ExportedSkill {
  name: string;
  actionsJson: string;
  description?: string;
}

export interface ExportedTrigger {
  triggerType: string;
  skillName: string;
  enabled: boolean;
}

export interface RoutinesBackup {
  version: number;
  exportedAt: number;
  skills: ExportedSkill[];
  triggers: ExportedTrigger[];
}

export interface KirinTelemetry {
  lastLocalInferenceMs: number;
  localQueriesHandled: number;
  cloudQueriesHandled: number;
  totalSavedTokens: number;
  savedDataKb: number;
  bigCoresActive: number;
}

export interface LlmSettings {
  apiKey: string;
  endpointUrl: string;
  modelName: string;
  speechRate: number;
  speechPitch: number;
  voiceLanguage: string;
}

export interface HardwareState {
  batteryPercent: number;
  isCharging: boolean;
  isTorchOn: boolean;
  isBluetoothEnabled: boolean;
  isAccessibilityActive: boolean;
  isNotificationListenerActive: boolean;
}

export type DownloadState =
  | { status: 'idle' }
  | {
      status: 'downloading';
      currentFileName: string;
      progressPercent: number;
      downloadedMB: number;
      totalMB: number;
    }
  | { status: 'completed'; message: string }
  | { status: 'error'; errorMessage: string };
