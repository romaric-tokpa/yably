import { ScrollView } from 'react-native';

import { Chip } from '@/components/ui/Chip';

export type InsuranceFilterProps = {
  options: string[];
  selected: string[];
  onToggle: (code: string) => void;
};

/**
 * Filtre assurances / mutuelles — liste horizontale de Chip (specs §4.1).
 */
export function InsuranceFilter({
  options,
  selected,
  onToggle,
}: InsuranceFilterProps) {
  return (
    <ScrollView
      horizontal
      accessibilityRole="list"
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="flex-row items-center gap-2 py-1 pr-1"
    >
      {options.map((code) => (
        <Chip
          key={code}
          label={code}
          selected={selected.includes(code)}
          onPress={() => {
            onToggle(code);
          }}
        />
      ))}
    </ScrollView>
  );
}
