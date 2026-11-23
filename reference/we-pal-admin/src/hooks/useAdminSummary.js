import { useCallback, useEffect, useRef, useState } from 'react';
import { USE_API } from '../config';
import * as adminApi from '../api/admin';
import useRealtimeRefresh from './useRealtimeRefresh';

// أقلّ مدة بين طلبين عند التنقّل بين الصفحات.
const MIN_GAP_MS = 20_000;
// دفعة تغييرات متتالية في الطوابير (بلاغات كثيرة معًا) = طلب واحد بعدها.
export const STAFF_EVENT_DEBOUNCE_MS = 1_500;

/**
 * ملخّص رئيسية الإدارة (GET /admin/summary) للقشرة كلها: يُجلب عند فتح اللوحة، وعند التنقّل إن مرّ
 * MIN_GAP_MS، وفورًا حين يُبثّ على قناة الطاقم أن طابورًا تغيّر (Reverb، admin.summary.changed).
 * بلا اتصال: عند عودته، وكل 5 دقائق ما دام منقطعًا (useRealtimeRefresh).
 * reload() يجلبه فورًا (بعد معالجة بلاغ مثلًا). خارج وضع الـ API: null.
 */
export default function useAdminSummary(pathname, enabled = true) {
  const [summary, setSummary] = useState(null);
  // مدة مؤشرات الرئيسية: 7 أو 30 أو 90 يومًا (المرحلة 2). تغييرها يجلب فورًا.
  const [days, setDays] = useState(30);
  const daysRef = useRef(30);
  const [error, setError] = useState(null);
  const lastAt = useRef(0);
  const active = USE_API && enabled;

  const reload = useCallback(async () => {
    if (!active) return;
    lastAt.current = Date.now();
    try {
      const res = await adminApi.getAdminSummary(daysRef.current);
      setSummary(res ?? null);
      setError(null);
    } catch (err) {
      setError(err);
    }
  }, [active]);

  useEffect(() => {
    if (!active || Date.now() - lastAt.current < MIN_GAP_MS) return undefined;
    lastAt.current = Date.now();
    let live = true;
    let settled = false;
    adminApi.getAdminSummary(daysRef.current)
      .then((res) => { settled = true; if (live) { setSummary(res ?? null); setError(null); } })
      .catch((err) => { settled = true; if (live) setError(err); });
    return () => {
      live = false;
      // طلب أُلغي قبل وصوله (StrictMode يشغّل التأثير مرتين، أو تنقّل سريع): لا يُحسب، فيُجلب في التشغيل التالي
      if (!settled) lastAt.current = 0;
    };
  }, [active, pathname]);

  // قناة الطاقم: تغيّر طابور ← جلب واحد بعد هدوء الدفعة (العدّادات بصلاحيات هذا القارئ)
  const debounce = useRef(null);
  useEffect(() => () => clearTimeout(debounce.current), []);
  useRealtimeRefresh({
    enabled: active,
    refresh: reload,
    fetchOnOpen: false,
    channel: 'staff',
    events: {
      '.admin.summary.changed': () => {
        clearTimeout(debounce.current);
        debounce.current = setTimeout(reload, STAFF_EVENT_DEBOUNCE_MS);
      },
    },
  });

  const changeDays = useCallback((value) => {
    daysRef.current = value;
    setDays(value);
    reload();
  }, [reload]);

  return { summary, error, reload, days, setDays: changeDays };
}
