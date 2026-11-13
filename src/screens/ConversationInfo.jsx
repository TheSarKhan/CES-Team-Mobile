import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, Switch, Modal, TextInput, Platform, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { ArrowLeft, X as CloseIcon, Camera, Pencil, UserPlus, UserMinus, LogOut, ChevronRight, Bell, BellOff, Check, X, Phone, Mail, Briefcase, MessageCircle, Search, Trash2, FileText, Mic } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Avatar } from '../components/Avatar';
import { Button, Empty } from '../components/ui';
import { ProfileSheet } from '../components/ProfileSheet';
import { ImageViewer } from '../components/ImageViewer';
import { PhotoCropper } from '../components/PhotoCropper';
import { FadeIn, PressableScale, SpringIn, Backdrop } from '../components/motion';
import { chatApi, uploadAvatar } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { absoluteUrl } from '../config';
import { useAuthStore } from '../store/auth';
import { qk, useConversation, useConversations, useMembers, useUser, useUsers } from '../hooks/useChat';
import { topPad, bottomPad } from '../lib/safe';

const MAX_W = 760;

function Card({ children, style }) {
  const { colors } = useTheme();
  return <View style={[{ backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }, style]}>{children}</View>;
}

function QuickAction({ icon, label, onPress, active, colors }) {
  return (
    <PressableScale onPress={onPress} scaleTo={0.94} accessibilityRole="button" accessibilityLabel={label}
      style={{ minWidth: 92, alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: active ? colors.brandLine : colors.line, backgroundColor: active ? colors.brandTint : colors.surface }}>
      {icon}
      <Text style={{ color: active ? colors.brand : colors.ink2, fontWeight: '700', fontSize: 12.5 }}>{label}</Text>
    </PressableScale>
  );
}

function EditModal({ conv, onClose, onSaved }) {
  const { colors } = useTheme();
  const [name, setName] = useState(conv.name || '');
  const [desc, setDesc] = useState(conv.description || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const save = async () => {
    if (!name.trim()) { setErr('Qrup adı boş ola bilməz'); return; }
    setBusy(true); setErr('');
    try { await chatApi.updateGroup(conv.id, { name: name.trim(), description: desc.trim() }); onSaved(); onClose(); } catch (e) { setErr(errorMessage(e)); setBusy(false); }
  };
  const input = { color: colors.ink, fontSize: 16, backgroundColor: colors.surfaceAlt, borderRadius: 12, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 12 };
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Backdrop onPress={onClose} style={{ justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <SpringIn style={{ width: '100%', maxWidth: 460 }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.surface, borderRadius: 22, padding: 20, gap: 12 }}>
            <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 19 }}>Qrupu redaktə et</Text>
            <Text style={{ color: colors.muted, fontSize: 12.5, fontWeight: '700' }}>QRUP ADI</Text>
            <TextInput value={name} onChangeText={setName} maxLength={120} placeholder="Qrup adı" placeholderTextColor={colors.faint} style={[input, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]} />
            <Text style={{ color: colors.muted, fontSize: 12.5, fontWeight: '700' }}>TƏSVİR</Text>
            <TextInput value={desc} onChangeText={setDesc} maxLength={500} multiline placeholder="Qrup haqqında qısa məlumat" placeholderTextColor={colors.faint} style={[input, { minHeight: 90, textAlignVertical: 'top' }, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]} />
            {err ? <Text style={{ color: colors.red }}>{err}</Text> : null}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Button variant="ghost" onPress={onClose} style={{ flex: 1 }}>Ləğv et</Button>
              <Button onPress={save} loading={busy} style={{ flex: 1 }}>Yadda saxla</Button>
            </View>
          </Pressable>
        </SpringIn>
      </Backdrop>
    </Modal>
  );
}

