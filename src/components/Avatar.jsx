import { View, Text } from 'react-native';
import { Users } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { nameColor } from '../theme/colors';
import { initials } from '../lib/format';

export function Avatar({ name, id, size = 44, group = false }) {
  const { colors } = useTheme();
  const c = group ? colors.forest : nameColor(id);
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center',
        backgroundColor: group ? colors.forest : colors.brandTint,
      }}
    >
      {group ? (
        <Users size={size * 0.48} color="#fff" strokeWidth={2} />
      ) : (
        <Text style={{ color: c, fontWeight: '700', fontSize: size * 0.38 }}>{initials(name)}</Text>
      )}
    </View>
  );
}
