// بطاقة النظام: سطح أبيض بحدّ وزاوية ومسافة داخلية من التوكنز (styles/components.css).
// className يضيف أو يعدّل (مثل p-0 لبطاقة بلا حشوة)، وباقي الخصائص تُمرَّر للحاوية.
export default function Card({ children, className = '', ...props }) {
  return (
    <div className={['ui-card', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  );
}
