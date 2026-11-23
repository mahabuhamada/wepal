// نموذج «تقرير الاستشارة» للإدارة (B7.4) — منطق بلا واجهة، يُختبر في consultationReport.test.js.
// الحدود مطابقة لـ PATCH /consultations/{id}: ملخص 10–5000، حتى 20 عبارة و10 مجموعات، والنسب أعداد 0–100.

export const REPORT_LIMITS = { summaryMin: 10, summaryMax: 5000, statements: 20, groups: 10 };

export const emptyStatement = () => ({ text: '', agree: '', disagree: '' });
export const emptyGroup = () => ({ name: '', percentage: '', description: '' });

// التقرير من الخادم (أو null) ← حالة النموذج (النسب نصوص لحقول الإدخال).
export function reportToForm(report) {
  return {
    summary: report?.summary ?? '',
    topStatements: (report?.topStatements ?? []).map((s) => ({ text: s.text ?? '', agree: String(s.agree ?? ''), disagree: String(s.disagree ?? '') })),
    groups: (report?.groups ?? []).map((g) => ({ name: g.name ?? '', percentage: String(g.percentage ?? ''), description: g.description ?? '' })),
  };
}

const isPercent = (v) => /^\d{1,3}$/.test(String(v).trim()) && Number(v) <= 100;
const blank = (row, keys) => keys.every((k) => !String(row[k] ?? '').trim());

// أول خطأ كمفتاح ترجمة (مع params) أو null. الصفوف الفارغة كليًا تُتجاهل.
export function validateReportForm(form) {
  const summary = form.summary.trim();
  if (summary.length < REPORT_LIMITS.summaryMin || summary.length > REPORT_LIMITS.summaryMax) {
    return { key: 'consultationReportForm.errors.summary', params: { min: REPORT_LIMITS.summaryMin, max: REPORT_LIMITS.summaryMax } };
  }
  const statements = form.topStatements.filter((s) => !blank(s, ['text', 'agree', 'disagree']));
  if (statements.length > REPORT_LIMITS.statements) return { key: 'consultationReportForm.errors.tooManyStatements', params: { max: REPORT_LIMITS.statements } };
  if (statements.some((s) => !s.text.trim() || !isPercent(s.agree) || !isPercent(s.disagree))) {
    return { key: 'consultationReportForm.errors.statement' };
  }
  const groups = form.groups.filter((g) => !blank(g, ['name', 'percentage', 'description']));
  if (groups.length > REPORT_LIMITS.groups) return { key: 'consultationReportForm.errors.tooManyGroups', params: { max: REPORT_LIMITS.groups } };
  if (groups.some((g) => !g.name.trim() || !isPercent(g.percentage))) {
    return { key: 'consultationReportForm.errors.group' };
  }
  return null;
}

// حالة النموذج ← جسم { report } كما يقبله الخادم (بلا مفاتيح إضافية).
export function formToReport(form) {
  return {
    summary: form.summary.trim(),
    topStatements: form.topStatements
      .filter((s) => !blank(s, ['text', 'agree', 'disagree']))
      .map((s) => ({ text: s.text.trim(), agree: Number(s.agree), disagree: Number(s.disagree) })),
    groups: form.groups
      .filter((g) => !blank(g, ['name', 'percentage', 'description']))
      .map((g) => ({
        name: g.name.trim(),
        percentage: Number(g.percentage),
        ...(g.description.trim() ? { description: g.description.trim() } : {}),
      })),
  };
}
