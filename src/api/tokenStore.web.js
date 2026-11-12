// Web: tokenlər localStorage-də (expo-secure-store web-də yoxdur). Çıxışda silinir.
const K_ACCESS = 'team_access_token';
const K_REFRESH = 'team_refresh_token';
const K_USER = 'team_user';

let accessToken = null;
let refreshToken = null;

const ls = {
  get(k) { try { return window.localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { window.localStorage.setItem(k, v); } catch { /* private mode */ } },
  del(k) { try { window.localStorage.removeItem(k); } catch { /* ignore */ } },
};

export const tokenStore = {
  getAccessToken: () => accessToken,
  getRefreshToken: () => refreshToken,

  async setTokens({ accessToken: at, refreshToken: rt }) {
    accessToken = at ?? null;
    refreshToken = rt ?? refreshToken;
    if (at) ls.set(K_ACCESS, at);
    if (rt) ls.set(K_REFRESH, rt);
  },

  async setUser(user) {
    if (user) ls.set(K_USER, JSON.stringify(user));
  },

  async clear() {
    accessToken = null;
    refreshToken = null;
    [K_ACCESS, K_REFRESH, K_USER].forEach(ls.del);
  },

  async hydrate() {
    accessToken = ls.get(K_ACCESS);
    refreshToken = ls.get(K_REFRESH);
    let user = null;
    try { user = JSON.parse(ls.get(K_USER) || 'null'); } catch { user = null; }
    return { accessToken, refreshToken, user };
  },
};

export default tokenStore;
