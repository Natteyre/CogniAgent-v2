import React, { useState, useRef } from 'react';
import {
  FileText,
  Upload,
  Trash2,
  X,
  Search,
  CheckCircle,
  FileCheck,
  RefreshCw,
  Plus,
  BookOpen,
  HelpCircle,
  HardDrive,
  Eye,
  FileCode,
  Sparkles
} from 'lucide-react';
import { localRagService, IndexedDocument } from '../../services/localRagService';

interface KnowledgeBaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAskQuestion?: (question: string) => void;
}

export const KnowledgeBaseModal: React.FC<KnowledgeBaseModalProps> = ({
  isOpen,
  onClose,
  onAskQuestion
}) => {
  const [documents, setDocuments] = useState<IndexedDocument[]>(() => localRagService.getDocuments());
  const [searchTestQuery, setSearchTestQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ found: boolean; contextSnippet: string } | null>(null);
  const [isAddingText, setIsAddingText] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [previewDoc, setPreviewDoc] = useState<IndexedDocument | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const refreshDocs = () => {
    setDocuments(localRagService.getDocuments());
  };

  const handleDelete = (id: string) => {
    localRagService.deleteDocument(id);
    refreshDocs();
    setSearchResults(null);
  };

  const handleResetDefaults = () => {
    localRagService.resetToDefaultSamples();
    refreshDocs();
    setSearchResults(null);
  };

  const handleTestSearch = () => {
    if (!searchTestQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const res = localRagService.searchContext(searchTestQuery.trim(), 2);
    setSearchResults(res);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        const id = 'doc_' + Date.now();
        localRagService.indexTextContent(id, file.name, file.type || 'text/plain', file.size, content);
        refreshDocs();
      }
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveCustomNote = () => {
    if (!newDocTitle.trim() || !newDocContent.trim()) return;

    const id = 'doc_' + Date.now();
    const docName = newDocTitle.trim().endsWith('.txt') ? newDocTitle.trim() : `${newDocTitle.trim()}.txt`;
    localRagService.indexTextContent(
      id,
      docName,
      'text/plain',
      newDocContent.length,
      newDocContent.trim()
    );

    setNewDocTitle('');
    setNewDocContent('');
    setIsAddingText(false);
    refreshDocs();
  };

  const SAMPLE_QUERIES = [
    'Co w mojej umowie pisze o okresie wypowiedzenia?',
    'Ile wynosi miesięczny czynsz i kaucja?',
    'Jakie ciśnienie w oponach samochodu zaleca producent?',
    'Gdzie znajduje się bezpiecznik świateł mijania?'
  ];

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#121824] border border-[#2d3748] rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="bg-[#151e2e] border-b border-[#2d3748] p-3.5 sm:p-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00e5ff] to-[#3b82f6] p-0.5 shadow-[0_0_15px_rgba(0,229,255,0.3)] shrink-0">
              <div className="w-full h-full bg-[#121824] rounded-[10px] flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-[#00e5ff]" />
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>Lokalna Baza Wiedzy (Offline RAG)</span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono px-2 py-0.5 rounded-full">
                  100% PAMIĘĆ LOKALNA
                </span>
              </h2>
              <p className="text-[11px] text-gray-400 truncate">
                Twoje prywatne dokumenty, umowy i notatki indeksowane bezpośrednio na procesorze telefonu
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#0a0e14] border border-[#2d3748] p-3 rounded-xl">
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt,.md,.json,.pdf,.doc,.docx"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg bg-[#00e5ff] hover:bg-[#00b4d8] text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Załaduj plik (PDF, TXT, MD)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsAddingText(!isAddingText)}
                className="px-3 py-1.5 rounded-lg bg-[#1e2638] hover:bg-[#2d3748] text-gray-200 border border-gray-600 text-xs font-semibold flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5 text-[#00e5ff]" />
                <span>Wklej notatkę</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 hover:underline"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Przywróć przykładowe dokumenty</span>
            </button>
          </div>

          {/* Form to paste custom document text */}
          {isAddingText && (
            <div className="bg-[#151e2e] border border-[#00e5ff]/40 rounded-xl p-3.5 space-y-2.5 animate-fadeIn">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-[#00e5ff]" />
                  Nowy dokument / Notatka w pamięci
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingText(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input
                type="text"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                placeholder="Tytuł dokumentu (np. Notatki_Informatyka, Regulamin_Firmy)..."
                className="w-full bg-[#0a0e14] border border-[#2d3748] rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#00e5ff]"
              />

              <textarea
                value={newDocContent}
                onChange={(e) => setNewDocContent(e.target.value)}
                rows={4}
                placeholder="Treść dokumentu, artykułu lub umowy do zindeksowania przez silnik RAG..."
                className="w-full bg-[#0a0e14] border border-[#2d3748] rounded-lg p-2.5 text-xs text-white outline-none focus:border-[#00e5ff] font-mono resize-none"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingText(false)}
                  className="px-3 py-1 rounded-lg text-xs text-gray-400 hover:text-white"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomNote}
                  className="px-4 py-1.5 rounded-lg bg-[#00e5ff] text-black font-bold text-xs"
                >
                  Zindeksuj w telefonie
                </button>
              </div>
            </div>
          )}

          {/* Document List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400 px-1">
              <span>Zindeksowane dokumenty ({documents.length}):</span>
              <span>Łącznie chunków semantycznych: {documents.reduce((a, b) => a + b.chunksCount, 0)}</span>
            </div>

            {documents.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-xs bg-[#0a0e14] rounded-xl border border-[#2d3748]">
                Brak zindeksowanych dokumentów. Dodaj plik PDF lub notatkę powyżej.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-[#0a0e14] border border-[#2d3748] hover:border-gray-600 rounded-xl p-3 flex flex-col justify-between gap-2 transition-all"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 overflow-hidden min-w-0">
                          <FileText className="w-4 h-4 text-[#00e5ff] shrink-0" />
                          <span className="font-bold text-xs text-white truncate" title={doc.name}>
                            {doc.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(doc.id)}
                          className="text-gray-500 hover:text-red-400 p-1 transition-colors"
                          title="Usuń dokument z pamięci RAG"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
                        <span className="bg-[#1e2638] px-1.5 py-0.5 rounded font-mono">
                          {doc.chunksCount} fragmentów
                        </span>
                        <span>{(doc.sizeBytes / 1024).toFixed(1)} KB</span>
                        <span className="text-emerald-400">✓ Gotowy do RAG</span>
                      </div>

                      <p className="text-[11px] text-gray-400 mt-2 line-clamp-2 leading-relaxed bg-[#121824] p-2 rounded-lg border border-white/5 font-mono text-[10px]">
                        {doc.preview}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-white/5 text-[10px]">
                      <span className="text-gray-500">
                        Dodano: {new Date(doc.addedAt).toLocaleDateString('pl-PL')}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPreviewDoc(doc)}
                        className="text-[#00e5ff] hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Szczegóły</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Test Search & Sample Prompts */}
          <div className="bg-[#0a0e14] border border-[#2d3748] rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#8b5cf6]" />
                Przetestuj zapytanie do Bazy Wiedzy:
              </span>
              <span className="text-[10px] text-gray-400">Wyszukiwanie semantyczne bez chmury</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={searchTestQuery}
                onChange={(e) => setSearchTestQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTestSearch()}
                placeholder="Np. 'okres wypowiedzenia', 'kaucja', 'ciśnienie w oponach'..."
                className="flex-1 bg-[#121824] border border-[#2d3748] focus:border-[#00e5ff] rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
              <button
                type="button"
                onClick={handleTestSearch}
                className="px-3.5 py-2 rounded-xl bg-[#00e5ff] hover:bg-[#00b4d8] text-black font-bold text-xs transition-all flex items-center gap-1 shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Szukaj</span>
              </button>
            </div>

            {/* Quick Sample Chips */}
            <div className="space-y-1.5">
              <div className="text-[10px] text-gray-400">Szybkie pytania testowe (kliknij, by zapytać asystenta):</div>
              <div className="flex flex-wrap gap-1.5">
                {SAMPLE_QUERIES.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (onAskQuestion) {
                        onAskQuestion(q);
                        onClose();
                      } else {
                        setSearchTestQuery(q);
                        const res = localRagService.searchContext(q, 2);
                        setSearchResults(res);
                      }
                    }}
                    className="text-left text-[11px] bg-[#151e2e] hover:bg-[#1e2638] text-gray-300 hover:text-[#00e5ff] px-2.5 py-1 rounded-lg border border-gray-700/60 transition-colors flex items-center gap-1.5"
                  >
                    <span>💬</span>
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search Results Display */}
            {searchResults && (
              <div className="bg-[#121824] border border-emerald-500/40 rounded-xl p-3 space-y-2 mt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    {searchResults.found ? 'Trafienia w lokalnych dokumentach:' : 'Brak bezpośrednich trafień'}
                  </span>
                </div>
                {searchResults.found ? (
                  <div className="space-y-1.5">
                    <pre className="text-[11px] text-gray-200 bg-[#0a0e14] p-2.5 rounded-lg border border-white/5 font-mono whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                      {searchResults.contextSnippet}
                    </pre>
                    <div className="text-[10px] text-gray-400">
                      Te fragmenty zostaną automatycznie przekazane do lokalnego modelu SLM podczas rozmowy na czacie!
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-400">
                    Spróbuj użyć innych słów kluczowych lub dodaj odpowiedni dokument do bazy.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Document Full Preview Modal */}
        {previewDoc && (
          <div className="absolute inset-0 bg-black/90 p-4 sm:p-6 z-10 flex flex-col animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#00e5ff]" />
                <h3 className="font-bold text-white text-sm">{previewDoc.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              <p className="text-xs font-mono text-gray-300 whitespace-pre-wrap bg-[#0a0e14] p-4 rounded-xl border border-gray-800 leading-relaxed">
                {previewDoc.preview}
              </p>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 bg-[#1e2638] text-white rounded-xl text-xs font-bold"
              >
                Zamknij podgląd
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
