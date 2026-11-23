import { useCallback, useEffect, useState } from 'react';
import { getAnalyticsReport } from '../../../api/analytics';

// تقرير واحد للفترة: يُعاد جلبه عند تغيّر الفترة أو النوع، والرد القديم لا يغلب الجديد.
// «جارٍ التحميل» = الرد الحالي لطلب غير الطلب الحالي (بلا setState داخل الأثر).
export default function useReport(report, period, extra = {}) {
  const type = extra.type ?? '';
  const [attempt, setAttempt] = useState(0);
  const key = `${report}|${period.from}|${period.to}|${type}|${attempt}`;
  const [state, setState] = useState({ key: null, data: null, error: null });

  useEffect(() => {
    let alive = true;
    getAnalyticsReport(report, { from: period.from, to: period.to }, type ? { type } : {})
      .then((data) => alive && setState({ key, data, error: null }))
      .catch((error) => alive && setState({ key, data: null, error }));
    return () => { alive = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { data: state.data, error: state.error, loading: state.key !== key, retry };
}
