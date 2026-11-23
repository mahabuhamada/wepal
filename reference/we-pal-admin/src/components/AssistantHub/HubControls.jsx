import { CircleCheck, CircleMinus, Clock, Lock } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { formatWhen } from '../../utils/assistantHub';
import { PhaseTag, SectionHead, StateBadge } from './hubParts';

/**
 * «الضوابط والحدود» للقراءة فقط: حالة صفحة «اسأل» اليوم، والقرارات المعتمدة للمساعد بنموذج لغوي
 * (الأعضاء فقط، 20 سؤالًا في اليوم، 50 دولارًا في الشهر، Claude Sonnet) بوسم «يُفعَّل في المرحلة N».
 * لا مفاتيح ولا حقول: لا شيء هنا يغيّر سلوك المنصة.
 */
export default function HubControls({ ask, askEnabled }) {
  const { t, lang } = useLanguage();
  const { planned } = ask;
  const rows = [
    { key: 'audience', label: t('assistantHub.controls.audience'), hint: t('assistantHub.controls.audienceHint'), value: t('assistantHub.controls.audienceValue') },
    { key: 'daily', label: t('assistantHub.controls.daily'), hint: t('assistantHub.controls.dailyHint'), value: t('assistantHub.controls.dailyValue', { count: planned.dailyLimitPerMember }) },
    { key: 'cap', label: t('assistantHub.controls.cap'), hint: t('assistantHub.controls.capHint'), value: t('assistantHub.controls.capValue', { amount: planned.monthlyCapUsd }) },
    { key: 'model', label: t('assistantHub.controls.model'), hint: t('assistantHub.controls.modelHint'), value: <span lang="en">{planned.model}</span> },
  ];

  return (
    <section className="ahub-card" aria-labelledby="ahub-controls-title">
      <SectionHead
        id="ahub-controls-title"
        title={t('assistantHub.controls.title')}
        lead={t('assistantHub.controls.lead')}
        side={<span className="ahub-anon"><Lock aria-hidden="true" />{t('assistantHub.controls.readOnly')}</span>}
      />

      <div className="ahub-ask-state">
        <div>
          <b>{t('assistantHub.controls.askPage')}</b>
          <span className="ahub-hint">{t('assistantHub.controls.askPageHint')}</span>
          {ask.lastAskAt && <span className="ahub-hint">{t('assistantHub.controls.lastAsk', { time: formatWhen(ask.lastAskAt, lang) })}</span>}
        </div>
        <div className="ahub-ask-badges">
          {askEnabled
            ? <StateBadge state="ok" icon={CircleCheck}>{t('assistantHub.controls.askOn')}</StateBadge>
            : <StateBadge state="planned" icon={CircleMinus}>{t('assistantHub.controls.askOff')}</StateBadge>}
          <PhaseTag phase={0} />
        </div>
      </div>

      <h3 className="ahub-sub-h">{t('assistantHub.controls.plannedTitle')}</h3>
      <p className="ahub-hint ahub-sub-lead">{t('assistantHub.controls.plannedHint')}</p>
      <dl className="ahub-ctl-list">
        {rows.map((row) => (
          <div key={row.key} className="ahub-ctl">
            <dt>
              {row.label}
              <span className="ahub-hint">{row.hint}</span>
            </dt>
            <dd>
              <span className="ahub-ctl-value">{row.value}</span>
              <StateBadge state="planned" icon={Clock}>{t('assistantHub.controls.plannedBadge', { phase: planned.phase })}</StateBadge>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
