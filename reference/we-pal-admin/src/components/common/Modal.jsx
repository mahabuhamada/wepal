import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { FOCUSABLE, trapTab } from '../../utils/focusTrap';


// نافذة حوار مشتركة.
// Portal إلى body: أي أب فيه transform (حركات framer-motion) يجعل fixed نسبيًا له فتُقصّ النافذة.
// تُغلق بـ Escape أو بالنقر على الخلفية، تحبس Tab داخلها، تقفل تمرير الصفحة،
// وتعيد التركيز للعنصر الذي فتحها عند الإغلاق.
// initialFocusRef: عنصر يأخذ التركيز عند الفتح (افتراضيًا أول عنصر قابل للتركيز).
export default function Modal({ open = true, onClose, title, children, initialFocusRef, size = 'md' }) {
  const { t } = useLanguage();
  const titleId = useId();
  const panelRef = useRef(null);
  // أحدث onClose دون إعادة تهيئة المستمعين (المستدعي غالبًا يمرّر دالة جديدة كل render).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const target = initialFocusRef?.current || panelRef.current?.querySelector(FOCUSABLE) || panelRef.current;
    target?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current?.();
        return;
      }
      trapTab(e, panelRef.current);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    };
    // initialFocusRef ثابت عادةً؛ نعيد التهيئة فقط عند الفتح/الإغلاق.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const width = size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-sm' : 'max-w-md';

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={`w-full ${width} max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl text-start outline-none`}
      >
        {title && (
          <div className="flex items-start justify-between gap-4 mb-4">
            <h2 id={titleId} className="text-base font-bold text-[var(--wp-ink)]">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label={t('common.close')}
              className="text-[var(--wp-text-muted)] hover:text-[var(--wp-text-2)]"
            >
              <X size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body,
  );
}
