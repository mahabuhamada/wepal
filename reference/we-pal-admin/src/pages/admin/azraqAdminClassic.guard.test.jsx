import { afterEach, beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';

// حارس التصميم الحالي (classic) للوحة الإدارة في مهمة azraq-admin: لقطات HTML للقشرة (Layout + Sidebar + TopBar)
// ولكل صفحات الإدارة، أُخذت قبل أي تعديل، فأي تغيير في شكلها تحت السمة الحالية يُسقط الاختبار.
// السمة الجديدة («أزرق هادئ») لها اختباراتها في components/Layout/AdminShellAzraq.test.jsx.
vi.mock('../../config', async (importOriginal) => ({ ...(await importOriginal()), USE_API: true }));
vi.mock('../../theme/ThemeContext', () => ({
  useTheme: () => ({ theme: 'classic', hero: {}, setTheme: () => {}, setHero: () => {} }),
}));
const auth = vi.hoisted(() => ({ user: null, loading: false, phoneRequired: false, bootError: null, retryBootstrap: () => {} }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => auth, useOptionalAuth: () => auth }));
// الرسوم: نسخة ثابتة بلا قياس (jsdom بلا أبعاد) — الحارس يخص عناصر الصفحة لا مكتبة الرسم.
vi.mock('recharts', () => {
  const Stub = ({ children }) => <div data-chart-stub="">{children}</div>;
  return {
    BarChart: Stub, Bar: Stub, XAxis: Stub, YAxis: Stub, CartesianGrid: Stub, Tooltip: Stub,
    ResponsiveContainer: Stub, LineChart: Stub, Line: Stub, Legend: Stub,
  };
});
vi.mock('../../api/admin', () => ({
  getStats: vi.fn(), getUsersByRegion: vi.fn(), getMonthlyActivity: vi.fn(), getProjectsByTrack: vi.fn(),
  getMaintenance: vi.fn(), setMaintenance: vi.fn(), purge: vi.fn(),
  listUsers: vi.fn(), updateUser: vi.fn(), listInvitations: vi.fn(), generateInvitations: vi.fn(), revokeInvitation: vi.fn(),
  listReports: vi.fn(), resolveReport: vi.fn(),
  listAudit: vi.fn(), listCourseCompletions: vi.fn(), verifyCourseCompletion: vi.fn(),
  listResourcesForAdmin: vi.fn(), createResource: vi.fn(), createResourceWithFile: vi.fn(), updateResource: vi.fn(), deleteResource: vi.fn(),
  listPostsForAdmin: vi.fn(), createPost: vi.fn(), updatePost: vi.fn(), deletePost: vi.fn(),
  listStoriesForAdmin: vi.fn(), createStory: vi.fn(), updateStory: vi.fn(), deleteStory: vi.fn(),
  createSurvey: vi.fn(), publishSurvey: vi.fn(), closeSurvey: vi.fn(), deleteSurvey: vi.fn(),
  listAdminSurveys: vi.fn(), getSurveysSummary: vi.fn(),
  listPublishable: vi.fn(), publish: vi.fn(),
  listContactMessages: vi.fn(), listNewsletterSubscribers: vi.fn(),
  updateConsultationReport: vi.fn(),
  getAppearance: vi.fn(), updateAppearance: vi.fn(),
}));
vi.mock('../../api/platform', () => ({
  listActivities: vi.fn(), listSurveys: vi.fn(), listConsultations: vi.fn(), listNotifications: vi.fn(),
}));

const adminApi = await import('../../api/admin');
const platformApi = await import('../../api/platform');
const { default: Layout } = await import('../../components/Layout/Layout');
const { default: Admin } = await import('../Admin');
const { default: AdminUsers } = await import('./AdminUsers');
const { default: AdminActivities } = await import('./AdminActivities');
const { default: AdminReports } = await import('./AdminReports');
const { default: AdminLibrary } = await import('./AdminLibrary');
const { default: AdminPosts } = await import('./AdminPosts');
const { default: AdminStories } = await import('./AdminStories');
const { default: AdminSurveys } = await import('./AdminSurveys');
const { default: AdminPublish } = await import('./AdminPublish');
const { default: AdminInbox } = await import('./AdminInbox');
const { default: AdminConsultations } = await import('./AdminConsultations');
const { default: AdminAppearance } = await import('./AdminAppearance');

