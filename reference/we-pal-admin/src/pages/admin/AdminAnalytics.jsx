import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Activity, Download, Eye, FileText, Lock, Users } from 'lucide-react';
import TopBar from '../../components/Layout/TopBar';
import ChartTable from '../../components/Admin/ChartTable';
import { useLanguage } from '../../i18n/LanguageContext';
import { USE_API } from '../../config';
import { regionLabel } from '../../utils/apiMappers';
import ReportCard from './analytics/ReportCard';
import Sparkline from './analytics/Sparkline';
import WorldMap from './analytics/WorldMap';
import useReport from './analytics/useReport';
import { countryName } from './analytics/countries';
import { PRESETS, daysLabel, deltaPct, formatDay, formatNumber, periodLength, presetPeriod, todayIso } from './analytics/period';
import '../../styles/azraq-analytics.css';

/**
 * «التحليلات» (طلب أمجد 13 نوفمبر): الزيارات والخريطة والأكثر قراءة والأكثر تفاعلًا وتقارير البرنامج.
 * كل رقم من GET /admin/analytics/{report} (docs/ANALYTICS.md)، ولكل بطاقة مدّتها ومصدرها وتنزيل CSV.
 * ما لا يُقاس بعد يُكتب «غير مقاس بعد»، لا رقمًا افتراضيًا.
 */
const CONTENT_TYPES = ['news', 'analysis', 'story', 'resource', 'output'];
const PUBLIC_PATH = { news: '/news', analysis: '/blog', story: '/stories', resource: '/library', output: '/library' };

export default function AdminAnalytics() {
  const { t } = useLanguage();
  if (!USE_API) {
    return (
      <div>
        <TopBar title={t('analyticsPage.title')} />
        <div className="azq-home"><p className="azq-muted">{t('analyticsPage.mockMode')}</p></div>
      </div>
    );
  }
  return <ApiAdminAnalytics />;
}

function ApiAdminAnalytics() {
  const { t, lang } = useLanguage();
  const [period, setPeriod] = useState(() => presetPeriod(30));
  const [custom, setCustom] = useState({ from: period.from, to: period.to });
  const [type, setType] = useState('');

  const overview = useReport('overview', period);
  const days = periodLength(period);
  const since = overview.data?.trackingSince;

  const applyCustom = (e) => {
    e.preventDefault();
    if (custom.from && custom.to && custom.from <= custom.to) setPeriod({ ...custom, days: null });
  };

  const card = (id, report, extra = {}) => ({ id, report, period, extra, title: t(`analyticsPage.${id}.title`), source: t(`analyticsPage.${id}.source`) });

  return (
    <div>
      <TopBar title={t('analyticsPage.title')} />
      <div className="azq-home azq-an">
        <header className="azq-home-hero">
          <span className="azq-eyebrow">{t('analyticsPage.eyebrow')}</span>
          <h2 className="azq-home-title">{t('analyticsPage.title')}</h2>
          <p>{t('analyticsPage.lead')}</p>
        </header>

        <form className="azq-an-period" onSubmit={applyCustom} aria-label={t('analyticsPage.period.label')}>
          <div className="azq-an-seg" role="group" aria-label={t('analyticsPage.period.presets')}>
            {PRESETS.map((n) => (
              <button key={n} type="button" aria-pressed={period.days === n} onClick={() => { const p = presetPeriod(n); setPeriod(p); setCustom({ from: p.from, to: p.to }); }}>
                {t('analyticsPage.period.last', { days: daysLabel(n, lang) })}
              </button>
            ))}
          </div>
          <label>{t('analyticsPage.period.from')}<input type="date" value={custom.from} max={custom.to} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} /></label>
          <label>{t('analyticsPage.period.to')}<input type="date" value={custom.to} min={custom.from} max={todayIso()} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} /></label>
          <button type="submit" className="azq-btn-sm">{t('analyticsPage.period.apply')}</button>
          <span className="azq-an-period-scope">
            {t('analyticsPage.period.scope', { from: formatDay(period.from, lang, { day: 'numeric', month: 'long' }), to: formatDay(period.to, lang, { day: 'numeric', month: 'long', year: 'numeric' }), days: daysLabel(days, lang) })}
          </span>
        </form>

        {overview.data && (
          <p className={`azq-an-notice${since ? '' : ' is-warn'}`} role="status">
            {since ? t('analyticsPage.trackingSince', { date: formatDay(since, lang, { day: 'numeric', month: 'long', year: 'numeric' }) }) : t('analyticsPage.notMeasuredYet')}
          </p>
        )}
        <p className="azq-an-privacy"><Lock aria-hidden="true" />{t('analyticsPage.privacy')}</p>

        <KpiBand state={overview} />
        <TrafficCard {...card('traffic', 'overview')} state={overview} />
        <GeoSection card={card('geo', 'geo')} />
        <ContentSection card={card('content', 'content', type ? { type } : {})} type={type} setType={setType} />
        <MembersSection card={card('members', 'members')} />

        <div className="azq-hsec">
          <h3>{t('analyticsPage.reportsTitle')}</h3>
          <p>{t('analyticsPage.reportsLead')}</p>
        </div>
        <div className="azq-an-grid">
          <RetentionCard card={card('retention', 'retention')} />
          <FunnelCard card={card('funnel', 'funnel')} />
          <SourcesCard card={card('sources', 'sources')} />
          <CohortsCard card={card('cohorts', 'cohorts')} />
          <SearchCard card={card('search', 'search')} />
          <ModerationCard card={card('moderation', 'moderation')} />
          <PollsCard card={card('polls', 'polls')} />
        </div>
        <p className="azq-an-credit">
          {t('analyticsPage.geoCredit')} <a href="https://db-ip.com" target="_blank" rel="noopener noreferrer">IP Geolocation by DB-IP</a>
        </p>
      </div>
    </div>
  );
}

