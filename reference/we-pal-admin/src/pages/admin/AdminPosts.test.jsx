import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'مدير', role: 'ADMIN' } }) }));
vi.mock('../../config', () => ({ USE_API: true, FEATURES: {} }));
vi.mock('../../hooks/useUnreadNotifications', () => ({ default: () => 0 }));
vi.mock('../../api/platform', () => ({ listNotifications: vi.fn(() => Promise.resolve({ data: [], meta: { unreadCount: 0 } })) }));
vi.mock('../../api/admin', () => ({ listPostsForAdmin: vi.fn(), deletePost: vi.fn() }));
const adminApi = await import('../../api/admin');
const { default: AdminPosts } = await import('./AdminPosts');

const pageOf = (items, page, lastPage) => ({ data: items, meta: { page, perPage: 20, total: 3, lastPage } });

const renderPage = (path = '/admin/news') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <LanguageProvider initialLang="ar">
        <AdminPosts />
      </LanguageProvider>
    </MemoryRouter>,
  );

describe('AdminPosts — المسودات والتقسيم (B4.3)', () => {
  beforeEach(() => {
    adminApi.listPostsForAdmin.mockReset();
  });
  afterEach(cleanup);

  it('تعرض المسودات بشارة، وتُرشّح بالحالة، و«عرض المزيد» يجلب التالية', async () => {
    const user = userEvent.setup();
    adminApi.listPostsForAdmin.mockImplementation(({ status, page }) => {
      if (status === 'draft') return Promise.resolve(pageOf([{ id: 'd1', title: 'مسودة المقال', publishedAt: null }], 1, 1));
      if (page === 2) return Promise.resolve(pageOf([{ id: 'p3', title: 'مقال ثالث', publishedAt: '2026-09-02T00:00:00Z' }], 2, 2));
      return Promise.resolve(pageOf([
        { id: 'd1', title: 'مسودة المقال', publishedAt: null },
        { id: 'p2', title: 'مقال منشور', publishedAt: '2026-09-01T00:00:00Z' },
      ], 1, 2));
    });
    renderPage();

    const draftRow = (await screen.findByText('مسودة المقال')).closest('tr');
    expect(within(draftRow).getByText('مسودة')).toBeTruthy();
    expect(within(screen.getByText('مقال منشور').closest('tr')).queryByText('مسودة')).toBeNull();
    expect(adminApi.listPostsForAdmin).toHaveBeenCalledWith({ status: 'all', page: 1, kind: 'news' });

    await user.click(screen.getByRole('button', { name: 'عرض المزيد' }));
    expect(await screen.findByText('مقال ثالث')).toBeTruthy();

    await user.click(within(screen.getByRole('group', { name: 'حالة النشر' })).getByRole('button', { name: 'مسودة' }));
    expect(adminApi.listPostsForAdmin).toHaveBeenLastCalledWith({ status: 'draft', page: 1, kind: 'news' });
    await screen.findByText('مسودة المقال');
    expect(screen.queryByText('مقال منشور')).toBeNull();
  });

  it('خطأ التحميل (403 للمشرف مثلًا) يظهر كرسالة', async () => {
    adminApi.listPostsForAdmin.mockRejectedValue(new Error('لا تملك صلاحية لهذا الإجراء'));
    renderPage();
    expect((await screen.findByRole('alert')).textContent).toContain('لا تملك صلاحية لهذا الإجراء');
  });

  it('عنصر العرض (isDemo): شارة «مثال» بلا أزرار تعديل أو حذف (#144)', async () => {
    adminApi.listPostsForAdmin.mockResolvedValue(pageOf([
      { id: 'demo1', title: 'مقال توضيحي', publishedAt: '2026-09-01T00:00:00Z', isDemo: true },
      { id: 'p2', title: 'مقال حقيقي', publishedAt: '2026-09-01T00:00:00Z', isDemo: false },
    ], 1, 1));
    renderPage();

    const demoRow = (await screen.findByText('مقال توضيحي')).closest('tr');
    expect(within(demoRow).getByText('مثال')).toBeTruthy();
    expect(within(demoRow).queryByTitle('تعديل')).toBeNull();
    expect(within(demoRow).queryByTitle('حذف')).toBeNull();

    const realRow = screen.getByText('مقال حقيقي').closest('tr');
    expect(within(realRow).getByTitle('حذف')).toBeTruthy();
    // الكتابة في المحرّر الجديد: «تعديل» و«جديد» رابطان إليه، ولا نموذج داخل الصفحة
    expect(within(realRow).getByTitle('تعديل').getAttribute('href')).toBe('/admin/editor/post/p2');
    expect(screen.getByRole('link', { name: 'خبر جديد' }).getAttribute('href')).toBe('/admin/editor/post/new?category=news');
    expect(screen.queryByRole('textbox', { name: /العنوان/ })).toBeNull();
  });

  it('«التحليلات»: قائمة غير الأخبار بعمود التصنيف، و«تحليل جديد» بلا تصنيف مسبق', async () => {
    adminApi.listPostsForAdmin.mockResolvedValue(pageOf([{ id: 'a1', title: 'قراءة في الحوار', category: 'رأي', publishedAt: null, locale: 'ar' }], 1, 1));
    renderPage('/admin/analyses');

    await screen.findByText('قراءة في الحوار');
    expect(adminApi.listPostsForAdmin).toHaveBeenCalledWith({ status: 'all', page: 1, kind: 'analysis' });
    expect(screen.getByRole('heading', { name: 'التحليلات', level: 2 })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'التصنيف' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'تحليل جديد' }).getAttribute('href')).toBe('/admin/editor/post/new');
  });

  it('/admin/posts القديم يحوّل إلى «الأخبار»', async () => {
    const { default: AdminPostsRedirect } = await import('./AdminPostsRedirect');
    const Where = () => <p data-testid="where">{useLocation().pathname}</p>;
    render(
      <MemoryRouter initialEntries={['/admin/posts']}>
        <Routes>
          <Route path="/admin/posts" element={<AdminPostsRedirect />} />
          <Route path="/admin/news" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    expect((await screen.findByTestId('where')).textContent).toBe('/admin/news');
  });
});
