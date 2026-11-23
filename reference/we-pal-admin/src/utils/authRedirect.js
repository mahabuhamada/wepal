// العودة إلى الصفحة المطلوبة بعد الدخول: صفحات الأعضاء تحوّل الزائر إلى ‎/login?next=…‎ وصفحة الدخول تعيده إليها.
// next مسار داخلي فقط (يبدأ بـ / لا بـ // ولا \): لا تحويل إلى موقع آخر (open redirect)، ولا رجوع إلى صفحات الحساب.

const ACCOUNT_PAGES = ['/login', '/join', '/forgot-password', '/reset-password'];

/** المسار الآمن للرجوع إليه بعد الدخول، أو null. */
export function safeNextPath(raw) {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(value)) return null;
  const path = value.split(/[?#]/)[0];
  if (ACCOUNT_PAGES.some((page) => path === page || path.startsWith(`${page}/`))) return null;
  return value;
}

/** رابط صفحة الدخول مع الصفحة المطلوبة (بلا next إن كانت «لوحتي» أو غير صالحة). */
export function loginPathFor(from) {
  const next = safeNextPath(from);
  return next && next !== '/dashboard' ? `/login?next=${encodeURIComponent(next)}` : '/login';
}
