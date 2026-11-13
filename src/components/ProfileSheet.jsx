import { useState } from 'react';
import { Modal, View, Text, Pressable, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Phone, Mail, Briefcase, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Avatar } from './Avatar';
import { Button } from './ui';
import { useUser } from '../hooks/useChat';
import { useAuthStore } from '../store/auth';
import { useLayout } from '../lib/useLayout';
import { Backdrop, SpringIn, FadeIn } from './motion';
import { errorMessage } from '../api/client';

function Row({ icon, label, value, onPress, colors }) {
  if (!value) return null;
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 11 }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.brandTint, alignItems: 'center', justifyContent: 'center' }}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.muted, fontSize: 12 }}>{label}</Text>
        <Text style={{ color: onPress ? colors.brand : colors.ink, fontSize: 15.5, fontWeight: '600' }}>{value}</Text>
      </View>
    </Pressable>
  );
}

/** Əməkdaşın profili: şəkil, ad, vəzifə, əlaqə; «Mesaj yaz» şəxsi yazışma açır. initial: siyahıdan məlum olan ad/şəkil (dərhal göstərmək üçün). */
export function ProfileSheet({ userId, initial, onClose, onMessage }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const me = useAuthStore((s) => s.user);
  const { isWide } = useLayout();
  const q = useUser(userId);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const u = q.data ?? initial ?? {};
  const isMe = userId === me?.id;
  const role = u.position || u.department; // vəzifə (yoxdursa şöbə)
  const showDept = u.department && u.department !== role;

  const message = async () => {
    setBusy(true); setErr('');
    try { await onMessage(userId); } catch (e) { setErr(errorMessage(e)); setBusy(false); }
  };

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Backdrop onPress={onClose} style={{ justifyContent: isWide ? 'center' : 'flex-end', alignItems: 'center', padding: isWide ? 20 : 0 }}>
        <SpringIn origin={isWide ? 'center' : 'bottom'} from={isWide ? 0.85 : 0.94} style={{ width: '100%', maxWidth: 420 }}>
        <Pressable onPress={() => {}} style={{ width: '100%', maxWidth: 420, backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: isWide ? 24 : 0, borderBottomRightRadius: isWide ? 24 : 0, paddingBottom: Platform.OS === 'web' ? 18 : insets.bottom + 12 }}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Bağla" style={{ position: 'absolute', top: 14, right: 14, zIndex: 2, width: 34, height: 34, borderRadius: 17, backgroundColor: colors.sunk, alignItems: 'center', justifyContent: 'center' }}>
            <X size={19} color={colors.ink2} />
          </Pressable>
          <View style={{ alignItems: 'center', paddingTop: 26, paddingHorizontal: 20, gap: 4 }}>
            <FadeIn from="scale" delay={80} duration={420}><Avatar name={u.fullName} id={userId} uri={u.avatarUrl} size={112} /></FadeIn>
            <FadeIn delay={160} distance={10}><Text style={{ color: colors.ink, fontWeight: '800', fontSize: 22, marginTop: 10, textAlign: 'center' }}>{u.fullName || '…'}</Text></FadeIn>
            {role ? <FadeIn delay={220} distance={10}><Text style={{ color: colors.muted, fontSize: 14.5, textAlign: 'center' }}>{role}</Text></FadeIn> : null}
            {u.admin ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6, backgroundColor: colors.brandTint, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                <ShieldCheck size={14} color={colors.brand} /><Text style={{ color: colors.brand, fontWeight: '700', fontSize: 12 }}>Admin</Text>
              </View>
            ) : null}
          </View>

          <FadeIn delay={280} distance={14} style={{ paddingHorizontal: 22, paddingTop: 14 }}>
            <Row colors={colors} icon={<Briefcase size={18} color={colors.brand} />} label="Şöbə" value={showDept ? u.department : null} />
            <Row colors={colors} icon={<Phone size={18} color={colors.brand} />} label="Telefon" value={u.phone} onPress={() => Linking.openURL(`tel:${u.phone.replace(/[^\d+]/g, '')}`)} />
            <Row colors={colors} icon={<Mail size={18} color={colors.brand} />} label="E-poçt" value={u.email} onPress={() => Linking.openURL(`mailto:${u.email}`)} />
          </FadeIn>

          {err ? <Text style={{ color: colors.red, textAlign: 'center', marginTop: 6 }}>{err}</Text> : null}
          {!isMe && onMessage ? (
            <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
              <Button onPress={message} loading={busy}>
                Mesaj yaz
              </Button>
            </View>
          ) : null}
        </Pressable>
        </SpringIn>
      </Backdrop>
    </Modal>
  );
}
