import { useCallback, useMemo, useState } from 'react';

const EMPTY = new Set();

/**
 * تحديد صفوف القائمة للإجراء الجماعي (خطة لوحة الإدارة 4.3). المفاتيح نصوص؛ تغيير المرشّحات يمسح التحديد
 * (resetKey). selectAll يحدّد الظاهر فقط.
 */
export default function useSelection(resetKey) {
  const [state, setState] = useState({ key: resetKey, ids: new Set() });
  const ids = state.key === resetKey ? state.ids : EMPTY;

  const toggle = useCallback((id) => setState((s) => {
    const next = new Set(s.key === resetKey ? s.ids : []);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return { key: resetKey, ids: next };
  }), [resetKey]);

  const setAll = useCallback((all, on) => setState({ key: resetKey, ids: new Set(on ? all : []) }), [resetKey]);
  const clear = useCallback(() => setState({ key: resetKey, ids: new Set() }), [resetKey]);

  return useMemo(() => ({ ids, size: ids.size, has: (id) => ids.has(id), toggle, setAll, clear }), [ids, toggle, setAll, clear]);
}
