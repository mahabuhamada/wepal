import { useState, useEffect, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Users, FolderOpen, TrendingUp, AlertTriangle, Search, Trash2, AlertCircle, XCircle, ArrowLeft, BookOpen, Send, BarChart3, Activity, Shield } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import TopBar from '../components/Layout/TopBar';
import Card from '../components/common/Card';
import FadeIn from '../components/common/FadeIn';
import { useLocalizedData } from '../data/useLocalizedData';
import { useLanguage } from '../i18n/LanguageContext';
import { USE_API } from '../config';
import * as adminApi from '../api/admin';
import { regionLabel } from '../utils/apiMappers';
import ErrorState from '../components/common/ErrorState';
import ChartTable from '../components/Admin/ChartTable';
import { useAuth } from '../auth/AuthContext';
import { adminHomeFor, hasPermission } from '../utils/roles';
import KillSwitchPanel from '../components/Admin/KillSwitchPanel';
import AdminHome from './admin/AdminHome';
import { useTheme } from '../theme/ThemeContext';

const engagementData = [
  { month: 'يناير', rate: 65 },
  { month: 'فبراير', rate: 72 },
  { month: 'مارس', rate: 78 },
  { month: 'أبريل', rate: 75 },
  { month: 'مايو', rate: 82 },
  { month: 'يونيو', rate: 78 },
];

