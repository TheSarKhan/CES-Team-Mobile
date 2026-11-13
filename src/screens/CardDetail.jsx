import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform, Modal, TextInput, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useLayout } from '../lib/useLayout';
import { ArrowLeft, Info, Pencil, ChevronRight, ArrowRight, Paperclip, UserRound, History, Check } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { StatusBadge, TypeTile } from '../components/CardParts';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/ui';
import { CardForm } from './CardForm';
import { DateInput } from '../components/FormFields';
import { ChatPane } from './ChatPane';
import { cardsApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { absoluteUrl } from '../config';
import { useCard, useCardHistory, useDef } from '../hooks/useCards';
import { useMembers } from '../hooks/useChat';
import { displayValue, computedRows, tone, visibleFields } from '../lib/cardUi';
import { fileSize, hhmm, dayLabel } from '../lib/format';
import { isoToDisplay, displayToIso, todayIso } from '../lib/dates';
import { SelectBox } from '../components/ui';

const TABS = [['info', 'Məlumat'], ['history', 'Tarixçə']];

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

/** Məsul şəxslər (1+): qrup üzvləri qeyd qutusu ilə seçilir, üzv olmayan şəxs adla əlavə olunur; «Yadda saxla» hamısını bir dəfəyə təyin edir. */
function AssigneeSheet({ members, current, onSave, onClose }) {
  const { colors } = useTheme();
  const [picked, setPicked] = useState(current); // [id | ad]
  const [text, setText] = useState('');
  const has = (v) => picked.some((x) => x === v);
  const toggle = (v) => setPicked((p) => (p.some((x) => x === v) ? p.filter((x) => x !== v) : [...p, v]));
  const memberIds = new Set((members || []).map((m) => m.user.id));
  const freeNames = picked.filter((v) => typeof v === 'string');
  const addFree = () => { const t = text.trim(); if (t && !picked.some((x) => String(x).toLowerCase() === t.toLowerCase())) setPicked((p) => [...p, t]); setText(''); };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 520, maxHeight: '85%', backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 12 }}>
          <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 19, padding: 8 }}>Məsul şəxslər</Text>
          <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 8, paddingBottom: 8 }}>
            <TextInput value={text} onChangeText={setText} onSubmitEditing={addFree} placeholder="Üzv olmayan şəxs: ad yazın" placeholderTextColor={colors.faint}
              style={[{ flex: 1, height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.line, color: colors.ink, paddingHorizontal: 14, fontSize: 16 }, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]} />
            <Button variant="ghost" disabled={!text.trim()} onPress={addFree} style={{ height: 46 }}>Əlavə et</Button>
          </View>
          <ScrollView>
            {freeNames.map((n) => (
              <Pressable key={`n-${n}`} onPress={() => toggle(n)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, backgroundColor: pressed ? colors.sunk : 'transparent' })}>
                <Avatar name={n} id={n.length} size={38} />
                <View style={{ flex: 1 }}><Text style={{ color: colors.ink, fontWeight: '600', fontSize: 15.5 }}>{n}</Text><Text style={{ color: colors.muted, fontSize: 12 }}>sistemdə yoxdur (sərbəst ad)</Text></View>
                <Check size={20} color={colors.brand} />
              </Pressable>
            ))}
            {(members || []).map((m) => {
              const on = has(m.user.id);
              return (
                <Pressable key={m.user.id} onPress={() => toggle(m.user.id)} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 12, backgroundColor: pressed ? colors.sunk : 'transparent' })}>
                  <Avatar name={m.user.fullName} id={m.user.id} uri={m.user.avatarUrl} size={38} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.ink, fontWeight: '600', fontSize: 15.5 }}>{m.user.fullName}</Text>
                    {m.user.position || m.user.department ? <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12.5 }}>{m.user.position || m.user.department}</Text> : null}
                  </View>
                  <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: on ? colors.brand : colors.line, backgroundColor: on ? colors.brand : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {on ? <Check size={15} color="#fff" /> : null}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={{ flexDirection: 'row', gap: 8, paddingTop: 10 }}>
            {picked.length ? <Button variant="ghost" onPress={() => setPicked([])} style={{ flex: 1 }}>Hamısını götür</Button> : null}
            <Button onPress={() => onSave(picked)} style={{ flex: 2 }}>{picked.length ? `Yadda saxla (${picked.length})` : 'Yadda saxla'}</Button>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const DAY_STATES = [['WORKED', 'İşlədi', 'green'], ['NOT_WORKED', 'İşləmədi', 'red'], ['PARTIAL', 'Qismən (saat)', 'amber'], ['CANCELLED', 'Ləğv', 'gray']];