const ADMIN = { id: 'a1', name: 'ليلى المدير', email: 'admin@x.dev', role: 'ADMIN' };
const MODERATOR = { id: 'm1', name: 'سامي المشرف', email: 'mod@x.dev', role: 'MODERATOR' };
const page = (data) => ({ data, meta: { page: 1, perPage: 20, total: data.length, lastPage: 1 } });
const morePages = (data) => ({ data, meta: { page: 1, perPage: 20, total: 40, lastPage: 2 } });

function seedApis() {
  adminApi.getStats.mockResolvedValue({
    activeUsers: 120, activeProjects: 14, engagementRate: 62, pendingReports: 3,
    totalUsers: 180, publishedResources: 42, surveyResponses: 310,
  });
  adminApi.getUsersByRegion.mockResolvedValue([{ region: 'GAZA', count: 70 }, { region: 'WEST_BANK', count: 50 }]);
  adminApi.getMonthlyActivity.mockResolvedValue([{ month: '2026-09', activities: 40, newUsers: 9 }, { month: '2026-10', activities: 52, newUsers: 12 }]);
  adminApi.getProjectsByTrack.mockResolvedValue([{ track: 'RESEARCH', count: 5 }, { track: 'INITIATIVES', count: 7 }]);
  adminApi.getMaintenance.mockResolvedValue({ maintenance: false });

  adminApi.listUsers.mockResolvedValue({
    data: [
      { id: 'u1', name: 'سارة أحمد', email: 'sara@x.dev', region: 'GAZA', points: 40, role: 'MEMBER', isActive: true, createdAt: '2026-09-01T10:00:00Z' },
      { id: 'u2', name: 'خالد يوسف', email: 'khaled@x.dev', region: 'WEST_BANK', points: 0, role: 'MODERATOR', isActive: false, createdAt: '2026-08-11T10:00:00Z' },
    ],
    meta: { total: 2, page: 1, perPage: 25 },
  });
  adminApi.listInvitations.mockResolvedValue({
    ...page([
      { id: 'i1', code: 'HUB-AAAA-1111', region: 'GAZA', expiresAt: '2026-12-01T00:00:00Z' },
      { id: 'i2', code: 'HUB-BBBB-2222', region: 'WEST_BANK', expiresAt: '2026-01-01T00:00:00Z' },
    ]),
    summary: { total: 5, used: 3, unused: 2 },
  });

  adminApi.listReports.mockResolvedValue(page([
    { id: 'r1', type: 'comment', contentPreview: 'تعليق مسيء في نقاش المجموعة', reporter: { name: 'منى' }, reason: 'إساءة', createdAt: '2026-10-19T10:00:00Z' },
    { id: 'r2', type: 'project', contentPreview: 'مشروع منسوخ', reporter: { name: 'رامي' }, reason: 'انتحال', createdAt: '2026-10-18T10:00:00Z' },
  ]));

  adminApi.listAudit.mockResolvedValue(morePages([
    { id: 'l1', admin: { name: 'ليلى المدير' }, action: 'user.update', targetId: '0123456789abcdef', createdAt: '2026-10-20T08:00:00Z' },
  ]));
  adminApi.listCourseCompletions.mockResolvedValue(page([
    { id: 'c1', userName: 'سارة أحمد', courseId: 'k1', userId: 'u1', courseTitle: { ar: 'مهارات الحوار', en: 'Dialogue skills' } },
  ]));
  platformApi.listActivities.mockResolvedValue(page([
    { id: 'f1', user: { name: 'خالد يوسف' }, verb: 'joined', subject: { title: 'مجموعة غزة' }, createdAt: '2026-10-20T07:00:00Z' },
  ]));

  adminApi.listResourcesForAdmin.mockResolvedValue(morePages([
    { id: 'res1', title: 'دليل الحوار', translations: { title: { ar: 'دليل الحوار', en: 'Dialogue guide' } }, type: 'GUIDE', viewCount: 1200, publishedAt: '2026-09-10T00:00:00Z', status: 'published' },
    { id: 'res2', title: 'تقرير مسودة', type: 'REPORT', viewCount: 0, publishedAt: null, status: 'draft', isDemo: true },
  ]));
  adminApi.listPostsForAdmin.mockResolvedValue(page([
    { id: 'p1', title: 'قراءة في الانتخابات', translations: { title: { ar: 'قراءة في الانتخابات', en: 'On elections' } }, category: 'تحليل', publishedAt: '2026-10-01T00:00:00Z', status: 'published' },
    { id: 'p2', title: 'مسودة مقال', translations: { title: { ar: 'مسودة مقال' } }, category: 'رأي', publishedAt: null, status: 'draft' },
  ]));
  adminApi.listStoriesForAdmin.mockResolvedValue(page([
    { id: 's1', name: 'ليلى حسن', region: 'GAZA', quote: 'تعلّمت أن أسمع قبل أن أرد.', translations: { quote: { ar: 'تعلّمت أن أسمع قبل أن أرد.', en: 'I learned to listen.' } }, status: 'published' },
  ]));
  adminApi.listAdminSurveys.mockResolvedValue(page([
    { id: 'v1', title: 'استبيان الربع الثالث', status: 'ACTIVE', type: 'QUARTERLY', audience: 'members', questionsCount: 6, responsesCount: 48,
      creator: { id: 'u1', name: 'سارة أحمد' }, placement: { kind: 'members', project: null, group: null }, publishedAt: '2026-10-01T09:00:00Z', awaitingReview: false },
    { id: 'v2', title: 'استطلاع الزوار', status: 'DRAFT', type: 'QUICK_POLL', audience: 'public', questionsCount: 1, responsesCount: 0,
      creator: { id: 'a1', name: 'ليلى المدير' }, placement: { kind: 'public', project: null, group: null }, publishedAt: null, awaitingReview: true },
    { id: 'v3', title: 'استبيان مغلق', status: 'CLOSED', type: 'QUARTERLY', audience: 'members', questionsCount: 4, responsesCount: 20, isDemo: true,
      creator: { id: 'u2', name: 'قائد الفريق' }, placement: { kind: 'workspace', project: { id: 'p1', title: 'أثر المساحات' }, group: { id: 'g1', name: 'مسار البحث' } }, publishedAt: '2026-09-15T09:00:00Z', awaitingReview: false },
  ]));
  adminApi.listPublishable.mockResolvedValue({ data: [
    { id: 'pr1', title: 'مشروع حوار الأحياء', track: 'INITIATIVES', files: [{ id: 'fl1', name: 'التقرير.pdf' }] },
  ] });
  adminApi.listContactMessages.mockResolvedValue(page([
    { id: 'm1', subject: 'سؤال عن الانضمام', name: 'هبة', email: 'heba@x.dev', message: 'كيف أنضم؟', createdAt: '2026-10-19T00:00:00Z' },
  ]));
  adminApi.listNewsletterSubscribers.mockResolvedValue(page([
    { id: 'n1', email: 'reader@x.dev', subscribedAt: '2026-10-02T00:00:00Z' },
  ]));
  platformApi.listConsultations.mockResolvedValue([
    { id: 'k1', title: 'استشارة حول الدستور', participantsCount: 30, report: { summary: 'ملخص' } },
    { id: 'k2', title: 'استشارة الشباب', participantsCount: 12, report: null },
  ]);
  adminApi.getAppearance.mockResolvedValue({ design: 'classic', hero: { mode: 'slider', newsCount: 4, interval: 7 }, updatedAt: '2026-10-20T09:00:00Z' });
}

