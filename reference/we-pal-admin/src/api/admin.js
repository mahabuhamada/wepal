// خدمات لوحة الإدارة (Integration 6) فوق عميل الـ API.
// كل النقاط تتطلّب توكن Bearer ودور ADMIN؛ الأخطاء عربية بصيغة {statusCode,message}.
// تغطّي: الإحصائيات والرسوم، المستخدمين والدعوات، البلاغات، مفتاح الطوارئ،
// سجل التدقيق، المنشورات القابلة للنشر، CRUD للموارد/القصص/المقالات، الاستطلاعات الإدارية،
// وتحقّق كورسات أثر.
import { get, post, patch, put, del, uploadForm, downloadBlob, fetchAllPages } from './client';
import { imageFormFields } from '../utils/images';
import { outcomePath } from './platform';

// ===== الإحصائيات (Stats) =====
// GET → {activeUsers,totalUsers,activeProjects,doneProjects,engagementRate,pendingReports,publishedResources,surveyResponses}
// رئيسية الإدارة (المرحلة 1): ما ينتظر القارئ حسب صلاحياته، والمؤشرات، وعدّادات الشريط، وآخر أفعال الطاقم.
// → { attention: [{key,count,oldestAt,to,items?,people?,soonestAt?,soonestName?}], counts: {reports,…},
//     kpis: [{key,scope,value,previous?,of?,recent?,segments?,source,to}], recent: [{id,actor,action,label,at}], generatedAt }
// days: مدة المؤشرات 7 أو 30 (الافتراضي) أو 90 يومًا (المرحلة 2)
export function getAdminSummary(days = 30) {
  return get(days && days !== 30 ? `/admin/summary?days=${days}` : '/admin/summary');
}

export function getStats() {
  return get('/admin/stats');
}

// GET → [{region,count}]
export function getUsersByRegion() {
  return get('/admin/stats/users-by-region');
}

// GET → [{track,count}]
export function getProjectsByTrack() {
  return get('/admin/stats/projects-by-track');
}

// GET → [{month:'YYYY-MM',activities,newUsers}] (آخر 6 أشهر)
export function getMonthlyActivity() {
  return get('/admin/stats/monthly-activity');
}

// ===== المستخدمون (Users) =====
// filters: { q?, region?, role?, active?('0'|'1'|bool), page? }
// GET → {data:[{id,name,email,region,role,isActive,points,createdAt}], meta{total,page,perPage}}
export function listUsers(filters = {}) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.region) params.set('region', filters.region);
  if (filters.role) params.set('role', filters.role);
  if (filters.active !== undefined && filters.active !== '') {
    params.set('active', filters.active === true ? '1' : filters.active === false ? '0' : filters.active);
  }
  if (filters.tab && filters.tab !== 'all') params.set('tab', filters.tab);
  // بطاقات «النشطون» و«المشاركون»: ?seen=N و?participated=N (أيام)
  if (filters.seen) params.set('seen', filters.seen);
  if (filters.participated) params.set('participated', filters.participated);
  if (filters.page) params.set('page', filters.page);
  const qs = params.toString();
  return get(`/admin/users${qs ? `?${qs}` : ''}`);
}

// payload: { isActive?, role? } — تعديل الحساب الذاتي يعيد 400 (رسالة عربية).
export function updateUser(id, payload) {
  return patch(`/admin/users/${id}`, payload);
}

// ===== الدعوات (Invitations) =====
// used: undefined(الكل) | 0 | 1، و page →
// { data:[{id,code,region,used,usedBy,expiresAt,createdAt}], meta, summary:{total,used,unused} } (مقسّمة).
export function listInvitations(used, page = 1) {
  const params = new URLSearchParams();
  if (used === 0 || used === 1 || used === '0' || used === '1') params.set('used', String(used));
  params.set('page', String(page));
  return get(`/admin/invitations?${params}`);
}

// payload: { count:1-200, region, expiresInDays:1-365 (افتراضيًا 30) } → أكواد جديدة بـ expiresAt.
export function generateInvitations(count, region, expiresInDays) {
  return post('/admin/invitations', { count, region, ...(expiresInDays ? { expiresInDays } : {}) });
}

// إلغاء كود غير مستخدم (B4.3)؛ المستخدم ← 409.
export function revokeInvitation(id) {
  return del(`/admin/invitations/${encodeURIComponent(id)}`);
}

