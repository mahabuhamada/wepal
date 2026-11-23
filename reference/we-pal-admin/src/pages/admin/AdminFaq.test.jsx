import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'مدير', role: 'ADMIN' } }) }));
vi.mock('../../config', () => ({ USE_API: true, FEATURES: {} }));
vi.mock('../../hooks/useUnreadNotifications', () => ({ default: () => 0 }));
vi.mock('../../api/platform', () => ({ listNotifications: vi.fn(() => Promise.resolve({ data: [], meta: { unreadCount: 0 } })) }));
vi.mock('../../api/admin', () => ({
  listFaqForAdmin: vi.fn(), updateFaq: vi.fn(), reorderFaq: vi.fn(), deleteFaq: vi.fn(),
}));
const adminApi = await import('../../api/admin');
const { default: AdminFaq } = await import('./AdminFaq');

const faq = (id, category, question, extra = {}) => ({
  id, category, question, answer: `جواب ${question}`, published: true, isDemo: false, sortOrder: 1, locale: 'ar',
  translations: { question: { ar: question }, answer: { ar: `جواب ${question}` } }, ...extra,
});
const ITEMS = [
  faq('a1', 'about', 'ما المنصة؟'),
  faq('a2', 'about', 'من يديرها؟', { published: false }),
  faq('a3', 'about', 'سؤال عرض؟', { isDemo: true }),
  faq('p1', 'privacy', 'Who sees my data?', { locale: 'en', translations: { question: { en: 'Who sees my data?' }, answer: { en: 'You choose.' } } }),
];

const renderPage = () =>
  render(
    <MemoryRouter>
      <LanguageProvider initialLang="ar">
        <AdminFaq />
      </LanguageProvider>
    </MemoryRouter>,
  );

const rowOf = (text) => screen.getByText(text).closest('li');

