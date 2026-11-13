import { useState } from 'react';
import { Modal, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { Backdrop, SpringIn } from '../components/motion';
import { ConversationInfo } from './ConversationInfo';
import { MediaGallery } from './MediaGallery';

/** Geniş ekran (kompüter): qrup/şəxs məlumatı söhbətdən çıxmadan böyük pəncərədə açılır, arxada söhbət görünür (WhatsApp Web kimi). */
export function InfoDialog({ id, onClose }) {
  const { colors } = useTheme();
  const [media, setMedia] = useState(false);
  return (
    <Modal visible transparent animationType="none" onRequestClose={() => (media ? setMedia(false) : onClose())}>
      <Backdrop onPress={onClose} style={{ justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <SpringIn from={0.94} style={{ width: '100%', maxWidth: 660, height: '92%' }}>
          <Pressable onPress={() => {}} style={{ flex: 1, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.surfaceAlt, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 30, shadowOffset: { width: 0, height: 10 } }}>
            {media
              ? <MediaGallery id={id} onBack={() => setMedia(false)} />
              : <ConversationInfo id={id} dialog onBack={onClose} onOpenMedia={() => setMedia(true)} />}
          </Pressable>
        </SpringIn>
      </Backdrop>
    </Modal>
  );
}
