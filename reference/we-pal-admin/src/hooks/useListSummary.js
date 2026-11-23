import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * طلب «نظرة عامة» لصفحة قائمة: يُعاد مع كل تغيير في المرشّحات (deps)، والرد الأقدم لا يغلب الأحدث.
 */
export default function useListSummary(fetcher, deps) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const gen = useRef(0);
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;

  const reload = useCallback(async () => {
    const mine = ++gen.current;
    setLoading(true);
    try {
      const res = await fetchRef.current();
      if (mine === gen.current) { setSummary(res ?? null); setError(null); }
    } catch (err) {
      if (mine === gen.current) setError(err);
    } finally {
      if (mine === gen.current) setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { reload(); }, deps);

  return { summary, error, loading, reload };
}
