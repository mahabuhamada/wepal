import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { trapTab } from '../../utils/focusTrap';

/**
 * درج تفاصيل خطوة من «قلب المساعد»: يدخل من جانب نهاية السطر، ويحبس Tab، ويُغلق بـ Escape أو بزر الإغلاق
 * أو بالنقر على الخلفية، ويعيد التركيز للبطاقة التي فتحته (onClose يتولّاه في الصفحة).
 * Portal إلى body كباقي النوافذ (Modal.jsx)، فيحمل اتجاه اللغة بنفسه.
 */
export default function HubDrawer({ kicker, title, tags, children, foot, onClose }) {
  const { t, dir } = useLanguage();
  const titleId = useId();
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') {
        onCloseRef.current?.();
        return;
      }
      trapTab(event, panelRef.current);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="ahub-drawer-layer" dir={dir}>
      <div className="ahub-drawer-scrim" onClick={() => onClose()} aria-hidden="true" />
      <div ref={panelRef} className="ahub-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="ahub-drawer-head">
          <div>
            <p className="ahub-drawer-kicker">{kicker}</p>
            <h2 id={titleId} className="ahub-drawer-title">{title}</h2>
            {tags && <div className="ahub-drawer-tags">{tags}</div>}
          </div>
          <button ref={closeRef} type="button" className="ahub-drawer-close" onClick={() => onClose()} aria-label={t('assistantHub.drawer.close')}>
            <X aria-hidden="true" />
          </button>
        </div>
        <div className="ahub-drawer-body">{children}</div>
        {foot && <div className="ahub-drawer-foot">{foot}</div>}
      </div>
    </div>,
    document.body,
  );
}
