// Backend ünvanı. Web-də eyni origin (nginx /api və /ws-i backend-ə yönləndirir); native-də tam ünvan.
// Lokal inkişaf: EXPO_PUBLIC_API_BASE_URL=http://localhost:8090 npx expo start --web
import { Platform } from 'react-native';

const env = process.env.EXPO_PUBLIC_API_BASE_URL;
const isWeb = Platform.OS === 'web';

export const config = {
  apiBaseUrl: env !== undefined ? env : isWeb ? '' : 'https://team.cesgroup.az',
};

export function wsUrl() {
  const base = config.apiBaseUrl;
  if (base) return base.replace(/^http/, 'ws') + '/ws';
  const { protocol, host } = window.location;
  return `${protocol === 'https:' ? 'wss' : 'ws'}://${host}/ws`;
}

export function absoluteUrl(path) {
  if (!path) return path;
  if (/^https?:/.test(path)) return path;
  return config.apiBaseUrl + path;
}
