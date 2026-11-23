import { useState } from 'react';
import { CircleCheck, CircleDashed, CircleX, Clock, FileText, RefreshCw, ScanLine } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { resourceTypeLabel } from '../../utils/apiMappers';
import { COVERAGE_STATUSES, canReextract, coverageCounts, formatNumber, formatWhen } from '../../utils/assistantHub';
import Button from '../ui/Button';
import ErrorState from '../ui/ErrorState';
import DemoBadge from '../common/DemoBadge';
import { PhaseTag, SectionHead, StateBadge } from './hubParts';

// حالة الاستخراج ← شكل الشارة: أيقونة مختلفة لكل حالة، والنص معها دائمًا.
const STATUS_LOOK = {
  extracted: { state: 'ok', icon: CircleCheck },
  pending: { state: 'pending', icon: Clock },
  needs_ocr: { state: 'warn', icon: ScanLine },
  failed: { state: 'bad', icon: CircleX },
  no_file: { state: 'planned', icon: CircleDashed },
};

function langName(t, code) {
  return code === 'ar' || code === 'en' ? t(`assistantHub.coverage.langs.${code}`) : '—';
}

// اللغات التي كُتب بها عنوان المادة (قبل الاستخراج لا نعرف لغة الملف نفسه).
function titleLangs(t, langs) {
  if (langs.includes('ar') && langs.includes('en')) return t('assistantHub.coverage.langs.both');
  if (langs.length === 1) return langName(t, langs[0]);
  return '—';
}

