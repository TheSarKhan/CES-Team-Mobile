// Web (iPhone PWA + kompüter): Web Push. Abunə YALNIZ istifadəçi düyməyə toxunanda soruşulur (iOS tələbi).
import { devicesApi } from '../api/endpoints';

let currentToken = null;
export const getCurrentPushToken = () => currentToken;
export const setActiveConversation = () => {};

const supported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const pushState = () => {
  if (!supported()) return 'unsupported';
  return Notification.permission; // default | granted | denied
};

// iOS-da push yalnız ana ekrana əlavə edilmiş tətbiqdə işləyir
export const isIOS = () => typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true);

function b64ToUint8(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

async function subscribeAndRegister() {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    const key = await devicesApi.vapidKey();
    if (!key) throw new Error('Serverdə push açarı qurulmayıb');
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(key) });
  }
  const j = sub.toJSON();
  currentToken = sub.endpoint;
  await devicesApi.register({
    kind: 'WEB', token: sub.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth, userAgent: navigator.userAgent.slice(0, 250),
  });
}

/** İcazə artıq verilibsə səssiz yenilə (hər girişdə). */
export async function registerForPushNotificationsAsync() {
  try {
    if (!supported() || Notification.permission !== 'granted') return null;
    await subscribeAndRegister();
    return currentToken;
  } catch (e) {
    console.warn('[push] web abunə alınmadı:', e?.message);
    return null;
  }
}

/** "Bildirişləri aç" düyməsi: icazə soruş + abunə ol. */
export async function enableWebPush() {
  if (!supported()) throw new Error('Bu brauzer bildirişləri dəstəkləmir');
  const res = await Notification.requestPermission();
  if (res !== 'granted') throw new Error('Bildiriş icazəsi verilmədi');
  await subscribeAndRegister();
}

export function onNotificationOpened(handler) {
  // service worker tətbiqi açanda postMessage göndərir
  const fn = (e) => { if (e.data?.type === 'open-conversation') handler(e.data); };
  navigator.serviceWorker?.addEventListener('message', fn);
  const qs = new URLSearchParams(window.location.search);
  // bildirişdən soyuq açılış (/chats?c=… və ya /cards?c=…): həmin söhbət/kart açılsın
  if (qs.get('c') && window.location.pathname.startsWith('/chats')) handler({ conversationId: qs.get('c'), messageId: qs.get('m') });
  if (qs.get('c') && window.location.pathname.startsWith('/cards')) handler({ cardId: qs.get('c') });
  return () => navigator.serviceWorker?.removeEventListener('message', fn);
}
