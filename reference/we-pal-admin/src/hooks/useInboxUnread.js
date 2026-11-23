import { useEffect, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { USE_API } from '../config';
import { getToken } from '../api/client';
import * as adminApi from '../api/admin';
import { useAuth } from '../auth/AuthContext';
import { canAccessAdminPath } from '../utils/roles';

// عدد رسائل «تواصل معنا» غير المقروءة (PR 212): مصدر واحد يتشاركه الشريط الجانبي (بالسمتين) وتبويب الوارد.
// null = غير معروف (خادم قبل حالة القراءة لا يرسل meta.unreadCount، أو مستخدم بلا صلاحية الوارد)، فلا شارة.
let unread = null;
const listeners = new Set();

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const getSnapshot = () => unread;
const getServerSnapshot = () => null;

/** يضبط العدد من أي رد فيه meta.unreadCount؛ غير الرقم يعني «غير معروف». */
export function setInboxUnread(count) {
  const next = typeof count === 'number' && Number.isFinite(count) ? Math.max(0, count) : null;
  if (next === unread) return;
  unread = next;
  listeners.forEach((listener) => listener());
}

/** بعد تعليم رسالة: -1 حين تصير مقروءة و+1 حين تعود غير مقروءة (لا شيء إن كان العدد غير معروف). */
export function adjustInboxUnread(delta) {
  if (unread !== null) setInboxUnread(unread + delta);
}

/** نص الشارة: «99+» لما فوق ذلك. */
export const inboxBadgeText = (count) => (count > 99 ? '99+' : String(count));

/** العدد الحالي دون جلب (تبويب الوارد يضبطه من رد القائمة نفسها). */
export function useInboxUnreadCount() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * العدد للشريط الجانبي: يجلب ?perPage=1 عند كل تغيّر في المسار، للمدير وحده (المشرف لا يرى الوارد)،
 * ويتجاهل الأخطاء بصمت كعدّاد الإشعارات.
 */
export default function useInboxUnread() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const allowed = Boolean(USE_API && user && canAccessAdminPath(user, '/admin/inbox'));
  const count = useInboxUnreadCount();

  useEffect(() => {
    if (!allowed || !getToken()) return undefined;
    let active = true;
    (async () => {
      try {
        // العدد وحده (بلا رسالة ولا بريد، فلا سطر اطلاع في التدقيق مع كل تنقّل)
        const res = await adminApi.getInboxUnreadCount();
        if (active) setInboxUnread(res?.unreadCount);
      } catch {
        // الشارة ثانوية: نتجاهل الخطأ ونُبقي آخر عدد معروف.
      }
    })();
    return () => { active = false; };
  }, [allowed, pathname]);

  return allowed ? count : null;
}
