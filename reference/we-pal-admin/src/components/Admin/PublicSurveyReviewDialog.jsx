import { useCallback, useEffect, useId, useState } from 'react';
import { CalendarClock, ChartColumn, Eye, EyeOff, Send } from 'lucide-react';
import Modal from '../common/Modal';
import ErrorState from '../common/ErrorState';
import Alert from '../ui/Alert';
import { useLanguage } from '../../i18n/LanguageContext';
import { getSurvey } from '../../api/platform';
import { formatPublishedDate } from '../../utils/apiMappers';
import { isSimplePoll } from '../../utils/surveyAnswers';
import { SurveyPollForm } from '../PublicPolls/SurveyPollForm';

/**
 * مراجعة استطلاع الزوار قبل نشره (ملاحظة هلا، 16 نوفمبر): معاينة لما يراه الزائر في صفحة «الاستطلاعات» العامة،
 * ثم «انشر للعامة». الاستطلاع البسيط (سؤال واحد باختيار واحد) بخياراته وزر «صوّت»، وغيره بكل أسئلته بحقول
 * نموذج الزوار نفسه (SurveyPollForm) معطّلة.
 * الاستطلاع العام يُنشأ مسودة دائمًا، ولا يصل إلى الزوار إلا من هنا (POST /surveys/{id}/publish).
 * من يراجع، وهل يكون غير الكاتب: ينتظر قرار أمجد (البند 15 في خطة لوحة الإدارة).
 */
export default function PublicSurveyReviewDialog({ survey, onPublish, onClose }) {
  const { t } = useLanguage();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [publishError, setPublishError] = useState('');

  useEffect(() => {
    let alive = true;
    getSurvey(survey.id).then(
      (res) => { if (alive) setDetail(res); },
      (err) => { if (alive) setError(err); },
    );
    return () => { alive = false; };
  }, [survey.id]);

  // «إعادة المحاولة» بعد خطأ التحميل.
  const load = useCallback(() => {
    setError(null);
    getSurvey(survey.id).then(setDetail, setError);
  }, [survey.id]);

  const publish = async () => {
    setBusy(true);
    setPublishError('');
    try {
      await onPublish(survey);
    } catch (err) {
      setPublishError(err?.message || t('common.loadError'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t('adminSurveys.review.title', { title: survey.title })} onClose={onClose} size="lg">
      {!detail && !error && (
        <p role="status" aria-busy="true" className="text-sm text-[var(--wp-text-muted)]">{t('common.loading')}</p>
      )}
      {error && <ErrorState error={error} onRetry={load} />}
      {detail && (
        <div className="space-y-4">
          <p className="text-sm text-[var(--wp-text-2)]">{t('adminSurveys.review.lead')}</p>
          <PublicPollPreview poll={detail} />
          <p className="flex items-center gap-1.5 text-xs text-[var(--wp-text-muted)]">
            {detail.showResults ? <Eye size={14} aria-hidden="true" /> : <EyeOff size={14} aria-hidden="true" />}
            {t(detail.showResults ? 'adminSurveys.review.resultsShown' : 'adminSurveys.review.resultsHidden')}
          </p>
          <p className="text-sm text-[var(--wp-text)]">{t('adminSurveys.review.consequence')}</p>
          {publishError && <Alert>{publishError}</Alert>}
          <div className="flex items-center gap-3">
            <button type="button" onClick={publish} disabled={busy} className="wp-btn-ink flex items-center gap-1.5 px-5 py-2.5 text-sm disabled:opacity-50">
              <Send size={14} aria-hidden="true" /> {t('adminSurveys.review.publish')}
            </button>
            <button type="button" onClick={onClose} className="wp-btn-ghost px-5 py-2.5 rounded-xl text-sm">{t('common.cancel')}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** ما يراه الزائر: العنوان والوصف والموعد والأسئلة بترتيب بطاقة الاستطلاع العامة، بلا تصويت. */
export function PublicPollPreview({ poll }) {
  const { t, lang } = useLanguage();
  const titleId = useId();
  const simple = isSimplePoll(poll);
  const question = poll.questions?.[0];
  // كصفحة الزوار: البسيط عنوانه سؤاله، وغيره عنوانه عنوان الاستطلاع
  const heading = simple ? (question?.text || poll.title) : poll.title;

  return (
    <article aria-labelledby={titleId} className="rounded-2xl border border-[var(--wp-border)] bg-[var(--wp-bg)] p-5 space-y-2" data-preview="public-poll">
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--wp-text-2)]">
        <ChartColumn size={14} aria-hidden="true" /> {t('azraqContent.pollKind')}
      </span>
      <h3 id={titleId} className="text-base font-bold text-[var(--wp-ink)]">{heading}</h3>
      {simple && question?.text && poll.title && poll.title !== question.text && <p className="text-sm text-[var(--wp-text-2)]">{poll.title}</p>}
      {poll.description && <p className="text-sm text-[var(--wp-text-muted)]">{poll.description}</p>}
      <p className="flex items-center gap-1.5 text-xs text-[var(--wp-text-muted)]">
        <CalendarClock size={14} aria-hidden="true" />
        {poll.endsAt ? t('publicPolls.endsOn', { date: formatPublishedDate(poll.endsAt, lang) }) : t('adminSurveys.review.noEnd')}
      </p>
      {simple ? (
        <fieldset disabled className="space-y-2 pt-1">
          <legend className="sr-only">{heading}</legend>
          {(question?.options ?? []).map((text, j) => (
            <label key={j} className="flex items-center gap-2 rounded-xl border border-[var(--wp-border)] px-3 py-2 text-sm text-[var(--wp-text)]">
              <input type="radio" name={`preview-${poll.id}`} />
              <span>{text}</span>
            </label>
          ))}
          <button type="button" className="wp-btn-ink px-4 py-2 text-sm opacity-60">{t('publicPolls.vote')}</button>
        </fieldset>
      ) : (
        <SurveyPollForm poll={poll} readOnly />
      )}
    </article>
  );
}
