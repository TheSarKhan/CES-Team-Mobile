import { useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, TextInput, Platform, Modal, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, X, Plus, BellOff, AtSign, Users, Check } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Avatar } from '../components/Avatar';
import { Badge, Chip, Empty, Button } from '../components/ui';
import { chatApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { useAuthStore } from '../store/auth';
import { qk, useConversations, useUsers } from '../hooks/useChat';
import { listTime, messagePreview, hhmm } from '../lib/format';
import { FadeIn, PressableScale } from '../components/motion';

function Row({ c, selected, onPress, myId }) {
  const { colors } = useTheme();
  const last = c.lastMessage;
  // Sistem mesajında göndərən yoxdur — prefikssiz; qrupda başqasının mesajı "Ad: ..."
  const system = last?.type === 'SYSTEM';
  const prefix = !last || last.deleted || system ? '' : last.sender?.id === myId ? 'Siz: ' : c.type === 'GROUP' ? `${(last.sender?.fullName || '').split(' ')[0]}: ` : '';
  return (
    <PressableScale onPress={onPress} scaleTo={0.97} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 11, backgroundColor: selected ? colors.brandTint : 'transparent' }}>
      <Avatar name={c.name} id={c.otherUser?.id ?? c.id} uri={c.otherUser?.avatarUrl ?? c.avatarUrl} size={52} group={c.type === 'GROUP'} />
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text numberOfLines={1} style={{ flex: 1, color: colors.ink, fontWeight: '700', fontSize: 16.5 }}>{c.name}</Text>
          <Text style={{ color: c.unreadCount ? colors.brand : colors.faint, fontSize: 12.5, fontWeight: c.unreadCount ? '700' : '400' }}>{listTime(c.lastMessageAt)}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text numberOfLines={1} style={{ flex: 1, color: c.unreadCount ? colors.ink2 : colors.muted, fontSize: 14 }}>
            {last ? `${prefix}${messagePreview(last)}` : 'Hələ mesaj yoxdur'}
          </Text>
          {c.muted ? <BellOff size={15} color={colors.faint} /> : null}
          {c.unreadMentions > 0 ? <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' }}><AtSign size={12} color="#fff" strokeWidth={3} /></View> : null}
          <Badge count={c.unreadCount} tone={c.muted ? 'gray' : 'brand'} />
        </View>
      </View>
    </PressableScale>
  );
}

