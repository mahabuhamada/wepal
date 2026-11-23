import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

// رحلات الإدارة بعد مراجعة تجربة الاستخدام وإمكانية الوصول (في السمتين): التأكيد قبل ما يغيّر الصلاحيات أو يحذف،
// وإعلان النتيجة، وحالة النشر في النماذج، والحالة الفارغة، ولوحة المفاتيح في التبويبات، وعنوان التبويب، وبديل الرسوم.
const theme = vi.hoisted(() => ({ current: 'classic' }));
vi.mock('../../theme/ThemeContext', () => ({ useTheme: () => ({ theme: theme.current, setTheme: () => {}, setHero: () => {} }) }));
vi.mock('../../config', () => ({ USE_API: true, FEATURES: {} }));
const auth = vi.hoisted(() => ({ user: { id: 'a1', name: 'مدير', role: 'ADMIN' } }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../hooks/useUnreadNotifications', () => ({ default: () => 0 }));
vi.mock('../../api/admin', () => ({
  listUsers: vi.fn(), updateUser: vi.fn(), listInvitations: vi.fn(), generateInvitations: vi.fn(), revokeInvitation: vi.fn(),
  listPostsForAdmin: vi.fn(), createPost: vi.fn(), updatePost: vi.fn(), deletePost: vi.fn(),
  listResourcesForAdmin: vi.fn(), createResource: vi.fn(), createResourceWithFile: vi.fn(), updateResource: vi.fn(), deleteResource: vi.fn(),
  createSurvey: vi.fn(), publishSurvey: vi.fn(), closeSurvey: vi.fn(), deleteSurvey: vi.fn(),
  listAdminSurveys: vi.fn(), getSurveysSummary: vi.fn(() => Promise.resolve(null)),
  listReports: vi.fn(), resolveReport: vi.fn(),
  listReportQueue: vi.fn(), getReportsSummary: vi.fn(() => Promise.resolve(null)), resolveReportGroup: vi.fn(), restoreHiddenContent: vi.fn(), getUsersSummary: vi.fn(() => Promise.resolve(null)),
  listContactMessages: vi.fn(), listNewsletterSubscribers: vi.fn(),
}));
vi.mock('../../api/platform', () => ({ listSurveys: vi.fn(), listNotifications: vi.fn() }));

const api = await import('../../api/admin');
const platform = await import('../../api/platform');
const { AdminNoticeProvider, AdminNoticeRegion } = await import('../../components/Admin/AdminNotice');
const { default: ChartTable } = await import('../../components/Admin/ChartTable');
const { default: AdminUsers } = await import('./AdminUsers');
const { default: AdminPosts } = await import('./AdminPosts');
const { default: AdminLibrary } = await import('./AdminLibrary');
const { default: AdminSurveys } = await import('./AdminSurveys');
const { default: AdminReports } = await import('./AdminReports');
const { default: AdminInbox } = await import('./AdminInbox');

const page = (data) => ({ data, meta: { page: 1, perPage: 20, total: data.length, lastPage: 1 } });

// الصفحة داخل مزوّد الإعلانات كما في القشرة، مع منطقة الإعلان.
const renderPage = (element, lang = 'ar', url = '/') => render(
  <MemoryRouter initialEntries={[url]}>
    <LanguageProvider initialLang={lang}>
      <AdminNoticeProvider>
        {element}
        <AdminNoticeRegion />
      </AdminNoticeProvider>
    </LanguageProvider>
  </MemoryRouter>,
);

const announced = () => document.querySelector('[role="status"][aria-live="polite"]')?.textContent ?? '';

beforeEach(() => {
  theme.current = 'classic';
  auth.user = { id: 'a1', name: 'مدير', role: 'ADMIN' };
  Object.values(api).forEach((fn) => fn.mockReset());
  Object.values(platform).forEach((fn) => fn.mockReset());
  api.listInvitations.mockResolvedValue({ ...page([]), summary: { total: 0, used: 0, unused: 0 } });
  platform.listNotifications.mockResolvedValue({ data: [], meta: { unreadCount: 0 } });
});
afterEach(cleanup);

describe('المستخدمون: تغيير الدور والحالة بعد التأكيد', () => {
  const SARA = { id: 'u1', name: 'سارة أحمد', email: 's@x.dev', region: 'GAZA', role: 'MEMBER', isActive: true, createdAt: '2026-09-01T10:00:00Z' };
  beforeEach(() => {
    api.listUsers.mockResolvedValue({ data: [SARA], meta: { total: 1, page: 1, perPage: 25 } });
  });

  it('المرشّحات وحقل الدور في الصف لها أسماء، والجدول له عنوان ورؤوس أعمدة', async () => {
    const { container } = renderPage(<AdminUsers />);
    await screen.findByText('سارة أحمد');
    expect(screen.getByRole('combobox', { name: 'تصفية حسب المنطقة' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'تصفية حسب الدور' })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: 'دور سارة أحمد' })).toBeTruthy();
    expect(container.querySelector('table caption').textContent).toBe('إدارة المستخدمين');
    expect([...container.querySelectorAll('thead th')].every((th) => th.getAttribute('scope') === 'col')).toBe(true);
  });

  it('تغيير الدور: نافذة تأكيد، الإلغاء لا يرسل شيئًا، التأكيد يرسل ويعلن', async () => {
    const user = userEvent.setup();
    api.updateUser.mockResolvedValue({ role: 'MODERATOR' });
    renderPage(<AdminUsers />);
    const select = await screen.findByRole('combobox', { name: 'دور سارة أحمد' });

    await user.selectOptions(select, 'MODERATOR');
    let dialog = screen.getByRole('dialog', { name: 'تغيير الدور؟' });
    await user.click(within(dialog).getByRole('button', { name: 'إلغاء' }));
    expect(api.updateUser).not.toHaveBeenCalled();
    expect(select.value).toBe('MEMBER');

    await user.selectOptions(select, 'MODERATOR');
    dialog = screen.getByRole('dialog', { name: 'تغيير الدور؟' });
    await user.click(within(dialog).getByRole('button', { name: 'تغيير الدور' }));
    expect(api.updateUser).toHaveBeenCalledWith('u1', { role: 'MODERATOR' });
    await vi.waitFor(() => expect(announced()).toBe('صار دور سارة أحمد: مشرف محتوى'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('إيقاف الحساب: تأكيد بلون الخطر، وخطأ الخادم يبقى داخل النافذة', async () => {
    const user = userEvent.setup();
    api.updateUser.mockRejectedValueOnce(new Error('لا يمكن إيقاف آخر مدير'));
    renderPage(<AdminUsers />);
    await user.click(await screen.findByRole('button', { name: /إيقاف.*سارة أحمد/ }));

    const dialog = screen.getByRole('dialog', { name: 'إيقاف الحساب؟' });
    await user.click(within(dialog).getByRole('button', { name: 'إيقاف الحساب' }));
    expect(api.updateUser).toHaveBeenCalledWith('u1', { isActive: false });
    expect(await within(dialog).findByText('لا يمكن إيقاف آخر مدير')).toBeTruthy();
    expect(announced()).toBe('');
  });
});

describe('المدونة والمكتبة: الكتابة في المحرّر، والحذف بالتأكيد', () => {
  it('«خبر جديد» و«تعديل» يفتحان المحرّر، والحذف بنافذة تأكيد', async () => {
    const user = userEvent.setup();
    api.listPostsForAdmin.mockResolvedValue(page([{ id: 'p1', title: 'مسودة قديمة', translations: { title: { ar: 'مسودة قديمة' } }, publishedAt: null, category: 'رأي', locale: 'ar' }]));
    api.deletePost.mockResolvedValue({});
    renderPage(<AdminPosts />);

    expect((await screen.findByRole('link', { name: 'مسودة قديمة' })).getAttribute('href')).toBe('/admin/editor/post/p1');
    expect(screen.getByRole('link', { name: /خبر جديد/ }).getAttribute('href')).toBe('/admin/editor/post/new?category=news');
    expect(screen.queryByRole('group', { name: 'الظهور للزوار' })).toBeNull();

    await user.click(screen.getByRole('button', { name: 'حذف: مسودة قديمة' }));
    const dialog = screen.getByRole('dialog', { name: 'حذف نهائي؟' });
    await user.click(within(dialog).getByRole('button', { name: 'حذف' }));
    expect(api.deletePost).toHaveBeenCalledWith('p1');
    await vi.waitFor(() => expect(announced()).toBe('حُذف «مسودة قديمة»'));
  });

  it('المكتبة: «إضافة مصدر» و«تعديل» إلى المحرّر (النوع والملف والغلاف فيه)، ولغة كل صف', async () => {
    api.listResourcesForAdmin.mockResolvedValue(page([{ id: 'r1', title: 'Dialogue guide', translations: { title: { en: 'Dialogue guide' } }, type: 'GUIDE', publishedAt: null, locale: 'en' }]));
    renderPage(<AdminLibrary />);

    // العنوان نفسه رابط التحرير، والصف كله يفتحه (docs/ADMIN-UX.md)
    const row = (await screen.findByRole('link', { name: 'Dialogue guide' })).closest('tr');
    expect(within(row).getByRole('link', { name: 'Dialogue guide' }).getAttribute('href')).toBe('/admin/editor/resource/r1');
    expect(row.className).toContain('wp-row');
    expect(within(row).getByText('EN')).toBeTruthy();
    expect(screen.getByRole('link', { name: /إضافة مصدر/ }).getAttribute('href')).toBe('/admin/editor/resource/new');
  });

  it('المكتبة من بطاقة «بلا نسخة إنجليزية»: القائمة مرشَّحة، والشريحة تزيل المرشّح', async () => {
    api.listResourcesForAdmin.mockResolvedValue(page([]));
    renderPage(<AdminLibrary />, 'ar', '/admin/library?status=published&missing=en&type=VIDEO');
    await screen.findByText('لا توجد نتائج');
    expect(api.listResourcesForAdmin).toHaveBeenLastCalledWith({ status: 'published', page: 1, type: 'VIDEO', missing: 'en' });
    expect(screen.getByRole('button', { name: 'منشور' }).getAttribute('aria-pressed')).toBe('true');

    await userEvent.setup().click(screen.getByRole('button', { name: 'إزالة المرشّح: بلا نسخة إنجليزية' }));
    expect(api.listResourcesForAdmin).toHaveBeenLastCalledWith({ status: 'published', page: 1, type: 'VIDEO' });
  });
});

describe('الاستطلاعات', () => {
  it('لا استطلاعات: حالة فارغة بدل صفحة خالية', async () => {
    api.listAdminSurveys.mockResolvedValue({ data: [] });
    renderPage(<AdminSurveys />);
    expect(await screen.findByText('لا استطلاعات بعد.')).toBeTruthy();
  });

  it('الإغلاق بعد التأكيد، ثم إعلان النتيجة', async () => {
    const user = userEvent.setup();
    api.listAdminSurveys.mockResolvedValue({ data: [{ id: 's1', title: 'رضا الأعضاء', status: 'ACTIVE', type: 'QUARTERLY', questionsCount: 2, responsesCount: 5 }] });
    api.closeSurvey.mockResolvedValue({});
    renderPage(<AdminSurveys />);

    await user.click(await screen.findByRole('button', { name: /إغلاق/ }));
    const dialog = screen.getByRole('dialog', { name: 'إغلاق الاستطلاع؟' });
    expect(api.closeSurvey).not.toHaveBeenCalled();
    await user.click(within(dialog).getAllByRole('button').at(-1));
    expect(api.closeSurvey).toHaveBeenCalledWith('s1');
    await vi.waitFor(() => expect(announced()).toBe('أُغلق «رضا الأعضاء»'));
  });
});

// صف في الطابور المجمَّع (المرحلة 2)
const qrow = (id, type, preview) => ({ key: `${type}:${id}`, type, id, preview, reasons: ['مسيء'], reportsCount: 1, reportersCount: 1, lastAt: '2026-10-19T10:00:00Z', author: null, place: null });

describe('البلاغات', () => {
  it('إخفاء المحتوى بنافذة القرار، والتصفية بـ aria-pressed، والنتيجة تُعلن', async () => {
    theme.current = 'azraq'; // الطابور المجمَّع للوحة الجديدة وحدها
    const user = userEvent.setup();
    api.listReportQueue.mockResolvedValue(page([qrow('c1', 'comment', 'تعليق مسيء')]));
    api.resolveReportGroup.mockResolvedValue({});
    renderPage(<AdminReports />);

    expect((await screen.findByRole('tab', { name: /بانتظار/ })).getAttribute('aria-selected')).toBe('true');
    await user.click(await screen.findByRole('button', { name: /^إخفاء$/ }));
    const dialog = screen.getByRole('dialog', { name: 'إخفاء المحتوى؟' });
    expect(api.resolveReportGroup).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole('button', { name: 'إخفاء وإغلاق البلاغ' }));
    expect(api.resolveReportGroup).toHaveBeenCalledWith('comment', 'c1', 'hide', expect.objectContaining({ notifyReporter: true }));
    await vi.waitFor(() => expect(announced()).toContain('أُخفي المحتوى وأُغلق البلاغ')); // ومعه «تراجع»
  });
});

describe('البلاغات: المشرف', () => {
  it('بلاغ على مشروع: لا إخفاء (مساحة العمل لا تُخفى من بلاغ)، والتجاهل متاح', async () => {
    theme.current = 'azraq'; // الطابور المجمَّع للوحة الجديدة وحدها
    auth.user = { id: 'm1', name: 'مشرف', role: 'MODERATOR' };
    api.listReportQueue.mockResolvedValue(page([qrow('p2', 'project', 'مشروع منسوخ')]));
    renderPage(<AdminReports />);
    await screen.findByText('مشروع منسوخ');
    expect(screen.queryByRole('button', { name: /^إخفاء$/ })).toBeNull();
    expect(screen.getByRole('button', { name: /^تجاهل$/ })).toBeTruthy();
  });
});

describe('الوارد: التبويبات بلوحة المفاتيح', () => {
  it('السهم ينقل للتبويب التالي ويغيّر اللوحة', async () => {
    const user = userEvent.setup();
    api.listContactMessages.mockResolvedValue(page([]));
    api.listNewsletterSubscribers.mockResolvedValue({ ...page([{ id: 'n1', email: 'reader@x.dev', subscribedAt: '2026-10-02T00:00:00Z' }]) });
    renderPage(<AdminInbox />);

    const messages = screen.getByRole('tab', { name: 'رسائل التواصل' });
    expect(messages.getAttribute('aria-controls')).toBe('inbox-panel');
    messages.focus();
    await user.keyboard('{ArrowLeft}'); // RTL: اليسار هو التالي
    expect(screen.getByRole('tab', { name: 'مشتركو النشرة' }).getAttribute('aria-selected')).toBe('true');
    expect(await screen.findByText('reader@x.dev')).toBeTruthy();
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe('inbox-tab-subscribers');
  });
});

describe('الإعلان والعنوان والرسوم', () => {
  it('السمة الجديدة: الإعلان ظاهر بزر إغلاق؛ الحالية: مخفي بصريًا ويُقرأ', async () => {
    const user = userEvent.setup();
    theme.current = 'azraq';
    api.listReportQueue.mockResolvedValue(page([qrow('c1', 'comment', 'تعليق')]));
    api.resolveReportGroup.mockResolvedValue({});
    const { container } = renderPage(<AdminReports />);
    await user.click(await screen.findByRole('button', { name: /تجاهل/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'رفض البلاغ' }));
    const toast = await vi.waitFor(() => {
      const el = container.querySelector('.azq-toast');
      expect(el).not.toBeNull();
      return el;
    });
    expect(toast.textContent).toContain('تُجوهل البلاغ');
    await user.click(within(toast).getByRole('button', { name: 'إغلاق' }));
    expect(container.querySelector('.azq-toast')).toBeNull();
  });

  it('عنوان التبويب: «الصفحة — المنصة» بلغة الواجهة', async () => {
    const { default: TopBar } = await import('../../components/Layout/TopBar');
    renderPage(<TopBar title="إدارة المستخدمين" />);
    await vi.waitFor(() => expect(document.title).toBe('إدارة المستخدمين — وي بال'));
  });

  it('بديل الرسم: جدول بعنوان ورؤوس صفوف وأعمدة', () => {
    const { container } = render(
      <ChartTable caption="بيانات الرسم: النشاط" columns={[{ key: 'month', label: 'الشهر' }, { key: 'n', label: 'أنشطة' }]} rows={[{ month: '2026-10', n: 4 }]} />,
    );
    expect(container.querySelector('caption').textContent).toBe('بيانات الرسم: النشاط');
    expect(container.querySelector('tbody th[scope="row"]').textContent).toBe('2026-10');
    expect(container.querySelector('tbody td').textContent).toBe('4');
  });
});
