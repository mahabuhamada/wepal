import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { LanguageProvider } from '../../i18n/LanguageContext';
import BilingualField, { cleanBilingual, toBilingual } from './BilingualField';

const renderField = (value = { ar: '', en: '' }, onChange = () => {}) =>
  render(
    <LanguageProvider initialLang="ar">
      <BilingualField label="العنوان" value={value} onChange={onChange} />
    </LanguageProvider>,
  );

describe('BilingualField', () => {
  afterEach(cleanup);

  // backlog 39: كان التبويبان 24px بخط 11px. jsdom لا يحسب الأبعاد، فنتحقق من الأصناف.
  it('تبويبا اللغة هدفا لمس 44px بخط 12px على الأقل، بلا أحجام بكسل مباشرة', () => {
    renderField();
    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    for (const tab of tabs) {
      expect(tab.className).toMatch(/\bmin-h-11\b/);
      expect(tab.className).toMatch(/\bmin-w-11\b/);
      expect(tab.className).toMatch(/\btext-label\b/);
      expect(tab.className).not.toMatch(/text-\[\d+px\]/);
    }
  });

  it('التبويب يبدّل الحقل الظاهر، والتلميح الإنجليزي بخط النظام', () => {
    renderField();
    const [ar, en] = screen.getAllByRole('tab');
    expect(ar.getAttribute('aria-selected')).toBe('true');

    fireEvent.click(en);
    expect(en.getAttribute('aria-selected')).toBe('true');
    expect(document.getElementById(en.getAttribute('aria-controls')).hidden).toBe(false);
    expect(document.getElementById(ar.getAttribute('aria-controls')).hidden).toBe(true);
    const hint = screen.getByText(/اختياري/);
    expect(hint.className).toMatch(/\btext-caption\b/);
  });

  it('toBilingual و cleanBilingual', () => {
    expect(toBilingual('نص')).toEqual({ ar: 'نص', en: '' });
    expect(toBilingual({ ar: 'أ', en: 'b' })).toEqual({ ar: 'أ', en: 'b' });
    expect(cleanBilingual({ ar: ' أ ', en: '  ' })).toEqual({ ar: 'أ' });
  });
});