function NewChat({ onClose, onOpen }) {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const usersQ = useUsers();
  const [mode, setMode] = useState('direct'); // direct | group
  const [name, setName] = useState('');
  const [pick, setPick] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const users = (usersQ.data || []).filter((u) => u.id !== me?.id);

  const openDirect = async (u) => {
    setBusy(true);
    try { const c = await chatApi.openDirect(u.id); qc.invalidateQueries({ queryKey: qk.conversations }); onOpen(c.id); } catch (e) { setErr(errorMessage(e)); setBusy(false); }
  };
  const createGroup = async () => {
    setBusy(true); setErr('');
    try { const c = await chatApi.createGroup({ name, memberIds: pick }); qc.invalidateQueries({ queryKey: qk.conversations }); onOpen(c.id); } catch (e) { setErr(errorMessage(e)); setBusy(false); }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 560, maxHeight: '86%', backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, color: colors.ink, fontWeight: '800', fontSize: 19 }}>{mode === 'direct' ? 'Yeni söhbət' : 'Yeni qrup'}</Text>
            <Pressable onPress={onClose} hitSlop={10}><X size={24} color={colors.muted} /></Pressable>
          </View>
          {me?.admin ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Chip label="Şəxsi" active={mode === 'direct'} onPress={() => setMode('direct')} />
              <Chip label="Qrup" active={mode === 'group'} onPress={() => setMode('group')} />
            </View>
          ) : null}
          {mode === 'group' ? (
            <TextInput value={name} onChangeText={setName} placeholder="Qrup adı" placeholderTextColor={colors.faint} style={[{ height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, color: colors.ink, paddingHorizontal: 14, fontSize: 16 }, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]} />
          ) : null}
          {err ? <Text style={{ color: colors.red }}>{err}</Text> : null}
          <ScrollView style={{ backgroundColor: colors.surface, borderRadius: 14 }}>
            {users.map((u) => {
              const on = pick.includes(u.id);
              return (
                <Pressable key={u.id} disabled={busy} onPress={() => (mode === 'direct' ? openDirect(u) : setPick((p) => (on ? p.filter((x) => x !== u.id) : [...p, u.id])))} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 }}>
                  <Avatar name={u.fullName} id={u.id} uri={u.avatarUrl} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.ink, fontWeight: '600', fontSize: 15.5 }}>{u.fullName}</Text>
                    {u.position || u.department ? <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12.5 }}>{u.position || u.department}</Text> : null}
                  </View>
                  {mode === 'group' ? (
                    <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? colors.brand : colors.line, backgroundColor: on ? colors.brand : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{on ? <Check size={14} color="#fff" /> : null}</View>
                  ) : null}
                </Pressable>
              );
            })}
            {!users.length ? <Text style={{ color: colors.muted, padding: 16 }}>İstifadəçi tapılmadı</Text> : null}
          </ScrollView>
          {mode === 'group' ? <Button loading={busy} disabled={!name.trim() || !pick.length} onPress={createGroup}>Qrup yarat</Button> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Söhbət siyahısı (mobil: tam ekran, web: sol panel). selectedId geniş düzəndə seçilmiş söhbətdir. */
export function ChatList({ selectedId, onOpen }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const me = useAuthStore((s) => s.user);
  const q = useConversations();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [newChat, setNewChat] = useState(false);
  const term = search.trim();

  const hits = useQuery({ queryKey: ['search', term], queryFn: () => chatApi.search(term), enabled: term.length >= 2 });

  const list = useMemo(() => {
    let l = q.data || [];
    if (filter === 'groups') l = l.filter((c) => c.type === 'GROUP');
    if (filter === 'direct') l = l.filter((c) => c.type === 'DIRECT');
    if (filter === 'unread') l = l.filter((c) => c.unreadCount > 0);
    if (term) l = l.filter((c) => c.name?.toLowerCase().includes(term.toLowerCase()));
    return l;
  }, [q.data, filter, term]);

  const totalUnread = (q.data || []).reduce((s, c) => s + c.unreadCount, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <View style={{ paddingTop: Platform.OS === 'web' ? 14 : insets.top + 6, paddingHorizontal: 14, paddingBottom: 8, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ flex: 1, color: colors.headerInk, fontWeight: '800', fontSize: 28 }}>Söhbətlər</Text>
          <Pressable onPress={() => setNewChat(true)} accessibilityLabel="Yeni söhbət" style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }}>
            <Plus size={24} color="#fff" />
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: 22, backgroundColor: colors.sunk, paddingHorizontal: 14 }}>
          <Search size={18} color={colors.faint} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Axtar" placeholderTextColor={colors.faint} style={[{ flex: 1, color: colors.ink, fontSize: 15.5 }, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]} />
          {search ? <Pressable onPress={() => setSearch('')} hitSlop={8}><X size={17} color={colors.muted} /></Pressable> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label="Hamısı" count={totalUnread || undefined} active={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label="Qruplar" active={filter === 'groups'} onPress={() => setFilter('groups')} />
          <Chip label="Şəxsi" active={filter === 'direct'} onPress={() => setFilter('direct')} />
          <Chip label="Oxunmamış" active={filter === 'unread'} onPress={() => setFilter('unread')} />
        </ScrollView>
      </View>

      <FlatList
        data={list}
        keyExtractor={(c) => String(c.id)}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={q.refetch} tintColor={colors.brand} />}
        renderItem={({ item, index }) => {
          const row = <Row c={item} myId={me?.id} selected={String(item.id) === String(selectedId)} onPress={() => onOpen(item.id)} />;
          // siyahı açılanda ilk sətirlər ardıcıl süzülür
          return index < 9 ? <FadeIn delay={index * 55} distance={12}>{row}</FadeIn> : row;
        }}
        ListEmptyComponent={q.isLoading ? null : q.isError ? <Empty title="Yüklənmədi" sub={errorMessage(q.error)} /> : (
          <Empty title={term ? 'Heç nə tapılmadı' : 'Hələ söhbət yoxdur'} sub={term ? undefined : 'Qrup admin tərəfindən sizə əlavə ediləndə burada görünəcək. Və ya + ilə yeni söhbət başladın.'}>
            <Users size={40} color={colors.faint} />
          </Empty>
        )}
        ListFooterComponent={term.length >= 2 && hits.data?.length ? (
          <View>
            <Text style={{ color: colors.muted, fontWeight: '700', fontSize: 12.5, padding: 14, paddingBottom: 4, letterSpacing: 0.4 }}>MESAJLAR</Text>
            {hits.data.map((h) => (
              <Pressable key={h.message.id} onPress={() => onOpen(h.message.conversationId)} style={{ paddingHorizontal: 14, paddingVertical: 9 }}>
                <Text style={{ color: colors.ink, fontWeight: '700' }}>{h.conversationName} · <Text style={{ color: colors.muted, fontWeight: '400' }}>{h.message.sender?.fullName}</Text></Text>
                <Text numberOfLines={2} style={{ color: colors.ink2, fontSize: 14 }}>{h.message.text}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      />
      {newChat ? <NewChat onClose={() => setNewChat(false)} onOpen={(id) => { setNewChat(false); onOpen(id); }} /> : null}
    </View>
  );
}
