// الحفظ التلقائي في المحرّر (القسم 4.4، «الحماية من ضياع العمل»، الطبقة 1)، منقول من محرّر المنتدى (use-autosave.ts).
// يحفظ بعد 30 ثانية من أول تعديل، وكل 30 ثانية ما دامت هناك تعديلات. وعند الفشل يعيد المحاولة بعد 15 ثانية،
// ثم 30، ثم دقيقة، ثم دقيقتين، ثم كل 5 دقائق، وفورًا عند عودة الاتصال. والفشل يظهر تنبيهًا واحدًا في الصفحة.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export const RETRY_DELAYS_MS = [15_000, 30_000, 60_000, 120_000, 300_000];
const TICK_MS = 5_000;

/** المهلة قبل المحاولة التالية بعد عدد الإخفاقات المتتالية (0 = نجح الأخير). */
export function nextDelay(failuresInRow, intervalMs = 30_000) {
  if (failuresInRow <= 0) return intervalMs;
  return RETRY_DELAYS_MS[Math.min(failuresInRow, RETRY_DELAYS_MS.length) - 1];
}

/**
 * @param {object} options
 * @param {boolean} options.enabled الحفظ التلقائي يعمل (لا يعمل على مادة بانتظار المراجعة مثلًا)
 * @param {boolean} options.isDirty هناك تعديلات غير محفوظة
 * @param {boolean} options.busy حفظ آخر جارٍ
 * @param {() => Promise<boolean>} options.save يرسل النموذج ويعيد هل حفظه الخادم
 * @returns {{ failures: number, nextAt: number, reset: () => void, retryNow: () => void }}
 */
export function useAutosave({ enabled, isDirty, busy, save, intervalMs = 30_000 }) {
  const latest = useRef({ enabled, isDirty, busy, save });
  // أحدث القيم للمؤقّت، تُكتب بعد كل رسم (لا أثناءه)
  useLayoutEffect(() => {
    latest.current = { enabled, isDirty, busy, save };
  });
  const nextAt = useRef(0);
  const wasDirty = useRef(isDirty);
  const running = useRef(false);
  const failuresInRow = useRef(0);
  const [failures, setFailures] = useState(0);
  const attemptRef = useRef(() => {});

  useEffect(() => {
    nextAt.current = Date.now() + intervalMs;
    const attempt = (now) => {
      const { enabled: on, isDirty: dirty, busy: saving, save: send } = latest.current;
      if (!dirty) {
        wasDirty.current = false;
        return;
      }
      // أول تعديل بعد الحفظ ينتظر 30 ثانية كاملة، فلا يُرسل النص بعد كل كلمة
      if (!wasDirty.current) {
        wasDirty.current = true;
        nextAt.current = Math.max(nextAt.current, Date.now() + intervalMs);
      }
      if (!on || saving || running.current || (!now && Date.now() < nextAt.current)) return;

      running.current = true;
      send()
        .then((stored) => {
          failuresInRow.current = stored ? 0 : failuresInRow.current + 1;
          nextAt.current = Date.now() + nextDelay(failuresInRow.current, intervalMs);
          setFailures(failuresInRow.current);
        })
        .finally(() => {
          running.current = false;
        });
    };
    attemptRef.current = attempt;

    const timer = window.setInterval(() => attempt(false), TICK_MS);
    const online = () => attempt(true);
    window.addEventListener('online', online);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', online);
    };
  }, [intervalMs]);

  const reset = useCallback(() => {
    failuresInRow.current = 0;
    setFailures(0);
    nextAt.current = Date.now() + intervalMs;
  }, [intervalMs]);

  // «أعد الآن» في مؤشر الحفظ
  const retryNow = useCallback(() => attemptRef.current(true), []);

  return { failures, reset, retryNow };
}
