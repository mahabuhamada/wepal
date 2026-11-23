import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowUpLeft, Award, BookOpen, Briefcase, CheckCircle2, ClipboardCheck, Flag, Globe2, GraduationCap,
  Inbox, Mail, MapPin, Send, ShieldAlert, Target, Users, Vote,
} from 'lucide-react';
import TopBar from '../../components/Layout/TopBar';
import ErrorState from '../../components/common/ErrorState';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission } from '../../utils/roles';
import { auditActionLabel, regionLabel, relativeTime } from '../../utils/apiMappers';
import { useAdminShell } from '../../components/Layout/adminShellContext';
import { ROW_PATH } from '../../components/Layout/adminNav';
import { kpiDelta, kpiPercent } from './adminHomeMath';
import AdminStatsSection from './AdminStatsSection';
import { ClickableRow, RowLink } from '../../components/common/ClickableRow';

const ROW_ICON = {
  reports: Flag, proposals: Briefcase, publish: Send, outcomes: ClipboardCheck, translations: Globe2,
  inbox: Inbox, courses: GraduationCap, invitations: Mail, twoFactor: ShieldAlert,
};

const KPI = {
  activeMembers: { icon: Users, path: 'work' },
  regions: { icon: MapPin, path: 'com' },
  workspaces: { icon: Target, path: 'lib' },
  outputs: { icon: Award, path: 'ok' },
  participants: { icon: Vote, path: 'vote' },
  invitations: { icon: Mail, path: 'home' },
};

const SEGMENT_COLORS = ['var(--chart-1)', 'var(--chart-3)', 'var(--chart-2)', 'var(--chart-4)', 'var(--chart-5)'];
const STAGE_COLORS = ['var(--seq-1)', 'var(--seq-2)', 'var(--seq-3)', 'var(--seq-4)', 'var(--seq-5)'];

/**
 * رئيسية الإدارة (خطة لوحة الإدارة 4.2، النموذج المعتمد): «يحتاج إلى انتباهك» صفوفًا مرقّمة حسب صلاحيات القارئ،
 * ثم «النشاط الأخير»، ثم مؤشرات البرنامج (لكل رقم مدّته ومصدره، وكل بطاقة تفتح قائمتها)، ثم الإحصاءات
 * (دُمجت هنا بقرار أمجد أ). الأرقام كلها من GET /admin/summary، الذي تجلبه القشرة وتتشاركه مع الشريط والجرس.
 */
