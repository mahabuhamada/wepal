import { useCallback, useEffect, useState } from 'react';
import { USE_API } from '../config';
import { getToken } from '../api/client';
import * as platformApi from '../api/platform';
import { NOTIFICATION_EVENT } from '../api/realtime';
import { useOptionalAuth } from '../auth/AuthContext';
import useRealtimeRefresh from './useRealtimeRefresh';

// مصدر واحد لعدّاد الإشعارات غير المقروءة — يُشارك بين جرس الشريط العلوي وعنصر الإشعارات في الشريط الجانبي.
// الوقت الحقيقي (Reverb): العدّاد يصل مع كل إشعار جديد على قناة المستخدم الخاصة، ومع كل «قراءة» من تبويب
// أو جهاز آخر. الجلب نفسه مرة عند الفتح، ومرة عند عودة الاتصال، وكل 5 دقائق ما دام الاتصال منقطعًا فقط
// (useRealtimeRefresh). يعمل فقط عند تفعيل الـ API ووجود جلسة، ويتجاهل الأخطاء بصمت.
// صفحة الإشعارات تبثّ UNREAD_CHANGED_EVENT بعد «قراءة» إشعار أو «تعيين الكل» في هذا التبويب.
export const UNREAD_CHANGED_EVENT = 'wepal:unread-changed';

/** قناة المستخدم الخاصة (Laravel: App.Models.User.{id}) — الإشعارات وعدّادها. */
export const userChannel = (userId) => `App.Models.User.${userId}`;

export default function useUnreadNotifications() {
  const userId = useOptionalAuth()?.user?.id ?? null;
  const [unread, setUnread] = useState(0);
  // في المتصفح فقط: على الخادم (SSR) لا توكن ولا localStorage صالح، والعدّاد لا يُرسم من الخادم أصلًا.
  const enabled = USE_API && typeof window !== 'undefined' && Boolean(getToken());

  const refresh = useCallback(async () => {
    try {
      const res = await platformApi.listNotifications({ unread: true });
      setUnread(res?.meta?.unreadCount ?? 0);
    } catch {
      // نتجاهل أخطاء الشارة بصمت.
    }
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
    window.addEventListener(UNREAD_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(UNREAD_CHANGED_EVENT, refresh);
  }, [enabled, refresh]);

  const fromPayload = (payload) => {
    if (typeof payload?.unreadCount === 'number') setUnread(payload.unreadCount);
    else refresh();
  };
  useRealtimeRefresh({
    enabled,
    refresh,
    channel: userId ? userChannel(userId) : null,
    events: { [NOTIFICATION_EVENT]: fromPayload, '.notifications.unread': fromPayload },
  });

  return unread;
}
