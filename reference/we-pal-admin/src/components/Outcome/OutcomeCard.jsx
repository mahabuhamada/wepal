import { useId } from 'react';
import { Link } from 'react-router-dom';
import { Check, Lock } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatShortDate } from '../../utils/apiMappers';
import { outcomeLines, outcomeRegionBars, outcomeSubjectPath } from '../../utils/outcome';

// فقرات النص كما كتبها المدير (سطر لكل فقرة).
function Paragraphs({ text }) {
  return outcomeLines(text).map((line, i) => <p key={i}>{line}</p>);
}

// «فعلنا»: أكثر من سطر ← قائمة، وسطر واحد ← فقرة.
function DidList({ text }) {
  const lines = outcomeLines(text);
  if (lines.length <= 1) return <Paragraphs text={text} />;
  return <ul>{lines.map((line, i) => <li key={i}>{line}</li>)}</ul>;
}

function RegionBars({ regions }) {
  const { t } = useLanguage();
  const data = outcomeRegionBars(regions);
  const caption = {
    share: data.topOption ? t('outcome6a.byShare', { option: data.topOption }) : t('outcome6a.byParticipants'),
    average: t('outcome6a.byAverage'),
    participants: t('outcome6a.byParticipants'),
  }[data.mode];

  return (
    <div className="oc-regions">
      {data.bars.length > 0 && (
        <>
          <p className="oc-regions-caption">{caption}</p>
          <ul className="oc-bars" aria-label={t('outcome6a.regionsLabel')}>
            {data.bars.map((bar) => (
              <li key={bar.region} className="oc-bar">
                <span>{t(`outcome6a.regions.${bar.region}`)}</span>
                <span className="oc-track" aria-hidden="true"><span style={{ width: `${bar.width}%` }} /></span>
                <b>{bar.value}</b>
              </li>
            ))}
          </ul>
        </>
      )}
      <p className="oc-threshold"><Lock aria-hidden="true" />{t('outcome6a.threshold', { count: data.threshold })}</p>
    </div>
  );
}

/**
 * بطاقة الخلاصة «سألنا / قلتم / فعلنا» (الحزمة 6أ، نموذج design-directions/member-area #votes).
 * outcome: شكل OutcomeResource (أو الحقل المضمّن outcome في الاستطلاع/المشاورة).
 * regions يظهر في «قلتم» إن وصل من GET .../outcome، وملاحظة الحد الأدنى معه دائمًا.
 * showTitle=false في صفحة العنصر نفسه (عنوانه فوقها).
 * compact: نسخة القوائم — بلا مناطق، وعنوان العنصر رابط لصفحته.
 */
export default function OutcomeCard({ outcome, title, subjectType, subjectId, participantsCount, closedAt, compact = false, headingLevel = 2, showTitle = true }) {
  const { t, lang } = useLanguage();
  const headingId = useId();
  if (!outcome) return null;

  const Heading = `h${headingLevel}`;
  const Sub = `h${Math.min(6, headingLevel + 1)}`;
  const shownTitle = showTitle ? (title ?? outcome.subjectTitle) : null;
  const type = subjectType ?? outcome.subjectType;
  const id = subjectId ?? outcome.subjectId;
  const count = participantsCount ?? outcome.participantsCount;
  const closed = closedAt ?? outcome.closedAt;
  const meta = count != null
    ? (closed ? t('outcome6a.meta', { count, date: formatShortDate(closed, lang) }) : t('outcome6a.metaNoDate', { count }))
    : null;

  return (
    <section className={`oc-card${compact ? ' oc-compact' : ''}`} aria-labelledby={shownTitle ? headingId : undefined} aria-label={shownTitle ? undefined : t('outcome6a.chip')}>
      <div className="oc-head">
        <div className="oc-meta">
          <span className="oc-chip"><Check aria-hidden="true" />{t('outcome6a.chip')}</span>
          {meta && <span>{meta}</span>}
        </div>
        {shownTitle && (
          <Heading id={headingId} className="oc-title">
            {compact && type && id ? <Link to={outcomeSubjectPath(type, id)}>{shownTitle}</Link> : shownTitle}
          </Heading>
        )}
      </div>
      <div className="oc-ysd">
        <div className="oc-col oc-asked">
          <Sub>{t('outcome6a.asked')}</Sub>
          <Paragraphs text={outcome.asked} />
        </div>
        <div className="oc-col oc-said">
          <Sub>{t('outcome6a.said')}</Sub>
          <Paragraphs text={outcome.said} />
          {!compact && outcome.regions && <RegionBars regions={outcome.regions} />}
        </div>
        <div className="oc-col oc-did">
          <Sub>{t('outcome6a.did')}</Sub>
          <DidList text={outcome.did} />
        </div>
      </div>
    </section>
  );
}

/**
 * قائمة «انتهت بنتيجة»: بطاقات مختصرة لما نُشرت خلاصته. items: [{ id, title, outcome, participantsCount, closedAt }].
 * لا تُعرض إن لم يكن فيها شيء.
 */
export function OutcomeList({ items, subjectType }) {
  const { t } = useLanguage();
  const withOutcome = (items || []).filter((item) => item?.outcome);
  if (withOutcome.length === 0) return null;
  return (
    <section className="oc-list" aria-label={t('outcome6a.listTitle')}>
      <div className="oc-list-head">
        <h2>{t('outcome6a.listTitle')}</h2>
        <p>{t('outcome6a.listText')}</p>
      </div>
      {withOutcome.map((item) => (
        <OutcomeCard
          key={item.id}
          compact
          headingLevel={3}
          outcome={item.outcome}
          title={item.title}
          subjectType={subjectType}
          subjectId={item.id}
          participantsCount={item.participantsCount}
          closedAt={item.closedAt ?? item.outcome.closedAt}
        />
      ))}
    </section>
  );
}
