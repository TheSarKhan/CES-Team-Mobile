// Android (native): Expo Push. Kanallar yüksək prioritetlidir (səs + pop-up + ekranın yanması).
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { devicesApi } from '../api/endpoints';

let currentToken = null;
export const getCurrentPushToken = () => currentToken;

// Tətbiq açıq olanda bildiriş banneri göstərilsin (söhbət ekranında olan söhbət üçün ayrıca susdurulur)
let suppressFor = null; // aktiv söhbətin id-si
export const setActiveConversation = (id) => { suppressFor = id == null ? null : String(id); };

Notifications.setNotificationHandler({
  handleNotification: async (n) => {
    const cid = String(n.request.content.data?.conversationId ?? '');
    const hide = suppressFor && cid === suppressFor;
    return { shouldShowBanner: !hide, shouldShowList: !hide, shouldPlaySound: !hide, shouldSetBadge: true };
  },
});

async function ensureChannels() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('messages', {
    name: 'Mesajlar',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 150, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    enableLights: true,
    lightColor: '#15A34A',
    sound: 'default',
  });
  await Notifications.setNotificationChannelAsync('mentions', {
    name: 'Etiketlər və xatırlatmalar',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 400, 200, 400],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    enableLights: true,
    lightColor: '#DC2626',
    sound: 'default',
    bypassDnd: false,
  });
}

/** İcazə istə, Expo token al, backend-ə yaz. Uğursuzluq tətbiqi dayandırmır. */
export async function registerForPushNotificationsAsync() {
  try {
    await ensureChannels();
    if (!Device.isDevice) return null; // emulyatorda push yoxdur
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== 'granted') return null;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    currentToken = data;
    await devicesApi.register({ kind: 'EXPO', token: data, userAgent: `${Platform.OS} ${Platform.Version}` });
    return data;
  } catch (e) {
    console.warn('[push] qeydiyyat alınmadı:', e?.message);
    return null;
  }
}

/** Bildirişə toxunanda söhbəti açmaq üçün. */
export function onNotificationOpened(handler) {
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const d = r.notification.request.content.data;
    if (d?.conversationId || d?.cardId) handler(d);
  });
  Notifications.getLastNotificationResponseAsync().then((r) => {
    const d = r?.notification.request.content.data;
    if (d?.conversationId || d?.cardId) handler(d);
  }).catch(() => {});
  return () => sub.remove();
}
