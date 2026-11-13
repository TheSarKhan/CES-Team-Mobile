import { useState, useRef } from 'react';
import { View, Text, ScrollView, Platform, Pressable, Switch, Modal, TextInput, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight, Camera, X, Check, Smartphone, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/store/auth';
import { useLayout } from '../../src/lib/useLayout';
import { Avatar } from '../../src/components/Avatar';
import { Button } from '../../src/components/ui';
import { Backdrop, SpringIn, FadeIn } from '../../src/components/motion';
import { PhotoCropper } from '../../src/components/PhotoCropper';
import { useMe, useConversations, qk } from '../../src/hooks/useChat';
import { meApi, chatApi, devicesApi, uploadAvatar } from '../../src/api/endpoints';
import { tokenStore } from '../../src/api/tokenStore';
import { errorMessage } from '../../src/api/client';
import { registerForPushNotificationsAsync, getCurrentPushToken } from '../../src/lib/push';
import * as push from '../../src/lib/push';
import { buildId, toggleHud } from '../../src/lib/appUpdate';
import { dayLabel, hhmm, fileSize } from '../../src/lib/format';

// ── kiçik quruluş blokları ──

function Section({ title, children }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 22 }}>{title}</Text>
      <View style={{ backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }}>{children}</View>
    </View>
  );
}

/** Sətir: solda ad, sağda dəyər; onPress varsa ox işarəsi. */
function Row({ label, value, onPress, first, tone, right }) {
  const { colors } = useTheme();
  const base = { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 18, paddingVertical: 12, borderTopWidth: first ? 0 : 1, borderTopColor: colors.line };
  const inner = (
    <>
      <Text style={{ flex: right || value != null ? 0.9 : 1, color: tone === 'brand' ? colors.brand : tone === 'danger' ? colors.red : colors.ink2, fontSize: 16, fontWeight: tone ? '700' : '500' }}>{label}</Text>
      {value != null ? <Text numberOfLines={2} style={{ flex: 1.1, color: colors.ink, fontSize: 16, fontWeight: '700' }}>{value || '—'}</Text> : null}
      {right}
      {onPress ? <ChevronRight size={20} color={colors.muted} /> : null}
    </>
  );
  if (!onPress) return <View style={base}>{inner}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => ({ ...base, backgroundColor: pressed ? colors.sunk : 'transparent' })}>
      {inner}
    </Pressable>
  );
}

/** Pəncərə: telefonda aşağıdan panel, kompüterdə mərkəzdə. */
function Sheet({ title, onClose, children }) {
  const { colors } = useTheme();
  const { isWide } = useLayout();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Backdrop onPress={onClose} style={{ justifyContent: isWide ? 'center' : 'flex-end', alignItems: 'center', padding: isWide ? 20 : 0 }}>
        <SpringIn origin={isWide ? 'center' : 'bottom'} from={isWide ? 0.9 : 0.96} style={{ width: '100%', maxWidth: 480, maxHeight: '90%' }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: colors.surface, borderRadius: isWide ? 22 : 0, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: isWide ? 6 : insets.bottom + 6, maxHeight: '100%' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 18, paddingBottom: 6 }}>
              <Text style={{ flex: 1, color: colors.ink, fontWeight: '800', fontSize: 19 }}>{title}</Text>
              <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Bağla"><X size={22} color={colors.muted} /></Pressable>
            </View>
            {children}
          </Pressable>
        </SpringIn>
      </Backdrop>
    </Modal>
  );
}

function Field({ label, value, onChangeText, placeholder, secure, hint, error }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: colors.ink2, fontWeight: '700', fontSize: 13.5 }}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.faint} secureTextEntry={secure} autoCapitalize="none"
        style={[{ height: 48, borderRadius: 14, borderWidth: 1.5, borderColor: error ? colors.red : colors.line, color: colors.ink, paddingHorizontal: 14, fontSize: 16, backgroundColor: colors.surface }, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]} />
      {hint ? <Text style={{ color: colors.muted, fontSize: 12.5 }}>{hint}</Text> : null}
    </View>
  );
}

