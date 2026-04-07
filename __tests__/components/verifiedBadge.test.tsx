import { render, screen } from '@testing-library/react-native';

import { VerifiedBadge } from '@/components/pharmacy/VerifiedBadge';
import { TestAppThemeProvider } from '@/components/common/ThemeProvider';

describe('VerifiedBadge', () => {
  it('affiche « Signalé fermé » si lastStatus closed', () => {
    render(
      <TestAppThemeProvider>
        <VerifiedBadge
          verificationCount={2}
          lastVerification={new Date().toISOString()}
          lastStatus="closed"
        />
      </TestAppThemeProvider>,
    );
    expect(screen.getByText(/Signalé fermé/)).toBeOnTheScreen();
  });

  it('affiche « Non vérifié » sans preuve récente', () => {
    const old = new Date(Date.now() - 4 * 3600 * 1000).toISOString();
    render(
      <TestAppThemeProvider>
        <VerifiedBadge
          verificationCount={1}
          lastVerification={old}
          lastStatus="open"
        />
      </TestAppThemeProvider>,
    );
    expect(screen.getByText('Non vérifié')).toBeOnTheScreen();
  });

  it('affiche état vérifié avec compte et texte relatif si &lt; 2 h', () => {
    const recent = new Date(Date.now() - 45 * 60 * 1000).toISOString();
    render(
      <TestAppThemeProvider>
        <VerifiedBadge
          verificationCount={4}
          lastVerification={recent}
          lastStatus="open"
        />
      </TestAppThemeProvider>,
    );
    expect(screen.getByText(/Vérifié/)).toBeOnTheScreen();
    expect(screen.getByText(/4 pers/)).toBeOnTheScreen();
    expect(screen.getByText(/il y a 45 min/)).toBeOnTheScreen();
  });
});
