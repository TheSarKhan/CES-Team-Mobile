// Söhbət məlumatı (react-query) + real vaxt hadisələrinin keşə tətbiqi.
import { useEffect, useRef } from 'react';
import { create } from 'zustand';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { chatApi, meApi } from '../api/endpoints';
import { connectSocket, disconnectSocket, onSocketEvent } from '../realtime/socket';
import { useAuthStore } from '../store/auth';
import { ck } from './useCards';

export const qk = {
  conversations: ['conversations'],
  messages: (id) => ['messages', String(id)],
  members: (id) => ['members', String(id)],
  users: ['users'],
};

// "yazır…" göstəricisi: { [conversationId]: { [userId]: timestamp } }
export const useTyping = create((set) => ({
  map: {},
  mark: (cid, uid) => set((s) => ({ map: { ...s.map, [cid]: { ...(s.map[cid] || {}), [uid]: Date.now() } } })),
}));

// Açıq söhbət (bildiriş və oxunmamış saymaq üçün)
export const useActiveChat = create((set) => ({ id: null, set: (id) => set({ id: id == null ? null : String(id) }) }));

export const useConversations = () =>
  useQuery({ queryKey: qk.conversations, queryFn: chatApi.conversations, staleTime: 30_000 });

/** Siyahıda olmayan söhbət (məs. kart müzakirəsi) üçün tək-tək yükləmə. */
export const useConversation = (id, enabled) =>
  useQuery({ queryKey: ['conversation', String(id)], queryFn: () => chatApi.conversation(id), enabled: !!enabled && id != null, staleTime: 60_000 });

export const useUsers = () => useQuery({ queryKey: qk.users, queryFn: meApi.users, staleTime: 5 * 60_000 });

export const useUser = (id) => useQuery({ queryKey: ['user', id], queryFn: () => meApi.user(id), enabled: id != null, staleTime: 5 * 60_000 });
export const useMe = (uid) => useQuery({ queryKey: ['me', uid], queryFn: meApi.me, enabled: uid != null, staleTime: 30 * 60_000 });

export const useMembers = (id) =>
  useQuery({ queryKey: qk.members(id), queryFn: () => chatApi.members(id), enabled: id != null, staleTime: 60_000 });

const PAGE = 40;

export function useMessages(id) {
  return useQuery({
    queryKey: qk.messages(id),
    enabled: id != null,
    queryFn: async () => {
      const list = await chatApi.history(id, { limit: PAGE });
      return { list, hasMore: list.length >= PAGE };
    },
    staleTime: 15_000,
  });
}

export async function loadOlder(qc, id) {
  const cur = qc.getQueryData(qk.messages(id));
  const first = cur?.list.find((m) => m.id && !m.pending);
  if (!cur || !first) return;
  const older = await chatApi.history(id, { before: first.id, limit: PAGE });
  qc.setQueryData(qk.messages(id), (c) => c && ({ list: [...older, ...c.list], hasMore: older.length >= PAGE }));
}

/** Mesajı keşdə yerləşdir: clientId və ya id uyğun gələni əvəz et, yoxsa sona əlavə et. */
export function upsertMessage(qc, msg) {
  qc.setQueryData(qk.messages(msg.conversationId), (c) => {
    if (!c) return c; // açılmayıb — açılanda serverdən gələcək
    const list = c.list.slice();
    const i = list.findIndex((m) => m.id === msg.id || (msg.clientId && m.clientId === msg.clientId));
    if (i >= 0) list[i] = msg;
    else list.push(msg);
    return { ...c, list };
  });
}

/** Mesaj siyahısı keşinə baxıb söhbət siyahısındakı son mesajı/oxunmamış sayı yenilə. */
function applyNewMessage(qc, msg, myId, activeId) {
  const mine = msg.sender?.id === myId;
  let known = false;
  qc.setQueryData(qk.conversations, (list) => {
    if (!list) return list;
    const next = list.map((c) => {
      if (c.id !== msg.conversationId) return c;
      known = true;
      const open = String(activeId) === String(c.id);
      return {
        ...c,
        lastMessage: msg,
        lastMessageAt: msg.createdAt,
        unreadCount: mine || open ? c.unreadCount : c.unreadCount + 1,
        unreadMentions: !mine && !open && msg.mentionIds?.includes(myId) ? c.unreadMentions + 1 : c.unreadMentions,
      };
    });
    return next.sort((a, b) => String(b.lastMessageAt || '').localeCompare(String(a.lastMessageAt || '')));
  });
  if (!known) qc.invalidateQueries({ queryKey: qk.conversations });
  upsertMessage(qc, msg);
}

/** (tabs) layout-da bir dəfə qoşulur: socket + keş yenilənməsi. */
export function useRealtimeSync() {
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const myId = me?.id;
  const mark = useTyping((s) => s.mark);
  const myRef = useRef(myId);
  myRef.current = myId;

  useEffect(() => {
    if (!myId) return undefined;
    connectSocket();
    const off = onSocketEvent((f) => {
      const my = myRef.current;
      const active = useActiveChat.getState().id;
      switch (f.type) {
        case 'message.new':
          applyNewMessage(qc, f.data, my, active);
          break;
        case 'message.updated':
          upsertMessage(qc, f.data);
          qc.setQueryData(qk.conversations, (l) => l && l.map((c) => (c.lastMessage?.id === f.data.id ? { ...c, lastMessage: f.data } : c)));
          break;
        case 'read':
          qc.setQueryData(qk.members(f.conversationId), (l) => l && l.map((m) => (m.user.id === f.data.userId ? { ...m, lastReadMessageId: Math.max(m.lastReadMessageId, f.data.messageId) } : m)));
          break;
        case 'conversation.pinned':
          qc.setQueryData(qk.conversations, (l) => l && l.map((c) => (c.id === f.conversationId ? { ...c, pinnedMessage: f.data.pinnedMessage ?? null } : c)));
          break;
        case 'conversation.updated':
          qc.invalidateQueries({ queryKey: qk.conversations });
          qc.invalidateQueries({ queryKey: qk.members(f.conversationId) });
          break;
        case 'card.updated':
          qc.invalidateQueries({ queryKey: ['cards'] });
          qc.invalidateQueries({ queryKey: ck.summary });
          qc.invalidateQueries({ queryKey: ck.card(f.data.id) });
          qc.invalidateQueries({ queryKey: ck.history(f.data.id) });
          break;
        case 'typing':
          mark(f.conversationId, f.data.userId);
          break;
        case 'reconnected':
          // bağlantı qopub — buraxılmış mesajları götür
          qc.invalidateQueries({ queryKey: qk.conversations });
          qc.invalidateQueries({ queryKey: ['messages'] });
          qc.invalidateQueries({ queryKey: ['cards'] });
          qc.invalidateQueries({ queryKey: ck.summary });
          break;
        default:
      }
    });
    return () => { off(); disconnectSocket(); };
  }, [myId, qc, mark]);
}
