// axios: Authorization avtomatik; 401-də refresh token ilə bir dəfə yenilənir (paralel sorğular bir yeniləməni gözləyir).
import axios from 'axios';
import { config } from '../config';
import { tokenStore } from './tokenStore';

export const apiClient = axios.create({ baseURL: config.apiBaseUrl + '/api', timeout: 20000 });

let onAuthLost = () => {};
export const setAuthLostHandler = (fn) => { onAuthLost = fn; };

let refreshing = null;
async function refresh() {
  const rt = tokenStore.getRefreshToken();
  if (!rt) throw new Error('no refresh token');
  // yeni axios nüsxəsi: interceptor-a düşməsin
  const { data } = await axios.post(config.apiBaseUrl + '/api/auth/refresh', { refreshToken: rt }, { timeout: 15000 });
  await tokenStore.setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
  await tokenStore.setUser(data.user);
  return data.accessToken;
}

export async function ensureAccessToken() {
  return tokenStore.getAccessToken();
}

export async function refreshAccessToken() {
  refreshing = refreshing || refresh().finally(() => { refreshing = null; });
  return refreshing;
}

apiClient.interceptors.request.use((req) => {
  const t = tokenStore.getAccessToken();
  if (t) req.headers.Authorization = `Bearer ${t}`;
  return req;
});

apiClient.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry && !original.url?.includes('/auth/')) {
      original._retry = true;
      try {
        const at = await refreshAccessToken();
        original.headers.Authorization = `Bearer ${at}`;
        return apiClient(original);
      } catch {
        await tokenStore.clear();
        onAuthLost();
      }
    }
    return Promise.reject(error);
  },
);

export function errorMessage(error, fallback = 'Xəta baş verdi. Yenidən cəhd edin.') {
  const m = error?.response?.data?.message;
  if (m) return m;
  if (error?.message === 'Network Error') return 'Serverə qoşulmaq olmadı. Bağlantını yoxlayın.';
  if (error?.code === 'ECONNABORTED') return 'Sorğu vaxtı bitdi. Yenidən cəhd edin.';
  return fallback;
}
