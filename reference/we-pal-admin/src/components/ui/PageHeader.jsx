import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/**
 * ترويسة صفحة: (رابط رجوع) + عنوان + سطر وصف + أزرار الإجراءات، بشكل واحد في كل الصفحات.
 *   title:      عنوان الصفحة. as: وسم العنوان (h1 افتراضيًا؛ h2 إن كان للصفحة h1 آخر).
 *   subtitle:   سطر تحت العنوان.
 *   backTo / backLabel: رابط الرجوع فوق العنوان (السهم يتبع اتجاه اللغة).
 *   children:   أزرار الإجراءات (Button)؛ تنزل تحت العنوان حين لا تتّسع.
 */
export default function PageHeader({ title, subtitle, as: Heading = 'h1', backTo, backLabel, className = '', children }) {
  return (
    <header className={['ui-page-header', className].filter(Boolean).join(' ')}>
      <div className="ui-page-header-text">
        {backTo && (
          <Link to={backTo} className="ui-page-header-back">
            <ArrowRight aria-hidden="true" />
            {backLabel}
          </Link>
        )}
        <Heading className="ui-page-title">{title}</Heading>
        {subtitle && <p className="ui-page-subtitle">{subtitle}</p>}
      </div>
      {children && <div className="ui-page-header-actions">{children}</div>}
    </header>
  );
}
