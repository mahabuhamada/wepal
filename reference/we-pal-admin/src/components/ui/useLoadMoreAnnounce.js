import { useEffect, useRef, useState } from 'react';

// «عرض المزيد»: إعلان ما أُضيف لقارئ الشاشة، ونقل التركيز إلى أول عنصر جديد بعد آخر صفحة.
// مشترك بين ui/LoadMore («أزرق هادئ») و common/LoadMore (التصميم الحالي).
// → { press: يُستدعى بدل onLoadMore، message: نص منطقة الحالة }.
//
// المرجع لحظةُ الضغط نفسها (العدد المرسوم وموضع أول عنصر جديد)، لا آخر تأثير عمل: useEffect قد يتأخر
// بعد الرسم (جهاز مشغول)، فلو ضغط الزائر قبل أن يعمل تأثير الصفحة الأولى لحُسبت عناصرها «مضافة».
export default function useLoadMoreAnnounce({ hasMore, onLoadMore, count = 0, listRef, announce }) {
  // { count, index } لحظة الضغط، و null حين لا ضغطة تنتظر نتيجتها.
  const pending = useRef(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const press = pending.current;
    if (!press) return;
    // القائمة بدأت من جديد (فلتر أو لغة): لا شيء يُعلن لهذه الضغطة.
    if (count < press.count) {
      pending.current = null;
      return;
    }
    if (count === press.count) return;
    pending.current = null;
    if (announce) setMessage(announce(count - press.count));
    if (!hasMore) listRef?.current?.children[press.index]?.querySelector('a, button, input')?.focus();
  }, [count, hasMore, listRef, announce]);

  const press = () => {
    pending.current = { count, index: listRef?.current?.children.length ?? 0 };
    onLoadMore?.();
  };

  return { press, message };
}
