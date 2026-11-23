// الوقت الحقيقي (Laravel Reverb عبر Echo): اتصال websocket واحد للتبويب، يُنشأ عند أول اشتراك في المتصفح فقط.
// القنوات كلها خاصة، وإذنها POST /api/broadcasting/auth بتوكن Sanctum (عميل الـ API نفسه).
// ما يصل عليها معرّفات وعدّادات فقط؛ التفاصيل تُجلب من الـ API بصلاحيات القارئ.
//
// الحالة (realtimeStatus):
//   'off'          لا Reverb مضبوط (VITE_REVERB_APP_KEY فارغ، أو خارج المتصفح، أو بلا API) — الصفحات ترجع للطلب الدوري القديم.
//   'connecting'   قبل أول اتصال.
//   'connected'    متصل: لا طلب دوري.
//   'disconnected' انقطع بعد اتصال أو تعذّر — طلب احتياطي بطيء حتى يعود.
import { USE_API } from '../config';
import { getToken, post, setSocketIdProvider } from './client';

const env = import.meta.env;

/**
 * إعدادات Echo من متغيرات البناء. null = الوقت الحقيقي معطّل.
 * المضيف الافتراضي هو عنوان الصفحة نفسها (الـ VPS: nginx يمرّر /app إلى Reverb على نفس النطاق).
 */
export function realtimeConfig(vars = env, location = typeof window !== 'undefined' ? window.location : null) {
  const key = vars.VITE_REVERB_APP_KEY;
  if (!key || !location) return null;
  const scheme = vars.VITE_REVERB_SCHEME || location.protocol.replace(':', '') || 'https';
  const forceTLS = scheme === 'https';
  const port = Number(vars.VITE_REVERB_PORT) || (forceTLS ? 443 : 80);
  return {
    broadcaster: 'reverb',
    key,
    wsHost: vars.VITE_REVERB_HOST || location.hostname,
    wsPort: port,
    wssPort: port,
    forceTLS,
    enabledTransports: ['ws', 'wss'],
    // لا نسجّل interceptors عامة (axios/jQuery): عميلنا يضيف X-Socket-ID بنفسه.
    withoutInterceptors: true,
  };
}

let echoPromise = null;
let status = USE_API ? 'connecting' : 'off';
const statusListeners = new Set();
// اشتراكات مشتركة: أكثر من مكوّن على القناة نفسها (الجرس وصفحة الإشعارات) — نغادر القناة حين يُلغى آخرها.
const channels = new Map();

function setStatus(next) {
  if (next === status) return;
  status = next;
  statusListeners.forEach((fn) => fn(status));
}

// يُبنى مرة واحدة: dynamic import فلا يدخل pusher-js حزمة الخادم ولا الصفحات العامة.
async function createEcho(config) {
  const [{ default: Echo }, { default: Pusher }] = await Promise.all([import('laravel-echo'), import('pusher-js')]);
  const echo = new Echo({
    ...config,
    Pusher,
    channelAuthorization: {
      customHandler: ({ socketId, channelName }, callback) => {
        post('/broadcasting/auth', { socket_id: socketId, channel_name: channelName })
          .then((res) => callback(null, res))
          .catch((err) => callback(err, null));
      },
    },
  });
  const connection = echo.connector.pusher.connection;
  connection.bind('state_change', ({ current }) => {
    if (current === 'connected') setStatus('connected');
    else if (current === 'connecting' && status !== 'disconnected') setStatus('connecting');
    else if (['unavailable', 'failed', 'disconnected'].includes(current)) setStatus('disconnected');
  });
  setSocketIdProvider(() => echo.socketId());
  return echo;
}

/** Echo جاهزًا، أو null حين يكون الوقت الحقيقي معطّلًا أو لا جلسة. */
export function getEcho() {
  if (echoPromise) return echoPromise;
  const config = USE_API && getToken() ? realtimeConfig() : null;
  if (!config) {
    setStatus('off');
    return Promise.resolve(null);
  }
  echoPromise = createEcho(config).catch(() => {
    echoPromise = null;
    setStatus('disconnected');
    return null;
  });
  return echoPromise;
}

export const realtimeStatus = () => status;

/** cb(status) عند كل تغيّر؛ يُرجع دالة الإلغاء. */
export function onRealtimeStatus(cb) {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
}

/**
 * اشتراك في قناة خاصة: handlers = { '.group.post.created': fn, … } (النقطة = اسم broadcastAs كما هو).
 * يُرجع دالة الإلغاء فورًا (حتى قبل أن يجهز الاتصال).
 */
export function subscribePrivate(name, handlers) {
  let cancelled = false;
  let bound = null;
  getEcho().then((echo) => {
    if (!echo || cancelled) return;
    const entry = channels.get(name) ?? { channel: echo.private(name), count: 0 };
    entry.count += 1;
    channels.set(name, entry);
    bound = Object.entries(handlers).map(([event, fn]) => {
      entry.channel.listen(event, fn);
      return [event, fn];
    });
  });
  return () => {
    cancelled = true;
    const entry = channels.get(name);
    if (!bound || !entry) return;
    bound.forEach(([event, fn]) => entry.channel.stopListening(event, fn));
    entry.count -= 1;
    if (entry.count <= 0) {
      channels.delete(name);
      echoPromise?.then((echo) => echo?.leave(name));
    }
  };
}

/** عند الخروج: قطع الاتصال ونسيان القنوات، فالجلسة التالية تتصل بتوكنها. */
export function disconnectRealtime() {
  const pending = echoPromise;
  echoPromise = null;
  channels.clear();
  setSocketIdProvider(null);
  setStatus(USE_API ? 'connecting' : 'off');
  pending?.then((echo) => echo?.disconnect());
}

// اسم حدث الإشعار كما يبثّه Laravel (Echo .notification()).
export const NOTIFICATION_EVENT = '.Illuminate\\Notifications\\Events\\BroadcastNotificationCreated';
