// حالة نشر محتوى الإدارة (العقد §5): المسودة publishedAt: null (منشورات وموارد)
// أو published: false (قصص).
export const CONTENT_STATUSES = ['all', 'draft', 'published'];

export const isDraft = (item) => {
  if (!item) return false;
  if (typeof item.published === 'boolean') return !item.published;
  return 'publishedAt' in item && !item.publishedAt;
};

// نص الحقل بلغة الواجهة من translations الخام (ردود الإدارة)، وإلا النص المحلول من الخادم.
export const localizedField = (item, field, lang) => {
  const tr = item?.translations?.[field];
  if (tr && typeof tr === 'object') return tr[lang] || tr.ar || tr.en || item?.[field] || '';
  return item?.[field] ?? '';
};
