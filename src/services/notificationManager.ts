import { AndroidNotification } from '../types';
import { soundAndHaptics } from './soundAndHaptics';
import { ttsManager } from './ttsManager';

const NOTIFICATIONS_STORAGE_KEY = 'cogni_android_notifications';

const DEFAULT_NOTIFICATIONS: AndroidNotification[] = [
  {
    id: 'notif-1',
    packageName: 'com.whatsapp',
    appName: 'WhatsApp',
    title: 'Kasia Kowalska',
    body: 'Cześć! O której godzinie dzisiaj wychodzimy na spotkanie w centrum?',
    timestamp: Date.now() - 1000 * 60 * 12,
    isRead: false,
    category: 'message',
    smartReplies: ['Będę gotowy o 18:00.', 'Wychodzę za 15 minut!', 'Napiszę jak wsiądę do auta.']
  },
  {
    id: 'notif-2',
    packageName: 'pl.inpost.inmobile',
    appName: 'InPost Paczkomaty',
    title: 'Paczka czeka na odbiór',
    body: 'Paczka czeka w paczkomacie WAW44A. Kod odbioru: 829410. Masz 48h na odebranie.',
    timestamp: Date.now() - 1000 * 60 * 45,
    isRead: false,
    category: 'system',
    smartReplies: ['Odbiorę dzisiaj po pracy.', 'Zapisz kod w notatkach.', 'Udostępnij kod odbioru.']
  },
  {
    id: 'notif-3',
    packageName: 'com.google.android.gm',
    appName: 'Gmail',
    title: 'Raport tygodniowy AI Studio',
    body: 'Twój raport wydajności NPU Kirin 980 jest gotowy. Oszczędzono 85% energii baterii.',
    timestamp: Date.now() - 1000 * 60 * 180,
    isRead: true,
    category: 'email',
    smartReplies: ['Dziękuję za raport.', 'Pobierz podsumowanie PDF.', 'Archiwizuj wiadomość.']
  },
  {
    id: 'notif-4',
    packageName: 'com.slack',
    appName: 'Slack',
    title: '#projekt-kirin-ai',
    body: 'Marek: Kompilacja modelu Gemma 2B INT4 pod MediaPipe zakończona sukcesem!',
    timestamp: Date.now() - 1000 * 60 * 240,
    isRead: true,
    category: 'social',
    smartReplies: ['Świetna robota!', 'Testuję na urządzeniu.', 'Wdrażamy do asystenta.']
  }
];

class NotificationManager {
  private notifications: AndroidNotification[] = [];
  private listeners: ((notifications: AndroidNotification[], unreadCount: number) => void)[] = [];

  constructor() {
    this.notifications = this.loadNotifications();
  }

  private loadNotifications(): AndroidNotification[] {
    try {
      const data = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load notifications', e);
    }
    return [...DEFAULT_NOTIFICATIONS];
  }

  private saveNotifications() {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(this.notifications));
      this.notify();
    } catch (e) {
      console.error('Failed to save notifications', e);
    }
  }

  private notify() {
    const unread = this.getUnreadCount();
    this.listeners.forEach((l) => l([...this.notifications], unread));
  }

  subscribe(listener: (notifications: AndroidNotification[], unreadCount: number) => void): () => void {
    this.listeners.push(listener);
    listener([...this.notifications], this.getUnreadCount());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  getNotifications(): AndroidNotification[] {
    return [...this.notifications];
  }

  getUnreadCount(): number {
    return this.notifications.filter((n) => !n.isRead).length;
  }

  markAsRead(id: string) {
    const notif = this.notifications.find((n) => n.id === id);
    if (notif && !notif.isRead) {
      notif.isRead = true;
      this.saveNotifications();
    }
  }

  markAllAsRead() {
    this.notifications.forEach((n) => (n.isRead = true));
    this.saveNotifications();
  }

  dismissNotification(id: string) {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.saveNotifications();
  }

  sendReply(id: string, replyText: string): boolean {
    const notif = this.notifications.find((n) => n.id === id);
    if (!notif) return false;

    notif.isRead = true;
    notif.repliedText = replyText;
    this.saveNotifications();

    soundAndHaptics.playSuccessChime();
    ttsManager.speak(`Wysłano szybką odpowiedź do ${notif.title}: "${replyText}".`);
    return true;
  }

  addIncomingNotification(
    appName: string,
    title: string,
    body: string,
    packageName = 'com.android.mms',
    category: AndroidNotification['category'] = 'message'
  ): AndroidNotification {
    const smartReplies = this.generateSmartReplies(body);
    const newNotif: AndroidNotification = {
      id: `notif-${Date.now()}`,
      packageName,
      appName,
      title,
      body,
      timestamp: Date.now(),
      isRead: false,
      category,
      smartReplies
    };

    this.notifications = [newNotif, ...this.notifications];
    this.saveNotifications();

    soundAndHaptics.playNotificationPing();
    return newNotif;
  }

  generateSmartReplies(text: string): string[] {
    const lower = text.toLowerCase();

    if (lower.includes('o której') || lower.includes('kiedy') || lower.includes('godzin')) {
      return ['Około godziny 18:00.', 'Daj mi 15 minut.', 'Napiszę jak będę gotowy.'];
    }
    if (lower.includes('gdzie') || lower.includes('miejsce') || lower.includes('adres')) {
      return ['Jestem na miejscu.', 'Już dojeżdżam!', 'Wyślij mi pinezkę.'];
    }
    if (lower.includes('paczka') || lower.includes('kod') || lower.includes('kurier')) {
      return ['Dziękuję, odbiorę dzisiaj!', 'Kod zapisany.', 'Dzięki za informację.'];
    }
    if (lower.includes('dzięki') || lower.includes('dzieki') || lower.includes('super')) {
      return ['Nie ma za co!', 'Do usług 😊', 'Super, cieszę się!'];
    }
    if (lower.includes('sukces') || lower.includes('gotow') || lower.includes('zrobion')) {
      return ['Świetna robota!', 'Dzięki za update!', 'Super, sprawdzam.'];
    }

    return ['Jasne, rozumiem.', 'Zajmę się tym za chwilę.', 'Okej, dzięki!'];
  }

  readNotificationsSummary(): string {
    const unread = this.notifications.filter((n) => !n.isRead);
    if (unread.length === 0) {
      const msg = 'Nie masz żadnych nowych powiadomień. Wszystkie wiadomości zostały przeczytane.';
      ttsManager.speak(msg);
      return msg;
    }

    const details = unread
      .slice(0, 3)
      .map((n, i) => `${i + 1}. Od ${n.title} w aplikacji ${n.appName}: ${n.body}`)
      .join('. ');

    const fullMsg = `Masz ${unread.length} ${unread.length === 1 ? 'nieprzeczytane powiadomienie' : 'nieprzeczytane powiadomienia'}. ${details}`;
    ttsManager.speak(fullMsg);
    return fullMsg;
  }
}

export const notificationManager = new NotificationManager();
