import { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, Image } from 'react-native';
import { Download, Smartphone, Laptop, Share, SquarePlus, EllipsisVertical, X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';

// APK serverdə /var/www/team-downloads/ces-team.apk (nginx /download/ yolu ilə verilir).
const APK_URL = '/download/ces-team.apk';

// Chrome/Edge "beforeinstallprompt" komponent qoşulmamışdan əvvəl də gələ bilər — modul səviyyəsində saxlanır.
let deferred = null;
const subs = new Set();
if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    const reg = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
    if (document.readyState === 'complete') reg();
    else window.addEventListener('load', reg);
  }
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; subs.forEach((fn) => fn()); });
  window.addEventListener('appinstalled', () => { deferred = null; subs.forEach((fn) => fn()); });
}

function detect() {
  const ua = navigator.userAgent || '';
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const standalone = !!window.matchMedia?.('(display-mode: standalone)')?.matches || navigator.standalone === true;
  const iosNotSafari = ios && /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  const desktop = !ios && !android;
  const firefox = /Firefox\//.test(ua);
  const edge = /Edg\//.test(ua);
  const safari = /Safari\//.test(ua) && !/Chrome|Chromium|CriOS|Edg\/|OPR\/|Firefox/.test(ua);
  return { ios, android, standalone, iosNotSafari, desktop, firefox, edge, safari };
}

function B({ children }) {
  return <Text style={{ fontWeight: '700' }}>{children}</Text>;
}

function StepRow({ n, icon, children }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
      <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandTint }}>
        <Text style={{ fontWeight: '700', fontSize: 13, color: colors.brand }}>{n}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontSize: 14, lineHeight: 20, color: colors.ink }}>{children}</Text>
      </View>
      {icon}
    </View>
  );
}

