// تحويل قيم enum القادمة من الـ API إلى النصوص المترجمة التي تتوقعها واجهة القسم الخاص
// (نفس النصوص المستخدمة في بيانات المحاكاة)، والعكس عند الكتابة.
//
// المصادر (يجب أن تبقى متطابقة مع mockData.js / mockDataEn.js و Badge.jsx):
//   track:       بحثي/مبادرات/محتوى رقمي            · Research/Initiatives/Digital Content
//   status(badge): فكرة/تخطيط/تنفيذ/مراجعة/منجز       · Idea/Planning/In Progress/Review/Done
//   stage(index): 0..4 لمكوّن مراحل المشروع (stepper)
//   task status: لم يبدأ/قيد التنفيذ/مكتمل            · Not Started/In Progress/Completed
//   role:        قائد/باحث/مصمم/عضو                  · Leader/Researcher/Designer/Member

// ===== المسارات (Track) =====
const TRACK_LABELS = {
  RESEARCH: { ar: 'بحثي', en: 'Research' },
  INITIATIVES: { ar: 'مبادرات', en: 'Initiatives' },
  DIGITAL_CONTENT: { ar: 'محتوى رقمي', en: 'Digital Content' },
};

// عكس: من قيمة الفلتر/التبويب (بالعربية دائمًا كما في الواجهة القديمة) إلى enum.
const TRACK_ENUM_BY_AR = {
  'بحثي': 'RESEARCH',
  'مبادرات': 'INITIATIVES',
  'محتوى رقمي': 'DIGITAL_CONTENT',
};

// مفاتيح الفلتر في ProjectFilters.jsx → enum.
const TRACK_ENUM_BY_FILTER = {
  research: 'RESEARCH',
  initiatives: 'INITIATIVES',
  digital: 'DIGITAL_CONTENT',
};

// ===== المرحلة (Stage) =====
// ترتيب المراحل يطابق فهرس الخطوات في مكوّن مراحل المشروع (0..4).
const STAGE_ORDER = ['IDEA', 'PLANNING', 'EXECUTING', 'REVIEW', 'DONE'];

// نص شارة الحالة (StatusBadge) لكل مرحلة — يطابق مفاتيح Badge.jsx (ar) وبيانات المحاكاة (en).
const STAGE_STATUS_LABELS = {
  IDEA: { ar: 'فكرة', en: 'Idea' },
  PLANNING: { ar: 'تخطيط', en: 'Planning' },
  EXECUTING: { ar: 'تنفيذ', en: 'In Progress' },
  REVIEW: { ar: 'مراجعة', en: 'Review' },
  DONE: { ar: 'منجز', en: 'Done' },
};

// ===== حالة المهمة (Task status) =====
const TASK_STATUS_LABELS = {
  TODO: { ar: 'لم يبدأ', en: 'Not Started' },
  IN_PROGRESS: { ar: 'قيد التنفيذ', en: 'In Progress' },
  DONE: { ar: 'مكتمل', en: 'Completed' },
};

// ===== دور العضو (Role) =====
const ROLE_LABELS = {
  LEADER: { ar: 'قائد', en: 'Leader' },
  RESEARCHER: { ar: 'باحث', en: 'Researcher' },
  DESIGNER: { ar: 'مصمم', en: 'Designer' },
  MEMBER: { ar: 'عضو', en: 'Member' },
};

// ===== تصنيف الفكرة (Idea label) =====
// enum → نص شارة اللوحة (يطابق مفاتيح mockData: مهم/عادي/مرفوض · Important/Normal/Rejected).
const IDEA_LABEL_LABELS = {
  IMPORTANT: { ar: 'مهم', en: 'Important' },
  NORMAL: { ar: 'عادي', en: 'Normal' },
  REJECTED: { ar: 'مرفوض', en: 'Rejected' },
};

// ألوان شارة التصنيف (تطابق labelColors في IdeaBoard القديمة).
// ألوان نص التصنيف بتباين AA على خلفيتها (مهم 5.6:1، مرفوض 5.8:1؛ كانت 1.85 و4.36).
const IDEA_LABEL_COLORS = {
  IMPORTANT: { bg: '#FFF8E1', text: '#8A5A00' },
  NORMAL: { bg: '#F5F5F5', text: '#666' },
  REJECTED: { bg: '#FFEBEE', text: '#B71C1C' },
};

export const IDEA_LABELS = ['IMPORTANT', 'NORMAL', 'REJECTED'];

// ===== نوع المصدر (Reference type) =====
const REFERENCE_TYPE_LABELS = {
  BOOK: { ar: 'كتاب', en: 'Book' },
  ARTICLE: { ar: 'مقال', en: 'Article' },
  DOCUMENT: { ar: 'وثيقة', en: 'Document' },
  VIDEO: { ar: 'فيديو', en: 'Video' },
  REPORT: { ar: 'تقرير', en: 'Report' },
  GUIDE: { ar: 'دليل', en: 'Guide' },
  OTHER: { ar: 'أخرى', en: 'Other' },
};