// ===== البلاغات (Reports) =====
// status: 'PENDING' | 'RESOLVED' | 'DISMISSED'
// GET → {data:[{id,type,reason,status,resolution,reporter{id,name},contentPreview,createdAt}]}
export function listReports(status = 'PENDING', page = 1) {
  return get(`/admin/reports?status=${encodeURIComponent(status)}&page=${page}`);
}

// action: 'hide' | 'warn' | 'dismiss' — hide قابل للاسترجاع من «المحتوى المخفي».
// options: { memberMessage, notifyReporter } — رسالة للعضو في إشعاره، وإبلاغ المبلِّغ بالنتيجة.
export function resolveReport(id, action, { memberMessage = '', notifyReporter = false } = {}) {
  const body = { action, notifyReporter: Boolean(notifyReporter) };
  if (memberMessage && memberMessage.trim()) body.memberMessage = memberMessage.trim();
  return post(`/admin/reports/${id}/resolve`, body);
}

// ===== «المحتوى المخفي» (سلة الإشراف) =====
// → { data: [{id,type,preview,author,hiddenAt,hiddenBy,reason,reportsCount,purgeableAt}], counts: {comment,…}, retentionDays }
export function listHiddenContent(type = '') {
  return get(`/admin/hidden-content${type ? `?type=${encodeURIComponent(type)}` : ''}`);
}

export function restoreHiddenContent(type, id) {
  return post(`/admin/hidden-content/${encodeURIComponent(type)}/${encodeURIComponent(id)}/restore`);
}

// للمدير وحده؛ قبل مرور مدة السلة يلزم سبب (10 أحرف على الأقل)
export function purgeHiddenContent(type, id, reason = '') {
  return del(`/admin/hidden-content/${encodeURIComponent(type)}/${encodeURIComponent(id)}`, reason ? { reason } : undefined);
}

// ===== مفتاح الطوارئ (Kill switch) =====
// on: bool — تفعيل/إيقاف وضع الصيانة (يمنع بقية المستخدمين بـ 503).
export function setMaintenance(on) {
  return post('/admin/maintenance', { on });
}

// → { maintenance: bool } — الحالة الحالية (B4.3).
export function getMaintenance() {
  return get('/admin/maintenance');
}

// ===== إعدادات الواجهة (إعادة التصميم، المرحلة أ) =====
// GET → { design, hero: { mode, newsCount, interval }, updatedAt }
export function getAppearance() {
  return get('/admin/appearance');
}

// PATCH جزئي: { design?, hero?: { mode?, newsCount?, interval? } } → الحالة الكاملة الجديدة.
export function updateAppearance(changes) {
  return patch('/admin/appearance', changes);
}

// حذف نهائي: يتطلّب عبارة تأكيد حرفية + نطاقات؛ عبارة خاطئة → 400 عربي.
// payload: { confirm:'حذف نهائي', scopes:[...] } → أعداد المحذوف لكل نطاق.
export function purge(confirm, scopes) {
  return post('/admin/emergency/purge', { confirm, scopes });
}

// ===== سجل التدقيق (Audit) =====
// GET → [{id,admin{id,name},action,targetType,targetId,meta,createdAt}]
// أفعال معروفة: invitations.generate, maintenance.toggle, report.resolve,
//   user.update, resource.create/update/delete, story.create/delete, post.create/delete.
// مقسّم (B3.1): perPage حتى 100 (limit اسم قديم مقبول)، و page لـ «عرض المزيد».
export function listAudit(perPage = 50, page = 1) {
  return get(`/admin/audit?perPage=${perPage}&page=${page}`);
}

// ===== النشر (Publishing) =====
// GET → {data:[مشاريع DONE مع ملفاتها]}
export function listPublishable() {
  return get('/admin/publishable');
}

// payload: { projectId, fileId?, title?, description?, type, authorLabel?, externalUrl? }
export function publish(payload) {
  return post('/admin/publish', payload);
}

// ===== إدارة الموارد (Resources CRUD) =====
// payload: { title, description?, type, authorLabel?, externalUrl? }
export function createResource(payload) {
  return post('/admin/resources', payload);
}

// رفع مورد بملف مرفق: يرسل multipart مع الحقول النصية إلى جانب الملف.
export function createResourceWithFile(fields, file) {
  return uploadForm('/admin/resources', { fields, file });
}

export function updateResource(id, payload) {
  return patch(`/admin/resources/${id}`, payload);
}

// استبدال ملف التحميل من المحرّر: PHP لا يقرأ multipart في PATCH، فيُرسل POST بـ _method=PATCH.
export function replaceResourceFile(id, file) {
  return uploadForm(`/admin/resources/${encodeURIComponent(id)}`, { fields: { _method: 'PATCH' }, file });
}