// ===== المؤشرات =====
function KpiBand({ state }) {
  const { t, lang } = useLanguage();
  const totals = state.data?.totals;
  if (!totals) return state.loading ? <div className="azq-skel" aria-hidden="true" /> : null;
  const measured = state.data.measured;
  const tiles = [
    { key: 'pageViews', icon: Eye, path: 'home', to: '#traffic', value: totals.pageViews, delta: deltaPct(totals.pageViews, totals.previousPageViews) },
    { key: 'visitorDays', icon: Users, path: 'work', to: '#geo', value: totals.visitorDays, delta: deltaPct(totals.visitorDays, totals.previousVisitorDays) },
    { key: 'contentViews', icon: FileText, path: 'lib', to: '#content', value: totals.contentViews },
    { key: 'downloads', icon: Download, path: 'vote', to: '#content', value: totals.downloads },
    { key: 'membersShare', icon: Activity, path: 'com', to: '#members', value: totals.membersShare, pct: true },
  ];
  return (
    <div className="azq-kpis azq-an-kpis">
      {tiles.map(({ key, icon: Icon, path, to, value, delta, pct }) => (
        <a key={key} href={to} className="azq-kpi" data-path={path} aria-describedby={`azq-an-src-${key}`}>
          <span className="azq-kpi-top">
            <span className="azq-tile" aria-hidden="true"><Icon /></span>
            <span className="azq-kpi-label">{t(`analyticsPage.kpi.${key}.label`)}</span>
          </span>
          <span className="azq-kpi-scope">{t('analyticsPage.kpi.scope')}</span>
          <span className="azq-kpi-value">
            {!measured || value === null ? <small>{t('analyticsPage.notMeasured')}</small> : <>{formatNumber(value, lang)}{pct ? '%' : ''}</>}
          </span>
          {delta !== null && delta !== undefined && measured && (
            <span className={`azq-kpi-delta${delta > 0 ? ' is-up' : delta < 0 ? ' is-down' : ''}`}>
              {t(delta >= 0 ? 'adminShell.kpi.deltaUp' : 'adminShell.kpi.deltaDown', { pct: Math.abs(delta) })}
            </span>
          )}
          <span id={`azq-an-src-${key}`} className="azq-an-kpi-src">{t(`analyticsPage.kpi.${key}.source`)}</span>
        </a>
      ))}
    </div>
  );
}