function EditProfile({ me, onClose, onSaved }) {
  const { colors } = useTheme();
  const [phone, setPhone] = useState(me.phone || '');
  const [position, setPosition] = useState(me.position || '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const save = async () => {
    setBusy(true); setErr('');
    try { onSaved(await meApi.update({ phone, position })); onClose(); } catch (e) { setErr(errorMessage(e)); setBusy(false); }
  };
  return (
    <Sheet title="Profili redaktə et" onClose={onClose}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Field label="Vəzifə" value={position} onChangeText={setPosition} placeholder="məs. İT mütəxəssisi" />
        <Field label="İş telefonu" value={phone} onChangeText={setPhone} placeholder="+994 50 000 00 00" />
        <Text style={{ color: colors.muted, fontSize: 12.5 }}>Ad, soyad, şöbə və e-poçt ERP-dən gəlir, burada dəyişdirilmir. Sahəni boş qoysanız ERP-dəki dəyər görünür.</Text>
        {err ? <Text style={{ color: colors.red }}>{err}</Text> : null}
        <Button onPress={save} loading={busy}>Yadda saxla</Button>
      </ScrollView>
    </Sheet>
  );
}

function ChangePassword({ onClose, onDone }) {
  const { colors } = useTheme();
  const [cur, setCur] = useState('');
  const [next, setNext] = useState('');
  const [rep, setRep] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState(false);
  const rule = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(next);
  const submit = async () => {
    setErr('');
    if (!cur) { setErr('Cari şifrəni yazın'); return; }
    if (!rule) { setErr('Yeni şifrə minimum 8 simvol, 1 böyük hərf, 1 kiçik hərf və 1 rəqəm olmalıdır'); return; }
    if (next !== rep) { setErr('Yeni şifrələr eyni deyil'); return; }
    setBusy(true);
    try { await meApi.changePassword(cur, next); setOk(true); setTimeout(onDone, 1800); } catch (e) { setErr(errorMessage(e, 'Şifrə dəyişdirilmədi')); setBusy(false); }
  };
  return (
    <Sheet title="Şifrəni dəyiş" onClose={onClose}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 14 }} keyboardShouldPersistTaps="handled">
        {ok ? (
          <View style={{ alignItems: 'center', gap: 10, paddingVertical: 20 }}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' }}><Check size={28} color={colors.brand} /></View>
            <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 16, textAlign: 'center' }}>Şifrə dəyişdi</Text>
            <Text style={{ color: colors.muted, textAlign: 'center' }}>Təhlükəsizlik üçün bütün cihazlardan çıxılır, yenidən daxil olun.</Text>
          </View>
        ) : (
          <>
            <Field label="Cari şifrə" value={cur} onChangeText={setCur} secure />
            <Field label="Yeni şifrə" value={next} onChangeText={setNext} secure hint="Minimum 8 simvol, 1 böyük hərf, 1 kiçik hərf, 1 rəqəm" error={!!next && !rule} />
            <Field label="Yeni şifrə (təkrar)" value={rep} onChangeText={setRep} secure error={!!rep && rep !== next} />
            <Text style={{ color: colors.muted, fontSize: 12.5 }}>Şifrə ERP hesabınızındadır, orada da dəyişəcək.</Text>
            {err ? <Text accessibilityRole="alert" style={{ color: colors.red }}>{err}</Text> : null}
            <Button onPress={submit} loading={busy}>Şifrəni dəyiş</Button>
          </>
        )}
      </ScrollView>
    </Sheet>
  );
}

function Sessions({ onClose }) {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const token = getCurrentPushToken?.();
  const q = useQuery({ queryKey: ['devices'], queryFn: () => devicesApi.list(token), staleTime: 0 });
  const remove = async (id) => { try { await devicesApi.remove(id); } finally { qc.invalidateQueries({ queryKey: ['devices'] }); } };
  return (
    <Sheet title="Aktiv sessiyalar" onClose={onClose}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 10 }}>
        <Text style={{ color: colors.muted, fontSize: 13.5 }}>Bildiriş aldığınız cihazlar. «Çıxar» həmin cihaza bildiriş göndərilməsini dayandırır.</Text>
        {q.isLoading ? <ActivityIndicator color={colors.brand} /> : null}
        {(q.data || []).map((d) => (
          <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: d.current ? colors.brandLine : colors.line, backgroundColor: d.current ? colors.brandTint : colors.surface }}>
            <Smartphone size={22} color={d.current ? colors.brand : colors.muted} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 15.5 }}>{d.label}{d.current ? ' · bu cihaz' : ''}</Text>
              <Text style={{ color: colors.muted, fontSize: 12.5 }}>Son istifadə: {dayLabel(d.lastUsedAt)}, {hhmm(d.lastUsedAt)}</Text>
            </View>
            <Pressable onPress={() => remove(d.id)} hitSlop={8} accessibilityLabel={`${d.label} cihazını çıxar`}><Text style={{ color: colors.red, fontWeight: '700' }}>Çıxar</Text></Pressable>
          </View>
        ))}
        {!q.isLoading && !(q.data || []).length ? <Text style={{ color: colors.muted }}>Hələ bildiriş cihazı yoxdur. Bildirişləri aktivləşdirin.</Text> : null}
      </ScrollView>
    </Sheet>
  );
}

