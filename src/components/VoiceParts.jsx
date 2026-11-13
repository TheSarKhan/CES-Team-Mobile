import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { clock } from './VoiceBubble';

/** Canlı dalğa: hər çubuğun hündürlüyü həmin andakı səs ucalığına uyğundur (səssizlikdə qısa, uca səsdə hündür). */
export function LiveWave({ levels, height = 30, color, dim = false }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height, opacity: dim ? 0.45 : 1 }}>
      {levels.map((l, i) => (
        <View key={i} style={{ flex: 1, height: Math.max(3, height * Math.pow(l, 0.7)), borderRadius: 2, backgroundColor: color || colors.brand }} />
      ))}
    </View>
  );
}

export function RecTimer({ ms, paused }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: paused ? colors.faint : colors.red }} />
      <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 15, fontVariant: ['tabular-nums'], minWidth: 38 }}>{clock(ms)}</Text>
    </View>
  );
}
