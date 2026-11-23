// المحرّر الجديد (المرحلة 3 من لوحة الإدارة): /admin/editor/:type/:id، و:type = post أو story، و:id = new لمادة جديدة.
// صفحة كتابة لا نموذج حقول، على شكل محرّر المنتدى. المحرّر يعمل في المتصفح فقط (Tiptap)، فالخادم يرسم هيكلًا.
// المادة الجديدة تُسأل لغتها أولًا (العربية أو الإنجليزية أو كلتاهما)، ولا تُنشأ مسودّة قبل الاختيار.
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { createEditorItem, createTranslation, getEditorItem } from '../../api/editor';
import { editorStart, newItemLocale } from '../../utils/editorState';
import { useAuth } from '../../auth/AuthContext';
import { useHydrated } from '../../hooks/useHydrated';
import { EditorScreen } from '../../components/AdminEditor/EditorScreen';
import '../../styles/azraq-editor.css';

const TYPES = new Set(['post', 'story', 'resource', 'faq', 'survey']);
const NOUN = { post: 'مادة جديدة', story: 'قصة جديدة', resource: 'مصدر جديد في المكتبة', faq: 'سؤال شائع جديد', survey: 'استطلاع جديد' };
const BACK = { post: '/admin/analyses', story: '/admin/stories', resource: '/admin/library', faq: '/admin/faq', survey: '/admin/surveys' };

/** «باللغتين»: العربية أولًا ثم نسختها الإنجليزية مرتبطة بها، ويفتح المحرّر على العربية. */
async function createItem(type, params) {
  const locale = newItemLocale(type, params);
  const start = editorStart(type, params);
  if (locale !== 'both') return createEditorItem(type, start);
  const created = await createEditorItem(type, { ...start, locale: 'ar' });
  // ردّ الإنشاء بلا رقم الإصدار (قيمته الافتراضية في قاعدة البيانات)، فنقرؤها قبل إنشاء النسخة
  const ar = await getEditorItem(type, created.id);
  await createTranslation(type, ar.id, ar.version);
  return getEditorItem(type, ar.id);
}

/** «بأي لغة؟» قبل إنشاء المسودّة: لكل لغة مادة مستقلة لها حالتها ونشرها. */
function LanguageChoice({ type, params }) {
  const to = (locale) => {
    const next = new URLSearchParams(params);
    next.set('locale', locale);
    return `?${next}`;
  };
  const back = type === 'post' && params.get('category') === 'news' ? '/admin/news' : BACK[type];
  return (
    <div className="azq-ed azq-ed-start" dir="rtl">
      <section className="azq-ed-panel-card azq-ed-start-card" aria-labelledby="ed-start-title">
        <h1 id="ed-start-title">{NOUN[type]}: بأي لغة؟</h1>
        <p className="azq-ed-hint">اختر لغة النص كما هو في مصدره. لكل لغة مادة مستقلة بحالتها ونشرها، وتُربط النسختان بزرّ التبديل في البوابة.</p>
        <div className="azq-ed-start-options">
          <Link className="azq-ed-start-option" to={to('ar')}><strong>العربية</strong><small>النص بالعربية، ويمكن إضافة نسخة إنجليزية لاحقًا.</small></Link>
          <Link className="azq-ed-start-option" to={to('en')} lang="en"><strong>English</strong><small lang="ar">النص بالإنجليزية، ولا يحتاج نسخة عربية.</small></Link>
          <Link className="azq-ed-start-option" to={to('both')}><strong>باللغتين</strong><small>نسختان مرتبطتان تبدأ بالعربية، ثم تكتب الإنجليزية من «الترجمة».</small></Link>
        </div>
        <Link className="azq-ed-link" to={back}>إلغاء</Link>
      </section>
    </div>
  );
}

export default function AdminEditor() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const start = id === 'new' ? params.toString() : '';
  const choose = id === 'new' && TYPES.has(type) && newItemLocale(type, params) === null;
  const hydrated = useHydrated();
  const { user } = useAuth();
  // النتيجة مربوطة بالمسار، فتغيير المادة يعرض «نفتح المادة…» دون إعادة ضبط داخل الأثر
  const [loaded, setLoaded] = useState({ key: null, item: null, error: null });
  const key = `${type}/${id}?${start}`;
  // إنشاء واحد لكل رابط «جديد» حتى لو أُعيد تشغيل الأثر (StrictMode في التطوير كان يُنشئ مسودّتين)
  const creating = useRef(new Map());

  useEffect(() => {
    if (!hydrated || !TYPES.has(type) || choose) return undefined;
    let alive = true;
    // «جديد»: بداية المسودّة من الرابط (?locale= و?category= و?q=)، والاستبدال يمحو الرابط فلا تُنشأ ثانية بالرجوع
    let load;
    if (id === 'new') {
      if (!creating.current.has(start)) {
        creating.current.set(start, createItem(type, new URLSearchParams(start)).then((created) => {
          navigate(`/admin/editor/${type}/${created.id}`, { replace: true });
          return created;
        }));
      }
      load = creating.current.get(start);
    } else {
      load = getEditorItem(type, id);
    }
    load.then((item) => alive && setLoaded({ key, item, error: null })).catch((error) => alive && setLoaded({ key, item: null, error }));
    return () => { alive = false; };
  }, [hydrated, type, id, key, start, choose, navigate]);

  const item = loaded.key === key ? loaded.item : null;
  const error = loaded.key === key ? loaded.error : null;
  if (!TYPES.has(type)) return <p className="azq-ed-page-message">نوع المادة غير معروف.</p>;
  if (choose) return <LanguageChoice type={type} params={params} />;
  if (error) return <p className="azq-ed-page-message" role="alert">{error.message}</p>;
  if (!item) return <p className="azq-ed-page-message" aria-busy="true">نفتح المادة…</p>;

  return <EditorScreen key={item.id} type={type} initial={item} userId={user?.id ?? 'anon'} />;
}