function Storage({ onClose }) {
  const { colors } = useTheme();
  const q = useQuery({ queryKey: ['storage'], queryFn: meApi.storage, staleTime: 0 });
  const line = (label, l) => (
    <View key={label} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.line }}>
      <Text style={{ flex: 1, color: colors.ink2, fontSize: 16 }}>{label}</Text>
      <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 16 }}>{l.count} · {fileSize(l.bytes)}</Text>
    </View>
  );
  return (
    <Sheet title="Media və yaddaş" onClose={onClose}>
      <View style={{ padding: 18, paddingTop: 6 }}>
        <Text style={{ color: colors.muted, fontSize: 13.5, marginBottom: 8 }}>Sizin söhbətlərə və kartlara yüklədiyiniz fayllar.</Text>
        {q.isLoading ? <ActivityIndicator color={colors.brand} /> : q.data ? (
          <>
            {line('Şəkillər', q.data.images)}
            {line('Fayllar', q.data.files)}
            {line('Səslər', q.data.voices)}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderTopWidth: 2, borderTopColor: colors.line }}>
              <Text style={{ flex: 1, color: colors.ink, fontWeight: '800', fontSize: 16 }}>Cəmi</Text>
              <Text style={{ color: colors.brand, fontWeight: '800', fontSize: 17 }}>{q.data.total.count} · {fileSize(q.data.total.bytes)}</Text>
            </View>
          </>
        ) : <Text style={{ color: colors.red }}>Yüklənmədi</Text>}
      </View>
    </Sheet>
  );
}

/** Söhbət qrupları üzrə səssiz rejim (hər qrup üçün ayrıca). */
function GroupSettings({ onClose }) {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const convs = useConversations();
  const groups = (convs.data || []).filter((c) => c.type === 'GROUP');
  const mute = (c, v) => {
    qc.setQueryData(qk.conversations, (l) => l && l.map((x) => (x.id === c.id ? { ...x, muted: v } : x)));
    chatApi.mute(c.id, v).catch(() => qc.invalidateQueries({ queryKey: qk.conversations }));
  };
  return (
    <Sheet title="Qruplar üzrə ayarlar" onClose={onClose}>
      <ScrollView contentContainerStyle={{ padding: 18, paddingTop: 6 }}>
        <Text style={{ color: colors.muted, fontSize: 13.5, marginBottom: 8 }}>Səssiz qrupdan yalnız sizi etiketləyəndə bildiriş gəlir.</Text>
        {groups.map((c, i) => (
          <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
            <Avatar name={c.name} id={c.id} uri={c.avatarUrl} size={40} group />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 15.5 }}>{c.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 12.5 }}>{c.muted ? 'Səssiz' : 'Bildiriş gəlir'}</Text>
            </View>
            <Switch value={!!c.muted} onValueChange={(v) => mute(c, v)} trackColor={{ true: colors.brand }} accessibilityLabel={`${c.name} səssiz`} />
          </View>
        ))}
        {!groups.length ? <Text style={{ color: colors.muted }}>Qrup yoxdur</Text> : null}
      </ScrollView>
    </Sheet>
  );
}


// ── səhifə ──