// ترتيب القيم لعرض قائمة اختيار النوع في ReferenceTracker.
export const REFERENCE_TYPES = ['BOOK', 'ARTICLE', 'DOCUMENT', 'VIDEO', 'REPORT', 'GUIDE', 'OTHER'];

// ===== معايير التقييم (Review scores) — الترتيب يطابق واجهة PeerReviewTab =====
const REVIEW_CRITERIA_LABELS = {
  CLARITY: { ar: 'الوضوح', en: 'Clarity' },
  DEPTH: { ar: 'العمق', en: 'Depth' },
  CREATIVITY: { ar: 'الإبداع', en: 'Creativity' },
  DOCUMENTATION: { ar: 'التوثيق', en: 'Documentation' },
  OVERALL: { ar: 'الجودة العامة', en: 'Overall Quality' },
};

export const REVIEW_CRITERIA = ['CLARITY', 'DEPTH', 'CREATIVITY', 'DOCUMENTATION', 'OVERALL'];

// نوع الرابط (kind) → أيقونة WorkspaceTab (docs/sheets/canva/drive).
const LINK_KIND_TO_TYPE = {
  docs: 'docs',
  sheets: 'sheets',
  slides: 'docs',
  canva: 'canva',
  drive: 'drive',
  figma: 'canva',
};

const pick = (map, key, lang) => map[key]?.[lang] ?? map[key]?.ar ?? key;

// ----- قراءة (API → واجهة) -----
export const trackLabel = (track, lang = 'ar') => pick(TRACK_LABELS, track, lang);
export const statusLabel = (stage, lang = 'ar') => pick(STAGE_STATUS_LABELS, stage, lang);
export const stageIndex = (stage) => {
  const i = STAGE_ORDER.indexOf(stage);
  return i === -1 ? 0 : i;
};
export const taskStatusLabel = (status, lang = 'ar') => pick(TASK_STATUS_LABELS, status, lang);
export const roleLabel = (role, lang = 'ar') => pick(ROLE_LABELS, role, lang);
export const linkType = (kind) => LINK_KIND_TO_TYPE[kind] || 'docs';
export const ideaLabelText = (label, lang = 'ar') => pick(IDEA_LABEL_LABELS, label, lang);
export const ideaLabelColor = (label) => IDEA_LABEL_COLORS[label] || IDEA_LABEL_COLORS.NORMAL;
export const referenceTypeLabel = (type, lang = 'ar') => pick(REFERENCE_TYPE_LABELS, type, lang);
export const reviewCriterionLabel = (key, lang = 'ar') => pick(REVIEW_CRITERIA_LABELS, key, lang);

// تنسيق تاريخ قصير (يوم + شهر) بلغة المستخدم — يطابق أسلوب useProjectsData.formatDeadline.
export const formatShortDate = (value, lang = 'ar') => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar', { day: 'numeric', month: 'long' });
};

// تنسيق نطاق تاريخي "من – إلى" (للاستشارات).
export const formatDateRange = (start, end, lang = 'ar') => {
  const a = formatShortDate(start, lang);
  const b = formatShortDate(end, lang);
  if (a === '—') return b;
  if (b === '—') return a;
  return lang === 'en' ? `${a} – ${b}` : `${a} – ${b}`;
};

// وقت نسبي مختصر ("منذ ساعتين" / "2h ago") — يعتمد على وحدات i18n المتاحة.
// يتلقّى دالة t لإعادة استخدام مفاتيح common الموجودة.
export const relativeTime = (value, lang = 'ar', t) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.round(diffMs / 60000);
  const ago = t ? t('common.ago') : (lang === 'en' ? 'ago' : 'منذ');
  const fmt = (n, unitKey, enUnit) => {
    const unit = t ? t(`common.${unitKey}`) : enUnit;
    return lang === 'en' ? `${n} ${unit} ${ago}` : `${ago} ${n} ${unit}`;
  };
  if (mins < 1) return lang === 'en' ? 'just now' : 'الآن';
  if (mins < 60) return fmt(mins, 'minutes', 'minutes');
  const hours = Math.round(mins / 60);
  if (hours < 24) return fmt(hours, 'hours', 'hours');
  const days = Math.round(hours / 24);
  if (days === 1) return t ? t('common.yesterday') : (lang === 'en' ? 'Yesterday' : 'أمس');
  return fmt(days, 'days', 'days');
};

// تنسيق حجم الملف (bytes → KB/MB) بنفس أسلوب بيانات المحاكاة ("2.3 MB" / "450 KB").
export const formatFileSize = (bytes) => {
  if (bytes == null || Number.isNaN(bytes)) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
};

