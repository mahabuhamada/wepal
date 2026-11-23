import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, UserPlus, Shield, Trash2, Ban, Ticket, Users, Activity, ShieldAlert, UserX } from 'lucide-react';
import TopBar from '../../components/Layout/TopBar';
import Card from '../../components/common/Card';
import FadeIn from '../../components/common/FadeIn';
import { useLanguage } from '../../i18n/LanguageContext';
import { useLocalizedData } from '../../data/useLocalizedData';
import { USE_API } from '../../config';
import * as adminApi from '../../api/admin';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ErrorState from '../../components/common/ErrorState';
import { regionLabel, formatShortDate, REGIONS } from '../../utils/apiMappers';
import { useAdminNotice } from '../../components/Admin/adminNoticeContext';
import OverviewBand from '../../components/Admin/OverviewBand';
import useListSummary from '../../hooks/useListSummary';
import { useTheme } from '../../theme/ThemeContext';
import { ROLES, assignableRoles, roleLabelKey } from '../../utils/roles';
import { useAuth } from '../../auth/AuthContext';
import { ClickableRow, RowLink } from '../../components/common/ClickableRow';
import ActiveFilter from '../../components/Admin/ActiveFilter';

const roles = ['الكل', 'عضو', 'مشرف', 'مدير'];