export default function Profile() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isWide } = useLayout();
  const qc = useQueryClient();
  const stored = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const meQ = useMe(stored?.id); // imzalı şəkil linki vaxtla bitir — təzə /me ilə yenilənir
  const me = { ...stored, ...(meQ.data || {}) };
  const web = Platform.OS === 'web';

  const [sheet, setSheet] = useState(null); // edit | password | sessions | storage | groups | lang | theme
  const [cropUri, setCropUri] = useState(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [, force] = useState(0);

  const pushState = web ? push.pushState() : null; // default | granted | denied | unsupported
  const needsInstall = web && push.isIOS() && !push.isStandalone();

  const applyUser = async (u) => {
    qc.setQueryData(['me', u.id], u);
    await tokenStore.setUser(u);
    useAuthStore.setState({ user: u });
    qc.invalidateQueries({ queryKey: ['users'] });
    qc.invalidateQueries({ queryKey: ['user', u.id] });
  };
  const setPref = async (patch) => {
    qc.setQueryData(['me', me.id], { ...me, ...patch }); // dərhal göstər
    try { await applyUser(await meApi.update(patch)); } catch (e) { setMsg(errorMessage(e)); qc.invalidateQueries({ queryKey: ['me'] }); }
  };

  const pickPhoto = async () => {
    setMsg('');
    try {
      if (Platform.OS !== 'web') {
        const p = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!p.granted) { setMsg('Şəkil seçmək üçün qalereyaya icazə verin'); return; }
      }
      const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
      if (r.canceled || !r.assets?.[0]) return;
      setCropUri(r.assets[0].uri);
    } catch (e) { setMsg(errorMessage(e, 'Şəkil açılmadı')); }
  };
  const uploadCropped = async (uri) => {
    setCropUri(null); setPhotoBusy(true);
    try { await applyUser(await uploadAvatar({ uri, name: 'avatar.jpg', mimeType: 'image/jpeg' })); }
    catch (e) { setMsg(errorMessage(e, 'Şəkil yüklənmədi')); } finally { setPhotoBusy(false); }
  };
  const removePhoto = async () => {
    setMsg(''); setPhotoBusy(true);
    try { await applyUser(await meApi.deleteAvatar()); } catch (e) { setMsg(errorMessage(e)); } finally { setPhotoBusy(false); }
  };

  const enablePush = async () => {
    setMsg('');
    try {
      if (web) await push.enableWebPush();
      else if (!(await registerForPushNotificationsAsync())) throw new Error('Bildiriş icazəsi verilməyib və ya cihaz dəstəkləmir');
      setMsg('Bildirişlər aktivdir ✓');
    } catch (e) { setMsg(e.message || 'Bildirişlər açılmadı'); }
    force((x) => x + 1);
  };
  const pushOn = web ? pushState === 'granted' : false;
  const pushText = needsInstall ? 'Əvvəl ana ekrana əlavə edin' : web && pushState === 'unsupported' ? 'Brauzer dəstəkləmir' : web && pushState === 'denied' ? 'Brauzerdə bloklanıb' : pushOn ? 'Aktiv ✓' : 'Söndürülüb';

  const personal = (
    <Section title="Şəxsi məlumatlar">
      <Row first label="Ad və soyad" value={me.fullName} />
      <Row label="Vəzifə" value={me.position} />
      <Row label="Şöbə" value={me.department} />
      <Row label="İş telefonu" value={me.phone} />
      <Row label="E-poçt" value={me.email} />
    </Section>
  );
  const notifications = (
    <Section title="Bildirişlər">
      <Row first label="Bu cihaza bildiriş" value={pushText} onPress={!pushOn && !needsInstall && !(web && ['unsupported', 'denied'].includes(pushState)) ? enablePush : undefined} />
      <Row label="Kart yenilikləri" right={<Switch value={me.notifyCards !== false} onValueChange={(v) => setPref({ notifyCards: v })} trackColor={{ true: colors.brand }} accessibilityLabel="Kart yenilikləri" />} />
      <Row label="Qrup mesajları" right={<Switch value={me.notifyGroups !== false} onValueChange={(v) => setPref({ notifyGroups: v })} trackColor={{ true: colors.brand }} accessibilityLabel="Qrup mesajları" />} />
      <Row label="Qruplar üzrə ayarlar" tone="brand" onPress={() => setSheet('groups')} />
    </Section>
  );
  const taps = useRef({ n: 0, t: 0 });
  const tapVersion = () => { // 5 toxunuş: ekran ölçüsü diaqnostikası (HUD)
    const now = Date.now();
    taps.current = { n: now - taps.current.t < 1500 ? taps.current.n + 1 : 1, t: now };
    if (taps.current.n >= 5) { taps.current.n = 0; toggleHud(); }
  };
  const appSettings = (
    <Section title="Tətbiq ayarları">
      <Row first label="Media və yaddaş" onPress={() => setSheet('storage')} />
      <Row label="Versiya" value={buildId()} onPress={tapVersion} />
    </Section>
  );
  const security = (
    <Section title="Təhlükəsizlik">
      <Row first label="Şifrəni dəyiş" onPress={() => setSheet('password')} />
      <Row label="Aktiv sessiyalar" onPress={() => setSheet('sessions')} />
      <Row label="Hesabdan çıx" tone="danger" onPress={logout} />
    </Section>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.surfaceAlt }} contentContainerStyle={{ padding: isWide ? 28 : 16, paddingTop: web ? 24 : insets.top + 12, alignItems: 'center', paddingBottom: 48 }}>
      <View style={{ width: '100%', maxWidth: 1120, gap: 22 }}>
        <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 34 }}>Profil</Text>

        <FadeIn from="scale">
          <LinearGradient colors={['#15A34A', '#0E7C3A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ borderRadius: 24, padding: isWide ? 26 : 20, flexDirection: isWide ? 'row' : 'column', alignItems: isWide ? 'center' : 'flex-start', gap: isWide ? 22 : 16 }}>
            <Pressable onPress={pickPhoto} disabled={photoBusy} accessibilityRole="button" accessibilityLabel="Profil şəklini dəyiş" style={{ opacity: photoBusy ? 0.6 : 1 }}>
              <View style={{ borderRadius: 66, borderWidth: 4, borderColor: 'rgba(255,255,255,0.9)' }}>
                <Avatar name={me.fullName} id={me.id} uri={me.avatarUrl} size={isWide ? 112 : 92} />
              </View>
              <View style={{ position: 'absolute', right: 0, bottom: 2, width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
                {photoBusy ? <ActivityIndicator size="small" color={colors.brand} /> : <Camera size={17} color={colors.brand} />}
              </View>
            </Pressable>
            <View style={{ flex: isWide ? 1 : undefined, gap: 2 }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: isWide ? 32 : 26 }}>{me.fullName}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: isWide ? 19 : 16 }}>{me.position || me.department || me.email}</Text>
              {me.avatarUrl ? (
                <Pressable onPress={removePhoto} disabled={photoBusy} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 }}>
                  <Trash2 size={14} color="rgba(255,255,255,0.8)" /><Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '600' }}>Şəkli sil</Text>
                </Pressable>
              ) : null}
            </View>
            <Pressable onPress={() => setSheet('edit')} accessibilityRole="button" accessibilityLabel="Profili redaktə et"
              style={{ height: 52, paddingHorizontal: 22, borderRadius: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Profili redaktə et</Text>
            </Pressable>
          </LinearGradient>
        </FadeIn>

        {msg ? <Text accessibilityRole="alert" style={{ color: msg.includes('✓') ? colors.brand : colors.red, fontWeight: '600' }}>{msg}</Text> : null}
        {needsInstall ? <Text style={{ color: colors.ink2, lineHeight: 21 }}>iPhone-da bildiriş üçün Safari-də <Text style={{ fontWeight: '700' }}>Paylaş → «Ana ekrana əlavə et»</Text> seçin, sonra ana ekrandakı CES Team ikonu ilə açın.</Text> : null}

        {isWide ? (
          <View style={{ flexDirection: 'row', gap: 26, alignItems: 'flex-start' }}>
            <View style={{ flex: 1, gap: 26 }}>{personal}{appSettings}</View>
            <View style={{ flex: 1, gap: 26 }}>{notifications}{security}</View>
          </View>
        ) : (
          <View style={{ gap: 22 }}>{personal}{notifications}{appSettings}{security}</View>
        )}
      </View>

      {cropUri ? <PhotoCropper uri={cropUri} title="Profil şəkli" onCancel={() => setCropUri(null)} onDone={uploadCropped} /> : null}
      {sheet === 'edit' ? <EditProfile me={me} onClose={() => setSheet(null)} onSaved={applyUser} /> : null}
      {sheet === 'password' ? <ChangePassword onClose={() => setSheet(null)} onDone={() => { setSheet(null); logout(); }} /> : null}
      {sheet === 'sessions' ? <Sessions onClose={() => setSheet(null)} /> : null}
      {sheet === 'storage' ? <Storage onClose={() => setSheet(null)} /> : null}
      {sheet === 'groups' ? <GroupSettings onClose={() => setSheet(null)} /> : null}
    </ScrollView>
  );
}
