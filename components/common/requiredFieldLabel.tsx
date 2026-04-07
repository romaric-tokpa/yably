import { type ReactElement } from 'react';
import { Text } from 'react-native';

import { type ThemeColors } from '@/lib/constants';
import { fonts } from '@/lib/fonts';

type Props = {
  t: ThemeColors;
  children: string;
};

/** Astérisque rouge + libellé pour les champs requis (sans texte « obligatoire »). */
export function RequiredFieldLabel({ t, children }: Props): ReactElement {
  return (
    <Text
      className="mb-2 text-xs font-semibold"
      accessibilityLabel={`${children}, champ requis`}
      accessibilityRole="text"
    >
      <Text style={{ color: t.danger, fontFamily: fonts.outfitBold }}>* </Text>
      <Text style={{ color: t.text, fontFamily: fonts.outfitSemiBold }}>{children}</Text>
    </Text>
  );
}
