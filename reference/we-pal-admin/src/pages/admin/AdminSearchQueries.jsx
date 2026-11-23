import { useId, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SearchX, Search, HelpCircle, ExternalLink } from 'lucide-react';
import TopBar from '../../components/Layout/TopBar';
import Card from '../../components/common/Card';
import PageHeader from '../../components/ui/PageHeader';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import FeatureUnavailable from '../../components/common/FeatureUnavailable';
import LoadMore from '../../components/common/LoadMore';
import { SearchQueriesOverview } from '../../components/Admin/ListOverviews';
import { useLanguage } from '../../i18n/LanguageContext';
import { useTheme } from '../../theme/ThemeContext';
import { USE_API } from '../../config';
import { unwrapList } from '../../api/client';
import * as adminApi from '../../api/admin';
import useInfiniteList from '../../hooks/useInfiniteList';
import { formatShortDate } from '../../utils/apiMappers';
import { addFaqPath } from '../../utils/assistantHub';
import { ClickableRow, RowLink } from '../../components/common/ClickableRow';

// public_ask («اسأل» في الموقع العام) يصل مع فرع feat/public-ask-box؛ ومصدر لا تعرفه الواجهة يُعرض «غير معروف».
const SOURCES = ['all', 'ask', 'public_ask', 'library', 'search'];
const AREAS = ['all', 'public', 'members'];
const STATUSES = ['unanswered', 'answered', 'all'];
const RETENTION_DAYS = 90;
const EMPTY_KEY = { unanswered: 'empty', answered: 'emptyAnswered', all: 'emptyAll' };

// الشهر الحالي بتوقيت المتصفح: YYYY-MM (قيمة <input type="month">).
const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const pick = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback);

// اسم المصدر، و«غير معروف» لمصدر يضيفه الخادم ولا تعرفه الواجهة بعد
const sourceLabel = (t, source) => (SOURCES.includes(source) ? t(`azraqAdmin.searchQueries.sources.${source}`) : t('azraqAdmin.searchQueries.unknown'));

const chip = 'rounded-full border border-[var(--wp-border)] px-2.5 py-0.5';
const action = 'inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-[var(--wp-border-2)] px-3 text-xs font-semibold text-[var(--wp-ink)] hover:border-[var(--wp-coral)] hover:text-[var(--wp-coral)]';

// ملخص الشهر في التصميم الحالي؛ في «أزرق هادئ» يحلّ محله شريط «نظرة عامة».
function Summary({ summary }) {
  const { t } = useLanguage();
  if (!summary) return null;
  const tiles = [
    ['summaryAsks', summary.asks],
    ['summaryUnansweredAsks', summary.unansweredAsks],
    ['summaryUnanswered', summary.unanswered],
  ];
  return (
    <dl className="grid gap-3 sm:grid-cols-3" aria-label={t('azraqAdmin.searchQueries.summaryLabel')}>
      {tiles.map(([key, value]) => (
        <Card key={key} className="flex flex-col gap-1">
          <dt className="text-xs text-[var(--wp-text-muted)]">{t(`azraqAdmin.searchQueries.${key}`)}</dt>
          <dd className="text-2xl font-bold text-[var(--wp-ink)]">{value ?? 0}</dd>
        </Card>
      ))}
    </dl>
  );
}