export function deleteResource(id) {
  return del(`/admin/resources/${id}`);
}

// ===== إدارة القصص (Stories CRUD) =====
// payload: { name, region, quote, fullText, badgeLabel?, projectTitle? }
/**
 * قوائم الإدارة مع المسودات (العقد §5 — B4.3، #62): تشمل غير المنشور وترجع
 * الترجمات الخام {ar,en} دائمًا للتحرير. مقسّمة { data, meta }. للمدير فقط.
 * كانت تقرأ /public/...?withTranslations=1 التي تُخفي المسودات.
 * filters: { status?: 'all'|'draft'|'published', page? }
 */
// kind (للمقالات): news أو analysis، قائمتا «الأخبار» و«التحليلات»
const adminContentQuery = ({ status = 'all', page, kind, type, missing, origin } = {}) => {
  const params = new URLSearchParams({ status });
  if (kind) params.set('kind', kind);
  // مرشّحات بطاقات «نظرة عامة»: ?type= للمكتبة، و?missing=en لما لا نسخة إنجليزية له
  if (type) params.set('type', type);
  if (missing) params.set('missing', missing);
  if (origin) params.set('origin', origin);
  if (page) params.set('page', String(page));
  return params.toString();
};
export function listResourcesForAdmin(filters) {
  return get(`/admin/resources?${adminContentQuery(filters)}`);
}
export function listPostsForAdmin(filters) {
  return get(`/admin/posts?${adminContentQuery(filters)}`);
}
export function listStoriesForAdmin(filters) {
  return get(`/admin/stories?${adminContentQuery(filters)}`);
}

export function createStory(payload) {
  return post('/admin/stories', payload);
}
// PATCH /admin/stories/{id} — تعديل قصة قائمة (بما فيها إضافة الترجمة لاحقاً).
export function updateStory(id, payload) {
  return patch(`/admin/stories/${id}`, payload);
}

export function deleteStory(id) {
  return del(`/admin/stories/${id}`);
}

// ===== إدارة المقالات (Posts CRUD) =====
// payload: { title, excerpt, content, category, authorLabel? }
export function createPost(payload) {
  return post('/admin/posts', payload);
}
// PATCH /admin/posts/{id} — تعديل مقال قائم.
export function updatePost(id, payload) {
  return patch(`/admin/posts/${id}`, payload);
}

export function deletePost(id) {
  return del(`/admin/posts/${id}`);
}

// ===== الأسئلة الشائعة (المرحلة 1 من خطة المساعد، العقد §5) =====
// GET /admin/faq?status= → { data: [{ id, question, answer, category, sortOrder, published, isDemo, translations }], meta: { total } }
// القائمة كاملة بلا تقسيم وبترتيب العرض (التصنيف ثم sortOrder).
export function listFaqForAdmin({ status = 'all' } = {}) {
  return get(`/admin/faq?${new URLSearchParams({ status })}`);
}
// payload: { question: {ar, en?}, answer: {ar, en?}, category, published? } ← العنصر (يُضاف في آخر تصنيفه).
export function createFaq(payload) {
  return post('/admin/faq', payload);
}
// تعديل جزئي؛ { published } وحدها للنشر وإلغائه.
export function updateFaq(id, payload) {
  return patch(`/admin/faq/${id}`, payload);
}
// الترتيب الجديد لأسئلة تصنيف: ids بالترتيب المطلوب ← { data } بالترتيب نفسه.
export function reorderFaq(ids) {
  return put('/admin/faq/order', { ids });
}
export function deleteFaq(id) {
  return del(`/admin/faq/${id}`);
}

// ===== صور المحتوى (جولة التصميم 6، العقد §5 «صور المحتوى») =====
// الرفع multipart: image + alt[ar] (مطلوب) + alt[en] و credit اختياريان (+ photoConsent "1"/"0" لصورة القصة).
// الرد: العنصر كاملًا بشكل الإدارة وفيه coverImage/photo { url, srcset, width, height, alt, credit, altTranslations }.
// الحذف ← العنصر وفيه null. تعديل الوصف دون رفع: PATCH العنصر بـ coverAlt/coverCredit أو photoAlt/photoCredit.
const uploadImage = (path, { file, ...text }) =>
  uploadForm(path, { fields: imageFormFields(text), file, fileField: 'image' });

