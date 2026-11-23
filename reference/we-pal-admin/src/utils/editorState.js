// حالة المحرّر الجديد بلا واجهة: تنظيف مستند Tiptap إلى مخطط الخادم، والزرّ الأساسي بحسب الحالة،
// ومؤشر الحفظ، والمقارنة في التعارض والنسخ السابقة. القواعد نفسها في backend/app/Services/Blocks/BlockSchema.php.
import { faqQuestionFromQuery } from './assistantHub';

export const SCHEMA_VERSION = 1;

const TEXT_BLOCK = ['dir', 'anchor'];
const IMAGE = ['src', 'alt', 'width', 'height'];
const SPAN = ['colspan', 'rowspan', 'colwidth', ...TEXT_BLOCK];

/** الخصائص المسموحة لكل نوع، كما في BlockSchema::nodes(). */
export const NODE_ATTRS = {
  paragraph: TEXT_BLOCK,
  heading: ['level', ...TEXT_BLOCK],
  bulletList: TEXT_BLOCK,
  orderedList: ['start', 'type', ...TEXT_BLOCK],
  listItem: TEXT_BLOCK,
  blockquote: TEXT_BLOCK,
  table: TEXT_BLOCK,
  tableRow: [],
  tableHeader: SPAN,
  tableCell: SPAN,
  horizontalRule: ['variant'],
  figure: [...IMAGE, 'href', 'target', 'size', 'anchor'],
  video: ['provider', 'id', 'title', 'thumb', 'anchor'],
  audio: ['provider', 'url', 'title', 'episode', 'audioSrc', 'duration', 'thumb', 'anchor'],
  gallery: ['columns', 'images', 'anchor'],
  file: ['href', 'label', ...TEXT_BLOCK],
  xPost: ['url', 'text', 'author', 'anchor'],
  linkCard: ['href', 'title', 'site', 'image', 'anchor'],
  mediaText: [...IMAGE, 'side', 'anchor'],
  callout: ['tone', 'title', 'anchor'],
  buttons: ['align', 'items', 'anchor'],
  stats: ['items', 'anchor'],
  quoteCard: ['name', 'role', 'variant', 'anchor'],
  storyQuote: ['variant', 'anchor'],
  faq: ['anchor'],
  faqItem: ['question'],
  map: [...IMAGE, 'place', 'href', 'anchor'],
  resource: ['id', 'anchor'],
};

const isEmpty = (v) => v === null || v === undefined || v === '';

function cleanAttrs(type, attrs) {
  if (!attrs) return undefined;
  const allowed = NODE_ATTRS[type] ?? [];
  const out = {};
  for (const name of allowed) {
    if (!isEmpty(attrs[name])) out[name] = attrs[name];
  }
  // القيم الافتراضية التي يكتبها المحرّر ولا تُعرض
  if (type === 'orderedList') {
    if (out.start === 1) delete out.start;
    if (out.type !== '1') delete out.type;
  }
  if (type === 'tableHeader' || type === 'tableCell') {
    if (out.colspan === 1) delete out.colspan;
    if (out.rowspan === 1) delete out.rowspan;
    if (out.colwidth === null) delete out.colwidth;
  }
  return Object.keys(out).length ? out : undefined;
}

function cleanMarks(marks) {
  if (!Array.isArray(marks)) return undefined;
  const out = [];
  for (const mark of marks) {
    if (mark.type === 'bold' || mark.type === 'italic') out.push({ type: mark.type });
    else if (mark.type === 'link' && mark.attrs?.href) {
      out.push({ type: 'link', attrs: { href: mark.attrs.href, ...(mark.attrs.target === '_blank' ? { target: '_blank' } : {}) } });
    }
  }
  return out.length ? out : undefined;
}

