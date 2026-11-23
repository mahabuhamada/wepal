import { describe, expect, it } from 'vitest';
import { kpiDelta, kpiPercent } from './adminHomeMath';

describe('adminHomeMath', () => {
  it('kpiDelta: نسبة التغيّر، ولا شيء بلا رقم سابق موجب', () => {
    expect(kpiDelta(412, 380)).toBe(8);
    expect(kpiDelta(90, 100)).toBe(-10);
    expect(kpiDelta(5, 0)).toBeNull();
    expect(kpiDelta(5, undefined)).toBeNull();
  });

  it('kpiPercent: صفر حين لا كلّ', () => {
    expect(kpiPercent(640, 900)).toBe(71);
    expect(kpiPercent(3, 0)).toBe(0);
  });
});
