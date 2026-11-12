import { useState } from 'react';
import { Modal, View, Text, Pressable, ScrollView, Switch, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { X, UserPlus, UserMinus, LogOut, Check } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/ui';
import { chatApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { useAuthStore } from '../store/auth';
import { qk, useUsers } from '../hooks/useChat';

/** Söhbət məlumatı: üzvlər, səssiz rejim, (admin üçün) üzv əlavə/çıxarma, qrupdan çıxmaq. */
export function GroupInfo({ conv, members = [], onClose }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const usersQ = useUsers();
  const [adding, setAdding] = useState(false);
  const [pick, setPick] = useState([]);
  const [err, setErr] = useState('');
  const isGroup = conv.type === 'GROUP';
  const canManage = isGroup && (me?.admin || conv.myRole === 'ADMIN');
  const memberIds = new Set(members.map((m) => m.user.id));
  const candidates = (usersQ.data || []).filter((u) => !memberIds.has(u.id));

  const refresh = () => {
    qc.invalidateQueries({ queryKey: qk.members(conv.id) });
    qc.invalidateQueries({ queryKey: qk.conversations });
  };
  const run = async (fn) => {
    setErr('');
    try { await fn(); refresh(); } catch (e) { setErr(errorMessage(e)); }
  };

  const toggleMute = (v) => {
    qc.setQueryData(qk.conversations, (l) => l && l.map((c) => (c.id === conv.id ? { ...c, muted: v } : c)));
    chatApi.mute(conv.id, v).catch((e) => setErr(errorMessage(e)));
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 560, maxHeight: '88%', backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: Platform.OS === 'web' ? 12 : insets.bottom + 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 }}>
            <Avatar name={conv.name} id={conv.otherUser?.id ?? conv.id} size={52} group={isGroup} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 19 }}>{conv.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 13 }}>{isGroup ? `${members.length || conv.memberCount} üzv` : 'Şəxsi yazışma'}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10}><X size={24} color={colors.muted} /></Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
            {conv.description ? <Text style={{ color: colors.ink2, fontSize: 14 }}>{conv.description}</Text> : null}

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, padding: 14, borderRadius: 14 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 15 }}>Səssiz rejim</Text>
                <Text style={{ color: colors.muted, fontSize: 12.5 }}>Yalnız sizi etiketləyəndə bildiriş gələcək</Text>
              </View>
              <Switch value={!!conv.muted} onValueChange={toggleMute} trackColor={{ true: colors.brand }} />
            </View>

            {err ? <Text style={{ color: colors.red, fontSize: 13.5 }}>{err}</Text> : null}

            <View style={{ backgroundColor: colors.surface, borderRadius: 14, overflow: 'hidden' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, paddingBottom: 6 }}>
                <Text style={{ color: colors.muted, fontWeight: '700', fontSize: 12.5, letterSpacing: 0.4 }}>ÜZVLƏR</Text>
                {canManage && !adding ? (
                  <Pressable onPress={() => setAdding(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <UserPlus size={17} color={colors.brand} /><Text style={{ color: colors.brand, fontWeight: '700' }}>Üzv əlavə et</Text>
                  </Pressable>
                ) : null}
              </View>

              {adding ? (
                <View style={{ padding: 10, gap: 4, backgroundColor: colors.brandTint }}>
                  {candidates.length === 0 ? <Text style={{ color: colors.muted, padding: 8 }}>Əlavə ediləcək istifadəçi qalmayıb</Text> : candidates.map((u) => {
                    const on = pick.includes(u.id);
                    return (
                      <Pressable key={u.id} onPress={() => setPick((p) => (on ? p.filter((x) => x !== u.id) : [...p, u.id]))} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8 }}>
                        <Avatar name={u.fullName} id={u.id} size={34} />
                        <Text style={{ flex: 1, color: colors.ink, fontWeight: '600' }}>{u.fullName}</Text>
                        <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: on ? colors.brand : colors.line, backgroundColor: on ? colors.brand : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                          {on ? <Check size={14} color="#fff" /> : null}
                        </View>
                      </Pressable>
                    );
                  })}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                    <Button variant="ghost" onPress={() => { setAdding(false); setPick([]); }} style={{ flex: 1, height: 44 }}>Ləğv et</Button>
                    <Button disabled={!pick.length} onPress={() => run(async () => { await chatApi.addMembers(conv.id, pick); setAdding(false); setPick([]); })} style={{ flex: 1, height: 44 }}>Əlavə et ({pick.length})</Button>
                  </View>
                </View>
              ) : null}

              {members.map((m) => (
                <View key={m.user.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 9 }}>
                  <Avatar name={m.user.fullName} id={m.user.id} size={40} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.ink, fontWeight: '600', fontSize: 15 }}>{m.user.fullName}{m.user.id === me?.id ? ' (siz)' : ''}</Text>
                    {m.user.position || m.user.department ? <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12.5 }}>{m.user.position || m.user.department}</Text> : null}
                  </View>
                  {m.role === 'ADMIN' ? <Text style={{ color: colors.brand, fontSize: 11.5, fontWeight: '700', backgroundColor: colors.brandTint, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' }}>Admin</Text> : null}
                  {canManage && m.user.id !== me?.id ? (
                    <Pressable onPress={() => run(() => chatApi.removeMember(conv.id, m.user.id))} hitSlop={8} accessibilityLabel="Çıxar"><UserMinus size={19} color={colors.red} /></Pressable>
                  ) : null}
                </View>
              ))}
            </View>

            {isGroup ? (
              <Pressable
                onPress={() => run(async () => { await chatApi.removeMember(conv.id, me.id); onClose(); })}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface, padding: 14, borderRadius: 14 }}
              >
                <LogOut size={19} color={colors.red} /><Text style={{ color: colors.red, fontWeight: '700' }}>Qrupdan çıx</Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
