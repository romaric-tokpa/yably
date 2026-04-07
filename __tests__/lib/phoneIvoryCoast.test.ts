import {
  formatCiFullDisplayFromE164,
  parseCiPhoneToE164,
  phoneDigitsOnly,
} from '@/lib/phoneIvoryCoast';

describe('phoneDigitsOnly', () => {
  it('ne garde que les chiffres', () => {
    expect(phoneDigitsOnly('+225 07 08')).toBe('2250708');
  });
});

describe('parseCiPhoneToE164', () => {
  it('accepte 10 chiffres nationaux', () => {
    expect(parseCiPhoneToE164('0708091011')).toBe('+2250708091011');
    expect(parseCiPhoneToE164('07 08 09 10 11')).toBe('+2250708091011');
  });

  it('accepte préfixe 225 sans +', () => {
    expect(parseCiPhoneToE164('2250708091011')).toBe('+2250708091011');
  });

  it('rejette moins de 10 chiffres nationaux', () => {
    expect(parseCiPhoneToE164('070809101')).toBeNull();
  });

  it('rejette plus de 10 chiffres après extraction', () => {
    expect(parseCiPhoneToE164('07080910112')).toBeNull();
  });
});

describe('formatCiFullDisplayFromE164', () => {
  it('formate +225 avec paires', () => {
    expect(formatCiFullDisplayFromE164('+2250708091011')).toBe(
      '+225 07 08 09 10 11',
    );
  });
});
