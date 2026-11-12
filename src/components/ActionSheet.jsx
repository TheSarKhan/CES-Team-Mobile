import { Modal, View, Text, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

/** Alt pəncərə: sətirlər [{label, icon, onPress, danger}] və istəyə bağlı üst panel (reaksiyalar). */
export function ActionSheet({ visible, onClose, actions = [], header, title }) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Pressable
          onPress={() => {}}
          style={{ width: '100%', maxWidth: 520, backgroundColor: colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 18, paddingTop: 8 }}
        >
          <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.line, marginBottom: 10 }} />
          {title ? <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center', marginBottom: 6 }}>{title}</Text> : null}
          {header}
          {actions.map((a) => (
            <Pressable
              key={a.label}
              onPress={() => { onClose(); a.onPress?.(); }}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 22, height: 52, backgroundColor: pressed ? colors.sunk : 'transparent' })}
            >
              {a.icon}
              <Text style={{ color: a.danger ? colors.red : colors.ink, fontSize: 16, fontWeight: '600' }}>{a.label}</Text>
            </Pressable>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
