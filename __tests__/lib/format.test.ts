import {
  formatDistance,
  formatDuration,
  formatProfilePhone,
  formatVerificationMinutesLabel,
  formatVerificationRelative,
  isVerificationWithinTwoHours,
} from '@/lib/format';

describe('formatDistance', () => {
  it('formate en km avec une décimale', () => {
    expect(formatDistance(1.23)).toBe('1.2 km');
    expect(formatDistance(0)).toBe('0.0 km');
  });
});

describe('formatDuration', () => {
  it('affiche les minutes', () => {
    expect(formatDuration(12)).toBe('12 min');
  });
});

describe('formatProfilePhone', () => {
  it('retourne un tiret si vide', () => {
    expect(formatProfilePhone(null)).toBe('—');
    expect(formatProfilePhone('  ')).toBe('—');
  });

  it('groupe +225 en paires', () => {
    expect(formatProfilePhone('+2250708091011')).toBe('+225 07 08 09 10 11');
  });
});

describe('isVerificationWithinTwoHours', () => {
  const now = new Date('2025-06-10T14:00:00.000Z');

  it('false si pas de date', () => {
    expect(isVerificationWithinTwoHours(null, now)).toBe(false);
  });

  it('false si ISO invalide', () => {
    expect(isVerificationWithinTwoHours('pas-une-date', now)).toBe(false);
  });

  it('true si moins de 2 h', () => {
    const iso = new Date(now.getTime() - 90 * 60 * 1000).toISOString();
    expect(isVerificationWithinTwoHours(iso, now)).toBe(true);
  });

  it('false si 2 h ou plus', () => {
    const iso = new Date(now.getTime() - 120 * 60 * 1000).toISOString();
    expect(isVerificationWithinTwoHours(iso, now)).toBe(false);
  });
});

describe('formatVerificationMinutesLabel', () => {
  const now = new Date('2025-06-10T14:30:00.000Z');

  it('vide si pas de date', () => {
    expect(formatVerificationMinutesLabel(null, now)).toBe('');
  });

  it('minutes si &lt; 60 min', () => {
    const iso = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    expect(formatVerificationMinutesLabel(iso, now)).toBe('15 min');
  });
});

describe('formatVerificationRelative', () => {
  const now = new Date('2025-06-10T14:30:00.000Z');

  it('vide si pas de date', () => {
    expect(formatVerificationRelative(null, now)).toBe('');
  });

  it('« à l’instant » si &lt; 1 min', () => {
    const iso = new Date(now.getTime() - 30 * 1000).toISOString();
    expect(formatVerificationRelative(iso, now)).toBe("à l'instant");
  });

  it('minutes si &lt; 60 min', () => {
    const iso = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
    expect(formatVerificationRelative(iso, now)).toBe('il y a 15 min');
  });

  it('heures si &lt; 24 h', () => {
    const iso = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
    expect(formatVerificationRelative(iso, now)).toBe('il y a 3 h');
  });

  it('jours au-delà', () => {
    const iso = new Date(now.getTime() - 50 * 60 * 60 * 1000).toISOString();
    expect(formatVerificationRelative(iso, now)).toBe('il y a 2 j');
  });
});