export function uploadPostCover(id, data) {
  return uploadImage(`/admin/posts/${id}/cover`, data);
}
export function deletePostCover(id) {
  return del(`/admin/posts/${id}/cover`);
}
export function uploadResourceCover(id, data) {
  return uploadImage(`/admin/resources/${id}/cover`, data);
}
export function deleteResourceCover(id) {
  return del(`/admin/resources/${id}/cover`);
}
export function uploadStoryPhoto(id, data) {
  return uploadImage(`/admin/stories/${id}/photo`, data);
}
export function deleteStoryPhoto(id) {
  return del(`/admin/stories/${id}/photo`);
}
// صورة رأس صفحة قائمة (page: news|blog|polls|stories|library|outputs) ← إعدادات المظهر كاملة.
export function uploadPageHeader(page, data) {
  return uploadImage(`/admin/appearance/page-headers/${page}`, data);
}
export function deletePageHeader(page) {
  return del(`/admin/appearance/page-headers/${page}`);
}

// ===== الاستطلاعات (Surveys admin) =====
// payload: { title, description?, type, endsAt?, questions:[{text,qtype,options?,position?}] }
export function createSurvey(payload) {
  return post('/surveys', payload);
}

export function publishSurvey(id) {
  return post(`/surveys/${id}/publish`);
}

export function closeSurvey(id) {
  return post(`/surveys/${id}/close`);
}

// حذف مسموح للمسودّات (DRAFT) فقط — غير ذلك 400 عربي.
export function deleteSurvey(id) {
  return del(`/surveys/${id}`);
}

// قائمة الاستطلاعات في اللوحة (كل الصفحات): مع من أنشأه، وأين نُشر، ومتى، وعدد الإجابات.
// filters: { status?: DRAFT|ACTIVE|CLOSED|REVIEW (للزوار بانتظار المراجعة), placement?: workspace|group|public|members }
// GET → [{ ...survey, creator:{id,name}|null, placement:{kind,project,group}, publishedAt, awaitingReview }]
export function listAdminSurveys({ status, placement } = {}) {
  const qs = listQuery({ status, placement, perPage: 100 });
  return fetchAllPages((page) => get(`/admin/surveys${qs}&page=${page}`));
}

// «نظرة عامة» لصفحة الاستطلاعات بالمرشّحات نفسها.
export function getSurveysSummary({ status, placement } = {}) {
  return get(`/admin/surveys/summary${listQuery({ status, placement })}`);
}

// ===== كورسات أثر (Courses admin) =====
// GET → [{id,courseId,courseTitle,userId,userName,status,selfReportedAt,verifiedAt}]
export function listCourseCompletions(verified, page = 1) {
  const params = new URLSearchParams();
  if (verified === 0 || verified === 1 || verified === '0' || verified === '1') {
    params.set('verified', String(verified));
  }
  params.set('page', String(page));
  return get(`/courses/completions?${params}`);
}

export function verifyCourseCompletion(courseId, userId) {
  return post(`/courses/${courseId}/verify`, { userId });
}

// ===== رسائل التواصل والنشرة (B7.2، للمدير فقط) =====
// → { data:[{id,name,email,subject,message,createdAt,readAt,readBy}], meta:{…, unreadCount} } الأحدث أولًا.
// حالة القراءة (PR 212): status = 'unread' | 'read' (بلا = الكل)، و perPage=1 لجلب الشارة وحدها.
// خادم قبل PR 212 لا يرسل readAt ولا unreadCount فلا تظهر الشارة ولا أزرار القراءة.
export function listContactMessages(page = 1, { status, perPage } = {}) {
  const params = new URLSearchParams({ page: String(page) });
  if (status) params.set('status', status);
  if (perPage) params.set('perPage', String(perPage));
  return get(`/admin/contact-messages?${params}`);
}

// تعليم رسالة مقروءة/غير مقروءة (PR 212) → العنصر نفسه بلا غلاف data. تكرار الحالة لا يغيّر شيئًا.
export function markContactMessage(id, read) {
  return patch(`/admin/contact-messages/${id}`, { read: Boolean(read) });
}

// → { data:[{id,email,subscribedAt}], meta } الأحدث أولًا.
export function listNewsletterSubscribers(page = 1) {
  return get(`/admin/newsletter?page=${page}`);
}

