import { Link } from 'react-router-dom';

const VARIANTS = ['primary', 'secondary', 'ghost', 'danger', 'danger-outline'];
const SIZES = ['md', 'sm', 'lg'];

/**
 * زر النظام (المرحلة 2 من نظام التصميم). شكل واحد لكل الأزرار، من التوكنز (styles/components.css).
 *   variant:   primary (الإجراء الرئيسي) | secondary (إجراء مرافق) | ghost (إجراء هادئ) | danger (تأكيد حذف وما لا يُتراجع عنه)
 *              | danger-outline (زر يفتح إجراءً خطرًا: «حذف…» في شريط أدوات، قبل نافذة التأكيد)
 *   size:      md (الافتراضي، 44px للمس) | sm (داخل الصفوف والبطاقات) | lg (الإجراء الوحيد في نموذج: دخول، تسجيل)
 *   to / href: يُرسم كرابط بنفس الشكل (تنقّل داخلي / خارجي) بدل <button>
 *   loading:   يعطّل الزر ويعلن الانشغال لقارئ الشاشة؛ النص يختاره المستدعي («جارٍ الحفظ…»)
 *   fullWidth: بعرض الحاوية (نماذج الحساب، الجوال)
 *   iconOnly:  زر مربّع بأيقونة فقط؛ يلزمه aria-label
 * الأيقونة تُمرَّر ضمن children (قبل النص أو بعده) فتتبع اتجاه اللغة تلقائيًا.
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  to,
  href,
  loading = false,
  fullWidth = false,
  iconOnly = false,
  disabled = false,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'ui-btn',
    `ui-btn-${VARIANTS.includes(variant) ? variant : 'primary'}`,
    SIZES.includes(size) && size !== 'md' ? `ui-btn-${size}` : '',
    fullWidth ? 'ui-btn-block' : '',
    iconOnly ? 'ui-btn-icon' : '',
    className,
  ].filter(Boolean).join(' ');

  const inactive = disabled || loading;

  if (to !== undefined || href !== undefined) {
    // الرابط لا يُعطَّل بـ disabled: نزيله من الترتيب ونعلن الحالة.
    const linkProps = {
      className: classes,
      'aria-disabled': inactive || undefined,
      'aria-busy': loading || undefined,
      tabIndex: inactive ? -1 : undefined,
      onClick: inactive ? (event) => event.preventDefault() : rest.onClick,
    };
    return to !== undefined
      ? <Link to={to} {...rest} {...linkProps}>{children}</Link>
      : <a href={href} {...rest} {...linkProps}>{children}</a>;
  }

  return (
    <button type={type} className={classes} disabled={inactive} aria-busy={loading || undefined} {...rest}>
      {children}
    </button>
  );
}
