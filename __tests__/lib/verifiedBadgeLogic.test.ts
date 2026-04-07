import { resolveVerifiedBadgeTone } from '@/lib/verifiedBadgeLogic';

describe('resolveVerifiedBadgeTone', () => {
  const now = new Date('2025-06-10T12:00:00.000Z');
  const recent = new Date(now.getTime() - 30 * 60 * 1000).toISOString();

  it('closed si dernier statut fermé', () => {
    expect(resolveVerifiedBadgeTone(3, recent, 'closed', now)).toBe('closed');
  });

  it('verified si ouvert, compte &gt; 0 et vérif &lt; 2 h', () => {
    expect(resolveVerifiedBadgeTone(2, recent, 'open', now)).toBe('verified');
  });

  it('unverified si statut open mais hors fenêtre 2 h', () => {
    const old = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
    expect(resolveVerifiedBadgeTone(2, old, 'open', now)).toBe('unverified');
  });

  it('unverified si compte 0 même avec date récente', () => {
    expect(resolveVerifiedBadgeTone(0, recent, 'open', now)).toBe('unverified');
  });

  it('unverified si lastStatus null', () => {
    expect(resolveVerifiedBadgeTone(1, recent, null, now)).toBe('unverified');
  });
});
