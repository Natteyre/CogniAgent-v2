import {
  AgentSecurityPolicy,
  ActionConfirmationRequest,
  SecurityAuditItem,
  RiskLevel,
  ParsedIntent
} from '../types';
import { soundAndHaptics } from './soundAndHaptics';

const STORAGE_KEY_SECURITY_POLICY = 'cogni_security_policy_v2';
const STORAGE_KEY_AUDIT_LOG = 'cogni_security_audit_log_v2';

const DEFAULT_POLICY: AgentSecurityPolicy = {
  securityMode: 'SMART_RISK_ANALYSIS',
  confirmFileModifications: true,
  confirmMessagingAndCalls: true,
  confirmAppPurchases: true,
  confirmSensitiveSystemSettings: true,
  requireBiometricPrompt: false
};

const INITIAL_AUDIT_LOG: SecurityAuditItem[] = [
  {
    id: 'audit_init_1',
    timestamp: Date.now() - 3600000 * 2,
    actionTitle: 'Wysłanie wiadomości SMS do kontaktu Mama',
    category: 'communication',
    status: 'APPROVED',
    riskLevel: 'MEDIUM',
    details: 'Zatwierdzono ręcznie przez użytkownika w oknie autoryzacji.'
  },
  {
    id: 'audit_init_2',
    timestamp: Date.now() - 3600000 * 5,
    actionTitle: 'Próba usunięcia pliku z pamięci urządzenia',
    category: 'file',
    status: 'REJECTED',
    riskLevel: 'HIGH',
    details: 'Użytkownik odrzucił operację modyfikacji plików.'
  },
  {
    id: 'audit_init_3',
    timestamp: Date.now() - 3600000 * 8,
    actionTitle: 'Uruchomienie aplikacji YouTube i wyszukiwanie',
    category: 'other',
    status: 'AUTO_ALLOWED',
    riskLevel: 'LOW',
    details: 'Operacja bezpieczna dopuszczona automatycznie w trybie Smart.'
  }
];

type PolicyListener = (policy: AgentSecurityPolicy, auditLog: SecurityAuditItem[]) => void;
type ConfirmationListener = (pendingRequest: ActionConfirmationRequest | null) => void;

class SecurityManager {
  private policy: AgentSecurityPolicy;
  private auditLog: SecurityAuditItem[];
  private currentPendingConfirmation: ActionConfirmationRequest | null = null;
  private pendingResolver: ((approved: boolean) => void) | null = null;
  private policyListeners: Set<PolicyListener> = new Set();
  private confirmationListeners: Set<ConfirmationListener> = new Set();

  constructor() {
    this.policy = this.loadPolicy();
    this.auditLog = this.loadAuditLog();
  }

  private loadPolicy(): AgentSecurityPolicy {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SECURITY_POLICY);
      if (stored) {
        return { ...DEFAULT_POLICY, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.warn('Failed to load security policy, using defaults', e);
    }
    return DEFAULT_POLICY;
  }

