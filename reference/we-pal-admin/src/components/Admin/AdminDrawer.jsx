import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

/**
 * درج التفاصيل (العين): يفتح من جهة البداية، Esc أو الخلفية تغلقه، والتركيز يعود إلى ما فتحه.
 */
export default function AdminDrawer({ title, onClose, footer, children, labelledBy }) {
  const { t } = useLanguage();
  const closeRef = useRef(null);
  const opener = useRef(typeof document !== 'undefined' ? document.activeElement : null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const back = opener.current;
    return () => {
      document.removeEventListener('keydown', onKey);
      if (back && typeof back.focus === 'function') back.focus();
    };
  }, [onClose]);

  return createPortal(
    <>
      <div className="azq-drawer-scrim" onClick={onClose} aria-hidden="true" />
      <aside className="azq-drawer" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        <div className="azq-drawer-h">
          <h2 id={labelledBy}>{title}</h2>
          <button ref={closeRef} type="button" className="azq-btn-ghost" onClick={onClose} aria-label={t('common.close')}><X aria-hidden="true" /></button>
        </div>
        <div className="azq-drawer-b">{children}</div>
        {footer && <div className="azq-drawer-f">{footer}</div>}
      </aside>
    </>,
    document.body,
  );
}
