import { useEffect, useState } from 'react';
import { View, Text, Image } from 'react-native';
import { Users } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeProvider';
import { nameColor } from '../theme/colors';
import { initials } from '../lib/format';
import { absoluteUrl } from '../config';

/** uri: profil şəkli (varsa); yüklənməsə və ya yoxdursa adın baş hərfləri göstərilir. */
export function Avatar({ name, id, uri, size = 44, group = false }) {
  const { colors } = useTheme();
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  const c = group ? colors.forest : nameColor(id);
  const showImage = uri && !failed;
  return (
    <View
      style={{
        width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        backgroundColor: group ? colors.forest : colors.brandTint,
      }}
    >
      {showImage ? (
        <Image source={{ uri: absoluteUrl(uri) }} onError={() => setFailed(true)} style={{ width: size, height: size }} resizeMode="cover" accessibilityLabel={name} />
      ) : group ? (
        <Users size={size * 0.48} color="#fff" strokeWidth={2} />
      ) : (
        <Text style={{ color: c, fontWeight: '700', fontSize: size * 0.38 }}>{initials(name)}</Text>
      )}
    </View>
  );
}
