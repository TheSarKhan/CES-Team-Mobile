// STOMP (WebSocket) müştərisi. Avtomatik yenidən qoşulur; hər qoşulmada ən son token göndərilir.
import { Client } from '@stomp/stompjs';
import { wsUrl } from '../config';
import { tokenStore } from '../api/tokenStore';
import { refreshAccessToken } from '../api/client';

let client = null;
const listeners = new Set();
const stateListeners = new Set();
let state = 'disconnected'; // connecting | connected | disconnected
let wasConnectedBefore = false;

const setState = (s) => { state = s; stateListeners.forEach((f) => f(s)); };

export const getSocketState = () => state;
export const onSocketState = (f) => { stateListeners.add(f); return () => stateListeners.delete(f); };
/** handler(frame): {type, conversationId, data}. "reconnected" tipli sintetik hadisə: qoşulma bərpa olunub (boşluğu doldur). */
export const onSocketEvent = (f) => { listeners.add(f); return () => listeners.delete(f); };

export function connectSocket() {
  if (client) return;
  client = new Client({
    brokerURL: wsUrl(),
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    // React Native: NULL simvolu olmadan gələn çərçivələr üçün
    appendMissingNULLonIncoming: true,
    forceBinaryWSFrames: true,
    beforeConnect: async () => {
      setState('connecting');
      let t = tokenStore.getAccessToken();
      // vaxtı bitmiş token ilə qoşulmaya çalışmamaq üçün əvvəlcə yenilə
      if (!t || isExpiringSoon(t)) {
        try { t = await refreshAccessToken(); } catch { /* köhnə token ilə cəhd */ }
      }
      client.connectHeaders = { Authorization: `Bearer ${t}` };
    },
    onConnect: () => {
      setState('connected');
      client.subscribe('/user/queue/events', (msg) => {
        try {
          const frame = JSON.parse(msg.body);
          listeners.forEach((f) => f(frame));
        } catch { /* yanlış çərçivə */ }
      });
      if (wasConnectedBefore) listeners.forEach((f) => f({ type: 'reconnected' }));
      wasConnectedBefore = true;
    },
    onWebSocketClose: () => setState('disconnected'),
    onStompError: () => setState('disconnected'),
  });
  client.activate();
}

export function disconnectSocket() {
  const c = client;
  client = null;
  wasConnectedBefore = false;
  setState('disconnected');
  if (c) c.deactivate();
}

export function sendTyping(conversationId) {
  if (client?.connected) client.publish({ destination: '/app/typing', body: JSON.stringify({ conversationId }) });
}

function isExpiringSoon(jwt) {
  try {
    const payload = JSON.parse(atob(jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.exp * 1000 - Date.now() < 60_000;
  } catch {
    return false;
  }
}
