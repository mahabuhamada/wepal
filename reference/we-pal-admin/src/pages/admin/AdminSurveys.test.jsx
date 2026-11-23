import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

vi.mock('../../config', () => ({ USE_API: true }));
vi.mock('../../components/Layout/TopBar', () => ({ default: () => null }));
const theme = vi.hoisted(() => ({ current: 'classic' }));
vi.mock('../../theme/ThemeContext', () => ({ useTheme: () => ({ theme: theme.current }) }));
vi.mock('../../api/platform', () => ({ getSurvey: vi.fn() }));
vi.mock('../../api/admin', () => ({
  createSurvey: vi.fn(), publishSurvey: vi.fn(), closeSurvey: vi.fn(), deleteSurvey: vi.fn(),
  listAdminSurveys: vi.fn(), getSurveysSummary: vi.fn(),
}));
const platform = await import('../../api/platform');
const admin = await import('../../api/admin');
const { default: AdminSurveys } = await import('./AdminSurveys');

const renderPage = (url = '/admin/surveys') => render(<MemoryRouter initialEntries={[url]}><LanguageProvider initialLang="ar"><AdminSurveys /></LanguageProvider></MemoryRouter>);

const WORKSPACE = {
  id: 'w1', title: 'كيف تتابع الأخبار؟', status: 'ACTIVE', type: 'WORKSPACE', audience: 'members', questionsCount: 2, responsesCount: 7,
  creator: { id: 'u9', name: 'قائد الفريق' },
  placement: { kind: 'workspace', project: { id: 'p1', title: 'أثر المساحات' }, group: { id: 'g1', name: 'مسار البحث' } },
  publishedAt: '2026-11-10T09:00:00Z', awaitingReview: false,
};
const PENDING = {
  id: 'v1', title: 'رأي الزوار', status: 'DRAFT', type: 'VOTE', audience: 'public', questionsCount: 1, responsesCount: 0,
  creator: { id: 'a1', name: 'ليلى' }, placement: { kind: 'public', project: null, group: null }, publishedAt: null, awaitingReview: true,
};

describe('AdminSurveys — الاستطلاع العام (B7.3)', () => {
  beforeEach(() => {
    admin.listAdminSurveys.mockReset();
    admin.createSurvey.mockReset();
  });
  afterEach(cleanup);

  it('يميّز الاستطلاعات العامة في القائمة', async () => {
    admin.listAdminSurveys.mockResolvedValue({ data: [{ id: 's1', title: 'رأي الزوار', status: 'ACTIVE', type: 'QUARTERLY', audience: 'public', questionsCount: 1, responsesCount: 3 }] });
    renderPage();
    expect(await screen.findByText('عام للزوار')).toBeTruthy();
  });

  // قرار أمجد (16 نوفمبر 2026): الاستطلاع العام بأسئلة متعددة وبكل الأنواع (سيناريو هـ-4 لهلا)
  it('الجمهور «زوار» يسمح بكل أنواع الأسئلة وبإضافة أسئلة ويرسل audience و showResults', async () => {
    const user = userEvent.setup();
    admin.listAdminSurveys.mockResolvedValue({ data: [] });
    admin.createSurvey.mockResolvedValue({ id: 's2' });
    renderPage();
    await user.click(await screen.findByRole('button', { name: /إنشاء استبيان|إنشاء استطلاع/ }));

    await user.selectOptions(screen.getByLabelText('الجمهور'), 'public');
    const select = screen.getByLabelText('نوع السؤال');
    expect(select.disabled).toBe(false);
    expect(select.querySelectorAll('option')).toHaveLength(4);
    await user.selectOptions(select, 'MULTI_CHOICE');
    await user.click(screen.getByRole('button', { name: /إضافة سؤال/ }));
    await user.selectOptions(screen.getAllByLabelText('نوع السؤال')[1], 'SCALE');
    await user.click(screen.getByLabelText('إظهار النتائج للزوار بعد التصويت'));

    const options = screen.getByPlaceholderText('الخيارات (مفصولة بفاصلة)');
    const [titleAr] = screen.getAllByRole('textbox');
    await user.type(titleAr, 'رأي الزوار');
    const boxes = options.closest('.space-y-3').querySelectorAll(':scope > .rounded-2xl');
    await user.type(boxes[0].querySelector('input, textarea'), 'ما رأيك؟');
    await user.type(options, 'نعم, لا');
    await user.type(boxes[1].querySelector('input, textarea'), 'قيّم التجربة');
    await user.click(screen.getByRole('button', { name: 'حفظ' }));

    expect(admin.createSurvey).toHaveBeenCalledWith(expect.objectContaining({ audience: 'public', showResults: false }));
    const payload = admin.createSurvey.mock.calls[0][0];
    expect(payload.questions).toHaveLength(2);
    expect(payload.questions[0]).toMatchObject({ qtype: 'MULTI_CHOICE', options: ['نعم', 'لا'] });
    expect(payload.questions[1]).toMatchObject({ qtype: 'SCALE' });
  });
});

