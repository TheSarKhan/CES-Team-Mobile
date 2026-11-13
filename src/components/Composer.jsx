import { useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Platform, Image, ActivityIndicator, PanResponder, Modal, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Plus, Send, X, Image as ImageIcon, Camera, FileText, CornerUpLeft, Pencil, Mic, Pause, Trash2, SquarePlus, ChevronLeft, ChevronUp, Lock, AtSign } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Avatar } from './Avatar';
import { uploadFile } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { sendTyping } from '../realtime/socket';
import { useVoiceRecorder, MAX_VOICE_MS } from '../lib/voice';
import { LiveWave, RecTimer } from './VoiceParts';
import { FadeIn, SpringIn, PopIn, PulseRing, PlusMorph, PressableScale } from './motion';
import { CameraCapture } from './CameraCapture';

const MENTION_RE = /(^|\s)@([^\s@]*)$/;

/**
 * onSend({ text, attachmentIds, mentionIds, attachments }) → mesaj göndər.
 * onEdit(text) → redaktə rejimində. members: etiket siyahısı.
 */
export function Composer({ conversationId, members, canTagAll = false, myId, replyTo, onCancelReply, editing, onCancelEdit, onSend, onEdit, onError, onCreateCard }) {
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [atts, setAtts] = useState([]); // {key, uri, name, kind, status, server}
  const [menu, setMenu] = useState(false);
  const [anchor, setAnchor] = useState(null); // «+» düyməsinin ekrandakı yeri (popup onun üstündə açılır)
  const plusRef = useRef(null);
  const win = useWindowDimensions();
  const openMenu = () => {
    if (menu) { setMenu(false); return; }
    const open = (x, y, w, h) => { setAnchor({ x, y, w, h }); setMenu(true); };
    if (plusRef.current?.measureInWindow) plusRef.current.measureInWindow(open); else open(8, win.height - 70, 46, 46);
  };
  const [camera, setCamera] = useState(false);
  const [mentions, setMentions] = useState([]); // {id, name}
  const [tagAll, setTagAll] = useState(false); // «@Hamı»
  const lastTyping = useRef(0);
  const voice = useVoiceRecorder();
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [vmode, setVmode] = useState('idle'); // idle | hold (basılı saxlanılır) | locked (bir klik — əl azaddır)
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [rowW, setRowW] = useState(360);
  const hold = useRef({ pressAt: 0, startP: null, locked: false }).current;
  const api = useRef({});
  const input = useRef(null);

  // redaktə rejiminə keçəndə mətni doldur
  const editId = editing?.id;
  const prevEdit = useRef(null);
  if (editId !== prevEdit.current) {
    prevEdit.current = editId;
    if (editing) setTimeout(() => setText(editing.text || ''), 0);
  }

  const query = useMemo(() => {
    const m = text.match(MENTION_RE);
    return m ? m[2].toLowerCase() : null;
  }, [text]);

  const suggestions = useMemo(() => {
    if (query === null || editing) return [];
    const people = (members || []).filter((m) => m.user.id !== myId && m.user.fullName.toLowerCase().includes(query));
    // «@Hamı»: qrupun hamısını etiketləyir (kart söhbətində — söhbətdə olmayan qrup üzvləri də daxil)
    const all = canTagAll && ['hamı', 'hami', 'all'].some((w) => w.startsWith(query)) ? [{ all: true, user: { id: 'all', fullName: 'Hamı' } }] : [];
    return [...all, ...people].slice(0, 5);
  }, [query, members, myId, editing, canTagAll]);

  const pickMention = (u) => {
    if (u.id === 'all') { setText((t) => t.replace(MENTION_RE, (_, pre) => `${pre}@Hamı `)); setTagAll(true); input.current?.focus(); return; }
    setText((t) => t.replace(MENTION_RE, (_, pre) => `${pre}@${u.fullName} `));
    setMentions((arr) => (arr.some((x) => x.id === u.id) ? arr : [...arr, { id: u.id, name: u.fullName }]));
    input.current?.focus();
  };

  const onChange = (t) => {
    setText(t);
    const now = Date.now();
    if (t && now - lastTyping.current > 3000) {
      lastTyping.current = now;
      sendTyping(conversationId);
    }
  };

  const addUpload = async (asset, kind) => {
    const key = `${Date.now()}-${Math.random()}`;
    const item = { key, uri: asset.uri, name: asset.name || asset.fileName || (kind === 'IMAGE' ? 'sekil.jpg' : 'fayl'), kind, status: 'uploading' };
    setAtts((a) => [...a, item]);
    try {
      const server = await uploadFile({ uri: asset.uri, name: item.name, mimeType: asset.mimeType || asset.type, kind });
      setAtts((a) => a.map((x) => (x.key === key ? { ...x, status: 'done', server } : x)));
    } catch (e) {
      setAtts((a) => a.filter((x) => x.key !== key));
      onError?.(errorMessage(e, 'Fayl yüklənmədi'));
    }
  };

  const pickImage = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.85 });
    if (!r.canceled) r.assets.forEach((a) => addUpload({ ...a, name: a.fileName }, 'IMAGE'));
  };
  // Kameradan çəkilən şəkil önbaxışdan dərhal (başlıqla) göndərilir
  const sendPhoto = async (asset, caption) => {
    const server = await uploadFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType, kind: 'IMAGE' });
    onSend?.({ text: caption, attachmentIds: [server.id], attachments: [{ server }], mentionIds: [] });
  };
  // Kameradakı qalereya düyməsi: kameranı bağla, seçilən şəkillər mesaj yazısına əlavə olunur
  const galleryFromCamera = () => { setCamera(false); setTimeout(pickImage, 250); };
  const pickFile = async () => {
    const r = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true });
    if (!r.canceled) r.assets.forEach((a) => addUpload(a, 'FILE'));
  };

  const uploading = atts.some((a) => a.status === 'uploading');
  const canSend = !uploading && (text.trim().length > 0 || atts.some((a) => a.status === 'done'));

  const submit = () => {
    if (!canSend) return;
    const t = text.trim();
    if (editing) {
      onEdit?.(t);
      setText('');
      return;
    }
    const all = tagAll && t.includes('@Hamı');
    const mentionIds = all ? (members || []).map((m) => m.user.id).filter((id) => id !== myId) : mentions.filter((m) => t.includes('@' + m.name)).map((m) => m.id);
    const done = atts.filter((a) => a.status === 'done');
    onSend?.({ text: t, attachmentIds: done.map((a) => a.server.id), attachments: done, mentionIds, mentionAll: all });
    setText('');
    setAtts([]);
    setMentions([]);
    setTagAll(false);
  };

  const showMic = !text.trim() && atts.length === 0 && !editing;
  const showCamera = !text.trim() && !editing;
  const cancelDist = Math.min(170, Math.max(90, rowW * 0.42)); // zibil qutusuna çatmaq üçün sola məsafə
  const LOCK_DIST = 78; // yuxarı sürüşdürüb kilidləmək üçün məsafə
  const inCancel = vmode === 'hold' && dx < -cancelDist;
  const lockProgress = vmode === 'hold' ? Math.min(1, Math.max(0, -dy) / LOCK_DIST) : 0;

  const sendVoice = async () => {
    if (voiceBusy) return;
    setVoiceBusy(true);
    try {
      const r = await voice.stop();
      if (!r) return;
      if (r.durationMs < 1000) { onError?.('Səs çox qısadır'); return; }
      const server = await uploadFile({ uri: r.uri, name: r.name, mimeType: r.mimeType, kind: 'VOICE', durationMs: r.durationMs });
      onSend?.({ text: '', attachmentIds: [server.id], attachments: [{ server }], mentionIds: [] });
    } catch (e) {
      onError?.(errorMessage(e, 'Səs göndərilmədi'));
    } finally { setVoiceBusy(false); setVmode('idle'); setDx(0); setDy(0); }
  };
  const cancelVoice = async () => { await voice.cancel(); setVmode('idle'); setDx(0); setDy(0); };

  // Mikrofon düyməsi: basılı saxla → yaz, burax → göndər, sola zibil qutusuna çək → sil; qısa klik → əl azad yazı (kilid)
  api.current = {
    grant: () => {
      hold.pressAt = Date.now();
      hold.locked = false;
      setDx(0); setDy(0);
      setVmode('hold');
      hold.startP = voice.start().then(() => true, (e) => {
        setVmode('idle'); onError?.(e?.message || 'Səs yazmaq olmadı'); return false;
      });
    },
    move: (d, v) => {
      if (hold.locked) return;
      setDx(Math.min(0, d)); setDy(Math.min(0, v));
      // yuxarı kilid zonasına çatdı: əl azad rejimə keç (barmağı buraxmaq lazım deyil)
      if (v < -LOCK_DIST && d > -cancelDist * 0.5) { hold.locked = true; setVmode('locked'); setDx(0); setDy(0); }
    },
    release: async (d, terminated) => {
      if (hold.locked) return;
      const heldMs = Date.now() - hold.pressAt; // mikrofon icazəsi gözləməsi sayılmasın
      if (!(await hold.startP)) return;
      if (terminated || (heldMs < 400 && d > -30)) { setVmode('locked'); setDx(0); return; }
      if (d < -cancelDist) { cancelVoice(); return; }
      sendVoice();
    },
  };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: () => api.current.grant(),
    onPanResponderMove: (_, g) => api.current.move(g.dx, g.dy),
    onPanResponderRelease: (_, g) => api.current.release(g.dx, false),
    onPanResponderTerminate: (_, g) => api.current.release(g.dx, true),
  })).current;

  // 5 dəqiqə dolanda avtomatik göndər
  if (voice.recording && voice.elapsedMs >= MAX_VOICE_MS && !voiceBusy) setTimeout(sendVoice, 0);

  const cancelEdit = () => { setText(''); onCancelEdit?.(); };

  return (
    <View style={{ backgroundColor: colors.bg }}>
      {suggestions.length > 0 && (
        <View style={{ marginHorizontal: 10, marginBottom: 4, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }}>
          {suggestions.map((m) => (
            <Pressable key={m.user.id} onPress={() => pickMention(m.user)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: pressed ? colors.sunk : 'transparent' })}>
              {m.all
                ? <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }}><AtSign size={16} color="#fff" strokeWidth={2.6} /></View>
                : <Avatar name={m.user.fullName} id={m.user.id} uri={m.user.avatarUrl} size={30} />}
              <Text style={{ color: colors.ink, fontWeight: '600' }}>{m.user.fullName}</Text>
              {m.all ? <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}> · bütün qrup üzvlərini etiketlə</Text> : null}
              {m.user.position ? <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={1}> · {m.user.position}</Text> : null}
            </Pressable>
          ))}
        </View>
      )}

      {(replyTo || editing) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 10, marginBottom: 4, padding: 8, borderRadius: 12, backgroundColor: colors.surface, borderLeftWidth: 4, borderLeftColor: colors.brand }}>
          {editing ? <Pencil size={16} color={colors.brand} /> : <CornerUpLeft size={16} color={colors.brand} />}
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.brand, fontWeight: '700', fontSize: 12.5 }}>{editing ? 'Redaktə edilir' : replyTo.sender?.fullName}</Text>
            <Text numberOfLines={1} style={{ color: colors.ink2, fontSize: 13 }}>{(editing || replyTo).text || '📎 Fayl'}</Text>
          </View>
          <Pressable onPress={editing ? cancelEdit : onCancelReply} hitSlop={10}><X size={18} color={colors.muted} /></Pressable>
        </View>
      )}

      {atts.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 10, paddingBottom: 6 }}>
          {atts.map((a) => (
            <View key={a.key} style={{ width: 74, height: 74, borderRadius: 12, backgroundColor: colors.sunk, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {a.kind === 'IMAGE' ? <Image source={{ uri: a.uri }} style={{ width: 74, height: 74 }} /> : (
                <View style={{ alignItems: 'center', padding: 4 }}><FileText size={24} color={colors.muted} /><Text numberOfLines={2} style={{ color: colors.ink2, fontSize: 10.5, textAlign: 'center' }}>{a.name}</Text></View>
              )}
              {a.status === 'uploading' && <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#fff" /></View>}
              <Pressable onPress={() => setAtts((x) => x.filter((y) => y.key !== a.key))} style={{ position: 'absolute', top: 3, right: 3, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}><X size={12} color="#fff" /></Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      {vmode === 'locked' || (vmode === 'idle' && voiceBusy) ? (
        // Əl azad yazı: yuxarıda dalğa və vaxt; aşağıda solda sil, ortada pauza/davam, sağda göndər
        <FadeIn from="bottom" distance={26} style={{ padding: 12, paddingBottom: Platform.OS === 'ios' ? 12 : 14, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 48, borderRadius: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16 }}>
            <RecTimer ms={voice.elapsedMs} paused={voice.paused} />
            <LiveWave levels={voice.levels} dim={voice.paused} />
            {voice.paused ? <Text style={{ color: colors.muted, fontSize: 12.5, fontWeight: '700' }}>Pauza</Text> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6 }}>
            <Pressable onPress={cancelVoice} disabled={voiceBusy} accessibilityRole="button" accessibilityLabel="Sil" style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', opacity: voiceBusy ? 0.5 : 1 }}>
              <Trash2 size={22} color={colors.red} />
            </Pressable>
            <Pressable onPress={voice.paused ? voice.resume : voice.pause} disabled={voiceBusy} accessibilityRole="button" accessibilityLabel={voice.paused ? 'Davam et' : 'Pauza'} style={{ width: 64, height: 64, borderRadius: 32, borderWidth: 2.5, borderColor: colors.red, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', opacity: voiceBusy ? 0.5 : 1 }}>
              {voice.paused ? <Mic size={26} color={colors.red} /> : <Pause size={26} color={colors.red} fill={colors.red} />}
            </Pressable>
            <Pressable onPress={sendVoice} disabled={voiceBusy} accessibilityRole="button" accessibilityLabel="Göndər" style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' }}>
              {voiceBusy ? <ActivityIndicator color="#fff" /> : <Send size={22} color="#fff" />}
            </Pressable>
          </View>
        </FadeIn>
      ) : (
      <View onLayout={(e) => setRowW(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 8, paddingBottom: Platform.OS === 'ios' ? 8 : 10 }}>
        {vmode === 'hold' ? (
          // Kilid göstəricisi: barmağı yuxarı sürüşdürüb bura çatdırınca yazı əl azad rejimə keçir
          <View pointerEvents="none" accessibilityLabel="Kilid" style={{ position: 'absolute', right: 10, bottom: 76, width: 44, height: LOCK_DIST + 44, borderRadius: 22, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, opacity: 0.6 + 0.4 * lockProgress, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 }}>
            <Lock size={19} color={lockProgress > 0.8 ? colors.brand : colors.ink2} />
            <ChevronUp size={19} color={colors.muted} />
          </View>
        ) : null}
        {vmode === 'hold' ? (
          // Basılı saxlanılır: solda zibil qutusu, vaxt, canlı dalğa; barmağı sola sürüşdürüb zibil qutusuna çatdırınca silinir
          <FadeIn from="right" distance={40} duration={240} style={{ flex: 1, alignSelf: 'center' }}>
          <View style={{ height: 50, borderRadius: 25, backgroundColor: colors.surface, borderWidth: 1, borderColor: inCancel ? colors.red : colors.line, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, gap: 10, overflow: 'hidden' }}>
            <View accessibilityLabel="Sil" style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: inCancel ? colors.red : 'transparent', transform: [{ scale: inCancel ? 1.15 : 1 }] }}>
              <Trash2 size={20} color={inCancel ? '#fff' : colors.red} />
            </View>
            <RecTimer ms={voice.elapsedMs} paused={false} />
            <LiveWave levels={voice.levels} height={28} />
            <View style={{ flexDirection: 'row', alignItems: 'center', opacity: Math.max(0, 1 - Math.abs(dx) / cancelDist), paddingRight: 4 }}>
              <ChevronLeft size={16} color={colors.muted} /><Text style={{ color: colors.muted, fontSize: 12.5, fontWeight: '600' }}>Silmək üçün sürüşdürün</Text>
            </View>
          </View>
          </FadeIn>
        ) : (
          <>
            <Pressable ref={plusRef} onPress={openMenu} accessibilityLabel={menu ? 'Bağla' : 'Əlavə et'} style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: menu ? colors.red + '1F' : colors.brandTint, alignItems: 'center', justifyContent: 'center' }}>
              <PlusMorph open={menu} plus={<Plus size={24} color={colors.brand} />} cross={<X size={24} color={colors.red} />} />
            </Pressable>
            <View style={{ flex: 1, minHeight: 46, maxHeight: 130, borderRadius: 23, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, paddingLeft: 16, paddingRight: showCamera ? 4 : 16, flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                ref={input}
                value={text}
                onChangeText={onChange}
                placeholder="Mesaj yazın..."
                placeholderTextColor={colors.faint}
                multiline
                style={[{ flex: 1, color: colors.ink, fontSize: 16, paddingVertical: 10, maxHeight: 120 }, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]}
                onKeyPress={(e) => {
                  // Web: Enter göndərir, Shift+Enter yeni sətir
                  if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) { e.preventDefault?.(); submit(); }
                }}
              />
              {showCamera ? (
                <PopIn>
                  <PressableScale onPress={() => setCamera(true)} hitSlop={6} scaleTo={0.85} accessibilityRole="button" accessibilityLabel="Kamera" style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
                    <Camera size={23} color={colors.muted} />
                  </PressableScale>
                </PopIn>
              ) : null}
            </View>
          </>
        )}
        {showMic || vmode === 'hold' ? (
          // Eyni element basılı saxlama boyu qalır (jest kəsilməsin) — key="mic"
          <View key="mic" {...pan.panHandlers} accessibilityRole="button" accessibilityLabel="Səs yaz" style={{ width: 52, height: 52, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', transform: [{ translateX: vmode === 'hold' ? dx : 0 }, { translateY: vmode === 'hold' ? Math.max(dy, -LOCK_DIST) : 0 }] }}>
            {vmode === 'hold' && !inCancel ? <PulseRing size={60} /> : null}
            <View style={{ width: vmode === 'hold' ? 60 : 46, height: vmode === 'hold' ? 60 : 46, borderRadius: 30, backgroundColor: vmode === 'hold' ? (inCancel ? colors.faint : colors.red) : colors.forest, alignItems: 'center', justifyContent: 'center' }}>
              <Mic size={vmode === 'hold' ? 26 : 21} color="#fff" />
            </View>
          </View>
        ) : (
          <PopIn key="send">
            <PressableScale
              onPress={submit}
              disabled={!canSend}
              scaleTo={0.88}
              accessibilityLabel="Göndər"
              style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: canSend ? colors.forest : colors.sunk, alignItems: 'center', justifyContent: 'center' }}
            >
              {uploading ? <ActivityIndicator color={colors.muted} /> : <Send size={20} color={canSend ? '#fff' : colors.faint} />}
            </PressableScale>
          </PopIn>
        )}
      </View>
      )}

      {camera ? <CameraCapture onClose={() => setCamera(false)} onSend={sendPhoto} onGallery={galleryFromCamera} /> : null}

      {/* «+» düyməsinin üstündə açılan kiçik menyu (WhatsApp kimi); istənilən yerə toxunanda bağlanır */}
      <Modal visible={menu} transparent animationType="none" onRequestClose={() => setMenu(false)} statusBarTranslucent>
        <Pressable onPress={() => setMenu(false)} style={{ flex: 1 }}>
          {anchor ? (
            <SpringIn origin="bottom left" style={{ position: 'absolute', left: Math.max(8, anchor.x), bottom: Math.max(8, win.height - anchor.y + 10), width: 250 }}>
            <View style={{ borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, paddingVertical: 6, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 8 }}>
              {[
                ...(onCreateCard ? [{ label: 'Kart yarat', icon: <SquarePlus size={22} color={colors.brand} />, onPress: onCreateCard }] : []),
                { label: 'Qalereyadan şəkil', icon: <ImageIcon size={22} color={colors.brand} />, onPress: pickImage },
                { label: 'Fayl (PDF, Excel...)', icon: <FileText size={22} color={colors.brand} />, onPress: pickFile },
              ].map((a, i) => (
                <FadeIn key={a.label} delay={60 + i * 55} from="left" distance={12} duration={260}>
                  <Pressable onPress={() => { setMenu(false); setTimeout(() => a.onPress?.(), 120); }} accessibilityRole="button" accessibilityLabel={a.label}
                    style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 16, height: 50, backgroundColor: pressed ? colors.sunk : 'transparent' })}>
                    {a.icon}
                    <Text style={{ color: colors.ink, fontSize: 15.5, fontWeight: '600' }}>{a.label}</Text>
                  </Pressable>
                </FadeIn>
              ))}
            </View>
            </SpringIn>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}
