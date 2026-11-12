import { useState } from 'react';
import { View, Text, TextInput, Pressable, Platform, Modal, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { X, Paperclip } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Avatar } from './Avatar';
import { Chip, Button } from './ui';
import { uploadFile } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { visibleFields, money, totals } from '../lib/cardUi';
import { isoToDisplay, displayToIso, todayIso } from '../lib/dates';
import { fileSize } from '../lib/format';

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

/** Məsul: sərbəst mətn. Qrup üzvlərinin adları təklif kimi görünür; üzv seçilərsə sistemdə təyin olunur (push alır). */
function UserPicker({ value, onChange, members, error }) {
  const { colors } = useTheme();
  const picked = typeof value === 'number' ? (members || []).find((m) => m.user.id === value)?.user : null;
  const text = typeof value === 'number' ? picked?.fullName ?? '' : value ?? '';
  const q = String(text).trim().toLowerCase();
  const suggestions = (members || []).filter((m) => !picked && (!q || m.user.fullName.toLowerCase().includes(q)) && m.user.fullName.toLowerCase() !== q).slice(0, 6);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, borderWidth: 1.5, borderColor: error ? colors.red : colors.line, backgroundColor: colors.surface, paddingHorizontal: 14 }}>
        {picked ? <Avatar name={picked.fullName} id={picked.id} size={28} /> : null}
        <TextInput
          value={text}
          onChangeText={(t) => onChange(t)}
          placeholder="Ad yazın (məs. Bəhruz)"
          placeholderTextColor={colors.faint}
          style={[{ flex: 1, color: colors.ink, fontSize: 16, paddingVertical: 12, minHeight: 48 }, web]}
        />
        {text ? <Pressable onPress={() => onChange(null)} hitSlop={8} accessibilityLabel="Təmizlə"><X size={18} color={colors.muted} /></Pressable> : null}
      </View>
      {suggestions.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {suggestions.map((m) => <Chip key={m.user.id} label={m.user.fullName} onPress={() => onChange(m.user.id)} />)}
        </View>
      ) : null}
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
      case 'ROWS': return <Rows field={field} value={v} onChange={(x) => set(field.key, x)} error={err} />;
      case 'DATE': return <DateInput value={v} onChange={(t) => set(field.key, t)} error={err} />;
      case 'SELECT':
        return (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {field.options.map((o) => <Chip key={o.value} label={o.label} active={String(v ?? '') === o.value} onPress={() => set(field.key, String(v ?? '') === o.value ? '' : o.value)} />)}
          </View>
        );
      case 'USER': return <UserPicker value={v} onChange={(x) => set(field.key, x)} members={members} error={err} />;
      case 'FILES': return <Files value={v} onChange={(x) => set(field.key, x)} onError={onError} known={known} />;
      case 'BLOCK': {
        const on = !!v?.enabled;
        const sub = (k, val) => set(field.key, { ...(v || {}), enabled: true, [k]: val });
        return (
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Chip label="Var" active={on} onPress={() => set(field.key, { ...(v || {}), enabled: true })} />
              <Chip label="Yox" active={!on} onPress={() => set(field.key, { enabled: false })} />
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

function Rows({ field, value, onChange, error }) {
  const { colors } = useTheme();
  const rows = value && value.length ? value : [{}];
  const setRow = (i, k, v) => onChange(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));
  const total = rows.reduce((a, r) => a + (Number(String(r.liters ?? '').replace(',', '.')) || 0), 0);
  return (
    <View style={{ gap: 10 }}>
      {rows.map((r, i) => (
        <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 14, backgroundColor: colors.sunk }}>
          <View style={{ flex: 1, gap: 8 }}>
            {field.fields.map((sf) => (
              <View key={sf.key}>
                <Text style={{ color: colors.muted, fontSize: 12.5, fontWeight: '700', marginBottom: 4 }}>{sf.label}</Text>
                <Input
                  value={r[sf.key] == null ? '' : String(r[sf.key])}
                  onChangeText={(t) => setRow(i, sf.key, sf.kind === 'NUMBER' ? t.replace(/[^0-9.,]/g, '') : t)}
                  placeholder={sf.placeholder || (sf.kind === 'NUMBER' ? '0' : '')}
                  keyboardType={sf.kind === 'NUMBER' ? 'decimal-pad' : undefined}
                  suffix={sf.suffix}
                  error={error && !r[sf.key]}
                />
              </View>
            ))}
          </View>
          {rows.length > 1 ? (
            <Pressable onPress={() => onChange(rows.filter((_, j) => j !== i))} hitSlop={8} accessibilityLabel="Sətri sil" style={{ paddingTop: 22 }}><X size={20} color={colors.muted} /></Pressable>
          ) : null}
        </View>
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Button variant="ghost" onPress={() => onChange([...rows, {}])} style={{ flex: 1, height: 44 }}>+ Sətir əlavə et</Button>
        {total > 0 ? <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 16 }}>Cəmi: <Text style={{ color: colors.brand }}>{String(Math.round(total * 100) / 100).replace('.', ',')} l</Text></Text> : null}
      </View>
    </View>
  );
}

/** Tarix: GG.AA.İİİİ yazılır (və ya "Bu gün"/"Sabah"); dəyər ISO saxlanılır. */
function DateInput({ value, onChange, error }) {
  const { colors } = useTheme();
  const [text, setText] = useState(isoToDisplay(value));
  const apply = (t) => {
    setText(t);
    const iso = displayToIso(t);
    onChange(iso === null ? `?${t}` : iso); // səhv format "?" ilə işarələnir, doğrulamada tutulur
  };
  return (
    <View style={{ gap: 8 }}>
      <Input value={text} onChangeText={apply} placeholder="GG.AA.İİİİ" keyboardType="numbers-and-punctuation" error={error} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Chip label="Bu gün" onPress={() => apply(isoToDisplay(todayIso()))} />
        <Chip label="Sabah" onPress={() => apply(isoToDisplay(todayIso(1)))} />
      </View>
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