// ===== الزيارات اليومية =====
function TrafficCard({ state, ...card }) {
  const { t, lang } = useLanguage();
  return (
    <ReportCard {...card} state={state} wide>
      {(data) => {
        if (!data.measured) return <NotMeasured />;
        const rows = data.series.map((r) => ({ ...r, label: formatDay(r.day, lang) }));
        return (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
                <XAxis dataKey="label" minTickGap={24} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Area isAnimationActive={false} type="monotone" dataKey="views" name={t('analyticsPage.traffic.views')} stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.15} />
                <Area isAnimationActive={false} type="monotone" dataKey="visitors" name={t('analyticsPage.traffic.visitors')} stroke="var(--chart-3)" fill="var(--chart-3)" fillOpacity={0.15} />
              </AreaChart>
            </ResponsiveContainer>
            <ChartTable
              caption={card.title}
              columns={[{ key: 'label', label: t('analyticsPage.day') }, { key: 'views', label: t('analyticsPage.traffic.views') }, { key: 'visitors', label: t('analyticsPage.traffic.visitors') }]}
              rows={rows}
            />
            <p className="azq-an-note">{t('analyticsPage.traffic.note')}</p>
          </>
        );
      }}
    </ReportCard>
  );
}

// ===== الخريطة =====
function GeoSection({ card }) {
  const { t, lang } = useLanguage();
  const state = useReport('geo', card.period);
  const unknown = t('analyticsPage.geo.unknown');
  return (
    <ReportCard {...card} state={state} wide>
      {(data) => (
        <div className="azq-an-geo">
          <div>
            {data.geoAvailable ? <WorldMap countries={data.countries} /> : <NotMeasured text={t('analyticsPage.geo.noDb')} />}
          </div>
          <div className="azq-an-side">
            <h4>{t('analyticsPage.geo.countries')}</h4>
            <Table
              empty={t('analyticsPage.empty')}
              cols={[t('analyticsPage.geo.country'), t('analyticsPage.traffic.visitors'), t('analyticsPage.traffic.views')]}
              rows={data.countries.slice(0, 12).map((r) => [countryName(r.country, lang, unknown), formatNumber(r.visitors, lang), formatNumber(r.views, lang)])}
            />
            {data.cities.length > 0 && (
              <>
                <h4>{t('analyticsPage.geo.cities')}</h4>
                <Table
                  cols={[t('analyticsPage.geo.city'), t('analyticsPage.traffic.visitors')]}
                  rows={data.cities.slice(0, 10).map((r) => [`${r.city}${r.region ? `، ${r.region}` : ''} (${countryName(r.country, lang, unknown)})`, formatNumber(r.visitors, lang)])}
                />
              </>
            )}
            <h4>{t('analyticsPage.geo.members')}</h4>
            <Table
              cols={[t('analyticsPage.geo.region'), t('analyticsPage.geo.memberCount')]}
              rows={data.memberRegions.map((r) => [regionLabel(r.region, lang), <Link key={r.region} to="/admin/users">{formatNumber(r.members, lang)}</Link>])}
              empty={t('analyticsPage.empty')}
            />
            {data.memberGovernorates.length > 0 && (
              <>
                <h4>{t('analyticsPage.geo.governorates')}</h4>
                <Table
                  cols={[t('analyticsPage.geo.governorate'), t('analyticsPage.geo.memberCount')]}
                  rows={data.memberGovernorates.map((r) => [t(`analyticsPage.gov.${r.governorate}`), formatNumber(r.members, lang)])}
                />
                <p className="azq-an-note">{t('analyticsPage.geo.govNote', { min: data.minCell })}</p>
              </>
            )}
          </div>
        </div>
      )}
    </ReportCard>
  );
}

