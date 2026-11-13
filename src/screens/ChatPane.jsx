import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, Pressable, Platform, Linking, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { ArrowLeft, Pin, CornerUpLeft, Copy, Pencil, Trash2, BellOff } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Avatar } from '../components/Avatar';
import { MessageBubble } from '../components/MessageBubble';
import { Composer } from '../components/Composer';
import { ActionSheet } from '../components/ActionSheet';
import { ImageViewer } from '../components/ImageViewer';
import { ProfileSheet } from '../components/ProfileSheet';
import { InfoDialog } from './InfoDialog';
import { FadeIn, TypingDots } from '../components/motion';
import { Empty } from '../components/ui';
import { CardMessage } from '../components/CardParts';
import { CardForm } from './CardForm';
import { useRouter } from 'expo-router';
import { useLayout } from '../lib/useLayout';
import { chatApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { useAuthStore } from '../store/auth';
import { setActiveConversation } from '../lib/push';
import { dayLabel, messagePreview } from '../lib/format';
import { qk, useConversation, useConversations, useMembers, useMessages, useTyping, useActiveChat, upsertMessage, loadOlder } from '../hooks/useChat';

const REACTIONS = ['👍', '✅', '❤️', '😂', '🙏', '❗'];
const dayKey = (iso) => new Date(iso).toDateString();

export function ChatPane({ id, onBack, embedded = false }) {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const me = useAuthStore((s) => s.user);
  const convsQ = useConversations();
  const listed = convsQ.data?.find((c) => String(c.id) === String(id));
  const convQ = useConversation(id, !listed && !convsQ.isLoading); // kart müzakirəsi kimi siyahıda olmayanlar
  const conv = listed ?? convQ.data;
  const router = useRouter();
  const { isWide } = useLayout();
  const [cardForm, setCardForm] = useState(false);
  const openCard = (cid) => (isWide ? router.navigate(`/cards?c=${cid}`) : router.push(`/card/${cid}`));
  const msgsQ = useMessages(id);
  const membersQ = useMembers(id);
  const members = membersQ.data;
  const typingMap = useTyping((s) => s.map[id]);
  const [now, setNow] = useState(Date.now());
  const [replyTo, setReplyTo] = useState(null);
  const [editing, setEditing] = useState(null);
  const [sheet, setSheet] = useState(null);
  const [viewer, setViewer] = useState(null);
  const [info, setInfo] = useState(false); // kompüterdə məlumat pəncərəsi (söhbət arxada görünür)
  const [profile, setProfile] = useState(null); // {id, fullName, avatarUrl}
  const [toast, setToast] = useState(null);
  const listRef = useRef(null);

  // açıq söhbət: push banneri və oxunmamış sayı üçün
  useEffect(() => {
    useActiveChat.getState().set(id);
    setActiveConversation(id);
    return () => { useActiveChat.getState().set(null); setActiveConversation(null); };
  }, [id]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 2000); return () => clearInterval(t); }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t); } }, [toast]);

  const messages = msgsQ.data?.list ?? [];
  // Açılışda gələn və yuxarı sürüşdürəndə yüklənən tarixçə animasiyasız; yeni mesajlar animasiyalı görünür
  const seen = useRef(null);
  if (seen.current === null && msgsQ.data) seen.current = { maxId: messages.reduce((x, m) => Math.max(x, m.id), 0) };
  const lastServerId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].id > 0 && !messages[i].pending) return messages[i].id;
    return 0;
  }, [messages]);

  // oxundu: açıq söhbətə yeni mesaj gələndə də
  const lastReadSent = useRef(0);
  useEffect(() => {
    if (!lastServerId || lastServerId <= lastReadSent.current) return;
    if (conv && conv.unreadCount === 0 && conv.lastReadMessageId >= lastServerId) { lastReadSent.current = lastServerId; return; }
    lastReadSent.current = lastServerId;
    chatApi.read(id, lastServerId).catch(() => {});
    qc.setQueryData(qk.conversations, (l) => l && l.map((c) => (String(c.id) === String(id)
      ? { ...c, unreadCount: 0, unreadMentions: 0, lastReadMessageId: Math.max(c.lastReadMessageId, lastServerId) } : c)));
  }, [lastServerId, conv, id, qc]);

  const myId = me?.id;
  const memberById = useMemo(() => Object.fromEntries((members || []).map((m) => [m.user.id, m])), [members]);

  const statusOf = useCallback((m) => {
    if (m.pending) return 'pending';
    if (m.failed) return 'failed';
    const others = (members || []).filter((x) => x.user.id !== myId);
    if (!others.length) return 'sent';
    const read = others.filter((x) => x.lastReadMessageId >= m.id).length;
    return read === 0 ? 'sent' : read === others.length ? 'read-all' : 'read-some';
  }, [members, myId]);

  // Yeni → köhnə sıra (inverted siyahı) + gün ayırıcıları
  const items = useMemo(() => {
    const out = [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      const prev = messages[i - 1];
      const next = messages[i + 1];
      // Eyni göndərənin ardıcıl mesajları bir seriyadır: ad seriyanın əvvəlində, şəkil sonunda görünür
      const sameRun = (a, b) => a && b && a.type !== 'SYSTEM' && a.type !== 'CARD' && b.type !== 'SYSTEM' && b.type !== 'CARD'
        && a.sender?.id === b.sender?.id && dayKey(a.createdAt) === dayKey(b.createdAt);
      out.push({ key: `m${m.clientId || m.id}`, type: 'msg', m, fresh: !!seen.current && (m.id < 0 || m.id > seen.current.maxId), first: !sameRun(prev, m), last: !sameRun(m, next) });
      if (!prev || dayKey(prev.createdAt) !== dayKey(m.createdAt)) out.push({ key: `d${m.id}`, type: 'day', label: dayLabel(m.createdAt) });
    }
    return out;
  }, [messages]);

  const isGroup = conv?.type === 'GROUP';
  const showSender = conv?.type !== 'DIRECT';
  const openProfile = (u) => u?.id && setProfile(u);
  const messageUser = async (uid) => {
    const c = await chatApi.openDirect(uid);
    qc.invalidateQueries({ queryKey: qk.conversations });
    setProfile(null);
    router.navigate(isWide ? `/chats?c=${c.id}` : `/chat/${c.id}`);
  };
  const typingNames = Object.entries(typingMap || {})
    .filter(([uid, ts]) => Number(uid) !== myId && now - ts < 4000)
    .map(([uid]) => memberById[uid]?.user.fullName?.split(' ')[0]).filter(Boolean);

  // ── göndərmə ──
  const send = async ({ text, attachmentIds = [], attachments = [], mentionIds = [], clientId: existing, reply }) => {
    const clientId = existing || `${myId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const replyRef = reply === undefined ? replyTo : reply;
    const body = { clientId, text: text || null, replyToId: replyRef?.id ?? null, attachmentIds, mentionIds };
    const temp = {
      id: -Date.now(), clientId, conversationId: Number(id), type: attachments.length ? 'MEDIA' : 'TEXT', sender: { id: myId, fullName: me?.fullName },
      text, replyTo: replyRef ? { id: replyRef.id, sender: replyRef.sender, text: replyRef.text, deleted: false } : null,
      attachments: attachments.map((a) => a.server), reactions: [], mentionIds, createdAt: new Date().toISOString(), pending: true, _body: body,
    };
    upsertMessage(qc, temp);
    setReplyTo(null);
    try {
      const saved = await chatApi.send(id, body);
      upsertMessage(qc, saved);
    } catch (e) {
      upsertMessage(qc, { ...temp, pending: false, failed: true });
      setToast(errorMessage(e, 'Mesaj göndərilmədi'));
    }
  };

  const retry = (m) => {
    if (!m._body) return;
    send({ text: m._body.text, attachmentIds: m._body.attachmentIds, attachments: (m.attachments || []).map((s) => ({ server: s })), mentionIds: m._body.mentionIds, clientId: m.clientId, reply: m.replyTo });
  };

  const doEdit = async (text) => {
    const target = editing;
    setEditing(null);
    try { upsertMessage(qc, await chatApi.edit(target.id, text)); } catch (e) { setToast(errorMessage(e)); }
  };

  const react = async (m, emoji) => {
    try { upsertMessage(qc, await chatApi.react(m.id, emoji)); } catch (e) { setToast(errorMessage(e)); }
  };

  const openActions = (m) => {
    if (m.pending || m.failed || m.id < 0) return;
    setSheet(m);
  };

  const sheetActions = (m) => {
    if (!m) return [];
    const mine = m.sender?.id === myId;
    const canDelete = mine || me?.admin || conv?.myRole === 'ADMIN';
    const pinned = conv?.pinnedMessage?.id === m.id;
    return [
      { label: 'Cavab ver', icon: <CornerUpLeft size={21} color={colors.brand} />, onPress: () => { setEditing(null); setReplyTo(m); } },
      ...(m.text ? [{ label: 'Kopyala', icon: <Copy size={21} color={colors.brand} />, onPress: () => { Clipboard.setStringAsync(m.text); setToast('Kopyalandı'); } }] : []),
      ...(mine && m.text ? [{ label: 'Redaktə et', icon: <Pencil size={21} color={colors.brand} />, onPress: () => { setReplyTo(null); setEditing(m); } }] : []),
      { label: pinned ? 'Sabitləməni götür' : 'Sabitlə', icon: <Pin size={21} color={colors.brand} />, onPress: () => chatApi.pin(id, pinned ? null : m.id).catch((e) => setToast(errorMessage(e))) },
      ...(canDelete ? [{ label: 'Sil', danger: true, icon: <Trash2 size={21} color={colors.red} />, onPress: () => chatApi.remove(m.id).then((d) => upsertMessage(qc, d)).catch((e) => setToast(errorMessage(e))) }] : []),
    ];
  };

  const jumpTo = (mid) => {
    const idx = items.findIndex((it) => it.type === 'msg' && it.m.id === mid);
    if (idx >= 0) { try { listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 }); } catch { /* ölçülməyib */ } }
  };

  const openFile = (a) => Linking.openURL((a.url.startsWith('http') ? '' : require('../config').config.apiBaseUrl) + a.url);

  const title = conv?.name ?? '…';
  const subtitle = typingNames.length
    ? `${typingNames.join(', ')} yazır…`
    : isGroup ? `${conv?.memberCount ?? ''} üzv` : conv?.otherUser ? '' : '';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.chatBg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Başlıq */}
      {embedded ? null : <View style={{ paddingTop: Platform.OS === 'web' ? 0 : insets.top, backgroundColor: colors.header, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, height: 62 }}>
          {onBack ? <Pressable onPress={onBack} hitSlop={10} accessibilityLabel="Geri"><ArrowLeft size={24} color={colors.headerInk} /></Pressable> : null}
          <Pressable onPress={() => (isWide ? setInfo(true) : router.push(`/info/${id}`))} accessibilityRole="button" accessibilityLabel="Söhbət məlumatları" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Avatar name={title} id={conv?.otherUser?.id ?? conv?.id} uri={conv?.otherUser?.avatarUrl ?? conv?.avatarUrl} size={40} group={isGroup} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: colors.headerInk, fontWeight: '700', fontSize: 17 }}>{title}</Text>
              {typingNames.length ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text numberOfLines={1} style={{ color: colors.brand, fontSize: 12.5, flexShrink: 1 }}>{typingNames.join(', ')} yazır</Text>
                  <TypingDots color={colors.brand} size={4} />
                </View>
              ) : subtitle ? <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12.5 }}>{subtitle}</Text> : null}
            </View>
          </Pressable>
          {conv?.muted ? <BellOff size={18} color={colors.muted} /> : null}
        </View>
        {conv?.pinnedMessage ? (
          <Pressable onPress={() => jumpTo(conv.pinnedMessage.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, height: 46, backgroundColor: colors.brandTint }}>
            <Pin size={16} color={colors.brand} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.brand, fontWeight: '700', fontSize: 12 }}>Sabitlənib</Text>
              <Text numberOfLines={1} style={{ color: colors.ink2, fontSize: 13 }}>{messagePreview(conv.pinnedMessage)}</Text>
            </View>
          </Pressable>
        ) : null}
      </View>}

      {/* Mesajlar */}
      <FlatList
        ref={listRef}
        data={items}
        inverted
        keyExtractor={(it) => it.key}
        contentContainerStyle={{ paddingVertical: 8 }}
        onEndReachedThreshold={0.4}
        onEndReached={() => { if (msgsQ.data?.hasMore) loadOlder(qc, id).catch(() => {}); }}
        onScrollToIndexFailed={() => {}}
        ListEmptyComponent={msgsQ.isLoading ? null : <View style={{ transform: [{ scaleY: -1 }] }}><Empty title="Hələ mesaj yoxdur" sub="İlk mesajı siz yazın" /></View>}
        renderItem={({ item }) => item.type === 'day' ? (
          <View style={{ alignItems: 'center', marginVertical: 10 }}>
            <Text style={{ color: colors.ink2, fontSize: 12.5, fontWeight: '600', backgroundColor: colors.sunk, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12, overflow: 'hidden' }}>{item.label}</Text>
          </View>
        ) : item.m.type === 'CARD' ? (
          <CardMessage message={item.m} onOpen={openCard} />
        ) : (
          <MessageBubble
            message={item.m}
            fresh={item.fresh}
            mine={item.m.sender?.id === myId}
            myId={myId}
            showSender={showSender}
            showName={item.first}
            showAvatar={item.last}
            onOpenProfile={openProfile}
            mentionNames={(item.m.mentionIds || []).map((u) => memberById[u]?.user.fullName).filter(Boolean)}
            status={item.m.sender?.id === myId ? statusOf(item.m) : undefined}
            onLongPress={openActions}
            onOpenImage={(a, all) => setViewer({ images: all, startId: a.id })}
            onOpenFile={openFile}
            onRetry={retry}
            onJumpTo={jumpTo}
            onReact={react}
          />
        )}
      />

      {toast ? (
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: 90, alignItems: 'center' }} pointerEvents="none">
          <FadeIn key={toast} from="bottom" distance={18}>
            <Text style={{ backgroundColor: '#111', color: '#fff', paddingHorizontal: 16, paddingVertical: 9, borderRadius: 18, overflow: 'hidden', fontSize: 13.5 }}>{toast}</Text>
          </FadeIn>
        </View>
      ) : null}

      <View style={{ paddingBottom: Platform.OS === 'web' || embedded ? 0 : insets.bottom }}>
        <Composer
          key={id}
          conversationId={Number(id)}
          members={members}
          myId={myId}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          editing={editing}
          onCancelEdit={() => setEditing(null)}
          onSend={send}
          onEdit={doEdit}
          onError={setToast}
          onCreateCard={isGroup && !embedded ? () => setCardForm(true) : undefined}
        />
      </View>

      <ActionSheet
        visible={!!sheet}
        onClose={() => setSheet(null)}
        actions={sheetActions(sheet)}
        header={sheet ? (
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 12 }}>
            {REACTIONS.map((e) => (
              <Pressable key={e} onPress={() => { const m = sheet; setSheet(null); react(m, e); }} style={({ pressed }) => ({ width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? colors.sunk : colors.surfaceAlt })}>
                <Text style={{ fontSize: 24 }}>{e}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      />
      {viewer ? <ImageViewer images={viewer.images} startId={viewer.startId} onClose={() => setViewer(null)} /> : null}
      {cardForm ? <CardForm groupId={Number(id)} onClose={() => setCardForm(false)} onDone={(cid) => { setCardForm(false); openCard(cid); }} /> : null}
      {info ? <InfoDialog id={id} onClose={() => setInfo(false)} /> : null}
      {profile ? <ProfileSheet userId={profile.id} initial={profile} onClose={() => setProfile(null)} onMessage={messageUser} /> : null}
    </KeyboardAvoidingView>
  );
}
