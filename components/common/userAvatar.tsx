import { Image } from 'expo-image';
import { User } from 'lucide-react-native';
import { memo } from 'react';
import { View } from 'react-native';

import { useAppTheme } from '@/components/common/appThemeContext';

export type UserAvatarProps = {
  avatarUrl: string | null | undefined;
  size?: number;
};

/** Avatar profil ou placeholder « liquide ». */
export const UserAvatar = memo(function UserAvatar({
  avatarUrl,
  size = 48,
}: UserAvatarProps) {
  const { theme: t } = useAppTheme();
  const r = size / 2;
  const uri = avatarUrl?.trim() ?? '';

  if (uri.length > 0) {
    return (
      <Image
        source={{ uri }}
        style={{
          width: size,
          height: size,
          borderRadius: r,
          borderWidth: 2,
          borderColor: 'rgba(255,255,255,0.55)',
        }}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
        accessibilityLabel="Photo de profil"
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: r,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: t.accentMuted,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.45)',
      }}
    >
      <User size={Math.round(size * 0.42)} color={t.accent} strokeWidth={2} />
    </View>
  );
});