/** Sorğunun iş günləri: hər gün üçün nəticə (İşlədi / İşləmədi / Qismən / Ləğv) + qeyd. */
function DaySheet({ onSave, onClose }) {
  const { colors } = useTheme();
  const [date, setDate] = useState(todayIso());
  const [state, setState] = useState('WORKED');
  const [note, setNote] = useState('');
  const input = { height: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.line, color: colors.ink, paddingHorizontal: 14, fontSize: 15.5 };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 520, maxHeight: '92%', backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22 }}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
            <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 19 }}>İş günü əlavə et</Text>
            <DateInput value={date} onChange={setDate} />
            <SelectBox value={state} options={DAY_STATES.map(([k, label]) => ({ value: k, label }))} onChange={(x) => x && setState(x)} clearable={false} />
            <TextInput value={note} onChangeText={setNote} placeholder="Qeyd (məs. yağış, sahəyə icazə verilmədi)" placeholderTextColor={colors.faint} style={[input, Platform.OS === 'web' ? { outlineStyle: 'none' } : null]} />
            <Button disabled={!date} onPress={() => onSave({ date, state, ...(note.trim() ? { note: note.trim() } : {}) })}>Əlavə et</Button>
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
  if (e.type === 'ASSIGNEE') {
    const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
    const from = arr(e.data.from).join(', '), to = arr(e.data.to).join(', ');
    return to ? `${who} məsulları ${from ? `«${from}» → ` : ''}«${to}» etdi` : `${who} məsulları götürdü`;
  }
  if (e.type === 'FIELDS') return `${who} kartı yenilədi (${(e.data.changed || []).length} sahə)`;
  return who;
}

