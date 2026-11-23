// كتل وي بال في Tiptap، بأسماء المخطط في الخادم وخصائصه (backend/app/Services/Blocks/BlockSchema.php)،
// منقولة من محرّر المنتدى (rich-text/block-nodes.ts). كل كتلة تُعرض كما ستظهر في الصفحة (BlockViews.jsx).
import { Node, ReactNodeViewRenderer, mergeAttributes } from '@tiptap/react';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import { BlockView } from './BlockViews';

const FLOW = '(paragraph | bulletList | orderedList)+';

/** خصائص تبقى في المستند ولا تُكتب في HTML المحرّر (العرض في BlockViews). */
function hidden(names, defaults = {}) {
  return Object.fromEntries(names.map((name) => [name, { default: defaults[name] ?? null, rendered: false }]));
}

function readAttrs(element) {
  try {
    const attrs = JSON.parse(element.getAttribute('data-attrs') ?? '{}');
    return attrs && typeof attrs === 'object' && !Array.isArray(attrs) ? attrs : false;
  } catch {
    return false;
  }
}

/** كتلة بعرضها الخاص. الذرّية (بلا محتوى) تحمل إعداداتها خصائص، والأخرى نصّها داخلها (تعليق أو فقرات). */
function designBlock({ name, attrs, defaults, content, group = 'block' }) {
  return Node.create({
    name,
    group,
    ...(content ? { content } : { atom: true }),
    draggable: true,
    selectable: true,
    isolating: true,
    defining: true,
    addAttributes() {
      return hidden(attrs, defaults);
    },
    parseHTML() {
      return [{ tag: `div[data-block="${name}"]`, getAttrs: readAttrs, ...(content ? { contentElement: '[data-content]' } : {}) }];
    },
    renderHTML({ node, HTMLAttributes }) {
      const el = ['div', mergeAttributes(HTMLAttributes, { 'data-block': name, 'data-attrs': JSON.stringify(node.attrs) })];
      return content ? [...el, ['div', { 'data-content': '' }, 0]] : el;
    },
    addNodeView() {
      return ReactNodeViewRenderer(BlockView);
    },
  });
}

const IMAGE = ['src', 'alt', 'width', 'height'];

export const BLOCK_NODES = [
  designBlock({ name: 'figure', attrs: [...IMAGE, 'href', 'target', 'size', 'anchor'], defaults: { size: 'text' }, content: 'inline*' }),
  designBlock({ name: 'video', attrs: ['provider', 'id', 'title', 'thumb', 'anchor'], content: 'inline*' }),
  designBlock({ name: 'audio', attrs: ['provider', 'url', 'title', 'episode', 'audioSrc', 'duration', 'thumb', 'anchor'], content: 'inline*' }),
  designBlock({ name: 'gallery', attrs: ['columns', 'images', 'anchor'], defaults: { columns: 3, images: [] }, content: 'inline*' }),
  designBlock({ name: 'file', attrs: ['href', 'label', 'dir', 'anchor'], defaults: { label: '' } }),
  designBlock({ name: 'xPost', attrs: ['url', 'text', 'author', 'anchor'] }),
  designBlock({ name: 'linkCard', attrs: ['href', 'title', 'site', 'image', 'anchor'] }),
  designBlock({ name: 'mediaText', attrs: [...IMAGE, 'side', 'anchor'], defaults: { side: 'start' }, content: '(paragraph | bulletList | orderedList | heading)+' }),
  designBlock({ name: 'callout', attrs: ['tone', 'title', 'anchor'], defaults: { tone: 'info', title: '' }, content: FLOW }),
  designBlock({ name: 'buttons', attrs: ['align', 'items', 'anchor'], defaults: { align: 'start', items: [{ label: '', href: '', style: 'primary', newTab: false }] } }),
  designBlock({ name: 'stats', attrs: ['items', 'anchor'], defaults: { items: [{ value: '', label: '' }, { value: '', label: '' }] } }),
  designBlock({ name: 'quoteCard', attrs: ['name', 'role', 'variant', 'anchor'], defaults: { variant: 'light' }, content: 'paragraph+' }),
  designBlock({ name: 'storyQuote', attrs: ['variant', 'anchor'], defaults: { variant: 'light' }, content: 'paragraph+' }),
  designBlock({ name: 'faq', attrs: ['anchor'], content: 'faqItem+' }),
  designBlock({ name: 'faqItem', attrs: ['question'], defaults: { question: '' }, content: FLOW, group: 'faqPart' }),
  designBlock({ name: 'map', attrs: [...IMAGE, 'place', 'href', 'anchor'], defaults: { place: '' } }),
  designBlock({ name: 'resource', attrs: ['id', 'anchor'] }),
];

/** الفاصل خطًّا أو نقاطًا. */
export const Separator = HorizontalRule.extend({
  addAttributes() {
    return {
      variant: {
        default: 'line',
        parseHTML: (el) => (el.classList.contains('wp-dots') ? 'dots' : 'line'),
        renderHTML: (attrs) => (attrs.variant === 'dots' ? { class: 'wp-dots' } : {}),
      },
    };
  },
});

/** أسماء الكتل التي تفتح «الكتلة» حين تُحدَّد. */
export const SETTINGS_BLOCKS = new Set(BLOCK_NODES.map((n) => n.name).concat(['horizontalRule']));