describe('AdminSurveys — من أنشأه وأين ومتى (ملاحظة هلا)', () => {
  beforeEach(() => {
    theme.current = 'classic';
    admin.listAdminSurveys.mockReset();
    admin.publishSurvey.mockReset();
    admin.getSurveysSummary.mockReset();
    platform.getSurvey.mockReset();
  });
  afterEach(cleanup);

  it('يعرض المنشئ رابطًا لملفه، والمساحة والمجموعة، وتاريخ النشر وعدد الردود', async () => {
    admin.listAdminSurveys.mockResolvedValue({ data: [WORKSPACE, PENDING] });
    renderPage();

    const creator = await screen.findByRole('link', { name: 'قائد الفريق' });
    expect(creator.getAttribute('href')).toBe('/admin/users/u9');
    expect(screen.getByRole('link', { name: 'أثر المساحات' }).getAttribute('href')).toBe('/projects/p1');
    expect(screen.getByRole('link', { name: 'مسار البحث' }).getAttribute('href')).toBe('/community/g1');
    expect(screen.getByText(/^نُشر في .*10.*11.*2026/)).toBeTruthy();
    expect(screen.getByText('7 ردود')).toBeTruthy();
    expect(screen.getByText('لم يُنشر بعد')).toBeTruthy();
    expect(screen.getAllByText('بانتظار المراجعة').length).toBeGreaterThan(1); // التبويب والشارة
  });

  it('المرشّحان من الرابط يصلان إلى الطلب، وتغييرهما يعيد التحميل', async () => {
    const user = userEvent.setup();
    admin.listAdminSurveys.mockResolvedValue({ data: [] });
    renderPage('/admin/surveys?status=REVIEW');

    expect(await screen.findByText('لا استطلاعات للزوار بانتظار المراجعة.')).toBeTruthy();
    expect(admin.listAdminSurveys).toHaveBeenLastCalledWith({ status: 'REVIEW', placement: 'all' });
    expect(screen.getByRole('tab', { name: 'بانتظار المراجعة' }).getAttribute('aria-selected')).toBe('true');

    await user.selectOptions(screen.getByLabelText('مكان النشر'), 'workspace');
    await vi.waitFor(() => expect(admin.listAdminSurveys).toHaveBeenLastCalledWith({ status: 'REVIEW', placement: 'workspace' }));
    await user.click(screen.getByRole('tab', { name: 'النشطة' }));
    await vi.waitFor(() => expect(admin.listAdminSurveys).toHaveBeenLastCalledWith({ status: 'ACTIVE', placement: 'workspace' }));
  });

  it('استطلاع الزوار لا يُنشر بنقرة: معاينة ما يراه الزائر ثم «انشر للعامة»', async () => {
    const user = userEvent.setup();
    admin.listAdminSurveys.mockResolvedValue({ data: [PENDING] });
    platform.getSurvey.mockResolvedValue({
      ...PENDING, description: 'استطلاع سريع', showResults: true, endsAt: null,
      questions: [{ id: 'q1', text: 'ما أكثر ما يهمك؟', qtype: 'SINGLE_CHOICE', options: ['التعليم', 'العمل'] }],
    });
    admin.publishSurvey.mockResolvedValue({});
    renderPage();

    expect(await screen.findByText('رأي الزوار')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^نشر$/ })).toBeNull();
    await user.click(screen.getByRole('button', { name: /مراجعة ونشر/ }));

    const dialog = await screen.findByRole('dialog', { name: 'مراجعة «رأي الزوار» قبل نشره' });
    const preview = await within(dialog).findByRole('article');
    expect(within(preview).getByRole('heading', { name: 'ما أكثر ما يهمك؟' })).toBeTruthy();
    expect(within(preview).getByText('رأي الزوار')).toBeTruthy();
    expect(within(preview).getByText('استطلاع سريع')).toBeTruthy();
    expect(within(preview).getAllByRole('radio').map((r) => r.matches(':disabled'))).toEqual([true, true]);
    expect(within(dialog).getByText('يرى الزائر النتائج بعد تصويته.')).toBeTruthy();
    expect(admin.publishSurvey).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole('button', { name: /انشر للعامة/ }));
    expect(admin.publishSurvey).toHaveBeenCalledWith('v1');
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(admin.listAdminSurveys).toHaveBeenCalledTimes(2);
  });

  it('معاينة استطلاع الزوار متعدد الأسئلة تعرض كل أسئلته كما يراها الزائر', async () => {
    const user = userEvent.setup();
    admin.listAdminSurveys.mockResolvedValue({ data: [PENDING] });
    platform.getSurvey.mockResolvedValue({
      ...PENDING, description: null, showResults: false, endsAt: null,
      questions: [
        { id: 'q1', text: 'ما يهمك؟', qtype: 'MULTI_CHOICE', options: ['التعليم', 'العمل'] },
        { id: 'q2', text: 'قيّم المنصة', qtype: 'SCALE', options: null },
        { id: 'q3', text: 'ملاحظاتك', qtype: 'TEXT', options: null },
      ],
    });
    renderPage();

    await user.click(await screen.findByRole('button', { name: /مراجعة ونشر/ }));
    const preview = await within(await screen.findByRole('dialog')).findByRole('article');
    // متعدد الأسئلة: العنوان عنوان الاستطلاع، ثم كل سؤال بحقله
    expect(within(preview).getByRole('heading', { name: 'رأي الزوار' })).toBeTruthy();
    for (const text of ['ما يهمك؟', 'قيّم المنصة', 'ملاحظاتك']) expect(within(preview).getByText(text)).toBeTruthy();
    expect(within(preview).getAllByRole('checkbox').map((c) => c.matches(':disabled'))).toEqual([true, true]);
    expect(within(preview).getByRole('textbox').matches(':disabled')).toBe(true);
    expect(within(preview).getByRole('button', { name: 'أرسل إجاباتك' }).matches(':disabled')).toBe(true);
    expect(screen.getByText('لا تظهر النتائج للزوار.')).toBeTruthy();
  });

  it('خطأ النشر يبقى في نافذة المراجعة', async () => {
    const user = userEvent.setup();
    admin.listAdminSurveys.mockResolvedValue({ data: [PENDING] });
    platform.getSurvey.mockResolvedValue({ ...PENDING, questions: [{ id: 'q1', text: 'سؤال', qtype: 'SINGLE_CHOICE', options: ['أ', 'ب'] }] });
    admin.publishSurvey.mockRejectedValue(new Error('لا يمكن نشر إلا المسودّات'));
    renderPage();

    await user.click(await screen.findByRole('button', { name: /مراجعة ونشر/ }));
    const dialog = await screen.findByRole('dialog');
    await user.click(await within(dialog).findByRole('button', { name: /انشر للعامة/ }));
    expect(await within(dialog).findByText('لا يمكن نشر إلا المسودّات')).toBeTruthy();
  });

  it('«نظرة عامة» في السمة الجديدة تتبع التبويب والمكان', async () => {
    theme.current = 'azraq';
    admin.listAdminSurveys.mockResolvedValue({ data: [WORKSPACE] });
    admin.getSurveysSummary.mockResolvedValue({
      tiles: [
        { key: 'surveys', value: 1, scope: 'filters', source: 'surveys', to: '/admin/surveys?placement=workspace' },
        { key: 'awaitingReview', value: 2, scope: 'now', source: 'surveys', to: '/admin/surveys?status=REVIEW' },
      ],
      charts: [{ key: 'byPlacement', kind: 'bars', items: [{ key: 'workspace', value: 1 }] }],
      empty: false,
    });
    renderPage('/admin/surveys?placement=workspace');

    expect(await screen.findByText('نظرة عامة')).toBeTruthy();
    expect(admin.getSurveysSummary).toHaveBeenCalledWith({ status: 'all', placement: 'workspace' });
    expect((await screen.findByRole('link', { name: /بانتظار المراجعة/ })).getAttribute('href')).toBe('/admin/surveys?status=REVIEW');
  });
});
