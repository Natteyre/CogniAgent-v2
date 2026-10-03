export interface DocumentChunk {
  id: string;
  docId: string;
  docName: string;
  text: string;
  keywords: string[];
}

export interface IndexedDocument {
  id: string;
  name: string;
  sizeBytes: number;
  type: string;
  addedAt: number;
  chunksCount: number;
  preview: string;
}

const STORAGE_KEY = 'cogni_local_rag_documents';
const CHUNKS_KEY = 'cogni_local_rag_chunks';

const SAMPLE_DOCUMENTS = [
  {
    id: 'doc_umowa_najmu',
    name: 'Umowa_Najmu_Mieszkania.pdf',
    type: 'application/pdf',
    sizeBytes: 142800,
    content: `UMOWA NAJMU LOKALU MIESZKALNEGO
Zawarta w Warszawie pomiędzy Wynajmującym Janem Kowalskim a Najemcą.
§ 1. Przedmiot umowy: Lokal mieszkalny nr 15 przy ul. Marszałkowskiej 42 w Warszawie, o powierzchni 48 m2.
§ 2. Czynsz i opłaty: Czynsz najmu wynosi 3200 zł miesięcznie, płatny z góry do 10. dnia każdego miesiąca na rachunek bankowy. Dodatkowo Najemca pokrywa opłaty administracyjne (czynsz spółdzielczy) w kwocie 650 zł oraz media wg liczników (prąd, woda, gaz).
§ 3. Kaucja: Kaucja zabezpieczająca wynosi 4000 zł i podlega zwrotowi w terminie 30 dni od dnia opróżnienia lokalu po potrąceniu ewentualnych zaległości.
§ 4. Zasady użytkowania: W lokalu obowiązuje bezwzględny zakaz palenia wyrobów tytoniowych i e-papierosów. Wynajmujący wyraża zgodę na posiadanie jednego małego zwierzęcia domowego (kot).
§ 5. Okres wypowiedzenia i rozwiązanie: Umowa zawarta jest na czas nieokreślony. Każdej ze stron przysługuje prawo rozwiązania umowy z zachowaniem 2-miesięcznego okresu wypowiedzenia ze skutkiem na koniec miesiąca kalendarzowego. Wypowiedzenie wymaga formy pisemnej pod rygorem nieważności.
§ 6. Naprawy: Drobne naprawy wynikające ze zwykłego użytkowania (np. wymiana żarówek, uszczelek) obciążają Najemcę. Naprawy instalacji i sprzętu AGD obciążają Wynajmującego.`
  },
  {
    id: 'doc_instrukcja_samochodu',
    name: 'Instrukcja_Obslugi_Samochodu_Kirin.pdf',
    type: 'application/pdf',
    sizeBytes: 254000,
    content: `INSTRUKCJA EKSPLOATACJI POJAZDU (SYSTEM COGNI AUTO)
Rozdział 1: Koła i ogumienie.
Zalecane ciśnienie w oponach przy standardowym obciążeniu (1-2 osoby):
- Oś przednia: 2.3 bar (33 PSI)
- Oś tylna: 2.2 bar (32 PSI)
Przy pełnym obciążeniu pojazdu (5 osób + bagaż):
- Oś przednia: 2.5 bar (36 PSI)
- Oś tylna: 2.7 bar (39 PSI)
Moment dokręcania śrub kół: 120 Nm.

Rozdział 2: Płyny eksploatacyjne i silnik.
Olej silnikowy: W pełni syntetyczny 5W-30 spełniający normę API SP / ILSAC GF-6.
Pojemność układu smarowania z wymianą filtra: 4.2 litra.
Płyn chłodzący: Organiczny OAT (kolor różowy), interwał wymiany co 5 lat lub 150 000 km.
Płyn hamulcowy: DOT 4, zalecana wymiana co 2 lata.

Rozdział 3: Bezpieczniki i instalacja elektryczna.
Główna skrzynka bezpieczników znajduje się pod deską rozdzielczą po lewej stronie kierownicy.
- Bezpiecznik świateł mijania: gniazdo F12 (15A, kolor niebieski).
- Bezpiecznik gniazda 12V / zapalniczki: gniazdo F18 (20A, kolor żółty).
- Bezpiecznik radia i ekranu multimedialnego: gniazdo F25 (10A, kolor czerwony).
W razie rozładowania akumulatora 12V: Biegun dodatni (+) oznaczony czerwoną osłoną, masę (-) podłączyć do niepomalowanego elementu bloku silnika.`
  }
];

class LocalRagService {
  private documents: IndexedDocument[] = [];
  private chunks: DocumentChunk[] = [];

  constructor() {
    this.loadState();
  }

  private loadState() {
    try {
      const savedDocs = localStorage.getItem(STORAGE_KEY);
      const savedChunks = localStorage.getItem(CHUNKS_KEY);

      if (savedDocs && savedChunks) {
        this.documents = JSON.parse(savedDocs);
        this.chunks = JSON.parse(savedChunks);
      } else {
        // Initialize with default sample documents
        this.initializeSamples();
      }
    } catch (e) {
      console.warn('Failed to load local RAG storage:', e);
      this.initializeSamples();
    }
  }

