import { useLanguage } from '../../i18n/LanguageContext';
import Alert from './Alert';
import Button from './Button';

/**
 * فشل تحميل بشكل النظام: رسالة الخطأ في Alert (role="alert")، وزر «إعادة المحاولة» إن مُرّر onRetry.
 *   error:   نص أو كائن فيه message (مثل ApiError)؛ بدونه رسالة التحميل العامة.
 *   onRetry: يُستدعى بلا وسائط.
 */
export default function ErrorState({ error, onRetry, className = '' }) {
  const { t } = useLanguage();
  const message = (typeof error === 'string' ? error : error?.message) || t('common.loadError');
  return (
    <Alert className={['ui-error-state', className].filter(Boolean).join(' ')}>
      <span>{message}</span>
      {onRetry && (
        <Button variant="secondary" onClick={() => onRetry()}>
          {t('common.retry')}
        </Button>
      )}
    </Alert>
  );
}
