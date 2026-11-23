// موافقة الفريق قبل النشر (الحزمة 3ب): تحويل رد الخادم وحالة الخطوة في «المراجعة والنشر» وبوابة النشر.

export const CONSENT_STATUSES = ['NOT_REQUESTED', 'PENDING', 'APPROVED', 'DECLINED'];

// رد GET /projects/{id}/consent بشكل ثابت للواجهة (حقول ناقصة = قيم آمنة: لا موافقة ولا صلاحية).
export function mapTeamConsent(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const member = (m) => ({
    id: m?.user?.id ?? null,
    name: m?.user?.name ?? '',
    avatarUrl: m?.user?.avatarUrl ?? null,
    role: m?.role ?? null,
    status: CONSENT_STATUSES.includes(m?.status) ? m.status : 'PENDING',
    note: m?.note || '',
    showName: Boolean(m?.showName),
    decidedAt: m?.decidedAt ?? null,
  });
  return {
    projectId: raw.projectId ?? null,
    requested: Boolean(raw.requested),
    requestedAt: raw.requestedAt ?? null,
    complete: Boolean(raw.complete),
    total: Number(raw.total) || 0,
    approved: Number(raw.approved) || 0,
    declined: Number(raw.declined) || 0,
    pending: Number(raw.pending) || 0,
    creditMode: raw.creditMode === 'TEAM_AND_NAMES' ? 'TEAM_AND_NAMES' : 'TEAM',
    teamLabel: raw.teamLabel || '',
    members: Array.isArray(raw.members) ? raw.members.map(member) : [],
    mine: raw.mine ? member(raw.mine) : null,
    canRequest: Boolean(raw.canRequest),
    canRespond: Boolean(raw.canRespond),
    published: Array.isArray(raw.published)
      ? raw.published.map((r) => ({ id: r?.id ?? null, title: r?.title || '', publishedAt: r?.publishedAt ?? null }))
      : [],
  };
}

// حالة خطوة «موافقة الفريق» في خطوات النشر: مكتملة، أو جارية بعد الطلب أو حين تصل المساحة إلى المراجعة، أو لاحقة.
export function consentStepState(consent, stage) {
  if (consent?.complete) return 'done';
  if (consent?.requested) return 'now';
  return stage === 'REVIEW' || stage === 'DONE' ? 'now' : 'todo';
}

// خطوتا «مراجعة الإدارة» و«النشر والإعلان»: نُشر مخرج ← مكتملتان. اكتملت الموافقة ← الإدارة «الآن»،
// و`waiting` يقول ما ينتظره العمل: نقل المساحة إلى «منجز» (طابور النشر لا يضم إلا المنجزة)، أو قرار الإدارة.
export function publishStepStates(consent, stage) {
  if (consent?.published?.length > 0) return { admin: 'done', announce: 'done', waiting: null };
  if (consent?.complete) return { admin: 'now', announce: 'todo', waiting: stage === 'DONE' ? 'adminDecision' : 'moveToDone' };
  return { admin: 'todo', announce: 'todo', waiting: null };
}

// المخرج المنشور: اسم الفريق، ومعه أسماء من وافق صراحةً على ذكر اسمه فقط (creditMode = TEAM_AND_NAMES).
export function creditLine(resource) {
  const team = resource?.authorLabel || '';
  const names = resource?.creditMode === 'TEAM_AND_NAMES' && Array.isArray(resource?.creditedNames)
    ? resource.creditedNames.filter(Boolean)
    : [];
  return { team, names };
}

// 422 من /admin/publish حين تنقص موافقة الفريق: يحتاج المدير سبب تجاوز مكتوبًا.
export const isTeamConsentError = (err) => err?.status === 422 && err?.code === 'TeamConsentRequired';