/** الجدول بعد وصول استخراج النص (library-coverage): الحالة والصفحات والأجزاء، و«أعد الاستخراج». */
function CoverageTable({ coverage, onReextract, busyId }) {
  const { t, lang } = useLanguage();
  const [filter, setFilter] = useState('all');
  const counts = coverageCounts(coverage.items);
  const rows = coverage.items.filter((item) => filter === 'all' || item.status === filter);
  return (
    <>
      <div className="ahub-filters" role="group" aria-label={t('assistantHub.coverage.filterLabel')}>
        {['all', ...COVERAGE_STATUSES].map((key) => {
          const Icon = key === 'all' ? null : STATUS_LOOK[key].icon;
          return (
            <button key={key} type="button" aria-pressed={filter === key} onClick={() => setFilter(key)}>
              {Icon && <Icon aria-hidden="true" />}
              {key === 'all' ? t('assistantHub.coverage.all') : t(`assistantHub.coverage.status.${key}`)}
              <span className="ahub-count">{formatNumber(counts[key])}</span>
            </button>
          );
        })}
      </div>
      <div className="ahub-table-wrap" role="region" aria-label={t('assistantHub.coverage.tableLabel')} tabIndex={0}>
        <table className="ahub-table">
          <thead>
            <tr>
              <th scope="col">{t('assistantHub.coverage.col.title')}</th>
              <th scope="col">{t('assistantHub.coverage.col.type')}</th>
              <th scope="col">{t('assistantHub.coverage.col.lang')}</th>
              <th scope="col">{t('assistantHub.coverage.col.pages')}</th>
              <th scope="col">{t('assistantHub.coverage.col.chunks')}</th>
              <th scope="col">{t('assistantHub.coverage.col.status')}</th>
              <th scope="col">{t('assistantHub.coverage.col.extractedAt')}</th>
              <th scope="col">{t('assistantHub.coverage.col.action')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td className="ahub-table-empty" colSpan={8}>{t('assistantHub.coverage.empty')}</td></tr>
            ) : rows.map((item) => {
              const look = STATUS_LOOK[item.status];
              return (
                <tr key={item.id}>
                  <td className="ahub-cell-title">
                    <span dir="auto">{item.title}</span>
                    {item.isDemo && <DemoBadge show />}
                    {item.error && <small>{item.error}</small>}
                  </td>
                  <td><span className="ahub-chip">{resourceTypeLabel(item.type, lang)}</span></td>
                  <td>{langName(t, item.lang)}</td>
                  <td className="ahub-num">{formatNumber(item.pages)}</td>
                  <td className="ahub-num">{formatNumber(item.chunks)}</td>
                  <td><StateBadge state={look.state} icon={look.icon}>{t(`assistantHub.coverage.status.${item.status}`)}</StateBadge></td>
                  <td>{formatWhen(item.extractedAt, lang) || '—'}</td>
                  <td>
                    {canReextract(item) ? (
                      <Button
                        variant="secondary"
                        loading={busyId === item.id}
                        onClick={() => onReextract(item)}
                        aria-label={t('assistantHub.coverage.reextractLabel', { title: item.title })}
                      >
                        <RefreshCw aria-hidden="true" />
                        {t('assistantHub.coverage.reextract')}
                      </Button>
                    ) : (
                      <span className="ahub-hint">{item.isDemo ? t('assistantHub.coverage.demoNote') : '—'}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** قبل استخراج النص: مواد المكتبة وأنواعها ولغات عناوينها وهل لها ملف، من النظرة العامة. */
function SourcesTable({ library }) {
  const { t, lang } = useLanguage();
  return (
    <>
      <p className="ahub-planned-note">
        <CircleDashed aria-hidden="true" />
        <span>{t('assistantHub.coverage.plannedNote')}</span>
      </p>
      <div className="ahub-table-wrap" role="region" aria-label={t('assistantHub.coverage.tableLabel')} tabIndex={0}>
        <table className="ahub-table">
          <thead>
            <tr>
              <th scope="col">{t('assistantHub.coverage.col.title')}</th>
              <th scope="col">{t('assistantHub.coverage.col.type')}</th>
              <th scope="col">{t('assistantHub.coverage.col.titleLangs')}</th>
              <th scope="col">{t('assistantHub.coverage.col.file')}</th>
              <th scope="col">{t('assistantHub.coverage.col.published')}</th>
            </tr>
          </thead>
          <tbody>
            {library.items.length === 0 ? (
              <tr><td className="ahub-table-empty" colSpan={5}>{t('assistantHub.coverage.libraryEmpty')}</td></tr>
            ) : library.items.map((item) => (
              <tr key={item.id}>
                <td className="ahub-cell-title">
                  <span dir="auto">{item.title}</span>
                  {item.isDemo && <DemoBadge show />}
                </td>
                <td><span className="ahub-chip">{resourceTypeLabel(item.type, lang)}</span></td>
                <td>{titleLangs(t, item.langs)}</td>
                <td>
                  {item.hasFile
                    ? <StateBadge state="ok" icon={FileText}>{item.format ? t('assistantHub.coverage.hasFile', { format: item.format }) : t('assistantHub.coverage.hasFileNoFormat')}</StateBadge>
                    : <StateBadge state="planned" icon={CircleDashed}>{t('assistantHub.coverage.noFile')}</StateBadge>}
                </td>
                <td>{item.published ? t('assistantHub.coverage.published') : t('assistantHub.coverage.draft')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {library.resources > library.items.length && (
        <p className="ahub-hint">{t('assistantHub.coverage.more', { shown: formatNumber(library.items.length), total: formatNumber(library.resources) })}</p>
      )}
    </>
  );
}

/**
 * «تغطية المكتبة»: من library-coverage حين تصل (المرحلة 2أ)، وإلا قائمة المكتبة من النظرة العامة
 * مع سطر هادئ يقول إن حالة الاستخراج تأتي في المرحلة 2. خطأ التغطية (غير 404) لا يُسقط الصفحة.
 */
export default function HubCoverage({ library, coverage, coverageError, onRetryCoverage, onReextract, busyId }) {
  const { t } = useLanguage();
  return (
    <section className="ahub-card" id="ahub-coverage" aria-labelledby="ahub-coverage-title" tabIndex={-1}>
      <SectionHead
        id="ahub-coverage-title"
        title={t('assistantHub.coverage.title')}
        tag={<PhaseTag phase={2} />}
        lead={coverage ? t('assistantHub.coverage.lead') : t('assistantHub.coverage.leadPlanned')}
      />
      {coverageError && <ErrorState error={coverageError} onRetry={onRetryCoverage} className="ahub-coverage-error" />}
      {coverage
        ? <CoverageTable coverage={coverage} onReextract={onReextract} busyId={busyId} />
        : <SourcesTable library={library} />}
    </section>
  );
}
