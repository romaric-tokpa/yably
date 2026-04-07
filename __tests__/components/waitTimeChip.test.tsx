import { render, screen } from '@testing-library/react-native';

import { WaitTimeChip } from '@/components/pharmacy/WaitTimeChip';
import { TestAppThemeProvider } from '@/components/common/ThemeProvider';
import { theme } from '@/lib/constants';

describe('WaitTimeChip', () => {
  it('ne rend rien si minutes null', () => {
    render(
      <TestAppThemeProvider>
        <WaitTimeChip minutes={null} />
      </TestAppThemeProvider>,
    );
    expect(screen.queryByTestId('wait-time-chip')).toBeNull();
  });

  it('couleur courte (≤10 min) : bordure success', () => {
    render(
      <TestAppThemeProvider>
        <WaitTimeChip minutes={8} />
      </TestAppThemeProvider>,
    );
    expect(screen.getByText('~8 min')).toBeOnTheScreen();
    expect(screen.getByTestId('wait-time-chip')).toHaveStyle({
      borderColor: theme.day.success,
    });
  });

  it('couleur moyenne (11–20 min) : bordure accent', () => {
    render(
      <TestAppThemeProvider>
        <WaitTimeChip minutes={15} />
      </TestAppThemeProvider>,
    );
    expect(screen.getByTestId('wait-time-chip')).toHaveStyle({
      borderColor: theme.day.accent,
    });
  });

  it('couleur longue (&gt;20 min) : bordure danger', () => {
    render(
      <TestAppThemeProvider>
        <WaitTimeChip minutes={45} />
      </TestAppThemeProvider>,
    );
    expect(screen.getByTestId('wait-time-chip')).toHaveStyle({
      borderColor: theme.day.danger,
    });
  });
});
