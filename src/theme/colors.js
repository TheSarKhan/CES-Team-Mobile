// CES brend rəngləri (PLAN.md §6.2) və iki tema. Tünd tema forest əsaslıdır (WhatsApp-ın boz rəngi deyil).
const base = {
  brand: '#15A34A',
  brandDk: '#0F8A3E',
  forest: '#103E31',
  green: '#15A34A',
  blue: '#2563EB',
  purple: '#7C3AED',
  red: '#DC2626',
  amber: '#D97706',
  gray: '#737B86',
};

export const light = {
  ...base,
  scheme: 'light',
  forest: '#15A34A',      // "tünd yaşıl" əvəzinə parlaq brend yaşıl (qrup avatarı, aktiv çip, düymələr)
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#F8F9FA',
  sunk: '#F1F3F5',
  line: '#E7E9ED',
  ink: '#15181D',
  ink2: '#3D434C',
  muted: '#6B727D',
  faint: '#9AA1AC',
  brandTint: '#E8F7EE',
  brandLine: '#BBE6C9',
  mine: '#DCF5E3',       // öz mesaj baloncuğu
  theirs: '#FFFFFF',
  header: '#FFFFFF',
  headerInk: '#15181D',
  chatBg: '#F5F6F7',
  onBrand: '#FFFFFF',
  shadow: 'rgba(16,62,49,0.10)',
};

export const dark = {
  ...base,
  scheme: 'dark',
  bg: '#0B1F1A',
  surface: '#112A23',
  surfaceAlt: '#0F251F',
  sunk: '#16322A',
  line: '#1F3D34',
  ink: '#ECF3EF',
  ink2: '#C5D3CC',
  muted: '#8FA39A',
  faint: '#6A8077',
  brandTint: '#143B2C',
  brandLine: '#1E5A40',
  mine: '#175136',
  theirs: '#17332B',
  header: '#0F2A22',
  headerInk: '#ECF3EF',
  chatBg: '#0A1A16',
  onBrand: '#FFFFFF',
  shadow: 'rgba(0,0,0,0.4)',
};

// Göndərən adı rəngləri (qrup söhbətində hər nəfər üçün sabit rəng)
export const NAME_COLORS = ['#0F8A3E', '#2563EB', '#7C3AED', '#D97706', '#DB2777', '#0891B2', '#B45309', '#4F46E5'];
export const nameColor = (id) => NAME_COLORS[Math.abs(Number(id) || 0) % NAME_COLORS.length];
