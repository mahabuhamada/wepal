import { CircleCheck, CircleDashed, PencilLine } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import Button from '../ui/Button';
import { formatNumber } from '../../utils/assistantHub';
import { PhaseTag, SectionHead } from './hubParts';

/** «الأسئلة الشائعة»: المنشور والمسودات لكل تصنيف، ورابط إدارتها وصفحة المساعدة. */
export default function HubFaqPanel({ faq }) {
  const { t } = useLanguage();
  return (
    <section className="ahub-card" aria-labelledby="ahub-faq-title">
      <SectionHead id="ahub-faq-title" title={t('assistantHub.faq.title')} tag={<PhaseTag phase={0} />} lead={t('assistantHub.faq.lead')} />
      <dl className="ahub-kpis is-two">
        <div className="ahub-kpi">
          <dt><CircleCheck aria-hidden="true" />{t('assistantHub.faq.published')}</dt>
          <dd><span className="ahub-num">{formatNumber(faq.published)}</span></dd>
        </div>
        <div className="ahub-kpi">
          <dt><PencilLine aria-hidden="true" />{t('assistantHub.faq.drafts')}</dt>
          <dd><span className="ahub-num">{formatNumber(faq.drafts)}</span></dd>
        </div>
      </dl>
      {faq.byCategory.length > 0 && (
        <>
          <h3 className="ahub-sub-h">{t('assistantHub.faq.byCategory')}</h3>
          <ul className="ahub-rows">
            {faq.byCategory.map((row) => (
              <li key={row.category}>
                <span>{t(`faq.categories.${row.category}`)}</span>
                {row.published + row.drafts === 0 ? (
                  <span className="ahub-row-empty"><CircleDashed aria-hidden="true" />{t('assistantHub.faq.emptyCategory')}</span>
                ) : (
                  <span className="ahub-num">{t('assistantHub.faq.categoryCounts', { published: formatNumber(row.published), drafts: formatNumber(row.drafts) })}</span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      <div className="ahub-acts">
        <Button variant="secondary" to="/admin/faq">{t('assistantHub.faq.manage')}</Button>
        <Button variant="ghost" to="/help">{t('assistantHub.faq.viewHelp')}</Button>
      </div>
    </section>
  );
}
