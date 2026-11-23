import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import EmptyState from './EmptyState';
import { useLanguage } from '../../i18n/LanguageContext';

// بديل صفحة ميزة معطّلة بعلم (FEATURES): رسالة «غير متاح بعد» بدل بيانات وهمية.
export default function FeatureUnavailable({ backTo = '/' }) {
  const { t } = useLanguage();
  return (
    <div className="mx-auto w-full max-w-xl px-6 py-16">
      <EmptyState
        icon={Clock}
        title={t('common.featureUnavailableTitle')}
        text={t('common.featureUnavailableText')}
        action={
          <Link to={backTo} className="wp-btn-ink inline-flex rounded-xl px-4 py-2 text-sm">
            {t('common.featureUnavailableBack')}
          </Link>
        }
      />
    </div>
  );
}
