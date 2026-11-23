// المحرّر الجديد (المرحلة 3 من لوحة الإدارة): /admin/editor/{type}/{id}، و{type} = post (الأخبار والتحليلات) أو story.
// كل حفظ يحمل رقم الإصدار (version)؛ وإن حفظ غيرك بعد فتح الصفحة يرد الخادم 409 EditConflict ومعه نسخته.
// والنشر غير الجاهز 422 NotReady ومعه بنود الجاهزية. الأخطاء ApiError كباقي العميل.
import { del, get, patch, post, put, uploadForm } from './client';
import { imageFormFields } from '../utils/images';

const base = (type, id) => `/admin/editor/${encodeURIComponent(type)}${id ? `/${encodeURIComponent(id)}` : ''}`;

export const getEditorItem = (type, id) => get(base(type, id));
/** start: { locale?, fields?: { title?, category? }, searchQuery? } بداية المسودّة (editorStart)؛ searchQuery يربط السؤال الشائع بسؤال البحث. */
export const createEditorItem = (type, start = {}) => post(base(type), start);

/** حفظ يدوي (نسخة في «النسخ السابقة») أو تلقائي (بلا نسخة)، و force = «احتفظ بنسختي». */
export const saveEditorItem = (type, id, { version, fields, autosave = false, force = false }) =>
  put(base(type, id), { version, fields, autosave, force });

/** publishAt: موعد «جدولة» (ISO)، أو الآن لـ«نشر الآن» على المجدول؛ وبلا موعد نشرٌ عادي. */
export const publishEditorItem = (type, id, version, publishAt) => post(`${base(type, id)}/publish`, { version, ...(publishAt ? { publishAt } : {}) });
export const unpublishEditorItem = (type, id, version) => post(`${base(type, id)}/unpublish`, { version });
export const discardWorkingCopy = (type, id, version) => del(`${base(type, id)}/working-copy`, { version });
export const createTranslation = (type, id, version) => post(`${base(type, id)}/translation`, { version });
// «معاينة»: رابط صفحة المادة العامة وهي مسودّة، بتوكن صالح 24 ساعة → { url, expiresAt }. 422 NoPublicPage للأسئلة الشائعة والاستطلاع.
export const createPreviewLink = (type, id) => post(`${base(type, id)}/preview-link`);

export const listRevisions = (type, id) => get(`${base(type, id)}/revisions`);
export const getRevision = (type, id, number) => get(`${base(type, id)}/revisions/${Number(number)}`);
export const restoreRevision = (type, id, number, version) => post(`${base(type, id)}/revisions/${Number(number)}/restore`, { version });

/** موافقة صاحب القصة: { givenBy, method: signed_paper|written_message|verbal_witnessed, givenOn, coversName, coversPhoto, note } */
export const recordStoryConsent = (id, consent) => post(`/admin/editor/story/${encodeURIComponent(id)}/consent`, consent);
export const withdrawStoryConsent = (id) => post(`/admin/editor/story/${encodeURIComponent(id)}/consent/withdraw`);

/** صورة لكتلة في المتن إلى مكتبتنا (النص البديل مطلوب): { path, url, width, height }. */
/** ملف يُرفق في المتن مباشرة (كتلة «ملف للتحميل»): { href: /api/public/files/{uuid}, name, format, size } */
export const uploadEditorFile = (file) => uploadForm('/admin/editor/files', { file, fileField: 'file' });
export const uploadEditorImage = (file, alt) => uploadForm('/admin/editor/images', { fields: imageFormFields({ alt }), file, fileField: 'image' });

/** مكتبة الوسائط: أحدث الصور أولًا مع البحث في نصّها البديل. { data: [{ id, path, url, width, height, alt: {ar, en} }], meta } */
export const listEditorImages = ({ search = '', page = 1 } = {}) => {
  const q = new URLSearchParams({ ...(search ? { search } : {}), ...(page > 1 ? { page: String(page) } : {}) }).toString();
  return get(`/admin/editor/images${q ? `?${q}` : ''}`);
};
/** النص البديل لصورة في المكتبة بلغة واحدة (الأخرى تبقى). */
export const updateEditorImageAlt = (id, alt) => patch(`/admin/editor/images/${encodeURIComponent(id)}`, { alt });

/** من رابط ملصق إلى كتلة تضمين: { type, attrs }، أو ApiError 422 EmbedRefused برسالة السبب. */
export const resolveEmbed = (url, hint) => post('/admin/editor/embeds/resolve', { url, ...(hint ? { hint } : {}) });

/** هل الخطأ تعارض حفظ (409 EditConflict)؟ وفي error.body.conflict: { currentVersion, updatedBy, updatedAt, theirs }. */
export const isEditConflict = (error) => error?.status === 409 && error?.code === 'EditConflict';
/** هل الخطأ نشر غير جاهز (422 NotReady)؟ وفي error.body.readiness بنود الجاهزية. */
export const isNotReady = (error) => error?.status === 422 && error?.code === 'NotReady';
