import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * مرشّح قائمة في عنوان الصفحة (?status=draft) لا في useState وحده، فبطاقة «نظرة عامة» أو تذكير في الرئيسية
 * يفتح القائمة مرشَّحة فعلًا (docs/ADMIN-UX.md §2).
 * قيمة غير معروفة في العنوان ← القيمة الافتراضية. الضبط على الافتراضي يحذف المفتاح، ويستبدل السجل (لا يملأ «رجوع»).
 *
 * @param key       اسم المفتاح في العنوان
 * @param fallback  القيمة حين يغيب المفتاح (null = بلا مرشّح)
 * @param allowed   القيم المقبولة (اختياري)
 */
export default function useUrlParam(key, fallback = null, allowed = null) {
  const [params, setParams] = useSearchParams();
  const raw = params.get(key);
  const value = raw != null && raw !== '' && (!allowed || allowed.includes(raw)) ? raw : fallback;

  const setValue = useCallback(
    (next) => {
      setParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          if (next == null || next === '' || next === fallback) p.delete(key);
          else p.set(key, next);
          return p;
        },
        { replace: true },
      );
    },
    [key, fallback, setParams],
  );

  return [value, setValue];
}