// ===== الأكثر قراءة =====
function ContentSection({ card, type, setType }) {
  const { t, lang } = useLanguage();
  const state = useReport('content', card.period, card.extra);
  const typeLabel = (k) => t(`analyticsPage.types.${k}`);
  return (
    <ReportCard {...card} state={state} wide>
      {(data) => (
        <>
          <div className="azq-an-seg" role="group" aria-label={t('analyticsPage.content.filter')}>
            {['', ...CONTENT_TYPES].map((k) => (
              <button key={k || 'all'} type="button" aria-pressed={type === k} onClick={() => setType(k)}>{k ? typeLabel(k) : t('analyticsPage.content.all')}</button>
            ))}
          </div>
          <Table
            empty={t('analyticsPage.notMeasuredContent')}
            cols={['#', t('analyticsPage.content.item'), t('analyticsPage.content.type'), t('analyticsPage.content.unique'), t('analyticsPage.traffic.views'), t('analyticsPage.content.trend')]}
            rows={data.items.map((r, i) => [
              i + 1,
              <a key={r.id} href={`${PUBLIC_PATH[r.type]}/${encodeURIComponent(r.slug || r.id)}`} target="_blank" rel="noopener noreferrer">{r.title || t('analyticsPage.content.deleted')}</a>,
              typeLabel(r.type),
              formatNumber(r.views, lang),
              formatNumber(r.hits, lang),
              <Sparkline key={`s-${r.id}`} values={r.spark} label={t('analyticsPage.content.trendFor', { title: r.title || '' })} />,
            ])}
          />
          <div className="azq-an-two">
            <div>
              <h4>{t('analyticsPage.content.downloads')}</h4>
              <Table
                empty={t('analyticsPage.empty')}
                cols={[t('analyticsPage.content.item'), t('analyticsPage.content.inPeriod'), t('analyticsPage.content.allTime')]}
                rows={data.downloads.map((r) => [<Link key={r.id} to="/admin/library">{r.title || t('analyticsPage.content.deleted')}</Link>, formatNumber(r.downloads, lang), formatNumber(r.allTime, lang)])}
              />
            </div>
            <div>
              <h4>{t('analyticsPage.content.pages')}</h4>
              <Table
                empty={t('analyticsPage.empty')}
                cols={[t('analyticsPage.content.section'), t('analyticsPage.traffic.visitors'), t('analyticsPage.traffic.views')]}
                rows={data.pages.map((r) => [<a key={r.section} href={r.section.replace('/*', '')} target="_blank" rel="noopener noreferrer" dir="ltr">{r.section}</a>, formatNumber(r.visitors, lang), formatNumber(r.views, lang)])}
              />
            </div>
          </div>
          <h4>{t('analyticsPage.content.byLang')}</h4>
          <Table
            empty={t('analyticsPage.empty')}
            cols={[t('analyticsPage.content.type'), t('analyticsPage.content.lang'), t('analyticsPage.content.unique')]}
            rows={data.byTypeLang.map((r) => [typeLabel(r.type), t(`analyticsPage.langs.${r.lang === '??' ? 'unknown' : r.lang}`), formatNumber(r.views, lang)])}
          />
        </>
      )}
    </ReportCard>
  );
}

// ===== الأكثر تفاعلًا =====
function MembersSection({ card }) {
  const { t, lang } = useLanguage();
  const state = useReport('members', card.period);
  const metrics = ['posts', 'comments', 'replies', 'votes', 'tasks', 'updates'];
  return (
    <ReportCard {...card} state={state} wide>
      {(data) => (
        <>
          <p className="azq-an-note">
            {t('analyticsPage.members.formula')}{' '}
            {metrics.map((m) => `${t(`analyticsPage.members.m.${m}`)} × ${data.weights[m]}`).join(' + ')}
          </p>
          <Table
            empty={t('analyticsPage.empty')}
            cols={['#', t('analyticsPage.members.member'), t('analyticsPage.geo.region'), ...metrics.map((m) => t(`analyticsPage.members.m.${m}`)), t('analyticsPage.members.score')]}
            rows={data.members.map((r, i) => [
              i + 1,
              <Link key={r.id} to={`/admin/users?q=${encodeURIComponent(r.name)}`}>{r.name}</Link>,
              regionLabel(r.region, lang),
              ...metrics.map((m) => formatNumber(r[m], lang)),
              <b key="s">{formatNumber(r.score, lang)}</b>,
            ])}
          />
          <p className="azq-an-note">{t('analyticsPage.members.active', { count: data.activeMembers })}</p>
        </>
      )}
    </ReportCard>
  );
}

