import { useLanguage } from '../../i18n/LanguageContext';

/**
 * شريط الإجراء الجماعي: يظهر عند تحديد صف واحد على الأقل، ثابتًا أعلى القائمة بخلفية كحلية.
 * actions: [{key,label,onClick,disabled?}]. Esc في الصفحة يلغي التحديد (تتولاه الصفحة).
 */
export default function BulkBar({ count, actions, onClear }) {
  const { t } = useLanguage();
  if (!count) return null;
  return (
    <div className="azq-bulk" role="region" aria-label={t('adminLists.bulk.region')}>
      <b aria-live="polite">{t('adminLists.bulk.selected', { count })}</b>
      {actions.map((a) => (
        <button key={a.key} type="button" onClick={a.onClick} disabled={a.disabled}>{a.label}</button>
      ))}
      <button type="button" onClick={onClear}>{t('adminLists.bulk.clear')}</button>
    </div>
  );
}
