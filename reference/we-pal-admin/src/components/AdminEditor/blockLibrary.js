// مكتبة الكتل في «إدراج» و«/» (rich-text/block-library.ts في المنتدى، وما تضيفه وي بال): مجموعات «نص» و«وسائط» و«تصميم».
// ما يحتاج صورة يفتح الرفع أولًا، وما يحتاج رابطًا يفتح نافذة الرابط، وما يحتاج قيمًا يفتح «الكتلة» بعد إدراجه.

export const BLOCK_GROUPS = { text: 'نص', media: 'وسائط', design: 'تصميم' };

const p = (text = '') => ({ type: 'paragraph', ...(text ? { content: [{ type: 'text', text }] } : {}) });

/**
 * kind: insert (يُدرج كما هو)، settings (يُدرج ثم تُفتح «الكتلة»)، image (رفع صورة أولًا)، embed (نافذة الرابط).
 * forStory: للقصص فقط.
 */
export const BLOCKS = [
  { id: 'paragraph', group: 'text', label: 'فقرة', desc: 'نص عادي', keywords: ['فقرة', 'نص', 'paragraph'], kind: 'command', command: (c) => c.setParagraph() },
  { id: 'h2', group: 'text', label: 'عنوان رئيسي', desc: 'يقسم المادة إلى أقسام واضحة', keywords: ['عنوان', 'h2', 'heading'], kind: 'command', command: (c) => c.setHeading({ level: 2 }) },
  { id: 'h3', group: 'text', label: 'عنوان فرعي', desc: 'عنوان أصغر داخل القسم', keywords: ['عنوان', 'فرعي', 'h3'], kind: 'command', command: (c) => c.setHeading({ level: 3 }) },
  { id: 'bullet', group: 'text', label: 'قائمة نقطية', desc: 'بنود بلا ترتيب', keywords: ['قائمة', 'نقاط', 'list'], kind: 'command', command: (c) => c.toggleBulletList() },
  { id: 'ordered', group: 'text', label: 'قائمة مرقّمة', desc: 'خطوات أو بنود بترتيب', keywords: ['قائمة', 'مرقمة', 'ordered'], kind: 'command', command: (c) => c.toggleOrderedList() },
  { id: 'quote', group: 'text', label: 'اقتباس', desc: 'قول أو مقطع من مصدر', keywords: ['اقتباس', 'quote'], kind: 'command', command: (c) => c.toggleBlockquote() },
  { id: 'table', group: 'text', label: 'جدول', desc: 'صفوف وأعمدة، الصف الأول عناوين', keywords: ['جدول', 'table'], kind: 'command', command: (c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }) },
  { id: 'separator', group: 'text', label: 'فاصل', desc: 'خط هادئ بين قسمين', keywords: ['فاصل', 'خط', 'hr'], kind: 'insert', content: { type: 'horizontalRule' } },
  { id: 'dots', group: 'text', label: 'فاصل نقاط', desc: '• • •', keywords: ['فاصل', 'نقاط', 'dots'], kind: 'insert', content: { type: 'horizontalRule', attrs: { variant: 'dots' } } },

  { id: 'figure', group: 'media', label: 'صورة', desc: 'صورة من المكتبة بنص بديل وتعليق', keywords: ['صورة', 'image'], kind: 'image', make: (img) => ({ type: 'figure', attrs: { ...img, size: 'text' } }) },
  { id: 'video', group: 'media', label: 'فيديو', desc: 'يوتيوب أو فيميو أو فيسبوك، يُحمَّل حين يضغط الزائر', keywords: ['فيديو', 'يوتيوب', 'video', 'youtube', 'vimeo'], kind: 'embed', hint: 'video' },
  { id: 'audio', group: 'media', label: 'صوت أو بودكاست', desc: 'ساوندكلاود وسبوتيفاي وبودكاست آبل وRSS', keywords: ['صوت', 'بودكاست', 'podcast', 'audio', 'spotify'], kind: 'embed', hint: 'audio' },
  { id: 'gallery', group: 'media', label: 'معرض صور', desc: 'من صورتين إلى ست صور في شبكة', keywords: ['معرض', 'صور', 'gallery'], kind: 'image', make: (img) => ({ type: 'gallery', attrs: { columns: 3, images: [img] } }), settings: true },
  // ملف أو رابط أو مصدر: رفع مباشر، أو رابط خارجي، أو من المكتبة (لا المكتبة وحدها)
  { id: 'file', group: 'media', label: 'ملف أو رابط', desc: 'ارفع ملفًا (PDF وغيره)، أو أضف رابطًا خارجيًا، أو اختر من المكتبة', keywords: ['ملف', 'تحميل', 'pdf', 'file', 'رابط', 'مرفق', 'مصدر'], kind: 'attach', tab: 'upload' },
  { id: 'xPost', group: 'media', label: 'منشور على X', desc: 'يُحمَّل حين يضغط الزائر', keywords: ['تويتر', 'x', 'منشور', 'tweet'], kind: 'embed', hint: 'post' },
  { id: 'linkCard', group: 'media', label: 'بطاقة رابط', desc: 'العنوان والموقع والصورة', keywords: ['رابط', 'بطاقة', 'link'], kind: 'embed', hint: 'link' },

  { id: 'mediaText', group: 'design', label: 'صورة ونص', desc: 'صورة بجانب فقرة', keywords: ['صورة', 'نص', 'media'], kind: 'image', make: (img) => ({ type: 'mediaText', attrs: { ...img, side: 'start' }, content: [p()] }) },
  { id: 'callout', group: 'design', label: 'صندوق ملاحظة', desc: 'معلومة أو تنبيه أو إبراز', keywords: ['ملاحظة', 'تنبيه', 'callout'], kind: 'settings', content: { type: 'callout', attrs: { tone: 'info' }, content: [p()] } },
  { id: 'buttons', group: 'design', label: 'زر', desc: 'رابط بارز يدعو إلى فعل، حتى ثلاثة أزرار', keywords: ['زر', 'رابط', 'button'], kind: 'settings', content: { type: 'buttons', attrs: { align: 'start', items: [{ label: '', href: '', style: 'primary', newTab: false }] } } },
  { id: 'stats', group: 'design', label: 'أرقام', desc: 'من رقمين إلى أربعة، مع وصف كل رقم', keywords: ['أرقام', 'إحصاء', 'stats'], kind: 'settings', content: { type: 'stats', attrs: { items: [{ value: '', label: '' }, { value: '', label: '' }] } } },
  { id: 'quoteCard', group: 'design', label: 'بطاقة اقتباس', desc: 'شهادة باسم صاحبها وصفته', keywords: ['اقتباس', 'شهادة', 'quote'], kind: 'settings', content: { type: 'quoteCard', attrs: { variant: 'light' }, content: [p()] } },
  { id: 'storyQuote', group: 'design', label: 'كلام صاحب القصة', desc: 'اقتباس باسم صاحب القصة وصفته من «التفاصيل»', keywords: ['قصة', 'اقتباس', 'story'], kind: 'insert', forStory: true, content: { type: 'storyQuote', attrs: { variant: 'light' }, content: [p()] } },
  { id: 'faq', group: 'design', label: 'أسئلة شائعة', desc: 'أسئلة تُفتح أجوبتها عند الضغط', keywords: ['أسئلة', 'faq'], kind: 'settings', content: { type: 'faq', content: [{ type: 'faqItem', attrs: { question: '' }, content: [p()] }] } },
  { id: 'map', group: 'design', label: 'خريطة', desc: 'صورة المكان مع رابط خرائط Google، بلا خريطة خارجية في الصفحة', keywords: ['خريطة', 'مكان', 'map'], kind: 'image', make: (img) => ({ type: 'map', attrs: { ...img, place: '', href: 'https://maps.google.com/' } }), settings: true },
  { id: 'resource', group: 'design', label: 'مصدر من المكتبة', desc: 'بطاقة إلى مادة في المكتبة، أو ملف أو رابط من خارجها', keywords: ['مكتبة', 'مصدر', 'resource'], kind: 'attach', tab: 'library' },
];

/** الكتل المتاحة لنوع المادة، مصفّاة بالبحث، بترتيب المجموعات. */
export function filterBlocks(query, { isStory = false } = {}) {
  const q = query.trim().toLowerCase();
  return BLOCKS.filter((b) => (isStory || !b.forStory) && (!q || b.label.includes(q) || b.desc.includes(q) || b.keywords.some((k) => k.toLowerCase().includes(q))));
}

export function groupBlocks(blocks) {
  return Object.entries(BLOCK_GROUPS)
    .map(([key, label]) => ({ key, label, blocks: blocks.filter((b) => b.group === key) }))
    .filter((g) => g.blocks.length);
}