function AddMembers({ conv, memberIds, onClose, onDone }) {
  const { colors } = useTheme();
  const usersQ = useUsers();
  const [q, setQ] = useState('');
  const [pick, setPick] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const list = (usersQ.data || []).filter((u) => !memberIds.has(u.id) && u.fullName.toLowerCase().includes(q.trim().toLowerCase()));
  const add = async () => {
    setBusy(true); setErr('');
    try { await chatApi.addMembers(conv.id, pick); onDone(); onClose(); } catch (e) { setErr(errorMessage(e)); setBusy(false); }
  };
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Backdrop onPress={onClose} style={{ justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <SpringIn style={{ width: '100%', maxWidth: 480, maxHeight: '86%' }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.surface, borderRadius: 22, paddingTop: 18, maxHeight: '100%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 }}>
              <Text style={{ flex: 1, color: colors.ink, fontWeight: '800', fontSize: 19 }}>Üzv əlavə et</Text>
              <Pressable onPress={onClose} hitSlop={10}><X size={22} color={colors.muted} /></Pressable>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, paddingHorizontal: 12, height: 44, borderRadius: 22, backgroundColor: colors.sunk }}>
              <Search size={18} color={colors.faint} />
              <TextInput value={q} onChangeText={setQ} placeholder="Axtar" placeholderTextColor={colors.faint} style={[{ flex: 1, color: colors.ink, fontSize: 15 }, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]} />
            </View>
            <ScrollView style={{ marginTop: 6 }} contentContainerStyle={{ paddingBottom: 6 }}>
              {list.length === 0 ? <Text style={{ color: colors.muted, padding: 20, textAlign: 'center' }}>Əlavə ediləcək istifadəçi tapılmadı</Text> : list.map((u) => {
                const on = pick.includes(u.id);
                return (
                  <Pressable key={u.id} onPress={() => setPick((p) => (on ? p.filter((x) => x !== u.id) : [...p, u.id]))} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 9, backgroundColor: pressed ? colors.sunk : 'transparent' })}>
                    <Avatar name={u.fullName} id={u.id} uri={u.avatarUrl} size={42} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.ink, fontWeight: '600', fontSize: 15.5 }}>{u.fullName}</Text>
                      {u.position || u.department ? <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12.5 }}>{u.position || u.department}</Text> : null}
                    </View>
                    <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? colors.brand : colors.line, backgroundColor: on ? colors.brand : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                      {on ? <Check size={15} color="#fff" /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
            {err ? <Text style={{ color: colors.red, paddingHorizontal: 20 }}>{err}</Text> : null}
            <View style={{ padding: 16 }}>
              <Button disabled={!pick.length} loading={busy} onPress={add}>{pick.length ? `Əlavə et (${pick.length})` : 'Əlavə et'}</Button>
            </View>
          </Pressable>
        </SpringIn>
      </Backdrop>
    </Modal>
  );
}

