import { useCallback, useEffect, useRef, useState } from 'react';

// قائمة تُحمَّل صفحةً صفحة (العقد §0: ?page=N ← { data, meta: { page, lastPage, … } }).
// fetchPage(page) يجب أن يُرجع { items, meta } — أي نتيجة unwrapList(res).
// meta = null يعني ردًا غير مقسّم (مصفوفة كاملة) فلا صفحات إضافية.
// deps: عند تغيّرها (فلتر أو بحث) تُعاد القائمة من الصفحة الأولى.
// options.initial: الصفحة الأولى جاهزة ({ items, meta }) من loader الصفحة (العرض من الخادم)، فتُرسم فورًا
//   ولا تُطلب مرة ثانية ما دامت deps كما كانت عند التحميل. أي تغيّر بعدها (فلتر، لغة) يجلب من المتصفح.
// options.revalidate: يطلب الصفحة الأولى من المتصفح بعد الرسم مع إبقاء initial ظاهرًا
//   (حالة تخص الزائر نفسه لا يعرفها الخادم، مثل «صوّتَّ» في الاستطلاعات).
export default function useInfiniteList(fetchPage, deps = [], { initial = null, revalidate = false } = {}) {
  const [items, setItems] = useState(() => initial?.items ?? []);
  const [meta, setMeta] = useState(() => initial?.meta ?? null);
  const [loading, setLoading] = useState(!initial);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const fetchRef = useRef(fetchPage);
  useEffect(() => {
    fetchRef.current = fetchPage;
  });
  // رقم الجيل: أي رد يصل بعد إعادة التحميل (تغيّر الفلتر) يُتجاهل.
  const generation = useRef(0);

  // مفتاح deps التي جاءت معها الصفحة الأولى الجاهزة؛ يبقى مع إعادة تشغيل التأثير في StrictMode.
  const depsKey = JSON.stringify(deps);
  const seededKey = useRef(initial ? depsKey : null);

  const loadFirst = useCallback(async ({ quiet = false } = {}) => {
    const gen = ++generation.current;
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const res = await fetchRef.current(1);
      if (gen !== generation.current) return;
      setItems(res?.items ?? []);
      setMeta(res?.meta ?? null);
    } catch (err) {
      if (gen === generation.current) setError(err);
    } finally {
      if (gen === generation.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (seededKey.current === depsKey) {
      if (revalidate) loadFirst({ quiet: true });
    } else {
      seededKey.current = null;
      loadFirst();
    }
    return () => {
      generation.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const hasMore = Boolean(meta && meta.page < meta.lastPage);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    const gen = generation.current;
    setLoadingMore(true);
    setError(null);
    try {
      const res = await fetchRef.current(meta.page + 1);
      if (gen !== generation.current) return;
      setItems((prev) => [...prev, ...(res?.items ?? [])]);
      setMeta(res?.meta ?? null);
    } catch (err) {
      if (gen === generation.current) setError(err);
    } finally {
      if (gen === generation.current) setLoadingMore(false);
    }
  }, [hasMore, loadingMore, meta]);

  return { items, setItems, meta, loading, loadingMore, error, hasMore, loadMore, reload: loadFirst };
}
