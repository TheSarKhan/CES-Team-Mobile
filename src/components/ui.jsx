import { useState } from 'react';
import { View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { ChevronDown, Check, X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { PressableScale, Pop, FadeIn, Float } from './motion';

export function Badge({ count, tone = 'brand', min = 20 }) {
  const { colors } = useTheme();
  if (!count) return null;
  return (
    <Pop value={count}>
      <View style={{ minWidth: min, height: min, borderRadius: min / 2, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: colors[tone] }}>
        <Text style={{ color: '#fff', fontSize: 11.5, fontWeight: '700' }}>{count > 99 ? '99+' : count}</Text>
      </View>
    </Pop>
  );
}

export function Chip({ label, count, active, onPress }) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      scaleTo={0.92}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 36, borderRadius: 18,
        backgroundColor: active ? colors.forest : colors.sunk,
      }}
    >
      <Text style={{ color: active ? '#fff' : colors.ink2, fontWeight: '600', fontSize: 13.5 }}>{label}</Text>
      {count ? <Text style={{ color: active ? '#fff' : colors.muted, fontSize: 12, fontWeight: '700' }}>{count}</Text> : null}
    </PressableScale>
  );
}

export function Button({ children, onPress, loading, disabled, variant = 'primary', style }) {
  const { colors } = useTheme();
  const off = disabled || loading;
  const primary = variant === 'primary';
  return (
    <PressableScale
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      scaleTo={0.96}
      style={[{
        height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, flexDirection: 'row', gap: 8,
        backgroundColor: primary ? colors.brand : 'transparent', borderWidth: primary ? 0 : 1, borderColor: colors.line, opacity: off ? 0.55 : 1,
      }, style]}
    >
      {loading ? <ActivityIndicator color={primary ? '#fff' : colors.ink} /> : (
        <Text style={{ color: primary ? '#fff' : colors.ink, fontWeight: '700', fontSize: 15 }}>{children}</Text>
      )}
    </PressableScale>
  );
}

/** Açılan siyahı paneli (dropdown): sətirlər [{key, label, sub?}]; seçilən işarələnir. */
export function OptionList({ items, selected, onPick, maxHeight = 264 }) {
  const { colors } = useTheme();
  if (!items.length) return null;
  return (
    <View style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, overflow: 'hidden', maxHeight }}>
      <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
        {items.map((it, i) => {
          const on = selected != null && String(selected) === String(it.key);
          return (
            <Pressable key={it.key} onPress={() => onPick(it)} accessibilityRole="button"
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 46, paddingHorizontal: 14, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line, backgroundColor: pressed ? colors.sunk : on ? colors.brandTint : 'transparent' })}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.ink, fontSize: 15.5, fontWeight: on ? '700' : '500' }}>{it.label}</Text>
                {it.sub ? <Text style={{ color: colors.muted, fontSize: 12.5 }}>{it.sub}</Text> : null}
              </View>
              {on ? <Check size={18} color={colors.brand} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

/** Seçim sahəsi (dropdown): toxunanda siyahı açılır; seçilmiş dəyər yenidən seçilərsə və ya × basılarsa təmizlənir. */
export function SelectBox({ value, options, onChange, placeholder = 'Seçin', error, clearable = true }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const cur = options.find((o) => o.value === String(value ?? ''));
  return (
    <View style={{ gap: 6 }}>
      <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, borderRadius: 14, borderWidth: 1.5, borderColor: error ? colors.red : open ? colors.brand : colors.line, backgroundColor: colors.surface, paddingHorizontal: 14 }}>
        <Text style={{ flex: 1, color: cur ? colors.ink : colors.faint, fontSize: 16 }}>{cur ? cur.label : placeholder}</Text>
        {cur && clearable ? <Pressable onPress={() => { onChange(''); setOpen(false); }} hitSlop={8} accessibilityLabel="Təmizlə"><X size={18} color={colors.muted} /></Pressable> : null}
        <ChevronDown size={20} color={colors.muted} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </Pressable>
      {open ? <OptionList items={options.map((o) => ({ key: o.value, label: o.label }))} selected={cur?.value} onPick={(it) => { onChange(it.key === cur?.value && clearable ? '' : it.key); setOpen(false); }} /> : null}
    </View>
  );
}

export function Empty({ title, sub, children }) {
  const { colors } = useTheme();
  return (
    <FadeIn style={{ alignItems: 'center', padding: 32, gap: 8 }} from="scale">
      {children ? <Float>{children}</Float> : null}
      <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 17, textAlign: 'center' }}>{title}</Text>
      {sub ? <Text style={{ color: colors.muted, fontSize: 14, textAlign: 'center' }}>{sub}</Text> : null}
    </FadeIn>
  );
}
