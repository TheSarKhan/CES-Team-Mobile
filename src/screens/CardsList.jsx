import { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, TextInput, Platform, ScrollView, RefreshControl, Modal } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Search, X, Layers, ListChecks, Copy, Check } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Chip, Empty, Button } from '../components/ui';
import { CardRow } from '../components/CardParts';
import { CardForm } from './CardForm';
import { errorMessage } from '../api/client';
import { useCards, useCardTypes } from '../hooks/useCards';

const FILTERS = [
  ['all', 'Hamısı'],
  ['open', 'Açıq'],
  ['assigned', 'Mənə təyin'],
  ['created', 'Mənim açdığım'],
  ['closed', 'Bağlı'],
];

/** Nazənin-in hər səhər WhatsApp-a yazdığı «Açıq sorğular» siyahısı: açıq Sorğu kartlarından avtomatik yığılır, kopyalanır. */
function OpenRequests({ onClose }) {
  const { colors } = useTheme();
  const q = useCards({ type: 'REQUEST', open: true, limit: 100 });
  const [copied, setCopied] = useState(false);
  const d = new Date();
  const stamp = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(2)}`;
  const lines = (q.data || []).map((c, i) => `${i + 1}) ${c.title.replace(/^🔴\s*/, '')}${c.subtitle ? ' – ' + c.subtitle : ''}`);
  const text = `Açıq sorğular; ${stamp}\n${lines.join('\n')}`;
  const copy = async () => { await Clipboard.setStringAsync(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 520, maxHeight: '85%', backgroundColor: colors.surface, borderRadius: 22, padding: 18, gap: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ flex: 1, color: colors.ink, fontWeight: '800', fontSize: 19 }}>Açıq sorğular · {stamp}</Text>
            <Pressable onPress={onClose} hitSlop={10}><X size={22} color={colors.muted} /></Pressable>
          </View>
          <ScrollView style={{ backgroundColor: colors.surfaceAlt, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.line }}>
            {q.isLoading ? <Text style={{ color: colors.muted }}>Yüklənir…</Text> : lines.length ? lines.map((l, i) => <Text key={i} style={{ color: colors.ink, fontSize: 15.5, lineHeight: 24 }}>{l}</Text>) : <Text style={{ color: colors.muted }}>Açıq sorğu yoxdur</Text>}
          </ScrollView>
          <Button onPress={copy} disabled={!lines.length}>{copied ? 'Kopyalandı ✓' : 'WhatsApp üçün kopyala'}</Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function CardsList({ selectedId, onOpen, initialFilter }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('open');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [create, setCreate] = useState(false);
  const [openReq, setOpenReq] = useState(false);
  const [type, setType] = useState(null);
  useEffect(() => {
    if (FILTERS.some(([key]) => key === initialFilter)) setFilter(initialFilter);
  }, [initialFilter]);
  const types = useCardTypes().data || [];

  useEffect(() => { const t = setTimeout(() => setQ(search.trim()), 300); return () => clearTimeout(t); }, [search]);

  const params = useMemo(() => ({
    ...(filter === 'open' ? { open: true } : {}),
    ...(filter === 'assigned' ? { mine: 'assigned', open: true } : {}),
    ...(filter === 'created' ? { mine: 'created', open: true } : {}),
    ...(q ? { q } : {}),
    ...(type ? { type } : {}),
    limit: 100,
  }), [filter, q, type]);
  const query = useCards(params);
  const list = useMemo(() => (filter === 'closed' ? (query.data || []).filter((c) => c.terminal) : query.data || []), [query.data, filter]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: Platform.OS === 'web' ? 14 : insets.top + 6, paddingHorizontal: 14, paddingBottom: 8, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ flex: 1, color: colors.headerInk, fontWeight: '800', fontSize: 30 }}>Kartlar</Text>
          <Pressable onPress={() => setCreate(true)} accessibilityRole="button" accessibilityLabel="Kart yarat"
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: colors.forest }}>
            <Plus size={20} color="#fff" /><Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Kart yarat</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {FILTERS.map(([k, label]) => <Chip key={k} label={label} active={filter === k} onPress={() => setFilter(k)} />)}
        </ScrollView>
        {types.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Chip label="Bütün növlər" active={!type} onPress={() => setType(null)} />
            {types.map((d) => <Chip key={d.type} label={d.shortLabel} active={type === d.type} onPress={() => setType(type === d.type ? null : d.type)} />)}
          </ScrollView>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, height: 46, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14 }}>
          <Search size={18} color={colors.faint} />
          <TextInput value={search} onChangeText={setSearch} placeholder="Kartlarda axtar…" placeholderTextColor={colors.faint}
            style={[{ flex: 1, color: colors.ink, fontSize: 15.5 }, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]} />
          {search ? <Pressable onPress={() => setSearch('')} hitSlop={8}><X size={17} color={colors.muted} /></Pressable> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ flex: 1, color: colors.muted, fontSize: 13.5 }}>{list.length} kart</Text>
          <Pressable onPress={() => setOpenReq(true)} accessibilityRole="button" accessibilityLabel="Açıq sorğular siyahısı" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 34, borderRadius: 17, backgroundColor: colors.brandTint }}>
            <ListChecks size={16} color={colors.brand} /><Text style={{ color: colors.brand, fontWeight: '700', fontSize: 13 }}>Açıq sorğular siyahısı</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={list}
        keyExtractor={(c) => String(c.id)}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} tintColor={colors.brand} />}
        renderItem={({ item }) => <CardRow card={item} selected={String(item.id) === String(selectedId)} onPress={() => onOpen(item.id)} />}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={query.isLoading ? null : query.isError ? <Empty title="Yüklənmədi" sub={errorMessage(query.error)} /> : (
          <Empty title={q ? 'Heç nə tapılmadı' : 'Kart yoxdur'} sub={q ? 'Başqa söz yoxlayın.' : '"Kart yarat" ilə ilk sorğunu əlavə edin.'}><Layers size={40} color={colors.faint} /></Empty>
        )}
      />
      {openReq ? <OpenRequests onClose={() => setOpenReq(false)} /> : null}
      {create ? <CardForm onClose={() => setCreate(false)} onDone={(id) => { setCreate(false); onOpen(id); }} /> : null}
    </View>
  );
}
