import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform, Modal, TextInput, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Pencil, ChevronRight, ArrowRight, Paperclip, UserRound, History, Check } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { StatusBadge, TypeTile } from '../components/CardParts';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/ui';
import { CardForm } from './CardForm';
import { ChatPane } from './ChatPane';
import { cardsApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { absoluteUrl } from '../config';
import { useCard, useCardHistory, useDef } from '../hooks/useCards';
import { useMembers } from '../hooks/useChat';
import { displayValue, computedRows, tone, visibleFields } from '../lib/cardUi';
import { fileSize, hhmm, dayLabel } from '../lib/format';

const TABS = [['info', 'Məlumat'], ['history', 'Tarixçə'], ['talk', 'Müzakirə']];

function Row({ label, children, onPress }) {
  const { colors } = useTheme();
  const Wrap = onPress ? Pressable : View;
  return (
    <Wrap onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line }}>
      <Text style={{ width: 120, color: colors.muted, fontSize: 14 }}>{label}</Text>
      <View style={{ flex: 1, alignItems: 'flex-start' }}>{children}</View>
      {onPress ? <ChevronRight size={18} color={colors.faint} /> : null}
    </Wrap>
  );
}

function StatusSheet({ def, current, onPick, onClose }) {
  const { colors } = useTheme();
  const [sel, setSel] = useState(null);
  const [note, setNote] = useState('');
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 520, backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, gap: 8 }}>
          <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 19 }}>Statusu dəyiş</Text>
          {def.statuses.map((s) => {
            const t = tone(colors, s.tone);
            const disabled = s.key === current;
            return (
              <Pressable key={s.key} disabled={disabled} onPress={() => setSel(s.key)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: sel === s.key ? t.fg : colors.line, opacity: disabled ? 0.45 : 1 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: t.fg }} />
                <Text style={{ flex: 1, color: colors.ink, fontWeight: '700', fontSize: 15.5 }}>{s.label}</Text>
                {disabled ? <Text style={{ color: colors.muted, fontSize: 12.5 }}>cari</Text> : sel === s.key ? <Check size={18} color={t.fg} /> : null}
              </Pressable>
            );
          })}
          <TextInput value={note} onChangeText={setNote} placeholder="Qeyd (istəyə bağlı)" placeholderTextColor={colors.faint}
            style={[{ height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.line, color: colors.ink, paddingHorizontal: 14, fontSize: 15.5 }, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]} />
          <Button disabled={!sel} onPress={() => onPick(sel, note)}>Təsdiq et</Button>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function AssigneeSheet({ members, current, currentName, onPick, onClose }) {
  const { colors } = useTheme();
  const [text, setText] = useState(current ? '' : currentName || '');
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 520, maxHeight: '75%', backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 12 }}>
          <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 19, padding: 8 }}>Məsul şəxs</Text>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 8, paddingBottom: 8 }}>
            <TextInput value={text} onChangeText={setText} placeholder="Ad yazın (məs. Bəhruz)" placeholderTextColor={colors.faint}
              style={[{ flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.line, color: colors.ink, paddingHorizontal: 14, fontSize: 16 }, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]} />
            <Button disabled={!text.trim()} onPress={() => onPick({ name: text.trim() })} style={{ height: 46 }}>Təyin et</Button>
          </View>
          <ScrollView>
            {(members || []).map((m) => (
              <Pressable key={m.user.id} onPress={() => onPick({ userId: m.user.id })} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, backgroundColor: pressed ? colors.sunk : 'transparent' })}>
                <Avatar name={m.user.fullName} id={m.user.id} size={38} />
                <Text style={{ flex: 1, color: colors.ink, fontWeight: '600', fontSize: 15.5 }}>{m.user.fullName}</Text>
                {current === m.user.id ? <Check size={20} color={colors.brand} /> : null}
              </Pressable>
            ))}
            {current || currentName ? <Pressable onPress={() => onPick({})} style={{ padding: 14 }}><Text style={{ color: colors.red, fontWeight: '700' }}>Məsulu götür</Text></Pressable> : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function eventText(e, def) {
  const st = (k) => def?.statuses.find((s) => s.key === k)?.label || k;
  const who = e.actor?.fullName?.split(' ')[0] || 'Sistem';
  if (e.type === 'CREATED') return `${who} kartı yaratdı`;
  if (e.type === 'STATUS') return `${who} statusu «${st(e.data.from)}» → «${st(e.data.to)}» etdi${e.data.note ? ` — ${e.data.note}` : ''}`;
  if (e.type === 'ASSIGNEE') return e.data.to ? `${who} məsulu ${e.data.from ? `«${e.data.from}» → ` : ''}«${e.data.to}» etdi` : `${who} məsulu götürdü`;
  if (e.type === 'FIELDS') return `${who} kartı yenilədi (${(e.data.changed || []).length} sahə)`;
  return who;
}

export function CardDetail({ id, onBack, onOpenChatGroup }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const q = useCard(id);
  const card = q.data;
  const def = useDef(card?.summary.type);
  const members = useMembers(card?.groupId).data;
  const [tab, setTab] = useState('info');
  const [edit, setEdit] = useState(false);
  const [statusSheet, setStatusSheet] = useState(false);
  const [assigneeSheet, setAssigneeSheet] = useState(false);
  const [error, setError] = useState('');
  const hist = useCardHistory(id, tab === 'history');

  const refresh = (data) => { qc.setQueryData(['card', String(id)], data); qc.invalidateQueries({ queryKey: ['cards'] }); qc.invalidateQueries({ queryKey: ['card-summary'] }); qc.invalidateQueries({ queryKey: ['card-history', String(id)] }); };
  const run = async (fn) => { setError(''); try { refresh(await fn()); } catch (e) { setError(errorMessage(e)); } };

  if (q.isError) return <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}><Text style={{ color: colors.red, textAlign: 'center' }}>{errorMessage(q.error, 'Kart açılmadı')}</Text></View>;
  if (q.isLoading || !card || !def) return <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.muted }}>Yüklənir…</Text></View>;

  const s = card.summary;
  const idx = def.statuses.findIndex((x) => x.key === s.status.key);
  const nextStatus = !s.terminal ? def.statuses[idx + 1] : null;
  const computed = computedRows(s.type, card.fields);
  const fieldsToShow = def.steps.flatMap((st) => st.fields).filter((f) => f.kind !== 'USER' && f.kind !== 'FILES');
  const rows = visibleFields(fieldsToShow, card.fields).map((f) => [f, displayValue(f, card.fields[f.key])]).filter(([, v]) => v);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: Platform.OS === 'web' ? 14 : insets.top + 6, paddingHorizontal: 14, paddingBottom: 10, backgroundColor: colors.header, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {onBack ? <Pressable onPress={onBack} hitSlop={10} accessibilityLabel="Geri"><ArrowLeft size={24} color={colors.headerInk} /></Pressable> : null}
          <TypeTile type={s.type} size={44} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.muted, fontSize: 13 }}>{s.number} · {s.typeLabel}</Text>
            <Text numberOfLines={1} style={{ color: colors.headerInk, fontWeight: '800', fontSize: 22 }}>{s.title}</Text>
          </View>
          <Pressable onPress={() => setEdit(true)} hitSlop={10} accessibilityLabel="Redaktə et" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.sunk, alignItems: 'center', justifyContent: 'center' }}>
            <Pencil size={18} color={colors.ink2} />
          </Pressable>
        </View>
        <Pressable onPress={() => setTab('info')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.brandTint, borderRadius: 16, padding: 12 }}>
          <TypeTile type={s.type} size={64} />
          <View style={{ flex: 1, alignItems: 'flex-start', gap: 5 }}>
            {s.subtitle ? <Text numberOfLines={1} style={{ color: colors.ink, fontWeight: '600', fontSize: 14 }}>{s.subtitle}</Text> : null}
            <StatusBadge status={s.status} size="sm" />
            <Text numberOfLines={1} style={{ color: colors.ink2, fontSize: 13 }}>Məsul: {s.assignee?.fullName || 'Təyin olunmayıb'}</Text>
          </View>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {TABS.map(([k, label]) => (
            <Pressable key={k} onPress={() => setTab(k)} accessibilityRole="tab" style={{ flex: 1, alignItems: 'center', paddingVertical: 9, borderBottomWidth: 3, borderBottomColor: tab === k ? colors.brand : 'transparent' }}>
              <Text style={{ color: tab === k ? colors.brand : colors.muted, fontWeight: tab === k ? '800' : '600', fontSize: 15 }}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {tab === 'info' && (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          <View style={{ backgroundColor: colors.surface, borderRadius: 18, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line }}>
            <Row label="Status"><StatusBadge status={s.status} /></Row>
            {nextStatus ? <Row label="Növbəti addım"><StatusBadge status={nextStatus} /></Row> : null}
            <Row label="Məsul şəxs" onPress={() => setAssigneeSheet(true)}>
              {s.assignee ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><Avatar name={s.assignee.fullName} id={s.assignee.id} size={30} /><Text style={{ color: colors.ink, fontWeight: '700', fontSize: 15.5 }}>{s.assignee.fullName}</Text></View>
              ) : <Text style={{ color: colors.faint, fontSize: 15 }}>Təyin olunmayıb</Text>}
            </Row>
            <Row label="Yaradan"><Text style={{ color: colors.ink2, fontSize: 15 }}>{s.creator?.fullName}</Text></Row>
            {rows.map(([f, v]) => (
              <Row key={f.key} label={f.label}><Text style={{ color: colors.ink, fontSize: 15.5, flexShrink: 1 }}>{v}</Text></Row>
            ))}
            {computed.map(([label, value]) => <Row key={label} label={label}><Text style={{ color: colors.brand, fontWeight: '800', fontSize: 17 }}>{value}</Text></Row>)}
            {card.files?.length ? (
              <View style={{ paddingVertical: 12, gap: 8 }}>
                <Text style={{ color: colors.muted, fontSize: 14 }}>Fayllar</Text>
                {card.files.map((f) => (
                  <Pressable key={f.id} onPress={() => Linking.openURL(absoluteUrl(f.url))} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: colors.sunk }}>
                    <Paperclip size={18} color={colors.muted} />
                    <Text numberOfLines={1} style={{ flex: 1, color: colors.ink, fontWeight: '600' }}>{f.fileName}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>{fileSize(f.sizeBytes)}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          {error ? <Text accessibilityRole="alert" style={{ color: colors.red, marginTop: 12 }}>{error}</Text> : null}

          <View style={{ marginTop: 16, gap: 10 }}>
            {nextStatus ? (
              <Button onPress={() => run(() => cardsApi.status(id, nextStatus.key))}>{`${nextStatus.label}  →`}</Button>
            ) : null}
            <Button variant="ghost" onPress={() => setStatusSheet(true)}>Statusu dəyiş</Button>
          </View>
        </ScrollView>
      )}

      {tab === 'history' && (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {hist.isLoading ? <Text style={{ color: colors.muted }}>Yüklənir…</Text> : (hist.data || []).slice().reverse().map((e) => (
            <View key={e.id} style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ alignItems: 'center' }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' }}>
                  <History size={16} color={colors.brand} />
                </View>
              </View>
              <View style={{ flex: 1, backgroundColor: colors.surface, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.line }}>
                <Text style={{ color: colors.ink, fontSize: 14.5 }}>{eventText(e, def)}</Text>
                <Text style={{ color: colors.faint, fontSize: 12, marginTop: 3 }}>{dayLabel(e.createdAt)} · {hhmm(e.createdAt)}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {tab === 'talk' && <View style={{ flex: 1 }}><ChatPane id={card.threadId} embedded /></View>}

      {edit ? <CardForm card={card} onClose={() => setEdit(false)} onDone={() => setEdit(false)} /> : null}
      {statusSheet ? <StatusSheet def={def} current={s.status.key} onClose={() => setStatusSheet(false)} onPick={(k, note) => { setStatusSheet(false); run(() => cardsApi.status(id, k, note)); }} /> : null}
      {assigneeSheet ? <AssigneeSheet members={members} current={s.assignee?.id} currentName={s.assignee && !s.assignee.id ? s.assignee.fullName : null} onClose={() => setAssigneeSheet(false)} onPick={(who) => { setAssigneeSheet(false); run(() => cardsApi.assign(id, who)); }} /> : null}
    </View>
  );
}
