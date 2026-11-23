// رابط المعاينة من المحرّر: ‎?preview=<توكن>‎ على صفحة المادة العامة (مقال، خبر، مصدر، قصة) وهي مسودّة.
// الخادم وحده يتحقق من التوكن (backend/app/Services/Editorial/PreviewLink.php)؛ هنا نقرؤه من الرابط ونمرّره
// إلى الـ API كما هو. الشكل نفسه فقط (المعرّف.الانتهاء.التوقيع)، فلا تصل قيمة عشوائية إلى الطلب.
const TOKEN = /^[0-9a-f-]{36}\.\d{1,12}\.[A-Za-z0-9_-]{43}$/;

const paramsOf = (source) => {
  if (!source) return null;
  if (source instanceof URLSearchParams) return source;
  if (typeof source === 'string') {
    const at = source.indexOf('?');
    return new URLSearchParams(at >= 0 ? source.slice(at) : source);
  }
  if (source.searchParams instanceof URLSearchParams) return source.searchParams; // URL
  if (typeof source.url === 'string') return new URL(source.url).searchParams; // Request (loader)
  return null;
};

/**
 * توكن المعاينة من رابط الصفحة، أو null.
 *   source: Request (loader) أو URL أو URLSearchParams أو نص (location.search أو رابط كامل).
 */
export function previewToken(source) {
  let token = null;
  try {
    token = paramsOf(source)?.get('preview') ?? null;
  } catch {
    return null;
  }
  return token && TOKEN.test(token) ? token : null;
}

/** مسار الـ API ومعه ‎preview=‎ إن وُجد توكن، وإلا المسار كما هو. */
export function withPreview(path, token) {
  if (!token) return path;
  return `${path}${path.includes('?') ? '&' : '?'}preview=${encodeURIComponent(token)}`;
}