// ----- كتابة (واجهة → API) -----
export const trackEnumFromArabic = (arLabel) => TRACK_ENUM_BY_AR[arLabel];
export const trackEnumFromFilter = (filterKey) => TRACK_ENUM_BY_FILTER[filterKey];
export const stageEnumFromIndex = (i) => STAGE_ORDER[i];

// المرحلة التالية (الخادم يسمح بالتقدّم خطوة واحدة فقط)، أو null بعد «منجز» أو لقيمة مجهولة.
export const nextStage = (stage) => {
  const i = STAGE_ORDER.indexOf(stage);
  return i === -1 ? null : STAGE_ORDER[i + 1] ?? null;
};

// تبديل حالة المهمة عبر مربع الاختيار: مكتمل ↔ غير مكتمل.
// نتعامل مع أي حالة غير DONE كـ "قابلة للإكمال"، وعند إلغاء الإكمال نرجعها TODO.
export const toggleTaskStatusEnum = (currentEnum) => (currentEnum === 'DONE' ? 'TODO' : 'DONE');

// ===================================================================
// Integration 4 — الاستطلاعات/الاستشارات/الأنشطة/الإشعارات
// ===================================================================

// ----- نوع الاستطلاع (Survey type) -----
const SURVEY_TYPE_LABELS = {
  QUARTERLY: { ar: 'ربع سنوي', en: 'Quarterly' },
  VOTE: { ar: 'تصويت', en: 'Vote' },
  ACTIVITY_EVAL: { ar: 'تقييم نشاط', en: 'Activity Review' },
  WORKSPACE: { ar: 'استطلاع مساحة عمل', en: 'Workspace survey' }, // الحزمة 5: من فريق إلى مجموعة مساره
};

// ----- حالة الاستطلاع (Survey status) -----
// DRAFT مضاف لأجل لوحة الإدارة (Integration 6) حيث تظهر المسودّات.
const SURVEY_STATUS_LABELS = {
  DRAFT: { ar: 'مسودة', en: 'Draft' },
  ACTIVE: { ar: 'نشط', en: 'Active' },
  CLOSED: { ar: 'مكتمل', en: 'Closed' },
};

export const surveyTypeLabel = (type, lang = 'ar') => pick(SURVEY_TYPE_LABELS, type, lang);
export const surveyStatusLabel = (status, lang = 'ar') => pick(SURVEY_STATUS_LABELS, status, lang);

// هل يقبل الاستطلاع إجابة العضو الآن؟ الخادم يرسل acceptsResponses (نفس شرط POST /surveys/{id}/respond،
// والحالة تبقى ACTIVE بعد endsAt حتى يغلقه المدير). خادم أقدم بلا الحقل: ليس مغلقًا ولا مسودة ولا «مثال»،
// ولم يتجاوز موعده.
export const surveyAcceptsResponses = (survey, now = Date.now()) => {
  if (typeof survey?.acceptsResponses === 'boolean') return survey.acceptsResponses;
  if (!survey || survey.isDemo || survey.status === 'CLOSED' || survey.status === 'DRAFT') return false;
  return !(survey.endsAt && Date.parse(survey.endsAt) < now);
};

// ----- نوع السؤال (Question type) -----
// إدخال الاختيار من صنف الحقل في الواجهة (radio/checkbox/scale/textarea).
export const isChoiceQtype = (qtype) => qtype === 'SINGLE_CHOICE' || qtype === 'MULTI_CHOICE';
export const isMultiQtype = (qtype) => qtype === 'MULTI_CHOICE';
export const isScaleQtype = (qtype) => qtype === 'SCALE';
export const isTextQtype = (qtype) => qtype === 'TEXT';

// ----- نوع السؤال للعرض (Question type label) + قائمة الأنواع لمنشئ الاستطلاع الإداري -----
const QTYPE_LABELS = {
  SINGLE_CHOICE: { ar: 'اختيار واحد', en: 'Single choice' },
  MULTI_CHOICE: { ar: 'اختيار متعدّد', en: 'Multiple choice' },
  SCALE: { ar: 'مقياس (1-5)', en: 'Scale (1-5)' },
  TEXT: { ar: 'نص حر', en: 'Free text' },
};
export const QTYPES = ['SINGLE_CHOICE', 'MULTI_CHOICE', 'SCALE', 'TEXT'];
export const qtypeLabel = (qtype, lang = 'ar') => pick(QTYPE_LABELS, qtype, lang);

// ----- أنواع الاستطلاع لمنشئ الإدارة -----
export const SURVEY_TYPES = ['QUARTERLY', 'VOTE', 'ACTIVITY_EVAL'];

