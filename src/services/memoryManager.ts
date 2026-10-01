import { UserMemoryFact } from '../types';

const MEMORY_STORAGE_KEY = 'cogni_user_memory_facts';

const DEFAULT_MEMORY_FACTS: UserMemoryFact[] = [
  {
    id: 'fact-1',
    category: 'preference',
    fact: 'Użytkownik preferuje zwięzłe, techniczne odpowiedzi w języku polskim.',
    confidence: 0.99,
    createdAt: Date.now() - 86400000 * 2,
    sourceText: 'Ustawienia systemowe'
  },
  {
    id: 'fact-2',
    category: 'device',
    fact: 'Główne urządzenie: Huawei P30 Pro z procesorem HiSilicon Kirin 980 (Dual-NPU).',
    confidence: 0.98,
    createdAt: Date.now() - 86400000,
    sourceText: 'Profil sprzętowy EMUI 10'
  },
  {
    id: 'fact-3',
    category: 'routine',
    fact: 'Preferowany tryb działania: Hybrydowy (lokalne NLU/SLM z fallbackiem do chmury).',
    confidence: 0.95,
    createdAt: Date.now() - 3600000,
    sourceText: 'Konfiguracja agenta'
  }
];

class MemoryManager {
  private facts: UserMemoryFact[] = [];
  private listeners: ((facts: UserMemoryFact[]) => void)[] = [];

  constructor() {
    this.facts = this.loadFacts();
  }

  private loadFacts(): UserMemoryFact[] {
    try {
      const data = localStorage.getItem(MEMORY_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load memory facts', e);
    }
    return [...DEFAULT_MEMORY_FACTS];
  }

  private saveFacts(): void {
    try {
      localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(this.facts));
      this.notify();
    } catch (e) {
      console.error('Failed to save memory facts', e);
    }
  }

  private notify(): void {
    this.listeners.forEach((l) => l([...this.facts]));
  }

  subscribe(listener: (facts: UserMemoryFact[]) => void): () => void {
    this.listeners.push(listener);
    listener([...this.facts]);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  getFacts(): UserMemoryFact[] {
    return [...this.facts];
  }

  addFact(
    fact: string,
    category: UserMemoryFact['category'] = 'personal',
    sourceText?: string,
    confidence = 0.92
  ): UserMemoryFact {
    const newFact: UserMemoryFact = {
      id: `fact-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      category,
      fact: fact.trim(),
      confidence,
      createdAt: Date.now(),
      sourceText
    };

    // Avoid exact duplicate
    const exists = this.facts.some((f) => f.fact.toLowerCase() === newFact.fact.toLowerCase());
    if (!exists) {
      this.facts = [newFact, ...this.facts];
      this.saveFacts();
    }
    return newFact;
  }

  deleteFact(id: string): void {
    this.facts = this.facts.filter((f) => f.id !== id);
    this.saveFacts();
  }

  clearAll(): void {
    this.facts = [];
    this.saveFacts();
  }

  /**
   * Automated rule-based memory extraction from conversational turns
   */
  extractFactsFromConversation(userText: string): UserMemoryFact[] {
    const text = userText.trim();
    const lower = text.toLowerCase();
    const extracted: UserMemoryFact[] = [];

    // Name detection: "mam na imię [X]", "nazywam się [X]"
    const nameMatch = /(?:mam\s+na\s+imię|mam\s+na\s+imie|nazywam\s+się|nazywam\s+sie)\s+([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+)/i.exec(text);
    if (nameMatch && nameMatch[1]) {
      const name = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1);
      extracted.push(this.addFact(`Imię użytkownika: ${name}`, 'personal', text, 0.98));
    }

    // City / Location: "mieszkam w [X]", "jestem z [X]"
    const cityMatch = /(?:mieszkam\s+w|jestem\s+z)\s+([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż\s-]+?)(?=[,.]|$)/i.exec(text);
    if (cityMatch && cityMatch[1]) {
      const city = cityMatch[1].trim();
      if (city.length > 2) {
        extracted.push(this.addFact(`Miejsce zamieszkania: ${city}`, 'personal', text, 0.9));
      }
    }

    // Pets: "mój pies/kot wabi się [X]"
    const petMatch = /(?:mój\s+pies|mój\s+kot|mój\s+piesek|mój\s+zwierzak)\s+(?:wabi\s+się|ma\s+na\s+imię|to)\s+([A-ZĄĆĘŁŃÓŚŹŻa-ząćęłńóśźż]+)/i.exec(text);
    if (petMatch && petMatch[1]) {
      extracted.push(this.addFact(`Zwierzę domowe: ${petMatch[1].trim()}`, 'personal', text, 0.92));
    }

    // Favorite apps: "moja ulubiona aplikacja to [X]", "często używam [X]"
    const appMatch = /(?:moja\s+ulubiona\s+aplikacja\s+to|często\s+używam|czesto\s+uzywam)\s+([a-zA-Z0-9\s]+?)(?=[,.]|$)/i.exec(text);
    if (appMatch && appMatch[1]) {
      const app = appMatch[1].trim();
      if (app.length > 2) {
        extracted.push(this.addFact(`Ulubiona aplikacja użytkownika: ${app}`, 'preference', text, 0.91));
      }
    }

    // Sleep schedule: "wstaję o [X]", "kładę się o [X]"
    const sleepMatch = /(?:wstaję\s+o|budzę\s+się\s+o|wstaje\s+o)\s+(\d{1,2}(?::\d{2})?)/i.exec(lower);
    if (sleepMatch && sleepMatch[1]) {
      extracted.push(this.addFact(`Pora pobudki: ${sleepMatch[1]}`, 'routine', text, 0.88));
    }

    return extracted;
  }

  /**
   * Generates a context block for the LLM prompt
   */
  getMemoryContextPrompt(): string {
    if (this.facts.length === 0) return '';
    const factList = this.facts.map((f) => `- ${f.fact}`).join('\n');
    return `\n[Pamięć Długoterminowa o Użytkowniku]:\n${factList}\n`;
  }
}

export const memoryManager = new MemoryManager();