export default function AdminHome() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const { summary, summaryError, reloadSummary, summaryDays = 30, setSummaryDays } = useAdminShell();
  const canStats = hasPermission(user, 'stats.view');
  const loading = !summary && !summaryError;
  const rows = summary?.attention ?? [];
  const firstName = (user?.name || '').split(' ')[0];
  const hour = new Date().getHours();

  return (
    <div>
      <TopBar title={t('adminShell.nav.home')} />
      <div className="azq-home">
        <header className="azq-home-hero">
          <span className="azq-eyebrow">{t(hour < 12 ? 'adminShell.home.morning' : 'adminShell.home.evening', { name: firstName })}</span>
          <h2 className="azq-home-title">
            {loading ? t('common.loading') : rows.length ? t('adminShell.home.waitingTitle', { count: rows.length }) : t('adminShell.home.nothing')}
          </h2>
          <p>{t('adminShell.home.lead')}</p>
        </header>

        {summaryError && <ErrorState error={summaryError} onRetry={reloadSummary} />}

        <div className="azq-home-top">
          <section className="azq-card azq-attn" aria-labelledby="azq-attn-h" aria-busy={loading}>
            <div className="azq-card-h">
              <h3 id="azq-attn-h"><AlertTriangle aria-hidden="true" />{t('adminShell.home.attention')}</h3>
              <span className="azq-muted">{t('adminShell.home.oldestFirst')}</span>
            </div>
            {loading && <div className="azq-skel" aria-hidden="true" />}
            {!loading && rows.length === 0 && (
              <p className="azq-attn-empty"><CheckCircle2 aria-hidden="true" />{t('adminShell.home.nothing')}</p>
            )}
            {rows.length > 0 && (
              <ol className="azq-rows">
                {rows.map((row, i) => <AttentionRow key={row.key} row={row} index={i} />)}
              </ol>
            )}
          </section>

          {(summary?.recent?.length ?? 0) > 0 && (
            <section className="azq-card" aria-labelledby="azq-recent-h">
              <div className="azq-card-h">
                <div>
                  <h3 id="azq-recent-h">{t('adminShell.home.recent')}</h3>
                  <span className="azq-card-sub">{t('adminShell.home.recentSub')}</span>
                </div>
                <Link className="azq-btn-ghost" to="/admin/activities">{t('adminShell.home.auditLog')}</Link>
              </div>
              <ul className="azq-tl">
                {summary.recent.map((item) => (
                  <li key={item.id}>
                    <span className="azq-tile" data-path="none" aria-hidden="true"><ArrowUpLeft /></span>
                    <span className="azq-tl-tx">
                      <b>{item.actor || t('adminShell.home.system')}</b> {auditActionLabel(item.action, lang)}
                      {item.label ? <> «{item.label}»</> : null}
                      <small>{relativeTime(item.at, lang, t)}</small>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {canStats && (summary?.kpis?.length ?? 0) > 0 && (
          <>
            <div className="azq-hsec">
              <h3>{t('adminShell.home.kpisTitle')}</h3>
              <p>{t('adminShell.home.kpisLead')}</p>
              {setSummaryDays && (
                <div className="azq-tabs azq-period" role="radiogroup" aria-label={t('adminLists.period.label')}>
                  {[7, 30, 90].map((d) => (
                    <button key={d} type="button" role="radio" aria-checked={summaryDays === d} aria-selected={summaryDays === d} onClick={() => setSummaryDays(d)}>
                      {t(`adminLists.period.d${d}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="azq-kpis">
              {summary.kpis.map((kpi) => <KpiTile key={kpi.key} kpi={kpi} days={summaryDays} />)}
            </div>
          </>
        )}

        {canStats && <AdminStatsSection />}
      </div>
    </div>
  );
}

function AttentionRow({ row, index }) {
  const { t, lang } = useLanguage();
  const Icon = ROW_ICON[row.key] ?? Flag;
  const key = `adminShell.attention.${row.key}`;
  let meta = row.oldestAt ? t('adminShell.home.oldest', { when: relativeTime(row.oldestAt, lang, t) }) : '';
  if (row.key === 'invitations' && row.soonestAt) meta = t(`${key}.meta`, { name: row.soonestName ?? '', when: new Date(row.soonestAt).toLocaleDateString(lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB') });
  if (row.key === 'twoFactor') meta = (row.people ?? []).map((p) => p.name).join('، ');
  if (row.key === 'translations') meta = t(`${key}.meta`);

  return (
    <ClickableRow as="li" className="azq-row" data-path={ROW_PATH[row.key] ?? 'none'}>
      <span className="azq-row-n" aria-hidden="true">{index + 1}</span>
      <span className="azq-tile" aria-hidden="true"><Icon /></span>
      <span className="azq-row-txt">
        <b>
          <span className="azq-cb"><span className="sr-only">{t('adminShell.home.countLabel')} </span>{row.count}</span>
          <RowLink to={row.to}>{t(`${key}.title`)}</RowLink>
        </b>
        {meta && <small>{meta}</small>}
        {row.key === 'translations' && (row.items?.length ?? 0) > 0 && (
          <span className="azq-chips">
            {row.items.map((item) => (
              <Link key={`${item.type}-${item.id}`} className="azq-chip" to={item.to}>
                {t('adminShell.attention.translations.chip', { type: t(`adminShell.contentType.${item.type}`), title: item.title })}
              </Link>
            ))}
          </span>
        )}
      </span>
      <Link className="azq-btn-sm" to={row.to} tabIndex={-1} aria-hidden="true">{t(`${key}.action`)}</Link>
    </ClickableRow>
  );
}

function KpiTile({ kpi, days = 30 }) {
  const { t, lang } = useLanguage();
  const { icon: Icon, path } = KPI[kpi.key] ?? { icon: BookOpen, path: 'none' };
  const delta = kpiDelta(kpi.value, kpi.previous);
  const total = (kpi.segments ?? []).reduce((s, x) => s + x.value, 0);
  const colors = kpi.key === 'workspaces' ? STAGE_COLORS : SEGMENT_COLORS;
  const segLabel = (seg) => (kpi.key === 'regions' ? regionLabel(seg.key, lang) : t(`adminShell.stage.${seg.key}`));
  const source = t('adminShell.kpi.source', { source: t(`adminShell.kpi.sources.${kpi.key}`) });

  let sub = '';
  if (kpi.of != null) sub = t(`adminShell.kpi.${kpi.key}.of`, { count: kpi.of });
  else if (kpi.recent != null) sub = t('adminShell.kpi.outputs.recent', { count: kpi.recent, days });
  else sub = t(`adminShell.kpi.${kpi.key}.unit`);

  // بطاقة بلا صفحة ترشَّح بما تعدّه (المساحات) نص لا رابط (docs/ADMIN-UX.md §2)
  const Tile = kpi.to ? Link : 'div';
  return (
    <Tile {...(kpi.to && { to: kpi.to })} className="azq-kpi" data-path={path} title={source} aria-describedby={`azq-kpi-src-${kpi.key}`}>
      <span className="azq-kpi-top">
        <span className="azq-tile" aria-hidden="true"><Icon /></span>
        <span className="azq-kpi-label">{t(`adminShell.kpi.${kpi.key}.label`)}</span>
      </span>
      <span className="azq-kpi-scope">{t(kpi.scope?.startsWith('last') ? `adminLists.band.scope.${kpi.scope}` : `adminShell.kpi.scope.${kpi.scope}`)}</span>
      <span className="azq-kpi-value">{kpi.value.toLocaleString(lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB')} <small>{sub}</small></span>
      {delta !== null && (
        <span className={`azq-kpi-delta${delta > 0 ? ' is-up' : delta < 0 ? ' is-down' : ''}`}>
          {t(delta >= 0 ? 'adminShell.kpi.deltaUp' : 'adminShell.kpi.deltaDown', { pct: Math.abs(delta), days: kpi.scope?.replace('last', '') || 30 })}
        </span>
      )}
      {kpi.segments && total > 0 && (
        <>
          <span className="azq-segbar" aria-hidden="true">
            {kpi.segments.filter((s) => s.value > 0).map((s) => (
              <span key={s.key} style={{ flex: s.value, background: colors[kpi.segments.indexOf(s) % colors.length] }} />
            ))}
          </span>
          <span className="azq-seglegend">
            {kpi.segments.map((s, i) => (
              <span key={s.key}><i style={{ background: colors[i % colors.length] }} aria-hidden="true" />{segLabel(s)} {kpi.key === 'regions' ? `${kpiPercent(s.value, total)}%` : s.value}</span>
            ))}
          </span>
        </>
      )}
      {kpi.key === 'invitations' && kpi.of > 0 && (
        <span className="azq-meter" aria-hidden="true"><span style={{ inlineSize: `${kpiPercent(kpi.value, kpi.of)}%` }} /></span>
      )}
      <span id={`azq-kpi-src-${kpi.key}`} className="sr-only">{source}</span>
    </Tile>
  );
}
