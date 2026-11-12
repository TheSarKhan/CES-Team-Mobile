import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export function Badge({ count, tone = 'brand', min = 20 }) {
  const { colors } = useTheme();
  if (!count) return null;
  return (
    <View style={{ minWidth: min, height: min, borderRadius: min / 2, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colors[tone] }}>
      <Text style={{ color: '#fff', fontSize: 11.5, fontWeight: '700' }}>{count > 99 ? '99+' : count}</Text>
    </View>
  );
}

export function Chip({ label, count, active, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 18,
        backgroundColor: active ? colors.forest : colors.sunk,
      }}
    >
      <Text style={{ color: active ? '#fff' : colors.ink2, fontWeight: '600', fontSize: 13.5 }}>{label}</Text>
      {count ? <Text style={{ color: active ? '#fff' : colors.muted, fontSize: 12, fontWeight: '700' }}>{count}</Text> : null}
    </Pressable>
  );
}

export function Button({ children, onPress, loading, disabled, variant = 'primary', style }) {
  const { colors } = useTheme();
  const off = disabled || loading;
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      style={[{
        height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, flexDirection: 'row', gap: 8,
        backgroundColor: primary ? colors.brand : 'transparent', borderWidth: primary ? 0 : 1, borderColor: colors.line, opacity: off ? 0.55 : 1,
      }, style]}
    >
      {loading ? <ActivityIndicator color={primary ? '#fff' : colors.ink} /> : (
        <Text style={{ color: primary ? '#fff' : colors.ink, fontWeight: '700', fontSize: 15 }}>{children}</Text>
      )}
    </Pressable>
  );
}

export function Empty({ title, sub, children }) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', padding: 32, gap: 8 }}>
      {children}
      <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 17, textAlign: 'center' }}>{title}</Text>
      {sub ? <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center' }}>{sub}</Text> : null}
    </View>
  );
}
