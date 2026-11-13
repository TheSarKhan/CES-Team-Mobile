import { Platform } from 'react-native';

/**
 * Üst/alt təhlükəsiz sahə (iPhone status bar, home indicator). Native-də `insets`, web-də (iPhone ana ekran tətbiqi) CSS env().
 * Kompüterdə env() = 0 olduğuna görə heç nə dəyişmir.
 */
export const topPad = (insets, extra = 0) => (Platform.OS === 'web' ? `calc(env(safe-area-inset-top, 0px) + ${extra}px)` : insets.top + extra);
export const bottomPad = (insets, extra = 0) => (Platform.OS === 'web' ? `calc(env(safe-area-inset-bottom, 0px) * var(--sab, 1) + ${extra}px)` : insets.bottom + extra);
