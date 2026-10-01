import React, { useState, useEffect } from 'react';
import {
  Brain,
  X,
  Plus,
  Trash2,
  Sparkles,
  User,
  Heart,
  Clock,
  Smartphone,
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { UserMemoryFact } from '../../types';
import { memoryManager } from '../../services/memoryManager';
import { soundAndHaptics } from '../../services/soundAndHaptics';

interface MemoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MemoryManagerModal: React.FC<MemoryManagerModalProps> = ({
  isOpen,
  onClose
}) => {
  const [facts, setFacts] = useState<UserMemoryFact[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFactText, setNewFactText] = useState('');
  const [newFactCategory, setNewFactCategory] = useState<UserMemoryFact['category']>('personal');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  useEffect(() => {
    const unsub = memoryManager.subscribe((f) => setFacts(f));
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFactText.trim()) {
      memoryManager.addFact(newFactText.trim(), newFactCategory, 'Dodano ręcznie');
      setNewFactText('');
      setShowAddForm(false);
      soundAndHaptics.playSuccessChime();
    }
  };

  const handleDelete = (id: string) => {
    memoryManager.deleteFact(id);
    soundAndHaptics.triggerHaptic(20);
  };

  const handleClearAll = () => {
    if (window.confirm('Czy na pewno chcesz wyczyścić całą pamięć asystenta?')) {
      memoryManager.clearAll();
      soundAndHaptics.triggerHaptic([30, 50, 30]);
    }
  };

  const getCategoryBadge = (category: UserMemoryFact['category']) => {
    switch (category) {
      case 'personal':
        return (
          <span className="bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <User className="w-3 h-3" />
            <span>Osobiste</span>
          </span>
        );
      case 'preference':
        return (
          <span className="bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Heart className="w-3 h-3" />
            <span>Preferencje</span>
          </span>
        );
      case 'routine':
        return (
          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>Nawyki</span>
          </span>
        );
      case 'device':
        return (
          <span className="bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Smartphone className="w-3 h-3" />
            <span>Urządzenie</span>
          </span>
        );
      default:
        return null;
    }
  };

  const filteredFacts = facts.filter((f) => {
    if (selectedFilter === 'all') return true;
    return f.category === selectedFilter;
  });

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#121824] border border-[#2d3748] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="bg-[#151e2e] border-b border-[#2d3748] p-3.5 sm:p-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00e5ff] to-[#8b5cf6] p-0.5 shadow-[0_0_15px_rgba(0,229,255,0.4)] shrink-0">
              <div className="w-full h-full bg-[#121824] rounded-[10px] flex items-center justify-center">
                <Brain className="w-5 h-5 text-[#00e5ff]" />
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>Pamięć Długoterminowa</span>
                <span className="bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/30 text-[10px] font-mono px-2 py-0.5 rounded-full">
                  {facts.length} zapamiętanych
                </span>
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                Asystent automatycznie pamięta fakty i preferencje użytkownika
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filter Chips */}
        <div className="bg-[#0e141f] border-b border-[#2d3748] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setSelectedFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                selectedFilter === 'all'
                  ? 'bg-[#00e5ff] text-black font-bold'
                  : 'bg-[#1e2638] text-gray-400 hover:text-white'
              }`}
            >
              Wszystkie ({facts.length})
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('personal')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                selectedFilter === 'personal'
                  ? 'bg-[#00e5ff] text-black font-bold'
                  : 'bg-[#1e2638] text-gray-400 hover:text-white'
              }`}
            >
              Osobiste
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('preference')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                selectedFilter === 'preference'
                  ? 'bg-[#00e5ff] text-black font-bold'
                  : 'bg-[#1e2638] text-gray-400 hover:text-white'
              }`}
            >
              Preferencje
            </button>
            <button
              type="button"
              onClick={() => setSelectedFilter('routine')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                selectedFilter === 'routine'
                  ? 'bg-[#00e5ff] text-black font-bold'
                  : 'bg-[#1e2638] text-gray-400 hover:text-white'
              }`}
            >
              Nawyki
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-xs text-[#00e5ff] hover:underline flex items-center gap-1 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Dodaj fakt</span>
            </button>
            {facts.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Wyczyść</span>
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3">
          {/* Add Fact Form */}
          {showAddForm && (
            <form
              onSubmit={handleAddSubmit}
              className="bg-[#152033] border border-[#00e5ff]/30 rounded-2xl p-3.5 space-y-3 animate-fadeIn"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#00e5ff] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Dodaj nowy fakt do pamięci asystenta
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-white text-xs"
                >
                  Anuluj
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-2">
                  <label className="text-[10px] text-gray-400 block mb-1">Treść faktu:</label>
                  <input
                    type="text"
                    value={newFactText}
                    onChange={(e) => setNewFactText(e.target.value)}
                    placeholder="Np. Pies użytkownika ma na imię Burek"
                    className="w-full bg-[#0a0e14] border border-[#2d3748] rounded-xl px-3 py-1.5 text-xs text-white outline-none focus:border-[#00e5ff]"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Kategoria:</label>
                  <select
                    value={newFactCategory}
                    onChange={(e) =>
                      setNewFactCategory(e.target.value as UserMemoryFact['category'])
                    }
                    className="w-full bg-[#0a0e14] border border-[#2d3748] rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#00e5ff]"
                  >
                    <option value="personal">Osobiste</option>
                    <option value="preference">Preferencje</option>
                    <option value="routine">Nawyki</option>
                    <option value="device">Urządzenie</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!newFactText.trim()}
                  className="py-1.5 px-4 bg-gradient-to-r from-[#00e5ff] to-[#8b5cf6] text-black font-extrabold text-xs rounded-xl hover:opacity-95 disabled:opacity-50 transition-all shadow-md"
                >
                  Zapisz w pamięci
                </button>
              </div>
            </form>
          )}

          {/* Facts list */}
          {filteredFacts.length === 0 ? (
            <div className="text-center py-12 text-gray-400 space-y-2">
              <Brain className="w-10 h-10 mx-auto text-gray-600 opacity-50" />
              <p className="text-sm">Brak faktów w tej kategorii</p>
              <p className="text-xs text-gray-500">
                Podczas rozmowy powiedz np. "Mam na imię Piotr" lub "Mój kot wabi się Luna", a asystent to zapamięta!
              </p>
            </div>
          ) : (
            filteredFacts.map((fact) => (
              <div
                key={fact.id}
                className="bg-[#0a0e14] border border-white/5 hover:border-[#8b5cf6]/40 rounded-2xl p-3.5 transition-all flex items-start justify-between gap-3"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getCategoryBadge(fact.category)}
                    <span className="text-[10px] text-gray-400 font-mono">
                      Pewność: {Math.round(fact.confidence * 100)}%
                    </span>
                    <span className="text-[10px] text-gray-500">
                      • {new Date(fact.createdAt).toLocaleDateString('pl-PL')}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed break-words">
                    {fact.fact}
                  </p>

                  {fact.sourceText && (
                    <p className="text-[11px] text-gray-400 italic">
                      Źródło: "{fact.sourceText}"
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleDelete(fact.id)}
                  title="Usuń ten fakt"
                  className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Info footer */}
        <div className="bg-[#151e2e] border-t border-[#2d3748] p-3 text-[11px] text-gray-400 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
            <span>Fakty są automatycznie dołączane do kontekstu każdego zapytania AI.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
