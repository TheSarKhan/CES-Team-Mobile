import { useState } from 'react';
import { View, Text, TextInput, Pressable, Platform, Modal, ScrollView, Switch } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { X, Paperclip, ChevronDown, ChevronLeft, ChevronRight, CalendarDays, Pencil, Plus } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Avatar } from './Avatar';
import { Button, SelectBox, OptionList } from './ui';
import { uploadFile } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { visibleFields, money, totals, displayValue } from '../lib/cardUi';
import { isoToDisplay, displayToIso, todayIso } from '../lib/dates';
import { fileSize } from '../lib/format';
import { useRegistry } from '../hooks/useCards';

const web = Platform.OS === 'web' ? { outlineStyle: 'none' } : null;

function Label({ field, error }) {
  const { colors } = useTheme();
  return (
    <Text style={{ color: error ? colors.red : colors.ink2, fontWeight: '700', fontSize: 13.5, marginBottom: 6 }}>
      {field.label}{field.required ? <Text style={{ color: colors.red }}> *</Text> : null}
    </Text>
  );
}

function Input({ value, onChangeText, placeholder, multiline, keyboardType, suffix, error }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, borderColor: error ? colors.red : colors.line, backgroundColor: colors.surface, paddingHorizontal: 14 }}>
      <TextInput
        value={value ?? ''}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        multiline={multiline}
        keyboardType={keyboardType}
        style={[{ flex: 1, color: colors.ink, fontSize: 16, paddingVertical: 12, minHeight: multiline ? 92 : 48, textAlignVertical: multiline ? 'top' : 'center' }, web]}
      />
      {suffix ? <Text style={{ color: colors.muted, fontWeight: '700' }}>{suffix}</Text> : null}
    </View>
  );
}

/**
 * Məsul şəxslər (1 və ya bir neçə). Seçilənlər siyahıda göstərilir (× ilə çıxarılır); aşağıdakı sahədən yenisi əlavə olunur:
 * qrup üzvü dropdown siyahıdan seçilir (push alır), üzv olmayan şəxs sərbəst ad kimi yazılıb əlavə olunur.
 */
