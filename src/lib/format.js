// Vaxt/mətn köməkçiləri
const pad = (n) => String(n).padStart(2, '0');

export const hhmm = (iso) => {
  const d = new Date(iso);
  return isNaN(d) ? '' : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const sameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** "Bu gün" / "Dünən" / "04.11.2026" */
export const dayLabel = (iso) => {
  const d = new Date(iso);
  const now = new Date();
  const y = new Date();
  y.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return 'Bu gün';
  if (sameDay(d, y)) return 'Dünən';
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
};

/** Söhbət siyahısında: bu gün → saat, dünən → "Dünən", əks halda tarix */
export const listTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (sameDay(d, now)) return hhmm(iso);
  return dayLabel(iso);
};

export const initials = (name) =>
  String(name ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toLocaleUpperCase('az') || '?';

export const fileSize = (b) => {
  if (b == null) return '';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

/** Mesajın siyahı/bildiriş önbaxışı */
export const messagePreview = (m) => {
  if (!m) return '';
  if (m.deleted) return 'Mesaj silindi';
  if (m.type === 'SYSTEM' || m.type === 'CARD') {
    try {
      const p = JSON.parse(m.systemPayload || '{}');
      if (m.type === 'SYSTEM') return p.text || '';
      return `📋 ${p.number} · ${p.title}`;
    } catch { return ''; }
  }
  if (m.text) return m.text;
  const a = m.attachments?.[0];
  if (!a) return '';
  if (a.kind === 'IMAGE') return '📷 Şəkil';
  if (a.kind === 'VOICE') return '🎤 Səsli mesaj';
  return `📎 ${a.fileName}`;
};
