// خدمات البوابة العامة (Integration 5) فوق الـ API.
// نقاط النهاية عامة ولا تتطلب توكن — لذا لا نُرفق ترويسة Authorization إطلاقًا
// (publicGet و downloadBlob مع auth: false من العميل الموحّد).
// اللغة تُمرَّر صراحةً لكل دالة لأن الوحدة تُستدعى أيضًا من loaders تعمل على الخادم.
import { apiUrl, downloadBlob, fetchAllPages, publicGet, request, unwrapList } from './client';
import { withPreview } from '../utils/previewLink';

// URL كامل لنقطة نهاية عامة (يُستخدم أيضًا لفتح روابط 302 عبر window.open).
export const publicUrl = apiUrl;

// ===== المصادر (Resources) =====
// filters: { type?(enum), q?, origin?('project'), page?, perPage? }
// GET → [{id,title,description,type,authorLabel,viewCount,downloadCount,externalUrl,publishedAt,sourceProjectId}]
const resourcesQuery = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.q) params.set('q', filters.q);
  // origin=project: ما أنتجته فرق المنصة فقط (صفحة المخرجات، قرار جولة 6).
  if (filters.origin) params.set('origin', filters.origin);
  // التقسيم (العقد §0): الافتراضي أول 20؛ perPage حتى 100.
  if (filters.page) params.set('page', String(filters.page));
  if (filters.perPage) params.set('perPage', String(filters.perPage));
  const qs = params.toString();
  return `/public/resources${qs ? `?${qs}` : ''}`;
};

export function listResources(filters = {}, lang) {
  return publicGet(resourcesQuery(filters), lang).then((res) => unwrapList(res).items);
}

// صفحة واحدة مع meta لـ useInfiniteList («عرض المزيد») → { items, meta }.
// البحث (?q=) وحده يُرسل توكن العضو إن كان داخلًا: الخادم يسجّل السؤال الذي لم يجد نتيجة موسومًا «عضو» أو «زائر»
// (بلا معرّف العضو)، والرد نفسه للاثنين. على الخادم (loader) لا توكن، فيبقى الطلب عامًا.
export async function listResourcesPage(filters = {}, lang) {
  const path = resourcesQuery(filters);
  return unwrapList(await (filters.q ? request('GET', path, { lang }) : publicGet(path, lang)));
}

// GET → مورد مفرد. القراءة لا تُحسب مشاهدة (صفحات الخادم والبناء تقرأ أيضًا): المتصفح يسجّلها بـ recordResourceView.
// id: المعرّف أو الـ slug (مرمّزًا: الـ slug عربي). preview: توكن رابط المعاينة من المحرّر (utils/previewLink.js):
// المادة وهي مسودّة، ومعها preview: true. توكن خاطئ أو منتهٍ يعامله الخادم كأنه لم يُرسل.
export function getResource(id, lang, preview) {
  return publicGet(withPreview(`/public/resources/${encodeURIComponent(id)}`, preview), lang);
}

// تنزيل مورد: لو كان له externalUrl نفتح النقطة (تُعيد 302) في تبويب جديد؛
// وإلا نُنزّل التدفّق الثنائي بلا توكن. يزيد عدّاد التنزيل على الخادم.
export function downloadResource(resource) {
  const path = `/public/resources/${resource.id}/download`;
  if (resource.externalUrl) {
    window.open(publicUrl(path), '_blank', 'noopener');
    return Promise.resolve(0);
  }
  return downloadBlob(path, resource.title || 'resource', { auth: false });
}

// ===== القصص (Stories) =====
// GET → [{id,name,region,quote,fullText,badgeLabel,projectTitle}]
export function listStories(lang) {
  return publicGet('/public/stories', lang).then((res) => unwrapList(res).items);
}

// صفحة واحدة مع meta → { items, meta }.
export async function listStoriesPage(page = 1, lang) {
  return unwrapList(await publicGet(`/public/stories?page=${page}`, lang));
}

