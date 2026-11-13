import { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Image, Pressable, PanResponder, ActivityIndicator, Platform, useWindowDimensions } from 'react-native';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { X, RotateCw, ZoomIn, ZoomOut, Check } from 'lucide-react-native';

const MAX_ZOOM = 4;

/**
 * Profil şəklini kəsmək: şəkli sürüşdürüb (barmaq/siçan), yaxınlaşdırıb (sürgü, +/−, siçan təkəri), döndərib dairə çərçivəsinə sal.
 * «Yadda saxla» kvadrat 512×512 JPEG qaytarır (avatar özü dairə kimi göstərilir).
 */
export function PhotoCropper({ uri, title = 'Şəkli düzəlt', onDone, onCancel }) {
  const { width } = useWindowDimensions();
  const V = Math.min(340, width - 40); // çərçivənin ölçüsü
  const [src, setSrc] = useState(null); // {uri, w, h}
  const [zoom, setZoom] = useState(1);
  const [off, setOff] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const st = useRef({ zoom: 1, off: { x: 0, y: 0 }, start: { x: 0, y: 0 }, src: null }).current;
  st.zoom = zoom; st.off = off; st.src = src;

  const base = src ? V / Math.min(src.w, src.h) : 1;
  const clamp = (o, z, s = src) => {
    if (!s) return o;
    const sc = (V / Math.min(s.w, s.h)) * z;
    const mx = Math.max(0, (s.w * sc - V) / 2), my = Math.max(0, (s.h * sc - V) / 2);
    return { x: Math.min(mx, Math.max(-mx, o.x)), y: Math.min(my, Math.max(-my, o.y)) };
  };
  const setZoomSafe = (z) => { const nz = Math.min(MAX_ZOOM, Math.max(1, z)); setZoom(nz); setOff((o) => clamp(o, nz)); };

  useEffect(() => {
    let live = true;
    Image.getSize(uri, (w, h) => { if (live) setSrc({ uri, w, h }); }, () => { if (live) setErr('Şəkil açılmadı'); });
    return () => { live = false; };
  }, [uri]);

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { st.start = { ...st.off }; },
    onPanResponderMove: (_, g) => setOff(clamp({ x: st.start.x + g.dx, y: st.start.y + g.dy }, st.zoom, st.src)),
  })).current;

  // yaxınlaşdırma sürgüsü
  const TRACK = Math.min(220, V - 90);
  const slider = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: (e) => setZoomSafe(1 + (Math.min(TRACK, Math.max(0, e.nativeEvent.locationX)) / TRACK) * (MAX_ZOOM - 1)),
    onPanResponderMove: (e) => setZoomSafe(1 + (Math.min(TRACK, Math.max(0, e.nativeEvent.locationX)) / TRACK) * (MAX_ZOOM - 1)),
  })).current;

  const rotate = async () => {
    if (!src || busy) return;
    setBusy(true); setErr('');
    try {
      const r = await manipulateAsync(src.uri, [{ rotate: 90 }], { format: SaveFormat.JPEG, compress: 0.95 });
      setSrc({ uri: r.uri, w: r.width, h: r.height });
      setOff({ x: 0, y: 0 });
    } catch (e) { setErr('Şəkil döndərilmədi'); } finally { setBusy(false); }
  };

  const save = async () => {
    if (!src || busy) return;
    setBusy(true); setErr('');
    try {
      const s = base * zoom;
      const size = Math.floor(V / s);
      const ox = Math.round(Math.min(src.w - size, Math.max(0, src.w / 2 - off.x / s - size / 2)));
      const oy = Math.round(Math.min(src.h - size, Math.max(0, src.h / 2 - off.y / s - size / 2)));
      const r = await manipulateAsync(src.uri, [{ crop: { originX: ox, originY: oy, width: size, height: size } }, { resize: { width: 512, height: 512 } }], { format: SaveFormat.JPEG, compress: 0.9 });
      onDone(r.uri);
    } catch (e) { setErr('Şəkil kəsilmədi. Başqa şəkil seçin.'); setBusy(false); }
  };

  const dispW = src ? src.w * base * zoom : V, dispH = src ? src.h * base * zoom : V;
  const B = V * 0.25;
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <View style={{ width: V, flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ flex: 1, color: '#fff', fontWeight: '800', fontSize: 19 }}>{title}</Text>
          <Pressable onPress={onCancel} hitSlop={10} accessibilityLabel="Bağla"><X size={24} color="#fff" /></Pressable>
        </View>

        <View {...pan.panHandlers} {...(Platform.OS === 'web' ? { onWheel: (e) => setZoomSafe(st.zoom + (e.deltaY < 0 ? 0.15 : -0.15)) } : {})}
          style={{ width: V, height: V, overflow: 'hidden', backgroundColor: '#111', borderRadius: 4, alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Kəsmə sahəsi">
          {src ? (
            <Image source={{ uri: src.uri }} resizeMode="cover" style={{ position: 'absolute', width: dispW, height: dispH, left: (V - dispW) / 2 + off.x, top: (V - dispH) / 2 + off.y }} />
          ) : <ActivityIndicator color="#fff" />}
          {/* Dairə çərçivəsi: xaricdəki hissə tündləşir */}
          <View pointerEvents="none" style={{ position: 'absolute', left: -B, top: -B, width: V + 2 * B, height: V + 2 * B, borderRadius: (V + 2 * B) / 2, borderWidth: B, borderColor: 'rgba(0,0,0,0.62)' }} />
          <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: V, height: V, borderRadius: V / 2, borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)' }} />
        </View>

        <View style={{ width: V, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 18 }}>
          <Pressable onPress={() => setZoomSafe(zoom - 0.4)} hitSlop={8} accessibilityLabel="Uzaqlaşdır"><ZoomOut size={22} color="#fff" /></Pressable>
          <View {...slider.panHandlers} style={{ width: TRACK, height: 34, justifyContent: 'center' }} accessibilityLabel="Yaxınlaşdırma">
            <View pointerEvents="none" style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' }} />
            <View pointerEvents="none" style={{ position: 'absolute', height: 4, borderRadius: 2, backgroundColor: '#22C55E', width: ((zoom - 1) / (MAX_ZOOM - 1)) * TRACK }} />
            <View pointerEvents="none" style={{ position: 'absolute', left: ((zoom - 1) / (MAX_ZOOM - 1)) * TRACK - 10, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' }} />
          </View>
          <Pressable onPress={() => setZoomSafe(zoom + 0.4)} hitSlop={8} accessibilityLabel="Yaxınlaşdır"><ZoomIn size={22} color="#fff" /></Pressable>
          <View style={{ flex: 1 }} />
          <Pressable onPress={rotate} disabled={busy} hitSlop={8} accessibilityLabel="Döndər"><RotateCw size={22} color="#fff" /></Pressable>
        </View>

        {err ? <Text style={{ color: '#fecaca', marginTop: 10 }}>{err}</Text> : null}
        <View style={{ width: V, flexDirection: 'row', gap: 10, marginTop: 18 }}>
          <Pressable onPress={onCancel} disabled={busy} accessibilityRole="button" style={{ flex: 1, height: 50, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Ləğv et</Text>
          </Pressable>
          <Pressable onPress={save} disabled={busy || !src} accessibilityRole="button" accessibilityLabel="Kəs və yadda saxla" style={{ flex: 1.4, height: 50, borderRadius: 14, backgroundColor: '#15A34A', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, opacity: busy || !src ? 0.6 : 1 }}>
            {busy ? <ActivityIndicator color="#fff" /> : <><Check size={18} color="#fff" /><Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Yadda saxla</Text></>}
          </Pressable>
        </View>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12.5, marginTop: 12 }}>Şəkli sürüşdürün, sürgü ilə yaxınlaşdırın</Text>
      </View>
    </Modal>
  );
}
