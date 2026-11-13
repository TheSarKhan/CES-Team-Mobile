import { useEffect, useRef, useState } from 'react';
import { View, Text, Image, useWindowDimensions } from 'react-native';
import LoginScreen from '../src/screens/LoginScreen';
import InstallApp from '../src/components/InstallApp';
import { FadeIn } from '../src/components/motion';
import { useTheme } from '../src/theme/ThemeProvider';

// Bu enişdən geniş ekranda: solda brend paneli, sağda giriş forması. Dar ekranda (telefon brauzeri) mobil dizayn.
const SPLIT_BREAKPOINT = 900;
// Fon: public/login-bg.mp4 (video) və public/login-poster.jpg (şəkil). Video yoxdursa və ya yüklənməsə şəkil/gradient qalır.
// Yalnız şəkil istəyirsinizsə login-bg.mp4 faylını silin.
const VIDEO_SRC = '/login-bg.mp4';
const POSTER_SRC = '/login-poster.jpg';
const HIGHLIGHTS = ['Söhbət', 'İş kartları', 'Bildirişlər'];
const LOGO = require('../assets/ces-logo-white.png');
const LOGO_H = 58;
const LOGO_W = Math.round((477 / 171) * LOGO_H);

function BrandPanel() {
  const videoRef = useRef(null);
  const [videoOk, setVideoOk] = useState(true);

  // Hərəkəti azaltmaq istəyən istifadəçilər üçün video dayandırılır
  useEffect(() => {
    const v = videoRef.current;
    if (v && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches) v.pause();
  }, [videoOk]);

  return (
    <View
      style={{
        flex: 1.15,
        overflow: 'hidden',
        backgroundColor: '#15A34A',
        // şəkil/video olmasa da qəşəng görünsün
        backgroundImage: `linear-gradient(135deg, #22C55E 0%, #15A34A 50%, #0F8A3E 100%)`,
      }}
    >
      {/* Şəkil (poster): video yüklənənə qədər və ya video olmasa fon kimi qalır */}
      <img
        src={POSTER_SRC}
        alt=""
        aria-hidden="true"
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 50%' }}
      />
      {videoOk && (
        <video
          ref={videoRef}
          src={VIDEO_SRC}
          poster={POSTER_SRC}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          onError={() => setVideoOk(false)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 50%' }}
        />
      )}
      {/* Mətnin oxunması üçün tünd örtük */}
      <View
        style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0.38) 0%, rgba(0,0,0,0.08) 38%, rgba(0,0,0,0.62) 100%)',
        }}
      />

      <View style={{ flex: 1, padding: 48, justifyContent: 'space-between' }}>
        <FadeIn from="left" distance={24} delay={150} duration={700} style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}>
          <Image source={LOGO} accessibilityLabel="Construction Equipment Services" style={{ width: LOGO_W, height: LOGO_H }} resizeMode="contain" />
          <View style={{ width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.35)' }} />
          <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, letterSpacing: 3.5, fontFamily: 'PlusJakartaSans_600SemiBold' }}>TEAM</Text>
        </FadeIn>

        <View style={{ maxWidth: 520 }}>
          <FadeIn delay={450} distance={30} duration={800}><Text style={{ color: '#fff', fontSize: 38, lineHeight: 46, fontFamily: 'PlusJakartaSans_700Bold' }}>Komandanın bütün işi bir yerdə</Text></FadeIn>
          <FadeIn delay={650} distance={24} duration={800}><Text style={{ marginTop: 12, color: 'rgba(255,255,255,0.82)', fontSize: 16, lineHeight: 24, fontFamily: 'PlusJakartaSans_500Medium' }}>
            Sorğular, sifarişlər, yanacaq, arıza və ödənişlər — söhbət və kartlarla, bildirişi qaçırmadan.
          </Text></FadeIn>
          <View style={{ marginTop: 32, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', rowGap: 8 }}>
            {HIGHLIGHTS.map((label, i) => (
              <FadeIn key={label} delay={900 + i * 150} distance={10} style={{ flexDirection: 'row', alignItems: 'center' }}>
                {i > 0 && <View style={{ width: 1, height: 14, marginHorizontal: 18, backgroundColor: 'rgba(255,255,255,0.3)' }} />}
                <Text style={{ color: 'rgba(255,255,255,0.88)', fontSize: 14, fontFamily: 'PlusJakartaSans_600SemiBold' }}>{label}</Text>
              </FadeIn>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

export default function LoginWeb() {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();

  if (width < SPLIT_BREAKPOINT) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' }}>
          <LoginScreen footer={<InstallApp />} />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, flexDirection: 'row', backgroundColor: colors.bg }}>
      <BrandPanel />
      <View style={{ flex: 1, minWidth: 420, maxWidth: 640, backgroundColor: colors.bg }}>
        <View style={{ flex: 1, width: '100%', maxWidth: 440, alignSelf: 'center' }}>
          <LoginScreen hideHeader footer={<InstallApp />} />
        </View>
      </View>
    </View>
  );
}
