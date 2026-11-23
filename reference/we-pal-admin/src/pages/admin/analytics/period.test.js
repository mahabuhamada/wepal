import { describe, expect, it } from 'vitest';
import { addDays, daysLabel, deltaPct, periodLength, presetPeriod, todayIso } from './period';

describe('analytics period', () => {
  it('اليوم بتوقيت فلسطين لا UTC', () => {
    // 23:30 UTC يوم 12 = 01:30 يوم 13 في القدس (شتاءً +2)
    expect(todayIso(new Date('2026-11-12T23:30:00Z'))).toBe('2026-11-13');
  });

  it('الفترة الجاهزة تشمل اليوم: 7 أيام = اليوم و6 قبله', () => {
    const p = presetPeriod(7, new Date('2026-11-13T10:00:00Z'));
    expect(p).toEqual({ from: '2026-11-07', to: '2026-11-13', days: 7 });
    expect(periodLength(p)).toBe(7);
  });

  it('addDays عبر حدود الشهر', () => {
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31');
  });

  it('deltaPct: null بلا فترة سابقة', () => {
    expect(deltaPct(150, 100)).toBe(50);
    expect(deltaPct(5, 0)).toBeNull();
    expect(deltaPct(undefined, 3)).toBeNull();
  });

  it('daysLabel: تمييز العدد بالعربية', () => {
    expect(daysLabel(7, 'ar')).toBe('7 أيام');
    expect(daysLabel(30, 'ar')).toBe('30 يومًا');
    expect(daysLabel(2, 'ar')).toBe('يومان');
    expect(daysLabel(1, 'en')).toBe('1 day');
    expect(daysLabel(90, 'en')).toBe('90 days');
  });
});
