import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, palestineToIso } from './editorFormat';

describe('editorFormat', () => {
  it('DD/MM/YYYY بأرقام لاتينية وبتوقيت فلسطين', () => {
    expect(formatDateTime('2026-11-11T12:05:00Z')).toBe('11/11/2026 14:05');
    expect(formatDate('2026-11-11T23:30:00Z')).toBe('12/11/2026');
    expect(formatDateTime(null)).toBe('');
  });

  it('موعد الجدولة بتوقيت فلسطين صيفًا وشتاءً', () => {
    expect(palestineToIso('2026-11-20T09:30')).toBe('2026-11-20T07:30:00.000Z');
    expect(palestineToIso('2026-07-01T09:30')).toBe('2026-07-01T06:30:00.000Z');
    expect(palestineToIso('غير صالح')).toBeNull();
  });
});