// ===== «أسئلة البحث» (سجل البحث بلا هوية) =====
// معاملات التقرير ونظرته العامة: الشهر، والمصدر (ask|library|search)، والمكان (public|members)، والحالة.
// الحالة تُرسل دائمًا إن اختيرت ولو «all»: الخادم يفترض unanswered حين تغيب.
const searchQueryParams = ({ month, source, area, status } = {}) => {
  const params = new URLSearchParams();
  if (month) params.set('month', month);
  if (source) params.set('source', source);
  if (area) params.set('area', area);
  if (status) params.set('status', status);
  return params;
};

// GET /admin/search-queries?month=YYYY-MM&source=&area=&status=all|answered|unanswered&page=
// → { data: [{ query, count, askers|null, status, unansweredCount, sources, areas, faqId, firstSeenAt, lastSeenAt }],
//     meta, month, summary: { total, unanswered, asks, unansweredAsks }, retentionDays }
export function getSearchQueryReport({ page = 1, ...filters } = {}) {
  const params = new URLSearchParams({ page: String(page) });
  searchQueryParams(filters).forEach((v, k) => params.set(k, v));
  return get(`/admin/search-queries?${params}`);
}

// «نظرة عامة» للتقرير بالمرشّحات نفسها → { tiles:[asked, unanswered, askers, fromMembers], charts:[bySource, topQuestions], empty }
export function getSearchQueriesSummary(filters = {}) {
  const qs = searchQueryParams(filters).toString();
  return get(`/admin/search-queries/summary${qs ? `?${qs}` : ''}`);
}

// POST /consultations (ملاحظة هلا هـ-2): { title:{ar,en?}, description?, polisConversationId, startsAt?, endsAt? } → Consultation
export function createConsultation(payload) {
  return post('/consultations', payload);
}

// ===== تقرير الاستشارة (B7.4، للمدير) =====
// report: { summary, topStatements:[{text,agree,disagree}], groups:[{name,percentage,description?}] } أو null لحذفه.
export function updateConsultationReport(id, report) {
  return patch(`/consultations/${encodeURIComponent(id)}`, { report });
}

// ===== خلاصة «سألنا / قلتم / فعلنا» (الحزمة 6أ، للمدير) =====
// type: 'survey' | 'consultation'
// GET /admin/outcomes/pending → { items: [{subjectType, subjectId, title, closedAt, participantsCount, hasDraft}] }
export function listPendingOutcomes() {
  return get('/admin/outcomes/pending');
}

// الخلاصة مع النسخ الخام للغتين، حتى لا يمحو الحفظ الترجمة الأخرى.
export function getOutcomeForEdit(type, id) {
  return get(`${outcomePath(type, id)}?withTranslations=1`);
}

// body: { asked?, said?, did? } — نص أو {ar, en}. مسودة؛ على منشورة: تعديل بلا إشعار جديد.
export function saveOutcome(type, id, body) {
  return put(outcomePath(type, id), body);
}

// ينشر ويُشعر كل من شارك. 422 إن نقص حقل بالعربية، 400 إن كان العنصر مفتوحًا أو الخلاصة منشورة.
export function publishOutcome(type, id, body = {}) {
  return post(`${outcomePath(type, id)}/publish`, body);
}

// ===== المرحلة 2: صفحة القائمة والإشراف =====

/** معاملات الاستعلام بلا القيم الفارغة: «الكل» و'' وnull لا تُرسل. */
export function listQuery(filters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || v === 'all' || v === false) return;
    params.set(k, v === true ? '1' : String(v));
  });
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

// طابور البلاغات المجمَّع: صف لكل محتوى → { data:[{key,type,id,preview,author,place,reportsCount,reportersCount,reasons,firstAt,lastAt}], meta:{counts} }
export function listReportQueue({ status = 'PENDING', type, multi, page } = {}) {
  return get(`/admin/reports/queue${listQuery({ status: status === 'PENDING' ? null : status, type, multi, page })}`);
}

// «نظرة عامة» بالمرشّحات نفسها → { tiles:[{key,value,scope,source,to}], charts:[{key,kind,items}], empty }
export function getReportsSummary({ status = 'PENDING', type, multi } = {}) {
  return get(`/admin/reports/summary${listQuery({ status: status === 'PENDING' ? null : status, type, multi })}`);
}

export function getReportGroup(type, id) {
  return get(`/admin/reports/queue/${type}/${id}`);
}

export function resolveReportGroup(type, id, action, { memberMessage = '', notifyReporter = false } = {}) {
  const body = { action, notifyReporter: Boolean(notifyReporter) };
  if (memberMessage.trim()) body.memberMessage = memberMessage.trim();
  return post(`/admin/reports/queue/${type}/${id}/resolve`, body);
}