export function CardDetail({ id, onBack, onOpenChatGroup }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const router = useRouter();
  const { isWide } = useLayout();
  const q = useCard(id);
  const card = q.data;
  const def = useDef(card?.summary.type);
  const members = useMembers(card?.groupId).data;
  const [view, setView] = useState('chat'); // kart açılanda birbaşa söhbət; «i» məlumat səhifəsini açır
  const [tab, setTab] = useState('info');
  const [edit, setEdit] = useState(false);
  const [statusSheet, setStatusSheet] = useState(false);
  const [assigneeSheet, setAssigneeSheet] = useState(false);
  const [daySheet, setDaySheet] = useState(false);
  const [orderForm, setOrderForm] = useState(false);
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
  const fieldsToShow = def.steps.flatMap((st) => st.fields).filter((f) => f.kind !== 'USER' && f.kind !== 'FILES' && f.key !== 'days');
  const days = (card.fields.days || []).slice().sort((a, b) => String(a.date).localeCompare(String(b.date)));
  const saveDays = (next) => run(() => cardsApi.update(id, { ...card.fields, days: next }));
  const dayCount = (k) => days.filter((d) => d.state === k).length;
  const rows = visibleFields(fieldsToShow, card.fields).map((f) => [f, displayValue(f, card.fields[f.key])]).filter(([, v]) => v);

  if (view === 'chat') {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <View style={{ paddingTop: Platform.OS === 'web' ? 12 : insets.top + 6, paddingHorizontal: 14, paddingBottom: 10, backgroundColor: colors.header, borderBottomWidth: 1, borderBottomColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          {onBack ? <Pressable onPress={onBack} hitSlop={10} accessibilityLabel="Geri"><ArrowLeft size={24} color={colors.headerInk} /></Pressable> : null}
          <Pressable onPress={() => { setTab('info'); setView('info'); }} accessibilityRole="button" accessibilityLabel="Kart məlumatları" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TypeTile type={s.type} size={44} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text numberOfLines={1} style={{ color: colors.headerInk, fontWeight: '800', fontSize: 18 }}>{s.title}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 13, flexShrink: 1 }}>{s.number} · {s.typeLabel}</Text>
                <StatusBadge status={s.status} size="sm" />
              </View>
            </View>
          </Pressable>
          <Pressable onPress={() => { setTab('info'); setView('info'); }} hitSlop={10} accessibilityRole="button" accessibilityLabel="Kart haqqında məlumat" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.sunk, alignItems: 'center', justifyContent: 'center' }}>
            <Info size={20} color={colors.ink2} />
          </Pressable>
        </View>
        <View style={{ flex: 1 }}><ChatPane id={card.threadId} embedded /></View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingTop: Platform.OS === 'web' ? 14 : insets.top + 6, paddingHorizontal: 14, paddingBottom: 10, backgroundColor: colors.header, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => setView('chat')} hitSlop={10} accessibilityLabel="Söhbətə qayıt"><ArrowLeft size={24} color={colors.headerInk} /></Pressable>
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
            <Text numberOfLines={1} style={{ color: colors.ink2, fontSize: 13 }}>Məsul: {s.assignees?.length ? s.assignees.map((a) => a.fullName.split(' ')[0]).join(', ') : 'Təyin olunmayıb'}</Text>
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
            <Row label="Məsul şəxslər" onPress={() => setAssigneeSheet(true)}>
              {s.assignees?.length ? (
                <View style={{ gap: 8 }}>
                  {s.assignees.map((a, i) => (
                    <View key={`${a.id ?? a.fullName}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Avatar name={a.fullName} id={a.id ?? i} uri={a.avatarUrl} size={30} />
                      <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 15.5 }}>{a.fullName}</Text>
                    </View>
                  ))}
                </View>
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

          {s.type === 'ORDER' ? (
            <View style={{ marginTop: 14, backgroundColor: colors.surface, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.line, gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ flex: 1, color: colors.ink, fontWeight: '800', fontSize: 16 }}>İş günləri</Text>
                {days.length ? <Text style={{ color: colors.muted, fontSize: 13 }}>{dayCount('WORKED')} gün işlədi{dayCount('NOT_WORKED') ? ` · ${dayCount('NOT_WORKED')} işləmədi` : ''}</Text> : null}
              </View>
              {days.length === 0 ? <Text style={{ color: colors.muted, fontSize: 14 }}>Hələ gün qeyd olunmayıb. Hər iş günündən sonra nəticəni əlavə edin.</Text> : null}
              {days.map((d, i) => {
                const st = DAY_STATES.find((x) => x[0] === d.state) || DAY_STATES[0];
                const t = tone(colors, st[2]);
                return (
                  <View key={`${d.date}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderTopWidth: i ? 1 : 0, borderTopColor: colors.line }}>
                    <Text style={{ width: 92, color: colors.ink, fontWeight: '700', fontSize: 14.5 }}>{isoToDisplay(d.date)}</Text>
                    <View style={{ backgroundColor: t.bg, borderRadius: 12, paddingHorizontal: 10, height: 26, justifyContent: 'center' }}><Text style={{ color: t.fg, fontWeight: '700', fontSize: 12.5 }}>{st[1]}</Text></View>
                    <Text numberOfLines={2} style={{ flex: 1, color: colors.ink2, fontSize: 13.5 }}>{d.note || ''}</Text>
                    <Pressable onPress={() => saveDays(days.filter((_, j) => j !== i))} hitSlop={8} accessibilityLabel="Günü sil"><Text style={{ color: colors.faint, fontSize: 18 }}>×</Text></Pressable>
                  </View>
                );
              })}
              <Button variant="ghost" onPress={() => setDaySheet(true)} style={{ height: 44 }}>+ Gün əlavə et</Button>
            </View>
          ) : null}

          {error ? <Text accessibilityRole="alert" style={{ color: colors.red, marginTop: 12 }}>{error}</Text> : null}

          <View style={{ marginTop: 16, gap: 10 }}>
            {s.type === 'REQUEST' && s.status.key !== 'REJECTED' ? (
              <Button onPress={() => setOrderForm(true)}>Sifariş yarat</Button>
            ) : null}
            {nextStatus && !(s.type === 'REQUEST' && nextStatus.key === 'APPROVED') ? (
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

      {orderForm ? (
        <CardForm
          type="ORDER"
          groupId={card.groupId}
          prefill={{
            customer: card.fields.customer, items: card.fields.items, area: card.fields.area, period: card.fields.period,
            startDate: card.fields.startDate, startTime: card.fields.startTime, requestNo: s.number,
            assignees: (s.assignees || []).map((a) => a.id ?? a.fullName),
          }}
          onClose={() => setOrderForm(false)}
          onDone={async (newId) => {
            setOrderForm(false);
            // Sorğu «Təsdiqləndi» olur (sifariş yaradıldı)
            if (!s.terminal) { try { refresh(await cardsApi.status(id, 'APPROVED', 'Sifariş yaradıldı')); } catch { /* status dəyişməsə də sifariş yaranıb */ } }
            router.navigate(isWide ? `/cards?c=${newId}` : `/card/${newId}`);
          }}
        />
      ) : null}
      {daySheet ? <DaySheet onClose={() => setDaySheet(false)} onSave={(d) => { setDaySheet(false); saveDays([...days, d]); }} /> : null}
      {edit ? <CardForm card={card} onClose={() => setEdit(false)} onDone={() => setEdit(false)} /> : null}
      {statusSheet ? <StatusSheet def={def} current={s.status.key} onClose={() => setStatusSheet(false)} onPick={(k, note) => { setStatusSheet(false); run(() => cardsApi.status(id, k, note)); }} /> : null}
      {assigneeSheet ? <AssigneeSheet members={members} current={(s.assignees || []).map((a) => a.id ?? a.fullName)} onClose={() => setAssigneeSheet(false)} onSave={(list) => { setAssigneeSheet(false); run(() => cardsApi.assign(id, list)); }} /> : null}
    </View>
  );
}
