import { useState } from 'react';
import { Download } from 'lucide-react';
import { useLanguage } from '../../../i18n/LanguageContext';
import { downloadAnalyticsCsv } from '../../../api/analytics';
import ErrorState from '../../../components/common/ErrorState';
import { formatDay } from './period';

// بطاقة تقرير: العنوان، والمدة، ومصدر الرقم، وتنزيل CSV حقيقي من الخادم، ثم المحتوى.
export default function ReportCard({ id, title, report, period, extra, source, state, children, wide = false, csv = true }) {
  const { t, lang } = useLanguage();
  const [busy, setBusy] = useState(false);
  const [csvError, setCsvError] = useState(null);

  const download = () => {
    setBusy(true);
    setCsvError(null);
    downloadAnalyticsCsv(report, period, extra)
      .catch((err) => setCsvError(err))
      .finally(() => setBusy(false));
  };

  return (
    <section id={id} className={`azq-card azq-an-card${wide ? ' is-wide' : ''}`} aria-labelledby={`${id}-h`} aria-busy={state?.loading || undefined}>
      <div className="azq-card-h">
        <div>
          <h3 id={`${id}-h`}>{title}</h3>
          <span className="azq-card-sub">
            {t('analyticsPage.scope', { from: formatDay(period.from, lang), to: formatDay(period.to, lang, { day: 'numeric', month: 'short', year: 'numeric' }) })}
          </span>
        </div>
        {csv && (
          <button type="button" className="azq-btn-ghost azq-an-csv" onClick={download} disabled={busy || !state?.data}>
            <Download aria-hidden="true" />{busy ? t('analyticsPage.csvBusy') : t('analyticsPage.csv')}
          </button>
        )}
      </div>
      <div className="azq-an-body">
        {state?.error && <ErrorState error={state.error} onRetry={state.retry} />}
        {csvError && <p role="alert" className="azq-an-warn">{t('analyticsPage.csvFailed')}</p>}
        {state?.loading && !state?.data && <div className="azq-skel" aria-hidden="true" />}
        {state?.data && children(state.data)}
      </div>
      <p className="azq-an-source"><b>{t('analyticsPage.sourceLabel')}</b> {source}</p>
    </section>
  );
}
