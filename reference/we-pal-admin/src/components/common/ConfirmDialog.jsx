import { useRef, useState } from 'react';
import Modal from './Modal';
import { useLanguage } from '../../i18n/LanguageContext';
import Alert from '../ui/Alert';
import Button from '../ui/Button';

// نافذة تأكيد لإجراء (غالبًا لا رجعة فيه). onConfirm دالة async؛ خطؤها يظهر داخل النافذة
// وتبقى مفتوحة، ونجاحها يغلقها. danger: زر التأكيد بلون التحذير.
export default function ConfirmDialog({ title, message, confirmLabel, danger = false, onConfirm, onClose }) {
  const { t } = useLanguage();
  const cancelRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err?.message || t('common.loadError'));
      setBusy(false);
    }
  };

  return (
    // التركيز الأول على «إلغاء» حتى لا يُنفَّذ الإجراء بضغطة Enter عابرة.
    <Modal title={title} onClose={busy ? undefined : onClose} initialFocusRef={cancelRef} size="sm">
      <p className="text-sm leading-relaxed text-[var(--wp-text-2)]">{message}</p>
      {error && (
        <Alert size="sm" className="mt-3">
          {error}
        </Alert>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button ref={cancelRef} variant="ghost" size="sm" onClick={onClose} disabled={busy}>
          {t('common.cancel')}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} size="sm" onClick={confirm} loading={busy}>
          {busy ? t('projectDetail.manage.working') : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
