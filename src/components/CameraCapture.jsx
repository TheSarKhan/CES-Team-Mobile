import { useEffect, useRef, useState } from 'react';
import { Modal, View, Text, Pressable, Image, TextInput, ActivityIndicator, Platform, KeyboardAvoidingView, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X, SwitchCamera, Zap, ZapOff, Images, Send, RotateCcw } from 'lucide-react-native';
import { errorMessage } from '../api/client';
import { PressableScale, FadeIn, ND } from './motion';

const BLACK = '#000';
const iconBtn = { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' };

/**
 * WhatsApp tipli kamera: açılan kimi canlı görüntü, arxa/ön kamera dəyişmə, çəkiliş düyməsi, qalereyadan seçim.
 * Çəkiləndən sonra önbaxış (başlıq yazmaq olar) → onSend(asset, caption) göndərir.
 * onGallery: qalereya düyməsi (kamera bağlanır, seçilənlər mesaj yazısına əlavə olunur).
 */
export function CameraCapture({ onClose, onSend, onGallery }) {
  const insets = useSafeAreaInsets();
  const [perm, requestPerm] = useCameraPermissions();
  const cam = useRef(null);
  const [facing, setFacing] = useState('back');
  const [flash, setFlash] = useState('off');
  const [ready, setReady] = useState(false);
  const [shot, setShot] = useState(null); // {uri}
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [mountError, setMountError] = useState('');
  const web = Platform.OS === 'web';
  const flipV = useRef(new Animated.Value(0)).current; // kamera çevriləndə önbaxış vərəq kimi dönür
  const flipBusy = useRef(false);
  const spinV = useRef(new Animated.Value(0)).current; // çevir düyməsinin ikonu
  const flashV = useRef(new Animated.Value(0)).current; // çəkiliş anında ağ parıltı

  // Açılan kimi icazə istə (kamera avtomatik açılsın)
  useEffect(() => { if (perm && !perm.granted && perm.canAskAgain) requestPerm(); }, [perm?.granted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Native-də onCameraReady yenidən işləyir; web-də bu hadisə kamera dəyişəndə təkrarlanmır — qısa gecikmə ilə hazır sayılır
  const flip = () => {
    if (flipBusy.current) return;
    flipBusy.current = true;
    setReady(false);
    Animated.timing(spinV, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: ND }).start(() => spinV.setValue(0));
    // 1) önbaxış 90°-yə qədər dönüb gizlənir, 2) kamera dəyişir, 3) yenidən açılır
    Animated.timing(flipV, { toValue: 1, duration: 190, easing: Easing.in(Easing.quad), useNativeDriver: ND }).start(() => {
      setFacing((f) => (f === 'back' ? 'front' : 'back'));
      if (web) setTimeout(() => setReady(true), 700);
      Animated.timing(flipV, { toValue: 0, duration: 230, easing: Easing.out(Easing.quad), useNativeDriver: ND }).start(() => { flipBusy.current = false; });
    });
  };

  const snap = async () => {
    if (!ready || busy) return;
    setBusy(true); setErr('');
    try {
      flashV.setValue(0.85);
      Animated.timing(flashV, { toValue: 0, duration: 320, useNativeDriver: ND }).start();
      const p = await cam.current?.takePictureAsync({ quality: 0.85, skipProcessing: false });
      if (p?.uri) setShot({ uri: p.uri, width: p.width, height: p.height });
    } catch (e) { setErr(e?.message || 'Şəkil çəkilmədi'); } finally { setBusy(false); }
  };

  const send = async () => {
    setBusy(true); setErr('');
    try {
      await onSend({ uri: shot.uri, name: `foto-${Date.now()}.jpg`, mimeType: 'image/jpeg' }, caption.trim());
      onClose();
    } catch (e) { setErr(errorMessage(e, 'Şəkil göndərilmədi')); setBusy(false); }
  };

  const denied = perm && !perm.granted && !perm.canAskAgain;
  const problem = mountError || (denied ? 'Kamera icazəsi verilməyib. Brauzer və ya telefon ayarlarından icazə verin.' : '');

  return (
    <Modal visible animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: BLACK, alignItems: 'center' }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 720 }}>
          {shot ? (
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <FadeIn from="scale" duration={380} style={{ flex: 1 }}><Image source={{ uri: shot.uri }} resizeMode="contain" style={{ flex: 1 }} /></FadeIn>
              <View style={{ position: 'absolute', top: insets.top + 10, left: 12 }}>
                <Pressable onPress={() => { setShot(null); setCaption(''); setErr(''); }} disabled={busy} accessibilityLabel="Yenidən çək" style={iconBtn}><RotateCcw size={22} color="#fff" /></Pressable>
              </View>
              <View style={{ position: 'absolute', top: insets.top + 10, right: 12 }}>
                <Pressable onPress={onClose} disabled={busy} accessibilityLabel="Bağla" style={iconBtn}><X size={24} color="#fff" /></Pressable>
              </View>
              {err ? <Text style={{ color: '#fecaca', textAlign: 'center', padding: 8 }}>{err}</Text> : null}
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, paddingBottom: (web ? 0 : insets.bottom) + 14, backgroundColor: 'rgba(0,0,0,0.55)' }}>
                <TextInput
                  value={caption} onChangeText={setCaption} placeholder="Başlıq əlavə edin…" placeholderTextColor="#9ca3af" multiline maxLength={1000}
                  style={[{ flex: 1, minHeight: 46, maxHeight: 110, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.16)', color: '#fff', fontSize: 16, paddingHorizontal: 18, paddingVertical: 12 }, web ? { outlineStyle: 'none' } : null]}
                />
                <Pressable onPress={send} disabled={busy} accessibilityRole="button" accessibilityLabel="Göndər" style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#15A34A', alignItems: 'center', justifyContent: 'center', opacity: busy ? 0.7 : 1 }}>
                  {busy ? <ActivityIndicator color="#fff" /> : <Send size={22} color="#fff" />}
                </Pressable>
              </View>
            </KeyboardAvoidingView>
          ) : (
            <View style={{ flex: 1 }}>
              {problem ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 14 }}>
                  <Text style={{ color: '#fff', textAlign: 'center', fontSize: 16, lineHeight: 23 }}>{problem}</Text>
                  {onGallery ? <Pressable onPress={onGallery} style={{ paddingHorizontal: 20, height: 46, borderRadius: 23, backgroundColor: '#15A34A', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: '700' }}>Qalereyadan seç</Text></Pressable> : null}
                </View>
              ) : perm?.granted ? (
                <Animated.View style={{ flex: 1, opacity: flipV.interpolate({ inputRange: [0, 1], outputRange: [1, 0.2] }), transform: [{ perspective: 900 }, { rotateY: flipV.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }] }}>
                <CameraView
                  key={facing} ref={cam} style={{ flex: 1 }} facing={facing} flash={flash} mirror={facing === 'front'}
                  onCameraReady={() => setReady(true)}
                  onMountError={(e) => setMountError(e?.message?.includes?.('NotFound') || /not.?found|device/i.test(String(e?.message)) ? 'Bu cihazda kamera tapılmadı.' : (e?.message || 'Kamera açılmadı.'))}
                />
                </Animated.View>
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#fff" /></View>
              )}

              <Animated.View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff', opacity: flashV }} />

              {/* Yuxarı: bağla + flaş (flaş yalnız telefonda) */}
              <View style={{ position: 'absolute', top: insets.top + 10, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Pressable onPress={onClose} accessibilityLabel="Bağla" style={iconBtn}><X size={24} color="#fff" /></Pressable>
                {!web && facing === 'back' ? (
                  <Pressable onPress={() => setFlash((f) => (f === 'off' ? 'on' : 'off'))} accessibilityLabel="Flaş" style={iconBtn}>
                    {flash === 'on' ? <Zap size={22} color="#facc15" fill="#facc15" /> : <ZapOff size={22} color="#fff" />}
                  </Pressable>
                ) : null}
              </View>

              {/* Aşağı: qalereya · çəkiliş · kameranı çevir */}
              <View style={{ position: 'absolute', left: 0, right: 0, bottom: (web ? 0 : insets.bottom) + 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 20 }}>
                <Pressable onPress={onGallery} accessibilityLabel="Qalereya" style={iconBtn}><Images size={22} color="#fff" /></Pressable>
                <PressableScale onPress={snap} disabled={!ready || busy || !!problem} scaleTo={0.86} accessibilityRole="button" accessibilityLabel="Şəkil çək"
                  style={{ width: 78, height: 78, borderRadius: 39, borderWidth: 5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', opacity: ready && !problem ? 1 : 0.5 }}>
                  {busy ? <ActivityIndicator color="#fff" /> : <View style={{ width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' }} />}
                </PressableScale>
                <PressableScale onPress={flip} scaleTo={0.88} accessibilityLabel="Kameranı çevir" style={iconBtn}>
                  <Animated.View style={{ transform: [{ rotate: spinV.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}><SwitchCamera size={22} color="#fff" /></Animated.View>
                </PressableScale>
              </View>
              {err ? <Text style={{ position: 'absolute', bottom: insets.bottom + 120, alignSelf: 'center', color: '#fecaca' }}>{err}</Text> : null}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
