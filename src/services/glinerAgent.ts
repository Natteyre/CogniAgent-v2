import { MultiIntentPlan, ParsedIntent, ExtractedEntity } from '../types';

export class GlinerAgent {
  private isModelLoaded: boolean = true;

  constructor() {
    this.isModelLoaded = true;
  }

  setModelLoaded(loaded: boolean) {
    this.isModelLoaded = loaded;
  }

  getIsModelLoaded(): boolean {
    return this.isModelLoaded;
  }

  /**
   * Advanced Multi-Intent Orchestrator:
   * Splits complex compound commands containing Polish coordinators ("i", "oraz", "następnie", "potem")
   * into independent sub-clauses, evaluating each sequentially.
   */
  processCommand(userText: string): MultiIntentPlan {
    const trimmed = userText.trim();
    if (!trimmed) {
      return { originalQuery: userText, subIntents: [] };
    }

    const subClauses = this.splitCompoundCommand(trimmed);
    const parsedIntents = subClauses.map((clause) => this.ruleBasedPolishParser(clause));

    return {
      originalQuery: userText,
      subIntents: parsedIntents
    };
  }

  private splitCompoundCommand(text: string): string[] {
    const coordinatorRegex =
      /\b(a\s+następnie|a\s+nastepnie|następnie|nastepnie|a\s+potem|potem|oraz|i\s+wtedy|i)\b/gi;

    const segments: string[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = coordinatorRegex.exec(text)) !== null) {
      const segment = text.substring(lastIndex, match.index).trim().replace(/^[,;\s]+|[,;\s]+$/g, '');
      if (segment) {
        segments.push(segment);
      }
      lastIndex = coordinatorRegex.lastIndex;
    }

    const lastSegment = text.substring(lastIndex).trim().replace(/^[,;\s]+|[,;\s]+$/g, '');
    if (lastSegment) {
      segments.push(lastSegment);
    }

