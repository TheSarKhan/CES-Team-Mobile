import { useState } from 'react';
import { View, Text, TextInput, Image, KeyboardAvoidingView, Platform, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, LockKeyhole, Eye, EyeOff, ArrowRight } from 'lucide-react-native';
import { useTheme } from '../src/theme/ThemeProvider';
import { useAuthStore } from '../src/store/auth';
import { errorMessage } from '../src/api/client';

export default function Login() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const status = useAuthStore((s) => s.status);
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [focused, setFocused] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  if (status === 'authenticated') return <Redirect href="/work" />;

  const submit = async () => {
    if (busy) return;
    if (!email.trim() || !password) { setErr('E-poçt və şifrəni daxil edin'); return; }
    setBusy(true);
    setErr('');
    try {
      await login(email.trim(), password);
    } catch (e) {
      setErr(errorMessage(e, 'Giriş alınmadı. Yenidən cəhd edin.'));
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = {
    flex: 1, height: 54, color: colors.ink, fontSize: 15,
    fontFamily: 'PlusJakartaSans_500Medium',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  };
  const inputBox = (name) => ({
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 15, borderRadius: 14, borderWidth: 1,
    borderColor: focused === name ? colors.brand : colors.line,
    backgroundColor: colors.surfaceAlt,
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, alignItems: 'center', paddingBottom: Math.max(insets.bottom, 20) }}>
        <View style={{ width: '100%', maxWidth: 500, flex: 1 }}>
          <View style={{ backgroundColor: '#103E31', paddingTop: Math.max(insets.top + 18, 32), paddingHorizontal: 26, overflow: 'hidden', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
            <View style={{ position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: '#174D3C', right: -92, top: -80 }} />
            <View style={{ position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 1, borderColor: '#2B6552', left: -92, bottom: 12 }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Image source={require('../assets/ces-logo-white.png')} style={{ width: 112, height: 42 }} resizeMode="contain" />
              <View style={{ width: 1, height: 26, backgroundColor: '#568373' }} />
              <Text style={{ color: '#fff', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18 }}>Team</Text>
            </View>
            <Text style={{ color: '#D7F4E1', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 13, marginTop: 20 }}>CES KOMANDASI</Text>
            <Text style={{ color: '#fff', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 27, lineHeight: 35, marginTop: 5 }}>İşləriniz bir yerdə.</Text>
            <Text style={{ color: '#BBD7CA', fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, lineHeight: 21, marginTop: 5 }}>Komandanızla əlaqədə qalın, işlərinizi rahat izləyin.</Text>
            <Image source={require('../assets/illustrations/login-hero.png')} style={{ alignSelf: 'center', width: '100%', height: 175, marginTop: 4 }} resizeMode="contain" />
          </View>

          <View style={{ paddingHorizontal: 24, paddingTop: 24, paddingBottom: 12, gap: 16 }}>
            <View style={{ gap: 5 }}>
              <Text style={{ color: colors.ink, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 24 }}>Xoş gəlmisiniz</Text>
              <Text style={{ color: colors.muted, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, lineHeight: 21 }}>Davam etmək üçün ERP hesabınıza daxil olun.</Text>
            </View>
            <View style={{ gap: 6 }}>
              <Text style={{ color: colors.ink2, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 }}>E-poçt</Text>
              <View style={inputBox('email')}>
                <Mail size={19} color={focused === 'email' ? colors.brand : colors.muted} />
                <TextInput accessibilityLabel="E-poçt" value={email} onChangeText={setEmail} placeholder="E-poçtunuzu daxil edin" placeholderTextColor={colors.faint} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} style={inputStyle} />
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <Text style={{ color: colors.ink2, fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 }}>Şifrə</Text>
              <View style={inputBox('password')}>
                <LockKeyhole size={19} color={focused === 'password' ? colors.brand : colors.muted} />
                <TextInput accessibilityLabel="Şifrə" value={password} onChangeText={setPassword} placeholder="Şifrənizi daxil edin" placeholderTextColor={colors.faint} secureTextEntry={!visible} autoComplete="password" onSubmitEditing={submit} onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} style={inputStyle} />
                <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Şifrəni gizlət' : 'Şifrəni göstər'} onPress={() => setVisible(!visible)} hitSlop={10}>
                  {visible ? <EyeOff size={19} color={colors.muted} /> : <Eye size={19} color={colors.muted} />}
                </Pressable>
              </View>
            </View>
            {err ? <Text accessibilityRole="alert" style={{ color: colors.red, fontSize: 13 }}>{err}</Text> : null}
            <Pressable accessibilityRole="button" onPress={submit} disabled={busy} style={({ pressed }) => ({ height: 54, borderRadius: 14, backgroundColor: pressed ? colors.brandDk : colors.brand, opacity: busy ? 0.7 : 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 })}>
              {busy ? <ActivityIndicator color="#fff" /> : <><Text style={{ color: '#fff', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>Daxil ol</Text><ArrowRight size={18} color="#fff" /></>}
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