// ===== التقارير =====
function RetentionCard({ card }) {
  const { t, lang } = useLanguage();
  const state = useReport('retention', card.period);
  return (
    <ReportCard {...card} state={state}>
      {(data) => {
        const rows = data.months.map((m) => ({ ...m, label: formatDay(`${m.month}-01`, lang, { month: 'short', year: '2-digit' }) }));
        return (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="active" name={t('analyticsPage.retention.active')} fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="retained" name={t('analyticsPage.retention.retained')} fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="newMembers" name={t('analyticsPage.retention.new')} fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <ChartTable
              caption={card.title}
              columns={[{ key: 'label', label: t('analyticsPage.month') }, { key: 'active', label: t('analyticsPage.retention.active') }, { key: 'retained', label: t('analyticsPage.retention.retained') }, { key: 'newMembers', label: t('analyticsPage.retention.new') }]}
              rows={rows}
            />
            <p className="azq-an-note">{t('analyticsPage.retention.note', { total: formatNumber(data.totalMembers, lang) })}</p>
          </>
        );
      }}
    </ReportCard>
  );
}

function FunnelCard({ card }) {
  const { t, lang } = useLanguage();
  const state = useReport('funnel', card.period);
  return (
    <ReportCard {...card} state={state}>
      {(data) => {
        const max = Math.max(1, ...data.steps.filter((s) => s.measured).map((s) => s.count));
        return (
          <>
            <ol className="azq-an-funnel">
              {data.steps.map((s) => (
                <li key={s.step}>
                  <span className="azq-an-funnel-l">{t(`analyticsPage.funnel.${s.step}`)}</span>
                  {s.measured ? (
                    <span className="azq-an-funnel-bar"><span className="azq-an-funnel-track" aria-hidden="true"><i style={{ inlineSize: `${Math.max(2, (s.count / max) * 100)}%` }} /></span><b>{formatNumber(s.count, lang)}</b></span>
                  ) : <small>{t('analyticsPage.notMeasured')}</small>}
                </li>
              ))}
            </ol>
            <p className="azq-an-note">{t('analyticsPage.funnel.note')}</p>
          </>
        );
      }}
    </ReportCard>
  );
}

function SourcesCard({ card }) {
  const { t, lang } = useLanguage();
  const state = useReport('sources', card.period);
  return (
    <ReportCard {...card} state={state}>
      {(data) => (
        <>
          <Table
            empty={t('analyticsPage.empty')}
            cols={[t('analyticsPage.sources.referrer'), t('analyticsPage.sources.visits')]}
            rows={data.referrers.map((r) => [r.host ? <span dir="ltr">{r.host}</span> : t('analyticsPage.sources.direct'), formatNumber(r.visits, lang)])}
          />
          <div className="azq-an-two">
            <Table cols={[t('analyticsPage.sources.device'), t('analyticsPage.traffic.visitors')]} rows={data.devices.map((r) => [t(`analyticsPage.devices.${r.device || 'unknown'}`), formatNumber(r.visitors, lang)])} empty={t('analyticsPage.empty')} />
            <Table cols={[t('analyticsPage.content.lang'), t('analyticsPage.traffic.visitors')]} rows={data.languages.map((r) => [t(`analyticsPage.langs.${r.lang || 'unknown'}`), formatNumber(r.visitors, lang)])} empty={t('analyticsPage.empty')} />
          </div>
        </>
      )}
    </ReportCard>
  );
}