// ----- أنواع الموارد لنماذج الإدارة (المكتبة/النشر) -----
export const RESOURCE_TYPES = ['RESEARCH', 'STUDY', 'REPORT', 'UN_RESOLUTION', 'DOCUMENT', 'BOOK', 'THESIS', 'GUIDE', 'VIDEO', 'INFOGRAPHIC', 'PODCAST'];

// ----- المناطق للفلاتر/الدعوات -----
export const REGIONS = ['GAZA', 'WEST_BANK', 'OTHER'];

// ----- جملة النشاط (Activity verb → sentence) -----
// نبني الجملة كاملة (فعل + سياق) لتُعرض في خلاصة الأنشطة بلغة المستخدم.
// كل الأفعال المعروفة مغطّاة؛ الأفعال غير المعروفة تعود بجملة عامة (بدون 'undefined').
// العربية بالمصدر لا بالفعل (القرار 5، 17 نوفمبر): الفعل الماضي يفرض مذكّرًا أو مؤنثًا («عبير انضم»)،
// والمصدر محايد. ar: المصدر وحده (حين يُعرض الاسم منفصلًا)، arWith: الجملة باسم الفاعل بعد المصدر.
const ACTIVITY_VERB_LABELS = {
  project_created: { ar: 'إنشاء مشروع', arWith: 'إنشاء {name} مشروع', en: 'created project' },
  stage_changed: { ar: 'تحديث مرحلة', arWith: 'تحديث {name} مرحلة', en: 'updated the stage of' },
  // يُسجَّل حين يُضاف عضو إلى مساحة عمل (ProjectMemberController)، لا حين ينضم إلى مجموعة.
  member_joined: { ar: 'انضمام إلى مساحة عمل', arWith: 'انضمام {name} إلى مساحة عمل', en: 'joined the workspace' },
  task_completed: { ar: 'إنجاز مهمة في', arWith: 'إنجاز {name} مهمة في', en: 'completed a task in' },
  comment_posted: { ar: 'تعليق في', arWith: 'تعليق {name} في', en: 'posted a comment in' },
  review_submitted: { ar: 'تقييم', arWith: 'تقييم {name}', en: 'reviewed' },
  idea_created: { ar: 'إضافة فكرة', arWith: 'إضافة {name} فكرة', en: 'added an idea' },
  survey_responded: { ar: 'مشاركة في استطلاع', arWith: 'مشاركة {name} في استطلاع', en: 'responded to survey' },
  resource_published: { ar: 'نشر مصدر', arWith: 'نشر {name} مصدرًا', en: 'published a resource' },
  project_update_posted: { ar: 'تحديث في', arWith: 'نشر {name} تحديثًا في', en: 'posted an update in' },
};

// نشاط العارض نفسه: الفعل بصيغة المخاطَب في العربية، بلا تشكيل فيصلح للعضو والعضوة («انضممت»).
// الإنجليزية لا تتغير فيها صيغة الفعل؛ يتغير الفاعل وحده («You»، activitySentence).
const ACTIVITY_VERB_SELF_AR = {
  project_created: 'أنشأت مشروع',
  stage_changed: 'حدّثت مرحلة',
  member_joined: 'انضممت إلى مساحة عمل',
  task_completed: 'أنجزت مهمة في',
  comment_posted: 'نشرت تعليقاً في',
  review_submitted: 'قيّمت',
  idea_created: 'أضفت فكرة',
  survey_responded: 'شاركت في استطلاع',
  resource_published: 'نشرت مصدراً',
  project_update_posted: 'نشرت تحديثاً في',
};

// نوع الموضوع (subject.type) → اسم عام يُستخدم عندما لا يوفّر الخادم عنوانًا (title=null).
const SUBJECT_TYPE_LABELS = {
  Project: { ar: 'مشروع', en: 'a project' },
  Survey: { ar: 'استطلاع', en: 'a survey' },
  Comment: { ar: 'نقاش', en: 'a discussion' },
  Idea: { ar: 'فكرة', en: 'an idea' },
  Task: { ar: 'مهمة', en: 'a task' },
  Review: { ar: 'تقييم', en: 'a review' },
  Resource: { ar: 'مصدر', en: 'a resource' },
  Group: { ar: 'مجموعة', en: 'a group' },
};

// جملة الفعل فقط (للجزء الأوسط من صف النشاط). self: النشاط للعارض نفسه (صيغة المخاطَب).
export const activityVerbSentence = (verb, lang = 'ar', self = false) => {
  if (self && lang !== 'en') return ACTIVITY_VERB_SELF_AR[verb] ?? 'قمت بنشاط في';
  const entry = ACTIVITY_VERB_LABELS[verb];
  if (entry) return lang === 'en' ? entry.en : entry.ar;
  return lang === 'en' ? 'had activity on' : 'نشاط في';
};

