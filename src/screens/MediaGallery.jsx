import { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Image, Platform, Linking, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, FileText, FileSpreadsheet, File as FileIcon } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { chatApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { absoluteUrl, config } from '../config';
import { ImageViewer } from '../components/ImageViewer';
import { VoiceBubble } from '../components/VoiceBubble';
import { Chip, Button, Empty } from '../components/ui';
import { FadeIn, PressableScale } from '../components/motion';
import { dayLabel, fileSize } from '../lib/format';
import { topPad, bottomPad } from '../lib/safe';

const TABS = [['IMAGE', 'Şəkillər', 'images'], ['FILE', 'Fayllar', 'files'], ['VOICE', 'Səslər', 'voices']];

/** Söhbətin bütün şəkilləri, faylları və səsləri (WhatsApp-dakı «Media, linklər və sənədlər» kimi). */
export function MediaGallery({ id, onBack }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState('IMAGE');
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({ images: 0, files: 0, voices: 0 });
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [err, setErr] = useState('');
  const [viewer, setViewer] = useState(null);
  const [width, setWidth] = useState(360);

  const load = useCallback(async (k, before) => {
    setLoading(true); setErr('');
    try {
      const r = await chatApi.media(id, k, before);
      setCounts({ images: r.images, files: r.files, voices: r.voices });
      setItems((cur) => (before ? [...cur, ...r.items] : r.items));
      setMore(r.items.length >= 60);
    } catch (e) { setErr(errorMessage(e)); } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { setItems([]); load(kind); }, [kind, load]);

  const last = items[items.length - 1]?.attachment.id;
  const cols = width >= 760 ? 6 : width >= 520 ? 5 : 3;
  const gap = 3;
  const cell = Math.floor((Math.min(width, 900) - gap * (cols - 1)) / cols);
  const openFile = (a) => Linking.openURL((a.url.startsWith('http') ? '' : config.apiBaseUrl) + a.url);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: topPad(insets, 0), backgroundColor: colors.header, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, height: 58 }}>
          <Pressable onPress={onBack} hitSlop={10} accessibilityLabel="Geri"><ArrowLeft size={24} color={colors.headerInk} /></Pressable>
          <Text style={{ color: colors.headerInk, fontWeight: '800', fontSize: 19 }}>Media, fayllar və səslər</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 12, paddingBottom: 10 }}>
          {TABS.map(([k, label, key]) => <Chip key={k} label={label} count={counts[key]} active={kind === k} onPress={() => setKind(k)} />)}
        </ScrollView>
      </View>

      <ScrollView onLayout={(e) => setWidth(e.nativeEvent.layout.width)} contentContainerStyle={{ alignItems: 'center', paddingBottom: 40 }}>
        <View style={{ width: '100%', maxWidth: 900 }}>
          {err ? <Text style={{ color: colors.red, padding: 16 }}>{err}</Text> : null}
          {!loading && !items.length && !err ? <Empty title="Burada hələ heç nə yoxdur" sub="Söhbətə göndərilən fayllar burada toplanır" /> : null}

          {kind === 'IMAGE' ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap }}>
              {items.map((it, i) => (
                <FadeIn key={it.attachment.id} delay={Math.min(i, 14) * 25} from="scale" duration={260}>
                  <PressableScale scaleTo={0.94} onPress={() => setViewer({ images: items.map((x) => x.attachment), startId: it.attachment.id })} accessibilityLabel={`Şəkil ${i + 1}`}>
                    <Image source={{ uri: absoluteUrl(it.attachment.thumbUrl || it.attachment.url) }} style={{ width: cell, height: cell, backgroundColor: colors.sunk }} resizeMode="cover" />
                  </PressableScale>
                </FadeIn>
              ))}
            </View>
          ) : null}

          {kind === 'FILE' ? items.map((it, i) => {
            const a = it.attachment;
            const sheet = /sheet|excel|xls/i.test(a.mimeType) || /\.xlsx?$/i.test(a.fileName);
            const Icon = sheet ? FileSpreadsheet : /pdf/i.test(a.mimeType) ? FileText : FileIcon;
            return (
              <FadeIn key={a.id} delay={Math.min(i, 10) * 30} distance={10}>
                <PressableScale onPress={() => openFile(a)} scaleTo={0.98} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderBottomWidth: 1, borderBottomColor: colors.line }}>
                  <View style={{ width: 46, height: 46, borderRadius: 12, backgroundColor: colors.sunk, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon size={24} color={sheet ? colors.green : /pdf/i.test(a.mimeType) ? colors.red : colors.muted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ color: colors.ink, fontWeight: '600', fontSize: 15 }}>{a.fileName}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12.5 }}>{fileSize(a.sizeBytes)} · {it.sender?.fullName} · {dayLabel(it.createdAt)}</Text>
                  </View>
                </PressableScale>
              </FadeIn>
            );
          }) : null}

          {kind === 'VOICE' ? items.map((it, i) => (
            <FadeIn key={it.attachment.id} delay={Math.min(i, 10) * 30} distance={10}>
              <View style={{ padding: 14, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 6 }}>
                <Text style={{ color: colors.muted, fontSize: 12.5 }}>{it.sender?.fullName} · {dayLabel(it.createdAt)}</Text>
                <VoiceBubble attachment={it.attachment} mine={false} />
              </View>
            </FadeIn>
          )) : null}

          {loading ? <ActivityIndicator color={colors.brand} style={{ margin: 24 }} /> : null}
          {more && !loading ? <View style={{ padding: 16 }}><Button variant="ghost" onPress={() => load(kind, last)}>Daha çox göstər</Button></View> : null}
        </View>
      </ScrollView>
      {viewer ? <ImageViewer images={viewer.images} startId={viewer.startId} onClose={() => setViewer(null)} /> : null}
    </View>
  );
}