function UserPicker({ value, onChange, members, error }) {
  const { colors } = useTheme();
  const list = Array.isArray(value) ? value : value == null || value === '' ? [] : [value]; // köhnə tək dəyər də oxunur
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const person = (v) => (typeof v === 'number' ? (members || []).find((m) => m.user.id === v)?.user : null);
  const q = text.trim().toLowerCase();
  const taken = new Set(list.filter((v) => typeof v === 'number'));
  const suggestions = (members || []).filter((m) => !taken.has(m.user.id) && (!q || m.user.fullName.toLowerCase().includes(q))).slice(0, 8);
  const exact = q && (members || []).some((m) => m.user.fullName.toLowerCase() === q) || list.some((v) => typeof v === 'string' && v.toLowerCase() === q);
  const add = (v) => { onChange([...list, v]); setText(''); setOpen(false); };
  const addText = () => { const t = text.trim(); if (t && !exact) add(t); };
  const items = [
    ...suggestions.map((m) => ({ key: `u${m.user.id}`, label: m.user.fullName, sub: m.user.position || m.user.department, value: m.user.id })),
    ...(q && !exact ? [{ key: 'free', label: `«${text.trim()}» — sərbəst ad kimi əlavə et`, value: text.trim(), free: true }] : []),
  ];
  return (
    <View style={{ gap: 8 }}>
      {list.map((v, i) => {
        const u = person(v);
        const name = u ? u.fullName : String(v);
        return (
          <View key={`${typeof v}-${v}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
            <Avatar name={name} id={u?.id ?? i} uri={u?.avatarUrl} size={32} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: colors.ink, fontWeight: '700', fontSize: 15.5 }}>{name}</Text>
              {!u ? <Text style={{ color: colors.muted, fontSize: 12 }}>sistemdə yoxdur (sərbəst ad)</Text> : u.position || u.department ? <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 12 }}>{u.position || u.department}</Text> : null}
            </View>
            <Pressable onPress={() => onChange(list.filter((_, j) => j !== i))} hitSlop={8} accessibilityLabel={`${name} məsulluğunu götür`}><X size={20} color={colors.muted} /></Pressable>
          </View>
        );
      })}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1.5, borderColor: error ? colors.red : open ? colors.brand : colors.line, backgroundColor: colors.surface, paddingHorizontal: 14 }}>
        <TextInput
          value={text}
          onChangeText={(t) => { setText(t); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 220)}
          onSubmitEditing={addText}
          placeholder={list.length ? 'Başqa məsul şəxs əlavə et' : 'Məsul şəxs: ad yazın və ya siyahıdan seçin'}
          placeholderTextColor={colors.faint}
          style={[{ flex: 1, color: colors.ink, fontSize: 16, paddingVertical: 12, minHeight: 48 }, web]}
        />
        {text ? <Pressable onPress={() => setText('')} hitSlop={8} accessibilityLabel="Təmizlə"><X size={18} color={colors.muted} /></Pressable> : null}
        <Pressable onPress={() => setOpen((o) => !o)} hitSlop={8} accessibilityLabel="Siyahını aç">
          <ChevronDown size={20} color={colors.muted} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
        </Pressable>
      </View>
      {open && items.length ? <OptionList items={items} onPick={(it) => add(it.value)} /> : null}
    </View>
  );
}

function Files({ value, onChange, onError, known }) {
  const { colors } = useTheme();
  const [busy, setBusy] = useState(false);
  const ids = value || [];
  const add = async (assets, kind) => {
    setBusy(true);
    try {
      const out = [];
      for (const a of assets) out.push(await uploadFile({ uri: a.uri, name: a.name || a.fileName || (kind === 'IMAGE' ? 'sekil.jpg' : 'fayl'), mimeType: a.mimeType || a.type, kind }));
      known.current = { ...known.current, ...Object.fromEntries(out.map((f) => [f.id, f])) };
      onChange([...ids, ...out.map((f) => f.id)]);
    } catch (e) { onError?.(errorMessage(e, 'Fayl yüklənmədi')); } finally { setBusy(false); }
  };
  const pickFile = async () => { const r = await DocumentPicker.getDocumentAsync({ multiple: true, copyToCacheDirectory: true }); if (!r.canceled) add(r.assets, 'FILE'); };
  const pickImage = async () => { const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, quality: 0.85 }); if (!r.canceled) add(r.assets, 'IMAGE'); };
  return (
    <View style={{ gap: 8 }}>
      {ids.map((id) => {
        const f = known.current[id];
        return (
          <View key={id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
            <Paperclip size={18} color={colors.muted} />
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: colors.ink, fontWeight: '600' }}>{f?.fileName || `Fayl #${id}`}</Text>
              {f ? <Text style={{ color: colors.muted, fontSize: 12 }}>{fileSize(f.sizeBytes)}</Text> : null}
            </View>
            <Pressable onPress={() => onChange(ids.filter((x) => x !== id))} hitSlop={8}><X size={18} color={colors.muted} /></Pressable>
          </View>
        );
      })}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button variant="ghost" onPress={pickFile} loading={busy} style={{ flex: 1, height: 44 }}>+ Fayl</Button>
        <Button variant="ghost" onPress={pickImage} disabled={busy} style={{ flex: 1, height: 44 }}>+ Şəkil</Button>
      </View>
    </View>
  );
}

function Field({ field, values, set, errors, members, known, onError, nested }) {
  const { colors } = useTheme();
  const v = values[field.key];
  const err = errors?.[field.key];
  const body = (() => {
    switch (field.kind) {
      case 'TEXT': return <Input value={v} onChangeText={(t) => set(field.key, t)} placeholder={field.placeholder} error={err} />;
      case 'LONGTEXT': return <Input value={v} onChangeText={(t) => set(field.key, t)} placeholder={field.placeholder} multiline error={err} />;
      case 'MONEY': return <Input value={v == null ? '' : String(v)} onChangeText={(t) => set(field.key, t.replace(/[^0-9.,]/g, ''))} placeholder="0" keyboardType="decimal-pad" suffix={field.suffix} error={err} />;
      case 'NUMBER': return <Input value={v == null ? '' : String(v)} onChangeText={(t) => set(field.key, t.replace(/[^0-9.,]/g, ''))} placeholder="0" keyboardType="decimal-pad" suffix={field.suffix} error={err} />;
      case 'ROWS': return <Rows field={field} value={v} onChange={(x) => set(field.key, x)} error={err} members={members} known={known} onError={onError} />;
      case 'COMBO': return <ComboInput value={v} onChange={(t) => set(field.key, t)} registry={field.registry} placeholder={field.placeholder} error={err} />;
      case 'BOOL': return (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Switch value={v === true} onValueChange={(x) => set(field.key, x)} trackColor={{ true: colors.brand }} accessibilityLabel={field.label} />
          <Text style={{ color: v === true ? colors.ink : colors.muted, fontWeight: '600' }}>{v === true ? 'Bəli' : 'Xeyr'}</Text>
        </View>
      );
      case 'DATE': return <DateInput value={v} onChange={(t) => set(field.key, t)} error={err} />;
      case 'SELECT': return <SelectBox value={v} options={field.options} onChange={(x) => set(field.key, x)} error={err} clearable={!field.required} />;
      case 'USER': return <UserPicker value={v} onChange={(x) => set(field.key, x)} members={members} error={err} />;
      case 'FILES': return <Files value={v} onChange={(x) => set(field.key, x)} onError={onError} known={known} />;
      case 'BLOCK': {
        const on = !!v?.enabled;
        const sub = (k, val) => set(field.key, { ...(v || {}), enabled: true, [k]: val });
        return (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Switch value={on} onValueChange={(x) => set(field.key, x ? { ...(v || {}), enabled: true } : { enabled: false })} trackColor={{ true: colors.brand }} accessibilityLabel={field.label} />
              <Text style={{ color: on ? colors.ink : colors.muted, fontWeight: '600' }}>{on ? 'Var' : 'Yoxdur'}</Text>
            </View>
            {on ? (
              <View style={{ gap: 12, padding: 12, borderRadius: 14, backgroundColor: colors.sunk }}>
                {field.fields.map((sf) => (
                  <Field key={sf.key} field={sf} values={v || {}} set={sub} errors={errors} members={members} known={known} onError={onError} nested />
                ))}
              </View>
            ) : null}
          </View>
        );
      }
      default: return null;
    }
  })();
  return (
    <View style={{ marginBottom: nested ? 0 : 16 }}>
      <Label field={field} error={err} />
      {body}
      {err ? <Text style={{ color: colors.red, fontSize: 12.5, marginTop: 4 }}>{err}</Text> : null}
    </View>
  );
}

const emptyVal = (v) => v == null || v === '' || v === false;

/** Sətir əlavə etmə pəncərəsi: alt sahələr addım-addım deyil, bir kiçik formada; yadda saxlayanda siyahıya düşür. */
function RowSheet({ field, initial, onSave, onClose, members, known, onError }) {
  const { colors } = useTheme();
  const [vals, setVals] = useState(initial || {});
  const [errs, setErrs] = useState({});
  const set = (k, v) => { setVals((x) => ({ ...x, [k]: v })); if (errs[k]) setErrs((e) => ({ ...e, [k]: undefined })); };
  const save = () => {
    const e = {};
    for (const sf of visibleFields(field.fields, vals)) {
      const v = vals[sf.key];
      if (sf.required && emptyVal(v)) e[sf.key] = `${sf.label} məcburidir`;
      else if ((sf.kind === 'NUMBER' || sf.kind === 'MONEY') && !emptyVal(v) && Number.isNaN(Number(String(v).replace(',', '.')))) e[sf.key] = 'Rəqəm daxil edin';
    }
    setErrs(e);
    if (Object.keys(e).length) return;
    onSave(vals);
  };
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 560, maxHeight: '92%', backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 4 }}>
            <Text style={{ flex: 1, color: colors.ink, fontWeight: '800', fontSize: 19 }}>{field.placeholder || field.label}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Bağla"><X size={22} color={colors.muted} /></Pressable>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} keyboardShouldPersistTaps="handled">
            {visibleFields(field.fields, vals).map((sf) => (
              <Field key={sf.key} field={sf} values={vals} set={set} errors={errs} members={members} known={known} onError={onError} nested />
            ))}
            <Button onPress={save}>Əlavə et</Button>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Təkrarlanan sətirlər: əlavə olunanlar siyahıda göstərilir (düzəliş / silmə), yenisi «Əlavə et» düyməsi ilə kiçik pəncərədə yazılır. */
