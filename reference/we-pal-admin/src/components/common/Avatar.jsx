import { useState } from 'react';

// الصورة الشخصية: avatarUrl (رابط موقَّع مؤقت من آخر رد — لا يُخزَّن، العقد §0 B5.2) إن وُجد،
// وإلا الحرف. فشل تحميل الصورة (رابط منتهٍ مثلًا) يرجع للحرف.
export default function Avatar({ letter, src, size = 32, color = '#1A1A1A', textColor }) {
  const [failedSrc, setFailedSrc] = useState(null);
  // الهوية: خلفية حبرية وحرف أزرق فاتح (تباين AA). عند تمرير خلفية فاتحة (تدرّجات باستيل) نستخدم نصًا حبريًا مقروءًا.
  const isInk = color === '#1A1A1A' || color === '#1a1a1a';
  const fg = textColor ?? (isInk ? 'var(--wepal-primary-300)' : 'var(--wp-ink)');
  const showImage = Boolean(src) && failedSrc !== src;

  return (
    <div
      className="rounded-full flex items-center justify-center font-bold shrink-0 overflow-hidden"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        color: fg,
        // الحرف لا ينزل تحت الحد الأدنى للسلّم (12px) حتى في الصور الصغيرة (24px كانت تعطي 10px).
        fontSize: Math.max(12, size * 0.42),
      }}
    >
      {showImage ? (
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailedSrc(src)} />
      ) : (
        letter
      )}
    </div>
  );
}

// نفس المنطق لعناصر .avatar المنسّقة بـ CSS (الترويسة، الإعدادات، الملف الشخصي).
export function AvatarContent({ src, letter }) {
  const [failedSrc, setFailedSrc] = useState(null);
  if (src && failedSrc !== src) {
    return <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }} onError={() => setFailedSrc(src)} />;
  }
  return letter;
}
