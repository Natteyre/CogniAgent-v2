import { ChatMessage, ChatSession } from '../types';
import { storage } from './storage';

const SESSIONS_STORAGE_KEY = 'cogni_chat_sessions';
const ACTIVE_SESSION_STORAGE_KEY = 'cogni_active_session_id';
const DEFAULT_SESSION_ID = 'session-default';

class SessionManager {
  private sessions: ChatSession[] = [];
  private activeSessionId: string = DEFAULT_SESSION_ID;
  private listeners: ((sessions: ChatSession[], activeId: string) => void)[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      const data = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (data) {
        this.sessions = JSON.parse(data);
      } else {
        // Initial session with existing legacy messages if any
        const legacyMessages = storage.getMessages();
        this.sessions = [
          {
            id: DEFAULT_SESSION_ID,
            title: 'Główny asystent',
            createdAt: Date.now() - 3600000,
            updatedAt: Date.now(),
            messageCount: legacyMessages.length
          }
        ];
        this.saveSessions();
      }

      const activeId = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
      if (activeId && this.sessions.some((s) => s.id === activeId)) {
        this.activeSessionId = activeId;
      } else if (this.sessions.length > 0) {
        this.activeSessionId = this.sessions[0].id;
      }
    } catch (e) {
      console.error('Failed to init SessionManager', e);
    }
  }

  private saveSessions() {
    try {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(this.sessions));
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, this.activeSessionId);
      this.notify();
    } catch (e) {
      console.error('Failed to save sessions', e);
    }
  }

  private notify() {
    this.listeners.forEach((l) => l([...this.sessions], this.activeSessionId));
  }

  subscribe(listener: (sessions: ChatSession[], activeId: string) => void): () => void {
    this.listeners.push(listener);
    listener([...this.sessions], this.activeSessionId);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  getSessions(): ChatSession[] {
    return [...this.sessions];
  }

  getActiveSessionId(): string {
    return this.activeSessionId;
  }

  getActiveSession(): ChatSession | undefined {
    return this.sessions.find((s) => s.id === this.activeSessionId) || this.sessions[0];
  }

  setActiveSession(id: string) {
    if (this.sessions.some((s) => s.id === id)) {
      this.activeSessionId = id;
      localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, id);
      this.notify();
    }
  }

  createSession(title?: string): ChatSession {
    const id = `session-${Date.now()}`;
    const newSession: ChatSession = {
      id,
      title: title?.trim() || `Wątek ${this.sessions.length + 1}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 1
    };

    // Initialize with welcome message
    const welcomeMsg: ChatMessage = {
      id: 1,
      text: 'Rozpoczęto nową sesję konwersacji. W czym mogę pomóc?',
      isUser: false,
      timestamp: Date.now(),
      sessionId: id
    };

    this.saveMessages(id, [welcomeMsg]);

    this.sessions = [newSession, ...this.sessions];
    this.activeSessionId = id;
    this.saveSessions();
    return newSession;
  }

  renameSession(id: string, newTitle: string) {
    const session = this.sessions.find((s) => s.id === id);
    if (session && newTitle.trim()) {
      session.title = newTitle.trim();
      session.updatedAt = Date.now();
      this.saveSessions();
    }
  }

  deleteSession(id: string) {
    if (this.sessions.length <= 1) return; // Keep at least one
    this.sessions = this.sessions.filter((s) => s.id !== id);
    try {
      localStorage.removeItem(`cogni_session_messages_${id}`);
    } catch {}

    if (this.activeSessionId === id) {
      this.activeSessionId = this.sessions[0].id;
    }
    this.saveSessions();
  }

  getMessages(sessionId: string): ChatMessage[] {
    try {
      if (sessionId === DEFAULT_SESSION_ID) {
        // Fallback / legacy support
        const legacyData = localStorage.getItem(`cogni_session_messages_${sessionId}`) || localStorage.getItem('cogni_messages');
        if (legacyData) return JSON.parse(legacyData);
      }
      const data = localStorage.getItem(`cogni_session_messages_${sessionId}`);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveMessages(sessionId: string, messages: ChatMessage[]) {
    try {
      localStorage.setItem(`cogni_session_messages_${sessionId}`, JSON.stringify(messages));
      if (sessionId === DEFAULT_SESSION_ID) {
        localStorage.setItem('cogni_messages', JSON.stringify(messages));
      }

      // Update message count in session entity
      const s = this.sessions.find((sess) => sess.id === sessionId);
      if (s) {
        s.messageCount = messages.length;
        s.updatedAt = Date.now();
        localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(this.sessions));
      }
    } catch (e) {
      console.error('Failed to save session messages', e);
    }
  }

  exportSessionMarkdown(sessionId: string): string {
    const s = this.sessions.find((sess) => sess.id === sessionId);
    const msgs = this.getMessages(sessionId);
    const title = s ? s.title : 'Eksport Czatu CogniAgent';

    let md = `# ${title}\n`;
    md += `*Data eksportu: ${new Date().toLocaleString('pl-PL')}*\n\n---\n\n`;

    msgs.forEach((m) => {
      const author = m.isUser ? '👤 **Użytkownik**' : '🤖 **CogniAgent v2**';
      const time = new Date(m.timestamp).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' });
      md += `### ${author} [${time}]\n\n${m.text}\n\n`;
      if (m.toolInvocation) {
        md += `> ⚙️ *Akcja narzędziowa: ${m.toolInvocation}*\n\n`;
      }
      md += `---\n\n`;
    });

    return md;
  }

  exportSessionJson(sessionId: string): string {
    const s = this.sessions.find((sess) => sess.id === sessionId);
    const msgs = this.getMessages(sessionId);
    return JSON.stringify({
      session: s,
      exportedAt: Date.now(),
      messages: msgs
    }, null, 2);
  }

  searchMessages(query: string): { sessionId: string; sessionTitle: string; message: ChatMessage }[] {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    const results: { sessionId: string; sessionTitle: string; message: ChatMessage }[] = [];

    this.sessions.forEach((s) => {
      const msgs = this.getMessages(s.id);
      msgs.forEach((m) => {
        if (m.text.toLowerCase().includes(trimmed)) {
          results.push({
            sessionId: s.id,
            sessionTitle: s.title,
            message: m
          });
        }
      });
    });

    return results;
  }
}

export const sessionManager = new SessionManager();
