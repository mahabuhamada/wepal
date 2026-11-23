import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

vi.mock('../../config', () => ({ USE_API: true, FEATURES: {} }));
const theme = vi.hoisted(() => ({ current: 'classic' }));
vi.mock('../../theme/ThemeContext', () => ({ useTheme: () => ({ theme: theme.current }) }));
vi.mock('../../api/admin', () => ({ getSearchQueryReport: vi.fn(), getSearchQueriesSummary: vi.fn() }));
const adminApi = await import('../../api/admin');
const { default: AdminSearchQueries } = await import('./AdminSearchQueries');

const report = (data, summary = { total: 12, unanswered: 5, asks: 9, unansweredAsks: 3 }) => ({
  data,
  meta: { page: 1, perPage: 20, total: data.length, lastPage: 1 },
  month: '2026-10',
  summary,
  retentionDays: 90,
});

const row = (over = {}) => ({
  query: 'قانون الانتخابات',
  count: 4,
  askers: 3,
  status: 'unanswered',
  unansweredCount: 4,
  sources: ['ask', 'library'],
  areas: ['members', 'public'],
  faqId: null,
  firstSeenAt: '2026-10-02T09:00:00Z',
  lastSeenAt: '2026-10-18T09:00:00Z',
  ...over,
});

const renderPage = (url = '/admin/search-queries') => render(
  <MemoryRouter initialEntries={[url]}><LanguageProvider initialLang="ar"><AdminSearchQueries /></LanguageProvider></MemoryRouter>,
);

