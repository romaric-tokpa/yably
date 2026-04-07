import {
  explorerGreetingLine,
  firstNameFromDisplayName,
  greetingWord,
  homeGreetingLine,
  isEveningLocal,
  lastNameFromDisplayName,
} from '@/lib/greeting';

describe('greeting', () => {
  it('soir à partir de 18h et avant 5h', () => {
    expect(isEveningLocal(new Date('2026-04-06T17:59:00'))).toBe(false);
    expect(isEveningLocal(new Date('2026-04-06T18:00:00'))).toBe(true);
    expect(isEveningLocal(new Date('2026-04-06T04:59:00'))).toBe(true);
    expect(isEveningLocal(new Date('2026-04-06T05:00:00'))).toBe(false);
  });

  it('greetingWord suit la plage horaire', () => {
    expect(greetingWord(new Date('2026-04-06T10:00:00'))).toBe('Bonjour');
    expect(greetingWord(new Date('2026-04-06T20:00:00'))).toBe('Bonsoir');
  });

  it('premier mot du display name', () => {
    expect(firstNameFromDisplayName('Romaric Dupont')).toBe('Romaric');
    expect(firstNameFromDisplayName(null)).toBe('');
  });

  it('nom de famille depuis display_name', () => {
    expect(lastNameFromDisplayName('Jean de La Fontaine')).toBe(
      'de La Fontaine',
    );
    expect(lastNameFromDisplayName('Seul')).toBe('');
    expect(lastNameFromDisplayName(null)).toBe('');
  });

  it('ligne d’accueil : prénom + nom (display_name complet)', () => {
    const midi = new Date('2026-04-06T12:00:00');
    expect(homeGreetingLine(midi, 'Romaric Dupont')).toBe('Bonjour Romaric Dupont');
    expect(homeGreetingLine(midi, '  Romaric Tokpa  ')).toBe('Bonjour Romaric Tokpa');
    expect(homeGreetingLine(midi, null)).toBe('Bonjour');
    const vingt = new Date('2026-04-06T20:00:00');
    expect(homeGreetingLine(vingt, 'Romaric Dupont')).toBe('Bonsoir Romaric Dupont');
  });

  it('ligne Explorer : salutation + prénom seulement', () => {
    const midi = new Date('2026-04-06T12:00:00');
    expect(explorerGreetingLine(midi, 'Romaric Dupont')).toBe('Bonjour Romaric');
    expect(explorerGreetingLine(midi, null)).toBe('Bonjour');
    const vingt = new Date('2026-04-06T20:00:00');
    expect(explorerGreetingLine(vingt, 'Marie-Claire Dumas')).toBe(
      'Bonsoir Marie-Claire',
    );
  });
});
