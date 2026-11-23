// حساب بطاقات مؤشرات الرئيسية. الفرق نسبة مئوية عن المدة السابقة، ولا فرق بلا رقم سابق أو حين كان صفرًا
// (لا «↑ ∞%»). النسبة مقرّبة لعدد صحيح.
export function kpiDelta(value, previous) {
  if (typeof value !== 'number' || typeof previous !== 'number' || previous <= 0) return null;
  return Math.round(((value - previous) / previous) * 100);
}

export function kpiPercent(part, whole) {
  if (!whole) return 0;
  return Math.round((part / whole) * 100);
}
