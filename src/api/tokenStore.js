// Native: tokenlər expo-secure-store-da. (Web variantı: tokenStore.web.js)
import * as SecureStore from 'expo-secure-store';

const K_ACCESS = 'team_access_token';
const K_REFRESH = 'team_refresh_token';
const K_USER = 'team_user';

let accessToken = null;
let refreshToken = null;

export const tokenStore = {
  getAccessToken: () => accessToken,
  getRefreshToken: () => refreshToken,

  async setTokens({ accessToken: at, refreshToken: rt }) {
    accessToken = at ?? null;
    refreshToken = rt ?? refreshToken;
    if (at) await SecureStore.setItemAsync(K_ACCESS, at);
    if (rt) await SecureStore.setItemAsync(K_REFRESH, rt);
  },

  async setUser(user) {
    if (user) await SecureStore.setItemAsync(K_USER, JSON.stringify(user));
  },

  async clear() {
    accessToken = null;
    refreshToken = null;
    await Promise.all([K_ACCESS, K_REFRESH, K_USER].map((k) => SecureStore.deleteItemAsync(k).catch(() => {})));
  },

  async hydrate() {
    accessToken = await SecureStore.getItemAsync(K_ACCESS);
    refreshToken = await SecureStore.getItemAsync(K_REFRESH);
    let user = null;
    try { user = JSON.parse((await SecureStore.getItemAsync(K_USER)) || 'null'); } catch { user = null; }
    return { accessToken, refreshToken, user };
  },
};

export default tokenStore;
