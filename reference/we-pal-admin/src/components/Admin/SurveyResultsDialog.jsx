import { useCallback, useEffect, useId, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import Modal from '../common/Modal';
import ErrorState from '../common/ErrorState';
import EmptyState from '../common/EmptyState';
import { useLanguage } from '../../i18n/LanguageContext';
import { getSurveyResults } from '../../api/platform';
import { isScaleQtype, isTextQtype, qtypeLabel } from '../../utils/apiMappers';

/**
 * نتائج استطلاع للقراءة فقط في لوحة الإدارة (قرار أمجد 2026-10-21، الفجوة 6 في PR 193).
 * نفس GET /surveys/{id}/results التي تعرضها صفحة الاستطلاع للأعضاء؛ المدير يرى نتائج كل استطلاع
 * ونصوص الإجابات المفتوحة (أحدث 50 بترتيب عشوائي من الخادم). لا تعديل ولا تصدير هنا.
 * كل قيمة مكتوبة نصًا («12 (40%)»)، والأشرطة زخرفة مخفية عن قارئ الشاشة.
 */
export default function SurveyResultsDialog({ survey, onClose }) {
  const { t } = useLanguage();
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    getSurveyResults(survey.id).then(
      (res) => { if (alive) setResults(res); },
      (err) => { if (alive) setError(err); },
    );
    return () => { alive = false; };
  }, [survey.id]);

  // «إعادة المحاولة» بعد خطأ التحميل.
  const retry = useCallback(() => {
    setError(null);
    setResults(null);
    getSurveyResults(survey.id).then(setResults, setError);
  }, [survey.id]);

  return (
    <Modal title={t('azraqAdmin.surveyResults.title', { title: survey.title })} onClose={onClose} size="lg">
      {!results && !error && (
        <p role="status" aria-busy="true" data-loading="" className="text-sm text-[var(--wp-text-muted)]">{t('common.loading')}</p>
      )}
      {error && <ErrorState error={error} onRetry={retry} />}
      {results && (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-[var(--wp-text-2)]">
            {t('azraqAdmin.surveyResults.responses', { count: results.totalResponses ?? 0 })}
          </p>
          {(results.totalResponses ?? 0) === 0 ? (
            <EmptyState icon={BarChart3} title={t('azraqAdmin.surveyResults.empty')} />
          ) : (
            (results.questions || []).map((q, i) => (
              <QuestionResult key={q.questionId ?? i} result={q} index={i} total={results.totalResponses} />
            ))
          )}
        </div>
      )}
    </Modal>
  );
}

function QuestionResult({ result, index, total }) {
  const { t, lang } = useLanguage();
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="asr-question rounded-2xl border border-[var(--wp-border)] p-4">
      <p className="text-xs text-[var(--wp-text-muted)]">
        <span>{t('surveyDetail.questionNo', { n: index + 1 })}</span>
        <span className="ms-2 rounded-full bg-[var(--wp-bg)] px-2 py-0.5">{qtypeLabel(result.qtype, lang)}</span>
      </p>
      <h3 id={headingId} className="mt-1 mb-3 text-sm font-semibold text-[var(--wp-text)]">{result.text}</h3>
      {isScaleQtype(result.qtype) ? <ScaleResult result={result} />
        : isTextQtype(result.qtype) ? <TextResult result={result} />
          : <ChoiceResult result={result} total={total} />}
    </section>
  );
}

// اختيار فردي/متعدد: النسبة من عدد المستجيبين (في المتعدد قد يتجاوز المجموع 100%).
function ChoiceResult({ result, total }) {
  const { t } = useLanguage();
  const entries = Object.entries(result.counts || {});
  const denom = total || entries.reduce((sum, [, c]) => sum + c, 0) || 1;
  return (
    <>
      <ul className="space-y-2">
        {entries.map(([option, count]) => (
          <ResultRow key={option} label={option} count={count} percent={Math.round((count / denom) * 100)} />
        ))}
      </ul>
      {result.qtype === 'MULTI_CHOICE' && (
        <p className="mt-2 text-xs text-[var(--wp-text-muted)]">{t('azraqAdmin.surveyResults.multiNote')}</p>
      )}
    </>
  );
}

function ScaleResult({ result }) {
  const { t } = useLanguage();
  const dist = result.distribution || {};
  const count = result.count || 0;
  return (
    <>
      <p className="mb-2 text-sm font-semibold text-[var(--wp-text)]">
        {t('azraqAdmin.surveyResults.average', { average: Number(result.average ?? 0).toFixed(1) })}
      </p>
      <ul className="space-y-2">
        {[5, 4, 3, 2, 1].map((n) => {
          const c = dist[n] ?? dist[String(n)] ?? 0;
          return <ResultRow key={n} label={t('azraqAdmin.surveyResults.scalePoint', { n })} count={c} percent={count ? Math.round((c / count) * 100) : 0} />;
        })}
      </ul>
    </>
  );
}

// النص المفتوح: الإجابات كما كتبها الأعضاء (dir="auto" لخليط العربية والإنجليزية).
function TextResult({ result }) {
  const { t } = useLanguage();
  const answers = result.answers || [];
  const total = result.answersCount ?? answers.length;
  if (total === 0) return <p className="text-sm text-[var(--wp-text-muted)]">{t('azraqAdmin.surveyResults.noText')}</p>;
  return (
    <>
      {total > answers.length && (
        <p className="mb-2 text-xs text-[var(--wp-text-muted)]">{t('surveyDetail.textAnswersLatest', { shown: answers.length, count: total })}</p>
      )}
      <ul className="asr-answers space-y-2">
        {answers.map((answer, i) => (
          <li key={i} dir="auto" className="whitespace-pre-wrap break-words rounded-xl bg-[var(--wp-bg)] px-3 py-2 text-sm text-[var(--wp-text-2)]">{answer}</li>
        ))}
      </ul>
    </>
  );
}

function ResultRow({ label, count, percent }) {
  return (
    <li className="asr-row">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="min-w-0 break-words text-[var(--wp-text)]">{label}</span>
        <span className="shrink-0 tabular-nums text-[var(--wp-text-2)]">{`${count} (${percent}%)`}</span>
      </div>
      <span aria-hidden="true" className="asr-bar mt-1 block h-2 overflow-hidden rounded-full bg-[var(--wp-border)]">
        <span className="asr-bar-fill block h-full rounded-full bg-[var(--wp-ink)]" style={{ width: `${percent}%` }} />
      </span>
    </li>
  );
}
