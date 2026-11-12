import { useEffect } from 'react';
import { View, Text, Pressable, Image, Platform } from 'react-native';
import { Redirect, Tabs, useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ClipboardList, Layers, MessageCircle, User } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/store/auth';
import { useLayout } from '../../src/lib/useLayout';
import { Badge } from '../../src/components/ui';
import { useConversations, useRealtimeSync } from '../../src/hooks/useChat';
import { registerForPushNotificationsAsync, onNotificationOpened } from '../../src/lib/push';

const NAV = [
  { name: 'work', label: 'İşlərim', Icon: ClipboardList },
  { name: 'cards', label: 'Kartlar', Icon: Layers },
  { name: 'chats', label: 'Söhbətlər', Icon: MessageCircle },
  { name: 'profile', label: 'Profil', Icon: User },
];

function useUnread() {
  const q = useConversations();
  return (q.data || []).filter((c) => !c.muted || c.unreadMentions > 0).reduce((s, c) => s + c.unreadCount, 0);
}

function BottomBar() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const path = usePathname();
  const unread = useUnread();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 8, paddingTop: 5, paddingBottom: Platform.OS === 'web' ? 5 : Math.max(insets.bottom, 5) }}>
      {NAV.map(({ name, label, Icon }) => {
        const active = path === `/${name}`;
        return (
          <Pressable key={name} onPress={() => router.navigate(`/${name}`)} accessibilityRole="tab" accessibilityState={{ selected: active }} style={{ flex: 1, alignItems: 'center', paddingVertical: 7, gap: 3, borderRadius: 14, backgroundColor: active ? colors.brandTint : 'transparent' }}>
            <View>
              <Icon size={24} color={active ? colors.brand : colors.muted} strokeWidth={active ? 2.4 : 1.9} />
              {name === 'chats' && unread > 0 ? <View style={{ position: 'absolute', top: -6, right: -12 }}><Badge count={unread} min={18} /></View> : null}
            </View>
            <Text style={{ color: active ? colors.brand : colors.muted, fontSize: 11.5, fontWeight: active ? '700' : '500' }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Rail() {
  const { colors } = useTheme();
  const router = useRouter();
  const path = usePathname();
  const unread = useUnread();
  return (
    <View style={{ width: 92, backgroundColor: colors.forest, alignItems: 'center', paddingVertical: 16, gap: 6 }}>
      <Image source={require('../../assets/icon.png')} style={{ width: 48, height: 48, borderRadius: 12, marginBottom: 14 }} />
      {NAV.map(({ name, label, Icon }) => {
        const active = path === `/${name}`;
        return (
          <Pressable key={name} onPress={() => router.navigate(`/${name}`)} accessibilityRole="tab" accessibilityState={{ selected: active }}
            style={{ width: 74, alignItems: 'center', gap: 4, paddingVertical: 9, borderRadius: 14, backgroundColor: active ? 'rgba(255,255,255,0.14)' : 'transparent' }}>
            <View>
              <Icon size={24} color="#fff" strokeWidth={active ? 2.4 : 1.8} />
              {name === 'chats' && unread > 0 ? <View style={{ position: 'absolute', top: -7, right: -12 }}><Badge count={unread} min={18} /></View> : null}
            </View>
            <Text style={{ color: active ? '#fff' : 'rgba(255,255,255,0.72)', fontSize: 11.5, fontWeight: active ? '700' : '500' }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const status = useAuthStore((s) => s.status);
  const { isWide } = useLayout();
  const router = useRouter();
  useRealtimeSync();

  useEffect(() => {
    if (status !== 'authenticated') return undefined;
    registerForPushNotificationsAsync();
    return onNotificationOpened((d) => (d.cardId ? router.navigate(isWide ? `/cards?c=${d.cardId}` : `/card/${d.cardId}`) : router.navigate(`/chats?c=${d.conversationId}`)));
  }, [status, router, isWide]);

  // Web: service worker (push üçün) — bir dəfə qeydiyyat
  useEffect(() => {
    if (Platform.OS === 'web' && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  if (status !== 'authenticated') return <Redirect href="/login" />;

  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      {isWide ? <Rail /> : null}
      <View style={{ flex: 1 }}>
        <Tabs screenOptions={{ headerShown: false }} tabBar={() => (isWide ? null : <BottomBar />)}>
          {NAV.map(({ name }) => <Tabs.Screen key={name} name={name} />)}
        </Tabs>
      </View>
    </View>
  );
}
