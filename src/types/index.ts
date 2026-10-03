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
  | 'SET_VOLUME'
  | 'SET_BRIGHTNESS'
  | 'SET_DND';

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
  sessionId?: string;
  toolInvocation?: string | null;
  isError?: boolean;
  attachedImage?: string;
  attachedFileName?: string;
  attachedFileSize?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

export interface UserMemoryFact {
  id: string;
  category: 'personal' | 'preference' | 'routine' | 'device' | 'contact';
  fact: string;
  confidence: number;
  createdAt: number;
  sourceText?: string;
}

export interface AndroidNotification {
  id: string;
  packageName: string;
  appName: string;
  title: string;
  body: string;
  timestamp: number;
  isRead: boolean;
  category: 'message' | 'email' | 'system' | 'social';
  smartReplies?: string[];
  repliedText?: string;
}

export interface ScreenNode {
  id: string;
  type: 'button' | 'text' | 'input' | 'image' | 'heading' | 'link';
  text: string;
  bounds: { x: number; y: number; width: number; height: number };
  clickable: boolean;
  packageName?: string;
}

export interface ScreenInspectionData {
  timestamp: number;
  appTitle: string;
  fullOcrText: string;
  nodes: ScreenNode[];
  summary: string;
  screenshotDataUrl?: string;
  isExternalAppCapture?: boolean;
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
  triggerType: string; // e.g. "ACTION_POWER_CONNECTED", "ACTION_POWER_DISCONNECTED", "TIME_SCHEDULE", "GEOFENCE_ENTER", "GEOFENCE_EXIT", "BLUETOOTH_CONNECTED"
  associatedSkillName: string;
  enabled: boolean;
  timeSchedule?: string; // e.g. "07:30"
  daysOfWeek?: string[]; // e.g. ["MON", "TUE", "WED", "THU", "FRI"]
  geofenceLocation?: string; // e.g. "Dom", "Praca", "Siłownia"
  bluetoothDeviceName?: string; // e.g. "Słuchawki Sony WH-1000XM4"
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

export type DeviceTelemetry = KirinTelemetry;

export interface LlmSettings {
  apiKey: string;
  endpointUrl: string;
  modelName: string;
  speechRate: number;
  speechPitch: number;
  voiceLanguage: string;
  soundEffectsEnabled: boolean;
  hapticFeedbackEnabled: boolean;
}

export interface ActiveTimer {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  createdAt: number;
}

export type DeviceManufacturer = 'universal' | 'huawei' | 'samsung' | 'pixel' | 'xiaomi' | 'custom';
export type HardwareAccelerationBackend = 'AUTO_NNAPI' | 'HIAI_NPU' | 'QNN_HEXAGON' | 'EDGETPU' | 'GPU_VULKAN' | 'CPU_NEON';

export interface DeviceProfile {
  id: string;
  manufacturer: DeviceManufacturer;
  modelName: string;
  chipset: string;
  androidVersion: string;
  ramGB: number;
  npuAcceleration: HardwareAccelerationBackend;
  batteryOptimizationSystemName: string;
  notes: string;
  isAutoDetected?: boolean;
  detectedHardwareInfo?: string;
}

export interface AgentServicesConfig {
  floatingBubbleEnabled: boolean;
  accessibilityServiceEnabled: boolean;
  screenCaptureEnabled: boolean;
  screenCaptureQuality: '1080p' | '720p' | '480p';
  backgroundHotwordEnabled: boolean;
  hotwordSensitivity: 'low' | 'medium' | 'high';
  batteryExemptionGranted: boolean;
  notificationListenerEnabled: boolean;
  bootAutostartEnabled: boolean;
  hapticFeedbackOnAction: boolean;
}

export interface HuaweiOptimizationState {
  autostartEnabled: boolean;
  batteryOptimizationIgnored: boolean;
  powerGenieGuarded: boolean;
  lockScreenKeepAlive: boolean;
}

export interface HardwareState {
  batteryPercent: number;
  isCharging: boolean;
  isTorchOn: boolean;
  isBluetoothEnabled: boolean;
  isAccessibilityActive: boolean;
  isNotificationListenerActive: boolean;
  brightnessPercent: number;
  isDndActive: boolean;
  activeTimers: ActiveTimer[];
  huaweiOptimization: HuaweiOptimizationState;
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

export type ModelFormat = 'ONNX' | 'MediaPipe' | 'GGUF' | 'TFLite';
export type ModelPrecision = 'INT4' | 'INT8' | 'FP16' | 'FP32';

export interface OfflineModelInfo {
  id: string;
  name: string;
  architecture: string;
  format: ModelFormat;
  precision: ModelPrecision;
  sizeMB: number;
  author: string;
  huggingFaceRepo?: string;
  downloadUrl?: string;
  isInstalled: boolean;
  installedAt?: number;
  isCustomImport?: boolean;
  fileName?: string;
  contextWindow: number;
  description: string;
  recommendedHardware: string;
}

export interface ModelDownloadProgress {
  modelId: string;
  progressPercent: number;
  downloadedMB: number;
  totalMB: number;
  speedMBs: number;
  status: 'idle' | 'downloading' | 'completed' | 'error' | 'cancelled';
  errorMessage?: string;
}

export type SecurityMode = 'SMART_RISK_ANALYSIS' | 'STRICT_CONFIRMATION' | 'AUTONOMOUS';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ActionConfirmationRequest {
  id: string;
  timestamp: number;
  actionTitle: string;
  category: 'file' | 'communication' | 'purchase' | 'system' | 'other';
  riskLevel: RiskLevel;
  riskReason: string;
  commandText: string;
  parameters: Record<string, string>;
  isConfirmed?: boolean;
  resolvedAt?: number;
}

export interface SecurityAuditItem {
  id: string;
  timestamp: number;
  actionTitle: string;
  category: 'file' | 'communication' | 'purchase' | 'system' | 'other';
  status: 'APPROVED' | 'REJECTED' | 'AUTO_ALLOWED';
  riskLevel: RiskLevel;
  details: string;
}

export interface AgentSecurityPolicy {
  securityMode: SecurityMode;
  confirmFileModifications: boolean;
  confirmMessagingAndCalls: boolean;
  confirmAppPurchases: boolean;
  confirmSensitiveSystemSettings: boolean;
  requireBiometricPrompt: boolean;
}
