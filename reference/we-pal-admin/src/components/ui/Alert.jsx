const TONES = ['danger', 'warning', 'success', 'info'];

/**
 * صندوق رسالة داخل الصفحة: خطأ، تحذير، نجاح، أو معلومة (styles/components.css).
 *   tone: danger (الافتراضي) | warning | success | info
 *   size: md (الافتراضي) | sm (داخل النوافذ والبطاقات الضيقة)
 *   role: alert لـ danger و warning (يُعلَن فورًا لقارئ الشاشة)، و status للباقي؛ يمكن تمريره صراحةً.
 * className لأصناف التخطيط فقط (هوامش، flex…).
 */
export default function Alert({ tone = 'danger', size = 'md', role, className = '', children, ...rest }) {
  const safeTone = TONES.includes(tone) ? tone : 'danger';
  const classes = ['ui-alert', `ui-alert-${safeTone}`, size === 'sm' ? 'ui-alert-sm' : '', className].filter(Boolean).join(' ');
  const liveRole = role ?? (safeTone === 'danger' || safeTone === 'warning' ? 'alert' : 'status');
  return (
    <div role={liveRole} className={classes} {...rest}>
      {children}
    </div>
  );
}