// ===== وضع المحاكاة (يبقى دون تغيير سلوكي) =====
function MockAdminUsers() {
  const { t } = useLanguage();
  const { adminUsers } = useLocalizedData();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('الكل');

  const filtered = adminUsers.filter((u) => {
    const matchSearch = u.name.includes(search) || u.email.includes(search);
    const matchRole = roleFilter === 'الكل' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div>
      <TopBar title={t('adminUsers.title')} />
      <div className="p-7 px-8 space-y-6">
        <FadeIn>
          <div className="flex items-center justify-between">
            <h2 className="wp-page-title">{t('adminUsers.title')}</h2>
            <button className="wp-btn-ink px-5 py-2.5 text-sm flex items-center gap-2">
              <UserPlus size={16} /> {t('common.add')}
            </button>
          </div>
        </FadeIn>

        <FadeIn delay={0.05}>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--wp-text-muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('adminUsers.searchPlaceholder')}
                className="wp-input w-full ps-8 pe-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2">
              {roles.map((r) => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`rounded-full px-4 py-[9px] text-body-sm font-semibold transition-colors ${
                    roleFilter === r ? 'bg-[var(--wp-ink)] text-white' : 'bg-white border border-[var(--wp-border-2)] text-[var(--wp-text-3)] hover:border-[var(--wp-coral)] hover:text-[var(--wp-coral)]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <Card>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--wp-border)] text-[var(--wp-text-muted)] text-xs">
                  <th className="text-start py-3 px-2 font-medium">{t('admin.name')}</th>
                  <th className="text-start py-3 px-2 font-medium">{t('admin.email')}</th>
                  <th className="text-start py-3 px-2 font-medium">{t('admin.region')}</th>
                  <th className="text-start py-3 px-2 font-medium">{t('admin.role')}</th>
                  <th className="text-start py-3 px-2 font-medium">{t('admin.status')}</th>
                  <th className="text-start py-3 px-2 font-medium">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} className="border-b border-[var(--wp-border)] hover:bg-[#F6F6F6]">
                    <td className="py-3 px-2 font-medium text-[var(--wp-text)]">{user.name}</td>
                    <td className="py-3 px-2 text-[var(--wp-text-muted)]">{user.email}</td>
                    <td className="py-3 px-2 text-[var(--wp-text-muted)]">{user.region}</td>
                    <td className="py-3 px-2"><span className="px-2.5 py-0.5 rounded-full bg-[#F0F0F0] text-[var(--wp-text-2)] text-xs font-semibold">{user.role}</span></td>
                    <td className="py-3 px-2"><span className="px-2.5 py-0.5 rounded-full bg-[var(--wp-success-tint)] text-[var(--wp-success)] text-xs font-semibold">{user.status}</span></td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1">
                        <button className="p-1.5 hover:bg-[var(--wp-info-tint)] rounded-lg" title={t('admin.role')}><Shield size={14} className="text-[var(--wp-info)]" /></button>
                        <button className="p-1.5 hover:bg-[var(--wp-warning-tint)] rounded-lg" title={t('admin.warnAction')}><Ban size={14} className="text-[var(--wp-warning)]" /></button>
                        <button className="p-1.5 hover:bg-[var(--wp-coral-wash)] rounded-lg" title={t('admin.deleteAction')}><Trash2 size={14} className="text-[var(--wp-coral-deep)]" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}

// ===== وضع الـ API (بيانات حيّة) =====
const USER_TABS = ['all', 'staff', 'suspended', 'no2fa'];
const USER_TILE_ICON = { visible: Users, active30: Activity, staffWithout2fa: ShieldAlert, suspended: UserX };
const USER_TILE_PATH = { visible: 'none', active30: 'work', staffWithout2fa: 'vote', suspended: 'com' };

function ApiAdminUsers() {
  const { t, lang } = useLanguage();
  const notify = useAdminNotice();
  // القرار 1: المدير يعيّن ما تحت «مدير» ولا يعدّل حاملي «مدير» و«مدير عام» (الخادم يفرض ذلك)
  const { user: me } = useAuth();
  const assignable = assignableRoles(me);

  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, perPage: 25 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  // تغيير الدور أو حالة الحساب ينتظر التأكيد: { user, payload, kind: 'role' | 'activate' | 'deactivate' }
  const [pending, setPending] = useState(null);

  // ?q= من لوحة الأوامر (Ctrl K): البحث عن عضو يفتح القائمة مرشَّحة به
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get('q') ?? '';
  const [searchInput, setSearchInput] = useState(initialQ);
  const [q, setQ] = useState(initialQ);
  // المنطقة والدور والتبويب في الرابط (المرحلة 2): بطاقات «نظرة عامة» ورسومها تفتح القائمة مرشَّحة بها
  const region = searchParams.get('region') ?? '';
  const role = searchParams.get('role') ?? '';
  const tab = USER_TABS.includes(searchParams.get('tab')) ? searchParams.get('tab') : 'all';
  const setParam = useCallback((key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!value || value === 'all') next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: true });
  }, [setSearchParams]);
  // ?seen=30 (نشاط في آخر N يومًا) و?participated=30 (استطلاع أو استشارة): من بطاقات الرئيسية و«نظرة عامة»
  const dayParam = (key) => (/^\d{1,3}$/.test(searchParams.get(key) ?? '') ? searchParams.get(key) : '');
  const seen = dayParam('seen');
  const participated = dayParam('participated');
  const setRegion = (v) => setParam('region', v);
  const setRole = (v) => setParam('role', v);
  const [active, setActive] = useState('');
  const [page, setPage] = useState(1);

  // بحث مؤجَّل 300ms.
  const debounceRef = useRef();
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setQ(searchInput); setPage(1); }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  const load = useCallback(async (isActive = () => true) => {
    if (isActive()) { setLoading(true); setError(''); }
    try {
      const res = await adminApi.listUsers({ q, region, role, active, tab, seen, participated, page });
      if (isActive()) {
        setUsers(res?.data || []);
        setMeta(res?.meta || { total: 0, page: 1, perPage: 25 });
      }
    } catch (err) {
      if (isActive()) setError(err.message || t('common.loadError'));
    } finally {
      if (isActive()) setLoading(false);
    }
  }, [q, region, role, active, tab, seen, participated, page, t]);

  // «نظرة عامة» والتبويبات للوحة الجديدة («أزرق هادئ») وحدها؛ التصميم الحالي لا يتغير
  const azraq = useTheme().theme === 'azraq';
  const band = useListSummary(() => (azraq ? adminApi.getUsersSummary({ q, region, role, active, tab, seen, participated }) : Promise.resolve(null)), [azraq, q, region, role, active, tab, seen, participated]);
  const scopeText = [
    t(`adminLists.users.tab.${tab}`),
    region && regionLabel(region, lang),
    role && t(roleLabelKey(role)),
    seen && t('adminLists.activeFilter.seen', { n: seen }),
    participated && t('adminLists.activeFilter.participated', { n: participated }),
    q && `«${q}»`,
  ].filter(Boolean).join(' · ');

  useEffect(() => {
    let alive = true;
    load(() => alive);
    return () => { alive = false; };
  }, [load]);

  const askRole = (user, role) => {
    if (role !== user.role) setPending({ user, payload: { role }, kind: 'role' });
  };
  const askActive = (user) => setPending({ user, payload: { isActive: !user.isActive }, kind: user.isActive ? 'deactivate' : 'activate' });

  // بعد التأكيد: خطأ الخادم يبقى داخل النافذة (ConfirmDialog)، والنجاح يُعلن ويحدّث الصف.
  const confirmPending = async () => {
    const { user, payload, kind } = pending;
    setBusyId(user.id);
    try {
      const updated = await adminApi.updateUser(user.id, payload);
      setUsers((list) => list.map((u) => (u.id === user.id ? { ...u, ...updated } : u)));
      const name = user.name || user.email;
      notify(kind === 'role'
        ? t('azraqAdmin.notice.roleChanged', { name, role: t(roleLabelKey(payload.role)) })
        : t(kind === 'activate' ? 'azraqAdmin.notice.activated' : 'azraqAdmin.notice.deactivated', { name }));
    } finally {
      setBusyId(null);
    }
  };

  const pendingName = pending ? pending.user.name || pending.user.email : '';
  const confirmCopy = pending && {
    role: {
      title: t('azraqAdmin.confirm.roleTitle'),
      message: t('azraqAdmin.confirm.roleMessage', { name: pendingName, role: t(roleLabelKey(pending.payload.role)) }),
      action: t('azraqAdmin.confirm.roleAction'),
    },
    deactivate: {
      title: t('azraqAdmin.confirm.deactivateTitle'),
      message: t('azraqAdmin.confirm.deactivateMessage', { name: pendingName }),
      action: t('azraqAdmin.confirm.deactivateAction'),
    },
    activate: {
      title: t('azraqAdmin.confirm.activateTitle'),
      message: t('azraqAdmin.confirm.activateMessage', { name: pendingName }),
      action: t('azraqAdmin.confirm.activateAction'),
    },
  }[pending.kind];

  const totalPages = Math.max(1, Math.ceil((meta.total || 0) / (meta.perPage || 25)));

  return (
    <div>
      <TopBar title={t('adminUsers.title')} />
      <div className="p-7 px-8 space-y-6">
        <FadeIn>
          <h2 className="wp-page-title">{t('adminUsers.title')}</h2>
        </FadeIn>

        {/* أكواد الدعوة: في صفحة «دفعات الدعوة» */}
        <InvitationsLink t={t} />

        {azraq && (<>
        <OverviewBand
          page="users"
          summary={band.summary}
          loading={band.loading}
          error={band.error}
          scopeText={scopeText}
          tileLabel={(k) => t(`adminLists.users.tiles.${k}`)}
          tileIcon={(k) => USER_TILE_ICON[k]}
          tilePath={(k) => USER_TILE_PATH[k]}
          chartTitle={(k) => t(`adminLists.users.charts.${k}`)}
          itemLabel={(chart, item) => (chart === 'byRegion' ? regionLabel(item.key, lang) : t(roleLabelKey(item.key)))}
        />

        <div className="azq-tabs" role="tablist" aria-label={t('adminLists.users.tabsLabel')}>
          {USER_TABS.map((x) => (
            <button key={x} type="button" role="tab" aria-selected={tab === x} onClick={() => { setParam('tab', x); setPage(1); }}>
              {t(`adminLists.users.tab.${x}`)}
              {meta.counts?.[x] != null && <span className="azq-count">{meta.counts[x]}</span>}
            </button>
          ))}
        </div>
        </>)}

        <FadeIn delay={0.05}>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--wp-text-muted)]" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={t('adminUsers.searchPlaceholder')}
                aria-label={t('adminUsers.searchPlaceholder')}
                className="wp-input w-full ps-8 pe-3 py-2 text-sm"
              />
            </div>
            <select value={region} onChange={(e) => { setRegion(e.target.value); setPage(1); }} aria-label={t('azraqAdmin.filterRegion')} className="wp-input px-3 py-2 text-sm">
              <option value="">{t('adminApi.allRegions')}</option>
              {REGIONS.map((r) => <option key={r} value={r}>{regionLabel(r, lang)}</option>)}
            </select>
            <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} aria-label={t('azraqAdmin.filterRole')} className="wp-input px-3 py-2 text-sm">
              <option value="">{t('adminApi.allRoles')}</option>
              {ROLES.map((r) => <option key={r} value={r}>{t(roleLabelKey(r))}</option>)}
            </select>
            <select value={active} onChange={(e) => { setActive(e.target.value); setPage(1); }} aria-label={t('azraqAdmin.filterStatus')} className="wp-input px-3 py-2 text-sm">
              <option value="">{t('adminApi.allStatuses')}</option>
              <option value="1">{t('adminApi.active')}</option>
              <option value="0">{t('adminApi.inactive')}</option>
            </select>
            {seen && <ActiveFilter label={t('adminLists.activeFilter.seen', { n: seen })} onClear={() => { setParam('seen', ''); setPage(1); }} />}
            {participated && <ActiveFilter label={t('adminLists.activeFilter.participated', { n: participated })} onClear={() => { setParam('participated', ''); setPage(1); }} />}
          </div>
        </FadeIn>

        {error && <ErrorState error={error} onRetry={() => load()} />}

        <FadeIn delay={0.1}>
          <Card>
            <div className="relative" tabIndex={0} role="region" aria-label={t('adminUsers.title')}>
            <table className="w-full text-sm" aria-busy={loading}>
              <caption className="sr-only">{t('adminUsers.title')}</caption>
              <thead>
                <tr className="border-b border-[var(--wp-border)] text-[var(--wp-text-muted)] text-xs">
                  <th scope="col" className="text-start py-3 px-2 font-medium">{t('admin.name')}</th>
                  <th scope="col" className="text-start py-3 px-2 font-medium">{t('admin.email')}</th>
                  <th scope="col" className="text-start py-3 px-2 font-medium">{t('admin.region')}</th>
                  <th scope="col" className="text-start py-3 px-2 font-medium">{t('adminApi.points')}</th>
                  <th scope="col" className="text-start py-3 px-2 font-medium">{t('admin.role')}</th>
                  <th scope="col" className="text-start py-3 px-2 font-medium">{t('admin.status')}</th>
                  <th scope="col" className="text-start py-3 px-2 font-medium">{t('adminApi.joined')}</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={7} role="status" data-loading="" className="py-6 text-center text-[var(--wp-text-muted)]">{t('common.loading')}</td></tr>
                )}
                {!loading && users.length === 0 && (
                  <tr><td colSpan={7} className="py-6 text-center text-[var(--wp-text-muted)]">{t('common.noResults')}</td></tr>
                )}
                {!loading && users.map((user) => {
                  const manageable = assignable.includes(user.role);
                  return (
                  <ClickableRow key={user.id} className={`border-b border-[var(--wp-border)] hover:bg-[#F6F6F6] ${busyId === user.id ? 'opacity-50' : ''}`}>
                    <td className="py-3 px-2 font-medium text-[var(--wp-text)]"><RowLink to={`/admin/users/${encodeURIComponent(user.id)}`}>{user.name}</RowLink></td>
                    <td className="py-3 px-2 text-[var(--wp-text-muted)]">{user.email}</td>
                    <td className="py-3 px-2 text-[var(--wp-text-muted)]">{regionLabel(user.region, lang)}</td>
                    <td className="py-3 px-2 text-[var(--wp-text-muted)]">{user.points ?? 0}</td>
                    <td className="py-3 px-2">
                      <select
                        value={user.role}
                        disabled={busyId === user.id || !manageable}
                        onChange={(e) => askRole(user, e.target.value)}
                        aria-label={t('azraqAdmin.rowRole', { name: user.name || user.email })}
                        className="wp-input px-2 py-1 text-xs"
                      >
                        {(manageable ? assignable : [user.role]).map((r) => (
                          <option key={r} value={r}>{t(roleLabelKey(r))}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-2">
                      <button
                        onClick={() => askActive(user)}
                        disabled={busyId === user.id || !manageable}
                        aria-label={`${user.isActive ? t('adminApi.active') : t('adminApi.inactive')} — ${user.isActive ? t('adminApi.deactivate') : t('adminApi.activate')}: ${user.name || user.email}`}
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold transition-colors ${
                          user.isActive
                            ? 'bg-[var(--wp-success-tint)] text-[var(--wp-success)] hover:opacity-80'
                            : 'bg-[#F0F0F0] text-[var(--wp-text-3)] hover:opacity-80'
                        }`}
                        title={user.isActive ? t('adminApi.deactivate') : t('adminApi.activate')}
                      >
                        {user.isActive ? t('adminApi.active') : t('adminApi.inactive')}
                      </button>
                    </td>
                    <td className="py-3 px-2 text-[var(--wp-text-muted)]">{formatShortDate(user.createdAt, lang)}</td>
                  </ClickableRow>
                  );
                })}
              </tbody>
            </table>
            </div>

            {/* ترقيم الصفحات */}
            <div className="flex items-center justify-between mt-4 text-xs text-[var(--wp-text-muted)]">
              <span>{meta.total} · {t('adminApi.page')} {meta.page}/{totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || loading}
                  className="px-3 py-1.5 rounded-lg border border-[var(--wp-border-2)] disabled:opacity-40 hover:border-[var(--wp-coral)]"
                >
                  {t('adminApi.prev')}
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || loading}
                  className="px-3 py-1.5 rounded-lg border border-[var(--wp-border-2)] disabled:opacity-40 hover:border-[var(--wp-coral)]"
                >
                  {t('adminApi.next')}
                </button>
              </div>
            </div>
          </Card>
        </FadeIn>
      </div>

      {pending && (
        <ConfirmDialog
          title={confirmCopy.title}
          message={confirmCopy.message}
          confirmLabel={confirmCopy.action}
          danger={pending.kind === 'deactivate'}
          onConfirm={confirmPending}
          onClose={() => setPending(null)}
        />
      )}
    </div>
  );
}

// أكواد الدعوة انتقلت إلى صفحة «دفعات الدعوة» (/admin/invitations): هنا رابط إليها فقط.
function InvitationsLink({ t }) {
  return (
    <FadeIn delay={0.03}>
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-[var(--wp-ink)]">{t('inviteBatches.usersLink.title')}</h3>
          <p className="text-sm text-[var(--wp-text-3)]">{t('inviteBatches.usersLink.body')}</p>
        </div>
        <Link to="/admin/invitations" className="wp-btn-ink flex items-center gap-2 px-5 py-2.5 text-sm">
          <Ticket size={16} aria-hidden="true" /> {t('inviteBatches.usersLink.cta')}
        </Link>
      </Card>
    </FadeIn>
  );
}

export default function AdminUsers() {
  if (!USE_API) return <MockAdminUsers />;
  return <ApiAdminUsers />;
}