// items: [{type,id}] → { done:[…], skipped:[{type,id,reason}] }
export function bulkResolveReports(action, items, { notifyReporter = false } = {}) {
  return post('/admin/reports/bulk', { action, items, notifyReporter: Boolean(notifyReporter) });
}

export function getUsersSummary(filters = {}) {
  return get(`/admin/users/summary${listQuery(filters)}`);
}

// «النقاشات»: kind = workspace | group. فتح نقاش مساحة يُسجَّل في التدقيق.
export function listDiscussions({ kind = 'workspace', q, page } = {}) {
  return get(`/admin/discussions${listQuery({ kind: kind === 'workspace' ? null : kind, q, page })}`);
}

export function getDiscussion(kind, id) {
  return get(`/admin/discussions/${kind === 'group' ? 'group' : 'workspace'}/${id}`);
}

// ورقة دعوات CSV/XLSX: معاينة بلا كتابة، ثم إنشاء برسائل SMS
export function previewInvitationSheet(file, fields) {
  return uploadForm('/admin/invitations/sheet/preview', { fields, file });
}

export function importInvitationSheet(file, fields) {
  return uploadForm('/admin/invitations/sheet', { fields: { ...fields, sendSms: fields?.sendSms === false ? '0' : '1' }, file });
}

export function revokeInvitations(ids) {
  return post('/admin/invitations/revoke', { ids });
}

export function markContactMessages(ids, read) {
  return post('/admin/contact-messages/read', { ids, read: Boolean(read) });
}

// ===== المرحلة 4: الأعضاء والأدوار والإعدادات =====

// صفحة العضو (360) — فتحها يُسجَّل في التدقيق
export function getMember(id) {
  return get(`/admin/users/${encodeURIComponent(id)}`);
}

// الدور بسبب مكتوب، ورمز المصادقة الثنائية حين يكون الدور الجديد «مدير» أو «مدير عام»
export function changeUserRole(id, { role, reason, code } = {}) {
  const body = { role, reason };
  if (code) body.code = code;
  return post(`/admin/users/${encodeURIComponent(id)}/role`, body);
}

export function suspendUser(id, reason) {
  return post(`/admin/users/${encodeURIComponent(id)}/suspend`, { reason });
}

export function reactivateUser(id, reason = '') {
  return post(`/admin/users/${encodeURIComponent(id)}/reactivate`, reason ? { reason } : {});
}

// مصفوفة الأدوار → { permissions:[{key,label}], roles:[{role,permissions:[]}] }
export function getRolesMatrix() {
  return get('/admin/roles');
}

// إشعارات الطاقم → { kinds: { reports: {permission, allowed:[], roles:[]}, … } }
export function getStaffNotifications() {
  return get('/admin/settings/staff-notifications');
}

export function updateStaffNotifications(kinds) {
  return put('/admin/settings/staff-notifications', { kinds });
}

// سجل التدقيق بمرشّحات (المرحلة 4): category, outcome, action (فعل أو بادئة «user.*»), from, to, actorId
export function listAuditFiltered(filters = {}, page = 1) {
  return get(`/admin/audit${listQuery({ ...filters, perPage: 50, page })}`);
}

// تصدير CSV بالمرشّحات نفسها (المدير العام: audit.export)
export function exportAuditCsv(filters = {}) {
  return downloadBlob(`/admin/audit/export${listQuery(filters)}`, 'audit-log.csv');
}

// «نظرة عامة» للمكتبة (status: all|draft|published) والمقترحات (status: حالة المقترح أو null للكل)
export function getLibrarySummary({ status = 'all' } = {}) {
  return get(`/admin/library/summary${listQuery({ status })}`);
}

export function getProposalsSummary({ status = null } = {}) {
  return get(`/admin/proposals/summary${listQuery({ status })}`);
}

// إعادة ضبط المصادقة الثنائية لعضو (المدير العام): سبب مكتوب ورمز المنفِّذ
export function resetMemberTwoFactor(id, { reason, code }) {
  return post(`/admin/users/${encodeURIComponent(id)}/two-factor/reset`, { reason, code });
}

// عدد رسائل التواصل غير المقروءة لشارة الشريط: { unreadCount } بلا بيانات شخصية
export function getInboxUnreadCount() {
  return get('/admin/contact-messages/unread-count');
}

// «نظرة عامة» لطلبات النشر: الطلبات، واكتملت موافقاتها، والناقصة، والمنشورة، ونسبة موافقة كل فريق
export function getPublishSummary() {
  return get('/admin/publish/summary');
}