// فاعل النشاط كما يُعرض: اسمه، أو «أنت»/«You» حين يكون العارض نفسه (me = معرّف العارض).
export const activityActorName = (activity, lang = 'ar', me = null) => {
  const self = me != null && activity?.user?.id != null && String(activity.user.id) === String(me);
  if (self) return lang === 'en' ? 'You' : 'أنت';
  return activity?.user?.name ?? '';
};

// الجملة كاملة: «فلان أنشأ…» للآخرين، و«أنشأت…» / «You created…» للعارض نفسه.
export const activitySentence = (activity, lang = 'ar', me = null) => {
  const self = me != null && activity?.user?.id != null && String(activity.user.id) === String(me);
  const subject = activitySubjectText(activity?.subject, lang);
  // غيري بالعربية: «انضمام عبير إلى مساحة عمل …» (المصدر محايد، القرار 5)
  if (!self && lang !== 'en') {
    const name = activity?.user?.name ?? '';
    const withName = ACTIVITY_VERB_LABELS[activity?.verb]?.arWith ?? 'نشاط {name} في';
    return `${withName.replace('{name}', name)} ${subject}`.replace(/\s+/g, ' ').trim();
  }
  const actor = self && lang !== 'en' ? '' : activityActorName(activity, lang, me);
  return `${actor} ${activityVerbSentence(activity?.verb, lang, self)} ${subject}`.trim();
};

// عنوان الهدف المعروض: عنوان الموضوع إن وُجد، وإلا اسم عام حسب النوع.
export const activitySubjectText = (subject, lang = 'ar') => {
  if (subject?.title) return subject.title;
  const t = SUBJECT_TYPE_LABELS[subject?.type];
  return t ? (t[lang] ?? t.ar) : '';
};

// ----- نوع الإشعار (Notification type → label + أيقونة) -----
// نطابق التصنيفات الثلاث في الواجهة القديمة (مشروع/مجتمع/استطلاع) مع أنواع الخادم،
// ونعيد فئة مرئية (project|community|survey) للأيقونة واللون.
const NOTIFICATION_CATEGORY = {
  // أنواع محتملة من الخادم → الفئة المرئية.
  project: 'project',
  project_updated: 'project',
  stage_changed: 'project',
  task_assigned: 'project',
  chat_mentioned_team: 'project',
  chat_mentioned: 'community',
  task_due: 'project',
  comment_posted: 'project',
  review_submitted: 'project',
  community: 'community',
  member_joined: 'community',
  group_post: 'community',
  group_post_reply: 'community',
  badge_earned: 'community',
  survey: 'survey',
  survey_published: 'survey',
  survey_closing: 'survey',
  consultation: 'survey',
  outcome_published: 'survey', // الحزمة 6أ: خلاصة «سألنا / قلتم / فعلنا»
};

// تُرجع الفئة المرئية لأي نوع إشعار (افتراضي 'project').
export const notificationCategory = (type) => {
  if (!type) return 'project';
  return NOTIFICATION_CATEGORY[type] || NOTIFICATION_CATEGORY[String(type).toLowerCase()] || 'project';
};

// ===================================================================
// Integration 5 — البوابة العامة (Public portal)
// ملاحظة: محتوى الخادم عربي دائمًا (بيانات حقيقية)؛ لكن مساعدات الألوان/الأيقونات
// (typeColor/TYPE_ICONS/regionColor) تفتاح على التسميات المترجمة. لذا نُحوّل enum
// إلى نص التسمية بلغة الواجهة الحالية كي تعمل الألوان وتبقى شارات الواجهة صحيحة.
// ===================================================================

// ----- نوع المورد (Resource type) → نص التسمية (يطابق مفاتيح TYPE_COLORS/TYPE_ICONS) -----
const RESOURCE_TYPE_LABELS = {
  RESEARCH: { ar: 'ورقة بحثية', en: 'Research Paper' },
  GUIDE: { ar: 'دليل', en: 'Guide' },
  VIDEO: { ar: 'فيديو', en: 'Video' },
  INFOGRAPHIC: { ar: 'إنفوجرافيك', en: 'Infographic' },
  PODCAST: { ar: 'بودكاست', en: 'Podcast' },
  DOCUMENT: { ar: 'وثيقة', en: 'Document' },
  REPORT: { ar: 'تقرير', en: 'Report' },
  UN_RESOLUTION: { ar: 'قرار أممي', en: 'UN resolution' },
  BOOK: { ar: 'كتاب', en: 'Book' },
  THESIS: { ar: 'رسالة جامعية', en: 'Thesis' },
  STUDY: { ar: 'دراسة', en: 'Study' },
};

// enum نوع المورد → نص التسمية (لـ typeColor/TYPE_ICONS + شارة الواجهة).
export const resourceTypeLabel = (type, lang = 'ar') => pick(RESOURCE_TYPE_LABELS, type, lang);

