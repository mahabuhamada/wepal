// الدعوات الفردية (لوحة الإدارة، /admin/invitations): كود لشخص باسمه وجواله يُرسل له برسالة SMS.
// المسارات خلف صلاحية invitations.manage؛ العقد في docs/API-CONTRACT.md («الدعوة الفردية»).
import { get, post } from './client';

// filters: {status?: PENDING|SENT|FAILED|USED|EXPIRED, q?: نص}
// → { data:[Invitation], meta:{page,perPage,total,lastPage,cohorts:[{key,name}]}, summary:{total,used,unused} }
export function listIndividualInvitations(page = 1, { status, q } = {}) {
  const params = new URLSearchParams({ kind: 'individual', page: String(page) });
  if (status) params.set('status', status);
  if (q && q.trim()) params.set('q', q.trim());
  return get(`/admin/invitations?${params}`);
}

// payload: {name, phone, email|null, region, cohort, track|null, expiresInDays, sendSms}
// → 201 { data: Invitation, sms: {sent, reason, message} } — فشل الرسالة لا يلغي الكود.
export function createIndividualInvitation(payload) {
  return post('/admin/invitations/individual', payload);
}

// إرسال كود أو إعادة إرساله. contact: {name?, phone?} لكود بلا مدعو محفوظ (من دفعة).
// → { data: Invitation, sms: {sent, reason, message} }. 429 قبل مضي الدقيقة أو بعد 3 مرات، 409 لمستعمل/منتهٍ.
export function sendInvitationSms(id, contact = {}) {
  const body = {};
  if (contact.name?.trim()) body.name = contact.name.trim();
  if (contact.phone?.trim()) body.phone = contact.phone.trim();
  return post(`/admin/invitations/${encodeURIComponent(id)}/send-sms`, body);
}
