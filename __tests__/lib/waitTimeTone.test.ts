import { toneForWaitMinutes } from '@/lib/waitTimeTone';

describe('toneForWaitMinutes', () => {
  it('short si ≤10', () => {
    expect(toneForWaitMinutes(0)).toBe('short');
    expect(toneForWaitMinutes(10)).toBe('short');
  });

  it('medium si 11–20', () => {
    expect(toneForWaitMinutes(11)).toBe('medium');
    expect(toneForWaitMinutes(20)).toBe('medium');
  });

  it('long si &gt;20', () => {
    expect(toneForWaitMinutes(21)).toBe('long');
  });
});
