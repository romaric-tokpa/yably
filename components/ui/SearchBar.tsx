import { Search } from 'lucide-react-native';
import { TextInput, View } from 'react-native';

import { useAppTheme } from '@/components/common/appThemeContext';
import { borderRadius as radii } from '@/lib/constants';
import { fonts } from '@/lib/fonts';

export type SearchBarProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  /** Fond transparent (dans un panneau en verre). */
  variant?: 'solid' | 'glass';
};

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Rechercher…',
  variant = 'solid',
}: SearchBarProps) {
  const { theme: t } = useAppTheme();
  const isGlass = variant === 'glass';

  return (
    <View
      className="h-11 flex-row items-center gap-2.5 px-3.5"
      style={{
        backgroundColor: isGlass ? 'transparent' : t.surface,
        borderRadius: 14,
        borderWidth: isGlass ? 0 : 1.5,
        borderColor: isGlass ? 'transparent' : t.border,
      }}
    >
      <Search size={17} color={t.textMuted} strokeWidth={2} />
      <TextInput
        accessibilityRole="search"
        className="h-11 flex-1 text-[13px]"
        cursorColor={t.primary}
        style={{ color: t.text, fontFamily: fonts.outfitRegular }}
        underlineColorAndroid="transparent"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.textMuted}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
      />
    </View>
  );
}