// ----- تصنيف المقال → تسمية معروضة -----
// التصنيف عمود نصّي لا مترجَم: هو مفتاح تُبنى عليه التصفية، فترجمته في
// قاعدة البيانات كانت تكسر where(). نترجم التسمية هنا فقط.
const POST_CATEGORY_LABELS = {
  'تجارب': { ar: 'تجارب', en: 'Experiences' },
  'أبحاث': { ar: 'أبحاث', en: 'Research' },
  'مبادرات': { ar: 'مبادرات', en: 'Initiatives' },
  'أدلة': { ar: 'أدلة', en: 'Guides' },
  'أخبار': { ar: 'أخبار', en: 'News' },
  // مفتاح محجوز في الخادم للأخبار (ليس تسمية يكتبها المدير)، فيُترجَم دائمًا.
  news: { ar: 'أخبار', en: 'News' },
  'رأي': { ar: 'رأي', en: 'Opinion' },
};

/**
 * تسمية التصنيف بلغة الواجهة. التصنيف غير المعروف يُعرض كما هو —
 * فالأدمن حرّ في إضافة تصنيف جديد دون انتظار تحديث هذه الخريطة.
 */
export const postCategoryLabel = (category, lang = 'ar') =>
  POST_CATEGORY_LABELS[category]?.[lang] ?? category ?? '';

// ----- المنطقة (Region) → نص التسمية (يطابق مفاتيح REGION_COLORS) -----
const REGION_LABELS = {
  GAZA: { ar: 'غزة', en: 'Gaza' },
  WEST_BANK: { ar: 'الضفة الغربية', en: 'West Bank' },
  OTHER: { ar: 'القاهرة', en: 'Cairo' },
};

// enum المنطقة → نص التسمية (لـ regionColor + شارة الواجهة). القيم غير المعروفة تعود كما هي.
export const regionLabel = (region, lang = 'ar') =>
  REGION_LABELS[region] ? (REGION_LABELS[region][lang] ?? REGION_LABELS[region].ar) : (region || '');

// ===================================================================
// Integration 6 — لوحة الإدارة (Admin)
// ===================================================================

// ----- حالة البلاغ (Report status) -----
const REPORT_STATUS_LABELS = {
  PENDING: { ar: 'معلّق', en: 'Pending' },
  RESOLVED: { ar: 'تم حله', en: 'Resolved' },
  DISMISSED: { ar: 'مُتجاهَل', en: 'Dismissed' },
};
export const reportStatusLabel = (status, lang = 'ar') => pick(REPORT_STATUS_LABELS, status, lang);

// ----- نتيجة معالجة البلاغ (Report resolution) — قيم الخادم في meta.resolution -----
const RESOLUTION_LABELS = {
  CONTENT_HIDDEN: { ar: 'أُخفي المحتوى', en: 'Content hidden' },
  CONTENT_DELETED: { ar: 'حُذف المحتوى', en: 'Content deleted' },
  WARNING_SENT: { ar: 'أُرسل تحذير', en: 'Warning sent' },
  DISMISSED: { ar: 'تم التجاهل', en: 'Dismissed' },
};
export const resolutionLabel = (resolution, lang = 'ar') =>
  resolution ? pick(RESOLUTION_LABELS, resolution, lang) : '';

