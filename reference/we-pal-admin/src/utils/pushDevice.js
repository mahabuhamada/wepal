// تنبيهات الجهاز (Web Push): ما يدعمه هذا المتصفح، وتحويل مفتاح VAPID. دوال نقية للاختبار.

/** base64url (مفتاح VAPID العام) ← Uint8Array كما يطلبه pushManager.subscribe. */
export function urlBase64ToUint8Array(base64) {
  const padded = `${base64}${'='.repeat((4 - (base64.length % 4)) % 4)}`.replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/**
 * حالة الجهاز:
 *  'unsupported'  لا Service Worker أو لا Push (متصفح قديم، أو داخل تطبيق آخر).
 *  'ios-install'  iPhone/iPad في Safari: التنبيهات تعمل بعد «أضف إلى الشاشة الرئيسية» فقط.
 *  'denied'       رفض المستخدم الإذن: يُعاد من إعدادات المتصفح وحدها.
 *  'granted' | 'default'
 */
export function pushCapability({ hasServiceWorker, hasPushManager, permission, isIos, isStandalone }) {
  if (isIos && !isStandalone) return 'ios-install';
  if (!hasServiceWorker || !hasPushManager) return 'unsupported';
  if (permission === 'denied') return 'denied';
  return permission === 'granted' ? 'granted' : 'default';
}

/** يقرأ ما سبق من المتصفح الحالي (بلا افتراض أنه موجود: SSR والاختبارات). */
export function readPushEnvironment(win = typeof window !== 'undefined' ? window : undefined) {
  if (!win) return { hasServiceWorker: false, hasPushManager: false, permission: 'default', isIos: false, isStandalone: false };
  const nav = win.navigator ?? {};
  const ua = nav.userAgent ?? '';
  const isIos = /iPad|iPhone|iPod/.test(ua) || (nav.platform === 'MacIntel' && nav.maxTouchPoints > 1);
  return {
    hasServiceWorker: 'serviceWorker' in nav,
    hasPushManager: 'PushManager' in win,
    permission: win.Notification?.permission ?? 'default',
    isIos,
    isStandalone: Boolean(win.matchMedia?.('(display-mode: standalone)')?.matches || nav.standalone),
  };
}
