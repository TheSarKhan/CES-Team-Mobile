import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useLayout } from '../../src/lib/useLayout';
import { ChatList } from '../../src/screens/ChatList';
import { ChatPane } from '../../src/screens/ChatPane';

export default function Chats() {
  const { colors } = useTheme();
  const { isWide } = useLayout();
  const router = useRouter();
  const { c } = useLocalSearchParams();

  if (!isWide) return <ChatList onOpen={(id) => router.push(`/chat/${id}`)} />;

  // Geniş web: sol siyahı + sağda açıq söhbət (WhatsApp Desktop kimi)
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <View style={{ width: 400, borderRightWidth: 1, borderRightColor: colors.line }}>
        <ChatList selectedId={c} onOpen={(id) => router.setParams({ c: String(id) })} />
      </View>
      <View style={{ flex: 1, backgroundColor: colors.chatBg }}>
        {c ? <ChatPane key={c} id={c} /> : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <MessageCircle size={56} color={colors.faint} />
            <Text style={{ color: colors.ink2, fontWeight: '700', fontSize: 18 }}>CES Team</Text>
            <Text style={{ color: colors.muted }}>Söhbət seçin və ya yeni söhbət başladın</Text>
          </View>
        )}
      </View>
    </View>
  );
}
