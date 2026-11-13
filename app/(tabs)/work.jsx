import { View, Text, Pressable, ScrollView, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tag, ClipboardCheck, Layers, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useAuthStore } from '../../src/store/auth';
import { useLayout } from '../../src/lib/useLayout';
import { Avatar } from '../../src/components/Avatar';
import { Badge } from '../../src/components/ui';
import { useConversations } from '../../src/hooks/useChat';
import { useCards, useCardSummary } from '../../src/hooks/useCards';
import { CardRow } from '../../src/components/CardParts';
import { listTime, messagePreview } from '../../src/lib/format';
import { topPad, bottomPad } from '../../src/lib/safe';

function Tile({ Icon, value, label, tone, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={{ flex: 1, minWidth: 0, backgroundColor: tone ? colors.brandTint : colors.surface, borderRadius: 18, padding: 14, gap: 6, borderWidth: 1, borderColor: tone ? colors.brandLine : colors.line }}>
      <Icon size={24} color={colors.brand} />
      <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 26 }}>{value}</Text>
      <Text style={{ color: colors.ink2, fontSize: 12, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export default function Work() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isWide } = useLayout();
  const me = useAuthStore((s) => s.user);
  const q = useConversations();
  const sum = useCardSummary().data;
  const assignedQuery = useCards({ mine: 'assigned', open: true, limit: 20 });
  const createdQuery = useCards({ mine: 'created', open: true, limit: 20 });
  const assigned = assignedQuery.data || [];
  const created = createdQuery.data || [];
  const openCard = (id) => (isWide ? router.navigate(`/cards?c=${id}`) : router.push(`/card/${id}`));
  const list = q.data || [];
  const withMentions = list.filter((c) => c.unreadMentions > 0);
  const unread = list.filter((c) => c.unreadCount > 0 && c.unreadMentions === 0);
  const mentions = withMentions.reduce((s, c) => s + c.unreadMentions, 0);
  const open = (id) => (isWide ? router.navigate(`/chats?c=${id}`) : router.push(`/chat/${id}`));
  const empty = !withMentions.length && !unread.length && !assigned.length && !created.length;

  const Row = ({ c, mention }) => (
    <Pressable onPress={() => open(c.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: mention ? colors.red : colors.line }}>
      <Avatar name={c.name} id={c.otherUser?.id ?? c.id} size={46} group={c.type === 'GROUP'} />
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ color: colors.ink, fontWeight: '700', fontSize: 15.5 }}>{c.name}</Text>
        <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 13.5 }}>{c.lastMessage ? `${c.lastMessage.type === 'SYSTEM' || !c.lastMessage.sender ? '' : c.lastMessage.sender.fullName.split(' ')[0] + ': '}${messagePreview(c.lastMessage)}` : ''}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={{ color: colors.faint, fontSize: 12 }}>{listTime(c.lastMessageAt)}</Text>
        <Badge count={mention ? c.unreadMentions : c.unreadCount} tone={mention ? 'red' : 'brand'} />
      </View>
      <ChevronRight size={18} color={colors.faint} />
    </Pressable>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={{ padding: 16, paddingTop: topPad(insets, Platform.OS === 'web' ? 24 : 12), gap: 16, alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 760, gap: 16 }}>
        <View>
          <Text style={{ color: colors.muted, fontSize: 14 }}>Salam, {me?.fullName?.split(' ')[0]}</Text>
          <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 32 }}>İşlərim</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Tile Icon={Tag} value={mentions} label="Cavabsız etiketlər" tone={mentions > 0} onPress={() => withMentions[0] && open(withMentions[0].id)} />
          <Tile Icon={ClipboardCheck} value={sum?.assignedOpen ?? '—'} label="Mənə təyin olunan kartlar" tone={(sum?.assignedOpen ?? 0) > 0} onPress={() => router.navigate({ pathname: '/cards', params: { filter: 'assigned' } })} />
          <Tile Icon={Layers} value={sum?.createdOpen ?? '—'} label="Mənim açdığım kartlar" onPress={() => router.navigate({ pathname: '/cards', params: { filter: 'created' } })} />
        </View>

        {assigned.length > 0 && (
          <View style={{ gap: 0, marginHorizontal: -12 }}>
            <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 18, marginLeft: 12, marginBottom: 4 }}>Mənə təyin olunan kartlar</Text>
            {assigned.map((c) => <CardRow key={c.id} card={c} onPress={() => openCard(c.id)} />)}
          </View>
        )}

        {created.length > 0 && (
          <View style={{ gap: 0, marginHorizontal: -12 }}>
            <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 18, marginLeft: 12, marginBottom: 4 }}>Mənim açdığım açıq kartlar</Text>
            {created.map((c) => <CardRow key={c.id} card={c} onPress={() => openCard(c.id)} />)}
          </View>
        )}

        {withMentions.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 18 }}>Sizi etiketləyiblər</Text>
            {withMentions.map((c) => <Row key={c.id} c={c} mention />)}
          </View>
        )}
        {unread.length > 0 && (
          <View style={{ gap: 8 }}>
            <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 18 }}>Oxunmamış söhbətlər</Text>
            {unread.map((c) => <Row key={c.id} c={c} />)}
          </View>
        )}

        {empty && !q.isLoading && !assignedQuery.isLoading && !createdQuery.isLoading && !q.isError && !assignedQuery.isError && !createdQuery.isError ? (
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: 20 }}>
            <Image source={require('../../assets/empty-work-crane.png')} style={{ width: 260, height: 190 }} resizeMode="contain" />
            <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 19 }}>Hər şey qaydasındadır</Text>
            <Text style={{ color: colors.muted, textAlign: 'center' }}>Oxunmamış etiket və ya mesaj yoxdur.</Text>
          </View>
        ) : null}
        {(q.isError || assignedQuery.isError || createdQuery.isError) ? (
          <Text accessibilityRole="alert" style={{ color: colors.red, textAlign: 'center', paddingVertical: 16 }}>Məlumatlar yüklənmədi. Bağlantını yoxlayıb yenidən açın.</Text>
        ) : null}
      </View>
    </ScrollView>
  );
}
