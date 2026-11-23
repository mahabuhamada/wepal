import Alert from '../../ui/Alert';
import { useLanguage } from '../../../i18n/LanguageContext';

/** حالة صف في معاينة التوزيع (جاهز بالأخضر، وغيره تنبيه). */
export function StatusPill({ status }) {
  const { t } = useLanguage();
  return <span className={`azq-pill${status === 'ok' ? ' is-ok' : ' is-warn'}`}>{t(`adminDistribution.status.${status}`)}</span>;
}

/**
 * سطر السعة لكل مساحة يتغيّر عددها، وتنبيه إن تجاوزت حدها، وعدد الجاهز للحفظ.
 * المعاينة تمنع تجاوز 8 أعضاء (الخادم يرفض الحفظ أيضًا).
 */
export default function PlanSummary({ plan }) {
  const { t } = useLanguage();
  const ok = plan?.counts?.ok ?? 0;
  const total = plan?.counts?.total ?? 0;

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{ok > 0 ? t('adminDistribution.plan.ready', { count: ok, total }) : t('adminDistribution.plan.none')}</p>
      {(plan?.workspaces ?? []).map((w) => (
        <div key={w.id}>
          <p className="text-sm text-[var(--wp-text-2)]">{t('adminDistribution.plan.capacity', { title: w.title, before: w.before, after: w.after, max: w.max })}</p>
          {w.full && <Alert size="sm" className="mt-1">{t('adminDistribution.plan.full', { max: w.max })}</Alert>}
        </div>
      ))}
    </div>
  );
}
