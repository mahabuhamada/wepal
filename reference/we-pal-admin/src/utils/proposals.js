// مساعدات مقترحات مساحات العمل والتحديات (الحزمة 3أ). القيود نفسها التي في الخادم
// (StoreProposalRequest)، فيرى العضو الخطأ قبل الإرسال.

export const PROPOSAL_LIMITS = {
  titleMin: 3,
  titleMax: 160,
  descriptionMin: 20,
  descriptionMax: 2000,
  outputMin: 5,
  outputMax: 1000,
};

export const TRACKS = [
  { value: 'RESEARCH', tone: 'research', labelKey: 'projects.tracks.research', descKey: 'workspaceProposals.form.trackDesc.RESEARCH' },
  { value: 'INITIATIVES', tone: 'initiatives', labelKey: 'projects.tracks.initiatives', descKey: 'workspaceProposals.form.trackDesc.INITIATIVES' },
  { value: 'DIGITAL_CONTENT', tone: 'digital', labelKey: 'projects.tracks.digital', descKey: 'workspaceProposals.form.trackDesc.DIGITAL_CONTENT' },
];

// ترتيب تبويبات قائمة الإدارة: ما ينتظر قرارًا أولًا.
export const PROPOSAL_STATUSES = ['PENDING', 'NEEDS_CHANGES', 'APPROVED', 'DECLINED'];

export const emptyProposalForm = () => ({ title: '', track: '', description: '', expectedOutput: '' });

export const proposalToForm = (p) => ({
  title: p?.title ?? '',
  track: p?.track ?? '',
  description: p?.description ?? '',
  expectedOutput: p?.expectedOutput ?? '',
});

/**
 * أول خطأ في نموذج المقترح: { field, key, params } أو null. الطول بعد قصّ المسافات.
 */
export function validateProposal(form) {
  const L = PROPOSAL_LIMITS;
  const title = form.title.trim();
  const description = form.description.trim();
  const output = form.expectedOutput.trim();
  if (title.length < L.titleMin || title.length > L.titleMax) {
    return { field: 'title', key: 'workspaceProposals.form.errors.title', params: { min: L.titleMin, max: L.titleMax } };
  }
  if (!TRACKS.some((t) => t.value === form.track)) return { field: 'track', key: 'workspaceProposals.form.errors.track' };
  if (description.length < L.descriptionMin || description.length > L.descriptionMax) {
    return { field: 'description', key: 'workspaceProposals.form.errors.description', params: { min: L.descriptionMin, max: L.descriptionMax } };
  }
  if (output.length < L.outputMin || output.length > L.outputMax) {
    return { field: 'expectedOutput', key: 'workspaceProposals.form.errors.expectedOutput', params: { min: L.outputMin, max: L.outputMax } };
  }
  return null;
}

// جسم الطلب: كل الحقول مقصوصة (للتقديم)، أو المتغيّرة فقط عن المقترح الأصلي (للتعديل).
export function proposalPayload(form, original = null) {
  const out = {
    title: form.title.trim(),
    track: form.track,
    description: form.description.trim(),
    expectedOutput: form.expectedOutput.trim(),
  };
  if (!original) return out;
  return Object.fromEntries(Object.entries(out).filter(([k, v]) => v !== (original[k] ?? '')));
}

// يعدّله صاحبه ويعيد إرساله.
export const isProposalEditable = (p) => p?.status === 'PENDING' || p?.status === 'NEEDS_CHANGES';

// كم عضوًا ينقص التحدي ليُفتح (0 إن اكتمل الحد الأدنى).
export const challengeMissing = (c) => Math.max(0, (c?.minMembers ?? 0) - (c?.participantsCount ?? 0));

/**
 * زر بطاقة التحدي للعضو:
 *  - open: انضم وفُتحت المساحة ← «ادخل المساحة»
 *  - leave: انضم والمساحة لم تُفتح ← «غادر»
 *  - join: يستطيع الانضمام
 *  - full: اكتمل الفريق أو أُغلق الانضمام
 */
export function challengeAction(c) {
  if (c?.joined) return c.projectId ? 'open' : 'leave';
  return c?.canJoin ? 'join' : 'full';
}

// «15 نوفمبر» من YYYY-MM-DD، بلا تحويل منطقة زمنية (التاريخ يوم في التقويم لا لحظة).
export function formatDay(value, lang = 'ar') {
  if (!value) return '';
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ar-EG-u-nu-latn', { day: 'numeric', month: 'long', timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, d)));
}

// ===== تحديات الإدارة =====

export const TEAM_MIN = 3;
export const TEAM_MAX = 8;

export const emptyChallengeForm = () => ({ title: '', track: 'RESEARCH', description: '', minMembers: '3', maxMembers: '6', closesAt: '' });

export const challengeToForm = (c) => ({
  title: c.title,
  track: c.track,
  description: c.description,
  minMembers: String(c.minMembers),
  maxMembers: String(c.maxMembers),
  closesAt: c.closesAt,
});

/**
 * أخطاء نموذج التحدي: { title?, description?, size?, closesAt? } (مفاتيح ترجمة)، فارغ إن صلح.
 * today: YYYY-MM-DD (يُمرَّر ليبقى الاختبار ثابتًا).
 */
export function challengeFormErrors(form, today) {
  const errors = {};
  const base = 'workspaceProposals.admin.challenges.form.errors';
  const title = form.title.trim();
  if (title.length < 3 || title.length > 160) errors.title = `${base}.title`;
  if (form.description.trim().length < 20) errors.description = `${base}.description`;
  const min = Number(form.minMembers);
  const max = Number(form.maxMembers);
  if (!Number.isInteger(min) || !Number.isInteger(max) || min < TEAM_MIN || min > TEAM_MAX || max < min || max > TEAM_MAX) {
    errors.size = `${base}.size`;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(form.closesAt) || form.closesAt < today) errors.closesAt = `${base}.closesAt`;
  return errors;
}

// جسم الطلب: الأعداد أرقامًا والنص مقصوصًا؛ وللتعديل المتغيّر فقط.
export function challengePayload(form, original = null) {
  const out = {
    title: form.title.trim(),
    track: form.track,
    description: form.description.trim(),
    minMembers: Number(form.minMembers),
    maxMembers: Number(form.maxMembers),
    closesAt: form.closesAt,
  };
  if (!original) return out;
  return Object.fromEntries(Object.entries(out).filter(([k, v]) => v !== original[k]));
}

// تاريخ اليوم المحلي YYYY-MM-DD (لا UTC: آخر الليل في فلسطين يبقى اليوم نفسه).
export function localToday(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
