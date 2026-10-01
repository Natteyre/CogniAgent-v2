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

    // 4. Do Not Disturb (DND) / Tryb Nie Przeszkadzać
    if (
      lower.includes('nie przeszkadz') ||
      lower.includes('dnd') ||
      lower.includes('tryb cichy') ||
      lower.includes('wycisz powiadomienia')
    ) {
      const isOff = lower.includes('wyłącz') || lower.includes('wylacz') || lower.includes('odcisz');
      const isOn = !isOff;
      entities.push({ label: 'action', value: isOn ? 'enable' : 'disable' });
      entities.push({ label: 'setting_value', value: isOn ? 'on' : 'off' });
      return { originalText: normalized, intentType: 'SET_DND', entities, confidence: 0.96 };
    }

    // 5. Brightness / Jasność ekranu
    if (lower.includes('jasnoś') || lower.includes('jasnos') || lower.includes('ściemnij') || lower.includes('sciemnij') || lower.includes('rozjaśnij') || lower.includes('rozjasnij')) {
      let percent = 50;
      const numMatch = /\d+/.exec(lower);
      if (numMatch) {
        percent = parseInt(numMatch[0], 10);
      } else if (lower.includes('ściemnij') || lower.includes('zmniejsz') || lower.includes('sciemnij')) {
        percent = 25;
      } else if (lower.includes('rozjaśnij') || lower.includes('maks') || lower.includes('zwiększ')) {
        percent = 100;
      }
      entities.push({ label: 'action', value: 'set_brightness' });
      entities.push({ label: 'setting_value', value: percent.toString() });
      return { originalText: normalized, intentType: 'SET_BRIGHTNESS', entities, confidence: 0.95 };
    }

    // 6. Timer: "ustaw minutnik na X minut/sekund"
    if (lower.includes('minutnik') || lower.includes('stoper') || lower.includes('odliczaj')) {
      const digitsMatch = /\d+/.exec(lower);
      let seconds = 300;
      if (digitsMatch) {
        const val = parseInt(digitsMatch[0], 10);
        if (lower.includes('sekund')) {
          seconds = val;
        } else {
          seconds = val * 60;
        }
      }
      entities.push({ label: 'action', value: 'set_timer' });
      entities.push({ label: 'setting_value', value: seconds.toString() });
      return { originalText: normalized, intentType: 'SET_TIMER', entities, confidence: 0.96 };
    }

    // 7. Alarm: "ustaw budzik na 7:30"
    if (lower.includes('budzik') || lower.includes('alarm')) {
      const timeMatch = /\b(\d{1,2})[:.](\d{2})\b/.exec(lower);
      const timeStr = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : '07:00';
      entities.push({ label: 'action', value: 'set_alarm' });
      entities.push({ label: 'setting_value', value: timeStr });
      return { originalText: normalized, intentType: 'SET_ALARM', entities, confidence: 0.96 };
    }

    // 8. Volume: "głośność na 50%", "wycisz"
    if (lower.includes('głośnoś') || lower.includes('glosnos') || lower.includes('wycisz') || lower.includes('podgłoś') || lower.includes('scisz')) {
      const vol = lower.includes('wycisz')
        ? 0
        : parseInt(/\d+/.exec(lower)?.[0] || '50', 10);
      entities.push({ label: 'action', value: 'set_volume' });
      entities.push({ label: 'setting_value', value: vol.toString() });
      return { originalText: normalized, intentType: 'SET_VOLUME', entities, confidence: 0.97 };
    }

    // 9. App Launch: "otwórz [aplikację]", "otówrz [aplikację]", "uruchom [aplikację]"
    const openAppMatch = /^(otwórz|otówrz|otowrz|uruchom|odpal|włącz|wlacz|start)\s+(?:aplikację|aplikacje|program)?\s*(.+)$/i.exec(
      normalized
    );
    if (openAppMatch && openAppMatch[2]) {
      const appName = openAppMatch[2].trim();
      entities.push({ label: 'action', value: 'open_app' });
      entities.push({ label: 'target_app', value: appName });
      return { originalText: normalized, intentType: 'OPEN_APPLICATION', entities, confidence: 0.95 };
    }

    // 10. Web / Media Search: "wyszukaj [filmy z kotami]", "szukaj [zapytanie]"
    const searchMatch = /^(szukaj|wyszukaj|znajdź|znajdz|odtwórz|odtworz|puść|pusc|sprawdź|sprawdz)\s+(?:w\s+internecie|w\s+google|w\s+youtube|na\s+youtube)?\s*(.+)$/i.exec(
      normalized
    );
    if (searchMatch && searchMatch[2]) {
      const query = searchMatch[2].trim();
      entities.push({ label: 'action', value: 'web_search' });
      entities.push({ label: 'search_query', value: query });
      if (lower.includes('youtube') || lower.includes('film') || lower.includes('wideo') || lower.includes('video')) {
        entities.push({ label: 'service', value: 'youtube' });
      }
      return { originalText: normalized, intentType: 'WEB_SEARCH', entities, confidence: 0.94 };
    }

    // 11. Messaging: "wyślij wiadomość do [kontakt] [treść]"
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

    // 12. Click UI Node: "kliknij [tekst]", "naciśnij [tekst]"
    const clickMatch = /^(kliknij|naciśnij|nacisnij|stuknij|wybierz)\s+(?:w\s+)?(?:przycisk|pole|element)?\s*(.+)$/i.exec(
      normalized
    );
    if (clickMatch && clickMatch[2]) {
      const targetText = clickMatch[2].trim();
      entities.push({ label: 'action', value: 'click_node' });
      entities.push({ label: 'setting_name', value: targetText });
      return { originalText: normalized, intentType: 'CLICK_NODE', entities, confidence: 0.91 };
    }

    // 13. Screen Inspection & Summary
    if (
      lower.includes('przetłumacz ekran') ||
      lower.includes('przetlumacz ekran') ||
      lower.includes('wyjaśnij ekran')
    ) {
      entities.push({ label: 'action', value: 'translate_screen' });
      return { originalText: normalized, intentType: 'TRANSLATE_SCREEN', entities, confidence: 0.96 };
    }

    if (
      lower.includes('na ekranie') ||
      lower.includes('podsumuj ekran') ||
      lower.includes('przeczytaj ekran') ||
      lower.includes('co tu pisze') ||
      lower.includes('co jest na ekranie')
    ) {
      entities.push({ label: 'action', value: 'summarize_screen' });
      return { originalText: normalized, intentType: 'SUMMARIZE_SCREEN', entities, confidence: 0.96 };
    }

    // 14. Notifications Reader
    if (
      lower.includes('powiadomien') ||
      lower.includes('nowe wiadomości') ||
      lower.includes('nowe wiadomosci') ||
      lower.includes('ktoś pisał') ||
      lower.includes('ktos pisal')
    ) {
      entities.push({ label: 'action', value: 'read_notifications' });
      return { originalText: normalized, intentType: 'READ_NOTIFICATIONS', entities, confidence: 0.97 };
    }

    // 15. Swipe gestures: "przewiń w dół", "przesuń w górę"
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

    // 16. In-App System Navigation (Back, Home, Recents)
    if (lower === 'cofnij' || lower === 'wróć' || lower === 'wroc' || lower === 'powrót') {
      entities.push({ label: 'action', value: 'navigate_back' });
      return { originalText: normalized, intentType: 'NAVIGATE_BACK', entities, confidence: 0.98 };
    }

    if (lower.includes('ekran główny') || lower.includes('ekran glowny') || lower === 'pulpit' || lower === 'do domu') {
      entities.push({ label: 'action', value: 'navigate_home' });
      return { originalText: normalized, intentType: 'NAVIGATE_HOME', entities, confidence: 0.98 };
    }

    if (lower.includes('ostatnie aplikacje') || lower.includes('otwarte aplikacje') || lower.includes('menedżer zadań')) {
      entities.push({ label: 'action', value: 'navigate_recents' });
      return { originalText: normalized, intentType: 'NAVIGATE_RECENTS', entities, confidence: 0.98 };
    }

    // 17. Media Controls in foreground apps: "zatrzymaj", "wznów", "pauza"
    if (lower === 'pauza' || lower.includes('zatrzymaj odtwarzanie') || lower.includes('zatrzymaj muzykę') || lower.includes('wznów odtwarzanie')) {
      const isPause = !lower.includes('wznów');
      entities.push({ label: 'action', value: isPause ? 'pause' : 'play' });
      return { originalText: normalized, intentType: 'MEDIA_CONTROL', entities, confidence: 0.96 };
    }

    // 18. Skill Recording: "nagraj nowy skill", "rozpocznij nagrywanie"
    if (
      lower.includes('nagraj skill') ||
      lower.includes('nagrywanie skilla') ||
      lower.includes('nagraj makro') ||
      lower.includes('rozpocznij nagrywanie') ||
      lower.includes('zarejestruj skill')
    ) {
      entities.push({ label: 'action', value: 'start_recording' });
      return { originalText: normalized, intentType: 'START_RECORDING_SKILL', entities, confidence: 0.98 };
    }

    // 19. Run Specific Skill / Macro: "uruchom skill [nazwa]", "wykonaj [nazwa]"
    const runSkillMatch = /^(?:uruchom|wykonaj|włącz|wlacz|odpal)\s+(?:skill|rutynę|rutyne|makro)\s+(.+)$/i.exec(
      normalized
    );
    if (runSkillMatch && runSkillMatch[1]) {
      const skillName = runSkillMatch[1].trim();
      entities.push({ label: 'action', value: 'run_skill' });
      entities.push({ label: 'setting_name', value: skillName });
      return { originalText: normalized, intentType: 'RUN_SKILL', entities, confidence: 0.96 };
    }

    // 20. General query
    entities.push({ label: 'action', value: 'general_query' });
    entities.push({ label: 'search_query', value: normalized });
    return { originalText: normalized, intentType: 'GENERAL_QUERY', entities, confidence: 0.85 };
  }
}

export const glinerAgent = new GlinerAgent();