function Rows({ field, value, onChange, error, members, known, onError }) {
  const { colors } = useTheme();
  const rows = (value || []).filter((r) => r && Object.values(r).some((x) => !emptyVal(x)));
  const [sheet, setSheet] = useState(null); // {index: number|null, initial}
  const summary = (r) => field.fields.map((sf) => displayValue(sf, r[sf.key])).filter(Boolean).join(' · ');
  const hasLiters = field.fields.some((f) => f.key === 'liters');
  const total = hasLiters ? rows.reduce((a, r) => a + (Number(String(r.liters ?? '').replace(',', '.')) || 0), 0) : 0;
  const save = (vals) => {
    const clean = Object.fromEntries(Object.entries(vals).filter(([, v]) => !emptyVal(v)));
    onChange(sheet.index == null ? [...rows, clean] : rows.map((r, i) => (i === sheet.index ? clean : r)));
    setSheet(null);
  };
  return (
    <View style={{ gap: 10 }}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 14, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line }}>
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.brand, fontWeight: '800', fontSize: 13 }}>{i + 1}</Text></View>
          <Pressable onPress={() => setSheet({ index: i, initial: r })} style={{ flex: 1 }} accessibilityRole="button" accessibilityLabel={`${i + 1}. sətri düzəlt`}>
            <Text style={{ color: colors.ink, fontWeight: '600', fontSize: 15.5 }}>{summary(r) || '—'}</Text>
          </Pressable>
          <Pressable onPress={() => setSheet({ index: i, initial: r })} hitSlop={8} accessibilityLabel="Düzəlt"><Pencil size={18} color={colors.muted} /></Pressable>
          <Pressable onPress={() => onChange(rows.filter((_, j) => j !== i))} hitSlop={8} accessibilityLabel="Sil"><X size={20} color={colors.muted} /></Pressable>
        </View>
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Button variant="ghost" onPress={() => setSheet({ index: null, initial: {} })} style={{ flex: 1, height: 46, borderColor: error && !rows.length ? colors.red : colors.line }}>
          {`+ ${field.placeholder || 'Əlavə et'}`}
        </Button>
        {total > 0 ? <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 16 }}>Cəmi: <Text style={{ color: colors.brand }}>{String(Math.round(total * 100) / 100).replace('.', ',')} l</Text></Text> : null}
      </View>
      {sheet ? <RowSheet field={field} initial={sheet.initial} onSave={save} onClose={() => setSheet(null)} members={members} known={known} onError={onError} /> : null}
    </View>
  );
}

