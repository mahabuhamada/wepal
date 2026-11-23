// الدعوات الفردية: نموذج «دعوة شخص»، ونموذج «إرسال برسالة» لكود من دفعة، وحالات الدعوة في الجدول.
// حدود الخادم نفسها (StoreIndividualInvitationRequest، InvitationSms).
import { isPalestinianMobile } from './phone';

export const INVITE_LIMITS = { nameMin: 2, nameMax: 120, emailMax: 190, daysMin: 1, daysMax: 365, maxSends: 3 };

// ترشيح الجدول: ALL = بلا ترشيح، والبقية حالة الدعوة من الخادم (inviteStatus).
export const INVITE_FILTERS = ['ALL', 'SENT', 'FAILED', 'PENDING', 'USED', 'EXPIRED'];

export const INVITE_STATUS_TONES = { PENDING: 'neutral', SENT: 'info', FAILED: 'danger', USED: 'success', EXPIRED: 'warning' };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const emptyInviteForm = (cohorts = []) => ({
  name: '',
  phone: '',
  email: '',
  region: 'GAZA',
  cohort: cohorts.length === 1 ? cohorts[0].key : '',
  track: '',
  expiresInDays: '30',
  sendSms: true,
});

const toInt = (v) => (/^\d+$/.test(String(v).trim()) ? Number(String(v).trim()) : NaN);

const nameError = (name) => {
  const n = String(name ?? '').trim();
  return n.length < INVITE_LIMITS.nameMin || n.length > INVITE_LIMITS.nameMax ? 'inviteSms.form.errors.name' : null;
};

const phoneError = (phone) => {
  const p = String(phone ?? '').trim();
  if (!p) return 'inviteSms.form.errors.phoneRequired';
  return isPalestinianMobile(p) ? null : 'inviteSms.form.errors.phone';
};

// أخطاء نموذج «دعوة شخص»: {حقل: مفتاح ترجمة}؛ فارغ = صالح.
export function inviteFormErrors(form) {
  const e = {};
  const name = nameError(form.name);
  if (name) e.name = name;
  const phone = phoneError(form.phone);
  if (phone) e.phone = phone;
  const email = form.email.trim();
  if (email && (!EMAIL.test(email) || email.length > INVITE_LIMITS.emailMax)) e.email = 'inviteSms.form.errors.email';
  if (!form.region) e.region = 'inviteSms.form.errors.region';
  if (!form.cohort) e.cohort = 'inviteSms.form.errors.cohort';
  const days = toInt(form.expiresInDays);
  if (!(days >= INVITE_LIMITS.daysMin && days <= INVITE_LIMITS.daysMax)) e.expiresInDays = 'inviteSms.form.errors.days';
  return e;
}

// جسم POST /admin/invitations/individual.
export function invitePayload(form) {
  return {
    name: form.name.trim(),
    phone: form.phone.trim(),
    email: form.email.trim() || null,
    region: form.region,
    cohort: form.cohort,
    track: form.track || null,
    expiresInDays: toInt(form.expiresInDays),
    sendSms: Boolean(form.sendSms),
  };
}

// أخطاء نموذج «إرسال برسالة» لكود من دفعة: الاسم والجوال مطلوبان إن لم يكونا محفوظين على الكود.
export function sendSmsErrors(form, invitee = null) {
  const e = {};
  if (!invitee?.name) {
    const name = nameError(form.name);
    if (name) e.name = name;
  }
  if (!invitee?.phone) {
    const phone = phoneError(form.phone);
    if (phone) e.phone = phone;
  }
  return e;
}

// يمكن إرسال الكود (أو إعادته)؟ غير مستعمل، وغير منتهٍ، وبقيت له محاولات.
export function canSendSms(inv) {
  if (!inv) return false;
  const status = inv.inviteStatus ?? inv.status;
  if (status === 'USED' || status === 'EXPIRED') return false;
  return (inv.sms?.remaining ?? INVITE_LIMITS.maxSends) > 0;
}

// استبدال دعوة في القائمة بالنسخة الجديدة من الخادم (بعد الإرسال)، أو إضافتها في أولها إن كانت جديدة.
export function upsertInvitation(list, inv) {
  if (!inv?.id) return list;
  return list.some((x) => x.id === inv.id) ? list.map((x) => (x.id === inv.id ? inv : x)) : [inv, ...list];
}
