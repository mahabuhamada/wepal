import { useEffect, useRef, useSyncExternalStore } from 'react';
import { getEcho, onRealtimeStatus, realtimeStatus, subscribePrivate } from '../api/realtime';

// طلب احتياطي بطيء حين ينقطع الـ websocket، والطلب الدوري القديم حين لا Reverb مضبوط أصلًا
// (الاستضافة المشتركة قبل الانتقال إلى الـ VPS) — فلا تتأخر الشارات هناك عمّا كانت عليه.
export const FALLBACK_MS = 5 * 60_000;
export const NO_REALTIME_MS = 60_000;

/** حالة الوقت الحقيقي الحالية ('off' | 'connecting' | 'connected' | 'disconnected')، تتحدّث مع الاتصال. */
export function useRealtimeStatus() {
  // على الخادم (SSR) لا اتصال: 'off'
  return useSyncExternalStore(onRealtimeStatus, realtimeStatus, () => 'off');
}

/**
 * بيانات تتحدّث بالبث بدل الطلب الدوري:
 *  - refresh() مرة عند الفتح (أو حين يصبح enabled؛ fetchOnOpen=false إن كان المستدعي يجلب بنفسه)،
 *    ومرة عند عودة الاتصال بعد انقطاع.
 *  - events = { '.اسم.الحدث': (payload) => … } على القناة الخاصة channel (اختيارية).
 *  - طلب دوري فقط بلا اتصال: كل FALLBACK_MS إن انقطع، وكل NO_REALTIME_MS إن كان الوقت الحقيقي معطّلًا
 *    (pollWithoutRealtime=false لما لم يكن يُطلب دوريًا من قبل، كحائط المجموعة).
 * refresh وevents تُقرأ من آخر رسم، فلا تعيد الاشتراك عند تغيّرها.
 */
export default function useRealtimeRefresh({ enabled = true, refresh, channel = null, events = {}, fetchOnOpen = true, pollWithoutRealtime = true }) {
  const refreshRef = useRef(refresh);
  const eventsRef = useRef(events);
  useEffect(() => {
    refreshRef.current = refresh;
    eventsRef.current = events;
  });
  const status = useRealtimeStatus();

  // جلب واحد عند الفتح، وبدء الاتصال (يحسم الحالة: متصل، أو معطّل فيعمل الطلب الدوري القديم)
  const openFetch = useRef(fetchOnOpen);
  useEffect(() => {
    if (!enabled) return;
    if (openFetch.current) refreshRef.current?.();
    getEcho();
  }, [enabled]);

  // الاشتراك في القناة
  const eventNames = Object.keys(events).join('|');
  useEffect(() => {
    if (!enabled || !channel || !eventNames) return undefined;
    const handlers = Object.fromEntries(eventNames.split('|').map((name) => [name, (payload) => eventsRef.current[name]?.(payload)]));
    return subscribePrivate(channel, handlers);
  }, [enabled, channel, eventNames]);

  // عودة الاتصال بعد انقطاع: ما فات أثناءه يُجلب مرة
  const prev = useRef(status);
  useEffect(() => {
    const was = prev.current;
    prev.current = status;
    if (enabled && status === 'connected' && was === 'disconnected') refreshRef.current?.();
  }, [enabled, status]);

  // الطلب الاحتياطي
  useEffect(() => {
    if (!enabled) return undefined;
    const every = status === 'disconnected' ? FALLBACK_MS : status === 'off' && pollWithoutRealtime ? NO_REALTIME_MS : null;
    if (!every) return undefined;
    const id = setInterval(() => refreshRef.current?.(), every);
    return () => clearInterval(id);
  }, [enabled, status, pollWithoutRealtime]);

  return status;
}
