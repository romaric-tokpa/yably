/**
 * Journalisation — pas de console.log arbitraire en prod (règle projet).
 */
export const logger = {
  warn: (message: string, error?: unknown): void => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(`[pharmacie-garde] ${message}`, error);
    }
  },
  error: (message: string, error?: unknown): void => {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.error(`[pharmacie-garde] ${message}`, error);
    }
  },
};
