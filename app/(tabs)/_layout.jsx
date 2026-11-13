import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Image, Platform, Modal } from 'react-native';
import { Redirect, Tabs, useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Layers, MessageCircle, User, MoreHorizontal, PanelLeftOpen, PanelLeftClose, LogOut } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/store/auth';
import { useLayout } from '../../src/lib/useLayout';
import { Badge } from '../../src/components/ui';
import { PressableScale, ND } from '../../src/components/motion';
import { Animated } from 'react-native';
import { useConversations, useRealtimeSync, useMe } from '../../src/hooks/useChat';
import { Avatar } from '../../src/components/Avatar';
import { useCardUnread } from '../../src/hooks/useCards';
import { registerForPushNotificationsAsync, onNotificationOpened } from '../../src/lib/push';

// «İşlərim» (work) hələlik gizlidir: menyuda yoxdur, ekranı saxlanılıb (href: null)
const NAV = [
  { name: 'chats', label: 'Söhbətlər', Icon: MessageCircle },
  { name: 'cards', label: 'Kartlar', Icon: Layers },
  { name: 'profile', label: 'Profil', Icon: User },
];

/** İkon aktiv olanda yaylanaraq "tullanır". */
function NavIcon({ active, children }) {
  const v = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    if (active) Animated.sequence([
      Animated.timing(v, { toValue: 1.0, duration: 0, useNativeDriver: ND }),
      Animated.spring(v, { toValue: 0, friction: 3, tension: 180, useNativeDriver: ND }),
    ]).start();
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Animated.View style={{ transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] }) }, { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] }}>{children}</Animated.View>;
}

function useCardsUnread() { return useCardUnread().total; }

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
  const cardUnread = useCardsUnread();
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 8, paddingTop: 5, paddingBottom: Platform.OS === 'web' ? 5 : Math.max(insets.bottom, 5) }}>
      {NAV.map(({ name, label, Icon }) => {
        const active = path === `/${name}`;
        return (
          <PressableScale key={name} onPress={() => router.navigate(`/${name}`)} scaleTo={0.9} accessibilityRole="tab" accessibilityState={{ selected: active }} style={{ flex: 1, alignItems: 'center', paddingVertical: 7, gap: 3, borderRadius: 14, backgroundColor: active ? colors.brandTint : 'transparent' }}>
            <View>
              <NavIcon active={active}><Icon size={24} color={active ? colors.brand : colors.muted} strokeWidth={active ? 2.4 : 1.9} /></NavIcon>
              {(name === 'chats' ? unread : name === 'cards' ? cardUnread : 0) > 0 ? <View style={{ position: 'absolute', top: -6, right: -12 }}><Badge count={name === 'chats' ? unread : cardUnread} min={18} /></View> : null}
            </View>
            <Text style={{ color: active ? colors.brand : colors.muted, fontSize: 11.5, fontWeight: active ? '700' : '500' }}>{label}</Text>
          </PressableScale>
        );
      })}
    </View>
  );
}

const RAIL_KEY = 'ces-rail-expanded';
const readRail = () => { try { return Platform.OS === 'web' && window.localStorage.getItem(RAIL_KEY) === '1'; } catch { return false; } };
const writeRail = (v) => { try { if (Platform.OS === 'web') window.localStorage.setItem(RAIL_KEY, v ? '1' : '0'); } catch { /* yadda saxlanmasa da işləyir */ } };

/**
 * Kompüter yan paneli (WhatsApp Web kimi): dar rejimdə yalnız ikonlar, geniş rejimdə ad və say; altda «⋯» menyusu və profil şəkli.
 * Menyudan «Sidebarı genişləndir / kiçilt» seçimi yadda qalır.
 */
