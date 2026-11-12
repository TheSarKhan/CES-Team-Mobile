const pad = (n) => String(n).padStart(2, '0');
export const todayIso = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
/** "2026-11-13" → "13.11.2026" */
export const isoToDisplay = (iso) => {
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
};
/** "13.11.2026" / "13/11/2026" / "2026-11-13" → ISO; boş → ''; səhv → null */
export const displayToIso = (s) => {
  const v = String(s || '').trim();
  if (!v) return '';
  let y, mo, d;
  let m = v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) [, y, mo, d] = m;
  else if ((m = v.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/))) [, d, mo, y] = m;
  else return null;
  const dt = new Date(Number(y), Number(mo) - 1, Number(d));
  if (dt.getFullYear() !== Number(y) || dt.getMonth() !== Number(mo) - 1 || dt.getDate() !== Number(d)) return null;
  return `${y}-${pad(mo)}-${pad(d)}`;
};
