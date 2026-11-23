// شارات النظام (pill): خلفية فاتحة ونص بلون مطابق، من التوكنز (styles/components.css).
//   tone: neutral | info | success | warning | violet | danger
// TrackBadge و StatusBadge تختاران اللون من التسمية (عربية أو إنجليزية، من المحاكاة أو الـ API).
const TONES = ['neutral', 'info', 'success', 'warning', 'violet', 'danger'];

export function Badge({ tone = 'neutral', className = '', children }) {
  const safeTone = TONES.includes(tone) ? tone : 'neutral';
  return <span className={['ui-badge', `ui-badge-${safeTone}`, className].filter(Boolean).join(' ')}>{children}</span>;
}

const TRACK_TONES = {
  'بحثي': 'info', Research: 'info',
  'مبادرات': 'success', Initiatives: 'success',
  'محتوى رقمي': 'violet', 'Digital Content': 'violet',
};

const STATUS_TONES = {
  'فكرة': 'neutral', Idea: 'neutral',
  'تخطيط': 'warning', Planning: 'warning',
  'تنفيذ': 'info', 'In Progress': 'info',
  'مراجعة': 'violet', Review: 'violet',
  'منجز': 'success', Done: 'success',
};

export function TrackBadge({ track }) {
  return <Badge tone={TRACK_TONES[track]}>{track}</Badge>;
}

export function StatusBadge({ status }) {
  return <Badge tone={STATUS_TONES[status]}>{status}</Badge>;
}
