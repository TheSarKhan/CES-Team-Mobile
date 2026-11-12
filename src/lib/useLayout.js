import { useWindowDimensions, Platform } from 'react-native';

export const WIDE_BP = 900;

// Geniş düzən (3 sütun) yalnız web-də və eni ≥ 900px olanda
export function useLayout() {
  const { width, height } = useWindowDimensions();
  return { width, height, isWide: Platform.OS === 'web' && width >= WIDE_BP };
}
