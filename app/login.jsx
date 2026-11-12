import { useState } from 'react';
import { View, Text, TextInput, Image, KeyboardAvoidingView, Platform, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../src/store/auth';
import { errorMessage } from '../src/api/client';

const palette = { background: '#F8F5EF', ink: '#14291E', green: '#0B913D', muted: '#777A73', border: '#AAA9A1' };

export default function Login() {
  const insets = useSafeAreaInsets();
  const status = useAuthStore((s) => s.status);
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focused, setFocused] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  if (status === 'authenticated') return <Redirect href="/work" />;

  const submit = async () => {
    if (busy) return;
    if (!email.trim() || !password) { setErr('E-poçt və şifrəni daxil edin'); return; }
    setBusy(true);
    setErr('');
    try { await login(email.trim(), password); }
    catch (e) { setErr(errorMessage(e, 'Giriş alınmadı. Yenidən cəhd edin.')); }
    finally { setBusy(false); }
  };

  const inputStyle = (name) => ({
    height: 54, borderWidth: 1, borderRadius: 5,
    borderColor: focused === name ? palette.green : palette.border,
    paddingHorizontal: 16, color: palette.ink, fontSize: 15,
    fontFamily: 'PlusJakartaSans_500Medium', backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: palette.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: 500, flex: 1, backgroundColor: palette.background }}>
          <View style={{ width: '100%', aspectRatio: 852 / 830, overflow: 'hidden', backgroundColor: '#DCE7D0' }}>
            <Image source={require('../assets/illustrations/login-team-source.png')} accessible={false} resizeMode="stretch" style={{ width: '100%', aspectRatio: 852 / 1848 }} />
          </View>
          <View style={{ paddingHorizontal: 28, paddingTop: 24, paddingBottom: Math.max(insets.bottom, 28) }}>
            <Text style={{ color: '#064921', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 31, letterSpacing: -1.5, marginBottom: 24 }}>CES Team</Text>
            <Text style={{ color: palette.ink, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 29, letterSpacing: -1.2 }}>Xoş gəlmisiniz</Text>
            <Text style={{ color: palette.muted, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 14, lineHeight: 22, marginTop: 6, marginBottom: 28 }}>İşləriniz və komandanız bir arada.</Text>
            <TextInput accessibilityLabel="E-poçt" value={email} onChangeText={setEmail} placeholder="E-poçt" placeholderTextColor={palette.muted} autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} style={inputStyle('email')} />
            <TextInput accessibilityLabel="Şifrə" value={password} onChangeText={setPassword} placeholder="Şifrə" placeholderTextColor={palette.muted} secureTextEntry autoComplete="password" onSubmitEditing={submit} onFocus={() => setFocused('password')} onBlur={() => setFocused(null)} style={[inputStyle('password'), { marginTop: 14 }]} />
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: showHelp }} onPress={() => setShowHelp(!showHelp)} style={{ alignSelf: 'flex-end', paddingVertical: 15 }}>
              <Text style={{ color: '#07883B', fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13 }}>Şifrəni unutmusunuz?</Text>
            </Pressable>
            {showHelp ? <Text style={{ color: palette.muted, fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, lineHeight: 19, textAlign: 'right', marginBottom: 16 }}>Şifrənizi bərpa etmək üçün şirkət administratoru ilə əlaqə saxlayın.</Text> : null}
            {err ? <Text accessibilityRole="alert" style={{ color: '#B43E36', fontSize: 13, marginBottom: 12 }}>{err}</Text> : null}
            <Pressable accessibilityRole="button" onPress={submit} disabled={busy} style={({ pressed }) => ({ height: 54, borderRadius: 3, backgroundColor: pressed ? '#0F8A3E' : palette.green, opacity: busy ? 0.7 : 1, justifyContent: 'center', alignItems: 'center', marginTop: 8 })}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15 }}>Daxil olun</Text>}
            </Pressable>
            <Text style={{ textAlign: 'center', color: '#6F756E', fontFamily: 'PlusJakartaSans_400Regular', fontSize: 12, marginTop: 22 }}>ERP hesabınızla daxil olun.</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
