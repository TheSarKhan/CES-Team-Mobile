import { useMemo, useRef, useState } from 'react';
import { Modal, View, Text, ScrollView, Pressable, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, X, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Button, SelectBox } from '../components/ui';
import { FormFields } from '../components/FormFields';
import { TypeTile } from '../components/CardParts';
import { cardsApi } from '../api/endpoints';
import { errorMessage } from '../api/client';
import { useCardTypes } from '../hooks/useCards';
import { useConversations, useMembers } from '../hooks/useChat';
import { visibleFields } from '../lib/cardUi';
import { displayToIso } from '../lib/dates';

const NO_GROUP = 'Siz heç bir qrupun üzvü deyilsiniz, ona görə kart yaratmaq olmur. Admin sizi Satış və ya Əməliyyat qrupuna əlavə etməlidir.';
const empty = (v) => v == null || v === '' || (Array.isArray(v) && v.length === 0);
const blankRow = (r) => !r || Object.values(r).every((x) => x == null || String(x).trim() === '');

/** Çoxaddımlı forma. card verilibsə redaktədir. */
export function CardForm({ onClose, onDone, groupId: groupProp, type: typeProp, card, prefill }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const typesQ = useCardTypes();
  const convsQ = useConversations();
  const groups = (convsQ.data || []).filter((c) => c.type === 'GROUP');
  const editing = !!card;

  const [groupId, setGroupId] = useState(card?.groupId ?? groupProp ?? null);
  const [type, setType] = useState(card?.summary?.type ?? typeProp ?? null);
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(() => ({ ...(card?.fields || {}), ...(card ? { assignees: (card.summary.assignees || []).map((a) => a.id ?? a.fullName) } : {}), ...(prefill || {}) }));
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);
  const known = useRef(Object.fromEntries((card?.files || []).map((f) => [f.id, f])));

  const defs = typesQ.data || [];
  const def = defs.find((d) => d.type === (type || (defs.length === 1 ? defs[0].type : null)));
  // Qrup: açıq seçilməyibsə növün defolt qrupu (Sorğu → Satış, qalanı → Əməliyyat), yoxsa ilk qrup
  const effGroup = groupId ?? groups.find((g) => g.name === def?.defaultGroup)?.id ?? groups[0]?.id ?? null;
  const membersQ = useMembers(effGroup);

  const set = (k, v) => { setValues((s) => ({ ...s, [k]: v })); if (errors[k]) setErrors((e) => ({ ...e, [k]: undefined })); };
  const steps = def?.steps || [];
  const last = step === steps.length - 1;
  const cur = steps[step];

  const validateStep = () => {
    const errs = {};
    const check = (fields, ctx, prefix = '') => {
      for (const f of visibleFields(fields, ctx)) {
        const v = ctx[f.key];
        if (f.kind === 'BLOCK') { if (v?.enabled) check(f.fields, v, prefix + f.key + '.'); continue; }
        if (f.kind === 'ROWS') {
          const rows = (v || []).filter((r) => !blankRow(r));
          if (!rows.length) { if (f.required) errs[prefix + f.key] = `${f.label} məcburidir`; }
          else if (rows.some((r) => f.fields.some((sf) => sf.required && empty(r[sf.key])))) errs[prefix + f.key] = 'Hər sətirdə ' + f.fields.filter((x) => x.required).map((x) => x.label.toLowerCase()).join(' və ') + ' yazın';
          else if (rows.some((r) => f.fields.some((sf) => (sf.kind === 'NUMBER' || sf.kind === 'MONEY') && !empty(r[sf.key]) && Number.isNaN(Number(String(r[sf.key]).replace(',', '.')))))) errs[prefix + f.key] = 'Rəqəm daxil edin';
          else if (rows.some((r) => f.fields.some((sf) => sf.kind === 'DATE' && typeof r[sf.key] === 'string' && r[sf.key].startsWith('?')))) errs[prefix + f.key] = 'Tarixi GG.AA.İİİİ formatında yazın';
          continue;
        }
        if (f.required && empty(v)) errs[prefix + f.key] = `${f.label} məcburidir`;
        if (f.kind === 'DATE' && typeof v === 'string' && v.startsWith('?')) errs[prefix + f.key] = 'Tarixi GG.AA.İİİİ formatında yazın';
        if ((f.kind === 'MONEY' || f.kind === 'NUMBER') && !empty(v) && Number.isNaN(Number(String(v).replace(',', '.')))) errs[prefix + f.key] = 'Rəqəm daxil edin';
      }
    };
    check(cur.fields, values);
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const payload = () => {
    const out = {};
    for (const s of steps) for (const f of s.fields) {
      let v = values[f.key];
      if (f.kind === 'DATE') v = empty(v) ? null : (displayToIso(v) ?? v);
      if (f.kind === 'ROWS') {
        v = (v || []).filter((r) => !blankRow(r)).map((r) => {
          const o = { ...r };
          for (const sf of f.fields) if (sf.kind === 'DATE') o[sf.key] = empty(o[sf.key]) ? null : (displayToIso(o[sf.key]) ?? o[sf.key]);
          return o;
        });
      }
      out[f.key] = v;
    }
    return out;
  };

  // Məcburi sahəsi olmayan addım «Keç» ilə atlana bilər
  const optional = !!cur && !visibleFields(cur.fields, values).some((f) => f.required);
  const skip = () => { setBanner(''); setStep((x) => Math.min(x + 1, steps.length - 1)); };

  const next = async () => {
    setBanner('');
    if (!editing && !effGroup) { setBanner(NO_GROUP); return; }
    if (!validateStep()) return;
    if (!last) { setStep(step + 1); return; }
    await save();
  };

  // Redaktədə istənilən addımdan «Yadda saxla»: bütün addımlar yoxlanılır
  const save = async () => {
    setBanner('');
    if (editing) {
      for (let i = 0; i < steps.length; i++) {
        const errs = {};
        for (const f of visibleFields(steps[i].fields, values)) if (f.required && empty(values[f.key]) && f.kind !== 'ROWS' && f.kind !== 'BLOCK') errs[f.key] = `${f.label} məcburidir`;
        if (Object.keys(errs).length) { setStep(i); setErrors(errs); return; }
      }
    }
    setBusy(true);
    try {
      let id;
      if (editing) { await cardsApi.update(card.summary.id, payload()); id = card.summary.id; }
      else { const c = await cardsApi.create({ type: def.type, groupId: effGroup, fields: payload() }); id = c.summary.id; }
      qc.invalidateQueries({ queryKey: ['cards'] });
      qc.invalidateQueries({ queryKey: ['registry'] }); // yeni müştəri/texnika/ərazi reyestrə düşdü
      qc.invalidateQueries({ queryKey: ['card'] });
      qc.invalidateQueries({ queryKey: ['card-summary'] });
      onDone?.(id);
    } catch (e) {
      setBanner(errorMessage(e));
    } finally { setBusy(false); }
  };

  const loading = typesQ.isLoading || convsQ.isLoading;
  const title = cur?.title || (editing ? 'Kartı redaktə et' : 'Yeni kart');

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <View style={{ flex: 1, width: '100%', maxWidth: 640 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: Platform.OS === 'web' ? 18 : insets.top + 8, paddingBottom: 8 }}>
              <Pressable onPress={step > 0 ? () => setStep(step - 1) : (!editing && !typeProp && defs.length > 1 && def ? () => setType(null) : onClose)} hitSlop={10} accessibilityLabel="Geri">
                {step > 0 || (!editing && !typeProp && defs.length > 1 && def) ? <ArrowLeft size={24} color={colors.ink} /> : <X size={24} color={colors.ink} />}
              </Pressable>
              {def ? <TypeTile type={def.type} size={40} /> : null}
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 20 }}>{editing ? 'Kartı redaktə et' : def ? def.label : 'Yeni kart'}</Text>
                {steps.length > 1 ? <Text style={{ color: colors.muted, fontSize: 13 }}>Addım {step + 1} / {steps.length}</Text> : null}
              </View>
            </View>
            {steps.length > 1 && def ? (
              <View style={{ flexDirection: 'row', gap: 4, paddingHorizontal: 16, paddingBottom: 6 }} accessibilityLabel={`Addım ${step + 1} / ${steps.length}`}>
                {steps.map((_, i) => (
                  <Pressable key={i} disabled={!editing && i > step} onPress={() => (editing || i < step) && setStep(i)} hitSlop={{ top: 8, bottom: 8 }} style={{ flex: 1, height: 5, borderRadius: 3, backgroundColor: i <= step ? colors.brand : colors.line }} />
                ))}
              </View>
            ) : null}

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 30 }} keyboardShouldPersistTaps="handled">
              {loading ? (
                <Text style={{ color: colors.muted }}>Yüklənir…</Text>
              ) : !def && !editing && defs.length > 1 ? (
                <View style={{ gap: 10 }}>
                  <Text style={{ color: colors.muted, fontSize: 14.5, marginBottom: 4 }}>Hansı iş kartını yaratmaq istəyirsiniz?</Text>
                  {defs.map((d) => (
                    <Pressable key={d.type} onPress={() => setType(d.type)} accessibilityRole="button" accessibilityLabel={d.label}
                      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, opacity: pressed ? 0.85 : 1 })}>
                      <TypeTile type={d.type} size={68} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 17 }}>{d.label}</Text>
                        <Text style={{ color: colors.muted, fontSize: 13.5 }}>{d.description}</Text>
                      </View>
                      <ChevronRight size={20} color={colors.muted} />
                    </Pressable>
                  ))}
                </View>
              ) : !def ? (
                <Text style={{ color: colors.muted }}>Kart növü tapılmadı</Text>
              ) : (
                <>
                  {!editing && !convsQ.isLoading && !effGroup ? <Text accessibilityRole="alert" style={{ color: colors.red, fontSize: 14, marginBottom: 12 }}>{NO_GROUP}</Text> : null}
                  <Text style={{ color: colors.ink, fontWeight: '800', fontSize: 25, marginBottom: cur?.subtitle ? 4 : 14 }}>{cur?.title}</Text>
                  {cur?.subtitle ? <Text style={{ color: colors.muted, fontSize: 14.5, marginBottom: 14 }}>{cur.subtitle}</Text> : null}
                  {!editing && step === 0 && groups.length > 1 && !groupProp ? (
                    <View style={{ marginBottom: 16 }}>
                      <Text style={{ color: colors.ink2, fontWeight: '700', fontSize: 13.5, marginBottom: 6 }}>Qrup</Text>
                      <SelectBox value={effGroup == null ? '' : String(effGroup)} options={groups.map((g) => ({ value: String(g.id), label: g.name }))}
                        onChange={(x) => { if (x) { setGroupId(Number(x)); set('assignees', []); } }} clearable={false} />
                    </View>
                  ) : null}
                  <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: colors.line }}>
                    <FormFields fields={cur.fields} values={values} set={set} errors={errors} members={membersQ.data} known={known} onError={setBanner} />
                  </View>
                  {banner ? <Text accessibilityRole="alert" style={{ color: colors.red, marginTop: 12, fontSize: 14 }}>{banner}</Text> : null}
                </>
              )}
            </ScrollView>

            {def || editing ? <View style={{ flexDirection: 'row', gap: 10, padding: 16, paddingBottom: Platform.OS === 'web' ? 16 : insets.bottom + 12, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.bg }}>
              {!last && optional ? <Button variant="ghost" onPress={skip} disabled={busy} style={{ flex: 1 }}>Keç</Button> : null}
              {editing && !last ? <Button variant="ghost" onPress={() => save()} loading={busy} disabled={loading || !def} style={{ flex: 1 }}>Yadda saxla</Button> : null}
              <Button onPress={next} loading={busy && (last || !editing)} disabled={loading || !def} style={{ flex: 2 }}>
                {last ? (editing ? 'Yadda saxla' : 'Kartı yarat') : 'Davam et →'}
              </Button>
            </View> : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
