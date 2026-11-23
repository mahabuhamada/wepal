import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

vi.mock('../../config', () => ({ USE_API: true }));
vi.mock('../../components/Layout/TopBar', () => ({ default: () => null }));
vi.mock('../../theme/ThemeContext', () => ({ useTheme: () => ({ theme: 'azraq' }) }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', role: 'ADMIN' } }) }));
vi.mock('../../api/admin', () => ({
  listReportQueue: vi.fn(),
  getReportsSummary: vi.fn(),
  getReportGroup: vi.fn(),
  resolveReportGroup: vi.fn(),
  bulkResolveReports: vi.fn(),
  restoreHiddenContent: vi.fn(),
}));
vi.mock('../../api/client', async (orig) => ({ ...(await orig()), downloadBlob: vi.fn() }));
const api = await import('../../api/admin');
const client = await import('../../api/client');
const { default: AdminReports } = await import('./AdminReports');

// الطابور المجمَّع (خطة لوحة الإدارة 4.5): صف لكل محتوى، والقرار يشمل كل بلاغاته.
const row = (id, preview, extra = {}) => ({
  key: `comment:${id}`, type: 'comment', id, preview, deleted: false, contentHidden: false,
  author: { name: 'سامي' }, authorId: 'u1', place: { kind: 'workspace', id: 'p1', name: 'مساحة المياه' },
  reportsCount: 2, reportersCount: 2, reasons: ['مزعج'], firstAt: '2026-11-10T10:00:00Z', lastAt: '2026-11-12T10:00:00Z', ...extra,
});
const page = (data, p, lastPage) => ({ data, meta: { page: p, perPage: 1, total: 2, lastPage, counts: { PENDING: 2, RESOLVED: 5, DISMISSED: 1, all: 8 } } });
const summary = {
  tiles: [
    { key: 'contentItems', value: 2, scope: 'tab', source: 'reports', to: '/admin/reports' },
    { key: 'openReports', value: 4, scope: 'now', source: 'reports.status', to: '/admin/reports' },
    { key: 'medianAgeHours', value: 12.5, scope: 'tab', source: 'reports.created_at', to: '/admin/reports' },
    { key: 'multiReporter', value: 1, scope: 'tab', source: 'reports.reporter_id', to: '/admin/reports?multi=1' },
  ],
  charts: [{ key: 'byReason', kind: 'bars', items: [{ label: 'مزعج', value: 3 }] }, { key: 'byPlace', kind: 'bars', items: [{ key: 'workspaces', value: 2 }] }],
  empty: false,
};
const renderPage = (url = '/admin/reports') => render(<MemoryRouter initialEntries={[url]}><LanguageProvider initialLang="ar"><AdminReports /></LanguageProvider></MemoryRouter>);

describe('AdminReports — الطابور المجمَّع', () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset?.());
    api.getReportsSummary.mockResolvedValue(summary);
  });
  afterEach(cleanup);

  it('يعرض صفًّا لكل محتوى بعدّاده، وتبويبات بعدّاداتها، و«نظرة عامة» بالأرقام', async () => {
    const user = userEvent.setup();
    api.listReportQueue
      .mockResolvedValueOnce(page([row('c1', 'تعليق أول')], 1, 2))
      .mockResolvedValueOnce(page([row('c2', 'تعليق ثانٍ')], 2, 2));
    renderPage();

    expect(await screen.findByText('تعليق أول')).toBeTruthy();
    expect(screen.getByText('2 بلاغ من 2')).toBeTruthy();
    expect(screen.getByRole('tab', { name: /بانتظار/ }).textContent).toContain('2');
    expect(api.listReportQueue).toHaveBeenCalledWith({ status: 'PENDING', type: '', multi: false, page: 1 });
    expect(await screen.findByText('12.5 ساعة')).toBeTruthy();
    expect(screen.getByRole('link', { name: /بأكثر من مبلِّغ/ }).getAttribute('href')).toBe('/admin/reports?multi=1');

    await user.click(screen.getByRole('button', { name: 'عرض المزيد' }));
    expect(await screen.findByText('تعليق ثانٍ')).toBeTruthy();
  });

  it('المرشّحات في الرابط تصل إلى القائمة والأرقام معًا', async () => {
    api.listReportQueue.mockResolvedValue(page([], 1, 1));
    renderPage('/admin/reports?status=RESOLVED&type=group_post&multi=1');
    await screen.findByText(/لا شيء في هذا النطاق/);
    expect(api.listReportQueue).toHaveBeenCalledWith({ status: 'RESOLVED', type: 'group_post', multi: true, page: 1 });
    expect(api.getReportsSummary).toHaveBeenCalledWith({ status: 'RESOLVED', type: 'group_post', multi: true });
  });

  it('الرفض يحكم في كل بلاغات المحتوى ثم يعيد التحميل', async () => {
    const user = userEvent.setup();
    api.listReportQueue.mockResolvedValueOnce(page([row('c1', 'تعليق أول')], 1, 1)).mockResolvedValueOnce(page([], 1, 1));
    api.resolveReportGroup.mockResolvedValue({});
    renderPage();

    await user.click(await screen.findByRole('button', { name: /تجاهل/ }));
    const dialog = screen.getByRole('dialog', { name: 'رفض البلاغ؟' });
    await user.click(within(dialog).getByRole('button', { name: 'رفض البلاغ' }));
    expect(api.resolveReportGroup).toHaveBeenCalledWith('comment', 'c1', 'dismiss', { memberMessage: '', notifyReporter: true });
    expect(api.listReportQueue).toHaveBeenCalledTimes(2);
  });

  it('الإخفاء برسالة مقترحة قابلة للتعديل، وإبلاغ المبلِّغ مفعّل افتراضيًّا', async () => {
    const user = userEvent.setup();
    api.listReportQueue.mockResolvedValue(page([row('c1', 'تعليق مسيء')], 1, 1));
    api.resolveReportGroup.mockResolvedValue({});
    renderPage();

    await user.click(await screen.findByRole('button', { name: /^إخفاء$/ }));
    const dialog = screen.getByRole('dialog', { name: 'إخفاء المحتوى؟' });
    const message = within(dialog).getByLabelText('رسالة للعضو صاحب المحتوى');
    await user.clear(message);
    await user.type(message, 'يسيء لعضو باسمه');
    expect(within(dialog).getByRole('checkbox').checked).toBe(true);
    await user.click(within(dialog).getByRole('checkbox'));
    await user.click(within(dialog).getByRole('button', { name: 'إخفاء وإغلاق البلاغ' }));
    expect(api.resolveReportGroup).toHaveBeenCalledWith('comment', 'c1', 'hide', { memberMessage: 'يسيء لعضو باسمه', notifyReporter: false });
  });

  it('الإجراء الجماعي: تحديد صفّين ثم رفضهما معًا', async () => {
    const user = userEvent.setup();
    api.listReportQueue.mockResolvedValue(page([row('c1', 'أول'), row('c2', 'ثانٍ')], 1, 1));
    api.bulkResolveReports.mockResolvedValue({ done: [{ type: 'comment', id: 'c1' }, { type: 'comment', id: 'c2' }], skipped: [] });
    renderPage();

    await user.click(await screen.findByRole('checkbox', { name: 'تحديد الظاهر' }));
    const bar = screen.getByRole('region', { name: 'الإجراء الجماعي' });
    expect(bar.textContent).toContain('2 محدّدة');
    await user.click(within(bar).getByRole('button', { name: /تجاهل/ }));
    expect(api.bulkResolveReports).toHaveBeenCalledWith('dismiss', [{ type: 'comment', id: 'c1' }, { type: 'comment', id: 'c2' }], { notifyReporter: true });
  });

  it('الدرج يعرض المحتوى في سياقه وسوابق الكاتب، ومنه التحذير', async () => {
    const user = userEvent.setup();
    api.listReportQueue.mockResolvedValue(page([row('c1', 'تعليق أول')], 1, 1));
    api.getReportGroup.mockResolvedValue({
      type: 'comment', id: 'c1', content: { title: null, body: 'النص الكامل للتعليق', createdAt: '2026-11-09T10:00:00Z' },
      author: { name: 'سامي' }, authorId: 'u1', place: { kind: 'workspace', id: 'p1', name: 'مساحة المياه' }, contentHidden: false, hideable: true,
      reports: [{ id: 'r1', reason: 'مزعج', status: 'PENDING', reporter: { name: 'ليلى' }, createdAt: '2026-11-12T10:00:00Z' }],
      authorHistory: { total: 3, upheld: 1, recent: [] },
    });
    api.resolveReportGroup.mockRejectedValueOnce(new Error('عولج البلاغ مسبقًا'));
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'تعليق أول' }));
    const drawer = await screen.findByRole('dialog', { name: 'تفاصيل البلاغ' });
    expect(await within(drawer).findByText('النص الكامل للتعليق')).toBeTruthy();
    expect(within(drawer).getByText(/3 بلاغ على محتوى آخر له/)).toBeTruthy();
    expect(within(drawer).getByRole('link', { name: 'مساحة المياه' }).getAttribute('href')).toBe('/projects/p1');

    await user.click(within(drawer).getByRole('button', { name: /تحذير/ }));
    const dialog = screen.getByRole('dialog', { name: 'تحذير الكاتب؟' });
    await user.click(within(dialog).getByRole('button', { name: 'تحذير وإغلاق البلاغ' }));
    expect((await within(dialog).findByRole('alert')).textContent).toMatch('عولج البلاغ مسبقًا');
  });

  it('مساحة العمل لا تُخفى من بلاغ، وفشل التحميل يعرض إعادة المحاولة', async () => {
    api.listReportQueue.mockResolvedValueOnce(page([row('p1', 'مشروع', { type: 'project', key: 'project:p1' })], 1, 1));
    renderPage();
    expect(await screen.findByText('مشروع')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^إخفاء$/ })).toBeNull();
    cleanup();

    api.listReportQueue.mockRejectedValueOnce(new Error('تعذّر التحميل'));
    renderPage();
    expect((await screen.findByRole('alert')).textContent).toMatch('تعذّر التحميل');
  });

  it('بلاغ رسالة شات: السياق واللقطة والمكان والمرفق وإيقاف المراسلة', async () => {
    const user = userEvent.setup();
    api.listReportQueue.mockResolvedValue(page([row('m1', 'رسالة مبلَّغ عنها', { type: 'chat_message', key: 'chat_message:m1' })], 1, 1));
    api.getReportGroup.mockResolvedValue({
      type: 'chat_message', id: 'm1', content: { body: 'رسالة مبلَّغ عنها', createdAt: '2026-11-09T10:00:00Z' },
      author: { name: 'سامي' }, authorId: 'u1', place: { kind: 'group', id: 'g1', name: 'مجموعة المياه', slug: 'water' }, contentHidden: false, hideable: true,
      reports: [{ id: 'r1', reason: 'مزعج', status: 'PENDING', reporter: { name: 'ليلى' }, createdAt: '2026-11-12T10:00:00Z' }],
      authorHistory: { total: 0, upheld: 0, recent: [] },
      context: [
        { id: 'a', author: { name: 'منى' }, body: 'رسالة سابقة', deleted: false, reported: false, createdAt: '2026-11-09T09:59:00Z', attachments: [] },
        { id: 'm1', author: { name: 'سامي' }, body: 'نص المخالفة', deleted: false, reported: true, createdAt: '2026-11-09T10:00:00Z', attachments: [{ id: 'att1', kind: 'file', name: 'ملف.pdf', path: 'x' }] },
        { id: 'c', author: null, body: null, deleted: true, reported: false, createdAt: '2026-11-09T10:01:00Z', attachments: [] },
      ],
    });
    api.resolveReportGroup.mockResolvedValue({});
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'رسالة مبلَّغ عنها' }));
    const drawer = await screen.findByRole('dialog', { name: 'تفاصيل البلاغ' });
    expect(await within(drawer).findByText('نص المخالفة')).toBeTruthy();
    expect(within(drawer).getByText('رسالة سابقة')).toBeTruthy();
    expect(within(drawer).getByText('المبلَّغ عنها', { exact: false })).toBeTruthy();
    expect(within(drawer).getByText('حذفها المرسِل', { exact: false })).toBeTruthy();
    expect(within(drawer).getByText('شات مجموعة المياه')).toBeTruthy();

    await user.click(within(drawer).getByRole('button', { name: /افتح المرفق: ملف\.pdf/ }));
    expect(client.downloadBlob).toHaveBeenCalledWith('/admin/reports/chat-attachments/att1', 'ملف.pdf');

    await user.click(within(drawer).getByRole('button', { name: /إخفاء وإيقاف المراسلة/ }));
    expect(api.resolveReportGroup).toHaveBeenCalledWith('chat_message', 'm1', 'suspend_messaging', undefined);
  });
});
