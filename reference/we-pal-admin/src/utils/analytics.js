// سياق مشاهدات التحليلات (docs/ANALYTICS.md في الباك اند).
// الطلبات العامة بلا توكن، فالمتصفح يصرّح بنوع الزائر: visitor | member | staff (الطاقم يُستبعد من التقارير).
// المُحيل الخارجي (document.referrer) يُرسل مع أول مشاهدة في الجلسة فقط: التنقّل داخل الموقع ليس إحالة.
import { isStaff } from './roles';

let audience = 'visitor';
let referrerSent = false;

export function setAnalyticsAudience(user) {
  audience = !user ? 'visitor' : isStaff(user) ? 'staff' : 'member';
}

export function analyticsContext() {
  const ctx = { audience };
  if (!referrerSent) {
    referrerSent = true;
    const ref = globalThis.document?.referrer;
    if (ref) ctx.referrer = ref;
  }
  return ctx;
}

// للاختبارات فقط
export function resetAnalyticsContext() {
  audience = 'visitor';
  referrerSent = false;
}
