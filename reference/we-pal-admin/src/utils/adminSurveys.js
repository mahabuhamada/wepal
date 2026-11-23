// صفحة الاستطلاعات في اللوحة (ملاحظة هلا، 16 نوفمبر): التبويبات والمكان والتاريخ وروابط المكان.
import { placeHref } from './adminLinks';

/** تبويبات الحالة؛ REVIEW = استطلاعات الزوار التي لم تُنشر بعد. */
export const SURVEY_TABS = ['all', 'REVIEW', 'DRAFT', 'ACTIVE', 'CLOSED'];

/** أين نُشر الاستطلاع، كما يشتقّه الخادم من أعمدته. */
export const SURVEY_PLACEMENTS = ['workspace', 'group', 'public', 'members'];

/** المرشّحان من الرابط (?status=&placement=)، وأي قيمة غير معروفة تعني «الكل». */
export const readSurveyFilters = (params) => {
  const status = params?.get?.('status');
  const placement = params?.get?.('placement');
  return {
    status: SURVEY_TABS.includes(status) ? status : 'all',
    placement: SURVEY_PLACEMENTS.includes(placement) ? placement : 'all',
  };
};

/**
 * أماكن الاستطلاع القابلة للفتح: المساحة ثم المجموعة (استطلاع المساحة موجّه إلى مجموعة مسارها).
 * → [{ kind: 'workspace'|'group', id, name, href }]
 */
export const surveyPlaces = (placement) => {
  const places = [];
  if (placement?.project?.id) {
    places.push({ kind: 'workspace', id: placement.project.id, name: placement.project.title || '', href: placeHref({ kind: 'workspace', id: placement.project.id }) });
  }
  if (placement?.group?.id) {
    places.push({ kind: 'group', id: placement.group.id, name: placement.group.name || '', href: placeHref({ kind: 'group', id: placement.group.id }) });
  }
  return places;
};

/** تاريخ اللوحة: DD/MM/YYYY بأرقام لاتينية (كباقي قوائم اللوحة)، أو null. */
export const adminDate = (iso, lang = 'ar') => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
