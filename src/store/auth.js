import { create } from 'zustand';
import { tokenStore } from '../api/tokenStore';
import { authApi, devicesApi } from '../api/endpoints';
import { setAuthLostHandler } from '../api/client';
import { getCurrentPushToken } from '../lib/push';

export const useAuthStore = create((set, get) => ({
  status: 'loading', // loading | anonymous | authenticated
  user: null,

  hydrate: async () => {
    const { accessToken, user } = await tokenStore.hydrate();
    set({ status: accessToken && user ? 'authenticated' : 'anonymous', user: accessToken ? user : null });
  },

  login: async (email, password) => {
    const data = await authApi.login(email, password);
    // Proksi/ünvan səhvi olanda HTML qayıdır — tokensiz "girişi" qəbul etmə
    if (!data?.accessToken || !data?.user) throw new Error('Server cavabı düzgün deyil. Bir az sonra yenidən cəhd edin.');
    await tokenStore.setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
    await tokenStore.setUser(data.user);
    set({ status: 'authenticated', user: data.user });
  },

  logout: async () => {
    const t = getCurrentPushToken();
    if (t) { try { await devicesApi.unregister(t); } catch { /* oflayn ola bilər */ } }
    await tokenStore.clear();
    set({ status: 'anonymous', user: null });
  },
}));

setAuthLostHandler(() => useAuthStore.setState({ status: 'anonymous', user: null }));