function Rail() {
  const { colors } = useTheme();
  const router = useRouter();
  const path = usePathname();
  const unread = useUnread();
  const cardUnread = useCardsUnread();
  const me = useAuthStore((st) => st.user);
  const logout = useAuthStore((st) => st.logout);
  const meQ = useMe(me?.id);
  const person = { ...me, ...(meQ.data || {}) };
  const [wide, setWide] = useState(readRail);
  const [menu, setMenu] = useState(false);
  const W = wide ? 236 : 72;
  const items = NAV.filter((n) => n.name !== 'profile');
  const profileActive = path === '/profile';
  const toggle = () => { setWide((w) => { writeRail(!w); return !w; }); setMenu(false); };

  const Avt = ({ size }) => (
    <View style={{ borderRadius: size / 2 + 3, padding: 2, borderWidth: 2, borderColor: profileActive ? colors.brand : 'transparent' }}>
      <Avatar name={person.fullName} id={person.id} uri={person.avatarUrl} size={size} />
    </View>
  );

  return (
    <View style={{ width: W, backgroundColor: colors.surface, borderRightWidth: 1, borderRightColor: colors.line, paddingVertical: 14, paddingHorizontal: wide ? 12 : 0, alignItems: wide ? 'stretch' : 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: wide ? 4 : 0, marginBottom: 14, justifyContent: wide ? 'flex-start' : 'center' }}>
        <Image source={require('../../assets/icon.png')} style={{ width: 44, height: 44, borderRadius: 12 }} />
        {wide ? <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 18 }}>CES Team</Text> : null}
      </View>

      <View style={{ gap: 6, alignItems: wide ? 'stretch' : 'center' }}>
        {items.map(({ name, label, Icon }) => {
          const active = path === `/${name}`;
          const count = name === 'chats' ? unread : name === 'cards' ? cardUnread : 0;
          return (
            <PressableScale key={name} onPress={() => router.navigate(`/${name}`)} scaleTo={0.94} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: active }}
              style={wide
                ? { flexDirection: 'row', alignItems: 'center', gap: 14, height: 48, paddingHorizontal: 14, borderRadius: 14, backgroundColor: active ? colors.brandTint : 'transparent' }
                : { width: 52, height: 52, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: active ? colors.brandTint : 'transparent' }}>
              <View>
                <NavIcon active={active}><Icon size={25} color={active ? colors.brand : colors.ink2} strokeWidth={active ? 2.4 : 1.9} /></NavIcon>
                {!wide && count > 0 ? <View style={{ position: 'absolute', top: -8, right: -11 }}><Badge count={count} min={18} /></View> : null}
              </View>
              {wide ? <Text style={{ flex: 1, color: active ? colors.brand : colors.ink, fontSize: 15.5, fontWeight: active ? '800' : '600' }}>{label}</Text> : null}
              {wide && count > 0 ? <Badge count={count} min={22} /> : null}
            </PressableScale>
          );
        })}
      </View>

      <View style={{ flex: 1 }} />

      {/* Alt hissə: «⋯» menyusu və profil */}
      {wide ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 4 }}>
          <Pressable onPress={() => router.navigate('/profile')} accessibilityRole="button" accessibilityLabel="Profil" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Avt size={38} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: colors.ink, fontWeight: '700', fontSize: 15 }}>{person.fullName?.split(' ')[0] || 'Profil'}</Text>
              {person.position ? <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12 }}>{person.position}</Text> : null}
            </View>
          </Pressable>
          <Pressable onPress={() => setMenu(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Menyu" style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
            <MoreHorizontal size={22} color={colors.ink2} />
          </Pressable>
        </View>
      ) : (
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Pressable onPress={() => setMenu(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Menyu" style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
            <MoreHorizontal size={22} color={colors.ink2} />
          </Pressable>
          <Pressable onPress={() => router.navigate('/profile')} accessibilityRole="button" accessibilityLabel="Profil"><Avt size={38} /></Pressable>
        </View>
      )}

      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable onPress={() => setMenu(false)} style={{ flex: 1 }}>
          <View style={{ position: 'absolute', left: W + 8, bottom: 14, minWidth: 230, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, paddingVertical: 6, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 4 }, elevation: 8 }}>
            {[
              { label: wide ? 'Sidebarı kiçilt' : 'Sidebarı genişləndir', icon: wide ? <PanelLeftClose size={20} color={colors.ink2} /> : <PanelLeftOpen size={20} color={colors.ink2} />, onPress: toggle },
              { label: 'Profil', icon: <User size={20} color={colors.ink2} />, onPress: () => { setMenu(false); router.navigate('/profile'); } },
              { label: 'Çıxış', icon: <LogOut size={20} color={colors.red} />, danger: true, onPress: () => { setMenu(false); logout(); } },
            ].map((it) => (
              <Pressable key={it.label} onPress={it.onPress} accessibilityRole="button" accessibilityLabel={it.label}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, height: 46, paddingHorizontal: 16, backgroundColor: pressed ? colors.sunk : 'transparent' })}>
                {it.icon}
                <Text style={{ color: it.danger ? colors.red : colors.ink, fontSize: 15.5, fontWeight: '600' }}>{it.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
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
        <Tabs screenOptions={{ headerShown: false, animation: 'fade' }} tabBar={() => (isWide ? null : <BottomBar />)}>
          {NAV.map(({ name }) => <Tabs.Screen key={name} name={name} />)}
          <Tabs.Screen name="work" options={{ href: null }} />
        </Tabs>
      </View>
    </View>
  );
}
