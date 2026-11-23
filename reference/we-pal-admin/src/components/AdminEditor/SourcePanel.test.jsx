import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SourcePanel } from './SettingsAside';
import { TranslationTab } from './EditorTabs';

const ar = { id: 'a1', locale: 'ar', status: 'published', original: true, title: 'دليل الحوار' };
const doc = { type: 'doc', content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'مقدمة' }] }, { type: 'paragraph', content: [{ type: 'text', text: 'نص' }] }] };
const source = (extra = {}) => ({ id: 'a1', locale: 'ar', fields: { title: { ar: 'دليل الحوار' }, body: { ar: doc } }, ...extra });
const inRouter = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('SourcePanel («الأصل»)', () => {
  afterEach(cleanup);

  it('يعرض العنوان ثم المتن HTML ببنيته، ورابطًا إلى النسخة العربية', () => {
    inRouter(<SourcePanel type="resource" sourceRef={ar} source={source({ bodyHtml: '<h2>مقدمة</h2><ul><li>نقطة</li></ul><p><a href="https://example.org/x">رابط</a></p>' })} />);
    expect(screen.getByRole('heading', { level: 2, name: 'دليل الحوار' })).toBeTruthy();
    expect(screen.getByRole('heading', { level: 2, name: 'مقدمة' })).toBeTruthy();
    expect((screen.getByRole('listitem')).textContent).toContain('نقطة');
    expect((screen.getByRole('link', { name: 'فتح النسخة العربية' })).getAttribute('href')).toBe('/admin/editor/resource/a1');
    expect((screen.getByRole('article')).getAttribute('dir')).toBe('rtl');
  });

  it('روابط المتن تُفتح في تبويب جديد فلا يغادر المترجم ورقته', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    inRouter(<SourcePanel type="post" sourceRef={ar} source={source({ bodyHtml: '<p><a href="https://example.org/x">رابط</a></p>' })} />);
    fireEvent.click(screen.getByRole('link', { name: 'رابط' }));
    expect(open).toHaveBeenCalledWith('https://example.org/x', '_blank', 'noopener,noreferrer');
    open.mockRestore();
  });

  it('بلا HTML يرجع للنص العادي، وأصل إنجليزي يُعرض من اليسار', () => {
    inRouter(<SourcePanel type="post" sourceRef={ar} source={source()} />);
    expect((screen.getByText(/مقدمة/)).classList.contains('is-plain')).toBe(true);
    cleanup();
    const en = { id: 'e1', locale: 'en', original: true };
    inRouter(<SourcePanel type="post" sourceRef={en} source={{ id: 'e1', locale: 'en', fields: { title: { en: 'Guide' } }, bodyHtml: '<p>Hello</p>' }} />);
    expect((screen.getByRole('article')).getAttribute('dir')).toBe('ltr');
    expect((screen.getByRole('article')).getAttribute('lang')).toBe('en');
    expect((screen.getByRole('link', { name: 'فتح النسخة الإنجليزية' })).getAttribute('href')).toBe('/admin/editor/post/e1');
  });

  it('أثناء التحميل وعند الفشل يبقى الرابط إلى النسخة', () => {
    inRouter(<SourcePanel type="post" sourceRef={ar} source={null} />);
    expect((screen.getByRole('status')).textContent).toContain('يُحمَّل');
    cleanup();
    inRouter(<SourcePanel type="post" sourceRef={ar} source={{ failed: true }} />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'فتح النسخة العربية' })).toBeTruthy();
  });
});

describe('TranslationTab: «ما يخصّ كل لغة»', () => {
  afterEach(cleanup);

  it('صف النسخة الأخرى رابط يفتحها، وصف هذه النسخة يبقى كما هو', () => {
    inRouter(<TranslationTab item={{ id: 'e1', locale: 'en', status: 'draft', translations: [ar] }} type="resource" dirty={false} onCreate={() => {}} />);
    const rows = screen.getAllByRole('row');
    expect((rows[1]).getAttribute('aria-current')).toBe('true');
    expect(rows[1].querySelector('a')).toBeNull();
    expect((rows[2]).classList.contains('wp-row')).toBe(true);
    expect((rows[2].querySelector('a')).getAttribute('href')).toBe('/admin/editor/resource/a1');
  });
});
