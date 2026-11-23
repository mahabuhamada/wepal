// مراحل نشر مخرَج الفريق في المكتبة (القسم 4.5): «الفريق طلب النشر ← موافقات الفريق (3 من 5) ← مراجعة الإدارة ← منشور».
// consent من الخادم: { approved, total, complete } (TeamConsentResource)، أو null لخادم أقدم.

const LABELS = {
  ar: { requested: 'الفريق طلب النشر', consents: 'موافقات الفريق', review: 'مراجعة الإدارة', published: 'منشور' },
  en: { requested: 'Team asked to publish', consents: 'Team approvals', review: 'Admin review', published: 'Published' },
};

/** @returns {{ key: string, label: string, state: 'done'|'current'|'todo', detail?: string }[]} */
export function publishStages(consent, { published = false, lang = 'ar' } = {}) {
  const l = LABELS[lang === 'en' ? 'en' : 'ar'];
  const complete = !consent || consent.complete;
  const detail = consent ? `${consent.approved} ${lang === 'en' ? 'of' : 'من'} ${consent.total}` : undefined;
  return [
    { key: 'requested', label: l.requested, state: 'done' },
    { key: 'consents', label: l.consents, state: complete ? 'done' : 'current', detail },
    { key: 'review', label: l.review, state: published ? 'done' : complete ? 'current' : 'todo' },
    { key: 'published', label: l.published, state: published ? 'done' : 'todo' },
  ];
}
