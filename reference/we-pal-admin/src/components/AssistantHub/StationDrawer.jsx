import { CircleCheck, CircleDashed, Clock, FileText, RefreshCw, ScanLine, CircleX } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { resourceTypeLabel } from '../../utils/apiMappers';
import { canReextract, formatNumber, formatWhen, percent, stationStatus } from '../../utils/assistantHub';
import Button from '../ui/Button';
import HubDrawer from './HubDrawer';
import { PhaseTag, StateBadge } from './hubParts';

// أرقام صغيرة في رأس الدرج: رقم كبير وتحته تسمية بأيقونة.
function Stats({ items }) {
  return (
    <ul className="ahub-dstats">
      {items.map(({ key, value, label, icon: Icon, state }) => (
        <li key={key} className={state ? `is-${state}` : undefined}>
          <b className="ahub-num">{formatNumber(value)}</b>
          <span><Icon aria-hidden="true" />{label}</span>
        </li>
      ))}
    </ul>
  );
}

// جدول مفتاح/قيمة.
function KeyValues({ rows }) {
  return (
    <dl className="ahub-kv">
      {rows.map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

// ما لم يُبنَ بعد: سطر هادئ بالمرحلة، بلا أرقام.
function PlannedNote({ phase, text }) {
  const { t } = useLanguage();
  return (
    <p className="ahub-planned-note">
      <CircleDashed aria-hidden="true" />
      <span><b>{t('assistantHub.plannedStatus', { phase })}.</b> {text}</span>
    </p>
  );
}

function SourcesBody({ overview }) {
  const { t, lang } = useLanguage();
  const { library } = overview;
  const both = library.items.filter((item) => item.langs.includes('ar') && item.langs.includes('en')).length;
  const types = Object.entries(library.byType)
    .map(([type, count]) => `${resourceTypeLabel(type, lang)} ${formatNumber(count)}`)
    .join(lang === 'en' ? ', ' : '، ');
  return (
    <>
      <Stats
        items={[
          { key: 'file', value: library.withFile, label: t('assistantHub.drawer.sources.withFile'), icon: FileText, state: 'ok' },
          { key: 'nofile', value: library.resources - library.withFile, label: t('assistantHub.drawer.sources.noFile'), icon: CircleDashed },
          { key: 'demo', value: library.demo, label: t('assistantHub.drawer.sources.demo'), icon: CircleDashed },
        ]}
      />
      <KeyValues
        rows={[
          [t('assistantHub.drawer.sources.published'), formatNumber(library.published)],
          [t('assistantHub.drawer.sources.types'), types || '—'],
          [t('assistantHub.drawer.sources.languages'), t('assistantHub.drawer.sources.langsValue', { both: formatNumber(both), total: formatNumber(library.items.length) })],
          [t('assistantHub.drawer.sources.who'), t('assistantHub.drawer.sources.whoValue')],
        ]}
      />
    </>
  );
}

function ExtractBody({ coverage, onReextract, busyId }) {
  const { t, lang } = useLanguage();
  if (!coverage) return <PlannedNote phase={2} text={t('assistantHub.drawer.extract.planned')} />;
  const { totals } = coverage;
  const issues = coverage.items.filter((item) => item.status === 'needs_ocr' || item.status === 'failed');
  return (
    <>
      <Stats
        items={[
          { key: 'ok', value: totals.extracted, label: t('assistantHub.coverage.status.extracted'), icon: CircleCheck, state: 'ok' },
          { key: 'ocr', value: totals.needsOcr, label: t('assistantHub.coverage.status.needs_ocr'), icon: ScanLine, state: 'warn' },
          { key: 'failed', value: totals.failed, label: t('assistantHub.coverage.status.failed'), icon: CircleX, state: 'bad' },
          { key: 'pending', value: totals.pending, label: t('assistantHub.coverage.status.pending'), icon: Clock, state: 'pending' },
        ]}
      />
      {issues.length > 0 && (
        <>
          <h3 className="ahub-sub-h">{t('assistantHub.drawer.extract.needsAction')}</h3>
          <ul className="ahub-issues">
            {issues.map((item) => (
              <li key={item.id} className={`ahub-issue is-${item.status === 'failed' ? 'bad' : 'warn'}`}>
                <div className="ahub-issue-top">
                  <b>{item.title}</b>
                  <StateBadge state={item.status === 'failed' ? 'bad' : 'warn'} icon={item.status === 'failed' ? CircleX : ScanLine}>
                    {t(`assistantHub.coverage.status.${item.status}`)}
                  </StateBadge>
                </div>
                <p>{item.error || t(`assistantHub.drawer.extract.${item.status === 'failed' ? 'failedHint' : 'ocrHint'}`)}</p>
                {canReextract(item) && (
                  <Button variant="secondary" loading={busyId === item.id} onClick={() => onReextract(item)} aria-label={t('assistantHub.coverage.reextractLabel', { title: item.title })}>
                    <RefreshCw aria-hidden="true" />
                    {t('assistantHub.coverage.reextract')}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      <KeyValues rows={[[t('assistantHub.drawer.lastRun'), formatWhen(totals.lastExtractedAt, lang) || '—']]} />
    </>
  );
}

function ChunkBody({ coverage }) {
  const { t } = useLanguage();
  if (!coverage) return <PlannedNote phase={2} text={t('assistantHub.drawer.chunk.planned')} />;
  const { totals } = coverage;
  const perFile = totals.extracted > 0 ? Math.round(totals.chunks / totals.extracted) : null;
  return (
    <KeyValues
      rows={[
        [t('assistantHub.drawer.chunk.chunks'), formatNumber(totals.chunks)],
        [t('assistantHub.drawer.chunk.pages'), formatNumber(totals.pages)],
        [t('assistantHub.drawer.chunk.perFile'), formatNumber(perFile)],
      ]}
    />
  );
}

function IndexBody({ coverage }) {
  const { t } = useLanguage();
  if (!coverage) return <PlannedNote phase={2} text={t('assistantHub.drawer.index.planned')} />;
  const { totals } = coverage;
  return (
    <KeyValues
      rows={[
        [t('assistantHub.drawer.index.ready'), t('assistantHub.drawer.index.readyValue', { extracted: formatNumber(totals.extracted), withFile: formatNumber(totals.withFile), share: formatNumber(percent(totals.extracted, totals.withFile)) })],
        [t('assistantHub.drawer.index.meaning'), t('assistantHub.drawer.index.meaningValue')],
      ]}
    />
  );
}

function SearchBody({ overview }) {
  const { t, lang } = useLanguage();
  const { search } = overview;
  return (
    <>
      <KeyValues
        rows={[
          [t('assistantHub.activity.asks7d'), formatNumber(search.asks7d)],
          [t('assistantHub.activity.asks30d'), formatNumber(search.asks30d)],
          [t('assistantHub.activity.answered'), search.answeredShare === null ? t('assistantHub.activity.noShare') : `${formatNumber(search.answeredShare)}%`],
          [t('assistantHub.activity.zero30d'), formatNumber(search.zeroResults30d)],
          [t('assistantHub.drawer.search.last'), formatWhen(search.lastSearchAt, lang) || '—'],
          [t('assistantHub.drawer.search.when'), t('assistantHub.drawer.search.whenValue')],
        ]}
      />
      <p className="ahub-hint">{t('assistantHub.activity.logNote')}</p>
    </>
  );
}

function ModelBody({ overview }) {
  const { t } = useLanguage();
  const { planned } = overview.ask;
  return (
    <>
      <PlannedNote phase={4} text={t('assistantHub.drawer.model.planned')} />
      <h3 className="ahub-sub-h">{t('assistantHub.controls.plannedTitle')}</h3>
      <KeyValues
        rows={[
          [t('assistantHub.controls.model'), <span key="m" lang="en">{planned.model}</span>],
          [t('assistantHub.controls.audience'), t('assistantHub.controls.audienceValue')],
          [t('assistantHub.controls.daily'), t('assistantHub.controls.dailyValue', { count: planned.dailyLimitPerMember })],
          [t('assistantHub.controls.cap'), t('assistantHub.controls.capValue', { amount: planned.monthlyCapUsd })],
          [t('assistantHub.drawer.model.sent'), t('assistantHub.drawer.model.sentValue')],
          [t('assistantHub.drawer.model.never'), t('assistantHub.drawer.model.neverValue')],
        ]}
      />
    </>
  );
}

function AnswerBody() {
  const { t } = useLanguage();
  return (
    <>
      <PlannedNote phase={4} text={t('assistantHub.drawer.answer.planned')} />
      <KeyValues rows={[[t('assistantHub.drawer.answer.today'), t('assistantHub.drawer.answer.todayValue')]]} />
    </>
  );
}

const BODIES = { sources: SourcesBody, extract: ExtractBody, chunk: ChunkBody, index: IndexBody, search: SearchBody, model: ModelBody, answer: AnswerBody };

/** درج خطوة من «قلب المساعد»: وصف الخطوة، وأرقامها حيث توجد، وروابط العمل عليها. */
export default function StationDrawer({ station, overview, coverage, onClose, onReextract, busyId, onShowCoverage }) {
  const { t } = useLanguage();
  const Body = BODIES[station.id];
  const footLinks = {
    sources: (
      <>
        <Button variant="secondary" to="/admin/library">{t('assistantHub.drawer.sources.openLibrary')}</Button>
        <Button variant="ghost" onClick={onShowCoverage}>{t('assistantHub.drawer.openCoverage')}</Button>
      </>
    ),
    extract: coverage ? <Button variant="secondary" onClick={onShowCoverage}>{t('assistantHub.drawer.openCoverage')}</Button> : null,
    search: (
      <>
        <Button variant="secondary" to="/admin/search-queries">{t('assistantHub.activity.all')}</Button>
        <Button variant="ghost" to="/assistant">{t('assistantHub.drawer.search.try')}</Button>
      </>
    ),
    answer: <Button variant="secondary" to="/assistant">{t('assistantHub.drawer.search.try')}</Button>,
  }[station.id];

  return (
    <HubDrawer
      kicker={t('assistantHub.heart.stepOf', { n: station.n })}
      title={t(`assistantHub.stations.${station.id}.name`)}
      tags={(
        <>
          <StateBadge state={station.state}>{stationStatus(t, station)}</StateBadge>
          <PhaseTag phase={station.phase} />
        </>
      )}
      foot={footLinks}
      onClose={onClose}
    >
      <p className="ahub-drawer-lead">{t(`assistantHub.drawer.${station.id}.lead`)}</p>
      <Body overview={overview} coverage={coverage} onReextract={onReextract} busyId={busyId} />
    </HubDrawer>
  );
}