  private initializeSamples() {
    this.documents = [];
    this.chunks = [];

    for (const sample of SAMPLE_DOCUMENTS) {
      this.indexTextContent(sample.id, sample.name, sample.type, sample.sizeBytes, sample.content);
    }
    this.saveState();
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.documents));
      localStorage.setItem(CHUNKS_KEY, JSON.stringify(this.chunks));
    } catch (e) {
      console.error('Failed to save local RAG state:', e);
    }
  }

  private extractKeywords(text: string): string[] {
    const stopWords = new Set([
      'i', 'w', 'na', 'z', 'do', 'o', 'ze', 'za', 'oraz', 'jest', 'to', 'się', 'lub', 'jak', 'nie', 'że',
      'dla', 'od', 'po', 'przy', 'przez', 'co', 'ten', 'ta', 'te', 'tym', 'jego', 'jej', 'ich', 'a'
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !stopWords.has(w));

    return Array.from(new Set(words));
  }

  indexTextContent(
    id: string,
    name: string,
    type: string,
    sizeBytes: number,
    fullText: string
  ): IndexedDocument {
    // Remove existing chunks for this doc if re-indexing
    this.chunks = this.chunks.filter((c) => c.docId !== id);
    this.documents = this.documents.filter((d) => d.id !== id);

    // Split text into chunks (~300-500 chars based on paragraphs or sentences)
    const paragraphs = fullText
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 10);

    const docChunks: DocumentChunk[] = [];

    paragraphs.forEach((para, idx) => {
      // If paragraph is long, split by sentences
      if (para.length > 600) {
        const sentences = para.split(/(?<=[.?!])\s+/);
        let cur = '';
        sentences.forEach((s, sIdx) => {
          if ((cur + ' ' + s).length > 500 && cur.length > 0) {
            docChunks.push({
              id: `${id}_chk_${idx}_${sIdx}`,
              docId: id,
              docName: name,
              text: cur.trim(),
              keywords: this.extractKeywords(cur)
            });
            cur = s;
          } else {
            cur += (cur ? ' ' : '') + s;
          }
        });
        if (cur.trim().length > 10) {
          docChunks.push({
            id: `${id}_chk_${idx}_end`,
            docId: id,
            docName: name,
            text: cur.trim(),
            keywords: this.extractKeywords(cur)
          });
        }
      } else {
        docChunks.push({
          id: `${id}_chk_${idx}`,
          docId: id,
          docName: name,
          text: para,
          keywords: this.extractKeywords(para)
        });
      }
    });

    this.chunks.push(...docChunks);

    const newDoc: IndexedDocument = {
      id,
      name,
      sizeBytes,
      type,
      addedAt: Date.now(),
      chunksCount: docChunks.length,
      preview: fullText.slice(0, 180).trim() + (fullText.length > 180 ? '...' : '')
    };

    this.documents.push(newDoc);
    this.saveState();
    return newDoc;
  }

  getDocuments(): IndexedDocument[] {
    return [...this.documents];
  }

  deleteDocument(id: string): boolean {
    this.documents = this.documents.filter((d) => d.id !== id);
    this.chunks = this.chunks.filter((c) => c.docId !== id);
    this.saveState();
    return true;
  }

  resetToDefaultSamples() {
    this.initializeSamples();
    return this.documents;
  }

  /**
   * Search knowledge base for relevant chunks given a natural language query
   */
  searchContext(query: string, maxResults: number = 3): {
    found: boolean;
    results: { chunk: DocumentChunk; score: number }[];
    contextSnippet: string;
  } {
    const queryKeywords = this.extractKeywords(query);
    if (queryKeywords.length === 0 || this.chunks.length === 0) {
      return { found: false, results: [], contextSnippet: '' };
    }

    const scored: { chunk: DocumentChunk; score: number }[] = [];

    for (const chunk of this.chunks) {
      let score = 0;
      const lowerChunk = chunk.text.toLowerCase();

      for (const kw of queryKeywords) {
        // Exact substring in text: high weight
        if (lowerChunk.includes(kw)) {
          score += 3;
        }
        // Keyword match in extracted tokens
        if (chunk.keywords.includes(kw)) {
          score += 1.5;
        }
      }

      // Bonus if document title matches query word (e.g. "umowa", "instrukcja", "samochód")
      const lowerDocName = chunk.docName.toLowerCase();
      for (const kw of queryKeywords) {
        if (lowerDocName.includes(kw)) {
          score += 2;
        }
      }

      if (score > 1.5) {
        scored.push({ chunk, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const topResults = scored.slice(0, maxResults);

    if (topResults.length === 0) {
      return { found: false, results: [], contextSnippet: '' };
    }

    const snippetLines = topResults.map(
      (r, i) => `[Źródło ${i + 1}: ${r.chunk.docName}]\n${r.chunk.text}`
    );

    return {
      found: true,
      results: topResults,
      contextSnippet: snippetLines.join('\n\n')
    };
  }
}

export const localRagService = new LocalRagService();
