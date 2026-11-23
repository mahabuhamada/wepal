import { cloneElement, isValidElement, useId } from 'react';

/**
 * حقل نموذج: تسمية + عنصر إدخال + نص مساعد + رسالة خطأ، مربوطة ببعضها لقارئ الشاشة.
 * يأخذ عنصر إدخال واحدًا (Input / Textarea / Select أو أي عنصر يقبل id) ويحقن فيه:
 *   id (فتصير التسمية قابلة للنقر)، aria-describedby (النص المساعد والخطأ)، aria-invalid عند الخطأ.
 *   label:    نص التسمية. optional: نص صغير بجانبها («اختياري»).
 *   hint:     سطر مساعد دائم تحت الحقل.
 *   error:    رسالة خطأ (role=alert)؛ وجودها يلوّن الحقل ويعلن عدم صلاحيته.
 */
export default function Field({ label, optional, hint, error, className = '', children }) {
  const autoId = useId();
  const control = isValidElement(children) ? children : null;
  const id = control?.props.id ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [control?.props['aria-describedby'], hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={['ui-field', className].filter(Boolean).join(' ')}>
      {label && (
        <label className="ui-label" htmlFor={id}>
          {label}
          {optional && <span className="ui-label-optional"> ({optional})</span>}
        </label>
      )}
      {control
        ? cloneElement(control, {
          id,
          'aria-describedby': describedBy,
          // عنصر DOM خام لا يعرف invalid: نعلن الحالة بـ aria-invalid مباشرة.
          ...(typeof control.type === 'string'
            ? (error ? { 'aria-invalid': true } : {})
            : { invalid: Boolean(error) || control.props.invalid }),
        })
        : children}
      {hint && <span id={hintId} className="ui-hint">{hint}</span>}
      {error && <span id={errorId} role="alert" className="ui-error">{error}</span>}
    </div>
  );
}
