import { View, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Layers } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useLayout } from '../../src/lib/useLayout';
import { CardsList } from '../../src/screens/CardsList';
import { CardDetail } from '../../src/screens/CardDetail';

export default function Cards() {
  const { colors } = useTheme();
  const { isWide } = useLayout();
  const router = useRouter();
  const { c, filter } = useLocalSearchParams();

  if (!isWide) return <CardsList initialFilter={filter} onOpen={(id) => router.push(`/card/${id}`)} />;
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <View style={{ width: 420, borderRightWidth: 1, borderRightColor: colors.line }}>
        <CardsList initialFilter={filter} selectedId={c} onOpen={(id) => router.setParams({ c: String(id) })} />
      </View>
      <View style={{ flex: 1 }}>
        {c ? <CardDetail key={c} id={c} /> : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Layers size={56} color={colors.faint} />
            <Text style={{ color: colors.ink2, fontWeight: '700', fontSize: 18 }}>Kart seçin</Text>
            <Text style={{ color: colors.muted }}>Siyahıdan kart seçin və ya yeni kart yaradın</Text>
          </View>
        )}
      </View>
    </View>
  );
}
