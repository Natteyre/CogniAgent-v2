import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Plus,
  X,
  Search,
  Download,
  Edit2,
  Trash2,
  Check,
  FileText,
  Calendar,
  Layers
} from 'lucide-react';
import { ChatSession, ChatMessage } from '../../types';
import { sessionManager } from '../../services/sessionManager';
import { soundAndHaptics } from '../../services/soundAndHaptics';

interface SessionDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionSwitched: (sessionId: string) => void;
}

export const SessionDrawerModal: React.FC<SessionDrawerModalProps> = ({
  isOpen,
  onClose,
  onSessionSwitched
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    { sessionId: string; sessionTitle: string; message: ChatMessage }[]
  >([]);

  useEffect(() => {
    const unsub = sessionManager.subscribe((sessList, actId) => {
      setSessions(sessList);
      setActiveSessionId(actId);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      setSearchResults(sessionManager.searchMessages(searchQuery));
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  if (!isOpen) return null;

  const handleCreateNew = () => {
    const s = sessionManager.createSession();
    onSessionSwitched(s.id);
    soundAndHaptics.playSuccessChime();
    onClose();
  };

  const handleSwitchSession = (id: string) => {
    sessionManager.setActiveSession(id);
    onSessionSwitched(id);
    soundAndHaptics.triggerHaptic(20);
    onClose();
  };

  const handleStartRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSessionId(session.id);
    setEditingTitle(session.title);
  };

  const handleSaveRename = (id: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (editingTitle.trim()) {
      sessionManager.renameSession(id, editingTitle.trim());
      setEditingSessionId(null);
    }
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length <= 1) {
      alert('Nie możesz usunąć jedynego aktywnego wątku.');
      return;
    }
    if (window.confirm('Czy na pewno chcesz usunąć ten wątek rozmowy?')) {
      sessionManager.deleteSession(id);
      soundAndHaptics.triggerHaptic(30);
    }
  };

  const handleExportMarkdown = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const md = sessionManager.exportSessionMarkdown(sessionId);
    const s = sessions.find((sess) => sess.id === sessionId);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CogniAgent_${s?.title.replace(/[\s\W]+/g, '_') || 'czat'}_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    soundAndHaptics.playSuccessChime();
  };

  const handleExportJson = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const json = sessionManager.exportSessionJson(sessionId);
    const s = sessions.find((sess) => sess.id === sessionId);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CogniAgent_${s?.title.replace(/[\s\W]+/g, '_') || 'czat'}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    soundAndHaptics.playSuccessChime();
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#121824] border border-[#2d3748] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="bg-[#151e2e] border-b border-[#2d3748] p-3.5 sm:p-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00e5ff] to-[#8b5cf6] p-0.5 shadow-[0_0_15px_rgba(0,229,255,0.4)] shrink-0">
              <div className="w-full h-full bg-[#121824] rounded-[10px] flex items-center justify-center">
                <Layers className="w-5 h-5 text-[#00e5ff]" />
              </div>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-white tracking-wide flex items-center gap-2">
                <span>Wątki Rozmów (Sesje)</span>
                <span className="bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/30 text-[10px] font-mono px-2 py-0.5 rounded-full">
                  {sessions.length} wątków
                </span>
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                Zarządzaj wieloma sesjami, przeszukuj wiadomości i eksportuj historię
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

        {/* Toolbar & Search */}
        <div className="bg-[#0e141f] border-b border-[#2d3748] p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj we wszystkich wiadomościach..."
              className="w-full bg-[#0a0e14] border border-[#2d3748] focus:border-[#00e5ff] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleCreateNew}
            className="py-1.5 px-3.5 bg-gradient-to-r from-[#00e5ff] to-[#8b5cf6] text-black font-extrabold text-xs rounded-xl hover:opacity-95 transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-md active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span>Nowy wątek</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-2.5">
          {/* Search results view */}
          {searchQuery.trim() ? (
            <div className="space-y-2">
              <div className="text-xs font-bold text-[#00e5ff] flex items-center justify-between">
                <span>Wyniki wyszukiwania dla "{searchQuery}":</span>
                <span className="text-gray-400">{searchResults.length} znalezionych</span>
              </div>

              {searchResults.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">
                  Brak wiadomości pasujących do zapytania.
                </div>
              ) : (
                searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleSwitchSession(item.sessionId)}
                    className="p-3 bg-[#0a0e14] hover:bg-[#152033] border border-white/5 hover:border-[#00e5ff]/40 rounded-xl cursor-pointer transition-all space-y-1"
                  >
                    <div className="flex items-center justify-between text-[10px] text-gray-400">
                      <span className="font-semibold text-[#8b5cf6]">{item.sessionTitle}</span>
                      <span>{item.message.isUser ? 'Użytkownik' : 'CogniAgent'} • {new Date(item.message.timestamp).toLocaleDateString('pl-PL')}</span>
                    </div>
                    <p className="text-xs text-gray-200 line-clamp-2">
                      {item.message.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Sessions list */
            sessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const isEditing = editingSessionId === session.id;

              return (
                <div
                  key={session.id}
                  onClick={() => !isEditing && handleSwitchSession(session.id)}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer ${
                    isActive
                      ? 'bg-[#152033] border-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.15)]'
                      : 'bg-[#0a0e14] border-[#2d3748] hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                        isActive
                          ? 'bg-[#00e5ff]/20 border-[#00e5ff]/50 text-[#00e5ff]'
                          : 'bg-[#1e2638] border-white/5 text-gray-400'
                      }`}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <form
                          onSubmit={(e) => handleSaveRename(session.id, e)}
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            autoFocus
                            className="bg-[#0a0e14] border border-[#00e5ff] rounded-lg px-2.5 py-1 text-xs text-white outline-none w-full"
                          />
                          <button
                            type="submit"
                            className="p-1.5 rounded-lg bg-[#00e5ff] text-black hover:bg-[#00b4d8]"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">
                              {session.title}
                            </h4>
                            {isActive && (
                              <span className="bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0">
                                AKTYWNY
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
                            <span>{session.messageCount} wiadomości</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(session.updatedAt).toLocaleDateString('pl-PL')}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions toolbar */}
                  <div
                    className="flex items-center gap-1 shrink-0 self-end sm:self-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={(e) => handleStartRename(session, e)}
                      title="Zmień nazwę"
                      className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleExportMarkdown(session.id, e)}
                      title="Eksportuj do Markdown (.md)"
                      className="p-1.5 text-gray-400 hover:text-[#00e5ff] hover:bg-[#00e5ff]/10 rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">MD</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleExportJson(session.id, e)}
                      title="Eksportuj do JSON (.json)"
                      className="p-1.5 text-gray-400 hover:text-[#8b5cf6] hover:bg-[#8b5cf6]/10 rounded-lg transition-colors flex items-center gap-1 text-[11px]"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">JSON</span>
                    </button>

                    {sessions.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        title="Usuń wątek"
                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