// معرّفات useId تتبع ترتيب الرسم؛ نثبّتها حتى لا تتعلق اللقطة بترتيب الاختبارات.
const html = (container) => container.innerHTML.replace(/«r[0-9a-z]+»|:r[0-9a-z]+:/g, '«id»');

const renderPage = (element, lang = 'ar', path = '/admin') => render(
  <LanguageProvider initialLang={lang}>
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={element} />
      </Routes>
    </MemoryRouter>
  </LanguageProvider>,
);

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-20T12:00:00Z'));
});
afterAll(() => vi.useRealTimers());

beforeEach(() => {
  auth.user = ADMIN;
  seedApis();
});
afterEach(cleanup);

describe('التصميم الحالي (classic) للوحة الإدارة لا يتغير — القشرة', () => {
  const renderShell = (lang, path = '/admin') => render(
    <LanguageProvider initialLang={lang}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/admin/*" element={<p>المحتوى</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </LanguageProvider>,
  );

  it.each(['ar', 'en'])('المدير (%s)', (lang) => {
    const { container } = renderShell(lang);
    expect(html(container)).toMatchSnapshot();
  });

  it('المشرف: طابور البلاغات فقط', () => {
    auth.user = MODERATOR;
    const { container } = renderShell('ar', '/admin/reports');
    expect(html(container)).toMatchSnapshot();
  });
});

describe('التصميم الحالي (classic) للوحة الإدارة لا يتغير — الصفحات', () => {
  const ready = (selector) => (container) => waitFor(() => expect(container.querySelector(selector)).toBeTruthy());
  const text = (value) => (container) => waitFor(() => expect(container.textContent).toContain(value));

  it.each([
    ['لوحة الإدارة', <Admin key="admin" />, text('120')],
    ['المستخدمون', <AdminUsers key="users" />, text('سارة أحمد')],
    ['الأنشطة', <AdminActivities key="activities" />, text('مجموعة غزة')],
    ['البلاغات', <AdminReports key="reports" />, text('مشروع منسوخ')],
    ['المكتبة', <AdminLibrary key="library" />, text('دليل الحوار')],
    ['المقالات', <AdminPosts key="posts" />, text('قراءة في الانتخابات')],
    ['القصص', <AdminStories key="stories" />, text('ليلى حسن')],
    ['الاستبيانات', <AdminSurveys key="surveys" />, text('استبيان مغلق')],
    ['النشر', <AdminPublish key="publish" />, text('مشروع حوار الأحياء')],
    // «التحليلات» أُعيد بناؤها صفحةً جديدة (13 نوفمبر) ولها اختبارها: AdminAnalytics.test.jsx
    ['الوارد', <AdminInbox key="inbox" />, text('سؤال عن الانضمام')],
    ['الاستشارات', <AdminConsultations key="consultations" />, text('استشارة الشباب')],
    ['إعدادات الواجهة', <AdminAppearance key="appearance" />, ready('.ui-choices')],
  ])('%s', async (_name, element, settle) => {
    const { container } = renderPage(element);
    await settle(container);
    expect(html(container)).toMatchSnapshot();
  });

  it.each([
    ['لوحة الإدارة', <Admin key="admin" />, '120'],
    ['المستخدمون', <AdminUsers key="users" />, 'سارة أحمد'],
    ['البلاغات', <AdminReports key="reports" />, 'مشروع منسوخ'],
  ])('%s (en)', async (_name, element, value) => {
    const { container } = renderPage(element, 'en');
    await waitFor(() => expect(container.textContent).toContain(value));
    expect(html(container)).toMatchSnapshot();
  });

  it('الحالات الفارغة', async () => {
    adminApi.listReports.mockResolvedValue(page([]));
    adminApi.listPublishable.mockResolvedValue({ data: [] });
    platformApi.listConsultations.mockResolvedValue([]);
    adminApi.listContactMessages.mockResolvedValue(page([]));
    const reports = renderPage(<AdminReports />);
    await waitFor(() => expect(reports.container.textContent).toContain('لا توجد بلاغات'));
    expect(html(reports.container)).toMatchSnapshot();
    cleanup();
    for (const element of [<AdminPublish key="p" />, <AdminConsultations key="c" />, <AdminInbox key="i" />]) {
      const { container } = renderPage(element);
      await waitFor(() => expect(container.querySelector('[role="status"], .rounded-2xl.text-center')).toBeTruthy());
      expect(html(container)).toMatchSnapshot();
      cleanup();
    }
  });
});
