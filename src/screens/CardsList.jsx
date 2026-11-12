import { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, TextInput, Platform, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Search, X, Layers } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Chip, Empty } from '../components/ui';
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

export function CardsList({ selectedId, onOpen, initialFilter }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('open');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [create, setCreate] = useState(false);
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
        <Text style={{ color: colors.muted, fontSize: 13.5 }}>{list.length} kart</Text>
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
      {create ? <CardForm onClose={() => setCreate(false)} onDone={(id) => { setCreate(false); onOpen(id); }} /> : null}
    </View>
  );
}
