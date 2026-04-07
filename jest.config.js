/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/admin/',
    '/supabase/',
  ],
  setupFiles: ['<rootDir>/jest.setup-globals.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    // Pas de offlineStorage.ts : résolution explicite pour les tests (Metro fait pareil avec resolveRequest).
    '^@/lib/offlineStorage$': '<rootDir>/lib/offlineStorage.native.ts',
    '^@/(.*)$': '<rootDir>/$1',
  },
};