describe('أسئلة البحث', () => {
  beforeEach(() => {
    adminApi.getSearchQueryReport.mockReset();
    adminApi.getSearchQueriesSummary.mockReset();
    theme.current = 'classic';
  });
  afterEach(cleanup);

  it('يعرض لكل سؤال حالته وعدد مراته وأشخاصه ومن سأله (عضو أو زائر) ومصدره وتاريخيه، مع «أضفه للأسئلة الشائعة»', async () => {
    adminApi.getSearchQueryReport.mockResolvedValue(report([row()]));
    renderPage();

    expect(screen.getByRole('heading', { level: 2, name: 'أسئلة البحث' })).toBeTruthy();
    const list = await screen.findByRole('list', { name: 'أسئلة البحث' });
    const item = within(list).getAllByRole('listitem')[0];
    expect(within(item).getByText('قانون الانتخابات')).toBeTruthy();
    expect(within(item).getByText('بلا جواب')).toBeTruthy();
    expect(within(item).getByText('4 مرة')).toBeTruthy();
    expect(within(item).getByText('3 شخص')).toBeTruthy();
    expect(within(item).getByText('عضو')).toBeTruthy();
    expect(within(item).getByText('زائر')).toBeTruthy();
    expect(within(item).getByText('المساعد («اسأل»)')).toBeTruthy();
    expect(within(item).getByText(/^أول مرة: /)).toBeTruthy();
    expect(within(item).getByText(/^آخر مرة: /)).toBeTruthy();

    const add = within(item).getByRole('link', { name: 'قانون الانتخابات' }).getAttribute('href');
    const params = new URLSearchParams(add.split('?')[1]);
    expect(add.startsWith('/admin/editor/faq/new?')).toBe(true);
    expect(params.get('q')).toBe('قانون الانتخابات');
    expect(params.get('from')).toBe('search');
    expect(within(item).getByRole('link', { name: /ابحث عنه في المكتبة/ }).getAttribute('href'))
      .toBe(`/library?q=${encodeURIComponent('قانون الانتخابات')}`);

    // التصميم الحالي: ملخص الشهر بلا شريط «نظرة عامة»
    const summary = screen.getByLabelText('ملخص الشهر');
    expect(within(summary).getByText('9')).toBeTruthy();
    expect(adminApi.getSearchQueriesSummary).not.toHaveBeenCalled();
    expect(screen.getByText(/يُحذف بعد 90 يومًا/)).toBeTruthy();
  });

  it('السؤال المضاف للأسئلة الشائعة مُجاب ويفتح سؤاله، والسائلون غير المعروفين يُقال ذلك', async () => {
    adminApi.getSearchQueryReport.mockResolvedValue(report([row({ status: 'answered', faqId: 'f1', askers: null, sources: ['public_ask', 'chat'] })]));
    renderPage('/admin/search-queries?status=answered');

    const list = await screen.findByRole('list', { name: 'أسئلة البحث' });
    expect(within(list).getByText('مُجاب')).toBeTruthy();
    expect(within(list).getByText('في الأسئلة الشائعة')).toBeTruthy();
    expect(within(list).getByText('عدد السائلين غير معروف')).toBeTruthy();
    // «اسأل» في الموقع العام باسمه، ومصدر لا تعرفه الواجهة «غير معروف» لا مفتاح ترجمة
    expect(within(list).getByText('اسأل في الموقع العام')).toBeTruthy();
    expect(within(list).getByText('غير معروف')).toBeTruthy();
    expect(within(list).getByRole('link', { name: 'قانون الانتخابات' }).getAttribute('href')).toBe('/admin/editor/faq/f1');
    expect(within(list).queryByRole('link', { name: /أضفه للأسئلة الشائعة/ })).toBeNull();
    expect(adminApi.getSearchQueryReport.mock.calls.at(-1)[0]).toMatchObject({ status: 'answered', page: 1 });
    expect(screen.getByRole('tab', { name: 'مُجابة' }).getAttribute('aria-selected')).toBe('true');
  });

  it('التبويب والسائل والمصدر تعيد الطلب بالترشيح، والقائمة الفارغة تقول ذلك', async () => {
    const user = userEvent.setup();
    adminApi.getSearchQueryReport.mockResolvedValue(report([]));
    renderPage();

    expect(await screen.findByText('لا أسئلة بلا جواب في هذا الشهر.')).toBeTruthy();
    expect(adminApi.getSearchQueryReport.mock.calls.at(-1)[0]).toMatchObject({ status: 'unanswered', page: 1 });

    await user.click(screen.getByRole('tab', { name: 'الكل' }));
    expect(await screen.findByText('لا أسئلة مسجَّلة في هذا النطاق.')).toBeTruthy();
    await user.selectOptions(screen.getByLabelText('السائل'), 'members');
    await user.selectOptions(screen.getByLabelText('المصدر'), 'library');

    const last = adminApi.getSearchQueryReport.mock.calls.at(-1)[0];
    expect(last).toMatchObject({ status: 'all', area: 'members', source: 'library', page: 1 });
    expect(last.month).toMatch(/^\d{4}-\d{2}$/);
  });

  it('في «أزرق هادئ» شريط «نظرة عامة» بالمرشّحات نفسها بدل ملخص الشهر', async () => {
    theme.current = 'azraq';
    adminApi.getSearchQueryReport.mockResolvedValue(report([row()]));
    adminApi.getSearchQueriesSummary.mockResolvedValue({
      tiles: [
        { key: 'asked', value: 12, scope: 'filters', source: 'search_queries', to: '/admin/search-queries' },
        { key: 'askers', value: null, scope: 'filters', source: 'search_queries.asker_hash', to: '/admin/search-queries' },
      ],
      charts: [{ key: 'bySource', kind: 'bars', items: [{ key: 'ask', value: 9 }] }],
      empty: false,
    });
    renderPage('/admin/search-queries?month=2026-10&area=public');

    expect(await screen.findByText('أسئلة مطروحة')).toBeTruthy();
    expect(screen.getByText('غير معروف')).toBeTruthy();
    expect(adminApi.getSearchQueriesSummary).toHaveBeenCalledWith({ month: '2026-10', source: null, area: 'public', status: 'unanswered' });
    expect(screen.queryByLabelText('ملخص الشهر')).toBeNull();
  });
});
