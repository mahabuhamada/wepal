// خدمات منصّة القسم الخاص (Integration 4) فوق عميل الـ API.
// تغطّي: الاستطلاعات، الاستشارات، كورسات أثر، مجموعات المجتمع، سجل الأنشطة، الإشعارات.
import { get, post, patch, del, fetchAllPages, unwrapList } from './client';

// ===== الاستطلاعات (Surveys) =====
// filters: { status?('ACTIVE'|'CLOSED'), mine?(true) }
// GET → [{id,title,type,status,endsAt,questionsCount,responsesCount,respondedByMe}]
export function listSurveys(filters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.mine) params.set('mine', '1');
  // كل الصفحات (العقد §0): الصفحة تحسب إحصاءاتها على القائمة كاملة، لا على أول 20.
  params.set('perPage', '100');
  return fetchAllPages((page) => get(`/surveys?${params}&page=${page}`));
}

// GET → { ...survey, questions:[{id,text,qtype,options,position}] }
export function getSurvey(id) {
  return get(`/surveys/${id}`);
}

// payload: { answers:[{questionId, value:{choice}|{choices:[]}|{scale:1-5}|{text}}] }
// أخطاء عربية: 400/409 (شارك مسبقًا)/422 (تحقّق).
export function respondSurvey(id, answers) {
  return post(`/surveys/${id}/respond`, { answers });
}

// GET → { surveyId,title,totalResponses,questions:[...aggregates] }
// 403 قبل المشاركة ('شارك أولاً…').
export function getSurveyResults(id) {
  return get(`/surveys/${id}/results`);
}

// ===== الاستشارات (Consultations) =====
// GET → [{id,title,description,polisConversationId,status,startsAt,endsAt,participantsCount,reportUrl,participatedByMe,canParticipate}]
// status هو الحالة الفعلية (المنتهية ← COMPLETED فورًا)، و canParticipate نفس شرط قبول «شاركت» (#126).
// كل الصفحات: الصفحة تبحث عن الاستشارة النشطة في القائمة كاملة.
export function listConsultations() {
  return fetchAllPages((page) => get(`/consultations?perPage=100&page=${page}`));
}

export function getConsultation(id) {
  return get(`/consultations/${id}`);
}

// تسجيل المشاركة (idempotent). يُحدّث العدّاد على الخادم.
export function participateConsultation(id) {
  return post(`/consultations/${id}/participated`);
}

// ===== خلاصة «سألنا / قلتم / فعلنا» (الحزمة 6أ) =====
// GET → { id, subjectType, subjectId, subjectTitle, asked, said, did, status, publishedAt,
//         participantsCount, closedAt, regions:{threshold,total,shown:[{region,participants}],hiddenParticipants,questions:[…]} }
// 404 قبل النشر (المدير يرى المسودة).
const OUTCOME_SUBJECTS = { survey: 'surveys', consultation: 'consultations' };

export function outcomePath(type, id) {
  const base = OUTCOME_SUBJECTS[type];
  if (!base) throw new Error(`unknown outcome subject: ${type}`);
  return `/${base}/${encodeURIComponent(id)}/outcome`;
}

export function getSurveyOutcome(id) {
  return get(outcomePath('survey', id));
}

export function getConsultationOutcome(id) {
  return get(outcomePath('consultation', id));
}

// «ماذا حدث بما شاركت فيه»: خلاصات منشورة لما شارك فيه العضو، الأحدث أولًا → { items: [...] }
export function listMyOutcomes(limit = 5) {
  return get(`/me/outcomes?limit=${encodeURIComponent(limit)}`);
}

// ===== كورسات أثر (Courses) =====
// GET → { courses:[{id,title,atharUrl,myStatus}], total, verified, label('2/2') }
export function getMyCourses() {
  return get('/me/courses');
}

// ===== مجموعات المجتمع (Groups) =====
// GET → [{id,name,slug,color,membersCount,postsCount}]
// GET /groups/{id} — تفاصيل مجموعة وأعضاؤها (تحترم خصوصية كل عضو).
export function getGroup(id) {
  return get(`/groups/${id}`);
}

// أعضاء المجموعة صفحةً صفحة (B3.1) بنفس شكل وخصوصية members في GET /groups/{id} → { items, meta }.
export async function listGroupMembers(id, page = 1) {
  return unwrapList(await get(`/groups/${id}/members?page=${page}`));
}

// للمدير: المجموعة مع translations الخام حتى لا يمحو الحفظ الترجمة الأخرى.
export function getGroupForEdit(id) {
  return get(`/groups/${id}?withTranslations=1`);
}

// PATCH /groups/{id} (B4.3، للمدير) — payload: { name?: {ar, en?}, description?/rules?: {ar, en?}|null, slug?, color? }.
export function updateGroup(id, payload) {
  return patch(`/groups/${id}`, payload);
}

// POST /groups (للمدير، شاشة «المجموعات» في المرحلة 4) — payload بشكل updateGroup نفسه
export function createGroup(payload) {
  return post('/groups', payload);
}

export function listGroups() {
  // كل الصفحات: المجموعات قائمة صغيرة تُعرض كاملة.
  return fetchAllPages((page) => get(`/groups?perPage=100&page=${page}`));
}

export function joinGroup(id) {
  return post(`/groups/${id}/join`);
}

export function leaveGroup(id) {
  return del(`/groups/${id}/leave`);
}

// ملاحظة هلا د-6 (لصاحب groups.manage، من «تعديل المجموعة»): إضافة عضو يدويًا → العضوية (reason: ADMIN).
// عضو مسبقًا ← 409. الإضافة ترفع إزالة سابقة.
export function addGroupMember(id, userId) {
  return post(`/groups/${encodeURIComponent(id)}/members`, { userId });
}

// إزالة عضو (ولو من مجموعة منطقة). لا تعيده القواعد التلقائية بعدها ولا ينضم بنفسه حتى يُضاف من جديد.
export function removeGroupMember(id, userId) {
  return del(`/groups/${encodeURIComponent(id)}/members/${encodeURIComponent(userId)}`);
}

// ===== سجل الأنشطة (Activities) =====
// GET → [{id,user{id,name},verb,subject{type,id,title,isDemo,projectId},createdAt}]
// subject.projectId: مساحة النشاط (لمن يرى داخلياتها فقط، وإلا null) — الرئيسية تعرض نشاط مساحاتي به.
export function listActivities(limit = 20) {
  return get(`/activities?limit=${limit}`).then((res) => unwrapList(res).items);
}

// ===== الإشعارات (Notifications) =====
// GET → { data:[{id,type,data{title,body},readAt,createdAt}], meta{page,lastPage,…,unreadCount} }
// filters: { unread?, page? }
export function listNotifications(filters = {}) {
  const params = new URLSearchParams();
  if (filters.unread) params.set('unread', '1');
  if (filters.page) params.set('page', String(filters.page));
  const qs = params.toString();
  return get(`/notifications${qs ? `?${qs}` : ''}`);
}

export function markNotificationRead(id) {
  return post(`/notifications/${id}/read`);
}

export function markAllNotificationsRead() {
  return post('/notifications/read-all');
}
