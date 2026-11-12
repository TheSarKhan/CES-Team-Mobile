import { FileSearch, Wrench, Fuel, Banknote, Wallet, FileText } from 'lucide-react-native';
import { isoToDisplay } from './dates';

export const TYPE_ICONS = { 'file-search': FileSearch, wrench: Wrench, fuel: Fuel, banknote: Banknote, wallet: Wallet };
export const iconFor = (def) => TYPE_ICONS[def?.icon] || FileText;

/** tone → {fg, bg}. bg = rəngin şəffaf tonu (açıq və tünd temada işləyir). */
export function tone(colors, t) {
  const fg = { blue: colors.blue, purple: colors.purple, green: colors.green, amber: colors.amber, gray: colors.gray, red: colors.red }[t] || colors.gray;
  return { fg, bg: fg + '24' };
}

export const money = (n) => {
  if (n == null || n === '' || Number.isNaN(Number(n))) return '';
  const v = Number(n);
  const [i, f] = Math.abs(v).toFixed(2).split('.');
  return `${v < 0 ? '−' : ''}${i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}${f === '00' ? '' : ',' + f} AZN`;
};

const optLabel = (field, v) => field.options?.find((o) => o.value === v)?.label ?? v;

/** Sahənin oxunaqlı mətni; boşdursa '' qaytarır. */
export function displayValue(field, v) {
  if (v == null || v === '') return '';
  switch (field.kind) {
    case 'DATE': return isoToDisplay(v);
    case 'SELECT': return optLabel(field, v);
    case 'MONEY': return money(v);
    case 'NUMBER': return `${String(v).replace('.', ',')}${field.suffix ? ' ' + field.suffix : ''}`;
    case 'ROWS': return Array.isArray(v) ? v.map((r) => (field.fields || []).map((f) => displayValue(f, r[f.key])).filter(Boolean).join(' · ')).filter(Boolean).join('\n') : '';
    case 'BLOCK': {
      if (!v.enabled) return 'Yoxdur';
      const parts = (field.fields || []).map((f) => displayValue(f, v[f.key])).filter(Boolean);
      return parts.length ? parts.join(' · ') : 'Var';
    }
    case 'FILES': return Array.isArray(v) && v.length ? `${v.length} fayl` : '';
    default: return String(v);
  }
}

/** Qiymət + ƏDV → {vat, total}; qiymət yoxdursa null. */
export function totals(fields) {
  const price = Number(fields?.price);
  if (!fields || fields.price == null || Number.isNaN(price)) return null;
  const rate = Number(fields.vat || 0);
  const vat = Math.round(price * rate) / 100;
  return { vat, total: price + vat, rate };
}

const fmtNum = (n) => String(Math.round(n * 100) / 100).replace('.', ',');

/** Növə görə hesablanmış sətirlər: [[etiket, mətn]] */
export function computedRows(type, fields) {
  if (!fields) return [];
  if (type === 'REQUEST') {
    const t = totals(fields);
    return t && Number(fields.price) > 0 ? [['Ümumi (ƏDV ilə)', money(t.total), true]] : [];
  }
  if (type === 'FUEL') {
    const sum = (fields.rows || []).reduce((a, r) => a + Number(r.liters || 0), 0);
    return sum > 0 ? [['Cəmi', `${fmtNum(sum)} l`, true]] : [];
  }
  return [];
}

export function visibleFields(fields, values) {
  return fields.filter((f) => !f.visibleWhen || String(values?.[f.visibleWhen.key] ?? '') === f.visibleWhen.equals);
}
