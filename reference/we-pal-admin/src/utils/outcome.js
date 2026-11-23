// خلاصة «سألنا / قلتم / فعلنا» (الحزمة 6أ): تحويل بيانات الخادم إلى ما تعرضه البطاقة.
// الحد الأدنى لكل منطقة يطبّقه الخادم (regions.shown فيها المناطق المسموح عرضها فقط)؛ الواجهة لا تحسبه.

export const OUTCOME_THRESHOLD_FALLBACK = 15;

const clampPct = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

/**
 * أشرطة «قلتم» حسب المنطقة.
 * - استطلاع: أول سؤال له تفصيل بالمناطق — نسبة من اختار الخيار الأعلى إجمالًا (topShare)، أو المتوسط من 5 (SCALE).
 * - مشاورة (أو استطلاع بلا أسئلة قابلة للتجميع): عدد المشاركين في كل منطقة ظاهرة، والعرض نسبته من الإجمالي.
 * → { mode: 'share'|'average'|'participants', question, topOption, threshold, bars: [{ region, width, value }] }
 *   bars فارغة إن لم تظهر أي منطقة (كلها تحت الحد).
 */
export function outcomeRegionBars(regions) {
  const threshold = Number(regions?.threshold) || OUTCOME_THRESHOLD_FALLBACK;
  const shown = Array.isArray(regions?.shown) ? regions.shown : [];
  const base = { threshold, question: null, topOption: null, bars: [] };
  if (!regions || shown.length === 0) return { ...base, mode: 'participants' };

  const question = (regions.questions || []).find((q) => Array.isArray(q?.byRegion) && q.byRegion.length > 0);
  if (question) {
    const isScale = question.qtype === 'SCALE';
    const bars = question.byRegion.map((r) => {
      if (isScale) {
        const avg = Math.round((Number(r.average) || 0) * 10) / 10;
        return { region: r.region, width: clampPct((avg / 5) * 100), value: avg.toFixed(1) };
      }
      const pct = clampPct(r.topShare);
      return { region: r.region, width: pct, value: `${pct}%` };
    });
    return { ...base, mode: isScale ? 'average' : 'share', question: question.text ?? null, topOption: isScale ? null : (question.topOption ?? null), bars };
  }

  const total = Number(regions.total) || shown.reduce((sum, r) => sum + (Number(r.participants) || 0), 0);
  const bars = shown.map((r) => ({
    region: r.region,
    width: total > 0 ? clampPct(((Number(r.participants) || 0) / total) * 100) : 0,
    value: String(Number(r.participants) || 0),
  }));
  return { ...base, mode: 'participants', bars };
}

/**
 * «فعلنا» يكتبه المدير سطرًا لكل فعل غالبًا: أكثر من سطر ← قائمة، وسطر واحد ← فقرة.
 * تُزال علامات القوائم المكتوبة يدويًا (- • * أو ترقيم 1. / 1-).
 */
export function outcomeLines(text) {
  if (typeof text !== 'string') return [];
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*(?:[-•*]|\d+[.)-])\s+/, '').trim())
    .filter(Boolean);
}

/** رابط صفحة العنصر في منطقة الأعضاء. */
export function outcomeSubjectPath(type, id) {
  return `/${type === 'consultation' ? 'consultations' : 'surveys'}/${encodeURIComponent(id)}`;
}

/**
 * جسم الحفظ/النشر من حقول النموذج: { asked: {ar, en}, ... } مع إسقاط الإنجليزية الفارغة.
 * fields: { asked: {ar, en}, said: {...}, did: {...} }
 */
export function outcomePayload(fields) {
  const out = {};
  ['asked', 'said', 'did'].forEach((key) => {
    const ar = (fields?.[key]?.ar ?? '').trim();
    const en = (fields?.[key]?.en ?? '').trim();
    out[key] = en ? { ar, en } : { ar };
  });
  return out;
}

/** حقول النموذج من خلاصة محمّلة بـ withTranslations (أو من النص المحلول إن غابت الترجمات). */
export function outcomeFields(outcome) {
  const tr = outcome?.translations || {};
  const field = (key) => ({
    ar: tr[key]?.ar ?? (tr[key] ? '' : (outcome?.[key] ?? '')),
    en: tr[key]?.en ?? '',
  });
  return { asked: field('asked'), said: field('said'), did: field('did') };
}

/** تاريخ الإغلاق المعروض في القوائم: endsAt إن كان قد مضى فقط (المغلق يدويًا قبل موعده بلا تاريخ). */
export function pastDateOrNull(value, now = Date.now()) {
  const ms = value ? Date.parse(value) : NaN;
  return Number.isFinite(ms) && ms <= now ? value : null;
}

export const OUTCOME_FIELDS = ['asked', 'said', 'did'];

/** هل كُتبت الأقسام الثلاثة بالعربية (شرط النشر، والخادم يتحقق منه أيضًا)؟ */
export function outcomeComplete(fields) {
  return OUTCOME_FIELDS.every((key) => (fields?.[key]?.ar ?? '').trim() !== '');
}

/**
 * أخطاء 422 من الخادم لكل قسم: مفاتيح مثل asked أو asked.ar أو said.en → { asked: 'رسالة', ... }.
 */
export function outcomeFieldErrors(errors) {
  const out = {};
  if (!errors || typeof errors !== 'object') return out;
  Object.entries(errors).forEach(([key, messages]) => {
    const field = OUTCOME_FIELDS.find((f) => key === f || key.startsWith(`${f}.`));
    const message = Array.isArray(messages) ? messages[0] : messages;
    if (field && !out[field] && message) out[field] = String(message);
  });
  return out;
}
