import { Inbox } from 'lucide-react';

/**
 * حالة «لا شيء هنا» بشكل النظام (styles/components.css): أيقونة ورسالة، ونص وخطوة تالية اختياريان.
 *   icon:    أيقونة lucide (زخرفة، aria-hidden).
 *   title:   الرسالة. heading: وسمها (p افتراضيًا؛ h1 حين تكون الحالة هي الصفحة كلها، مثل «غير موجود»).
 *   text:    سطر توضيحي. action: زر أو رابط (Button) لما يفعله الزائر بعدها.
 *   live:    role="status" ليُعلن حين يظهر؛ false حين تعلن الصفحة الحالة في منطقة أخرى.
 */
export default function EmptyState({ icon: Icon = Inbox, title, text, action, live = true, heading: Title = 'p', className = '' }) {
  return (
    <div role={live ? 'status' : undefined} className={['ui-empty', className].filter(Boolean).join(' ')}>
      <span className="ui-empty-icon"><Icon aria-hidden="true" /></span>
      <Title className="ui-empty-title">{title}</Title>
      {text && <p className="ui-empty-text">{text}</p>}
      {action && <div className="ui-empty-action">{action}</div>}
    </div>
  );
}
