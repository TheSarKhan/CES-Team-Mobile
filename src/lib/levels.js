// Səs yazarkən dalğa üçün: son LEVEL_COUNT səviyyə (0..1), yeni dəyər sağdan əlavə olunur.
export const LEVEL_COUNT = 44;
export const emptyLevels = () => Array(LEVEL_COUNT).fill(0);
export const pushLevel = (arr, v) => [...arr.slice(1), Math.max(0, Math.min(1, v))];
// dB (-160..0) → 0..1; -55 dB-dən aşağısı səssizlik sayılır
export const dbToLevel = (db) => (typeof db === 'number' ? Math.max(0, Math.min(1, (db + 55) / 55)) : 0);