    return segments.length > 0 ? segments : [text];
  }

  ruleBasedPolishParser(text: string): ParsedIntent {
    const normalized = text.trim();
    const lower = normalized.toLowerCase();
    const entities: ExtractedEntity[] = [];

    // 1. Hardware: Torch / Latarka
    if (lower.includes('latark') || lower.includes('światł') || lower.includes('diod')) {
      const isOff = lower.includes('wyłącz') || lower.includes('zgaś') || lower.includes('wylacz');
      const isOn = lower.includes('włącz') || lower.includes('zapal') || lower.includes('wlacz') || !isOff;
      entities.push({ label: 'action', value: isOn ? 'enable' : 'disable' });
      entities.push({ label: 'hardware_toggle', value: 'torch' });
      entities.push({ label: 'setting_value', value: isOn ? 'on' : 'off' });
      return { originalText: normalized, intentType: 'TOGGLE_HARDWARE', entities, confidence: 0.98 };
    }

    // 2. Hardware: Bluetooth
    if (lower.includes('bluetooth') || lower.includes('sinyząb') || lower.includes('sinyzab')) {
      const isOff = lower.includes('wyłącz') || lower.includes('zatrzymaj') || lower.includes('wylacz');
      const isOn = lower.includes('włącz') || lower.includes('uruchom') || lower.includes('wlacz') || !isOff;
      entities.push({ label: 'action', value: isOn ? 'enable' : 'disable' });
      entities.push({ label: 'hardware_toggle', value: 'bluetooth' });
      entities.push({ label: 'setting_value', value: isOn ? 'on' : 'off' });
      return { originalText: normalized, intentType: 'TOGGLE_HARDWARE', entities, confidence: 0.98 };
    }

    // 3. Hardware: Battery / Bateria
    if (lower.includes('bater') || lower.includes('naładowan') || lower.includes('akumulat')) {
      entities.push({ label: 'action', value: 'check_status' });
      entities.push({ label: 'setting_name', value: 'battery' });
      return { originalText: normalized, intentType: 'GET_SYSTEM_METRICS', entities, confidence: 0.99 };
    }

    // 4. App Launch: "otwórz [aplikację]", "uruchom [aplikację]"
    const openAppMatch = /^(otwórz|uruchom|włącz|wlacz|start)\s+(?:aplikację|aplikacje|program)?\s*(.+)$/i.exec(
      normalized
    );
    if (openAppMatch && openAppMatch[2]) {
      const appName = openAppMatch[2].trim();
      entities.push({ label: 'action', value: 'open_app' });
      entities.push({ label: 'target_app', value: appName });
      return { originalText: normalized, intentType: 'OPEN_APPLICATION', entities, confidence: 0.95 };
    }

    // 5. Web Search: "szukaj [zapytanie]", "wyszukaj [zapytanie]"
    const searchMatch = /^(szukaj|wyszukaj|znajdź|znajdz|sprawdź|sprawdz)\s+(?:w\s+internecie|w\s+google)?\s*(.+)$/i.exec(
      normalized
    );
    if (searchMatch && searchMatch[2]) {
      const query = searchMatch[2].trim();
      entities.push({ label: 'action', value: 'web_search' });
      entities.push({ label: 'search_query', value: query });
      return { originalText: normalized, intentType: 'WEB_SEARCH', entities, confidence: 0.94 };
    }

    // 6. Messaging: "wyślij wiadomość do [kontakt] [treść]"
    const msgMatch = /(?:wyślij|wyslij|napisz)\s+(?:wiadomość|sms)?\s*do\s+([\p{L}\d\s]+?)(?:\s+o\s+treści|\s+ze\s+słowami|:)?\s*(.+)?$/iu.exec(
      normalized
    );
    if (msgMatch && msgMatch[1]) {
      const contact = msgMatch[1].trim();
      const body = (msgMatch[2] || '').trim();
      entities.push({ label: 'action', value: 'send_message' });
      entities.push({ label: 'contact', value: contact });
      if (body) {
        entities.push({ label: 'message', value: body });
      }
      return { originalText: normalized, intentType: 'SEND_MESSAGE', entities, confidence: 0.92 };
    }

    // 7. Click UI Node: "kliknij [tekst]", "naciśnij [tekst]"
    const clickMatch = /^(kliknij|naciśnij|nacisnij|stuknij|wybierz)\s+(?:w\s+)?(?:przycisk|pole|element)?\s*(.+)$/i.exec(
      normalized
    );
    if (clickMatch && clickMatch[2]) {
      const targetText = clickMatch[2].trim();
      entities.push({ label: 'action', value: 'click_node' });
      entities.push({ label: 'setting_name', value: targetText });
      return { originalText: normalized, intentType: 'CLICK_NODE', entities, confidence: 0.91 };
    }

    // 8. Screen Inspection & Summary
    if (
      lower.includes('na ekranie') ||
      lower.includes('podsumuj ekran') ||
      lower.includes('przeczytaj ekran') ||
      lower.includes('co tu pisze')
    ) {
      entities.push({ label: 'action', value: 'summarize_screen' });
      return { originalText: normalized, intentType: 'SUMMARIZE_SCREEN', entities, confidence: 0.96 };
    }

    // 9. Swipe gestures: "przewiń w dół", "przesuń w górę"
    if (
      lower.includes('przewiń') ||
      lower.includes('przesuń') ||
      lower.includes('przewin') ||
      lower.includes('przesun') ||
      lower.includes('scroll')
    ) {
      const direction = lower.includes('gór') || lower.includes('gor') ? 'up' : 'down';
      entities.push({ label: 'action', value: 'swipe_screen' });
      entities.push({ label: 'setting_value', value: direction });
      return { originalText: normalized, intentType: 'SWIPE_SCREEN', entities, confidence: 0.95 };
    }

    // 10. Timer: "ustaw minutnik na X minut"
    if (lower.includes('minutnik') || lower.includes('stoper')) {
      const digitsMatch = /\d+/.exec(lower);
      const digits = digitsMatch ? parseInt(digitsMatch[0], 10) : 5;
      const seconds = digits * 60;
      entities.push({ label: 'action', value: 'set_timer' });
      entities.push({ label: 'setting_value', value: seconds.toString() });
      return { originalText: normalized, intentType: 'SET_TIMER', entities, confidence: 0.95 };
    }

    // 11. Alarm: "ustaw budzik na 7:30"
    if (lower.includes('budzik') || lower.includes('alarm')) {
      const timeMatch = /\b(\d{1,2})[:.](\d{2})\b/.exec(lower);
      const timeStr = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : '07:00';
      entities.push({ label: 'action', value: 'set_alarm' });
      entities.push({ label: 'setting_value', value: timeStr });
      return { originalText: normalized, intentType: 'SET_ALARM', entities, confidence: 0.95 };
    }

    // 12. Volume: "głośność na 50%", "wycisz"
    if (lower.includes('głośnoś') || lower.includes('glosnos') || lower.includes('wycisz')) {
      const vol = lower.includes('wycisz')
        ? 0
        : parseInt(/\d+/.exec(lower)?.[0] || '50', 10);
      entities.push({ label: 'action', value: 'set_volume' });
      entities.push({ label: 'setting_value', value: vol.toString() });
      return { originalText: normalized, intentType: 'SET_VOLUME', entities, confidence: 0.97 };
    }

    // 13. General query
    entities.push({ label: 'action', value: 'general_query' });
    entities.push({ label: 'search_query', value: normalized });
    return { originalText: normalized, intentType: 'GENERAL_QUERY', entities, confidence: 0.85 };
  }
}

export const glinerAgent = new GlinerAgent();
