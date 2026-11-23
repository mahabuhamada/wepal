import { useState } from 'react';
import { CheckCircle2, Star } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { isScaleQtype, isTextQtype } from '../../utils/apiMappers';
import { allAnswered, buildAnswers } from '../../utils/surveyAnswers';
import QuestionInput from '../Survey/QuestionInput';
import Button from '../ui/Button';

/**
 * استطلاع الزوار بأكثر من سؤال أو بنوع غير الاختيار الواحد: يعيد استعمال حقول استبيان الأعضاء (QuestionInput)،
 * ويُرسل { questionId, value }[] إلى POST /public/polls/{id}/vote. كل الأسئلة مطلوبة كما عند الأعضاء.
 * readOnly: معاينة اللوحة قبل النشر — الحقول نفسها معطّلة، ولا إرسال.
 */
export function SurveyPollForm({ poll, busy, onSubmit, readOnly = false }) {
  const { t } = useLanguage();
  const [values, setValues] = useState({});
  const questions = poll.questions ?? [];
  const ready = allAnswered(questions, values);

  const fields = questions.map((q, i) => (
    <QuestionInput
      key={q.id}
      question={q}
      index={i}
      value={values[q.id]}
      onChange={(v) => setValues((prev) => ({ ...prev, [q.id]: v }))}
    />
  ));

  if (readOnly) {
    return (
      <form className="questionnaire-questions" onSubmit={(e) => e.preventDefault()}>
        <fieldset disabled className="contents">
          {fields}
          <Button type="button" disabled>{t('publicPolls.submitAnswers')}</Button>
        </fieldset>
      </form>
    );
  }

  return (
    <form
      className="questionnaire-questions"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready && !busy) onSubmit(buildAnswers(questions, values));
      }}
    >
      {fields}
      {!ready && <p className="text-xs text-[var(--wp-text-muted)]">{t('publicPolls.answerAll')}</p>}
      <Button type="submit" disabled={!ready || busy} loading={busy}>
        {busy ? t('publicPolls.voting') : t('publicPolls.submitAnswers')}
      </Button>
    </form>
  );
}

function Bar({ label, pct, text }) {
  return (
    <li>
      <span>{label}</span>
      <span>{text}</span>
      <span aria-hidden="true" className="block h-1.5 rounded-full bg-[var(--wp-border)]"><i className="block h-full rounded-full bg-[var(--wp-coral)]" style={{ inlineSize: `${pct}%` }} /></span>
    </li>
  );
}

/** نتائج كل سؤال (تجميع الخادم): أشرطة للاختيار، متوسط وتوزيع للمقياس، وعدد فقط للنص. */
export function SurveyPollResults({ poll }) {
  const { t } = useLanguage();
  return (
    <div className="space-y-4">
      {(poll.questions ?? []).map((q, i) => {
        const r = q.results;
        if (!r) return null;
        let body;
        if (isScaleQtype(q.qtype)) {
          body = (
            <>
              <p className="flex items-center gap-1 text-sm"><Star size={12} aria-hidden="true" /> {t('publicPolls.average')}: {Number(r.average ?? 0).toFixed(1)}</p>
              <ul className="space-y-1">
                {[5, 4, 3, 2, 1].map((n) => {
                  const c = r.distribution?.[n] ?? 0;
                  const pct = r.total > 0 ? Math.round((c / r.total) * 100) : 0;
                  return <Bar key={n} label={`${n} ★`} pct={pct} text={`${pct}% (${c})`} />;
                })}
              </ul>
            </>
          );
        } else if (isTextQtype(q.qtype)) {
          body = <p className="text-sm text-[var(--wp-text-muted)]">{t('publicPolls.answersCount')}: {r.total}. {t('publicPolls.textHidden')}</p>;
        } else {
          body = (
            <ul className="space-y-1">
              {q.options.map((opt, j) => {
                const c = r.counts?.[j] ?? 0;
                const pct = r.total > 0 ? Math.round((c / r.total) * 100) : 0;
                return <Bar key={j} label={opt} pct={pct} text={`${pct}% (${c})`} />;
              })}
            </ul>
          );
        }
        return (
          <section key={q.id}>
            <h3 className="text-sm font-bold mb-1">{i + 1}. {q.text}</h3>
            {body}
          </section>
        );
      })}
      <p className="text-xs text-[var(--wp-text-muted)]">{t('publicPolls.totalVotes')}: {poll.questions?.[0]?.results?.total ?? 0}</p>
    </div>
  );
}

export function SurveyPollThanks() {
  const { t } = useLanguage();
  return (
    <p role="status" className="flex items-center gap-2 rounded-xl bg-[var(--wp-success-tint)] p-3 text-sm text-[var(--wp-success)]">
      <CheckCircle2 size={16} aria-hidden="true" /> {t('publicPolls.thanks')}
    </p>
  );
}