  private loadAuditLog(): SecurityAuditItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_AUDIT_LOG);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to load audit log, using initial items', e);
    }
    return INITIAL_AUDIT_LOG;
  }

  getPolicy(): AgentSecurityPolicy {
    return this.policy;
  }

  updatePolicy(patch: Partial<AgentSecurityPolicy>) {
    this.policy = { ...this.policy, ...patch };
    try {
      localStorage.setItem(STORAGE_KEY_SECURITY_POLICY, JSON.stringify(this.policy));
    } catch (e) {
      console.warn('Failed to save security policy', e);
    }
    soundAndHaptics.triggerHaptic(25);
    this.notifyPolicy();
  }

  getAuditLog(): SecurityAuditItem[] {
    return [...this.auditLog];
  }

  clearAuditLog() {
    this.auditLog = [];
    try {
      localStorage.setItem(STORAGE_KEY_AUDIT_LOG, JSON.stringify([]));
    } catch (e) {
      console.warn('Failed to clear audit log', e);
    }
    this.notifyPolicy();
  }

  /**
   * Assesses the risk of an intent and determines if user confirmation is required.
   */
  assessActionRisk(
    intent: ParsedIntent,
    commandText: string
  ): {
    requiresConfirmation: boolean;
    category: 'file' | 'communication' | 'purchase' | 'system' | 'other';
    riskLevel: RiskLevel;
    actionTitle: string;
    riskReason: string;
    parameters: Record<string, string>;
  } {
    const lower = commandText.toLowerCase();

    // Autonomous Mode: never confirm anything unless strictly critical system damage
    if (this.policy.securityMode === 'AUTONOMOUS') {
      return {
        requiresConfirmation: false,
        category: 'other',
        riskLevel: 'LOW',
        actionTitle: 'Operacja autonomiczna',
        riskReason: 'Tryb autonomiczny aktywny',
        parameters: {}
      };
    }

    // 1. App Purchases / Financial Transactions (CRITICAL)
    if (
      lower.includes('kup') ||
      lower.includes('zapłać') ||
      lower.includes('zaplac') ||
      lower.includes('przelej') ||
      lower.includes('zamów') ||
      lower.includes('zamow') ||
      lower.includes('płatność') ||
      lower.includes('platnosc')
    ) {
      return {
        requiresConfirmation: this.policy.confirmAppPurchases,
        category: 'purchase',
        riskLevel: 'CRITICAL',
        actionTitle: 'Transakcja finansowa / Zakup w aplikacji',
        riskReason: 'Polecenie może wiązać się z obciążeniem konta bankowego lub zamówieniem produktu.',
        parameters: { Treść: commandText }
      };
    }

    // 2. Messaging & Phone Calls (MEDIUM to HIGH)
    if (
      intent.intentType === 'SEND_MESSAGE' ||
      lower.includes('wyślij wiadomość') ||
      lower.includes('wyslij sms') ||
      lower.includes('napisz do') ||
      lower.includes('zadzwoń do') ||
      lower.includes('zadzwon do') ||
      lower.includes('wybierz numer')
    ) {
      const contact = intent.entities.find((e) => e.label === 'contact')?.value || 'Odbiorca nieznany';
      const message = intent.entities.find((e) => e.label === 'message')?.value || 'Brak treści';
      const isCall = lower.includes('zadzwoń') || lower.includes('zadzwon');

      return {
        requiresConfirmation: this.policy.confirmMessagingAndCalls,
        category: 'communication',
        riskLevel: isCall ? 'HIGH' : 'MEDIUM',
        actionTitle: isCall ? `Połączenie telefoniczne do: ${contact}` : `Wysłanie wiadomości do: ${contact}`,
        riskReason: isCall
          ? 'Asystent zamierza nawiązać bezpośrednie połączenie głosowe z Twojego telefonu.'
          : 'Asystent zamierza wysłać wiadomość w Twoim imieniu.',
        parameters: isCall ? { Kontakt: contact } : { Kontakt: contact, Treść: message }
      };
    }

    // 3. File Deletion & Modification (HIGH to CRITICAL)
    if (
      lower.includes('usuń plik') ||
      lower.includes('skasuj plik') ||
      lower.includes('wyczyść pamięć') ||
      lower.includes('sformatuj') ||
      lower.includes('zmień plik') ||
      lower.includes('nadpisz plik')
    ) {
      return {
        requiresConfirmation: this.policy.confirmFileModifications,
        category: 'file',
        riskLevel: 'HIGH',
        actionTitle: 'Modyfikacja lub usunięcie pliku w telefonie',
        riskReason: 'Operacja może bezpowrotnie usunąć dokumenty, zdjęcia lub dane aplikacji z pamięci urządzenia.',
        parameters: { Komenda: commandText }
      };
    }

    // 4. Sensitive System Settings (HIGH)
    if (
      lower.includes('przywróć ustawienia fabryczne') ||
      lower.includes('wyczyść dane') ||
      lower.includes('odinstaluj') ||
      lower.includes('uprawnienia roota') ||
      lower.includes('zablokuj telefon')
    ) {
      return {
        requiresConfirmation: this.policy.confirmSensitiveSystemSettings,
        category: 'system',
        riskLevel: 'CRITICAL',
        actionTitle: 'Modyfikacja krytycznych ustawień systemowych',
        riskReason: 'Zmiana może wpłynąć na stabilność systemu Android i zainstalowanych aplikacji.',
        parameters: { Komenda: commandText }
      };
    }

    // 5. In Strict Mode, even clicking UI elements in other apps might be prompted
    if (this.policy.securityMode === 'STRICT_CONFIRMATION' && intent.intentType === 'CLICK_NODE') {
      const nodeText = intent.entities.find((e) => e.label === 'setting_name')?.value || 'Element UI';
      return {
        requiresConfirmation: true,
        category: 'other',
        riskLevel: 'MEDIUM',
        actionTitle: `Kliknięcie w przycisk „${nodeText}”`,
        riskReason: 'W trybie rygorystycznym (Strict) każda akcja w obcej aplikacji wymaga potwierdzenia.',
        parameters: { Element: nodeText }
      };
    }

    // Safe low-risk action (torch, volume, timers, navigation, open app)
    return {
      requiresConfirmation: false,
      category: 'other',
      riskLevel: 'LOW',
      actionTitle: commandText,
      riskReason: 'Bezpieczna operacja systemowa',
      parameters: {}
    };
  }

  /**
   * Prompts the user with a Human-in-the-Loop confirmation request.
   * Returns a promise resolving to true if approved or false if rejected.
   */
  async requestUserAuthorization(request: Omit<ActionConfirmationRequest, 'id' | 'timestamp'>): Promise<boolean> {
    const fullRequest: ActionConfirmationRequest = {
      ...request,
      id: `confirm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now()
    };

    // If biometric prompt requested for critical actions
    if (this.policy.requireBiometricPrompt && fullRequest.riskLevel === 'CRITICAL') {
      fullRequest.riskReason += ' [Wymagana autoryzacja biometryczna / odcisk palca]';
    }

    soundAndHaptics.playWakeWordChime();
    soundAndHaptics.triggerHaptic([50, 100, 50]);

    this.currentPendingConfirmation = fullRequest;
    this.notifyConfirmation();

    return new Promise<boolean>((resolve) => {
      this.pendingResolver = resolve;
    });
  }

  /**
   * Called by the UI when the user clicks [Zatwierdź] or [Odrzuć]
   */
  resolveCurrentConfirmation(approved: boolean) {
    if (!this.currentPendingConfirmation) return;

    const request = this.currentPendingConfirmation;
    this.currentPendingConfirmation = null;

    // Log to audit log
    const auditItem: SecurityAuditItem = {
      id: `audit_${Date.now()}`,
      timestamp: Date.now(),
      actionTitle: request.actionTitle,
      category: request.category,
      status: approved ? 'APPROVED' : 'REJECTED',
      riskLevel: request.riskLevel,
      details: approved
        ? `Zatwierdzono przez użytkownika: ${request.commandText}`
        : `Odrzucono przez użytkownika: ${request.commandText}`
    };

    this.auditLog = [auditItem, ...this.auditLog.slice(0, 49)];
    try {
      localStorage.setItem(STORAGE_KEY_AUDIT_LOG, JSON.stringify(this.auditLog));
    } catch (e) {
      console.warn('Failed to save audit log item', e);
    }

    if (approved) {
      soundAndHaptics.playSuccessChime();
    } else {
      soundAndHaptics.triggerHaptic(50);
    }

    this.notifyConfirmation();
    this.notifyPolicy();

    if (this.pendingResolver) {
      this.pendingResolver(approved);
      this.pendingResolver = null;
    }
  }

  logAutoAllowedAction(title: string, category: 'file' | 'communication' | 'purchase' | 'system' | 'other', details: string) {
    const auditItem: SecurityAuditItem = {
      id: `audit_${Date.now()}`,
      timestamp: Date.now(),
      actionTitle: title,
      category,
      status: 'AUTO_ALLOWED',
      riskLevel: 'LOW',
      details
    };
    this.auditLog = [auditItem, ...this.auditLog.slice(0, 49)];
    try {
      localStorage.setItem(STORAGE_KEY_AUDIT_LOG, JSON.stringify(this.auditLog));
    } catch {
      // Ignore
    }
    this.notifyPolicy();
  }

  getPendingConfirmation(): ActionConfirmationRequest | null {
    return this.currentPendingConfirmation;
  }

  subscribePolicy(listener: PolicyListener): () => void {
    this.policyListeners.add(listener);
    listener(this.policy, this.auditLog);
    return () => {
      this.policyListeners.delete(listener);
    };
  }

  subscribeConfirmation(listener: ConfirmationListener): () => void {
    this.confirmationListeners.add(listener);
    listener(this.currentPendingConfirmation);
    return () => {
      this.confirmationListeners.delete(listener);
    };
  }

  private notifyPolicy() {
    this.policyListeners.forEach((l) => l(this.policy, this.auditLog));
  }

  private notifyConfirmation() {
    this.confirmationListeners.forEach((l) => l(this.currentPendingConfirmation));
  }
}

export const securityManager = new SecurityManager();
