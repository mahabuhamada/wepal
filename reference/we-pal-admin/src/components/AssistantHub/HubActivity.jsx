import { EyeOff, HelpCircle, Search, SearchX } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import Button from '../ui/Button';
import { formatNumber, formatWhen } from '../../utils/assistantHub';
import { PhaseTag, SectionHead } from './hubParts';

/**
 * «النشاط، بلا هوية»: أرقام سجل البحث (أسئلة «اسأل» ونسبة ما وجد نتيجة، وما لم يجد من كل المصادر)،
 * وأكثر الأسئلة بلا نتيجة هذا الشهر، لكل منها «أضف سؤالًا شائعًا» (/admin/editor/faq/new?q=…، مسودّة بالسؤال ولغته).
 */
export default function HubActivity({ search }) {
  const { t, lang } = useLanguage();
  const share = search.answeredShare;
  const kpis = [
    { key: 'asks7d', value: formatNumber(search.asks7d), label: t('assistantHub.activity.asks7d') },
    { key: 'asks30d', value: formatNumber(search.asks30d), label: t('assistantHub.activity.asks30d') },
    {
      key: 'answered',
      value: share === null ? '—' : `${formatNumber(share)}%`,
      label: t('assistantHub.activity.answered'),
      sub: share === null ? t('assistantHub.activity.noShare') : t('assistantHub.activity.answeredOf', { count: formatNumber(search.asksWithResults30d), total: formatNumber(search.asks30d) }),
    },
    { key: 'zero', value: formatNumber(search.zeroResults30d), label: t('assistantHub.activity.zero30d'), sub: t('assistantHub.activity.zeroHint') },
  ];

  return (
    <section className="ahub-card" id="ahub-activity" aria-labelledby="ahub-activity-title">
      <SectionHead
        id="ahub-activity-title"
        title={t('assistantHub.activity.title')}
        tag={<PhaseTag phase={0} />}
        lead={t('assistantHub.activity.lead', { days: search.retentionDays })}
        side={<span className="ahub-anon"><EyeOff aria-hidden="true" />{t('assistantHub.activity.anon')}</span>}
      />
      <div className="ahub-act-grid">
        <div>
          <dl className="ahub-kpis" aria-label={t('assistantHub.activity.countsLabel')}>
            {kpis.map((kpi) => (
              <div key={kpi.key} className="ahub-kpi">
                <dt>{kpi.label}</dt>
                <dd>
                  <span className="ahub-num">{kpi.value}</span>
                  {kpi.sub && <small>{kpi.sub}</small>}
                </dd>
              </div>
            ))}
          </dl>
          {share !== null && (
            <div className="ahub-meter">
              {/* الشريط زخرفة؛ النسبة مكتوبة تحته */}
              <div className="ahub-meter-bar" aria-hidden="true">
                <span className="ahub-meter-fill" style={{ inlineSize: `${Math.min(100, Math.max(0, share))}%` }} />
              </div>
              <p className="ahub-hint">{t('assistantHub.activity.shareBar', { share })}</p>
            </div>
          )}
          <p className="ahub-hint">
            {search.lastSearchAt
              ? t('assistantHub.activity.lastSearch', { time: formatWhen(search.lastSearchAt, lang) })
              : t('assistantHub.activity.noSearchYet')}
          </p>
          <p className="ahub-hint">{t('assistantHub.activity.logNote')}</p>
        </div>

        <div>
          <h3 className="ahub-sub-h">{t('assistantHub.activity.topTitle')}</h3>
          <p className="ahub-hint ahub-sub-lead">{t('assistantHub.activity.topHint')}</p>
          {search.topZeroResults.length === 0 ? (
            <p className="ahub-empty"><SearchX aria-hidden="true" />{t('assistantHub.activity.topEmpty')}</p>
          ) : (
            <ul className="ahub-unans" aria-label={t('assistantHub.activity.topTitle')}>
              {search.topZeroResults.map((row) => (
                <li key={row.query}>
                  <q dir="auto">{row.query}</q>
                  <span className="ahub-unans-meta">
                    <span>{t('assistantHub.activity.times', { count: formatNumber(row.count) })}</span>
                    {row.sources.map((source) => <span key={source} className="ahub-chip">{t(`azraqAdmin.searchQueries.sources.${source}`)}</span>)}
                    {row.lastSeenAt && <span>{t('assistantHub.activity.lastSeen', { date: formatWhen(row.lastSeenAt, lang) })}</span>}
                  </span>
                  <span className="ahub-acts">
                    <Button
                      variant="secondary"
                      to={`/admin/editor/faq/new?q=${encodeURIComponent(row.query)}`}
                      aria-label={`${t('assistantHub.activity.addFaq')}: ${row.query}`}
                    >
                      <HelpCircle aria-hidden="true" />
                      {t('assistantHub.activity.addFaq')}
                    </Button>
                    <Button
                      variant="ghost"
                      to={`/library?q=${encodeURIComponent(row.query)}`}
                      aria-label={`${t('assistantHub.activity.searchLibrary')}: ${row.query}`}
                    >
                      <Search aria-hidden="true" />
                      {t('assistantHub.activity.searchLibrary')}
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Button variant="ghost" to="/admin/search-queries" className="ahub-more">
            {t('assistantHub.activity.all')}
          </Button>
        </div>
      </div>
    </section>
  );
}
