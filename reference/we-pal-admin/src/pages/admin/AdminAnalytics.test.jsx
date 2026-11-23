import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

vi.mock('../../config', () => ({ USE_API: true }));
vi.mock('../../components/Layout/TopBar', () => ({ default: () => null }));
vi.mock('./analytics/WorldMap', () => ({ default: () => <p>خريطة</p> }));
const responses = vi.hoisted(() => ({ current: {} }));
vi.mock('../../api/analytics', () => ({
  getAnalyticsReport: vi.fn(async (report) => ({ report, ...responses.current[report] })),
  downloadAnalyticsCsv: vi.fn(async () => 1),
}));
const { default: AdminAnalytics } = await import('./AdminAnalytics');

const EMPTY = {
  overview: { measured: false, trackingSince: null, totals: { pageViews: 0, visitorDays: 0, contentViews: 0, downloads: 0, previousPageViews: 0, previousVisitorDays: 0, membersShare: null }, series: [] },
  geo: { geoAvailable: false, countries: [], cities: [], memberRegions: [{ region: 'GAZA', members: 12 }], memberGovernorates: [{ governorate: 'gaza', members: '<5' }], minCell: 5 },
  content: { items: [], downloads: [], byTypeLang: [], pages: [] },
  members: { weights: { posts: 3, comments: 2, replies: 1, votes: 1, tasks: 3, updates: 3 }, activeMembers: 1, members: [{ id: 'u1', name: 'سارة', region: 'GAZA', posts: 2, comments: 0, replies: 0, votes: 0, tasks: 0, updates: 0, score: 6 }] },
  retention: { months: [], totalMembers: 12 },
  funnel: { steps: [{ step: 'visitors', count: 0, measured: false }, { step: 'registered', count: 3, measured: true }] },
  cohorts: { rows: [] }, sources: { referrers: [], devices: [], languages: [] },
  search: { total: 4, zeroResults: 1, top: [{ query: 'منح', times: 1 }] },
  moderation: { received: 2, handled: 1, openNow: 1, medianHoursToHandle: 5.5, reasons: [] },
  polls: { polls: [], members: 12 },
};

const renderPage = () => render(<MemoryRouter><LanguageProvider initialLang="ar"><AdminAnalytics /></LanguageProvider></MemoryRouter>);

describe('صفحة التحليلات', () => {
  afterEach(cleanup);

  it('قبل بدء القياس تقول «غير مقاس بعد» بدل أرقام صفرية، والخريطة بلا قاعدة الموقع كذلك', async () => {
    responses.current = EMPTY;
    renderPage();
    expect((await screen.findAllByText(/تسجيل الزيارات يبدأ بعد نشر هذا التحديث/)).length).toBeGreaterThan(0);
    const kpis = document.querySelector('.azq-an-kpis');
    expect(within(kpis).getAllByText('غير مقاس بعد')).toHaveLength(5);
    expect(screen.getByText(/قاعدة الموقع الجغرافي لم تُنزَّل/)).toBeTruthy();
    // الأعضاء حسب المنطقة والمحافظة من بيانات حقيقية (بحد الخانة)
    expect(screen.getByText('<5')).toBeTruthy();
  });

  it('درجة التفاعل مشروحة، والعضو يفتح صفحة الأعضاء، والأرقام تفتح قوائمها', async () => {
    responses.current = EMPTY;
    renderPage();
    const member = await screen.findByRole('link', { name: 'سارة' });
    expect(member.getAttribute('href')).toBe(`/admin/users?q=${encodeURIComponent('سارة')}`);
    expect(screen.getByText(/منشورات × 3 \+ تعليقات × 2/)).toBeTruthy();
    expect(screen.getByRole('link', { name: /1 من 4 عملية بحث/ }).getAttribute('href')).toBe('/admin/search-queries');
    await waitFor(() => expect(screen.getAllByRole('button', { name: /تنزيل CSV/ }).every((b) => !b.disabled)).toBe(true));
  });

  it('بعد بدء القياس تعرض الأرقام وتغيّرها عن الفترة السابقة', async () => {
    responses.current = { ...EMPTY, overview: { ...EMPTY.overview, measured: true, trackingSince: '2026-11-14', totals: { ...EMPTY.overview.totals, pageViews: 150, previousPageViews: 100 }, series: [{ day: '2026-11-14', views: 150, visitors: 40 }] } };
    renderPage();
    expect(await screen.findByText(/قياس الزيارات بدأ في/)).toBeTruthy();
    expect(within(document.querySelector('.azq-an-kpis')).getByText('150')).toBeTruthy();
    expect(document.querySelector('.azq-kpi-delta').textContent).toMatch(/50/);
  });
});
