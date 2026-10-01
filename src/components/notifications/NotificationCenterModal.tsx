import React, { useState, useEffect } from 'react';
import {
  Bell,
  X,
  Volume2,
  Check,
  Send,
  Trash2,
  Plus,
  MessageSquare,
  Mail,
  ShieldAlert,
  Share2,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { AndroidNotification } from '../../types';
import { notificationManager } from '../../services/notificationManager';
import { soundAndHaptics } from '../../services/soundAndHaptics';

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose
}) => {
  const [notifications, setNotifications] = useState<AndroidNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [customReplyText, setCustomReplyText] = useState<{ [id: string]: string }>({});
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [showSimulateForm, setShowSimulateForm] = useState(false);

  // New simulated notif inputs
  const [simApp, setSimApp] = useState('WhatsApp');
  const [simTitle, setSimTitle] = useState('Tomasz Nowak');
  const [simBody, setSimBody] = useState('Cześć, wyślesz mi dokumenty do projektu?');

  useEffect(() => {
    const unsub = notificationManager.subscribe((notifs, unread) => {
      setNotifications(notifs);
      setUnreadCount(unread);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  const handleSendSmartReply = (notifId: string, reply: string) => {
    notificationManager.sendReply(notifId, reply);
    setActiveReplyId(null);
  };

  const handleCustomReplySubmit = (notifId: string) => {
    const text = customReplyText[notifId]?.trim();
    if (text) {
      notificationManager.sendReply(notifId, text);
      setCustomReplyText((prev) => ({ ...prev, [notifId]: '' }));
      setActiveReplyId(null);
    }
  };

  const handleSimulateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (simTitle.trim() && simBody.trim()) {
      notificationManager.addIncomingNotification(
        simApp,
        simTitle.trim(),
        simBody.trim(),
        simApp === 'WhatsApp' ? 'com.whatsapp' : simApp === 'Gmail' ? 'com.google.android.gm' : 'com.android.mms'
      );
      setShowSimulateForm(false);
      setSimBody('');
    }
  };

  const getCategoryIcon = (category: AndroidNotification['category'], appName: string) => {
    if (appName.toLowerCase().includes('mail') || category === 'email') {
      return <Mail className="w-4 h-4 text-amber-400" />;
    }
    if (appName.toLowerCase().includes('inpost') || category === 'system') {
      return <ShieldAlert className="w-4 h-4 text-emerald-400" />;
    }
    return <MessageSquare className="w-4 h-4 text-[#00e5ff]" />;
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#121824] border border-[#2d3748] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="bg-[#151e2e] border-b border-[#2d3748] p-3.5 sm:p-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00e5ff] to-[#8b5cf6] p-0.5 shadow-[0_0_15px_rgba(0,229,255,0.4)] shrink-0">
              <div className="w-full h-full bg-[#121824] rounded-[10px] flex items-center justify-center">
                <Bell className="w-5 h-5 text-[#00e5ff]" />
              </div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
                  Centrum Powiadomień Android
                </h2>
                {unreadCount > 0 ? (
                  <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                    {unreadCount} nowe
                  </span>
                ) : (
                  <span className="bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Wszystkie przeczytane
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                NotificationListenerService • Inteligentne odpowiedzi (Smart Reply)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => notificationManager.readNotificationsSummary()}
              title="Odczytaj powiadomienia na głos (TTS)"
              className="p-2 rounded-xl bg-[#00e5ff]/15 hover:bg-[#00e5ff]/25 text-[#00e5ff] border border-[#00e5ff]/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Volume2 className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Odczytaj</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="bg-[#0e141f] border-b border-[#2d3748] px-4 py-2.5 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => notificationManager.markAllAsRead()}
              className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <Check className="w-3.5 h-3.5 text-[#10b981]" />
              <span>Oznacz jako przeczytane</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowSimulateForm(!showSimulateForm)}
            className="text-xs text-[#00e5ff] hover:underline flex items-center gap-1 font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Symuluj powiadomienie</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3">
          {/* Simulated Notification Form */}
          {showSimulateForm && (
            <form
              onSubmit={handleSimulateSubmit}
              className="bg-[#152033] border border-[#00e5ff]/30 rounded-2xl p-3.5 space-y-3 animate-fadeIn"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#00e5ff] flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  Symulator przychodzącego powiadomienia
                </span>
                <button
                  type="button"
                  onClick={() => setShowSimulateForm(false)}
                  className="text-gray-400 hover:text-white text-xs"
                >
                  Anuluj
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Aplikacja źródłowa:</label>
                  <select
                    value={simApp}
                    onChange={(e) => setSimApp(e.target.value)}
                    className="w-full bg-[#0a0e14] border border-[#2d3748] rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#00e5ff]"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="SMS / Wiadomości">SMS / Wiadomości</option>
                    <option value="Gmail">Gmail</option>
                    <option value="Slack">Slack</option>
                    <option value="InPost Paczkomaty">InPost Paczkomaty</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Nadawca / Tytuł:</label>
                  <input
                    type="text"
                    value={simTitle}
                    onChange={(e) => setSimTitle(e.target.value)}
                    placeholder="Np. Jan Kowalski"
                    className="w-full bg-[#0a0e14] border border-[#2d3748] rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#00e5ff]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Treść wiadomości:</label>
                <input
                  type="text"
                  value={simBody}
                  onChange={(e) => setSimBody(e.target.value)}
                  placeholder="Wpisz treść..."
                  className="w-full bg-[#0a0e14] border border-[#2d3748] rounded-xl px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#00e5ff]"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="py-1.5 px-4 bg-gradient-to-r from-[#00e5ff] to-[#8b5cf6] text-black font-extrabold text-xs rounded-xl hover:opacity-95 transition-all shadow-md"
                >
                  Wyślij do asystenta
                </button>
              </div>
            </form>
          )}

          {/* Notifications List */}
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-gray-400 space-y-2">
              <Bell className="w-10 h-10 mx-auto text-gray-600 opacity-50" />
              <p className="text-sm">Brak powiadomień w kolejce</p>
              <p className="text-xs text-gray-500">Wszystkie powiadomienia zostały obsłużone lub usunięte.</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`rounded-2xl p-3.5 border transition-all space-y-2.5 ${
                  notif.isRead
                    ? 'bg-[#0a0e14]/60 border-[#2d3748]/60 opacity-90'
                    : 'bg-[#152033] border-[#00e5ff]/40 shadow-[0_0_15px_rgba(0,229,255,0.15)]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#1e2638] flex items-center justify-center shrink-0 border border-white/5">
                      {getCategoryIcon(notif.category, notif.appName)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-gray-300 font-mono">
                          {notif.appName}
                        </span>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#00e5ff] shadow-[0_0_8px_#00e5ff]" />
                        )}
                      </div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-white truncate">
                        {notif.title}
                      </h4>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-gray-400">
                      {new Date(notif.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <button
                      type="button"
                      onClick={() => notificationManager.dismissNotification(notif.id)}
                      title="Usuń powiadomienie"
                      className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-200 leading-relaxed break-words bg-[#0a0e14]/40 p-2.5 rounded-xl border border-white/5">
                  {notif.body}
                </p>

                {/* Sent reply indicator */}
                {notif.repliedText && (
                  <div className="flex items-center gap-2 text-xs text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/30 p-2 rounded-xl font-medium">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Wysłano: "{notif.repliedText}"</span>
                  </div>
                )}

                {/* Smart Replies Suggestions */}
                {notif.smartReplies && notif.smartReplies.length > 0 && !notif.repliedText && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-1.5 text-[10px] text-[#00e5ff] font-bold uppercase tracking-wider">
                      <Sparkles className="w-3 h-3" />
                      <span>Szybkie odpowiedzi SLM (Smart Reply):</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {notif.smartReplies.map((reply, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendSmartReply(notif.id, reply)}
                          className="px-2.5 py-1 rounded-xl bg-[#00e5ff]/15 hover:bg-[#00e5ff]/25 text-[#00e5ff] border border-[#00e5ff]/35 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] text-left"
                        >
                          {reply}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() =>
                          setActiveReplyId(activeReplyId === notif.id ? null : notif.id)
                        }
                        className="px-2.5 py-1 rounded-xl bg-[#1e2638] hover:bg-[#2d3748] text-gray-300 border border-white/10 text-xs transition-colors"
                      >
                        Własna...
                      </button>
                    </div>
                  </div>
                )}

                {/* Custom reply input */}
                {activeReplyId === notif.id && !notif.repliedText && (
                  <div className="flex items-center gap-2 pt-1 animate-fadeIn">
                    <input
                      type="text"
                      value={customReplyText[notif.id] || ''}
                      onChange={(e) =>
                        setCustomReplyText({ ...customReplyText, [notif.id]: e.target.value })
                      }
                      onKeyDown={(e) => e.key === 'Enter' && handleCustomReplySubmit(notif.id)}
                      placeholder="Napisz odpowiedź..."
                      className="flex-1 bg-[#0a0e14] border border-[#00e5ff]/40 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleCustomReplySubmit(notif.id)}
                      className="p-2 rounded-xl bg-[#00e5ff] text-black font-bold text-xs hover:bg-[#00b4d8] transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