// ----- فعل سجل التدقيق (Audit action) — سلاسل الخادم المُعدَّدة حيًّا -----
const AUDIT_ACTION_LABELS = {
  'invitations.generate': { ar: 'توليد أكواد دعوة', en: 'Generated invitation codes' },
  'invitations.batch_create': { ar: 'إنشاء دفعة دعوة', en: 'Created an invitation batch' },
  'invitations.batch_view': { ar: 'اطّلاع على أكواد دفعة دعوة', en: 'Viewed an invitation batch' },
  'invitations.batch_export': { ar: 'تصدير أكواد دفعة دعوة', en: 'Exported an invitation batch' },
  'invitations.revoke': { ar: 'إلغاء كود دعوة', en: 'Revoked an invitation code' },
  'invitations.individual_create': { ar: 'دعوة شخص', en: 'Invited a person' },
  'invitations.individual_view': { ar: 'اطّلاع على الدعوات الفردية', en: 'Viewed individual invitations' },
  'invitations.sms_sent': { ar: 'إرسال كود دعوة برسالة', en: 'Sent an invitation code by SMS' },
  'invitations.sms_failed': { ar: 'فشل إرسال كود دعوة برسالة', en: 'Failed to send an invitation code by SMS' },
  'maintenance.toggle': { ar: 'تبديل وضع الصيانة', en: 'Toggled maintenance mode' },
  'appearance.update': { ar: 'تعديل إعدادات الواجهة', en: 'Updated appearance settings' },
  'report.resolve': { ar: 'معالجة بلاغ', en: 'Resolved a report' },
  'content.restore': { ar: 'استرجاع محتوى مخفي', en: 'Restored hidden content' },
  'content.purge': { ar: 'حذف محتوى مخفي نهائيًّا', en: 'Permanently deleted hidden content' },
  'user.update': { ar: 'تعديل مستخدم', en: 'Updated a user' },
  // المرحلتان 2 و4 من لوحة الإدارة
  'user.view': { ar: 'فتح صفحة عضو', en: 'Opened a member page' },
  'user.list_view': { ar: 'اطّلاع على قائمة المستخدمين', en: 'Viewed the user list' },
  'user.role_change': { ar: 'تغيير دور عضو', en: 'Changed a member role' },
  'user.suspend': { ar: 'إيقاف حساب', en: 'Suspended an account' },
  'user.reactivate': { ar: 'إعادة تفعيل حساب', en: 'Reactivated an account' },
  'contact_message.list_view': { ar: 'اطّلاع على رسائل التواصل', en: 'Viewed contact messages' },
  'contact_message.mark_read_many': { ar: 'تعليم رسائل مقروءة', en: 'Marked messages read' },
  'contact_message.mark_unread_many': { ar: 'تعليم رسائل غير مقروءة', en: 'Marked messages unread' },
  'discussion.workspace_view': { ar: 'فتح نقاش مساحة عمل', en: 'Opened a workspace discussion' },
  'invitations.sheet_import': { ar: 'دعوات من ورقة', en: 'Invited from a sheet' },
  'invitations.revoke_many': { ar: 'إلغاء أكواد دعوة', en: 'Revoked invitation codes' },
  'invitations.batch_update': { ar: 'تعديل دفعة دعوة', en: 'Edited an invitation batch' },
  'invitations.batch_delete': { ar: 'حذف دفعة دعوة', en: 'Deleted an invitation batch' },
  'invitations.mark_copied': { ar: 'نسخ رابط كود دعوة', en: 'Copied an invitation link' },
  'invitations.mark_sent': { ar: 'تعليم كود دعوة مُرسلًا', en: 'Marked an invitation code sent' },
  'invitations.unmark_sent': { ar: 'إزالة علامة الإرسال عن كود دعوة', en: 'Unmarked an invitation code as sent' },
  'settings.staff_notifications': { ar: 'تعديل إشعارات الطاقم', en: 'Updated staff notifications' },
  'resource.create': { ar: 'إنشاء مورد', en: 'Created a resource' },
  'resource.update': { ar: 'تعديل مورد', en: 'Updated a resource' },
  'resource.delete': { ar: 'حذف مورد', en: 'Deleted a resource' },
  'story.create': { ar: 'إنشاء قصة', en: 'Created a story' },
  'story.update': { ar: 'تعديل قصة', en: 'Updated a story' },
  'story.delete': { ar: 'حذف قصة', en: 'Deleted a story' },
  'post.create': { ar: 'إنشاء مقال', en: 'Created a post' },
  'post.update': { ar: 'تعديل مقال', en: 'Updated a post' },
  'post.delete': { ar: 'حذف مقال', en: 'Deleted a post' },
  'faq.create': { ar: 'إضافة سؤال شائع', en: 'Added an FAQ' },
  'faq.update': { ar: 'تعديل سؤال شائع', en: 'Updated an FAQ' },
  'faq.reorder': { ar: 'ترتيب الأسئلة الشائعة', en: 'Reordered the FAQ' },
  'faq.delete': { ar: 'حذف سؤال شائع', en: 'Deleted an FAQ' },
  'emergency.purge': { ar: 'حذف نهائي للبيانات', en: 'Purged data' },
  'resource.publish': { ar: 'نشر مخرَج', en: 'Published a resource' },
  'resource.publish_consent_override': { ar: 'نشر مخرَج دون اكتمال موافقة الفريق', en: 'Published a resource without full team consent' },
  'resource.extract_text': { ar: 'إعادة استخراج نص ملف مورد', en: "Re-extracted a resource file's text" },
  'library.extract_text': { ar: 'استخراج نص ملفات المكتبة', en: 'Extracted library file text' },
  // #129: تغطية سجل التدقيق لكل الأفعال الإدارية.
  'survey.create': { ar: 'إنشاء استطلاع', en: 'Created a survey' },
  'survey.publish': { ar: 'نشر استطلاع', en: 'Published a survey' },
  'survey.close': { ar: 'إغلاق استطلاع', en: 'Closed a survey' },
  'survey.delete': { ar: 'حذف استطلاع', en: 'Deleted a survey' },
  'consultation.create': { ar: 'إنشاء استشارة', en: 'Created a consultation' },
  'consultation.update': { ar: 'تعديل استشارة', en: 'Updated a consultation' },
  'consultation.delete': { ar: 'حذف استشارة', en: 'Deleted a consultation' },
  'group.create': { ar: 'إنشاء مجموعة', en: 'Created a group' },
  'group.update': { ar: 'تعديل مجموعة', en: 'Updated a group' },
  'group.delete': { ar: 'حذف مجموعة', en: 'Deleted a group' },
  // ملاحظة هلا د-6: أعضاء المجموعة من «تعديل المجموعة» (meta.userId)
  'group.add_member': { ar: 'إضافة عضو إلى مجموعة', en: 'Added a member to a group' },
  'group.remove_member': { ar: 'إزالة عضو من مجموعة', en: 'Removed a member from a group' },
  'group_post.delete': { ar: 'حذف منشور في مجموعة', en: 'Deleted a group post' },
  'group_post_comment.delete': { ar: 'حذف تعليق على منشور مجموعة', en: 'Deleted a comment on a group post' },
  'template.create': { ar: 'إنشاء قالب', en: 'Created a template' },
  'template.update': { ar: 'تعديل قالب', en: 'Updated a template' },
  'template.delete': { ar: 'حذف قالب', en: 'Deleted a template' },
  'course.verify': { ar: 'توثيق إكمال دورة', en: 'Verified a course completion' },
  'project.admin_override': { ar: 'تصرّف في مشروع بصلاحية المدير', en: 'Acted on a project as admin' },
  // ما يُسجَّل عبر project.admin_override في meta.via.
  'project.update': { ar: 'تعديل مشروع', en: 'Updated a project' },
  'project.delete': { ar: 'حذف مشروع', en: 'Deleted a project' },
  'task.create': { ar: 'إنشاء مهمة', en: 'Created a task' },
  'task.update': { ar: 'تعديل مهمة', en: 'Updated a task' },
  'task.delete': { ar: 'حذف مهمة', en: 'Deleted a task' },
};
// الخادم يسجّل أي مسار إداري جديد تلقائيًا باسم مشتق من المسار، فالاسم غير المعروف
// يُعرض خامًا (مثل «widget.archive») بدل خانة فارغة.
export const auditActionLabel = (action, lang = 'ar') => {
  const entry = AUDIT_ACTION_LABELS[action];
  if (entry) return entry[lang] ?? entry.ar;
  return action || '';
};

