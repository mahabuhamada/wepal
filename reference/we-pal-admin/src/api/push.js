// Web Push (نظام الإشعارات، المرحلة 3): تنبيهات هذا الجهاز. الاشتراك مربوط بتوكن الجلسة في الخادم،
// فالخروج يحذفه هناك حتى لو فشل طلب الإلغاء من هنا.
import { del, get, post } from './client';

// → { enabled, publicKey } — enabled=false حين لا مفاتيح VAPID على الخادم (لا يُعرض طلب التفعيل).
export function getPushConfig() {
  return get('/push/config');
}

// subscription: PushSubscription من المتصفح (أو toJSON() له) → { subscribed: true }
export function savePushSubscription(subscription) {
  const json = typeof subscription?.toJSON === 'function' ? subscription.toJSON() : subscription;
  return post('/me/push-subscriptions', {
    endpoint: json.endpoint,
    keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth },
    contentEncoding: 'aes128gcm',
  });
}

// → { subscribed: false }
export function deletePushSubscription(endpoint) {
  return del('/me/push-subscriptions', { endpoint });
}
