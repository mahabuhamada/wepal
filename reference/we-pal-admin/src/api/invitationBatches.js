// دفعات الدعوة (لوحة الإدارة، /admin/invitations): كل دفعة أكوادها ومنطقتها ودفعة برنامجها ومسارها الاختياري.
// المسارات للمدير فقط (صلاحية مقترحة invitations.manage)؛ العقد في docs/API-CONTRACT.md («دفعات الدعوة»).
import { del, downloadBlob, get, patch, post, put } from './client';

// GET → { data:[batch], meta:{page,perPage,total,lastPage,cohorts:[{key,name}]} }
// batch: {id,name,region,cohort:{key,name},track,size,expiresAt,note,createdBy,createdAt,counts:{used,unused,expired,revoked}}
export function listInvitationBatches(page = 1) {
  return get(`/admin/invitation-batches?page=${encodeURIComponent(page)}`);
}

// payload: {name,region,cohort,track|null,count(1–200),expiresInDays?,note?} → 201 {batch, codes}
export function createInvitationBatch(payload) {
  return post('/admin/invitation-batches', payload);
}

// status: UNUSED | USED | EXPIRED، وmark: NONE | COPIED | SENT (كلاهما اختياري)
// → {batch, codes:[{id,code,joinUrl,status,region,expiresAt,usedAt,usedBy,createdAt,marks:{copied,sent}}]}
export function getInvitationBatch(id, status, mark) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (mark) params.set('mark', mark);
  const qs = params.toString() ? `?${params}` : '';
  return get(`/admin/invitation-batches/${encodeURIComponent(id)}${qs}`);
}

// تعديل دفعة: changes = {name?, count?} → {batch, codes}. العدد أقل من batch.minCount أو زيادة دفعة منتهية ← 422.
export function updateInvitationBatch(id, changes) {
  return patch(`/admin/invitation-batches/${encodeURIComponent(id)}`, changes);
}

// حذف دفعة وأكوادها. دفعة فيها كود مستعمل ← 409.
export function deleteInvitationBatch(id) {
  return del(`/admin/invitation-batches/${encodeURIComponent(id)}`);
}

// علامة «تم النسخ» (بعد نسخ الرابط) → {data: Code}. يُحفظ أول نسخ فقط؛ كود مستعمل ← 409.
export function markInvitationCopied(id) {
  return post(`/admin/invitations/${encodeURIComponent(id)}/copied`);
}

// علامة «تم الإرسال» اليدوية: sent=true يعلّم، false يزيل → {data: Code}.
export function setInvitationSent(id, sent) {
  return put(`/admin/invitations/${encodeURIComponent(id)}/sent`, { sent: Boolean(sent) });
}

// تنزيل CSV (الكود، الرابط، الحالة، تاريخ الاستعمال) باسم الملف الذي يرسله الخادم.
export function exportInvitationBatch(id) {
  return downloadBlob(`/admin/invitation-batches/${encodeURIComponent(id)}/export`, 'wepal-invitations.csv');
}

// إلغاء كود غير مستعمل (يُحذف). كود مستعمل ← 409.
export function revokeInvitationCode(id) {
  return del(`/admin/invitations/${encodeURIComponent(id)}`);
}