// تفاصيل إضافية لسطر السجل من meta. حاليًا: project.admin_override ← { title, via } حيث via
// هو الفعل الذي نفّذه المدير (مترجَمًا إن عُرف). يعيد null إن لم يوجد ما يُعرض.
export const auditActionDetail = (row, lang = 'ar') => {
  if (row?.action !== 'project.admin_override') return null;
  const title = row.meta?.projectTitle || '';
  const via = row.meta?.via ? auditActionLabel(row.meta.via, lang) : '';
  return title || via ? { title, via } : null;
};

// ----- زمن القراءة (readTimeMinutes → "X دقائق" / "X min") -----
// يعيد استخدام common.minutes (عربية) مقابل "min" الإنجليزية المختصرة كما في بيانات المحاكاة.
export const readTimeText = (minutes, lang = 'ar', t) => {
  const n = minutes ?? 0;
  if (lang === 'en') return `${n} min`;
  const unit = t ? t('common.minutes') : 'دقائق';
  return `${n} ${unit}`;
};

// ----- تنسيق تاريخ النشر بأسلوب بيانات المحاكاة ("15 يناير 2026" / "January 15, 2026") -----
export const formatPublishedDate = (value, lang = 'ar') => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'ar', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

// مرجع مستخدم قد يأتي UserSummary ({id,name}) أو معرّفًا فقط (مثل uploadedBy في ملفات المشروع).
// team: أعضاء المشروع لاستكمال الاسم عند وصول المعرّف وحده.
export const userRef = (value, team = []) => {
  if (!value) return { id: null, name: '' };
  if (typeof value === 'string') {
    return { id: value, name: team.find((m) => m.id === value)?.name || '' };
  }
  return { id: value.id ?? null, name: value.name || team.find((m) => m.id === value.id)?.name || '' };
};

// «12 مارس 2026» → { day: '12', rest: 'مارس 2026' } لخانة التاريخ.
export function newsDate(iso, lang) {
  if (!iso) return { day: '—', rest: '' };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { day: '—', rest: '' };
  const locale = lang === 'en' ? 'en-US' : 'ar';
  return {
    day: d.toLocaleDateString(locale, { day: 'numeric' }),
    rest: d.toLocaleDateString(locale, { month: 'short', year: 'numeric' }),
  };
}

// نص قد يصل من الخادم نصًا محلولًا أو كائن ترجمات خام ({ ar, en? }) — يرجع نصًا دائمًا،
// حتى لا تنهار الصفحة بـ «Objects are not valid as a React child».
export function textOf(value, lang = 'ar') {
  if (value && typeof value === 'object') return value[lang] ?? value.ar ?? value.en ?? '';
  return value ?? '';
}
