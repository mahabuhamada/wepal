// مقترحات مساحات العمل والتحديات (الحزمة 3أ) فوق عميل الـ API.
import { get, post, patch, del } from './client';

// ===== العضو =====

// مقترحاتي، الأحدث أولًا → paginated { data: [proposal], meta }.
export function listMyProposals() {
  return get('/proposals?perPage=50');
}

export function getProposal(id) {
  return get(`/proposals/${encodeURIComponent(id)}`);
}

// payload: { title, track(RESEARCH|INITIATIVES|DIGITAL_CONTENT), description, expectedOutput }
export function submitProposal(payload) {
  return post('/proposals', payload);
}

// تعديل صاحبه (PENDING أو NEEDS_CHANGES)، فيعود إلى الإدارة.
export function reviseProposal(id, payload) {
  return patch(`/proposals/${encodeURIComponent(id)}`, payload);
}

// التحديات المتاحة → { data: [challenge] }.
export function listChallenges() {
  return get('/challenges');
}

export function joinChallenge(id) {
  return post(`/challenges/${encodeURIComponent(id)}/join`);
}

export function leaveChallenge(id) {
  return del(`/challenges/${encodeURIComponent(id)}/join`);
}

// ===== الإدارة =====

// status: PENDING (الافتراضي في الخادم) | NEEDS_CHANGES | DECLINED | APPROVED | all
export function listAdminProposals({ status, page } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (page) params.set('page', String(page));
  const qs = params.toString();
  return get(`/admin/proposals${qs ? `?${qs}` : ''}`);
}

// decision: approve | request_changes | decline. note إلزامية للأخيرين (الخادم يرد 422 بدونها).
export function decideProposal(id, decision, note) {
  const body = { decision };
  const text = note?.trim();
  if (text) body.note = text;
  return post(`/admin/proposals/${encodeURIComponent(id)}/decision`, body);
}

export function listAdminChallenges({ page } = {}) {
  return get(`/admin/challenges${page ? `?page=${page}` : ''}`);
}

// payload: { title, track, description, minMembers, maxMembers, closesAt(YYYY-MM-DD) }
export function createChallenge(payload) {
  return post('/admin/challenges', payload);
}

export function updateChallenge(id, payload) {
  return patch(`/admin/challenges/${encodeURIComponent(id)}`, payload);
}

// leaderId اختياري: من المنضمين، وإلا فأولهم.
export function launchChallenge(id, leaderId) {
  return post(`/admin/challenges/${encodeURIComponent(id)}/launch`, leaderId ? { leaderId } : {});
}

export function closeChallenge(id) {
  return post(`/admin/challenges/${encodeURIComponent(id)}/close`);
}
