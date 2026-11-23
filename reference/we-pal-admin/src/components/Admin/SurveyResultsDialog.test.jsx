import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

// نتائج الاستطلاع في الإدارة (للقراءة فقط): نفس ردّ GET /surveys/{id}/results الذي تعرضه صفحة الأعضاء.
vi.mock('../../config', () => ({ USE_API: true, FEATURES: {} }));
vi.mock('../../theme/ThemeContext', () => ({ useTheme: () => ({ theme: 'classic' }) }));
vi.mock('../../components/Layout/TopBar', () => ({ default: () => null }));
vi.mock('../../api/platform', () => ({ getSurveyResults: vi.fn(), listSurveys: vi.fn() }));
vi.mock('../../api/admin', () => ({ createSurvey: vi.fn(), publishSurvey: vi.fn(), closeSurvey: vi.fn(), deleteSurvey: vi.fn(), listAdminSurveys: vi.fn(), getSurveysSummary: vi.fn() }));
const platform = await import('../../api/platform');
const admin = await import('../../api/admin');
const { default: SurveyResultsDialog } = await import('./SurveyResultsDialog');
const { default: AdminSurveys } = await import('../../pages/admin/AdminSurveys');

const RESULTS = {
  surveyId: 's1',
  title: 'رضا الأعضاء',
  totalResponses: 10,
  questions: [
    { questionId: 'q1', text: 'ما أولويتك؟', qtype: 'SINGLE_CHOICE', counts: { تعليم: 6, عمل: 4 } },
    { questionId: 'q2', text: 'ما الذي يهمك؟', qtype: 'MULTI_CHOICE', counts: { حوار: 7, بحث: 5 } },
    { questionId: 'q3', text: 'قيّم التجربة', qtype: 'SCALE', average: 3.84, count: 10, distribution: { 1: 0, 2: 1, 3: 2, 4: 5, 5: 2 } },
    { questionId: 'q4', text: 'ملاحظات', qtype: 'TEXT', answers: ['أكثر ورش', 'More English content'], answersCount: 60, answersHidden: false },
  ],
};

const renderDialog = (onClose = () => {}) => render(
  <LanguageProvider initialLang="ar">
    <SurveyResultsDialog survey={{ id: 's1', title: 'رضا الأعضاء' }} onClose={onClose} />
  </LanguageProvider>,
);

beforeEach(() => {
  platform.getSurveyResults.mockReset();
  platform.listSurveys.mockReset();
});
afterEach(cleanup);

describe('SurveyResultsDialog', () => {
  it('كل سؤال بعنوانه، والقيم نصًا: العدد والنسبة من المستجيبين، المتوسط والتوزيع، والنصوص', async () => {
    platform.getSurveyResults.mockResolvedValue(RESULTS);
    renderDialog();
    const dialog = screen.getByRole('dialog', { name: 'نتائج: رضا الأعضاء' });
    expect(within(dialog).getByRole('status').getAttribute('aria-busy')).toBe('true');

    expect(await within(dialog).findByText('عدد الردود: 10')).toBeTruthy();
    expect(platform.getSurveyResults).toHaveBeenCalledWith('s1');
    // سؤال لكل قسم باسمه
    expect(within(dialog).getByRole('region', { name: 'ما أولويتك؟' })).toBeTruthy();
    const single = within(dialog).getByRole('region', { name: 'ما أولويتك؟' });
    expect(within(single).getByText('6 (60%)')).toBeTruthy();
    expect(within(single).getByText('4 (40%)')).toBeTruthy();
    // المتعدد: النسبة من المستجيبين مع ملاحظة
    const multi = within(dialog).getByRole('region', { name: 'ما الذي يهمك؟' });
    expect(within(multi).getByText('7 (70%)')).toBeTruthy();
    expect(within(multi).getByText(/قد يختار المستجيب أكثر من خيار/)).toBeTruthy();
    // المقياس
    const scale = within(dialog).getByRole('region', { name: 'قيّم التجربة' });
    expect(within(scale).getByText('المتوسط 3.8 من 5')).toBeTruthy();
    expect(within(scale).getByText('5 (50%)')).toBeTruthy();
    // النص: الإجابات كما هي، وتنبيه أنها عيّنة من الأحدث
    const text = within(dialog).getByRole('region', { name: 'ملاحظات' });
    expect(within(text).getByText('More English content').getAttribute('dir')).toBe('auto');
    expect(within(text).getByText('تُعرض أحدث 2 من أصل 60 إجابة.')).toBeTruthy();
  });

  it('لا ردود: حالة فارغة بدل أسئلة بأصفار', async () => {
    platform.getSurveyResults.mockResolvedValue({ ...RESULTS, totalResponses: 0 });
    renderDialog();
    expect(await screen.findByText('لا ردود بعد.')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'ما أولويتك؟' })).toBeNull();
  });

  it('خطأ التحميل مع إعادة المحاولة', async () => {
    const user = userEvent.setup();
    platform.getSurveyResults.mockRejectedValueOnce(new Error('تعذّر التحميل')).mockResolvedValueOnce(RESULTS);
    renderDialog();
    expect(await screen.findByText('تعذّر التحميل')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));
    expect(await screen.findByText('عدد الردود: 10')).toBeTruthy();
    expect(platform.getSurveyResults).toHaveBeenCalledTimes(2);
  });
});

describe('الاستطلاعات في الإدارة: «عرض النتائج»', () => {
  it('للمنشور والمغلق ولعنصر العرض، لا للمسودة؛ ويفتح النافذة', async () => {
    const user = userEvent.setup();
    admin.listAdminSurveys.mockResolvedValue({ data: [
      { id: 's1', title: 'رضا الأعضاء', status: 'ACTIVE', type: 'QUARTERLY', questionsCount: 4, responsesCount: 10 },
      { id: 's2', title: 'استبيان مغلق', status: 'CLOSED', type: 'QUARTERLY', questionsCount: 2, responsesCount: 3, isDemo: true },
      { id: 's3', title: 'مسودة', status: 'DRAFT', type: 'QUARTERLY', questionsCount: 1, responsesCount: 0 },
    ] });
    platform.getSurveyResults.mockResolvedValue(RESULTS);
    render(<MemoryRouter><LanguageProvider initialLang="ar"><AdminSurveys /></LanguageProvider></MemoryRouter>);

    expect(await screen.findByRole('button', { name: 'عرض النتائج: رضا الأعضاء' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'عرض النتائج: استبيان مغلق' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'عرض النتائج: مسودة' })).toBeNull();
    // عنصر العرض بلا أزرار تعديل، والنتائج متاحة
    expect(screen.queryAllByRole('button', { name: /إغلاق/ }).length).toBe(1);

    await user.click(screen.getByRole('button', { name: 'عرض النتائج: رضا الأعضاء' }));
    expect(screen.getByRole('dialog', { name: 'نتائج: رضا الأعضاء' })).toBeTruthy();
    expect(await screen.findByText('عدد الردود: 10')).toBeTruthy();
  });
});