function cleanNode(node) {
  if (node.type === 'text') {
    if (!node.text) return null;
    const marks = cleanMarks(node.marks);
    return { type: 'text', text: node.text, ...(marks ? { marks } : {}) };
  }
  if (node.type === 'hardBreak') return { type: 'hardBreak' };
  const out = { type: node.type };
  const attrs = cleanAttrs(node.type, node.attrs);
  if (attrs) out.attrs = attrs;
  if (Array.isArray(node.content)) {
    const content = node.content.map(cleanNode).filter(Boolean);
    out.content = content;
  } else if (['paragraph', 'heading', 'figure', 'video', 'audio', 'gallery'].includes(node.type)) {
    out.content = [];
  }
  return out;
}

/**
 * مستند Tiptap (getJSON) بالشكل الذي يقبله الخادم: خصائص المخطط فقط، بلا القيم الفارغة، وبرقم الإصدار.
 * والسطر الفارغ الأخير (الذي يضيفه المحرّر للكتابة بعد كتلة) لا يُحفظ.
 */
export function toServerDoc(json) {
  const content = (json?.content ?? []).map(cleanNode).filter(Boolean);
  while (content.length && content.at(-1).type === 'paragraph' && (content.at(-1).content ?? []).length === 0) content.pop();
  return { type: 'doc', version: SCHEMA_VERSION, content };
}

/** مستند الخادم كما يحمّله Tiptap (سطر فارغ واحد على الأقل). */
export function fromServerDoc(doc) {
  const content = Array.isArray(doc?.content) && doc.content.length ? doc.content : [{ type: 'paragraph' }];
  return { type: 'doc', content };
}

