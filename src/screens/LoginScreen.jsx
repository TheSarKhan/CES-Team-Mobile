import { useState } from 'react';
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mail, Lock, ArrowRight, ShieldCheck, AlertCircle, Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { FadeIn, PressableScale } from '../components/motion';
import { useAuthStore } from '../store/auth';
import { errorMessage } from '../api/client';

const LOGO = require('../../assets/ces-logo-white.png');
const web = Platform.OS === 'web' ? { outlineStyle: 'none' } : null;

// hideHeader: geniş web ekranında sol brend paneli olduqda yaşıl başlıq göstərilmir.
// footer: formun altında (web: "Tətbiq kimi istifadə edin" düymələri).
export default function LoginScreen({ hideHeader = false, footer = null }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const status = useAuthStore((s) => s.status);
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (status === 'authenticated') return <Redirect href="/chats" />;

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  const onSubmit = async () => {
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      // Uğurlu: status 'authenticated' olur və bu ekran /chats-a yönləndirir
    } catch (e) {
      setError(errorMessage(e, 'E-poçt və ya şifrə yanlışdır.'));
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {!hideHeader && (
          <LinearGradient
            colors={['#15A34A', '#0F8A3E']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.6, y: 1 }}
            style={{ paddingTop: Platform.OS === 'web' ? 72 : insets.top + 40, paddingBottom: 34, paddingHorizontal: 28, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, overflow: 'hidden' }}
          >
            <Image source={LOGO} accessibilityLabel="CES Team" style={{ width: 168, height: 60 }} resizeMode="contain" />
            <Text style={{ marginTop: 4, color: '#fff', fontFamily: 'PlusJakartaSans_700Bold', fontSize: 24 }}>CES Team</Text>
            <Text style={{ marginTop: 6, color: 'rgba(255,255,255,0.82)', fontSize: 14, lineHeight: 20 }}>İş söhbətləri, kartlar və bildirişlər — bir yerdə.</Text>
          </LinearGradient>
        )}

        <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: hideHeader ? 0 : 28, justifyContent: hideHeader ? 'center' : 'flex-start' }}>
          <FadeIn delay={100}>
            <Text style={{ color: colors.ink, fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20 }}>Daxil ol</Text>
            <Text style={{ marginTop: 4, color: colors.muted, fontSize: 13.5 }}>ERP hesabınızın e-poçt və şifrəsi ilə daxil olun.</Text>
          </FadeIn>

          <FadeIn delay={220} style={{ marginTop: 24 }}>
            <Field label="E-poçt" icon={<Mail size={18} color={colors.faint} />}>
              <TextInput
                value={email}
                onChangeText={(t) => { setEmail(t); setError(''); }}
                placeholder="ad@sirket.az"
                placeholderTextColor={colors.faint}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                accessibilityLabel="E-poçt"
                style={[{ flex: 1, color: colors.ink, fontSize: 14.5, fontWeight: '500', paddingVertical: 0 }, web]}
              />
            </Field>
          </FadeIn>

          <FadeIn delay={320} style={{ marginTop: 14 }}>
            <Field label="Şifrə" icon={<Lock size={18} color={error ? colors.red : colors.faint} />} error={!!error}>
              <TextInput
                value={password}
                onChangeText={(t) => { setPassword(t); setError(''); }}
                placeholder="Şifrə"
                placeholderTextColor={colors.faint}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="password"
                onSubmitEditing={onSubmit}
                accessibilityLabel="Şifrə"
                style={[{ flex: 1, color: colors.ink, fontSize: 14.5, fontWeight: '500', paddingVertical: 0 }, web]}
              />
              <Pressable hitSlop={8} onPress={() => setShowPass((v) => !v)} accessibilityLabel={showPass ? 'Şifrəni gizlət' : 'Şifrəni göstər'}>
                {showPass ? <EyeOff size={18} color={colors.faint} /> : <Eye size={18} color={colors.faint} />}
              </Pressable>
            </Field>
          </FadeIn>

          {error ? (
            <View accessibilityRole="alert" style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <AlertCircle size={15} color={colors.red} />
              <Text style={{ flex: 1, color: colors.red, fontWeight: '600', fontSize: 12.5 }}>{error}</Text>
            </View>
          ) : (
            <Text style={{ marginTop: 12, alignSelf: 'flex-end', color: colors.muted, fontSize: 12 }}>Şifrəni unutmusunuzsa ERP administratoru ilə əlaqə saxlayın.</Text>
          )}

          <FadeIn delay={440} distance={18}>
          <PressableScale
            onPress={onSubmit}
            disabled={!canSubmit}
            scaleTo={0.97}
            accessibilityRole="button"
            accessibilityLabel="Daxil ol"
            style={{ marginTop: 24, height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 16, backgroundColor: canSubmit ? colors.brand : colors.brand + '80' }}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Daxil ol</Text>
                <ArrowRight size={18} color="#fff" />
              </>
            )}
          </PressableScale>
          </FadeIn>

          <View style={{ marginTop: 20, marginBottom: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <ShieldCheck size={13} color={colors.faint} />
            <Text style={{ color: colors.faint, fontSize: 12 }}>256-bit şifrələmə ilə qorunur</Text>
          </View>

          {footer}
          <View style={{ height: Platform.OS === 'web' ? 0 : Math.max(insets.bottom, 12) }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, icon, error, children }) {
  const { colors } = useTheme();
  return (
    <View>
      <Text style={{ marginBottom: 6, color: colors.ink2, fontWeight: '600', fontSize: 12.5 }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 13, borderWidth: 1.5, borderColor: error ? colors.red : colors.line, backgroundColor: colors.surface, paddingHorizontal: 14, minHeight: 50 }}>
        {icon}
        {children}
      </View>
    </View>
  );
}
