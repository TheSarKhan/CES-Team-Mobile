import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { light, dark } from './colors';

const KEY = 'ces_team_theme';
const Ctx = createContext({ colors: light, mode: 'system', setMode: () => {} });

// Seçim: 'system' | 'light' | 'dark'. localStorage yalnız web-də (native-də sessiyada qalır).
function read() {
  try { return globalThis.localStorage?.getItem(KEY) || 'system'; } catch { return 'system'; }
}

export function ThemeProvider({ children }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState(read);
  const setMode = useCallback((m) => {
    setModeState(m);
    try { globalThis.localStorage?.setItem(KEY, m); } catch { /* ignore */ }
  }, []);
  const scheme = mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
  const colors = scheme === 'dark' ? dark : light;

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = colors.bg;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors.scheme === 'dark' ? '#0F2A22' : '#103E31');
    }
  }, [colors]);

  const value = useMemo(() => ({ colors, mode, setMode }), [colors, mode, setMode]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
