import { Link } from 'react-router-dom';
import { openRowFromEvent } from './openRowFromEvent';

// الصف كله يفتح العنصر (قاعدة لوحة الإدارة: docs/ADMIN-UX.md).
// الفتح الحقيقي رابط أو زر داخل الصف عليه data-row-primary (العنوان عادةً): منه يأتي Ctrl/Cmd+نقر،
// والنقر الأوسط، وEnter بلوحة المفاتيح، واسم العنصر لقارئ الشاشة. الصف نفسه يحوّل النقر في أي مكان
// فارغ منه إلى ذلك الرابط، ويترك الأزرار والروابط والحقول الأخرى (حذف، إخفاء، …) تعمل وحدها.

/**
 * صف قابل للنقر كله: ‎<tr>‎ افتراضيًا، أو as="li" / "div" / "article" للبطاقات والقوائم.
 * داخله يجب أن يكون RowLink أو RowButton واحد (العنوان)، وإلا يبقى صفًّا عاديًّا.
 */
export function ClickableRow({ as: Tag = 'tr', className = '', children, ...rest }) {
  return (
    <Tag
      {...rest}
      className={`wp-row ${className}`.trim()}
      onClick={(e) => {
        rest.onClick?.(e);
        openRowFromEvent(e);
      }}
      onAuxClick={(e) => {
        rest.onAuxClick?.(e);
        if (openRowFromEvent(e)) e.preventDefault();
      }}
    >
      {children}
    </Tag>
  );
}

/** عنوان الصف رابطًا حقيقيًّا إلى صفحة العنصر (تحرير أو تفاصيل). */
export function RowLink({ className = '', children, ...rest }) {
  return (
    <Link {...rest} data-row-primary="" className={`wp-row-link ${className}`.trim()}>
      {children}
    </Link>
  );
}

/** عنوان الصف زرًّا حين يفتح العنصر نافذة حوار لا صفحة. */
export function RowButton({ className = '', children, ...rest }) {
  return (
    <button type="button" {...rest} data-row-primary="" className={`wp-row-link ${className}`.trim()}>
      {children}
    </button>
  );
}
