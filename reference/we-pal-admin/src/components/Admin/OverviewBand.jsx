import { useId, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, ChevronDown } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { isSameView } from '../../utils/adminLinks';

const STORE_KEY = 'wepal.admin.band.';
const BAR_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

/** حالة الطيّ المحفوظة لكل صفحة؛ على الهاتف تبدأ مطويّة (خطة لوحة الإدارة 4.3.1). */
function readBandOpen(page) {
  try {
    const v = window.localStorage.getItem(STORE_KEY + page);
    if (v === '1') return true;
    if (v === '0') return false;
  } catch {
    // التخزين محجوب (نافذة خاصة): الافتراضي حسب العرض
  }
  try {
    return !window.matchMedia('(max-width: 860px)').matches;
  } catch {
    return true;
  }
}

function saveBandOpen(page, open) {
  try {
    window.localStorage.setItem(STORE_KEY + page, open ? '1' : '0');
  } catch {
    // لا شيء: الحالة تبقى للجلسة الحالية فقط
  }
}

const fmt = (n, lang) => (n == null ? '—' : Number(n).toLocaleString(lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB'));

/**
 * شريط «نظرة عامة» أعلى صفحة القائمة: 4 بطاقات ورسمان، كلها بالمرشّحات المختارة نفسها (من طلب التجميع
 * في الخادم). كل بطاقة تفتح القائمة مرشَّحة، ولكل رقم مدّته ومصدره.
 *
 * @param page       مفتاح الصفحة (لحفظ الطيّ)
 * @param summary    { tiles:[{key,value,scope,source,to}], charts:[{key,kind,items:[{key?,label?,value,to?}]}], empty }
 * @param scopeText  نطاق المرشّحات بجانب العنوان («بانتظار · تعليق»)
 * @param tileLabel  (key) → نص البطاقة؛ tileIcon (key) → مكوّن الأيقونة؛ tilePath (key) → لون المسار
 * @param chartTitle (key) → عنوان الرسم؛ itemLabel (chartKey, item) → نص العنصر
 */
export default function OverviewBand({
  page, summary, loading = false, error = null, scopeText = '', tileLabel, tileIcon, tilePath, tileValue,
  chartTitle, itemLabel,
}) {
  const { t, lang } = useLanguage();
  const id = useId();
  const [open, setOpen] = useState(() => readBandOpen(page));
  const location = useLocation();

  const toggle = () => {
    setOpen((o) => {
      saveBandOpen(page, !o);
      return !o;
    });
  };

  const tiles = summary?.tiles ?? [];
  const charts = (summary?.charts ?? []).map((c) => ({ ...c, items: (c.items ?? []).filter((x) => x.value > 0) }));
  const show = (tile) => (tileValue ? tileValue(tile) : fmt(tile.value, lang));
  const collapsedSummary = tiles.slice(0, 2).map((x) => `${tileLabel(x.key)}: ${show(x)}`).join(' · ');

  return (
    <section className="azq-band" aria-labelledby={`${id}-h`} aria-busy={loading}>
      <button type="button" className="azq-band-t" aria-expanded={open} aria-controls={`${id}-b`} onClick={toggle}>
        <span className="azq-tile" data-path="none" aria-hidden="true"><BarChart3 /></span>
        <span className="azq-band-tt">
          <h2 id={`${id}-h`}>{t('adminLists.band.title')}</h2>
          {scopeText && <span className="azq-band-sc">{scopeText}</span>}
        </span>
        {!open && collapsedSummary && <span className="azq-band-sum">{collapsedSummary}</span>}
        <ChevronDown className="azq-band-chev" aria-hidden="true" />
      </button>
      <div id={`${id}-b`} className="azq-band-b" hidden={!open}>
        {error && <p className="azq-band-empty">{t('adminLists.band.error')}</p>}
        {!error && loading && !summary && <div className="azq-skel" aria-hidden="true" />}
        {summary && (
          <>
            <div className="azq-band-k">
              {tiles.map((tile) => {
                const Icon = tileIcon?.(tile.key);
                // الخادم يرسل اسم الجدول والعمود؛ الواجهة تعرض جملة بشرية بمفتاح الصفحة والبطاقة، وإن لم توجد فلا تلميح
                const sourceKey = `adminLists.band.sources.${page}.${tile.key}`;
                const sourceText = t(sourceKey);
                const source = sourceText === sourceKey ? '' : sourceText;
                // بطاقة تعرض الصفحة كما هي (بلا مرشّح خاص بها) نصّ لا رابط: النقر عليها لا يغيّر شيئًا
                const Tile = isSameView(tile.to, location) || !tile.to ? 'div' : Link;
                return (
                  <Tile key={tile.key} {...(Tile === Link && { to: tile.to })} className="azq-kpi is-sm" data-path={tilePath?.(tile.key) ?? 'none'} title={source || undefined}>
                    <span className="azq-kpi-top">
                      {Icon && <span className="azq-tile" aria-hidden="true"><Icon /></span>}
                      <span className="azq-kpi-label">{tileLabel(tile.key)}</span>
                    </span>
                    <span className="azq-kpi-scope">{t(`adminLists.band.scope.${tile.scope}`)}</span>
                    <span className="azq-kpi-value">{show(tile)}</span>
                    {source && <span className="sr-only">{source}</span>}
                  </Tile>
                );
              })}
            </div>
            {summary.empty ? (
              <p className="azq-band-empty">{t('adminLists.band.empty')}</p>
            ) : (
              <div className="azq-band-c">
                {charts.map((chart) => (
                  <BarsChart key={chart.key} chart={chart} title={chartTitle(chart.key)} itemLabel={(item) => itemLabel(chart.key, item)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

/** أشرطة أفقية بنسبها من الأكبر، ونصّ بديل لقارئ الشاشة. الأرقام لاتينية. */
function BarsChart({ chart, title, itemLabel }) {
  const { t, lang } = useLanguage();
  const max = Math.max(1, ...chart.items.map((x) => x.value));
  const total = chart.items.reduce((s, x) => s + x.value, 0);
  const summaryText = chart.items.map((x) => `${itemLabel(x)} ${x.value}`).join('، ');

  return (
    <figure className="azq-band-ch">
      <figcaption><h3>{title}</h3></figcaption>
      {chart.items.length === 0 ? (
        <p className="azq-band-empty">{t('adminLists.band.noData')}</p>
      ) : (
        <ul className="azq-hbars" aria-label={`${title}: ${summaryText}`}>
          {chart.items.map((item, i) => {
            const label = itemLabel(item);
            const pct = Math.round((item.value / total) * 100);
            const body = (
              <>
                <span className="azq-hbar-l">{label}</span>
                <span className="azq-hbar-track" aria-hidden="true">
                  <span style={{ inlineSize: `${(item.value / max) * 100}%`, background: BAR_COLORS[i % BAR_COLORS.length] }} />
                </span>
                <span className="azq-hbar-v">{fmt(item.value, lang)} <small>{pct}%</small></span>
              </>
            );
            return <li key={item.key ?? label}>{item.to ? <Link to={item.to}>{body}</Link> : <span>{body}</span>}</li>;
          })}
        </ul>
      )}
    </figure>
  );
}
