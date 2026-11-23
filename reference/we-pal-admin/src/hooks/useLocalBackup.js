// نسخة في المتصفح من المادة غير المحفوظة (القسم 4.4، الطبقة 2)، منقولة من محرّر المنتدى (use-local-backup.ts).
// تُكتب كل 5 ثوانٍ ما دامت هناك تعديلات، خاصة بالمستخدم والمادة، وتُمسح بعد الحفظ الناجح وعند الخروج وبعد 14 يومًا.
// وعند فتح المادة تُعرض أحدث نسخة: «وجدنا نسخة غير محفوظة من هذه المادة (…). استعادتها؟».
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export const BACKUP_PREFIX = 'wepal-admin:backup:';
export const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

// التخزين قد يكون غائبًا أو ممتلئًا أو محجوبًا (نافذة خاصة): كل وصول محاط، والفشل يعني فقط أن لا نسخة.
function storage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readBackup(key) {
  try {
    const raw = storage()?.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.savedAt === 'number' && parsed.value !== undefined ? parsed : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    storage()?.setItem(key, JSON.stringify({ savedAt: Date.now(), value }));
  } catch {
    // ممتلئ أو محجوب: الحفظ في الخادم هو الأصل
  }
}

/** يحذف نسخ المادة (prefix)، وأي نسخة أقدم من أسبوعين. */
export function pruneBackups(prefix, now = Date.now()) {
  try {
    const store = storage();
    if (!store) return;
    const keys = Array.from({ length: store.length }, (_, i) => store.key(i)).filter((k) => k?.startsWith(BACKUP_PREFIX));
    for (const key of keys) {
      const old = (readBackup(key)?.savedAt ?? 0) < now - MAX_AGE_MS;
      if (old || (prefix !== null && key.startsWith(prefix))) store.removeItem(key);
    }
  } catch {
    // لا شيء يُنظَّف بلا تخزين
  }
}

function backupsOf(prefix) {
  try {
    const store = storage();
    if (!store) return [];
    return Array.from({ length: store.length }, (_, i) => store.key(i))
      .filter((k) => k?.startsWith(prefix))
      .map((key) => {
        const b = readBackup(key);
        return b ? { ...b, key, version: key.slice(prefix.length) } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

/** عند الخروج: لا تبقى نسخة للشخص التالي على هذا الحاسوب. */
export function clearAllBackups() {
  pruneBackups(BACKUP_PREFIX);
}

/**
 * @param {object} o
 * @param {string} o.scope المستخدم والمادة: كل إصدارات المادة تشترك فيه، فالحفظ يمسحها كلها
 * @param {string|number} o.version الإصدار الذي فُتحت عليه المادة
 * @param {*} o.value قيم النموذج الحالية
 * @param {boolean} o.active تُكتب النسخة فقط ما دامت هناك تعديلات غير محفوظة
 * @param {(stored: *) => boolean} o.differs هل تختلف النسخة المخزّنة عمّا فُتح (المتطابقة لا تُعرض)
 */
export function useLocalBackup({ scope, version, value, active, differs, intervalMs = 5_000 }) {
  const prefix = `${BACKUP_PREFIX}${scope}:`;
  const key = `${prefix}${version}`;
  const latest = useRef({ key, value, active });
  useLayoutEffect(() => {
    latest.current = { key, value, active };
  });

  const [found, setFound] = useState(() => {
    const newest = backupsOf(prefix)[0];
    return newest && differs(newest.value) ? { savedAt: newest.savedAt, value: newest.value, olderVersion: newest.version !== String(version) } : null;
  });

  useEffect(() => pruneBackups(null), []);

  useEffect(() => {
    let written = null;
    const timer = window.setInterval(() => {
      const { key: k, value: v, active: a } = latest.current;
      if (a && v !== written) {
        write(k, v);
        written = v;
      }
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs]);

  const clear = useCallback(() => {
    pruneBackups(prefix);
    setFound(null);
  }, [prefix]);
  const accept = useCallback(() => setFound(null), []);

  return { found, clear, dismiss: clear, accept };
}
