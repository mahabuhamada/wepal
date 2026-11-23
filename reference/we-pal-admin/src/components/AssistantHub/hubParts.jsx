import { CircleDashed, Flag } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { STATE_ICONS } from './hubIcons';

// أجزاء صغيرة مشتركة في «مركز المساعد». الحالة لا تُعرض باللون وحده: أيقونة بشكل مختلف + نص دائمًا.

/** وسم المرحلة: 0 = «قائم اليوم»، وإلا «المرحلة N». */
export function PhaseTag({ phase }) {
  const { t } = useLanguage();
  const live = !phase;
  return (
    <span className={`ahub-phase${live ? ' is-live' : ''}`}>
      <Flag aria-hidden="true" />
      {live ? t('assistantHub.liveTag') : t('assistantHub.phaseTag', { phase })}
    </span>
  );
}

/** شارة حالة: أيقونة + نص بلون الحالة (ok | warn | pending | planned | bad). */
export function StateBadge({ state, icon, children, className = '' }) {
  const Icon = icon ?? STATE_ICONS[state] ?? CircleDashed;
  return (
    <span className={['ahub-badge', `is-${state}`, className].filter(Boolean).join(' ')}>
      <Icon aria-hidden="true" />
      <span>{children}</span>
    </span>
  );
}

/** عنوان قسم: h2 + سطر وصف + ما في جانبه. */
export function SectionHead({ id, title, lead, tag, side }) {
  return (
    <div className="ahub-sec-head">
      <div>
        <h2 id={id} className="ahub-sec-title">
          {title}
          {tag}
        </h2>
        {lead && <p className="ahub-sec-lead">{lead}</p>}
      </div>
      {side && <div className="ahub-sec-side">{side}</div>}
    </div>
  );
}
