import { View, Text, Pressable } from 'react-native';
import { Play, Pause } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useVoicePlayer } from '../lib/voice';
import { absoluteUrl } from '../config';

const BARS = 32;

export const clock = (ms) => {
  const s = Math.max(0, Math.round((ms || 0) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Eyni səs həmişə eyni görünsün deyə hündürlüklər id-dən törədilir (həqiqi dalğa forması deyil). */
export const barHeights = (seed, n = BARS) => {
  let x = (Number(seed) || 1) * 9301 + 49297;
  return Array.from({ length: n }, () => { x = (x * 9301 + 49297) % 233280; return 0.3 + (x / 233280) * 0.7; });
};

export function VoiceBubble({ attachment: a, mine }) {
  const { colors } = useTheme();
  const { playing, positionMs, durationMs, toggle, rate, cycleRate } = useVoicePlayer(absoluteUrl(a.url), a.durationMs);
  const bars = barHeights(a.id);
  const progress = durationMs ? Math.min(1, positionMs / durationMs) : 0;
  const accent = mine ? colors.forest : colors.brand;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 230, paddingVertical: 2 }}>
      <Pressable onPress={toggle} accessibilityRole="button" accessibilityLabel={playing ? 'Dayandır' : 'Səsi oxut'}
        style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' }}>
        {playing ? <Pause size={20} color="#fff" fill="#fff" /> : <Play size={20} color="#fff" fill="#fff" style={{ marginLeft: 2 }} />}
      </Pressable>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', height: 28, gap: 2 }}>
          {bars.map((h, i) => (
            <View key={i} style={{ flex: 1, height: 28 * h, borderRadius: 2, backgroundColor: i / BARS < progress ? accent : colors.faint, opacity: i / BARS < progress ? 1 : 0.55 }} />
          ))}
        </View>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{clock(playing || positionMs ? positionMs : durationMs)}</Text>
      </View>
      <Pressable onPress={cycleRate} hitSlop={6} accessibilityLabel="Sürəti dəyiş" style={{ paddingHorizontal: 8, height: 24, borderRadius: 12, backgroundColor: colors.sunk, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.ink2, fontSize: 12, fontWeight: '800' }}>{rate}x</Text>
      </Pressable>
    </View>
  );
}