export default function InstallApp() {
  const { colors } = useTheme();
  const [env, setEnv] = useState(null);
  const [, setCanPrompt] = useState(false);
  const [open, setOpen] = useState(false);
  const [apkOk, setApkOk] = useState(false); // APK serverdə varsa düymə göstərilir (sınıq link olmasın)

  useEffect(() => {
    let alive = true;
    fetch(APK_URL, { method: 'HEAD', cache: 'no-store' })
      .then((r) => alive && setApkOk(r.ok && !/html/i.test(r.headers.get('content-type') || '')))
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const sync = () => { setCanPrompt(!!deferred); setEnv(detect()); };
    sync();
    subs.add(sync);
    return () => subs.delete(sync);
  }, []);

  if (!env || env.standalone) return null; // artıq ana ekrandan açılıb

  const onShortcut = async () => {
    if (deferred) {
      try { await deferred.prompt(); await deferred.userChoice; deferred = null; setCanPrompt(false); return; } catch { /* təlimata keç */ }
    }
    setOpen(true);
  };

  const btn = { minHeight: 48, borderRadius: 12, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 16 };
  const ink = colors.brandDk;
  const title = env.desktop ? 'Kompüterə qısayol əlavə et' : 'Ekrana qısayol əlavə et';
  const Dev = env.desktop ? Laptop : Smartphone;

  return (
    <View style={{ marginTop: 8, marginBottom: 24, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
        <Text style={{ fontWeight: '600', fontSize: 12, color: colors.muted }}>Tətbiq kimi istifadə edin</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: colors.line }} />
      </View>

      {!env.ios && apkOk && (
        <a href={APK_URL} download="CES-Team.apk" aria-label="Android tətbiqini yüklə (APK)" style={{ textDecoration: 'none' }}>
          <View style={btn}>
            <Download size={18} color={ink} strokeWidth={1.75} />
            <Text style={{ fontWeight: '600', fontSize: 14, color: ink }}>Android tətbiqini yüklə (APK)</Text>
          </View>
        </a>
      )}

      <Pressable onPress={onShortcut} accessibilityRole="button" accessibilityLabel={title} style={btn}>
        <Dev size={18} color={ink} strokeWidth={1.75} />
        <Text style={{ fontWeight: '600', fontSize: 14, color: ink }}>{title}</Text>
      </Pressable>

      {!env.ios && env.android && apkOk && (
        <Text style={{ textAlign: 'center', fontSize: 11.5, lineHeight: 16, color: colors.muted }}>
          APK-nı açanda Android "naməlum mənbələrdən quraşdırma" icazəsi istəyə bilər.
        </Text>
      )}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 16 }}>
          <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} onPress={() => setOpen(false)} accessibilityLabel="Bağla" />
          <View accessibilityRole="dialog" style={{ width: '100%', maxWidth: 420, gap: 18, borderRadius: 24, backgroundColor: colors.surface, padding: 24 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 58, height: 58 }}>
                <Image source={{ uri: '/apple-touch-icon.png' }} accessibilityLabel="CES Team ikonu" style={{ width: 52, height: 52, borderRadius: 12 }} />
                <View style={{ position: 'absolute', right: -6, bottom: -6, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}>
                  <Dev size={18} color={ink} strokeWidth={2} />
                </View>
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text accessibilityRole="header" style={{ fontWeight: '700', fontSize: 17, color: colors.ink }}>{title}</Text>
                <Text style={{ fontSize: 12.5, color: colors.muted }}>CES Team</Text>
              </View>
              <Pressable onPress={() => setOpen(false)} accessibilityRole="button" accessibilityLabel="Bağla" style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sunk }}>
                <X size={18} color={colors.ink} />
              </Pressable>
            </View>

            {env.ios ? (
              <View style={{ gap: 14 }}>
                <StepRow n={1} icon={<Share size={20} color={colors.blue} strokeWidth={1.75} />}>Aşağıdakı paneldə <B>Paylaş</B> düyməsinə toxunun.</StepRow>
                <StepRow n={2} icon={<SquarePlus size={20} color={colors.ink2} strokeWidth={1.75} />}>Siyahını yuxarı sürüşdürüb <B>Ana ekrana əlavə et</B> seçin.</StepRow>
                <StepRow n={3}>Sağ yuxarıda <B>Əlavə et</B> düyməsinə toxunun. İkon ana ekranda görünəcək. Sonra ikondan açıb Profil → <B>Bildirişləri aç</B> edin.</StepRow>
                {env.iosNotSafari && <Text style={{ fontSize: 12, lineHeight: 16, color: colors.muted }}>Paylaş menyusunda seçim görünmürsə, saytı Safari-də açın.</Text>}
              </View>
            ) : env.desktop && env.safari ? (
              <View style={{ gap: 14 }}>
                <StepRow n={1}>Ekranın yuxarısındakı menyu zolağında <B>Fayl</B> menyusunu açın.</StepRow>
                <StepRow n={2}><B>Dock-a əlavə et…</B> seçin.</StepRow>
                <StepRow n={3}><B>Əlavə et</B> düyməsinə basın. Tətbiq Dock-da CES ikonu ilə görünəcək.</StepRow>
                <Text style={{ fontSize: 12, lineHeight: 16, color: colors.muted }}>Bu seçim macOS Sonoma (14) və daha yeni versiyalarda var. Əks halda Chrome və ya Edge istifadə edin.</Text>
              </View>
            ) : env.desktop && env.firefox ? (
              <View style={{ gap: 14 }}>
                <Text style={{ fontSize: 14, lineHeight: 20, color: colors.ink }}>Firefox saytı tətbiq kimi quraşdırmağı dəstəkləmir.</Text>
                <StepRow n={1}>Saytı <B>Chrome</B> və ya <B>Edge</B> ilə açın və bu düyməyə yenidən basın.</StepRow>
                <StepRow n={2}>Və ya <B>Ctrl+D</B> (Mac-də <B>⌘+D</B>) ilə əlfəcin əlavə edin.</StepRow>
              </View>
            ) : env.desktop ? (
              <View style={{ gap: 14 }}>
                <StepRow n={1}>Ünvan sətrinin sağında <B>Quraşdır</B> ikonuna (⊕) klikləyin.</StepRow>
                <StepRow n={2}>Görünmürsə, brauzer menyusunda (<B>⋮</B> və ya <B>⋯</B>) {env.edge ? <B>Tətbiqlər → Bu saytı tətbiq kimi quraşdır</B> : <B>Yayımla və saxla → Saytı tətbiq kimi quraşdır</B>} seçin.</StepRow>
                <StepRow n={3}>Təsdiqləyin. Qısayol masaüstünə və ya Dock-a düşəcək.</StepRow>
              </View>
            ) : (
              <View style={{ gap: 14 }}>
                <StepRow n={1} icon={<EllipsisVertical size={20} color={colors.ink2} strokeWidth={1.75} />}>Brauzerin menyusunu açın (sağ yuxarıda <B>⋮</B>).</StepRow>
                <StepRow n={2}><B>Ana ekrana əlavə et</B> və ya <B>Tətbiqi quraşdır</B> seçin.</StepRow>
                <StepRow n={3}>Təsdiqləyin. Qısayol ana ekranda görünəcək.</StepRow>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