function QueryRow({ row }) {
  const { t, lang } = useLanguage();
  const answered = row.status === 'answered';
  // الهدف الأساسي: الأسئلة الشائعة المرتبطة إن وُجدت، وإلا إضافة سؤال شائع بهذا النص.
  const primaryTo = row.faqId ? `/admin/editor/faq/${encodeURIComponent(row.faqId)}` : addFaqPath(row.query);
  return (
    <ClickableRow as="div" className="ui-card flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <b className="break-words text-sm text-[var(--wp-ink)]" dir="auto"><RowLink to={primaryTo}>{row.query}</RowLink></b>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${answered
              ? 'bg-[var(--wp-success-tint)] text-[var(--wp-success)]'
              : 'bg-[var(--wp-coral-wash)] text-[var(--wp-coral-deep)]'}`}
          >
            {t(`azraqAdmin.searchQueries.badge.${answered ? 'answered' : 'unanswered'}`)}
          </span>
          {row.faqId && <span className={`${chip} text-xs`}>{t('azraqAdmin.searchQueries.badge.faq')}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--wp-text-muted)]">
          <span className="font-semibold text-[var(--wp-text-2)]">{t('azraqAdmin.searchQueries.times', { count: row.count })}</span>
          <span title={t('azraqAdmin.searchQueries.askersHint')}>
            {row.askers == null ? t('azraqAdmin.searchQueries.askersUnknown') : t('azraqAdmin.searchQueries.askers', { count: row.askers })}
          </span>
          {row.areas.map((a) => <span key={a} className={chip}>{AREAS.includes(a) ? t(`azraqAdmin.searchQueries.areas.${a}`) : t('azraqAdmin.searchQueries.unknown')}</span>)}
          {row.sources.map((s) => <span key={s} className={chip}>{sourceLabel(t, s)}</span>)}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--wp-text-muted)]">
          {row.firstSeenAt && <span>{t('azraqAdmin.searchQueries.firstSeen', { date: formatShortDate(row.firstSeenAt, lang) })}</span>}
          {row.lastSeenAt && <span>{t('azraqAdmin.searchQueries.lastSeen', { date: formatShortDate(row.lastSeenAt, lang) })}</span>}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {row.faqId ? (
          <Link to={primaryTo} className={action} aria-label={`${t('azraqAdmin.searchQueries.openFaq')}: ${row.query}`}>
            <ExternalLink size={14} aria-hidden="true" />
            {t('azraqAdmin.searchQueries.openFaq')}
          </Link>
        ) : (
          <Link to={primaryTo} className={action} aria-label={`${t('azraqAdmin.searchQueries.addFaq')}: ${row.query}`}>
            <HelpCircle size={14} aria-hidden="true" />
            {t('azraqAdmin.searchQueries.addFaq')}
          </Link>
        )}
        <Link
          to={`/library?q=${encodeURIComponent(row.query)}`}
          className={action}
          aria-label={`${t('azraqAdmin.searchQueries.searchLibrary')}: ${row.query}`}
        >
          <Search size={14} aria-hidden="true" />
          {t('azraqAdmin.searchQueries.searchLibrary')}
        </Link>
      </div>
    </ClickableRow>
  );
}

/**
 * «أسئلة البحث» (للمحرر والمدير): ما سأل عنه الناس في الشهر، سطر لكل سؤال: هل وجد جوابًا (أو أُضيف له سؤال
 * شائع)، وكم مرة ومن كم شخص، ومن سأله (عضو داخل أو زائر)، ومن أين (المكتبة أو البحث العام أو المساعد)،
 * وأول مرة وآخر مرة. «أضفه للأسئلة الشائعة» يفتح المحرّر بالسؤال ويربطه به. المرشّحات في الرابط، فبطاقات
 * «نظرة عامة» تفتح القائمة مرشَّحة. السجل بلا أسماء ولا حسابات ولا IP، ويُحذف بعد 90 يومًا.
 */
export default function AdminSearchQueries() {
  const { t } = useLanguage();
  const azraq = useTheme().theme === 'azraq';
  const [params, setParams] = useSearchParams();
  const month = /^\d{4}-\d{2}$/.test(params.get('month') ?? '') ? params.get('month') : currentMonth();
  const source = pick(params.get('source'), SOURCES, 'all');
  const area = pick(params.get('area'), AREAS, 'all');
  const status = pick(params.get('status'), STATUSES, 'unanswered');
  const [report, setReport] = useState(null);
  const monthId = useId();
  const sourceId = useId();
  const areaId = useId();

  const setFilter = (key, value) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(key, value);
      return next;
    }, { replace: true });
  };

  const filters = { month, source: source === 'all' ? undefined : source, area: area === 'all' ? undefined : area, status };
  const list = useInfiniteList(async (page) => {
    const res = await adminApi.getSearchQueryReport({ ...filters, page });
    if (page === 1) setReport({ summary: res?.summary ?? null, days: res?.retentionDays ?? RETENTION_DAYS });
    return unwrapList(res);
  }, [month, source, area, status]);

  if (!USE_API) return <FeatureUnavailable backTo="/admin" />;

  const rows = list.items.map((row) => ({ ...row, sources: row.sources ?? [], areas: row.areas ?? [] }));

  return (
    <div>
      <TopBar title={t('azraqAdmin.searchQueries.title')} />
      <div className="p-7 px-8 space-y-6">
        {/* ترويسة النظام (كالأسئلة الشائعة والمقترحات): ألوان العنوان والوصف من الرموز، بلا ظهور تدريجي */}
        <PageHeader
          as="h2"
          title={t('azraqAdmin.searchQueries.title')}
          subtitle={t('azraqAdmin.searchQueries.subtitle', { days: report?.days ?? RETENTION_DAYS })}
        />

        <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('azraqAdmin.searchQueries.statusLabel')}>
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={status === s}
              onClick={() => setFilter('status', s)}
              className={`min-h-11 rounded-xl border px-4 text-sm font-semibold ${status === s
                ? 'border-[var(--wp-coral)] bg-[var(--wp-coral-wash)] text-[var(--wp-coral-deep)]'
                : 'border-[var(--wp-border-2)] text-[var(--wp-text-2)] hover:border-[var(--wp-coral)]'}`}
            >
              {t(`azraqAdmin.searchQueries.status.${s}`)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor={monthId} className="text-xs font-semibold text-[var(--wp-text-2)]">{t('azraqAdmin.searchQueries.month')}</label>
            <input
              id={monthId}
              type="month"
              value={month}
              max={currentMonth()}
              onChange={(e) => e.target.value && setFilter('month', e.target.value)}
              className="wp-input min-h-11 px-3 text-sm"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={areaId} className="text-xs font-semibold text-[var(--wp-text-2)]">{t('azraqAdmin.searchQueries.area')}</label>
            <select id={areaId} value={area} onChange={(e) => setFilter('area', e.target.value)} className="wp-input min-h-11 px-3 text-sm">
              {AREAS.map((key) => <option key={key} value={key}>{t(`azraqAdmin.searchQueries.areas.${key}`)}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={sourceId} className="text-xs font-semibold text-[var(--wp-text-2)]">{t('azraqAdmin.searchQueries.source')}</label>
            <select id={sourceId} value={source} onChange={(e) => setFilter('source', e.target.value)} className="wp-input min-h-11 px-3 text-sm">
              {SOURCES.map((key) => <option key={key} value={key}>{t(`azraqAdmin.searchQueries.sources.${key}`)}</option>)}
            </select>
          </div>
        </div>

        <SearchQueriesOverview month={month} source={filters.source ?? null} area={filters.area ?? null} status={status} />
        {!azraq && <Summary summary={report?.summary} />}

        {list.loading && <p role="status" aria-busy="true" data-loading="" className="text-sm text-[var(--wp-text-muted)]">{t('common.loading')}</p>}
        {list.error && <ErrorState error={list.error} onRetry={list.reload} />}
        {!list.loading && !list.error && rows.length === 0 && <EmptyState icon={SearchX} title={t(`azraqAdmin.searchQueries.${EMPTY_KEY[status]}`)} />}

        {!list.loading && !list.error && rows.length > 0 && (
          <>
            {status !== 'answered' && <p className="text-sm text-[var(--wp-text-3)]">{t('azraqAdmin.searchQueries.hint')}</p>}
            <ul className="space-y-3" aria-label={t('azraqAdmin.searchQueries.listLabel')}>
              {rows.map((row) => <li key={row.query}><QueryRow row={row} /></li>)}
            </ul>
            <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoadMore={list.loadMore} />
          </>
        )}
      </div>
    </div>
  );
}