const fold = (s) => String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ə/g, 'e').replace(/ı/g, 'i');

/**
 * Sərbəst yazı + hazır siyahı (reyestr). İstənilən söz yazıla bilər; yazdıqca uyğun hazır dəyərlər görünür və toxunanda seçilir.
 * Siyahıda olmayan yeni dəyər kart saxlananda avtomatik reyestrə əlavə olunur.
 */
function ComboInput({ value, onChange, registry, placeholder, error }) {
  const { colors } = useTheme();
  const q = useRegistry(registry);
  const [focus, setFocus] = useState(false); // siyahı açıqdır (fokus və ya ox düyməsi)
  const text = value ?? '';
  const items = q.data || [];
  const key = fold(text.trim());
  const exact = key && items.some((i) => fold(i.name) === key);
  const matches = key ? items.filter((i) => fold(i.name).includes(key) && fold(i.name) !== key).slice(0, 7) : items.slice(0, 7);
  const choose = (name) => { onChange(name); setFocus(false); };
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1.5, borderColor: error ? colors.red : focus ? colors.brand : colors.line, backgroundColor: colors.surface, paddingHorizontal: 14 }}>
        <TextInput
          value={text}
          onChangeText={onChange}
          onFocus={() => setFocus(true)}
          onBlur={() => setTimeout(() => setFocus(false), 220)}
          placeholder={placeholder || 'Yazın və ya siyahıdan seçin'}
          placeholderTextColor={colors.faint}
          style={[{ flex: 1, color: colors.ink, fontSize: 16, paddingVertical: 12, minHeight: 48 }, web]}
        />
        {text ? <Pressable onPress={() => onChange('')} hitSlop={8} accessibilityLabel="Təmizlə"><X size={18} color={colors.muted} /></Pressable> : null}
        <Pressable onPress={() => setFocus((o) => !o)} hitSlop={8} accessibilityLabel="Siyahını aç" style={{ marginLeft: 8 }}>
          <ChevronDown size={20} color={colors.muted} style={{ transform: [{ rotate: focus ? '180deg' : '0deg' }] }} />
        </Pressable>
      </View>
      {key && !exact ? (
        <Text style={{ color: colors.brand, fontSize: 12.5, fontWeight: '600' }}>«{text.trim()}» siyahıda yoxdur — kart saxlananda yeni əlavə olunacaq{matches.length ? '. Və ya seçin:' : ''}</Text>
      ) : null}
      {focus && matches.length ? <OptionList items={matches.map((i) => ({ key: i.id, label: i.name }))} onPick={(it) => choose(it.label)} /> : null}
    </View>
  );
}

