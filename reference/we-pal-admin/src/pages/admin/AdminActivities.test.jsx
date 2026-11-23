import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

vi.mock('../../config', () => ({ USE_API: true }));
vi.mock('../../components/Layout/TopBar', () => ({ default: () => null }));
vi.mock('../../api/platform', () => ({ listActivities: vi.fn(async () => []) }));
vi.mock('../../api/admin', () => ({ listAudit: vi.fn(), listCourseCompletions: vi.fn(), verifyCourseCompletion: vi.fn() }));
const api = await import('../../api/admin');
const { default: AdminActivities } = await import('./AdminActivities');

const page = (data, p, lastPage) => ({ data, meta: { page: p, perPage: 1, total: 2, lastPage } });
const completion = (id, userName) => ({ id, courseId: 'c1', userId: `u-${id}`, userName, courseTitle: 'كورس الحوار' });
const renderPage = () => render(<MemoryRouter><LanguageProvider initialLang="ar"><AdminActivities /></LanguageProvider></MemoryRouter>);

describe('AdminActivities — «عرض المزيد»', () => {
  beforeEach(() => {
    api.listAudit.mockReset();
    api.listCourseCompletions.mockReset();
    api.verifyCourseCompletion.mockReset();
  });
  afterEach(cleanup);

  it('تحققات الكورسات: صفحة تالية، والتوثيق يزيل الصف', async () => {
    const user = userEvent.setup();
    api.listAudit.mockResolvedValue(page([], 1, 1));
    api.listCourseCompletions
      .mockResolvedValueOnce(page([completion('k1', 'ليلى')], 1, 2))
      .mockResolvedValueOnce(page([completion('k2', 'أحمد')], 2, 2));
    api.verifyCourseCompletion.mockResolvedValue({});
    renderPage();

    expect(await screen.findByText('ليلى')).toBeTruthy();
    expect(api.listCourseCompletions).toHaveBeenCalledWith(0, 1);
    await user.click(screen.getByRole('button', { name: 'عرض المزيد' }));
    expect(await screen.findByText('أحمد')).toBeTruthy();
    expect(api.listCourseCompletions).toHaveBeenLastCalledWith(0, 2);

    await user.click(screen.getAllByRole('button', { name: /توثيق|تحقق/ })[0]);
    expect(api.verifyCourseCompletion).toHaveBeenCalledWith('c1', 'u-k1');
    await vi.waitFor(() => expect(screen.queryByText('ليلى')).toBeNull());
    expect(screen.getByText('أحمد')).toBeTruthy();
  });

  it('سجل التدقيق: صفحة تالية', async () => {
    const user = userEvent.setup();
    api.listCourseCompletions.mockResolvedValue(page([], 1, 1));
    api.listAudit
      .mockResolvedValueOnce(page([{ id: 'a1', action: 'user.update', admin: { name: 'مدير أول' }, createdAt: '2026-09-30T10:00:00Z' }], 1, 2))
      .mockResolvedValueOnce(page([{ id: 'a2', action: 'user.update', admin: { name: 'مدير ثانٍ' }, createdAt: '2026-09-29T10:00:00Z' }], 2, 2));
    renderPage();

    expect(await screen.findByText('مدير أول')).toBeTruthy();
    expect(api.listAudit).toHaveBeenCalledWith(30, 1);
    await user.click(screen.getByRole('button', { name: 'عرض المزيد' }));
    expect(await screen.findByText('مدير ثانٍ')).toBeTruthy();
    expect(api.listAudit).toHaveBeenLastCalledWith(30, 2);
  });

  it('سجل التدقيق (#129): ترجمة الإجراءات الجديدة، الاسم الخام لغير المعروف، وتفاصيل تجاوز المدير', async () => {
    api.listCourseCompletions.mockResolvedValue(page([], 1, 1));
    api.listAudit.mockResolvedValue(page([
      { id: 'a1', action: 'survey.publish', admin: { name: 'مدير' }, createdAt: '2026-10-01T10:00:00Z' },
      { id: 'a2', action: 'widget.archive', admin: { name: 'مدير' }, createdAt: '2026-10-01T09:00:00Z' },
      { id: 'a3', action: 'project.admin_override', admin: { name: 'مدير' }, createdAt: '2026-10-01T08:00:00Z', meta: { via: 'task.update', projectTitle: 'مبادرة الحي' } },
      { id: 'a4', action: 'project.admin_override', admin: { name: 'مدير' }, createdAt: '2026-10-01T07:00:00Z', meta: { via: 'link.reorder', projectTitle: 'مشروع ب' } },
    ], 1, 1));
    renderPage();

    expect(await screen.findByText(/— نشر استطلاع/)).toBeTruthy();
    expect(screen.getByText(/— widget\.archive/)).toBeTruthy();
    expect(screen.getAllByText(/— تصرّف في مشروع بصلاحية المدير/)).toHaveLength(2);
    expect(screen.getByText('المشروع: مبادرة الحي')).toBeTruthy();
    expect(screen.getByText('الإجراء: تعديل مهمة')).toBeTruthy();
    // via غير معروف: يُعرض خامًا.
    expect(screen.getByText('الإجراء: link.reorder')).toBeTruthy();
  });

  it('courseTitle ككائن ترجمات خام لا يُسقط الصفحة', async () => {
    api.listAudit.mockResolvedValue(page([], 1, 1));
    api.listCourseCompletions.mockResolvedValue(page([{ id: 'k1', courseId: 'c1', userId: 'u1', userName: 'محمد', courseTitle: { ar: 'كورس حل الدولتين' } }], 1, 1));
    renderPage();
    expect(await screen.findByText(/كورس حل الدولتين/)).toBeTruthy();
  });
});