describe('AdminFaq — إدارة الأسئلة الشائعة', () => {
  beforeEach(() => {
    Object.values(adminApi).forEach((fn) => fn.mockReset());
    adminApi.listFaqForAdmin.mockResolvedValue({ data: ITEMS, meta: { total: ITEMS.length } });
  });
  afterEach(cleanup);

  it('تعرض الأسئلة مجمّعة بالتصنيف، بشارات المسودة واللغة والعرض', async () => {
    renderPage();
    await screen.findByText('ما المنصة؟');
    expect(adminApi.listFaqForAdmin).toHaveBeenCalledWith({ status: 'all' });

    const sections = screen.getAllByRole('region');
    expect(sections.map((s) => within(s).getByRole('heading').textContent)).toEqual(['عن المنصة (3)', 'الخصوصية والبيانات (1)']);
    expect(within(rowOf('من يديرها؟')).getByText('مسودة')).toBeTruthy();
    expect(within(rowOf('Who sees my data?')).getByText('EN')).toBeTruthy();
    expect(within(rowOf('ما المنصة؟')).getByText('عربي')).toBeTruthy();

    // سؤال العرض: شارة «مثال» بلا أزرار
    const demo = rowOf('سؤال عرض؟');
    expect(within(demo).getByText('مثال')).toBeTruthy();
    expect(within(demo).queryAllByRole('button')).toEqual([]);
    expect(within(demo).queryAllByRole('link')).toEqual([]);
  });

  it('كل الأزرار بأسماء تحمل السؤال، والتحريك معطّل عند أول التصنيف وآخره', async () => {
    renderPage();
    await screen.findByText('ما المنصة؟');

    const first = within(rowOf('ما المنصة؟'));
    expect(first.getByRole('button', { name: 'تحريك للأعلى: ما المنصة؟' }).disabled).toBe(true);
    expect(first.getByRole('button', { name: 'تحريك للأسفل: ما المنصة؟' }).disabled).toBe(false);
    expect(first.getByRole('button', { name: 'إلغاء النشر: ما المنصة؟' })).toBeTruthy();
    expect(within(rowOf('من يديرها؟')).getByRole('button', { name: 'نشر: من يديرها؟' })).toBeTruthy();
    // آخر سؤال حقيقي في تصنيفه (سؤال العرض بعده لا يُحسب)
    expect(within(rowOf('من يديرها؟')).getByRole('button', { name: 'تحريك للأسفل: من يديرها؟' }).disabled).toBe(true);
  });

  it('التحريك يرسل ترتيب التصنيف الجديد ثم يعيد التحميل', async () => {
    const user = userEvent.setup();
    adminApi.reorderFaq.mockResolvedValue({ data: [] });
    renderPage();
    await screen.findByText('ما المنصة؟');

    await user.click(screen.getByRole('button', { name: 'تحريك للأسفل: ما المنصة؟' }));
    expect(adminApi.reorderFaq).toHaveBeenCalledWith(['a2', 'a1']);
    await waitFor(() => expect(adminApi.listFaqForAdmin).toHaveBeenCalledTimes(2));
  });

  it('النشر وإلغاؤه من الصف', async () => {
    const user = userEvent.setup();
    adminApi.updateFaq.mockResolvedValue({ ...ITEMS[1], published: true });
    renderPage();
    await screen.findByText('من يديرها؟');

    await user.click(screen.getByRole('button', { name: 'نشر: من يديرها؟' }));
    expect(adminApi.updateFaq).toHaveBeenCalledWith('a2', { published: true });
    await waitFor(() => expect(within(rowOf('من يديرها؟')).queryByText('مسودة')).toBeNull());
  });

  it('الترشيح بالحالة يخفي أزرار التحريك (الترتيب يحتاج كل أسئلة التصنيف)', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('ما المنصة؟');

    adminApi.listFaqForAdmin.mockResolvedValue({ data: [ITEMS[0]], meta: { total: 1 } });
    await user.click(within(screen.getByRole('group', { name: 'حالة النشر' })).getByRole('button', { name: 'منشور' }));
    await waitFor(() => expect(adminApi.listFaqForAdmin).toHaveBeenLastCalledWith({ status: 'published' }));
    await waitFor(() => expect(screen.queryByText('من يديرها؟')).toBeNull());
    expect(screen.queryByRole('button', { name: /تحريك/ })).toBeNull();
  });

  it('«سؤال جديد» و«تعديل» يفتحان المحرّر، ولا نموذج داخل الصفحة', async () => {
    renderPage();
    await screen.findByText('Who sees my data?');

    expect(screen.getByRole('link', { name: 'سؤال جديد' }).getAttribute('href')).toBe('/admin/editor/faq/new');
    expect(screen.getByRole('link', { name: 'Who sees my data?' }).getAttribute('href')).toBe('/admin/editor/faq/p1');
    expect(screen.queryByLabelText('السؤال بالعربية')).toBeNull();
  });

  it('الحذف بعد التأكيد', async () => {
    const user = userEvent.setup();
    adminApi.deleteFaq.mockResolvedValue({ success: true });
    renderPage();
    await screen.findByText('ما المنصة؟');

    await user.click(screen.getByRole('button', { name: 'حذف: ما المنصة؟' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'حذف' }));

    expect(adminApi.deleteFaq).toHaveBeenCalledWith('a1');
    await waitFor(() => expect(screen.queryByText('ما المنصة؟')).toBeNull());
  });

  it('لا أسئلة بعد ← حالة فارغة واضحة، وخطأ التحميل برسالته', async () => {
    adminApi.listFaqForAdmin.mockResolvedValueOnce({ data: [], meta: { total: 0 } });
    renderPage();
    expect(await screen.findByText('لا أسئلة بعد. أضف أول سؤال.')).toBeTruthy();
    cleanup();

    adminApi.listFaqForAdmin.mockRejectedValueOnce(new Error('لا تملك صلاحية لهذا الإجراء'));
    renderPage();
    expect((await screen.findByRole('alert')).textContent).toContain('لا تملك صلاحية لهذا الإجراء');
  });
});
