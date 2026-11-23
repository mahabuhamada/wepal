// صفحة «التحليلات» (docs/ANALYTICS.md): تقرير لكل قسم من GET /admin/analytics/{report}.
import { downloadBlob, get } from './client';

export const ANALYTICS_REPORTS = ['overview', 'geo', 'content', 'members', 'retention', 'funnel', 'cohorts', 'sources', 'search', 'moderation', 'polls'];

// period: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' }، extra: { type? } (نوع المحتوى لتقرير content)
export function analyticsQuery({ from, to } = {}, extra = {}, format) {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (extra.type) params.set('type', extra.type);
  if (format) params.set('format', format);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function getAnalyticsReport(report, period, extra) {
  return get(`/admin/analytics/${report}${analyticsQuery(period, extra)}`);
}

// تنزيل CSV حقيقي من الخادم (بتوكن المدير) — اسم الملف من Content-Disposition.
export function downloadAnalyticsCsv(report, period, extra) {
  return downloadBlob(`/admin/analytics/${report}${analyticsQuery(period, extra, 'csv')}`, `wepal-${report}.csv`);
}

// فحص وصول عنوان الزائر الحقيقي خلف الـ CDN (المدير العام فقط؛ لا يُرجع أي عنوان).
export function getIpCheck() {
  return get('/admin/analytics-ip-check');
}
