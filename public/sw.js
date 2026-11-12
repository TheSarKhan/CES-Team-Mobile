// CES Team service worker: Web Push bildirişləri (iPhone PWA + kompüter). Keşləmə yoxdur.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});

// Push: tətbiq pəncərəsi açıq və görünəndə (fokuslu) təkrar bildiriş göstərmə — içəridən görünür.
// iOS yalnız hər push üçün görünən bildiriş göstərilirsə abunəni saxlayır (userVisibleOnly), ona görə
// pəncərə fokusdadırsa belə bildiriş göstərilir ƏGƏR həmin söhbət açıq deyilsə.
self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { title: 'CES Team', body: event.data ? event.data.text() : '' }; }
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const sameChatOpen = wins.some((w) => w.visibilityState === 'visible' && w.focused && w.url.includes(`c=${d.conversationId}`));
    if (sameChatOpen && !d.escalation) return; // iOS-da ardıcıl gizlətmə abunəni ləğv edə bilər — yalnız eyni söhbət açıqdırsa
    await self.registration.showNotification(d.title || 'CES Team', {
      body: d.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: d.tag || undefined,
      renotify: !!d.tag,
      requireInteraction: !!d.mention,
      vibrate: d.mention ? [300, 150, 300] : [200, 100, 200],
      data: d,
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const d = event.notification.data || {};
  const url = d.cardId ? `/cards?c=${d.cardId}` : d.conversationId ? `/chats?c=${d.conversationId}&m=${d.messageId || ''}` : '/';
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const w = wins[0];
    if (w) {
      await w.focus();
      w.postMessage({ type: 'open-conversation', conversationId: d.conversationId, messageId: d.messageId, cardId: d.cardId });
      return;
    }
    await self.clients.openWindow(url);
  })());
});
