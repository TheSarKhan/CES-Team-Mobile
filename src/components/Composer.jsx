import { useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Platform, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Plus, Send, X, Image as ImageIcon, Camera, FileText, CornerUpLeft, Pencil, Mic, Square, ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { ActionSheet } from './ActionSheet';
import { Avatar } from './Avatar';
import { uploadFile } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { sendTyping } from '../realtime/socket';
import { useVoiceRecorder, MAX_VOICE_MS } from '../lib/voice';
import { clock } from './VoiceBubble';

const MENTION_RE = /(^|\s)@([^\s@]*)$/;

/**
 * onSend({ text, attachmentIds, mentionIds, attachments }) → mesaj göndər.
 * onEdit(text) → redaktə rejimində. members: etiket siyahısı.
 */
export function Composer({ conversationId, members, myId, replyTo, onCancelReply, editing, onCancelEdit, onSend, onEdit, onError }) {
  const { colors } = useTheme();
  const [text, setText] = useState('');
  const [atts, setAtts] = useState([]); // {key, uri, name, kind, status, server}
  const [menu, setMenu] = useState(false);
  const [mentions, setMentions] = useState([]); // {id, name}
  const lastTyping = useRef(0);
  const voice = useVoiceRecorder();
  const [voiceBusy, setVoiceBusy] = useState(false);
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
    return (members || [])
      .filter((m) => m.user.id !== myId && m.user.fullName.toLowerCase().includes(query))
      .slice(0, 5);
  }, [query, members, myId, editing]);

  const pickMention = (u) => {
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
  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return onError?.('Kamera icazəsi verilməyib');
    const r = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (!r.canceled) r.assets.forEach((a) => addUpload({ ...a, name: a.fileName || 'foto.jpg' }, 'IMAGE'));
  };
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
    const mentionIds = mentions.filter((m) => t.includes('@' + m.name)).map((m) => m.id);
    const done = atts.filter((a) => a.status === 'done');
    onSend?.({ text: t, attachmentIds: done.map((a) => a.server.id), attachments: done, mentionIds });
    setText('');
    setAtts([]);
    setMentions([]);
  };

  const showMic = !text.trim() && atts.length === 0 && !editing;

  const startVoice = async () => {
    try { await voice.start(); } catch (e) { onError?.(e?.message || 'Səs yazmaq olmadı'); }
  };

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
    } finally { setVoiceBusy(false); }
  };

  // 5 dəqiqə dolanda avtomatik göndər
  if (voice.recording && voice.elapsedMs >= MAX_VOICE_MS && !voiceBusy) setTimeout(sendVoice, 0);

  const cancelEdit = () => { setText(''); onCancelEdit?.(); };

  return (
    <View style={{ backgroundColor: colors.bg }}>
      {suggestions.length > 0 && (
        <View style={{ marginHorizontal: 10, marginBottom: 4, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }}>
          {suggestions.map((m) => (
            <Pressable key={m.user.id} onPress={() => pickMention(m.user)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: pressed ? colors.sunk : 'transparent' })}>
              <Avatar name={m.user.fullName} id={m.user.id} size={30} />
              <Text style={{ color: colors.ink, fontWeight: '600' }}>{m.user.fullName}</Text>
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

      {voice.recording || voiceBusy ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8, paddingBottom: Platform.OS === 'ios' ? 8 : 10 }}>
          <Pressable onPress={sendVoice} disabled={voiceBusy} accessibilityLabel="Dayandır və göndər" style={{ width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: colors.red, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
            {voiceBusy ? <ActivityIndicator color={colors.red} /> : <Square size={18} color={colors.red} fill={colors.red} />}
          </Pressable>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 50, borderRadius: 25, backgroundColor: colors.mine, paddingHorizontal: 14 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.red }} />
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 28 }}>
              {Array.from({ length: 28 }, (_, i) => (
                <View key={i} style={{ flex: 1, height: 28 * (0.25 + 0.75 * Math.abs(Math.sin(voice.elapsedMs / 180 + i * 0.7))), borderRadius: 2, backgroundColor: colors.brand }} />
              ))}
            </View>
            <Text style={{ color: colors.ink, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{voiceBusy ? 'Göndərilir…' : clock(voice.elapsedMs)}</Text>
          </View>
          <Pressable onPress={() => voice.cancel()} disabled={voiceBusy} accessibilityLabel="Ləğv et" style={{ flexDirection: 'row', alignItems: 'center', gap: 2, height: 44, paddingHorizontal: 12, borderRadius: 22, backgroundColor: colors.sunk, opacity: voiceBusy ? 0.5 : 1 }}>
            <ChevronLeft size={16} color={colors.muted} /><Text style={{ color: colors.ink2, fontWeight: '700', fontSize: 13 }}>Ləğv et</Text>
          </Pressable>
        </View>
      ) : (
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 8, paddingBottom: Platform.OS === 'ios' ? 8 : 10 }}>
        <Pressable onPress={() => setMenu(true)} accessibilityLabel="Əlavə et" style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' }}>
          <Plus size={24} color={colors.brand} />
        </Pressable>
        <View style={{ flex: 1, minHeight: 46, maxHeight: 130, borderRadius: 23, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 16, justifyContent: 'center' }}>
          <TextInput
            ref={input}
            value={text}
            onChangeText={onChange}
            placeholder="Mesaj yazın..."
            placeholderTextColor={colors.faint}
            multiline
            style={[{ color: colors.ink, fontSize: 16, paddingVertical: 10, maxHeight: 120 }, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]}
            onKeyPress={(e) => {
              // Web: Enter göndərir, Shift+Enter yeni sətir
              if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.nativeEvent.shiftKey) { e.preventDefault?.(); submit(); }
            }}
          />
        </View>
        {showMic ? (
          <Pressable onPress={startVoice} accessibilityLabel="Səs yaz" style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' }}>
            <Mic size={21} color="#fff" />
          </Pressable>
        ) : (
        <Pressable
          onPress={submit}
          disabled={!canSend}
          accessibilityLabel="Göndər"
          style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: canSend ? colors.forest : colors.sunk, alignItems: 'center', justifyContent: 'center' }}
        >
          {uploading ? <ActivityIndicator color={colors.muted} /> : <Send size={20} color={canSend ? '#fff' : colors.faint} />}
        </Pressable>
        )}
      </View>
      )}

      <ActionSheet
        visible={menu}
        onClose={() => setMenu(false)}
        actions={[
          { label: 'Qalereyadan şəkil', icon: <ImageIcon size={22} color={colors.brand} />, onPress: pickImage },
          ...(Platform.OS !== 'web' ? [{ label: 'Kamera', icon: <Camera size={22} color={colors.brand} />, onPress: takePhoto }] : []),
          { label: 'Fayl (PDF, Excel...)', icon: <FileText size={22} color={colors.brand} />, onPress: pickFile },
        ]}
      />
    </View>
  );
}
