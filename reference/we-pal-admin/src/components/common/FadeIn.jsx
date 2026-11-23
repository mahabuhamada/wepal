export default function FadeIn({ children, delay = 0, className = '' }) {
  return (
    <div
      className={className}
      style={{ animation: `wpFade 0.5s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s both` }}
    >
      {children}
    </div>
  );
}