/** النص العادي من مستند الكتل (للمقارنة وعدّ الكلمات). */
export function docText(doc) {
  const walk = (node) => {
    if (!node) return '';
    if (node.type === 'text') return node.text ?? '';
    if (node.type === 'hardBreak') return '\n';
    const inner = (node.content ?? []).map(walk).join(node.type === 'doc' || node.type === 'bulletList' || node.type === 'orderedList' ? '\n' : '');
    const label = [node.attrs?.title, node.attrs?.question, node.attrs?.label, node.attrs?.place].filter(Boolean).join(' ');
    return [label, inner].filter(Boolean).join('\n');
  };
  return walk({ type: 'doc', content: doc?.content ?? [] }).replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * «الأصل» الذي تُترجم منه هذه المادة: أختها باللغة الأخرى حين يعلّمها الخادم original (الأولى في مجموعة الترجمة).
 * المادة الأصلية نفسها لا أصل لها، فيعيد null. يعمل في الاتجاهين: أصل عربي لترجمة إنجليزية والعكس.
 */
export function originalSibling(item) {
  return item?.translations?.find((t) => t.original && t.locale && t.locale !== item.locale) ?? null;
}

export const wordCount = (text) => (text.trim() ? text.trim().split(/\s+/u).length : 0);

/**
 * الزرّ الأساسي والأزرار الثانوية بحسب الحالة (القسم 4.4، شريط الإجراءات). لا زرّ «نشر» يجدول في الخفاء.
 * سير «إرسال للمراجعة» ينتظر القرار 15، فليس هنا.
 */
export function editorActions({ status, hasWorkingCopy, dirty, schedulable = false }) {
  if (status === 'draft') {
    return { primary: { key: 'publish', label: 'نشر' }, secondary: [{ key: 'save', label: 'حفظ المسودّة' }, ...(schedulable ? [{ key: 'schedule', label: 'جدولة…' }] : [])] };
  }
  if (status === 'scheduled') {
    return { primary: { key: 'publishNow', label: 'نشر الآن' }, secondary: [{ key: 'save', label: 'حفظ دون نشر' }, { key: 'schedule', label: 'تغيير الموعد' }] };
  }
  return {
    primary: { key: 'publish', label: 'تحديث المنشور', disabled: !hasWorkingCopy && !dirty },
    secondary: [{ key: 'save', label: 'حفظ دون نشر' }],
  };
}

/** مؤشر الحفظ بحالاته الخمس. */
export function saveIndicator({ dirty, saving, failures, online = true }) {
  if (!online && dirty) return { state: 'offline', label: 'لا اتصال: التعديلات محفوظة في هذا المتصفح' };
  if (saving) return { state: 'saving', label: 'يُحفظ…' };
  if (failures > 0) return { state: 'failed', label: `فشل الحفظ، نعيد المحاولة (${failures})` };
  if (dirty) return { state: 'dirty', label: 'تعديلات غير محفوظة' };
  return { state: 'saved', label: 'حُفظ الآن' };
}

const FIELD_LABELS = {
  title: 'العنوان', excerpt: 'الملخّص', body: 'المتن', category: 'التصنيف', authorLabel: 'الكاتب',
  name: 'اسم صاحب القصة', roleLabel: 'صفته أو مدينته', region: 'المنطقة', quote: 'الاقتباس', projectTitle: 'المشروع', featured: 'مميّزة في الرئيسية',
};

function fieldText(key, value, locale) {
  if (key === 'body') return docText(value?.[locale]);
  if (value && typeof value === 'object') return String(value[locale] ?? '');
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
  return String(value ?? '');
}

/** ما يختلف بين نسختين (التعارض والنسخ السابقة)، حقلًا حقلًا بلغة المادة. */
export function diffFields(mine, theirs, locale = 'ar') {
  return Object.keys({ ...mine, ...theirs })
    .map((key) => ({ key, label: FIELD_LABELS[key] ?? key, mine: fieldText(key, mine?.[key], locale), theirs: fieldText(key, theirs?.[key], locale) }))
    .filter((row) => row.mine !== row.theirs);
}

/** رابط المادة في البوابة (اللغة يبدّلها زرّ اللغة، لا الرابط). */
export function portalPath(type, item) {
  if (!item?.slug) return null;
  if (type === 'story') return `/stories/${item.slug}`;
  if (type === 'resource') return `/library/${item.slug}`;
  if (type === 'faq') return '/help';
  return `/${item.fields?.category === 'news' ? 'news' : 'blog'}/${item.slug}`;
}

/**
 * بداية المسودّة من رابط «جديد»: ?category= (خبر جديد من قائمة الأخبار) و?q= (سؤال شائع من
 * «أسئلة لم تجد نتيجة»، بلغة نصّه). يُرسل إلى POST /admin/editor/{type}، وغيره يُكتب في المحرّر.
 */
export function editorStart(type, params) {
  const start = {};
  // ?locale=ar|en من «بأي لغة المادة؟» قبل الإنشاء (both تُنشئ العربية ثم نسختها: newItemLocale)
  const locale = params.get('locale');
  if (locale === 'ar' || locale === 'en') start.locale = locale;
  const category = params.get('category');
  if (category) start.fields = { category };
  const question = type === 'faq' ? faqQuestionFromQuery(params.get('q')) : null;
  if (question) {
    start.locale = question.ar ? 'ar' : 'en';
    start.fields = { ...start.fields, title: { [start.locale]: question[start.locale] } };
    // من «أسئلة البحث» (addFaqPath): السؤال المسجَّل كما هو ليربطه الخادم بالسؤال الشائع الجديد
    if (params.get('from') === 'search') start.searchQuery = params.get('q');
  }
  return start;
}

/**
 * لغة المادة الجديدة قبل إنشائها: ar أو en أو both (النسختان مرتبطتين)، أو null فيُسأل المحرّر أولًا.
 * سؤال «أسئلة البحث» (?q=) يعرف لغته من نصّه فلا يُسأل.
 */
export function newItemLocale(type, params) {
  const locale = params.get('locale');
  if (['ar', 'en', 'both'].includes(locale)) return locale;
  if (type === 'faq' && faqQuestionFromQuery(params.get('q'))) return 'auto';
  if (type === 'survey') return 'ar'; // وصف الاستطلاع يُنشأ من صفحته، والمحرّر لا يترجمه
  return null;
}

/** سبب تعطّل زرّ رفع الصورة (لا صورة، أو نصّ بديل أقصر من 3 أحرف)، يُكتب تحته؛ null حين يصحّ الرفع. */
export function uploadBlocker(file, alt) {
  if (!file) return 'اختر صورة أولًا.';
  if ((alt ?? '').trim().length < 3) return 'اكتب النص البديل (3 أحرف على الأقل).';
  return null;
}
