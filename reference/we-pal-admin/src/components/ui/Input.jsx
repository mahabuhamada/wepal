/**
 * عناصر الإدخال في النظام: Input و Textarea و Select بشكل واحد من التوكنز (styles/components.css).
 *   icon:    (Input فقط) أيقونة في بداية الحقل؛ تتبع اتجاه اللغة.
 *   invalid: يلوّن الحدّ ويضع aria-invalid (يضعه Field تلقائيًا عند وجود خطأ).
 * باقي الخصائص تُمرَّر كما هي للعنصر الأصلي (value، onChange، name، type، dir…).
 */
const cx = (...parts) => parts.filter(Boolean).join(' ');
const a11y = (invalid) => (invalid ? { 'aria-invalid': true } : {});

export function Input({ icon: Icon, invalid = false, className = '', ...rest }) {
  if (!Icon) return <input className={cx('ui-input', className)} {...a11y(invalid)} {...rest} />;
  return (
    <span className={cx('ui-input-wrap', invalid && 'is-invalid', className)}>
      <Icon aria-hidden="true" />
      <input className="ui-input-bare" {...a11y(invalid)} {...rest} />
    </span>
  );
}

export function Textarea({ invalid = false, className = '', rows = 4, ...rest }) {
  return <textarea className={cx('ui-input ui-textarea', className)} rows={rows} {...a11y(invalid)} {...rest} />;
}

export function Select({ invalid = false, className = '', children, ...rest }) {
  return (
    <select className={cx('ui-input ui-select', className)} {...a11y(invalid)} {...rest}>
      {children}
    </select>
  );
}

export default Input;
