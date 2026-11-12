import { useState } from 'react';
import { View, Text, ScrollView, Platform, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut, Bell, Smartphone } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/store/auth';
import { Avatar } from '../../src/components/Avatar';
import { Button, Chip } from '../../src/components/ui';
import { registerForPushNotificationsAsync } from '../../src/lib/push';
import * as push from '../../src/lib/push';

export default function Profile() {
  const { colors, mode, setMode } = useTheme();
  const insets = useSafeAreaInsets();
  const me = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [msg, setMsg] = useState('');
  const [, force] = useState(0);
  const web = Platform.OS === 'web';

  const state = web ? push.pushState() : null; // default | granted | denied | unsupported
  const needsInstall = web && push.isIOS() && !push.isStandalone();

  const enable = async () => {
    setMsg('');
    try {
      if (web) await push.enableWebPush();
      else if (!(await registerForPushNotificationsAsync())) throw new Error('Bildiriş icazəsi verilməyib və ya cihaz dəstəkləmir');
      setMsg('Bildirişlər aktivdir ✓');
    } catch (e) { setMsg(e.message || 'Bildirişlər açılmadı'); }
    force((x) => x + 1);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingTop: web ? 24 : insets.top + 12, alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 560, gap: 14 }}>
        <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 32 }}>Profil</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, padding: 16, borderRadius: 18 }}>
          <Avatar name={me?.fullName} id={me?.id} size={64} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 19 }}>{me?.fullName}</Text>
            <Text style={{ color: colors.muted, fontSize: 14 }}>{me?.email}</Text>
            {me?.position || me?.department ? <Text style={{ color: colors.muted, fontSize: 13 }}>{[me.position, me.department].filter(Boolean).join(' · ')}</Text> : null}
          </View>
        </View>

        <View style={{ backgroundColor: colors.surface, padding: 16, borderRadius: 18, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Bell size={19} color={colors.brand} /><Text style={{ color: colors.ink, fontWeight: '700', fontSize: 16 }}>Bildirişlər</Text></View>
          {needsInstall ? (
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}><Smartphone size={18} color={colors.amber} /><Text style={{ color: colors.ink, fontWeight: '700' }}>iPhone: əvvəl ana ekrana əlavə edin</Text></View>
              <Text style={{ color: colors.ink2, lineHeight: 21 }}>1. Safari-də aşağıdakı <Text style={{ fontWeight: '700' }}>Paylaş</Text> düyməsinə toxunun.{'\n'}2. <Text style={{ fontWeight: '700' }}>"Ana ekrana əlavə et"</Text> seçin.{'\n'}3. Ana ekrandakı CES Team ikonu ilə açın və bu səhifədə "Bildirişləri aç" düyməsinə toxunun.</Text>
            </View>
          ) : web && state === 'unsupported' ? (
            <Text style={{ color: colors.muted }}>Bu brauzer bildirişləri dəstəkləmir.</Text>
          ) : web && state === 'denied' ? (
            <Text style={{ color: colors.red }}>Bildirişlər brauzerdə bloklanıb. Sayt ayarlarından icazə verin.</Text>
          ) : web && state === 'granted' ? (
            <Text style={{ color: colors.brand, fontWeight: '700' }}>Bildirişlər aktivdir ✓</Text>
          ) : (
            <Text style={{ color: colors.ink2 }}>Yeni mesaj və etiketlər telefonun ekranını yandıracaq.</Text>
          )}
          {!needsInstall && !(web && (state === 'unsupported' || state === 'denied' || state === 'granted')) ? <Button onPress={enable}>Bildirişləri aç</Button> : null}
          {msg ? <Text style={{ color: colors.ink2 }}>{msg}</Text> : null}
        </View>

        <View style={{ backgroundColor: colors.surface, padding: 16, borderRadius: 18, gap: 10 }}>
          <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 16 }}>Görünüş</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label="Sistem" active={mode === 'system'} onPress={() => setMode('system')} />
            <Chip label="Açıq" active={mode === 'light'} onPress={() => setMode('light')} />
            <Chip label="Tünd" active={mode === 'dark'} onPress={() => setMode('dark')} />
          </View>
        </View>

        <Pressable onPress={logout} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, height: 52, borderRadius: 14, borderWidth: 1, borderColor: colors.red, backgroundColor: colors.surface }}>
          <LogOut size={19} color={colors.red} /><Text style={{ color: colors.red, fontWeight: '700', fontSize: 16 }}>Çıxış</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
