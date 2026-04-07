import { fireEvent, render, screen } from '@testing-library/react-native';

import { PharmacyCard } from '@/components/pharmacy/PharmacyCard';
import { TestAppThemeProvider } from '@/components/common/ThemeProvider';
import { formatDistance, formatDuration } from '@/lib/format';

import { makePharmacy } from '../fixtures/pharmacyDeGarde';

describe('PharmacyCard', () => {
  it('affiche nom, adresse, distance, durée, note et assurances visibles', () => {
    const p = makePharmacy();
    const onPress = jest.fn();

    render(
      <TestAppThemeProvider>
        <PharmacyCard pharmacy={p} onPress={onPress} />
      </TestAppThemeProvider>,
    );

    expect(screen.getByText(p.name)).toBeOnTheScreen();
    expect(screen.getByText(p.address)).toBeOnTheScreen();
    expect(
      screen.getByText(new RegExp(`${p.distance_km.toFixed(1)}\\s*km`)),
    ).toBeOnTheScreen();
    expect(screen.getByText(formatDuration(p.duration_min))).toBeOnTheScreen();
    expect(screen.getByText(`${p.rating.toFixed(1)}`)).toBeOnTheScreen();
    expect(screen.getByText(`(${p.review_count})`)).toBeOnTheScreen();
    expect(screen.getByText('MUGEFCI')).toBeOnTheScreen();
    expect(screen.getByText('NSIA')).toBeOnTheScreen();
    expect(screen.getByText('+1')).toBeOnTheScreen();
  });

  it('appelle onPress avec la pharmacie', () => {
    const p = makePharmacy({ id: 'x9' });
    const onPress = jest.fn();

    render(
      <TestAppThemeProvider>
        <PharmacyCard pharmacy={p} onPress={onPress} />
      </TestAppThemeProvider>,
    );

    fireEvent.press(screen.getByText(p.name));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'x9', name: p.name }),
    );
  });
});