// GET /public/stories/{id|slug} (B4.3) — القصة المنشورة مباشرة؛ غير المنشورة أو غير الموجودة ← null.
export async function getStory(id, lang, preview) {
  try {
    return await publicGet(withPreview(`/public/stories/${encodeURIComponent(id)}`, preview), lang);
  } catch (err) {
    if (err?.status === 404) return null;
    throw err;
  }
}

// ===== المقالات (Posts) =====
// filters: { category? }
// GET → [{id,title,excerpt,category,authorLabel,readTimeMinutes,publishedAt,viewCount}]
export function listPosts(filters = {}, lang) {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  const qs = params.toString();
  return publicGet(`/public/posts${qs ? `?${qs}` : ''}`, lang).then((res) => unwrapList(res).items);
}

// صفحة واحدة مع meta → { items, meta }. filters: { category?, page? }
export async function listPostsPage(filters = {}, lang) {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  params.set('page', String(filters.page ?? 1));
  return unwrapList(await publicGet(`/public/posts?${params}`, lang));
}

// GET → مقال مفرد مع الحقل content.
// id: المعرّف أو الـ slug (مرمّزًا).
export function getPost(id, lang, preview) {
  return publicGet(withPreview(`/public/posts/${encodeURIComponent(id)}`, preview), lang);
}

// ===== الإحصائيات (Stats) =====
// GET → { members, projects, resources, communities }
export function getStats(lang) {
  return publicGet('/public/stats', lang);
}

// ===== إعدادات الانضمام (العقد §4) =====
// GET → { phoneRequired } — true بعد PHONE_REQUIRED_FROM: الجوال ورمزه مطلوبان في التسجيل.
// خادم أقدم بلا هذا المسار، أو أي فشل: false (الجوال اختياري كما كان، والخادم يفرض الإلزام على أي حال).
export async function getRegistrationSettings() {
  try {
    const res = await publicGet('/public/registration-settings');
    return { phoneRequired: res?.phoneRequired === true };
  } catch {
    return { phoneRequired: false };
  }
}

// ===== كل الصفحات (للـ sitemap) =====
// بعد التقسيم (B3.1) ترجع القوائم أول 20 فقط؛ الـ sitemap يحتاج كل العناصر.
const allOf = (path, lang) => fetchAllPages((page) => publicGet(`${path}?page=${page}&perPage=100`, lang));
export const listAllResources = (lang) => allOf('/public/resources', lang);
export const listAllPosts = (lang) => allOf('/public/posts', lang);
export const listAllStories = (lang) => allOf('/public/stories', lang);

// ===== الأخبار والتواصل والنشرة (B7.2) =====
// الأخبار = منشورات تصنيف news، بنفس شكل /public/posts، مقسّمة والأحدث أولًا → { items, meta }.
export async function listNews(page = 1, lang) {
  return unwrapList(await publicGet(`/public/news?page=${page}`, lang));
}

// POST عام بلا توكن. website = حقل الفخ للروبوتات، يُرسل فارغًا دائمًا من الواجهة.
const publicPost = (path, body, lang) => request('POST', path, { json: body, auth: false, lang });

// { name, email, subject, message } → 201 { success, message }. 422 لكل حقل، و429 بعد 3 طلبات/10 دقائق.
export function sendContactMessage({ name, email, subject, message, website = '' }, lang) {
  return publicPost('/public/contact', { name, email, subject, message, website }, lang);
}

// → { success, message } — نفس الرد دائمًا (لا يكشف إن كان البريد مشتركًا).
export function subscribeNewsletter(email, { website = '' } = {}, lang) {
  return publicPost('/public/newsletter', { email, website }, lang);
}

// ===== المشاهدات =====
// POST من متصفح الزائر مرة بعد عرض الصفحة → { viewCount }. الخادم لا يحسب الزواحف والمتصفحات الآلية،
// وحدّها 30/دقيقة لكل IP (429). الأخبار منشورات: تُسجَّل بـ recordPostView.
// context (اختياري، للتحليلات): { audience, referrer } من utils/analytics.
export function recordResourceView(id, lang, context = {}) {
  return publicPost(`/public/resources/${encodeURIComponent(id)}/view`, { ...context, lang }, lang);
}

