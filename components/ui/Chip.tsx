import { Pressable, Text } from 'react-native';

import { useAppTheme } from '@/components/common/appThemeContext';
import { borderRadius as radii } from '@/lib/constants';

export type ChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function Chip({ label, selected, onPress }: ChipProps) {
  const { theme: t } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.88 : 1,
        alignSelf: 'flex-start',
        borderRadius: radii.button,
        borderWidth: 1,
        paddingVertical: 8,
        paddingHorizontal: 14,
        backgroundColor: selected ? t.primaryMuted : t.surface,
        borderColor: selected ? t.primary : t.border,
      })}
    >
      <Text
        className="text-[13px] font-semibold"
        style={{ color: selected ? t.primary : t.textSoft }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}
