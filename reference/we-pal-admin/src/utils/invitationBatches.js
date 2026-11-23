// دفعات الدعوة: نموذج الإنشاء وحالات الأكواد (صفحة /admin/invitations). حدود الخادم نفسها (StoreInvitationBatchRequest).

export const BATCH_LIMITS = { nameMin: 2, nameMax: 120, countMin: 1, countMax: 200, daysMin: 1, daysMax: 365, noteMax: 500 };

// تبويبات تفاصيل الدفعة: ALL = بلا ترشيح.
export const CODE_FILTERS = ['ALL', 'UNUSED', 'USED', 'EXPIRED'];

export const CODE_STATUS_TONES = { UNUSED: 'success', USED: 'info', EXPIRED: 'warning' };

// ترشيح أكواد الدفعة بالعلامة (?mark=): ALL = بلا ترشيح.
export const CODE_MARK_FILTERS = ['ALL', 'NONE', 'COPIED', 'SENT'];

export const emptyBatchForm = (cohorts = []) => ({
  name: '',
  region: 'GAZA',
  cohort: cohorts.length === 1 ? cohorts[0].key : '',
  track: '',
  count: '20',
  expiresInDays: '30',
  note: '',
});

const toInt = (v) => (/^\d+$/.test(String(v).trim()) ? Number(String(v).trim()) : NaN);

// أخطاء النموذج: {حقل: مفتاح ترجمة}؛ فارغ = صالح.
export function batchFormErrors(form) {
  const e = {};
  const L = BATCH_LIMITS;
  const name = form.name.trim();
  if (name.length < L.nameMin || name.length > L.nameMax) e.name = 'inviteBatches.form.errors.name';
  if (!form.region) e.region = 'inviteBatches.form.errors.region';
  if (!form.cohort) e.cohort = 'inviteBatches.form.errors.cohort';
  const count = toInt(form.count);
  if (!(count >= L.countMin && count <= L.countMax)) e.count = 'inviteBatches.form.errors.count';
  const days = toInt(form.expiresInDays);
  if (!(days >= L.daysMin && days <= L.daysMax)) e.expiresInDays = 'inviteBatches.form.errors.days';
  if (form.note.trim().length > L.noteMax) e.note = 'inviteBatches.form.errors.note';
  return e;
}

// جسم POST /admin/invitation-batches.
export function batchPayload(form) {
  return {
    name: form.name.trim(),
    region: form.region,
    cohort: form.cohort,
    track: form.track || null,
    count: toInt(form.count),
    expiresInDays: toInt(form.expiresInDays),
    note: form.note.trim() || null,
  };
}

// الكود المستعمل لا يُلغى؛ غير المستعمل والمنتهي يُلغيان.
export const canRevoke = (code) => code?.status !== 'USED';

// نسبة المستعمل من كل ما أُصدر (للشريط في بطاقة الدفعة)، عدد صحيح 0–100.
export function usedPercent(counts) {
  const total = (counts?.used ?? 0) + (counts?.unused ?? 0) + (counts?.expired ?? 0);
  return total ? Math.round(((counts.used ?? 0) / total) * 100) : 0;
}

// بعد إلغاء كود: تحديث أعداد الدفعة محليًا دون إعادة الطلب.
export function countsAfterRevoke(counts, status) {
  const key = status === 'EXPIRED' ? 'expired' : 'unused';
  return { ...counts, [key]: Math.max(0, (counts?.[key] ?? 0) - 1), revoked: (counts?.revoked ?? 0) + 1 };
}

// انتهت صلاحية الدفعة (أو الكود)؟ now قابل للحقن في الاختبار.
export const isPastDate = (iso, now = Date.now()) => Boolean(iso) && new Date(iso).getTime() < now;

// ----- تعديل الدفعة وحذفها (ملاحظات هلا أ-1) -----

// الأكواد الباقية في الدفعة الآن (المُلغى لا يُحسب): هذا ما يعدّله حقل «عدد الأكواد».
export const liveCount = (counts) => (counts?.used ?? 0) + (counts?.unused ?? 0) + (counts?.expired ?? 0);

// أقل عدد يقبله الخادم: المستعمل وما نُسخ أو أُرسل (minCount من الخادم، وإلا يُحسب).
export const minBatchCount = (batch) =>
  batch?.minCount ?? Math.max(1, (batch?.counts?.used ?? 0) + (batch?.counts?.handedOut ?? 0));

export const editBatchForm = (batch) => ({ name: batch?.name ?? '', count: String(liveCount(batch?.counts)) });

// أخطاء نموذج التعديل: {حقل: [مفتاح ترجمة, متغيّرات]}؛ فارغ = صالح.
export function editBatchErrors(form, batch) {
  const e = {};
  const L = BATCH_LIMITS;
  const name = form.name.trim();
  if (name.length < L.nameMin || name.length > L.nameMax) e.name = ['inviteBatches.form.errors.name'];
  const min = minBatchCount(batch);
  const count = toInt(form.count);
  if (!(count >= L.countMin && count <= L.countMax)) e.count = ['inviteBatches.form.errors.count'];
  else if (count < min) e.count = ['inviteBatches.edit.errors.belowMin', { min }];
  return e;
}

// جسم PATCH: الحقول التي تغيّرت فقط ({} = لا تغيير).
export function editBatchPayload(form, batch) {
  const body = {};
  const name = form.name.trim();
  const count = toInt(form.count);
  if (name !== batch?.name) body.name = name;
  if (count !== liveCount(batch?.counts)) body.count = count;
  return body;
}

// الحذف لدفعة لم يُستعمل أي كود منها (الخادم يرفض غيرها بـ 409).
export const canDeleteBatch = (batch) => (batch?.counts?.used ?? 0) === 0;

// علامة «تم الإرسال» اليدوية تُزال باليد؛ الإرسال برسالة SMS لا.
export const isSentByHand = (code) => code?.marks?.sent?.via === 'manual';

// وصل الكود إلى أحد؟ (نُسخ أو أُرسل) — كما يحسبه الخادم في counts.handedOut.
const handedOut = (code) => Boolean(code?.marks?.copied || code?.marks?.sent);

// بعد تغيير علامة كود غير مستعمل: تحديث counts.handedOut وminCount محليًا دون إعادة الطلب.
export function batchAfterMark(batch, before, after) {
  if (!batch || before?.status === 'USED') return batch;
  const delta = Number(handedOut(after)) - Number(handedOut(before));
  if (!delta) return batch;
  const counts = { ...batch.counts, handedOut: Math.max(0, (batch.counts?.handedOut ?? 0) + delta) };
  return { ...batch, counts, minCount: Math.max(1, (counts.used ?? 0) + counts.handedOut) };
}