// ===== وضع المحاكاة (يبقى دون تغيير سلوكي) =====
function MockAdmin() {
  const { t } = useLanguage();
  const { adminStats, adminUsers, reports } = useLocalizedData();

  const locationData = [
    { name: t('admin.gaza'), value: 340 },
    { name: t('admin.westBank'), value: 300 },
    { name: t('admin.cairo'), value: 47 },
  ];

  const statsConfig = [
    { key: 'activeUsers', label: t('admin.activeUsers'), icon: Users, color: 'var(--wp-ink)', bg: '#F0F0F0' },
    { key: 'activeProjects', label: t('admin.activeProjects'), icon: FolderOpen, color: 'var(--wp-info)', bg: 'var(--wp-info-tint)' },
    { key: 'engagementRate', label: t('admin.engagementRate'), icon: TrendingUp, color: 'var(--wp-success)', bg: 'var(--wp-success-tint)' },
    { key: 'pendingReports', label: t('admin.pendingReports'), icon: AlertTriangle, color: 'var(--wp-warning)', bg: 'var(--wp-warning-tint)' },
  ];

  return (
    <div>
      <TopBar title={t('admin.title')} />
      <div className="p-7 px-8 space-y-6">
        <FadeIn>
          <div className="grid grid-cols-4 gap-4">
            {statsConfig.map((item) => (
              <Card key={item.key} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: item.bg }}>
                  <item.icon size={20} style={{ color: item.color }} />
                </div>
                <div>
                  <div className="text-2xl font-extrabold tracking-tight text-[var(--wp-ink)]">{adminStats[item.key]}</div>
                  <div className="text-xs text-[var(--wp-text-muted)]">{item.label}</div>
                </div>
              </Card>
            ))}
          </div>
        </FadeIn>

        <QuickLinks t={t} />

        <FadeIn delay={0.15}>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <h3 className="text-base font-bold text-[var(--wp-ink)] mb-4">{t('admin.usersByLocation')}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={locationData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={60} />
                  <Tooltip />
                  <Bar dataKey="value" fill="var(--wp-ink)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <h3 className="text-base font-bold text-[var(--wp-ink)] mb-4">{t('admin.monthlyEngagement')}</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={engagementData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="rate" stroke="var(--wp-ink)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-[var(--wp-ink)]">{t('admin.userManagement')}</h3>
              <div className="relative">
                <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--wp-text-muted)]" />
                <input placeholder={t('common.search')} className="wp-input ps-8 pe-3 py-2 text-sm w-48" />
              </div>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--wp-border)] text-[var(--wp-text-muted)] text-xs">
                  <th className="text-start py-3 px-2 font-medium">{t('admin.name')}</th>
                  <th className="text-start py-3 px-2 font-medium">{t('admin.email')}</th>
                  <th className="text-start py-3 px-2 font-medium">{t('admin.region')}</th>
                  <th className="text-start py-3 px-2 font-medium">{t('admin.role')}</th>
                  <th className="text-start py-3 px-2 font-medium">{t('admin.status')}</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map((user) => (
                  <tr key={user.id} className="border-b border-[var(--wp-border)] hover:bg-[#F6F6F6]">
                    <td className="py-3 px-2 font-medium text-[var(--wp-text)]">{user.name}</td>
                    <td className="py-3 px-2 text-[var(--wp-text-muted)]">{user.email}</td>
                    <td className="py-3 px-2 text-[var(--wp-text-muted)]">{user.region}</td>
                    <td className="py-3 px-2"><span className="px-2.5 py-0.5 rounded-full bg-[#F0F0F0] text-[var(--wp-text-2)] text-xs font-semibold">{user.role}</span></td>
                    <td className="py-3 px-2"><span className="px-2.5 py-0.5 rounded-full bg-[var(--wp-success-tint)] text-[var(--wp-success)] text-xs font-semibold">{user.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </FadeIn>

        <FadeIn delay={0.2}>
          <Card>
            <h3 className="text-base font-bold text-[var(--wp-ink)] mb-4">{t('admin.reportsManagement')}</h3>
            <div className="space-y-3">
              {reports.map((report) => (
                <div key={report.id} className="flex items-center justify-between p-4 rounded-2xl border border-[var(--wp-border)]">
                  <div>
                    <div className="text-sm font-medium text-[var(--wp-text)] mb-1">{report.content}</div>
                    <div className="flex gap-4 text-xs text-[var(--wp-text-muted)]">
                      <span>{t('admin.reporter')}: {report.reporter}</span>
                      <span>{t('admin.reason')}: {report.reason}</span>
                      <span>{report.date}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-[var(--wp-coral-wash)] rounded-lg transition-colors" title={t('admin.deleteAction')}>
                      <Trash2 size={16} className="text-[var(--wp-coral-deep)]" />
                    </button>
                    <button className="p-2 hover:bg-[var(--wp-warning-tint)] rounded-lg transition-colors" title={t('admin.warnAction')}>
                      <AlertCircle size={16} className="text-[var(--wp-warning)]" />
                    </button>
                    <button className="p-2 hover:bg-[#F6F6F6] rounded-lg transition-colors" title={t('admin.ignoreAction')}>
                      <XCircle size={16} className="text-[var(--wp-text-muted)]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </FadeIn>

      </div>
    </div>
  );
}

// روابط سريعة مشتركة بين الوضعين.
function QuickLinks({ t }) {
  return (
    <FadeIn delay={0.1}>
      <div className="grid grid-cols-4 gap-3">
        {[
          { to: '/admin/users', icon: Users, label: t('admin.userManagement') },
          { to: '/admin/activities', icon: Activity, label: t('admin.activityManagement') },
          { to: '/admin/reports', icon: Shield, label: t('admin.reportsManagement') },
          { to: '/admin/library', icon: BookOpen, label: t('sidebar.library') },
          { to: '/admin/surveys', icon: BarChart3, label: t('sidebar.surveys') },
          { to: '/admin/publish', icon: Send, label: t('sidebar.publishing') },
          { to: '/admin/analytics', icon: TrendingUp, label: t('sidebar.analytics') },
        ].map((item) => (
          <Link key={item.to} to={item.to} className="wp-lift flex items-center gap-3 p-3 rounded-2xl border border-[var(--wp-border)] hover:border-[var(--wp-coral)] hover:bg-[#F6F6F6] transition-colors">
            <item.icon size={16} className="text-[var(--wp-text-muted)]" />
            <span className="text-sm text-[var(--wp-text)]">{item.label}</span>
            <ArrowLeft size={12} className="text-[var(--wp-text-muted)] ms-auto" />
          </Link>
        ))}
      </div>
    </FadeIn>
  );
}

// ===== وضع الـ API (بيانات حيّة) =====
function ApiAdmin() {
  const { t, lang } = useLanguage();
  const [stats, setStats] = useState(null);
  const [byRegion, setByRegion] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (isActive = () => true) => {
    if (isActive()) { setLoading(true); setError(''); }
    try {
      const [s, r, m] = await Promise.all([
        adminApi.getStats(),
        adminApi.getUsersByRegion(),
        adminApi.getMonthlyActivity(),
      ]);
      if (isActive()) {
        setStats(s);
        setByRegion((r || []).map((x) => ({ name: regionLabel(x.region, lang), value: x.count })));
        setMonthly((m || []).map((x) => ({ month: x.month, activities: x.activities, newUsers: x.newUsers })));
      }
    } catch (err) {
      if (isActive()) setError(err.message || t('common.loadError'));
    } finally {
      if (isActive()) setLoading(false);
    }
  }, [t, lang]);

  useEffect(() => {
    let active = true;
    load(() => active);
    return () => { active = false; };
  }, [load]);

  const statsConfig = [
    { key: 'activeUsers', label: t('admin.activeUsers'), icon: Users, color: 'var(--wp-ink)', bg: '#F0F0F0' },
    { key: 'activeProjects', label: t('admin.activeProjects'), icon: FolderOpen, color: 'var(--wp-info)', bg: 'var(--wp-info-tint)' },
    { key: 'engagementRate', label: t('admin.engagementRate'), icon: TrendingUp, color: 'var(--wp-success)', bg: 'var(--wp-success-tint)', suffix: '%' },
    { key: 'pendingReports', label: t('admin.pendingReports'), icon: AlertTriangle, color: 'var(--wp-warning)', bg: 'var(--wp-warning-tint)' },
  ];

  return (
    <div>
      <TopBar title={t('admin.title')} />
      <div className="p-7 px-8 space-y-6">
        {error && <ErrorState error={error} onRetry={() => load()} />}

        <FadeIn>
          <div className="grid grid-cols-4 gap-4" aria-busy={loading}>
            {statsConfig.map((item) => (
              <Card key={item.key} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: item.bg }}>
                  <item.icon size={20} style={{ color: item.color }} />
                </div>
                <div>
                  <div className="text-2xl font-extrabold tracking-tight text-[var(--wp-ink)]">
                    {loading ? '—' : `${stats?.[item.key] ?? 0}${item.suffix || ''}`}
                  </div>
                  <div className="text-xs text-[var(--wp-text-muted)]">{item.label}</div>
                </div>
              </Card>
            ))}
          </div>
        </FadeIn>

        <QuickLinks t={t} />

        <FadeIn delay={0.15}>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <h2 className="text-base font-bold text-[var(--wp-ink)] mb-4">{t('adminApi.usersByRegion')}</h2>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={byRegion} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="name" type="category" width={90} />
                  <Tooltip />
                  <Bar dataKey="value" fill="var(--wp-ink)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <ChartTable
                caption={t('azraqAdmin.chartData', { title: t('adminApi.usersByRegion') })}
                columns={[{ key: 'name', label: t('admin.region') }, { key: 'value', label: t('adminApi.usersByRegion') }]}
                rows={byRegion}
              />
            </Card>
            <Card>
              <h2 className="text-base font-bold text-[var(--wp-ink)] mb-4">{t('adminApi.monthlyActivity')}</h2>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="activities" name={t('adminApi.activities')} stroke="var(--wp-ink)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="newUsers" name={t('adminApi.newUsers')} stroke="var(--wp-coral)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
              <ChartTable
                caption={t('azraqAdmin.chartData', { title: t('adminApi.monthlyActivity') })}
                columns={[{ key: 'month', label: t('azraqAdmin.month') }, { key: 'activities', label: t('adminApi.activities') }, { key: 'newUsers', label: t('adminApi.newUsers') }]}
                rows={monthly}
              />
            </Card>
          </div>
        </FadeIn>

        <KillSwitchPanel onPurged={() => load()} />
      </div>
    </div>
  );
}

// «أزرق هادئ»: الرئيسية الجديدة لكل طاقم اللوحة (خطة لوحة الإدارة 4.2). التصميم الحالي (classic) كما هو،
// ومن لا يملك الإحصاءات فيه (المشرف، المحرر) يُنقل لأول صفحة له كما كان قبل أن تُفتح الرئيسية للطاقم كله.
export default function Admin() {
  const { theme } = useTheme();
  const { user } = useAuth();
  if (!USE_API) return <MockAdmin />;
  if (theme === 'azraq') return <AdminHome />;
  if (!hasPermission(user, 'stats.view')) {
    const first = adminHomeFor(user, { skipHome: true });
    return first ? <Navigate to={first} replace /> : null;
  }
  return <ApiAdmin />;
}
