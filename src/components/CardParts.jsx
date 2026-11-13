import { View, Text, Pressable, Image } from 'react-native';
import { Check, User, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { tone, iconFor } from '../lib/cardUi';
import { useDef } from '../hooks/useCards';
import { listTime } from '../lib/format';

export function StatusBadge({ status, size = 'md' }) {
  const { colors } = useTheme();
  if (!status) return null;
  const t = tone(colors, status.tone);
  const sm = size === 'sm';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: t.bg, borderRadius: 14, paddingHorizontal: sm ? 9 : 12, height: sm ? 24 : 30 }}>
      {['green'].includes(status.tone) ? <Check size={sm ? 12 : 15} color={t.fg} strokeWidth={3} /> : <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: t.fg }} />}
      <Text style={{ color: t.fg, fontWeight: '700', fontSize: sm ? 12 : 13.5 }}>{status.label}</Text>
    </View>
  );
}

const illustrations = {
  'file-search': require('../../assets/illustrations/card-type-request.png'),
  wrench: require('../../assets/illustrations/card-type-service.png'),
  fuel: require('../../assets/illustrations/card-type-fuel.png'),
  banknote: require('../../assets/illustrations/card-type-cash.png'),
  wallet: require('../../assets/illustrations/card-type-payment.png'),
};

export function TypeTile({ type, size = 48 }) {
  const { colors } = useTheme();
  const def = useDef(type);
  const Icon = iconFor(def);
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' }}>
      {illustrations[def?.icon] ? (
        <Image source={illustrations[def.icon]} resizeMode="contain" style={{ width: size, height: size, borderRadius: size * 0.3 }} />
      ) : <Icon size={size * 0.5} color={colors.brand} />}
    </View>
  );
}

/** Kart siyahısı sətri. */
export function CardRow({ card, selected, onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginHorizontal: 12, marginVertical: 5, borderRadius: 16,
        backgroundColor: selected ? colors.brandTint : colors.surface, borderWidth: 1, borderColor: selected ? colors.brandLine : colors.line,
        opacity: pressed ? 0.85 : card.terminal ? 0.78 : 1,
      })}
    >
      <TypeTile type={card.type} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text numberOfLines={1} style={{ color: colors.ink, fontWeight: '800', fontSize: 16.5 }}>{card.title}</Text>
        <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 13.5 }}>{card.subtitle || card.typeLabel}</Text>
        <Text style={{ color: colors.faint, fontSize: 12 }}>{card.number} · {listTime(card.updatedAt)}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 6 }}>
        <StatusBadge status={card.status} size="sm" />
        {card.assignee ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <User size={13} color={colors.muted} />
            <Text style={{ color: colors.ink2, fontSize: 12.5, fontWeight: '600' }}>{card.assignee.fullName.split(' ')[0]}{(card.assignees?.length || 0) > 1 ? ` +${card.assignees.length - 1}` : ''}</Text>
          </View>
        ) : <Text style={{ color: colors.faint, fontSize: 12 }}>Məsul yoxdur</Text>}
      </View>
    </Pressable>
  );
}

/** Söhbətdəki kart xülasəsi mesajı (systemPayload = kart xülasəsi). */
export function CardMessage({ message, onOpen }) {
  const { colors } = useTheme();
  let c = null;
  try { c = JSON.parse(message.systemPayload || 'null'); } catch { c = null; }
  if (!c) return null;
  return (
    <View style={{ paddingHorizontal: 10, marginVertical: 6, alignItems: 'center' }}>
      <Pressable
        onPress={() => onOpen?.(c.id)}
        style={({ pressed }) => ({ width: '100%', maxWidth: 460, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1.5, borderColor: colors.brandLine, padding: 14, gap: 8, opacity: pressed ? 0.9 : 1 })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <TypeTile type={c.type} size={72} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.brand, fontWeight: '700', fontSize: 13 }}>{c.number} · {c.typeLabel}</Text>
            <Text numberOfLines={1} style={{ color: colors.ink, fontWeight: '800', fontSize: 19 }}>{c.title}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <StatusBadge status={c.status} />
          {c.subtitle ? <Text style={{ color: colors.ink2, fontSize: 13.5, flexShrink: 1 }}>{c.subtitle}</Text> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 8 }}>
          <Text style={{ color: colors.muted, fontSize: 13.5 }}>Məsul: <Text style={{ color: colors.ink, fontWeight: '700' }}>{c.assignee?.fullName?.split(' ')[0] || '—'}{(c.assignees?.length || 0) > 1 ? ` +${c.assignees.length - 1}` : ''}</Text></Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text style={{ color: colors.brand, fontWeight: '700', fontSize: 14 }}>Karta bax</Text>
            <ChevronRight size={17} color={colors.brand} />
          </View>
        </View>
      </Pressable>
    </View>
  );
}
