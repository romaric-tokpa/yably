import { render, screen } from '@testing-library/react-native';

import { VerificationButton } from '@/components/pharmacy/VerificationButton';
import { TestAppThemeProvider } from '@/components/common/ThemeProvider';

describe('VerificationButton', () => {
  it('désactivé affiche le libellé par défaut (trop loin)', () => {
    render(
      <TestAppThemeProvider>
        <VerificationButton
          pharmacyId="p1"
          onVerify={jest.fn()}
          disabled
        />
      </TestAppThemeProvider>,
    );

    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(
      screen.getByText('Rapprochez-vous pour vérifier (moins de 500 m).'),
    ).toBeOnTheScreen();
  });

  it('désactivé avec libellé personnalisé', () => {
    render(
      <TestAppThemeProvider>
        <VerificationButton
          pharmacyId="p1"
          onVerify={jest.fn()}
          disabled
          disabledLabel="Trop loin du point de vente"
        />
      </TestAppThemeProvider>,
    );
    expect(screen.getByText('Trop loin du point de vente')).toBeOnTheScreen();
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('actif : libellé principal de confirmation', () => {
    render(
      <TestAppThemeProvider>
        <VerificationButton pharmacyId="p1" onVerify={jest.fn()} />
      </TestAppThemeProvider>,
    );
    expect(
      screen.getByText("✅ Confirmer que c'est ouvert"),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button')).not.toBeDisabled();
  });
});
