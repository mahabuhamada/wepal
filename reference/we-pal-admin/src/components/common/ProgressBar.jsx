export default function ProgressBar({ value, className = '' }) {
  const complete = value >= 100;
  return (
    <div className={`h-1.5 rounded-full bg-[#F0F0F0] w-full ${className}`}>
      <div
        className="h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${value}%`, backgroundColor: complete ? 'var(--wp-coral)' : 'var(--wp-ink)' }}
      />
    </div>
  );
}
