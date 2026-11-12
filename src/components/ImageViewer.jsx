import { useState } from 'react';
import { Modal, View, Image, Pressable, Text, Platform, Linking, useWindowDimensions } from 'react-native';
import { X, Download } from 'lucide-react-native';
import { absoluteUrl } from '../config';

export function ImageViewer({ images, startId, onClose }) {
  const { width, height } = useWindowDimensions();
  const start = Math.max(0, (images || []).findIndex((a) => a.id === startId));
  const [i, setI] = useState(start);
  if (!images?.length) return null;
  const a = images[Math.min(i, images.length - 1)];
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, paddingTop: Platform.OS === 'web' ? 16 : 44 }}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Bağla"><X size={26} color="#fff" /></Pressable>
          <Text style={{ color: '#fff', fontWeight: '600' }}>{images.length > 1 ? `${i + 1} / ${images.length}` : a.fileName}</Text>
          <Pressable onPress={() => Linking.openURL(absoluteUrl(a.url) + '&download=true')} hitSlop={12} accessibilityLabel="Yüklə"><Download size={24} color="#fff" /></Pressable>
        </View>
        <Pressable style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} onPress={() => (images.length > 1 ? setI((i + 1) % images.length) : onClose())}>
          <Image source={{ uri: absoluteUrl(a.url) }} style={{ width, height: height * 0.78 }} resizeMode="contain" />
        </Pressable>
      </View>
    </Modal>
  );
}
