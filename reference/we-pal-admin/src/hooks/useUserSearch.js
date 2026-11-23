import { useEffect, useState } from 'react';
import { searchUsers, USER_SEARCH_MAX, USER_SEARCH_MIN } from '../api/users';

// بحث مستخدمين مع تأخير (الخادم يحدّ 30 طلبًا/دقيقة) وتجاهل الردود القديمة.
// status: idle (أقل من حرفين) | loading | done | unavailable (404/501 — الخادم لا يدعمه بعد) | error
export default function useUserSearch(query, { delay = 300 } = {}) {
  const [state, setState] = useState({ status: 'idle', results: [], error: null });
  const q = query.trim().slice(0, USER_SEARCH_MAX);
  const active = q.length >= USER_SEARCH_MIN;

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setState((s) => ({ ...s, status: 'loading', error: null }));
      try {
        const results = await searchUsers(q);
        if (!cancelled) setState({ status: 'done', results, error: null });
      } catch (err) {
        if (cancelled) return;
        const unavailable = err?.status === 404 || err?.status === 501;
        setState({ status: unavailable ? 'unavailable' : 'error', results: [], error: err });
      }
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, active, delay]);

  return active ? state : { status: 'idle', results: [], error: null };
}
