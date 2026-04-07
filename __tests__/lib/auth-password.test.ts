import {
  buildDisplayName,
  registrationPasswordErrorMessage,
  validateRegistrationPassword,
} from '@/lib/auth-password';

describe('validateRegistrationPassword', () => {
  it('refuse trop court ou mismatch', () => {
    expect(validateRegistrationPassword('abc', 'abc')).toBe('short');
    expect(validateRegistrationPassword('abcdefgh', 'abcdefgi')).toBe('mismatch');
  });

  it('accepte 8+ caractères, lettre et chiffre', () => {
    expect(validateRegistrationPassword('abcdefg1', 'abcdefg1')).toBeNull();
  });

  it('refuse sans chiffre ou sans lettre', () => {
    expect(validateRegistrationPassword('12345678', '12345678')).toBe('weak');
    expect(validateRegistrationPassword('abcdefgh', 'abcdefgh')).toBe('weak');
  });
});

describe('registrationPasswordErrorMessage', () => {
  it('retourne un texte pour short', () => {
    expect(registrationPasswordErrorMessage('short').length).toBeGreaterThan(10);
  });
});

describe('buildDisplayName', () => {
  it('concatène et trim', () => {
    expect(buildDisplayName('Marie', 'Curie')).toBe('Marie Curie');
  });
});