const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];
const WEEKDAYS = ['B.e.', 'Ç.a.', 'Ç.', 'C.a.', 'C.', 'Ş.', 'B.'];
const pad2 = (n) => String(n).padStart(2, '0');
const toIso = (y, m, d) => `${y}-${pad2(m + 1)}-${pad2(d)}`;

/** Tarix sahəsi: toxunanda təqvim açılır, istənilən gün seçilir (ay-ay irəli/geri). Dəyər ISO (GGGG-AA-GG) saxlanılır. */
export function DateInput({ value, onChange, error }) {
  const { colors } = useTheme();
  const iso = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
  const [open, setOpen] = useState(false);
  const base = iso ? new Date(`${iso}T12:00:00`) : new Date();
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() });
  const today = todayIso();
  const first = new Date(view.y, view.m, 1);
  const lead = (first.getDay() + 6) % 7; // həftə bazar ertəsindən başlayır
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const move = (delta) => setView((v) => { const d = new Date(v.y, v.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const pick = (d) => { onChange(toIso(view.y, view.m, d)); setOpen(false); };
  const jump = (offset) => { const t = todayIso(offset); onChange(t); const d = new Date(`${t}T12:00:00`); setView({ y: d.getFullYear(), m: d.getMonth() }); setOpen(false); };
  return (
    <View style={{ gap: 6 }}>
      <Pressable onPress={() => setOpen((o) => !o)} accessibilityRole="button"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, borderRadius: 14, borderWidth: 1.5, borderColor: error ? colors.red : open ? colors.brand : colors.line, backgroundColor: colors.surface, paddingHorizontal: 14 }}>
        <CalendarDays size={18} color={iso ? colors.brand : colors.faint} />
        <Text style={{ flex: 1, color: iso ? colors.ink : colors.faint, fontSize: 16 }}>{iso ? isoToDisplay(iso) : 'Tarix seçin'}</Text>
        {iso ? <Pressable onPress={() => { onChange(''); setOpen(false); }} hitSlop={8} accessibilityLabel="Təmizlə"><X size={18} color={colors.muted} /></Pressable> : null}
        <ChevronDown size={20} color={colors.muted} style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }} />
      </Pressable>
      {open ? (
        <View style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, padding: 10, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={() => move(-1)} hitSlop={8} accessibilityLabel="Əvvəlki ay" style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}><ChevronLeft size={22} color={colors.ink2} /></Pressable>
            <Text style={{ flex: 1, textAlign: 'center', color: colors.ink, fontWeight: '800', fontSize: 16 }}>{MONTHS[view.m]} {view.y}</Text>
            <Pressable onPress={() => move(1)} hitSlop={8} accessibilityLabel="Növbəti ay" style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}><ChevronRight size={22} color={colors.ink2} /></Pressable>
          </View>
          <View style={{ flexDirection: 'row' }}>
            {WEEKDAYS.map((w) => <Text key={w} style={{ flex: 1, textAlign: 'center', color: colors.muted, fontSize: 12, fontWeight: '700' }}>{w}</Text>)}
          </View>
          {Array.from({ length: cells.length / 7 }, (_, row) => (
            <View key={row} style={{ flexDirection: 'row' }}>
              {cells.slice(row * 7, row * 7 + 7).map((d, i) => {
                const cellIso = d ? toIso(view.y, view.m, d) : '';
                const sel = cellIso && cellIso === iso;
                const isToday = cellIso === today;
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center', paddingVertical: 2 }}>
                    {d ? (
                      <Pressable onPress={() => pick(d)} accessibilityRole="button" accessibilityLabel={`${d} ${MONTHS[view.m]}`}
                        style={{ width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: sel ? colors.brand : 'transparent', borderWidth: isToday && !sel ? 1.5 : 0, borderColor: colors.brand }}>
                        <Text style={{ color: sel ? '#fff' : colors.ink, fontWeight: sel || isToday ? '800' : '500', fontSize: 15 }}>{d}</Text>
                      </Pressable>
                    ) : <View style={{ width: 38, height: 38 }} />}
                  </View>
                );
              })}
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 18, paddingTop: 4, paddingHorizontal: 6 }}>
            <Pressable onPress={() => jump(0)} hitSlop={6}><Text style={{ color: colors.brand, fontWeight: '700', fontSize: 14 }}>Bu gün</Text></Pressable>
            <Pressable onPress={() => jump(1)} hitSlop={6}><Text style={{ color: colors.brand, fontWeight: '700', fontSize: 14 }}>Sabah</Text></Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

/** Addımın sahələrini göstərir; visibleWhen şərtinə görə gizlədir. */
export function FormFields({ fields, values, set, errors, members, known, onError }) {
  const { colors } = useTheme();
  const t = totals(values);
  return (
    <View>
      {visibleFields(fields, values).map((f) => (
        <View key={f.key}>
          <Field field={f} values={values} set={set} errors={errors} members={members} known={known} onError={onError} />
          {f.key === 'vat' && t ? (
            <View style={{ marginTop: -6, marginBottom: 16, padding: 14, borderRadius: 14, backgroundColor: colors.brandTint, gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.ink2 }}>ƏDV məbləği</Text><Text style={{ color: colors.ink, fontWeight: '700' }}>{money(t.vat) || '0 AZN'}</Text></View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ color: colors.ink, fontWeight: '700' }}>Ümumi məbləğ</Text><Text style={{ color: colors.brand, fontWeight: '800', fontSize: 17 }}>{money(t.total)}</Text></View>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}
