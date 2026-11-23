// مظهر الكتل في المحرّر كما في المنتدى (rich-text/block-views.tsx): كل كتلة كما ستظهر في الصفحة، بحلقة هادئة عند
// المرور وحلقة التركيز حين تُحدَّد. وتبدأ كل كتلة فارغة بنصوص إرشاد رمادية، ولا تُنشر ناقصة (الجاهزية في الخادم).
import { useContext } from 'react';
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react';
import { StoryContext } from './editorContext';
import { API_BASE_URL } from '../../api/client';

/** رابط صورة من مكتبتنا (مسارها في الكتلة: images/posts/….webp). */
export const libraryImageUrl = (path) => (path ? `${API_BASE_URL}/public/images/${String(path).replace(/^images\//, '')}` : null);

const PROVIDERS = {
  youtube: 'يوتيوب', vimeo: 'فيميو', facebook: 'فيسبوك', soundcloud: 'ساوندكلاود', spotify: 'سبوتيفاي', apple: 'بودكاست آبل', rss: 'حلقة RSS',
};

const Hint = ({ children }) => <span className="azq-ed-hint">{children}</span>;

function Img({ attrs, className }) {
  const url = libraryImageUrl(attrs.src);
  return url ? <img className={className} src={url} alt={attrs.alt ?? ''} width={attrs.width ?? undefined} height={attrs.height ?? undefined} /> : <div className={`${className} azq-ed-img-empty`}><Hint>صورة من المكتبة</Hint></div>;
}

function Caption({ placeholder = 'تعليق (اختياري)' }) {
  return <NodeViewContent as="figcaption" className="azq-ed-caption" data-placeholder={placeholder} />;
}

function Flow({ className }) {
  return <NodeViewContent className={className} />;
}

function View({ node }) {
  const a = node.attrs;
  const storyDetails = useContext(StoryContext);
  switch (node.type.name) {
    case 'figure':
      return (
        <figure className={a.size === 'wide' ? 'azq-ed-wide' : undefined}>
          <Img attrs={a} className="azq-ed-figure-img" />
          {!a.alt && <p className="azq-ed-warn">صورة بلا نص بديل: اكتبه من «الكتلة»</p>}
          <Caption />
        </figure>
      );
    case 'video':
      return (
        <figure>
          <div className="azq-ed-video" contentEditable={false}>
            {a.thumb && <img src={libraryImageUrl(a.thumb)} alt="" />}
            <span className="azq-ed-play" aria-hidden="true">▶</span>
            <span className="azq-ed-provider">{PROVIDERS[a.provider] ?? a.provider}{a.title ? ` · ${a.title}` : ''}</span>
          </div>
          <Caption />
        </figure>
      );
    case 'audio':
      return (
        <figure>
          <div className="azq-ed-audio" contentEditable={false}>
            <span className="azq-ed-play" aria-hidden="true">▶</span>
            <span>{a.title || <Hint>حلقة صوتية</Hint>}</span>
            <span className="azq-ed-provider">{PROVIDERS[a.provider] ?? a.provider}</span>
          </div>
          <Caption />
        </figure>
      );
    case 'gallery':
      return (
        <figure>
          <div className={`azq-ed-gallery azq-ed-cols-${a.columns}`} contentEditable={false}>
            {(a.images ?? []).map((img, i) => <Img key={`${img.src}-${i}`} attrs={img} className="azq-ed-gallery-img" />)}
            {(a.images ?? []).length < 2 && <div className="azq-ed-img-empty"><Hint>أضف صورتين على الأقل من «الكتلة»</Hint></div>}
          </div>
          <Caption />
        </figure>
      );
    case 'file':
      return <div className="azq-ed-card" contentEditable={false}><span className="azq-ed-icon" aria-hidden="true">⇩</span>{a.label || <Hint>اسم الملف الظاهر</Hint>}</div>;
    case 'xPost':
      return <div className="azq-ed-card" contentEditable={false}><span className="azq-ed-icon" aria-hidden="true">𝕏</span><span>{a.text || a.url}{a.author ? ` — ${a.author}` : ''}</span></div>;
    case 'linkCard':
      return (
        <div className="azq-ed-card" contentEditable={false}>
          {a.image ? <img className="azq-ed-card-img" src={libraryImageUrl(a.image)} alt="" /> : <span className="azq-ed-icon" aria-hidden="true">↗</span>}
          <span><strong>{a.title || <Hint>عنوان الرابط</Hint>}</strong><br /><small>{a.site || a.href}</small></span>
        </div>
      );
    case 'mediaText':
      return (
        <div className={`azq-ed-media-text azq-ed-media-${a.side}`}>
          <Img attrs={a} className="azq-ed-figure-img" />
          <Flow className="azq-ed-media-text-body" />
        </div>
      );
    case 'callout':
      return (
        <aside className={`azq-ed-callout azq-ed-tone-${a.tone}`}>
          <p className="azq-ed-callout-title" contentEditable={false}>{a.title || <Hint>عنوان (اختياري)</Hint>}</p>
          <Flow />
        </aside>
      );
    case 'buttons':
      return (
        <p className={`azq-ed-buttons azq-ed-align-${a.align}`} contentEditable={false}>
          {(a.items ?? []).map((item, i) => <span key={i} className={`azq-ed-btn azq-ed-btn-${item.style}`}>{item.label || <Hint>نص الزر</Hint>}</span>)}
        </p>
      );
    case 'stats':
      return (
        <div className="azq-ed-stats" contentEditable={false}>
          {(a.items ?? []).map((item, i) => <div key={i}><strong>{item.value || '—'}</strong><span>{item.label || <Hint>وصف الرقم</Hint>}</span></div>)}
        </div>
      );
    case 'quoteCard':
    case 'storyQuote': {
      const story = node.type.name === 'storyQuote' ? storyDetails ?? {} : null;
      const name = story ? story.name : a.name;
      const role = story ? story.role : a.role;
      return (
        <figure className={`azq-ed-quote${a.variant === 'dark' ? ' azq-ed-quote-dark' : ''}`}>
          <Flow />
          <figcaption contentEditable={false}><strong>{name || <Hint>{story ? 'اسم صاحب القصة من «التفاصيل»' : 'صاحب الاقتباس'}</Hint>}</strong> {role}</figcaption>
        </figure>
      );
    }
    case 'faq':
      return <div className="azq-ed-faq"><Flow /></div>;
    case 'faqItem':
      return (
        <details open className="azq-ed-faq-item">
          <summary contentEditable={false}>{a.question || <Hint>اكتب السؤال من إعدادات الكتلة</Hint>}</summary>
          <Flow />
        </details>
      );
    case 'map':
      return (
        <figure className="azq-ed-map" contentEditable={false}>
          <Img attrs={a} className="azq-ed-figure-img" />
          <figcaption>📍 {a.place || <Hint>اسم المكان</Hint>}</figcaption>
        </figure>
      );
    case 'resource':
      return <div className="azq-ed-card" contentEditable={false}><span className="azq-ed-icon" aria-hidden="true">📚</span>{a.id ? 'مصدر من المكتبة' : <Hint>اختر المصدر من «الكتلة»</Hint>}</div>;
    default:
      return null;
  }
}

export function BlockView(props) {
  return (
    <NodeViewWrapper className={`azq-ed-block azq-ed-block-${props.node.type.name}${props.selected ? ' is-selected' : ''}`} data-drag-handle="">
      <View {...props} />
    </NodeViewWrapper>
  );
}
