import { useCallback, useEffect, useState } from 'react';
import { USE_API } from '../config';
import { deletePushSubscription, getPushConfig, savePushSubscription } from '../api/push';
import { pushCapability, readPushEnvironment, urlBase64ToUint8Array } from '../utils/pushDevice';

// تنبيهات هذا الجهاز (Web Push، نظام الإشعارات المرحلة 3) — طلب أمجد:
//  - لا نافذة إذن عند فتح الصفحة: enable() وحدها تطلب الإذن، من ضغطة المستخدم.
//  - الخروج يدمّر الاشتراك: disablePushOnThisDevice() في المتصفح والخادم، والخادم يحذفه أيضًا مع التوكن.
const SW_URL = '/sw.js';

const hasSw = () => typeof navigator !== 'undefined' && 'serviceWorker' in navigator;

/** اشتراك هذا المتصفح الحالي، أو null. */
export async function currentPushSubscription() {
  if (!hasSw()) return null;
  const reg = await navigator.serviceWorker.getRegistration('/');
  return reg ? reg.pushManager.getSubscription() : null;
}

/**
 * عند الخروج: يُلغى اشتراك هذا الجهاز في المتصفح، ويُحذف من الخادم إن كانت الجلسة صالحة (server: true،
 * قبل مسح التوكن). لا يرمي أبدًا: الخروج لا يتعطّل بسببه، والخادم يحذف الاشتراك مع التوكن على أي حال.
 */
export async function disablePushOnThisDevice({ server = true } = {}) {
  try {
    const sub = await currentPushSubscription();
    if (!sub) return;
    if (server) await deletePushSubscription(sub.endpoint).catch(() => {});
    await sub.unsubscribe();
  } catch {
    // لا شيء: المتصفح بلا دعم أو الاشتراك انتهى
  }
}

/**
 * { available, capability, subscribed, busy, error, enable, disable }
 * available: الخادم مضبوط (مفاتيح VAPID) والمتصفح يدعم التنبيهات أو يحتاج «أضف إلى الشاشة الرئيسية».
 */
export default function usePushDevice({ enabled = true } = {}) {
  const [config, setConfig] = useState(null);
  const [capability, setCapability] = useState(() => pushCapability(readPushEnvironment()));
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!USE_API || !enabled || typeof window === 'undefined') return undefined;
    let live = true;
    getPushConfig()
      .then(async (cfg) => {
        if (!live) return;
        setConfig(cfg);
        const sub = await currentPushSubscription();
        if (!live) return;
        setSubscribed(Boolean(sub));
        // اشتراك قائم في المتصفح يُربط بتوكن هذه الجلسة (بعد انتهاء جلسة سابقة حذفه الخادم معها)
        if (sub && cfg?.enabled) savePushSubscription(sub).catch(() => {});
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [enabled]);

  const enable = useCallback(async () => {
    if (!config?.enabled || !config.publicKey || !hasSw() || typeof Notification === 'undefined') return false;
    setBusy(true);
    setError(null);
    try {
      // الإذن أولًا ومباشرة من الضغطة (Safari على iPhone يرفضه بعد await آخر)
      const permission = await Notification.requestPermission();
      setCapability(pushCapability({ ...readPushEnvironment(), permission }));
      if (permission !== 'granted') return false;
      const reg = await navigator.serviceWorker.register(SW_URL, { scope: '/' });
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription())
        ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(config.publicKey) }));
      await savePushSubscription(sub);
      setSubscribed(true);
      return true;
    } catch (err) {
      setError(err);
      return false;
    } finally {
      setBusy(false);
    }
  }, [config]);

  const disable = useCallback(async () => {
    setBusy(true);
    await disablePushOnThisDevice({ server: true });
    setSubscribed(false);
    setBusy(false);
  }, []);

  const available = Boolean(config?.enabled) && capability !== 'unsupported';
  return { available, capability, subscribed, busy, error, enable, disable };
}