/** Qrup və ya şəxsin tam səhifə məlumatı: şəkil, ad, media, üzvlər, səssiz rejim (WhatsApp/Telegram kimi). */
export function ConversationInfo({ id, onBack, dialog = false, onOpenMedia }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const qc = useQueryClient();
  const me = useAuthStore((s) => s.user);
  const convsQ = useConversations();
  const listed = convsQ.data?.find((c) => String(c.id) === String(id));
  const convQ = useConversation(id, !listed && !convsQ.isLoading);
  const conv = listed ?? convQ.data;
  const membersQ = useMembers(id);
  const members = membersQ.data || [];
  const isGroup = conv?.type === 'GROUP';
  const otherId = conv?.otherUser?.id;
  const otherQ = useUser(!isGroup ? otherId : null);
  const mediaQ = useQuery({ queryKey: ['media', String(id)], queryFn: () => chatApi.media(id, 'IMAGE'), staleTime: 0 });
  const canManage = isGroup && (me?.admin || conv?.myRole === 'ADMIN');
  const [profile, setProfile] = useState(null);
  const [edit, setEdit] = useState(false);
  const [adding, setAdding] = useState(false);
  const [viewer, setViewer] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [width, setWidth] = useState(400);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [cropUri, setCropUri] = useState(null);
  const [filter, setFilter] = useState('');
  const memberIds = useMemo(() => new Set(members.map((m) => m.user.id)), [members]);
  const shown = members.filter((m) => m.user.fullName.toLowerCase().includes(filter.trim().toLowerCase()));

  const refresh = () => {
    qc.invalidateQueries({ queryKey: qk.members(id) });
    qc.invalidateQueries({ queryKey: qk.conversations });
    qc.invalidateQueries({ queryKey: ['conversation', String(id)] });
  };
  const run = async (fn) => { setErr(''); try { await fn(); refresh(); } catch (e) { setErr(errorMessage(e)); } };

  const toggleMute = (v) => {
    qc.setQueryData(qk.conversations, (l) => l && l.map((c) => (String(c.id) === String(id) ? { ...c, muted: v } : c)));
    chatApi.mute(id, v).catch((e) => setErr(errorMessage(e)));
  };

  const pickPhoto = async () => {
    setErr('');
    try {
      if (Platform.OS !== 'web') {
        const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!p.granted) { setErr('Şəkil seçmək üçün qalereyaya icazə verin'); return; }
      }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
      if (r.canceled || !r.assets?.[0]) return;
      setCropUri(r.assets[0].uri);
    } catch (e) { setErr(errorMessage(e, 'Şəkil açılmadı')); }
  };
  const uploadCropped = async (uri) => {
    setCropUri(null); setBusy(true);
    try { await uploadAvatar({ uri, name: 'qrup.jpg', mimeType: 'image/jpeg' }, `/conversations/${id}/avatar`); refresh(); }
    catch (e) { setErr(errorMessage(e, 'Şəkil yüklənmədi')); } finally { setBusy(false); }
  };

  const openMessage = async (uid) => {
    const c = await chatApi.openDirect(uid);
    qc.invalidateQueries({ queryKey: qk.conversations });
    setProfile(null);
    router.replace(`/chats?c=${c.id}`);
  };

  const leave = async () => {
    setBusy(true);
    try { await chatApi.removeMember(id, me.id); qc.invalidateQueries({ queryKey: qk.conversations }); router.replace('/chats'); } catch (e) { setErr(errorMessage(e)); setBusy(false); setConfirmLeave(false); }
  };

  if (!conv) {
    return <View style={{ flex: 1, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.brand} size="large" /></View>;
  }

  const media = mediaQ.data;
  const images = (media?.items || []).map((x) => x.attachment);
  const thumb = Math.max(76, Math.min(110, Math.floor((Math.min(width, MAX_W) - 32 - 8 * 3) / 4)));
  const other = otherQ.data ?? conv.otherUser ?? {};
  const subtitle = isGroup ? `Qrup · ${members.length || conv.memberCount} üzv` : [other.position, other.department].filter(Boolean).join(' · ');

  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceAlt }}>
      <View style={{ paddingTop: dialog ? 0 : topPad(insets, 0), backgroundColor: colors.header, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, height: 58 }}>
          <Pressable onPress={onBack} hitSlop={10} accessibilityLabel={dialog ? 'Bağla' : 'Geri'}>{dialog ? <CloseIcon size={24} color={colors.headerInk} /> : <ArrowLeft size={24} color={colors.headerInk} />}</Pressable>
          <Text style={{ flex: 1, color: colors.headerInk, fontWeight: '800', fontSize: 19 }}>{isGroup ? 'Qrup məlumatı' : 'Əlaqə məlumatı'}</Text>
          {canManage ? <Pressable onPress={() => setEdit(true)} hitSlop={10} accessibilityLabel="Redaktə et"><Pencil size={21} color={colors.headerInk} /></Pressable> : null}
        </View>
      </View>

      <ScrollView onLayout={(e) => setWidth(e.nativeEvent.layout.width)} contentContainerStyle={{ alignItems: 'center', paddingBottom: 48 }}>
        <View style={{ width: '100%', maxWidth: MAX_W, padding: 16, gap: 12 }}>
          {/* Şəkil, ad, qısa əməliyyatlar */}
          <FadeIn from="scale" style={{ alignItems: 'center', paddingVertical: 8, gap: 6 }}>
            <Pressable onPress={canManage ? pickPhoto : undefined} disabled={!canManage || busy} accessibilityLabel={canManage ? 'Qrup şəklini dəyiş' : undefined}>
              <Avatar name={conv.name} id={otherId ?? conv.id} uri={isGroup ? conv.avatarUrl : other.avatarUrl} size={132} group={isGroup} />
              {canManage ? (
                <View style={{ position: 'absolute', right: 2, bottom: 2, width: 38, height: 38, borderRadius: 19, backgroundColor: colors.brand, borderWidth: 3, borderColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                  {busy ? <ActivityIndicator size="small" color="#fff" /> : <Camera size={17} color="#fff" />}
                </View>
              ) : null}
            </Pressable>
            <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 27, marginTop: 8, textAlign: 'center' }}>{conv.name}</Text>
            {subtitle ? <Text style={{ color: colors.muted, fontSize: 15, textAlign: 'center' }}>{subtitle}</Text> : null}
            {canManage && conv.avatarUrl ? (
              <Pressable onPress={() => run(() => chatApi.removeGroupAvatar(id))} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <Trash2 size={14} color={colors.muted} /><Text style={{ color: colors.muted, fontSize: 13, fontWeight: '600' }}>Şəkli sil</Text>
              </Pressable>
            ) : null}
          </FadeIn>

          <FadeIn delay={80} style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
            <QuickAction colors={colors} active={!!conv.muted} onPress={() => toggleMute(!conv.muted)}
              icon={conv.muted ? <BellOff size={22} color={colors.brand} /> : <Bell size={22} color={colors.ink2} />} label={conv.muted ? 'Səssiz' : 'Səsli'} />
            {!isGroup ? <QuickAction colors={colors} onPress={() => router.replace(`/chats?c=${id}`)} icon={<MessageCircle size={22} color={colors.ink2} />} label="Mesaj" /> : null}
            {canManage ? <QuickAction colors={colors} onPress={() => setAdding(true)} icon={<UserPlus size={22} color={colors.ink2} />} label="Üzv əlavə et" /> : null}
          </FadeIn>

          {err ? <Text style={{ color: colors.red, textAlign: 'center' }}>{err}</Text> : null}

          {/* Təsvir */}
          {isGroup && conv.description ? (
            <FadeIn delay={120}><Card><View style={{ padding: 16, gap: 4 }}>
              <Text style={{ color: colors.muted, fontSize: 12.5, fontWeight: '700' }}>TƏSVİR</Text>
              <Text style={{ color: colors.ink, fontSize: 15.5, lineHeight: 22 }}>{conv.description}</Text>
            </View></Card></FadeIn>
          ) : null}

          {/* Şəxsin əlaqə məlumatı */}
          {!isGroup ? (
            <FadeIn delay={120}><Card style={{ paddingVertical: 4 }}>
              {[[Briefcase, 'Şöbə', other.department], [Phone, 'Telefon', other.phone], [Mail, 'E-poçt', other.email]].filter((r) => r[2]).map(([Icon, label, value]) => (
                <View key={label} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' }}><Icon size={18} color={colors.brand} /></View>
                  <View style={{ flex: 1 }}><Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text><Text style={{ color: colors.ink, fontSize: 15.5, fontWeight: '600' }}>{value}</Text></View>
                </View>
              ))}
            </Card></FadeIn>
          ) : null}

          {/* Media */}
          <FadeIn delay={160}><Card>
            <PressableScale onPress={() => (onOpenMedia ? onOpenMedia() : router.push(`/media/${id}`))} scaleTo={0.99} accessibilityRole="button" accessibilityLabel="Media, fayllar və səslər"
              style={{ flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 }}>
              <Text style={{ flex: 1, color: colors.ink, fontWeight: '800', fontSize: 16 }}>Media, fayllar və səslər</Text>
              <Text style={{ color: colors.muted, fontSize: 14, fontWeight: '600' }}>{media ? media.images + media.files + media.voices : ''}</Text>
              <ChevronRight size={20} color={colors.faint} />
            </PressableScale>
            {images.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}>
                {images.slice(0, 12).map((a, i) => (
                  <FadeIn key={a.id} delay={200 + i * 40} from="scale" duration={260}>
                    <PressableScale scaleTo={0.93} onPress={() => setViewer({ images, startId: a.id })} accessibilityLabel={`Şəkil ${i + 1}`}>
                      <Image source={{ uri: absoluteUrl(a.thumbUrl || a.url) }} style={{ width: thumb, height: thumb, borderRadius: 12, backgroundColor: colors.sunk }} resizeMode="cover" />
                    </PressableScale>
                  </FadeIn>
                ))}
              </ScrollView>
            ) : (
              <Text style={{ color: colors.muted, paddingHorizontal: 16, paddingBottom: 16, fontSize: 14 }}>
                {media && (media.files || media.voices) ? `${media.files} fayl · ${media.voices} səs` : 'Hələ media yoxdur'}
              </Text>
            )}
            {images.length && media && (media.files || media.voices) ? (
              <View style={{ flexDirection: 'row', gap: 16, paddingHorizontal: 16, paddingBottom: 14 }}>
                {media.files ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><FileText size={15} color={colors.muted} /><Text style={{ color: colors.muted, fontSize: 13 }}>{media.files} fayl</Text></View> : null}
                {media.voices ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Mic size={15} color={colors.muted} /><Text style={{ color: colors.muted, fontSize: 13 }}>{media.voices} səs</Text></View> : null}
              </View>
            ) : null}
          </Card></FadeIn>

          {/* Üzvlər */}
          {isGroup ? (
            <FadeIn delay={220}><Card>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 8 }}>
                <Text style={{ flex: 1, color: colors.ink, fontWeight: '800', fontSize: 16 }}>{members.length} üzv</Text>
              </View>
              {members.length > 8 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16, marginBottom: 6, paddingHorizontal: 12, height: 40, borderRadius: 20, backgroundColor: colors.sunk }}>
                  <Search size={17} color={colors.faint} />
                  <TextInput value={filter} onChangeText={setFilter} placeholder="Üzv axtar" placeholderTextColor={colors.faint} style={[{ flex: 1, color: colors.ink, fontSize: 14.5 }, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]} />
                </View>
              ) : null}
              {canManage ? (
                <PressableScale onPress={() => setAdding(true)} scaleTo={0.99} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 10 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }}><UserPlus size={21} color="#fff" /></View>
                  <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 15.5 }}>Üzv əlavə et</Text>
                </PressableScale>
              ) : null}
              {shown.map((m, i) => (
                <FadeIn key={m.user.id} delay={260 + Math.min(i, 8) * 40} distance={8}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, paddingVertical: 9 }}>
                    <Pressable onPress={() => setProfile(m.user)} accessibilityRole="button" accessibilityLabel={`${m.user.fullName} profili`} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                      <Avatar name={m.user.fullName} id={m.user.id} uri={m.user.avatarUrl} size={46} />
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={{ color: colors.ink, fontWeight: '700', fontSize: 15.5 }}>{m.user.fullName}{m.user.id === me?.id ? ' (siz)' : ''}</Text>
                        {m.user.position || m.user.department ? <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 13 }}>{m.user.position || m.user.department}</Text> : null}
                      </View>
                      {m.role === 'ADMIN' ? <Text style={{ color: colors.brand, fontSize: 11.5, fontWeight: '700', backgroundColor: colors.brandTint, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' }}>Qrup admini</Text> : null}
                    </Pressable>
                    {canManage && m.user.id !== me?.id ? (
                      <Pressable onPress={() => run(() => chatApi.removeMember(id, m.user.id))} hitSlop={8} accessibilityLabel="Çıxar"><UserMinus size={19} color={colors.red} /></Pressable>
                    ) : null}
                  </View>
                </FadeIn>
              ))}
              {!shown.length ? <Text style={{ color: colors.muted, padding: 16 }}>Üzv tapılmadı</Text> : null}
              <View style={{ height: 8 }} />
            </Card></FadeIn>
          ) : null}

          {/* Qrupdan çıx */}
          {isGroup ? (
            <FadeIn delay={260}><Card>
              <PressableScale onPress={() => setConfirmLeave(true)} scaleTo={0.99} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 }}>
                <LogOut size={21} color={colors.red} /><Text style={{ color: colors.red, fontWeight: '700', fontSize: 15.5 }}>Qrupdan çıx</Text>
              </PressableScale>
            </Card></FadeIn>
          ) : null}
        </View>
      </ScrollView>

      {confirmLeave ? (
        <Modal visible transparent animationType="none" onRequestClose={() => setConfirmLeave(false)}>
          <Backdrop onPress={() => setConfirmLeave(false)} style={{ justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <SpringIn style={{ width: '100%', maxWidth: 380 }}>
              <Pressable onPress={() => {}} style={{ backgroundColor: colors.surface, borderRadius: 22, padding: 22, gap: 10 }}>
                <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 18 }}>Qrupdan çıxırsınız?</Text>
                <Text style={{ color: colors.muted, fontSize: 14.5, lineHeight: 21 }}>«{conv.name}» qrupunun mesajları sizə artıq görünməyəcək.</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                  <Button variant="ghost" onPress={() => setConfirmLeave(false)} style={{ flex: 1 }}>Ləğv et</Button>
                  <Button onPress={leave} loading={busy} style={{ flex: 1, backgroundColor: colors.red }}>Çıx</Button>
                </View>
              </Pressable>
            </SpringIn>
          </Backdrop>
        </Modal>
      ) : null}
      {cropUri ? <PhotoCropper uri={cropUri} title="Qrup şəkli" onCancel={() => setCropUri(null)} onDone={uploadCropped} /> : null}
      {edit ? <EditModal conv={conv} onClose={() => setEdit(false)} onSaved={refresh} /> : null}
      {adding ? <AddMembers conv={conv} memberIds={memberIds} onClose={() => setAdding(false)} onDone={refresh} /> : null}
      {profile ? <ProfileSheet userId={profile.id} initial={profile} onClose={() => setProfile(null)} onMessage={openMessage} /> : null}
      {viewer ? <ImageViewer images={viewer.images} startId={viewer.startId} onClose={() => setViewer(null)} /> : null}
    </View>
  );
}
