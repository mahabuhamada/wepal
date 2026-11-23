import { describe, expect, it } from 'vitest';
import { countryName, stepIndex, steps } from './countries';

describe('countries', () => {
  it('فلسطين باسمها، والمجهول بالتسمية المعطاة', () => {
    expect(countryName('PS', 'ar')).toBe('فلسطين');
    expect(countryName('PS', 'en')).toBe('Palestine');
    expect(countryName('??', 'ar', 'غير معروف')).toBe('غير معروف');
    expect(countryName('JO', 'en')).toBe('Jordan');
  });

  it('الدرجات تصاعدية وبلا تكرار، وكل قيمة في درجتها', () => {
    const b = steps(100);
    expect(b).toEqual([4, 16, 36, 64, 100]);
    expect(stepIndex(0, b)).toBe(-1);
    expect(stepIndex(1, b)).toBe(0);
    expect(stepIndex(50, b)).toBe(3);
    expect(steps(1)).toEqual([1]);
    expect(steps(0)).toEqual([]);
  });
});
