import {
  normalizeRegistrationEmail,
  validateRegistrationEmail,
} from '@/lib/auth-email';

describe('validateRegistrationEmail', () => {
  it('refuse vide', () => {
    expect(validateRegistrationEmail('')).toBeNull();
    expect(validateRegistrationEmail('   ')).toBeNull();
  });

  it('normalise la casse et accepte un format classique', () => {
    expect(validateRegistrationEmail('  User@Example.COM ')).toBe('user@example.com');
  });

  it('refuse sans @ ou domaine', () => {
    expect(validateRegistrationEmail('pas-un-mail')).toBeNull();
    expect(validateRegistrationEmail('a@')).toBeNull();
  });
});

describe('normalizeRegistrationEmail', () => {
  it('trim + minuscules', () => {
    expect(normalizeRegistrationEmail('  A@B.CO  ')).toBe('a@b.co');
  });
});
