import { useLanguage } from '../../i18n/LanguageContext';

// شارة «مثال» لعناصر بذرة العرض في الموقع الفعلي (مستخدم، مشروع، مجموعة، استشارة، استطلاع، خبر):
// توضّح للزائر أن العنصر توضيحي لشرح المنصة وليس نشاطًا حقيقيًا.
// show: حقل التعليم القادم من الخادم؛ بلا تعليم لا يُعرض شيء.
// w-fit: داخل حاوية flex عمودية كانت الشارة تتمدد بعرض البطاقة كله.
export default function DemoBadge({ show, className = '' }) {
  const { t } = useLanguage();
  if (!show) return null;
  return (
    <span
      title={t('demo.hint')}
      className={`inline-flex w-fit shrink-0 items-center rounded-full border border-dashed border-[#8a590e] bg-[var(--wp-warning-tint)] px-2 py-[3px] text-caption font-bold leading-none text-[#8a590e] ${className}`}
    >
      {t('demo.badge')}
      <span className="sr-only"> — {t('demo.hint')}</span>
    </span>
  );
}

// سطر «للقراءة فقط» في رأس العنصر التوضيحي (مشروع، مجموعة…): يشرح لماذا لا تظهر أزرار
// المشاركة، بدل أن يصل المستخدم إلى 403 DemoContent من الخادم.
export function DemoReadOnlyNote({ className = '' }) {
  const { t } = useLanguage();
  return (
    <p role="note" className={`rounded-xl border border-dashed border-[#8a590e] bg-[var(--wp-warning-tint)] px-3 py-2 text-xs leading-relaxed text-[#8a590e] ${className}`}>
      {t('demo.readOnly')}
    </p>
  );
}