export function recordPostView(id, lang, context = {}) {
  return publicPost(`/public/posts/${encodeURIComponent(id)}/view`, { ...context, lang }, lang);
}

// مشاهدة للتحليلات → 204. { type: 'page', path } لكل صفحة عامة، أو { type: 'story', id } لقصة.
export function trackView({ type, path, id, audience, referrer }, lang) {
  return publicPost('/public/track', { type, path, id, audience, referrer, lang }, lang);
}

// ===== الاستطلاعات العامة للزوار (B7.3) =====
// → { items: [{ id, title, description, question, options, endsAt, hasVoted, results: { total, counts } | null }], meta }
// النشطة غير المنتهية فقط. results = null إن أخفى المدير النتائج.
export async function listPublicPolls(page = 1, lang) {
  return unwrapList(await publicGet(`/public/polls?page=${page}`, lang));
}

// → 201 بنفس شكل العنصر بعد التصويت. 409 AlreadyVoted، مغلق 400، خيار غير موجود 422، 10/دقيقة 429.
export function votePublicPoll(id, optionIndex, lang) {
  return publicPost(`/public/polls/${encodeURIComponent(id)}/vote`, { optionIndex }, lang);
}

// استطلاع بأسئلة متعددة/أنواع مختلفة: answers = [{ questionId, value }] بقيم {choice}|{choices}|{scale}|{text}.
// نفس الردود والأخطاء (409/400/422/429). النتائج لكل سؤال في questions[].results.
export function votePublicPollAnswers(id, answers, lang) {
  return publicPost(`/public/polls/${encodeURIComponent(id)}/vote`, { answers }, lang);
}

// ===== الأسئلة الشائعة (المرحلة 1 من خطة المساعد) =====
// GET /public/faq → { data: [{ id, question, answer, category, isDemo, contentLang, isFallback, sortOrder }] }
// المنشورة كلها بلا تقسيم، مرتبة بالتصنيف ثم sortOrder. الجواب نص عادي بفقرات. → المصفوفة.
export async function listFaq(lang) {
  const res = await publicGet('/public/faq', lang);
  return Array.isArray(res?.data) ? res.data : [];
}

// ===== إعدادات الواجهة (إعادة التصميم، المرحلة أ) =====
// GET → { design: 'classic'|'azraq', hero: { mode: 'slider'|'bento', newsCount, interval } }
// عامة بلا توكن: تحدّد سمة الواجهة لكل الزوار.
export const getAppearance = () => publicGet('/public/appearance');

// ===== خبر واحد =====
// GET /public/news/{id|slug} → نفس شكل المقال (مع content)؛ المسودة أو غير الموجود ← 404.
export function getNews(id, lang, preview) {
  return publicGet(withPreview(`/public/news/${encodeURIComponent(id)}`, preview), lang);
}

// ===== الرئيسية الجديدة: قوائمها معًا =====
// على الخادم (loader الرئيسية) وفي المتصفح عند تبديل اللغة. كل قائمة مستقلة: فشلها يُرجع فارغًا لها وحدها.
// → { lang, news, resources, posts, stories, poll, failed } — الردود الخام كما يرجعها الـ API.
export async function loadHomeLists(lang) {
  const settled = await Promise.allSettled([
    listNews(1, lang).then((res) => res.items ?? []),
    listResources({}, lang),
    listPosts({}, lang),
    listStories(lang),
    listPublicPolls(1, lang).then((res) => res.items?.[0] ?? null),
  ]);
  const value = (i, fallback) => (settled[i].status === 'fulfilled' ? settled[i].value ?? fallback : fallback);
  return {
    lang,
    news: value(0, []),
    resources: value(1, []),
    posts: value(2, []),
    stories: value(3, []),
    poll: value(4, null),
    failed: settled.slice(0, 4).some((r) => r.status === 'rejected'),
  };
}

