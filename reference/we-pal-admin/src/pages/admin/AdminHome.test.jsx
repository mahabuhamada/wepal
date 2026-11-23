import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '../../i18n/LanguageContext';
import { AdminShellContext } from '../../components/Layout/adminShellContext';

const auth = vi.hoisted(() => ({ user: null }));
vi.mock('../../auth/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../config', () => ({ USE_API: true }));
vi.mock('../../components/Layout/TopBar', () => ({ default: () => null }));
vi.mock('./AdminStatsSection', () => ({ default: () => <p>قسم الإحصاءات</p> }));
const { default: AdminHome } = await import('./AdminHome');

const DAY = 86400000;
const SUMMARY = {
  attention: [
    { key: 'reports', count: 6, oldestAt: new Date(Date.now() - 3 * DAY).toISOString(), to: '/admin/reports' },
    { key: 'translations', count: 2, oldestAt: null, to: '/admin/posts', items: [{ type: 'story', id: 's1', title: 'من غزة', to: '/admin/stories' }] },
  ],
  counts: { reports: 6 },
  kpis: [
    { key: 'activeMembers', scope: 'last30', value: 412, previous: 380, of: 1180, source: 'activities', to: '/admin/users' },
    { key: 'regions', scope: 'total', value: 100, segments: [{ key: 'GAZA', value: 50 }, { key: 'WEST_BANK', value: 40 }, { key: 'OTHER', value: 10 }], source: 'users.region', to: '/admin/users' },
  ],
  recent: [{ id: 1, actor: 'هلا', action: 'report.resolve', label: null, at: new Date().toISOString() }],
};

const renderHome = (summary = SUMMARY, extra = {}) => render(
  <MemoryRouter>
    <LanguageProvider initialLang="ar">
      <AdminShellContext.Provider value={{ summary, summaryError: null, reloadSummary: () => {}, ...extra }}>
        <AdminHome />
      </AdminShellContext.Provider>
    </LanguageProvider>
  </MemoryRouter>,
);

describe('رئيسية الإدارة', () => {
  beforeEach(() => {
    auth.user = { id: 'a1', name: 'هلا الخطيب', role: 'ADMIN', permissions: ['stats.view', 'audit.view', 'reports.moderate'] };
  });
  afterEach(cleanup);

  it('العنوان بعدد ما ينتظر، والصفوف مرقّمة بعددها وعمر أقدمها ورابطها', () => {
    renderHome();
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('أمور تنتظر قرارك: 2');
    const attention = screen.getByRole('region', { name: 'يحتاج إلى انتباهك' });
    const rows = within(attention).getAllByRole('listitem');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByRole('link', { name: 'بلاغات بانتظار المعالجة' }).getAttribute('href')).toBe('/admin/reports');
    expect(rows[0].textContent).toContain('6');
    expect(rows[0].textContent).toMatch(/أقدمها منذ 3/);
    // الترجمات الناقصة: رابط لكل مادة (قرار أمجد هـ)
    expect(within(rows[1]).getByRole('link', { name: 'ترجمة: قصة «من غزة»' }).getAttribute('href')).toBe('/admin/stories');
  });

  it('المؤشرات: المدة والمصدر على كل بطاقة، والفرق عن المدة السابقة، والبطاقة رابط لقائمتها', () => {
    renderHome();
    const active = screen.getByRole('link', { name: /الأعضاء النشطون/ });
    expect(active.getAttribute('href')).toBe('/admin/users');
    expect(active.textContent).toContain('آخر 30 يومًا');
    expect(active.textContent).toContain('من 1180 مسجّلًا'.replace('1180', '1180'));
    expect(active.textContent).toContain('↑ 8%');
    expect(active.getAttribute('title')).toMatch(/^من: جدول الأنشطة/);
    const regions = screen.getByRole('link', { name: /توزّع المناطق/ });
    expect(regions.textContent).toContain('الإجمالي');
    expect(regions.textContent).toMatch(/غزة 50%/);
    expect(screen.getByText('قسم الإحصاءات')).toBeTruthy();
  });

  it('النشاط الأخير بأسماء الأفعال المقروءة، ورابط سجل التدقيق', () => {
    renderHome();
    const recent = screen.getByRole('region', { name: 'النشاط الأخير' });
    expect(recent.textContent).toContain('هلا معالجة بلاغ');
    expect(within(recent).getByRole('link', { name: 'سجل التدقيق' }).getAttribute('href')).toBe('/admin/activities');
  });

  it('لا شيء ينتظر: رسالة نجاح؛ والمشرف بلا مؤشرات ولا إحصاءات', () => {
    auth.user = { id: 'm1', name: 'سامي', role: 'MODERATOR', permissions: ['reports.moderate'] };
    renderHome({ attention: [], counts: {}, kpis: [], recent: [] });
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('لا شيء ينتظرك الآن');
    expect(screen.queryByText('مؤشرات البرنامج')).toBeNull();
    expect(screen.queryByText('قسم الإحصاءات')).toBeNull();
  });

  it('اختيار المدة 7/30/90 يغيّر مدة المؤشرات', () => {
    const setSummaryDays = vi.fn();
    const seven = { ...SUMMARY, kpis: [{ ...SUMMARY.kpis[0], scope: 'last7' }] };
    renderHome(seven, { summaryDays: 7, setSummaryDays });
    const group = screen.getByRole('radiogroup', { name: 'المدة' });
    expect(within(group).getByRole('radio', { name: '7 أيام' }).getAttribute('aria-checked')).toBe('true');
    fireEvent.click(within(group).getByRole('radio', { name: '90 يومًا' }));
    expect(setSummaryDays).toHaveBeenCalledWith(90);
    expect(screen.getByText('آخر 7 أيام')).toBeTruthy();
    expect(screen.getByText(/عن الأيام الـ7 السابقة/)).toBeTruthy();
  });
});