function CohortsCard({ card }) {
  const { t, lang } = useLanguage();
  const state = useReport('cohorts', card.period);
  return (
    <ReportCard {...card} state={state}>
      {(data) => (
        <Table
          empty={t('analyticsPage.empty')}
          cols={[t('analyticsPage.cohorts.batch'), t('analyticsPage.geo.region'), t('analyticsPage.cohorts.members')]}
          rows={data.rows.map((r) => [
            r.batchId ? <Link key={r.batchId} to={`/admin/invitations/${r.batchId}`}>{r.batch}</Link> : t('analyticsPage.cohorts.noBatch'),
            regionLabel(r.region, lang),
            formatNumber(r.members, lang),
          ])}
        />
      )}
    </ReportCard>
  );
}

function SearchCard({ card }) {
  const { t, lang } = useLanguage();
  const state = useReport('search', card.period);
  return (
    <ReportCard {...card} state={state}>
      {(data) => (
        <>
          <p className="azq-an-stat">
            <Link to="/admin/search-queries">{t('analyticsPage.search.summary', { zero: formatNumber(data.zeroResults, lang), total: formatNumber(data.total, lang) })}</Link>
          </p>
          <Table
            empty={t('analyticsPage.empty')}
            cols={[t('analyticsPage.search.query'), t('analyticsPage.search.times')]}
            rows={data.top.map((r) => [r.query, formatNumber(r.times, lang)])}
          />
        </>
      )}
    </ReportCard>
  );
}

function ModerationCard({ card }) {
  const { t, lang } = useLanguage();
  const state = useReport('moderation', card.period);
  return (
    <ReportCard {...card} state={state}>
      {(data) => (
        <>
          <dl className="azq-an-facts">
            {['received', 'handled', 'openNow'].map((k) => (
              <div key={k}><dt>{t(`analyticsPage.moderation.${k}`)}</dt><dd><Link to="/admin/reports">{formatNumber(data[k], lang)}</Link></dd></div>
            ))}
            <div>
              <dt>{t('analyticsPage.moderation.median')}</dt>
              <dd>{data.medianHoursToHandle === null ? <small>{t('analyticsPage.moderation.noneHandled')}</small> : t('analyticsPage.moderation.hours', { count: formatNumber(data.medianHoursToHandle, lang) })}</dd>
            </div>
          </dl>
          <Table empty={t('analyticsPage.empty')} cols={[t('analyticsPage.moderation.reason'), t('analyticsPage.moderation.received')]} rows={data.reasons.map((r) => [r.reason, formatNumber(r.count, lang)])} />
        </>
      )}
    </ReportCard>
  );
}

function PollsCard({ card }) {
  const { t, lang } = useLanguage();
  const state = useReport('polls', card.period);
  return (
    <ReportCard {...card} state={state}>
      {(data) => (
        <Table
          empty={t('analyticsPage.empty')}
          cols={[t('analyticsPage.polls.poll'), t('analyticsPage.polls.audience'), t('analyticsPage.polls.participants'), t('analyticsPage.polls.rate')]}
          rows={data.polls.map((r) => [
            <Link key={r.id} to="/admin/surveys">{r.title}</Link>,
            t(`analyticsPage.polls.${r.audience}`),
            formatNumber(r.votes, lang),
            r.rate === null ? '—' : `${formatNumber(r.rate, lang)}%`,
          ])}
        />
      )}
    </ReportCard>
  );
}

// ===== أدوات =====
function NotMeasured({ text }) {
  const { t } = useLanguage();
  return <p className="azq-an-empty">{text ?? t('analyticsPage.notMeasuredYet')}</p>;
}

function Table({ cols, rows, empty }) {
  const body = useMemo(() => rows, [rows]);
  if (body.length === 0) return <p className="azq-an-empty">{empty}</p>;
  return (
    <div className="azq-an-table">
      <table>
        <thead><tr>{cols.map((c) => <th key={String(c)} scope="col">{c}</th>)}</tr></thead>
        <tbody>
          {body.map((r, i) => (
             
            <tr key={i}>{r.map((cell, j) => (j === 0 ? <th key={j} scope="row">{cell}</th> : <td key={j}>{cell}</td>))}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
