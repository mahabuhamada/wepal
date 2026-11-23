import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

// الحزمة 3ب: لوحة النشر تعرض موافقة الفريق، وتطلب سبب تجاوز مكتوبًا حين تنقص.
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => ({ user: { id: 'a1', name: 'مدير', role: 'ADMIN' } }) }));
vi.mock('../../config', () => ({ USE_API: true, FEATURES: {} }));
vi.mock('../../hooks/useUnreadNotifications', () => ({ default: () => 0 }));
vi.mock('../../api/platform', () => ({ listNotifications: vi.fn(() => Promise.resolve({ data: [], meta: { unreadCount: 0 } })) }));
vi.mock('../../api/admin', () => ({ listPublishable: vi.fn(), publish: vi.fn() }));
const adminApi = await import('../../api/admin');
const { default: AdminPublish } = await import('./AdminPublish');

const project = (consent) => ({
  id: 'pr1', title: 'أثر المساحات الرقمية', track: 'RESEARCH', files: [{ id: 'f1', name: 'الورقة.pdf' }], consent,
});
const members = [
  { user: { id: 'u1', name: 'زيد' }, status: 'APPROVED', showName: true },
  { user: { id: 'u2', name: 'سارة' }, status: 'DECLINED', note: 'تكشف منطقة مشارك' },
];

const renderPage = () => render(
  <MemoryRouter><LanguageProvider initialLang="ar"><AdminPublish /></LanguageProvider></MemoryRouter>,
);

describe('AdminPublish — موافقة الفريق', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(cleanup);

  it('موافقة ناقصة: الحالة والملاحظة، والنشر يحتاج سببًا من 10 أحرف يُرسل مع الطلب', async () => {
    adminApi.listPublishable.mockResolvedValue({ data: [project({ requested: true, complete: false, approved: 1, total: 2, members })] });
    adminApi.publish.mockResolvedValue({ id: 'r1' });
    renderPage();

    expect(await screen.findByText('وافق 1 من 2')).toBeTruthy();
    expect(screen.getByText('«تكشف منطقة مشارك»')).toBeTruthy();
    expect(screen.getByText('باسمه')).toBeTruthy();

    // المراحل ظاهرة: الحالية «موافقات الفريق (1 من 2)»
    expect(screen.getByText('موافقات الفريق (1 من 2)').getAttribute('aria-current')).toBe('step');

    fireEvent.click(screen.getAllByRole('button', { name: /نشر/ })[0]);
    // «نشر باسم الفريق» معطّل حتى تكتمل الموافقات، والتجاوز من نافذة بسبب مكتوب
    expect(screen.getByRole('button', { name: 'نشر باسم الفريق' }).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'نشر رغم نقص الموافقة…' }));
    const reason = screen.getByLabelText('سبب النشر دون اكتمال موافقة الفريق');
    const submit = screen.getByRole('button', { name: 'نشر رغم نقص الموافقة', hidden: true });
    expect(submit.disabled).toBe(true);

    fireEvent.change(reason, { target: { value: 'الفريق أكّد موافقته كتابيًا للإدارة' } });
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);

    await waitFor(() => expect(adminApi.publish).toHaveBeenCalledWith(expect.objectContaining({
      projectId: 'pr1', overrideReason: 'الفريق أكّد موافقته كتابيًا للإدارة',
    })));
  });

  it('موافقة مكتملة: لا حقل تجاوز ولا يُرسل السبب', async () => {
    adminApi.listPublishable.mockResolvedValue({ data: [project({ requested: true, complete: true, approved: 2, total: 2, members: [] })] });
    adminApi.publish.mockResolvedValue({ id: 'r1' });
    renderPage();

    expect(await screen.findByText('موافقة الفريق مكتملة')).toBeTruthy();
    fireEvent.click(screen.getAllByRole('button', { name: /نشر/ })[0]);
    expect(screen.queryByLabelText('سبب النشر دون اكتمال موافقة الفريق')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'نشر باسم الفريق' }));

    await waitFor(() => expect(adminApi.publish).toHaveBeenCalled());
    expect(adminApi.publish.mock.calls[0][0]).not.toHaveProperty('overrideReason');
  });

  it('«بانتظار» و«منشور»: ما نُشر منه ملف في المكتبة ينتقل إلى «منشور» بمراحل مكتملة', async () => {
    const done = { ...project({ requested: true, complete: true, approved: 2, total: 2, members: [] }), id: 'pr2', title: 'مساحة منشورة', files: [{ id: 'f2', name: 'تقرير.pdf', publishedResourceId: 'r9' }] };
    adminApi.listPublishable.mockResolvedValue({ data: [project({ requested: true, complete: true, approved: 2, total: 2, members: [] }), done] });
    renderPage();

    expect(await screen.findByRole('tab', { name: 'بانتظار (1)' })).toBeTruthy();
    expect(screen.queryByText('مساحة منشورة')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'منشور (1)' }));
    expect(screen.getByText('مساحة منشورة')).toBeTruthy();
    expect(screen.getByText('منشور').closest('li').className).toContain('is-done');
  });
});

// ملاحظة هلا (ج-10): بعد النشر يبقى المشروع في القائمة كأنه ينتظر النشر.
describe('AdminPublish — المنشور ينتقل من الانتظار', () => {
  beforeEach(() => { vi.clearAllMocks(); });
  afterEach(cleanup);

  it('مخرج منشور (ولو برابط خارجي بلا ملف) ينقل المساحة إلى «منشور» مع رابطه و«نشر مخرج آخر»', async () => {
    adminApi.listPublishable.mockResolvedValue({ data: [
      { ...project({ requested: true, complete: true, approved: 2, total: 2, members: [], published: [{ id: 'r9', title: 'تقرير منشور', publishedAt: '2026-11-09T10:00:00Z' }] }), id: 'pr2', title: 'مساحة منشورة' },
      project({ requested: true, complete: true, approved: 2, total: 2, members: [], published: [] }),
    ] });
    renderPage();

    expect(await screen.findByRole('tab', { name: 'بانتظار (1)' })).toBeTruthy();
    expect(screen.getByText('أثر المساحات الرقمية')).toBeTruthy();
    expect(screen.queryByText('مساحة منشورة')).toBeNull();
    fireEvent.click(screen.getByRole('tab', { name: 'منشور (1)' }));
    expect(screen.getByText('مساحة منشورة')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'تقرير منشور' }).getAttribute('href')).toBe('/library/r9');
    expect(screen.getByRole('button', { name: /نشر مخرج آخر/ })).toBeTruthy();
  });
});
