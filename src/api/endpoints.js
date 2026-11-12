import { Platform } from 'react-native';
import { apiClient } from './client';

const get = async (url, params) => (await apiClient.get(url, { params })).data;
const post = async (url, body) => (await apiClient.post(url, body)).data;

export const authApi = {
  login: (email, password) => post('/auth/login', { email, password }),
};

export const meApi = {
  me: () => get('/me'),
  users: () => get('/users'),
};

export const chatApi = {
  conversations: () => get('/conversations'),
  conversation: (id) => get(`/conversations/${id}`),
  members: (id) => get(`/conversations/${id}/members`),
  openDirect: (userId) => post('/conversations/direct', { userId }),
  createGroup: (body) => post('/conversations/groups', body),
  addMembers: (id, userIds) => post(`/conversations/${id}/members`, { userIds }),
  removeMember: (id, userId) => apiClient.delete(`/conversations/${id}/members/${userId}`),
  mute: (id, muted) => apiClient.put(`/conversations/${id}/mute`, { muted }),
  pin: async (id, messageId) => (await apiClient.put(`/conversations/${id}/pin`, { messageId })).data,
  read: (id, messageId) => post(`/conversations/${id}/read`, { messageId }),
  history: (id, params) => get(`/conversations/${id}/messages`, params),
  send: (id, body) => post(`/conversations/${id}/messages`, body),
  edit: async (messageId, text) => (await apiClient.patch(`/messages/${messageId}`, { text })).data,
  remove: async (messageId) => (await apiClient.delete(`/messages/${messageId}`)).data,
  react: async (messageId, emoji) => (await apiClient.put(`/messages/${messageId}/reaction`, { emoji })).data,
  search: (q) => get('/search', { q }),
};

export const cardsApi = {
  types: () => get('/card-types'),
  list: (params) => get('/cards', params),
  summary: () => get('/cards/summary'),
  get: (id) => get(`/cards/${id}`),
  history: (id) => get(`/cards/${id}/history`),
  create: (body) => post('/cards', body),
  update: async (id, fields) => (await apiClient.patch(`/cards/${id}`, { fields })).data,
  status: (id, status, note) => post(`/cards/${id}/status`, { status, note }),
  // userId (qrup üzvü) və ya name (sərbəst mətn); ikisi də boşdursa məsul götürülür
  assign: async (id, { userId = null, name = null } = {}) => (await apiClient.put(`/cards/${id}/assignee`, { userId, name })).data,
};

// Fayl yükləmə: web-də Blob, native-də {uri,name,type}
export async function uploadFile({ uri, name, mimeType, kind, durationMs }) {
  const form = new FormData();
  if (Platform.OS === 'web') {
    const blob = await (await fetch(uri)).blob();
    form.append('file', blob, name);
  } else {
    form.append('file', { uri, name, type: mimeType || 'application/octet-stream' });
  }
  if (kind) form.append('kind', kind);
  if (durationMs != null) form.append('durationMs', String(Math.round(durationMs)));
  const { data } = await apiClient.post('/files', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 90000,
    transformRequest: (d) => d,
  });
  return data;
}

export const devicesApi = {
  register: (body) => post('/devices', body),
  unregister: (token) => post('/devices/unregister', { token }),
  vapidKey: async () => (await apiClient.get('/push/vapid-public-key')).data.publicKey,
};
