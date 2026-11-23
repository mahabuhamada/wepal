import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

// صور رؤوس الصفحات في «المظهر» (جولة التصميم 6). غلاف المقال والمورد وصورة صاحب القصة صارت في المحرّر الجديد
// (/admin/editor/…)، واختباراتها في الخادم (EditorSafetyTest وEditorLibraryFaqTest) وفي المحرّر.
const theme = vi.hoisted(() => ({ current: 'classic' }));
vi.mock('../../theme/ThemeContext', () => ({ useTheme: () => ({ theme: theme.current, setTheme: () => {}, setHero: () => {} }) }));
vi.mock('../../config', () => ({ USE_API: true, FEATURES: {} }));
vi.mock('../../components/Layout/TopBar', () => ({ default: () => null }));
vi.mock('../../api/admin', () => ({
  getAppearance: vi.fn(), updateAppearance: vi.fn(), uploadPageHeader: vi.fn(), deletePageHeader: vi.fn(),
}));

const api = await import('../../api/admin');
const { AdminNoticeProvider, AdminNoticeRegion } = await import('../../components/Admin/AdminNotice');
const { default: AdminAppearance } = await import('./AdminAppearance');

const POLICY = { allowedExtensions: ['jpg', 'jpeg', 'png', 'webp'], maxBytes: 5 * 1024 * 1024 };
const COVER = {
  url: 'http://api.test/api/public/images/posts/a.w1600.webp',
  srcset: 'http://api.test/api/public/images/posts/a.w640.webp 640w, http://api.test/api/public/images/posts/a.w1600.webp 1600w',
  width: 1600, height: 900, alt: 'شباب في ورشة', credit: 'SDF',
  altTranslations: { ar: 'شباب في ورشة', en: null },
};

const renderPage = (element) => render(
  <MemoryRouter>
    <LanguageProvider initialLang="ar">
      <AdminNoticeProvider>
        {element}
        <AdminNoticeRegion />
      </AdminNoticeProvider>
    </LanguageProvider>
  </MemoryRouter>,
);
const announced = () => document.querySelector('[role="status"][aria-live="polite"]')?.textContent ?? '';
const jpg = (name = 'cover.jpg', size = 2048) => new File([new Uint8Array(size)], name, { type: 'image/jpeg' });
const pick = (name, file) => fireEvent.change(document.querySelector(`[data-testid="${name}-input"]`), { target: { files: [file] } });

beforeEach(() => {
  theme.current = 'classic';
  Object.values(api).forEach((fn) => fn.mockReset());
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:preview');
  globalThis.URL.revokeObjectURL = vi.fn();
});
afterEach(cleanup);

describe('صور رؤوس الصفحات', () => {
  const STATE = {
    design: 'azraq', hero: { mode: 'slider', newsCount: 3, interval: 7 }, updatedAt: '2026-10-20T10:00:00Z',
    pageHeaders: { news: null, blog: null, polls: null, library: { ...COVER, alt: 'رفوف المكتبة', altTranslations: { ar: 'رفوف المكتبة', en: 'Library shelves' } }, outputs: null },
    imageUpload: POLICY,
  };

  it('لا بطاقة صور مع خادم لا يرسل imageUpload', async () => {
    api.getAppearance.mockResolvedValue({ design: 'classic', hero: { mode: 'slider', newsCount: 3, interval: 7 }, updatedAt: null });
    renderPage(<AdminAppearance />);
    await screen.findByRole('radio', { name: /التصميم الحالي/ });
    expect(screen.queryByRole('heading', { name: 'صور رؤوس الصفحات' })).toBeNull();
  });

  it('رفع صورة رأس الأخبار مستقل عن حفظ التصميم ويُعلَن', async () => {
    const user = userEvent.setup();
    api.getAppearance.mockResolvedValue(STATE);
    api.uploadPageHeader.mockResolvedValue({ ...STATE, pageHeaders: { ...STATE.pageHeaders, news: COVER } });
    renderPage(<AdminAppearance />);

    expect(await screen.findByRole('heading', { name: 'صور رؤوس الصفحات' })).toBeTruthy();
    const news = screen.getByRole('form', { name: 'صورة رأس صفحة الأخبار' });
    pick('header-news', jpg('news.jpg'));
    fireEvent.change(within(news).getByRole('textbox', { name: /وصف الصورة/ }), { target: { value: 'شباب في جلسة حوار' } });
    await user.click(within(news).getByRole('button', { name: 'حفظ صورة الأخبار' }));

    await waitFor(() => expect(api.uploadPageHeader).toHaveBeenCalled());
    expect(api.uploadPageHeader.mock.calls[0][0]).toBe('news');
    expect(api.updateAppearance).not.toHaveBeenCalled();
    await waitFor(() => expect(announced()).toBe('حُفظت صورة رأس الأخبار.'));
    expect(within(news).getByText('الصورة المحفوظة', { selector: 'p' })).toBeTruthy();
  });

  it('تعديل وصف صورة المكتبة يرسل pageHeaders.library، والحذف DELETE', async () => {
    const user = userEvent.setup();
    api.getAppearance.mockResolvedValue(STATE);
    api.updateAppearance.mockResolvedValue(STATE);
    api.deletePageHeader.mockResolvedValue({ ...STATE, pageHeaders: { ...STATE.pageHeaders, library: null } });
    renderPage(<AdminAppearance />);

    const library = await screen.findByRole('form', { name: 'صورة رأس صفحة المكتبة' });
    fireEvent.change(within(library).getByRole('textbox', { name: /وصف الصورة/ }), { target: { value: 'رفوف المكتبة في المنتدى' } });
    await user.click(within(library).getByRole('button', { name: 'حفظ صورة المكتبة' }));
    await waitFor(() => expect(api.updateAppearance).toHaveBeenCalledWith({
      pageHeaders: { library: { alt: { ar: 'رفوف المكتبة في المنتدى', en: 'Library shelves' }, credit: 'SDF' } },
    }));

    await user.click(within(library).getByRole('button', { name: 'حذف الصورة' }));
    await user.click(within(library).getByRole('button', { name: 'حفظ صورة المكتبة' }));
    await waitFor(() => expect(api.deletePageHeader).toHaveBeenCalledWith('library'));
    await waitFor(() => expect(announced()).toBe('حُذفت صورة رأس المكتبة.'));
  });
});
