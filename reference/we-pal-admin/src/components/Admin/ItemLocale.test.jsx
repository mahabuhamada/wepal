import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

const theme = vi.hoisted(() => ({ theme: 'azraq' }));
vi.mock('../../theme/ThemeContext', () => ({ useTheme: () => theme }));
const { default: ItemLocale } = await import('./ItemLocale');

const renderLocale = (props) => render(
  <MemoryRouter>
    <LanguageProvider initialLang="ar"><ItemLocale {...props} /></LanguageProvider>
  </MemoryRouter>,
);

describe('ItemLocale', () => {
  afterEach(() => { cleanup(); theme.theme = 'azraq'; });

  it('في «أزرق هادئ» كل لغة للمادة رابط يفتح نسختها في المحرّر', () => {
    const item = { id: 'e1', locale: 'en', siblings: [{ id: 'a1', locale: 'ar' }] };
    renderLocale({ locale: 'en', item, type: 'resource' });
    const links = screen.getAllByRole('link');
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/admin/editor/resource/a1', '/admin/editor/resource/e1']);
    expect((screen.getByRole('link', { name: 'فتح النسخة العربية' })).getAttribute('aria-current')).toBeNull();
    expect((screen.getByRole('link', { name: 'فتح النسخة الإنجليزية' })).getAttribute('aria-current')).toBe('true');
  });

  it('مادة بلا أخت: شارة لغتها وحدها، وهي رابط إليها', () => {
    renderLocale({ locale: 'ar', item: { id: 'a1', locale: 'ar' }, type: 'post' });
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect((screen.getByRole('link')).getAttribute('href')).toBe('/admin/editor/post/a1');
  });

  it('التصميم الحالي وعناصر العرض: شارة نصية بلا روابط كما كانت', () => {
    theme.theme = 'classic';
    renderLocale({ locale: 'en', item: { id: 'e1', locale: 'en', siblings: [{ id: 'a1', locale: 'ar' }] }, type: 'post' });
    expect(screen.queryByRole('link')).toBeNull();
    cleanup();
    theme.theme = 'azraq';
    renderLocale({ locale: 'ar', item: { id: 'd1', locale: 'ar', isDemo: true }, type: 'post' });
    expect(screen.queryByRole('link')).toBeNull();
  });
});
