import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useTheme } from '../../theme/ThemeContext';
import { NoticeContext } from './adminNoticeContext';

// نتيجة إجراء في لوحة الإدارة («حُفظ»، «تغيّر الدور»، «أُغلق البلاغ»…) حتى لا يمرّ نجاح بصمت.
// تُعلن لقارئ الشاشة (aria-live) دون أن تأخذ التركيز، وتختفي بعد ثوانٍ.
// السمة «أزرق هادئ» تعرضها أيضًا تنبيهًا ظاهرًا؛ التصميم الحالي يعلنها فقط فلا يتغيّر شكله.
const VISIBLE_MS = 6000;

export function AdminNoticeProvider({ children }) {
  const [notice, setNotice] = useState(null); // { id, text, undo? }
  // undo: دالة اختيارية تُرجع وعدًا — تظهر بزرّ «تراجع» لما يمكن التراجع عنه (الإخفاء، والتعليم مقروءًا)
  const notify = useCallback((text, { undo } = {}) => setNotice({ id: Date.now(), text, undo }), []);
  const dismiss = useCallback(() => setNotice(null), []);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(null), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  const value = useMemo(() => ({ notify, notice, dismiss }), [notify, notice, dismiss]);
  return <NoticeContext.Provider value={value}>{children}</NoticeContext.Provider>;
}

/** منطقة الإعلان داخل <main>: موجودة دائمًا (فارغة) حتى يلتقط قارئ الشاشة كل تغيير فيها. */
export function AdminNoticeRegion() {
  const { notice, dismiss } = useContext(NoticeContext);
  const { theme } = useTheme();
  const { t } = useLanguage();

  if (theme !== 'azraq') {
    return <div className="sr-only" role="status" aria-live="polite">{notice?.text}</div>;
  }

  return (
    <div className="azq-toast-region" role="status" aria-live="polite">
      {notice && (
        <div key={notice.id} className="azq-toast">
          <CheckCircle2 aria-hidden="true" />
          <span>{notice.text}</span>
          {notice.undo && (
            <button
              type="button"
              className="azq-toast-undo"
              onClick={async () => {
                const undo = notice.undo;
                dismiss();
                await undo();
              }}
            >
              {t('adminLists.undo')}
            </button>
          )}
          <button type="button" onClick={dismiss} aria-label={t('common.close')}>
            <X aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}
