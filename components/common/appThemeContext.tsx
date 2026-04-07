import { createContext, useContext } from 'react';

import type { ThemeColors } from '@/lib/constants';

/** Valeur exposée par ThemeProvider — fichier isolé pour éviter les cycles de modules (double createContext). */
export type AppThemeContextValue = {
  theme: ThemeColors;
  nightMode: boolean;
  toggleNightMode: () => void;
};

export const AppThemeContext = createContext<AppThemeContextValue | null>(null);

export function useAppTheme(): AppThemeContextValue {
  const ctx = useContext(AppThemeContext);
  if (ctx === null) {
    throw new Error('useAppTheme doit être utilisé dans un ThemeProvider');
  }
  return ctx;
}
