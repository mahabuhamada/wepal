import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

// false في HTML الخادم وأثناء الـ hydration، true بعد أن يستلم React الصفحة.
// للنماذج: قبل ذلك لا يوجد onSubmit، فأي إرسال يذهب للمتصفح مباشرة (GET بقيم الحقول في الرابط).
export function useHydrated() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
