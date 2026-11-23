import { Check, Clock, Minus, RefreshCw, TriangleAlert, User } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import Button from '../ui/Button';
import { formatNumber, formatWhen, stationStatus, stationUnit } from '../../utils/assistantHub';
import { PhaseTag, SectionHead } from './hubParts';
import { STATE_ICONS } from './hubIcons';

// علامة صغيرة على دائرة المحطة: شكل مختلف لكل حالة (لا لون وحده).
const GLYPHS = { ok: Check, warn: TriangleAlert, pending: Clock, planned: Minus };

function Station({ station, open, onOpen }) {
  const { t, lang } = useLanguage();
  const StateIcon = STATE_ICONS[station.state];
  const Glyph = GLYPHS[station.state];
  const name = t(`assistantHub.stations.${station.id}.name`);
  const term = t(`assistantHub.stations.${station.id}.term`);
  const planned = station.state === 'planned';
  return (
    <li className={`ahub-station${station.id === 'search' ? ' is-entry' : ''}`} data-state={station.state}>
      <span className="ahub-stop" aria-hidden="true">
        {station.n}
        <span className={`ahub-glyph is-${station.state}`}><Glyph /></span>
      </span>
      <button
        type="button"
        className="ahub-st-card"
        data-state={station.state}
        data-station={station.id}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={(event) => onOpen(station.id, event.currentTarget)}
      >
        <span className="ahub-st-name">
          {name}
          {term !== name && <span className="ahub-st-term" lang={lang === 'ar' ? 'en' : undefined}>{term}</span>}
        </span>
        {planned ? (
          <span className="ahub-st-value is-planned">{t('assistantHub.heart.noValue')}</span>
        ) : (
          <span className="ahub-st-value">
            <span className="ahub-num">{formatNumber(station.value)}{station.value !== null && station.unit === '%' ? '%' : ''}</span>
            {station.of !== undefined && <small>{t('assistantHub.heart.of', { total: formatNumber(station.of) })}</small>}
          </span>
        )}
        <span className="ahub-st-unit">{stationUnit(t, station)}</span>
        <span className={`ahub-st-status is-${station.state}`}>
          <StateIcon aria-hidden="true" />
          <span>{stationStatus(t, station)}</span>
        </span>
        <PhaseTag phase={station.phase} />
      </button>
    </li>
  );
}

/**
 * «قلب المساعد»: خط محطات بحارتين، تجهيز المكتبة (1–4) وما يجري عند كل سؤال (5–7). كل محطة زر يفتح درج تفاصيلها.
 * نقطة واحدة تمرّ على الخط مرة عند التحميل (الحركة الوحيدة في الصفحة)، ولا تظهر مع تقليل الحركة.
 */
export default function AssistantHeart({ stations, openId, onOpen, attention, hasCoverage, generatedAt, onRefresh, refreshing }) {
  const { t, lang } = useLanguage();
  const prep = stations.filter((s) => s.lane === 'prep');
  const ask = stations.filter((s) => s.lane === 'ask');
  const issues = attention.find((s) => s.id === 'extract');

  return (
    <section className="ahub-heart" aria-labelledby="ahub-heart-title">
      <SectionHead
        id="ahub-heart-title"
        title={t('assistantHub.heart.title')}
        lead={t('assistantHub.heart.lead')}
        side={(
          <>
            {generatedAt && <span className="ahub-meta">{t('assistantHub.updatedAt', { time: formatWhen(generatedAt, lang) })}</span>}
            <Button variant="secondary" onClick={onRefresh} loading={refreshing}>
              <RefreshCw aria-hidden="true" />
              {t('assistantHub.refresh')}
            </Button>
          </>
        )}
      />

      <div className="ahub-lanes">
        <div className="ahub-lane is-prep">
          <p className="ahub-lane-head">
            {t('assistantHub.heart.lanePrep')} <small>{t('assistantHub.heart.lanePrepHint')}</small>
          </p>
          <div className="ahub-lane-entry" />
          <ol className="ahub-stations" style={{ '--n': prep.length }} aria-label={t('assistantHub.heart.stepsPrep')}>
            {prep.map((station) => <Station key={station.id} station={station} open={openId === station.id} onOpen={onOpen} />)}
            <li className="ahub-packet" aria-hidden="true" />
          </ol>
        </div>
        <div className="ahub-lane is-ask">
          <p className="ahub-lane-head">
            {t('assistantHub.heart.laneAsk')} <small>{t('assistantHub.heart.laneAskHint')}</small>
          </p>
          <div className="ahub-lane-entry">
            <span className="ahub-q-entry"><User aria-hidden="true" />{t('assistantHub.heart.entry')}</span>
          </div>
          <ol className="ahub-stations" start={prep.length + 1} style={{ '--n': ask.length }} aria-label={t('assistantHub.heart.stepsAsk')}>
            {ask.map((station) => <Station key={station.id} station={station} open={openId === station.id} onOpen={onOpen} />)}
          </ol>
        </div>
      </div>

      <div className={`ahub-heart-foot${issues ? ' is-warn' : ''}`}>
        <p>
          {issues ? <TriangleAlert aria-hidden="true" /> : <Clock aria-hidden="true" />}
          <span>
            {issues
              ? t('assistantHub.heart.footIssues', { count: issues.params.count })
              : t(hasCoverage ? 'assistantHub.heart.footCoverage' : 'assistantHub.heart.footToday')}
          </span>
        </p>
        {issues && (
          <Button onClick={(event) => onOpen('extract', event.currentTarget)}>{t('assistantHub.heart.openExtract')}</Button>
        )}
      </div>
    </section>
  );
}
