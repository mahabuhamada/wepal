// صفحة المحرّر (القسم 4.4 من خطة لوحة الإدارة، على شكل editor-layout.tsx في المنتدى): شريط إجراءات لاصق بزرّ أساسي
// واحد بحسب الحالة، وتبويبات «المحتوى» و«الترجمة» و«الرابط والنسخ»، وورقة الكتابة بعمود 768px لا يضيق، واللوحة الجانبية
// بأوضاعها الثلاثة. والحماية من ضياع العمل قبل أي تجميل: الحفظ التلقائي بإعادة المحاولة، والنسخة في المتصفح،
// وحارس المغادرة، وفحص التعارض برقم الإصدار، ونسخة العمل للمنشور.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useBlocker, useNavigate } from 'react-router';
import {
  createPreviewLink, createTranslation, discardWorkingCopy, getEditorItem, isEditConflict, isNotReady, publishEditorItem, recordStoryConsent,
  restoreRevision, saveEditorItem, unpublishEditorItem, withdrawStoryConsent,
} from '../../api/editor';
import { deletePostCover, deleteResourceCover, deleteStoryPhoto, replaceResourceFile, updatePost, updateResource, updateStory, uploadPostCover, uploadResourceCover, uploadStoryPhoto } from '../../api/admin';
import { useAutosave } from '../../hooks/useAutosave';
import { useLocalBackup } from '../../hooks/useLocalBackup';
import { docText, editorActions, originalSibling, portalPath, saveIndicator, uploadBlocker, wordCount } from '../../utils/editorState';
import { BlockEditor, insertBlock, selectBlock } from './BlockEditor';
import { ConfirmDialog, ConflictDialog, ConsentDialog, Dialog, AttachDialog, EmbedDialog, ImageDialog, ImagePicker } from './EditorDialogs';
import { LinksTab, TranslationTab } from './EditorTabs';
import { SettingsAside } from './SettingsAside';
import { StoryContext } from './editorContext';
import { formatDateTime, palestineToIso } from './editorFormat';
import { currentBlock } from './BlockSettings';

// «معاينة» تفتح صفحة المادة العامة برابط المعاينة (POST …/preview-link)؛ غيرها معاينة داخل المحرّر.
const PORTAL_PREVIEW = ['post', 'story', 'resource'];
const STATUS = { draft: 'مسودّة', published: 'منشورة', scheduled: 'مجدولة', active: 'مفتوح', closed: 'مغلق' };
const BACK = { news: ['/admin/news', 'الأخبار'], post: ['/admin/analyses', 'التحليلات'], story: ['/admin/stories', 'القصص'], resource: ['/admin/library', 'المكتبة'], faq: ['/admin/faq', 'الأسئلة الشائعة'], survey: ['/admin/surveys', 'الاستطلاعات'] };
// رفع صورة الغلاف وحذفها ونصّها البديل بالمسارات الحالية لكل نوع (الأسئلة الشائعة بلا صورة)
const COVER = {
  post: { upload: uploadPostCover, remove: deletePostCover, alt: (id, alt) => updatePost(id, { coverAlt: alt }) },
  story: { upload: uploadStoryPhoto, remove: deleteStoryPhoto, alt: (id, alt) => updateStory(id, { photoAlt: alt }) },
  resource: { upload: uploadResourceCover, remove: deleteResourceCover, alt: (id, alt) => updateResource(id, { coverAlt: alt }) },
};
// قصّات صورة الغلاف في الموقع (azraq-covers.css وazraq-content.css): نصف غلاف الإصدار 3:2، وصفحة المادة 16:9، والمصغّرات مربّعة
const CROPS = [
  { key: 'card', label: 'البطاقة' },
  { key: 'page', label: 'صفحة المادة' },
  { key: 'thumb', label: 'المصغّرة' },
];
const TEXT_FIELDS = { post: ['title', 'excerpt', 'body', 'category', 'authorLabel', 'sourceName', 'sourceUrl', 'seoTitle', 'seoDescription', 'slug'], story: ['name', 'roleLabel', 'region', 'quote', 'body', 'featured'], resource: ['title', 'body', 'resourceType', 'authorLabel', 'issued', 'externalUrl', 'gallery'], faq: ['title', 'body', 'category'], survey: ['title', 'body'] };

/** حقول النموذج بلغة المادة كما تُرسل إلى الخادم. */
function formFrom(item, type) {
  return Object.fromEntries(TEXT_FIELDS[type].map((k) => [k, item.fields[k] ?? null]));
}

/**
 * وضع اللوحة بحسب عرض الشاشة: مثبّتة من 1600 (مفتوحة افتراضيًّا)، وجانبية 861–1599 (مغلقة افتراضيًّا)،
 * وورقة سفلية 860 فأقل. في الوضعين الأوّلين تأخذ اللوحة مكانها بجانب الورقة ولا تغطّيها.
 */
function useAsideMode() {
  const get = () => (typeof window === 'undefined' ? 'pinned' : window.innerWidth >= 1600 ? 'pinned' : window.innerWidth > 860 ? 'floating' : 'sheet');
  const [mode, setMode] = useState(get);
  useEffect(() => {
    const onResize = () => setMode(get());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return mode;
}

function useOnline() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

function SaveIndicator({ state, label, onRetry }) {
  return (
    <span className={`azq-ed-save azq-ed-save-${state}`} role="status" aria-live="polite">
      <span className="azq-ed-save-dot" aria-hidden="true" />
      {label}
      {state === 'failed' && <button type="button" className="azq-ed-link" onClick={onRetry}>أعد الآن</button>}
    </span>
  );
}

export function EditorScreen({ type, initial, userId }) {
  const navigate = useNavigate();
  const [item, setItem] = useState(initial);
  const [form, setForm] = useState(() => formFrom(initial, type));
  const [saved, setSaved] = useState(() => JSON.stringify(formFrom(initial, type)));
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(null);
  const [notice, setNotice] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [tab, setTab] = useState('content');
  const [asideTab, setAsideTab] = useState('item');
  const [focusMode, setFocusMode] = useState(false);
  const [source, setSource] = useState(null);
  const editorRef = useRef(null);
  const mode = useAsideMode();
  const online = useOnline();
  const [asideOpen, setAsideOpen] = useState(() => {
    if (mode === 'sheet') return false;
    try {
      const pref = window.localStorage.getItem('wepal-editor-aside');
      return pref ? pref === 'open' : mode === 'pinned';
    } catch {
      return mode === 'pinned';
    }
  });

  const locale = item.locale ?? 'ar';
  const dir = locale === 'en' ? 'ltr' : 'rtl';
  const serialized = JSON.stringify(form);
  const dirty = serialized !== saved;
  const scope = `${userId}:${type}:${item.id}`;

  const setField = useCallback((key, value) => setForm((f) => ({ ...f, [key]: value })), []);
  const setLocalized = useCallback((key, value) => setForm((f) => ({ ...f, [key]: { ...(f[key] ?? {}), [locale]: value } })), [locale]);

  const applyItem = useCallback((next, { keepForm = false } = {}) => {
    setItem(next);
    const fresh = formFrom(next, type);
    setSaved(JSON.stringify(fresh));
    if (!keepForm) setForm(fresh);
  }, [type]);

  const backup = useLocalBackup({ scope, version: item.version, value: form, active: dirty, differs: (stored) => JSON.stringify(stored) !== saved });

  /** الحفظ: يدوي (نسخة في «النسخ السابقة») أو تلقائي. يعيد المادة بعد الحفظ، أو null إن لم تُحفظ. */
  const save = useCallback(async ({ autosave = false, force = false } = {}) => {
    if (saving) return null;
    setSaving(true);
    const sent = form;
    const sentSerialized = JSON.stringify(sent);
    try {
      const next = await saveEditorItem(type, item.id, { version: force ? conflict?.currentVersion ?? item.version : item.version, fields: sent, autosave, force });
      setItem(next);
      setSaved(sentSerialized);
      setConflict(null);
      backup.clear();
      return next;
    } catch (error) {
      if (isEditConflict(error)) setConflict(error.body.conflict);
      else if (!autosave) setNotice({ tone: 'danger', text: error.message });
      return null;
    } finally {
      setSaving(false);
    }
  }, [saving, form, type, item.id, item.version, conflict, backup]);

  const auto = useAutosave({ enabled: !conflict && !readOnlyFor(item), isDirty: dirty, busy: saving, save: async () => Boolean(await save({ autosave: true })) });

  // Ctrl S أو ⌘S: حفظ دون تغيير الحالة. Ctrl Shift F: وضع التركيز، وEsc للخروج.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save().then((ok) => ok && auto.reset());
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'f' && mode !== 'sheet') {
        e.preventDefault();
        setFocusMode((v) => !v);
      } else if (e.key === 'Escape' && focusMode) {
        setFocusMode(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save, auto, focusMode, mode]);

  // حارس المغادرة: داخل اللوحة وعند إغلاق التبويب
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);
  useEffect(() => {
    if (!dirty) return undefined;
    const onUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);

  // «الأصل»: تبويب في اللوحة الجانبية بالنص الذي تُترجم منه هذه المادة (عربي لترجمة إنجليزية أو العكس).
  // ويُفتح أولًا والترجمة مسودّة، فيرى المترجم النص الأصلي بجانب ورقته دون أن يدفعها إلى الأسفل.
  const sourceRef = originalSibling(item);
  const sourceId = sourceRef?.id ?? null;
  const translatingDraft = Boolean(sourceId) && initial.status === 'draft';
  useEffect(() => {
    if (!sourceId) return undefined;
    let alive = true;
    getEditorItem(type, sourceId).then((s) => alive && setSource(s)).catch(() => alive && setSource({ failed: true }));
    return () => { alive = false; };
  }, [type, sourceId]);
  useEffect(() => {
    if (!translatingDraft) return;
    setAsideTab('source');
    if (mode !== 'sheet') setAsideOpen(true);
    // مرة واحدة عند فتح الترجمة، لا كلما تغيّر عرض الشاشة
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translatingDraft]);

  const reload = async () => applyItem(await getEditorItem(type, item.id), { keepForm: dirty });

  const publish = async (at) => {
    const current = dirty ? await save() : item;
    if (!current) return;
    try {
      const next = await publishEditorItem(type, item.id, current.version, at);
      applyItem(next);
      setNotice({ tone: 'success', text: next.status === 'scheduled' ? `جُدولت للنشر في ${formatDateTime(next.publishedAt)}.` : item.status === 'draft' ? 'نُشرت المادة.' : 'نُشرت التعديلات.' });
    } catch (error) {
      if (isNotReady(error)) {
        setItem((it) => ({ ...it, readiness: error.body.readiness }));
        setAsideTab('item');
        setAsideOpen(true);
        setNotice({ tone: 'danger', text: error.message });
      } else if (isEditConflict(error)) setConflict(error.body.conflict);
      else setNotice({ tone: 'danger', text: error.message });
    }
  };

  /**
   * «معاينة»: صفحة المادة العامة نفسها وهي مسودّة (أو بتعديلاتها)، برابط بتوكن صالح 24 ساعة، في تبويب جديد.
   * يُحفظ ما لم يُحفظ أولًا. التبويب يُفتح مع الضغطة نفسها (فلا يمنعه المتصفح بعد انتظار الحفظ)، بلا opener،
   * ثم يُوجَّه إلى الرابط. الأسئلة الشائعة والاستطلاع بلا صفحة لمادة واحدة: تبقى المعاينة داخل المحرّر.
   */
  const openPreview = async () => {
    const tab = window.open('', '_blank');
    if (tab) tab.opener = null;
    const current = dirty ? await save() : item;
    if (!current) {
      tab?.close();
      return;
    }
    try {
      const { url } = await createPreviewLink(type, item.id);
      const href = new URL(url, window.location.origin).href;
      if (tab) tab.location.replace(href);
      else setNotice({ tone: 'warn', text: 'منع المتصفح فتح تبويب جديد.', link: href });
    } catch (error) {
      tab?.close();
      setNotice({ tone: 'danger', text: error.message });
    }
  };

  const run = (fn, done) => async () => {
    setDialog(null);
    try {
      applyItem(await fn());
      if (done) setNotice({ tone: 'success', text: done });
    } catch (error) {
      if (isEditConflict(error)) setConflict(error.body.conflict);
      else setNotice({ tone: 'danger', text: error.message });
    }
  };

  const onGo = (rule) => {
    if (rule.field === 'body' && rule.block && editorRef.current) {
      setTab('content');
      selectBlock(editorRef.current, rule.block);
      return;
    }
    if (rule.field === 'consent') {
      setAsideTab('item');
      setAsideOpen(true);
      requestAnimationFrame(() => document.getElementById('ed-consent')?.scrollIntoView({ block: 'center' }));
      return;
    }
    const target = document.getElementById(`ed-${rule.field}`) ?? document.getElementById('ed-cover');
    if (['category', 'authorLabel', 'name', 'roleLabel', 'region', 'sourceName', 'sourceUrl', 'gallery', 'externalUrl', 'resourceType', 'issued'].includes(rule.field)) setAsideOpen(true);
    else if (mode === 'sheet') setAsideOpen(false); // على الجوال تغطّي الورقة السفلية الحقل، فتُغلق ليظهر
    requestAnimationFrame(() => {
      const el = document.getElementById(`ed-${rule.field}`) ?? target;
      el?.scrollIntoView({ block: 'center' });
      el?.focus?.();
    });
  };

  // ===== صورة الغلاف (تُرفع على المادة مباشرة كما اليوم؛ نسختها في كل لغة مستقلة) =====
  const cover = type === 'story' ? item.photo : item.cover;
  const uploadCover = async (file, alt) => {
    const data = { file, alt: { ...(cover?.altTranslations ?? {}), ar: cover?.altTranslations?.ar || alt, [locale]: alt } };
    await COVER[type].upload(item.id, data);
    await reload();
  };
  const saveCoverAlt = async (alt) => {
    const altMap = { ...(cover?.altTranslations ?? {}), [locale]: alt };
    await COVER[type].alt(item.id, altMap);
    await reload();
  };

  // ===== كتل تحتاج صورة أو رابطًا =====
  const pendingBlock = useRef(null);
  const onBlockAction = (block, editor) => {
    if (block.type === 'settings') {
      setAsideTab('block');
      setAsideOpen(true);
      return;
    }
    pendingBlock.current = { block, editor };
    if (block.kind === 'image') setDialog({ kind: 'image', purpose: 'block' });
    else if (block.kind === 'embed') setDialog({ kind: 'embed', hint: block.hint });
    else if (block.kind === 'attach') setDialog({ kind: 'attach', tab: block.tab });
  };
  const uploadForGallery = () => new Promise((resolve) => setDialog({ kind: 'image', purpose: 'gallery', resolve }));

  const actions = editorActions({ status: item.status, hasWorkingCopy: !!item.workingCopy, dirty, schedulable: type === 'post' });
  const indicator = saveIndicator({ dirty, saving, failures: auto.failures, online });
  const missing = item.readiness?.blocking ?? 0;
  const words = useMemo(() => wordCount(docText(form.body?.[locale])), [form.body, locale]);
  const story = useMemo(() => (type === 'story' ? { name: form.name, role: form.roleLabel?.[locale] } : null), [type, form.name, form.roleLabel, locale]);
  // الخبر يعود إلى «الأخبار»، وغيره من المقالات إلى «التحليلات»
  const [backHref, backLabel] = BACK[type === 'post' && form.category === 'news' ? 'news' : type];
  const title = type === 'story' ? form.name : form.title?.[locale];
  const showAside = asideOpen && !focusMode;

  return (
    <div className={`azq-ed azq-ed-aside-${mode}${showAside ? ' has-aside' : ''}${focusMode ? ' is-focus' : ''}`} dir="rtl">
      {/* ===== شريط الإجراءات ===== */}
      <div className="azq-ed-bar">
        <div className="azq-ed-bar-start">
          <a className="azq-ed-back" href={backHref} onClick={(e) => { e.preventDefault(); navigate(backHref); }}>→ {backLabel}</a>
          <div className="azq-ed-bar-title">
            <h1 dir="auto">{title || 'مادة بلا عنوان'}</h1>
            {type === 'post' && <span className="azq-ed-badge">{form.category === 'news' ? 'خبر' : 'تحليل'}</span>}
            <span className={`azq-ed-badge azq-ed-status-${item.status}`}>{STATUS[item.status]}</span>
            {/* لغة المادة ظاهرة بالاسم، لا بحرف «ع/En» وحده */}
            <span className="azq-ed-badge" lang={locale}>{locale === 'en' ? 'English' : 'العربية'}</span>
            {item.workingCopy && <span className="azq-ed-badge azq-ed-badge-warn">نسخة عمل: لا يراها الزوار حتى تنشر التعديلات</span>}
            <span className="azq-ed-langs" aria-label="اللغات">
              {['ar', 'en'].map((l) => {
                const t = l === locale ? null : item.translations?.find((x) => x.locale === l);
                if (l === locale) return <span key={l} className="azq-ed-lang is-current">{l === 'ar' ? 'ع' : 'En'}</span>;
                return t
                  ? <button key={l} type="button" className="azq-ed-lang" onClick={() => navigate(`/admin/editor/${type}/${t.id}`)}>{l === 'ar' ? 'ع' : 'En'}</button>
                  : <button key={l} type="button" className="azq-ed-lang is-missing" onClick={() => setTab('translation')}>+ {l === 'ar' ? 'ع' : 'En'}</button>;
              })}
            </span>
            <SaveIndicator {...indicator} onRetry={auto.retryNow} />
          </div>
        </div>
        <div className="azq-ed-actions">
          <details className="azq-ed-more">
            <summary aria-label="أفعال أخرى">⋯</summary>
            <div className="azq-ed-menu">
              {item.status === 'published' && portalPath(type, item) && <a href={portalPath(type, item)} target="_blank" rel="noopener">فتح في البوابة</a>}
              <button type="button" onClick={() => setTab('translation')}>{item.translations?.length ? 'تحرير النسخة الأخرى' : `إنشاء النسخة ${locale === 'ar' ? 'الإنجليزية' : 'العربية'}`}</button>
              <button type="button" onClick={() => setTab('links')}>النسخ السابقة</button>
              {item.workingCopy && <button type="button" onClick={() => setDialog({ kind: 'discard' })}>تجاهل التعديلات</button>}
              {item.status !== 'draft' && <button type="button" onClick={() => setDialog({ kind: 'unpublish' })}>إعادة إلى مسودّة</button>}
            </div>
          </details>
          {PORTAL_PREVIEW.includes(type)
            ? <button type="button" className="azq-ed-btn-ghost" disabled={saving} onClick={openPreview}>معاينة</button>
            : <button type="button" className="azq-ed-btn-ghost" onClick={() => setDialog({ kind: 'preview', device: 'desktop' })}>معاينة</button>}
          <button type="button" className="azq-ed-btn-ghost azq-ed-aside-toggle" aria-pressed={showAside} onClick={() => {
            const next = !asideOpen;
            setAsideOpen(next);
            if (mode !== 'sheet') {
              try { window.localStorage.setItem('wepal-editor-aside', next ? 'open' : 'closed'); } catch { /* محجوب */ }
            }
          }}>
            اللوحة{missing > 0 && <span className="azq-ed-dot-red" aria-label={`ينقص ${missing}`} />}
          </button>
          {actions.secondary.filter((a) => type !== 'survey' || a.key === 'save').map((a) => (a.key === 'schedule'
            ? <button key={a.key} type="button" className="azq-ed-btn-secondary" disabled={saving} onClick={() => setDialog({ kind: 'schedule' })}>{a.label}</button>
            : <button key={a.key} type="button" className="azq-ed-btn-secondary" disabled={saving || !dirty} onClick={() => save().then((ok) => ok && auto.reset())}>{a.label}</button>))}
          {/* الاستطلاع يُفتح ويُغلق من صفحته: المحرّر لوصفه فقط، فلا زرّ نشر */}
          {type !== 'survey' && <button type="button" className="azq-ed-btn-primary" disabled={saving || actions.primary.disabled} onClick={() => publish(actions.primary.key === 'publishNow' ? new Date().toISOString() : undefined)}>{actions.primary.label}</button>}
        </div>
      </div>

      {/* ===== التبويبات ===== */}
      <div className="azq-ed-tabs" role="tablist">
        {[['content', 'المحتوى'], ...(type === 'post' ? [['seo', 'محركات البحث']] : []), ...(type !== 'survey' ? [['translation', 'الترجمة']] : []), ['links', 'الرابط والنسخ']].map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>
            {label}
            {key === 'translation' && <span className="azq-ed-tab-langs"> ع {item.translations?.some((t) => t.locale === 'en') || locale === 'en' ? 'En' : '+En'}</span>}
          </button>
        ))}
      </div>

      {/* ===== التنبيهات ===== */}
      <div className="azq-ed-notices">
        {backup.found && (
          <div className="azq-ed-notice azq-ed-notice-warn" role="alert">
            وجدنا نسخة غير محفوظة من هذه المادة ({formatDateTime(new Date(backup.found.savedAt).toISOString())}). استعادتها؟
            <button type="button" className="azq-ed-link" onClick={() => { setForm(backup.found.value); backup.accept(); }}>استعادة</button>
            <button type="button" className="azq-ed-link" onClick={backup.dismiss}>تجاهل</button>
          </div>
        )}
        {auto.failures > 0 && <div className="azq-ed-notice azq-ed-notice-danger" role="alert">لم نستطع حفظ تعديلاتك، وهي محفوظة في هذا المتصفح. نعيد المحاولة تلقائيًّا.</div>}
        {item.workingCopy && (
          <div className="azq-ed-notice">
            تعديلات غير منشورة على مادة منشورة. لا يراها الزوار حتى تنشرها.
            <button type="button" className="azq-ed-link" onClick={() => publish()}>نشر التعديلات</button>
            <button type="button" className="azq-ed-link-danger" onClick={() => setDialog({ kind: 'discard' })}>تجاهل التعديلات</button>
          </div>
        )}
        {type === 'survey' && <div className="azq-ed-notice">هذا محرّر وصف الاستطلاع فقط. الأسئلة، وفتح الاستطلاع وإغلاقه، من صفحة الاستطلاعات.</div>}
        {locale === 'en' && <div className="azq-ed-notice">تُكتب الحقول النصية في هذه المادة بالإنجليزية، ولها حالتها ونشرها وحدها.</div>}
        {notice && <div className={`azq-ed-notice azq-ed-notice-${notice.tone}`} role="status">{notice.text}{notice.link && <a className="azq-ed-link" href={notice.link} target="_blank" rel="noopener noreferrer">فتح المعاينة</a>}{notice.undo && <button type="button" className="azq-ed-link" onClick={() => { notice.undo(); setNotice(null); }}>تراجع</button>}<button type="button" className="azq-ed-icon-btn" aria-label="إغلاق" onClick={() => setNotice(null)}>×</button></div>}
      </div>

      {tab === 'translation' && <TranslationTab item={item} type={type} dirty={dirty} onCreate={async () => {
        try {
          const next = await createTranslation(type, item.id, item.version);
          navigate(`/admin/editor/${type}/${next.id}`);
        } catch (error) {
          setNotice({ tone: 'danger', text: error.message });
        }
      }} />}
      {tab === 'seo' && (
        <div className="azq-ed-tab-panel">
          <section className="azq-ed-panel-card">
            <h2>محركات البحث</h2>
            <p className="azq-ed-hint">فارغان يأخذان العنوان والملخّص. لكل لغة عنوانها ووصفها.</p>
            <label className="azq-ed-field" htmlFor="ed-seoTitle"><span className="azq-ed-field-label">العنوان في نتائج البحث ({(form.seoTitle?.[locale] ?? '').length} / 60)</span>
              <input id="ed-seoTitle" className="azq-ed-input" dir={dir} maxLength={120} value={form.seoTitle?.[locale] ?? ''} placeholder={form.title?.[locale] ?? ''} onChange={(e) => setLocalized('seoTitle', e.target.value)} /></label>
            <label className="azq-ed-field" htmlFor="ed-seoDescription"><span className="azq-ed-field-label">الوصف ({(form.seoDescription?.[locale] ?? '').length} / 160)</span>
              <textarea id="ed-seoDescription" className="azq-ed-input" rows={3} dir={dir} maxLength={320} value={form.seoDescription?.[locale] ?? ''} placeholder={form.excerpt?.[locale] ?? ''} onChange={(e) => setLocalized('seoDescription', e.target.value)} /></label>
            <div className="azq-ed-serp" dir={dir}>
              <small dir="ltr">wepal.ps{portalPath(type, { ...item, slug: form.slug || item.slug, fields: form })}</small>
              <strong>{(form.seoTitle?.[locale] || form.title?.[locale] || '').slice(0, 60)}</strong>
              <p>{(form.seoDescription?.[locale] || form.excerpt?.[locale] || '').slice(0, 160)}</p>
            </div>
          </section>
        </div>
      )}
      {tab === 'links' && <LinksTab item={item} type={type} fields={form} dirty={dirty} onRestore={(n) => setDialog({ kind: 'restore', number: n })} />}

      {/* ===== المحتوى: ورقة الكتابة واللوحة ===== */}
      <div className="azq-ed-workspace" hidden={tab !== 'content'}>
        <div className="azq-ed-sheet">
          {mode === 'sheet' && (
            <button type="button" className="azq-ed-sheet-open" onClick={() => setAsideOpen(true)}>
              إعدادات المادة{missing > 0 ? ` · ينقص ${missing}` : ''}
            </button>
          )}
          {focusMode && <p className="azq-ed-focus-line">{words} كلمة · {indicator.label}</p>}
          <div className="azq-ed-column" dir={dir}>
            {type !== 'story' ? (
              <>
                <textarea id="ed-title" className="azq-ed-title" rows={1} dir={dir} placeholder={locale === 'en' ? 'Title' : 'العنوان'} value={form.title?.[locale] ?? ''}
                  onChange={(e) => setLocalized('title', e.target.value.replace(/\n/g, ''))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('ed-excerpt')?.focus(); } }} />
                {type === 'post' && <p className="azq-ed-slug" dir="ltr">wepal.ps/{form.category === 'news' ? 'news' : 'blog'}/
                  {dialog?.kind === 'slug'
                    ? <input id="ed-slug" className="azq-ed-input azq-ed-slug-input" dir="auto" autoFocus defaultValue={form.slug ?? item.slug} onBlur={(e) => { setField('slug', e.target.value.trim().replace(/\s+/g, '-')); setDialog(null); }} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} />
                    : <><span>{form.slug || item.slug}</span> <button type="button" className="azq-ed-link" onClick={() => setDialog({ kind: 'slug' })}>تعديل الرابط</button></>}
                </p>}
                {item.status !== 'draft' && form.slug && form.slug !== item.slug && <p className="azq-ed-hint">الرابط الجديد يسري مع نشر التعديلات.</p>}
              </>
            ) : (
              <textarea id="ed-quote" className="azq-ed-title azq-ed-title-quote" rows={2} dir={dir} placeholder={locale === 'en' ? 'The quote' : 'الاقتباس: جملة من كلام صاحب القصة'} value={form.quote?.[locale] ?? ''} onChange={(e) => setLocalized('quote', e.target.value)} />
            )}

            {type !== 'faq' && type !== 'survey' && <div id="ed-cover" className="azq-ed-cover" tabIndex={-1}>
              {cover?.url ? (
                <figure>
                  {/* تُعرض كاملة هنا (بلا قصّ) ليرى المحرّر الصورة كما رفعها */}
                  <img src={cover.url} alt={cover.altTranslations?.[locale] ?? ''} />
                  <div className="azq-ed-cover-actions" dir="rtl">
                    <button type="button" className="azq-ed-btn-secondary" onClick={() => setDialog({ kind: 'image', purpose: 'cover' })}>تغيير الصورة</button>
                    <button type="button" className="azq-ed-icon-btn" aria-label="إزالة الصورة" onClick={() => setDialog({ kind: 'removeCover' })}>×</button>
                  </div>
                  {/* القصّ كما في الموقع: الصورة تُرفع 2:1، وتظهر 3:2 أعلى غلاف الإصدار، و16:9 في صفحتها، ومربّعة في المصغّرات */}
                  <div className="azq-ed-cover-crops" dir="rtl" aria-label="كيف تظهر في الموقع">
                    {CROPS.filter((c) => type !== 'story' || c.key !== 'card').map((c) => (
                      <figure key={c.key} className="azq-ed-crop">
                        <span className={`azq-ed-crop-img azq-ed-crop-${c.key}`} style={{ backgroundImage: `url("${cover.url}")` }} />
                        <figcaption>{c.label}</figcaption>
                      </figure>
                    ))}
                  </div>
                  <p className="azq-ed-hint azq-ed-cover-note" dir="rtl">تظهر هنا كاملة، وفي الموقع تُقصّ كما في المعاينات أعلاه. أفضل صورة 2:1 ومهمّها في المربّع الأوسط.</p>
                  <label className="azq-ed-field" htmlFor="ed-coverAlt" dir="rtl">
                    <span className="azq-ed-field-label">{type === 'story' ? 'النص البديل للصورة' : 'النص البديل لصورة الغلاف'} ({locale === 'en' ? 'بالإنجليزية' : 'بالعربية'})</span>
                    <input key={cover.url} id="ed-coverAlt" className="azq-ed-input" dir={dir} defaultValue={cover.altTranslations?.[locale] ?? ''} onBlur={(e) => e.target.value !== (cover.altTranslations?.[locale] ?? '') && saveCoverAlt(e.target.value)} />
                  </label>
                </figure>
              ) : (
                <button type="button" className="azq-ed-cover-add" dir="rtl" onClick={() => setDialog({ kind: 'image', purpose: 'cover' })}>
                  <strong>{type === 'story' ? '+ إضافة صورة صاحب القصة' : '+ إضافة صورة الغلاف'}</strong>
                  <small>{type === 'story' ? 'اختيارية، وتحتاج موافقته' : type === 'resource' ? 'اختيارية: بدونها يظهر الغلاف المرسوم لنوع المصدر. تظهر على بطاقة المادة في المكتبة وأعلى صفحتها.' : 'مطلوبة للنشر. تظهر على بطاقة المادة وأعلى صفحتها.'}</small>
                </button>
              )}
            </div>}

            {type === 'post' && (
              <label className="azq-ed-excerpt-wrap" htmlFor="ed-excerpt">
                <textarea id="ed-excerpt" className="azq-ed-excerpt" rows={2} dir={dir} placeholder={locale === 'en' ? 'Summary (80–240 characters)' : 'الملخّص: ما يقرؤه الزائر قبل أن يفتح الخبر'} value={form.excerpt?.[locale] ?? ''} onChange={(e) => setLocalized('excerpt', e.target.value)} />
                <span className="azq-ed-counter" dir="ltr">{(form.excerpt?.[locale] ?? '').length} / 240</span>
              </label>
            )}

            <StoryContext.Provider value={story}>
              <div id="ed-body">
                <BlockEditor key={`${item.id}-${locale}`} editorRef={editorRef} doc={form.body?.[locale]} dir={dir} isStory={type === 'story'}
                  onChange={(doc) => setForm((f) => ({ ...f, body: { ...(f.body ?? {}), [locale]: doc } }))}
                  onBlockAction={onBlockAction}
                  onNotice={setNotice}
                  onSelectBlock={(name) => { if (name && showAside) setAsideTab((t) => (t === 'source' ? t : 'block')); }}
                  onPasteUrl={(url) => { pendingBlock.current = { block: { kind: 'embed' }, editor: editorRef.current }; setDialog({ kind: 'embed', hint: null, url }); }} />
              </div>
            </StoryContext.Provider>
          </div>
        </div>

        {showAside && mode === 'sheet' && <button type="button" className="azq-ed-sheet-backdrop" aria-label="إغلاق الإعدادات" onClick={() => setAsideOpen(false)} />}
        {showAside && (
          <SettingsAside item={item} type={type} fields={form} setField={setField} setLocalized={setLocalized} locale={locale} editor={editorRef.current}
            tab={currentBlock(editorRef.current) && asideTab === 'block' ? 'block' : asideTab} onTab={setAsideTab}
            sourceRef={sourceRef} source={source} onGo={onGo} onClose={() => setAsideOpen(false)}
            onReplaceUrl={(hint) => { pendingBlock.current = { replace: true, editor: editorRef.current }; setDialog(hint === 'attach' ? { kind: 'attach', tab: 'upload' } : { kind: 'embed', hint }); }}
            onUploadImage={uploadForGallery}
            onRecordConsent={() => setDialog({ kind: 'consent' })}
            onWithdrawConsent={() => setDialog({ kind: 'withdraw' })}
            onCreateTranslation={() => setTab('translation')}
            onAddGalleryImage={uploadForGallery} onReplaceFile={async (file) => { await replaceResourceFile(item.id, file); await reload(); }} />
        )}
      </div>

      {/* ===== النوافذ ===== */}
      {conflict && (
        <ConflictDialog conflict={conflict} mine={form} locale={locale} onClose={() => setConflict(null)}
          onKeepMine={() => save({ force: true }).then((ok) => ok && setNotice({ tone: 'success', text: 'حُفظت نسختك، وبقيت النسخة الأخرى في «النسخ السابقة».' }))}
          onTakeTheirs={async () => { setConflict(null); applyItem(await getEditorItem(type, item.id)); backup.clear(); }} />
      )}
      {dialog?.kind === 'embed' && (
        <EmbedDialog hint={dialog.hint ?? 'video'} initialUrl={dialog.url ?? ''} onClose={() => setDialog(null)} onDone={(block) => {
          const { editor, replace } = pendingBlock.current ?? {};
          setDialog(null);
          if (!editor) return;
          if (block.type === 'map') {
            pendingBlock.current = { block: { kind: 'image', make: (img) => ({ type: 'map', attrs: { ...img, ...block.attrs } }) }, editor };
            setDialog({ kind: 'image', purpose: 'block' });
            return;
          }
          if (replace) editor.chain().focus().deleteSelection().run();
          insertBlock(editor, block.type === 'linkCard' || block.type === 'xPost' ? block : { ...block, content: [] });
        }} />
      )}
      {dialog?.kind === 'image' && dialog.purpose !== 'cover' && (
        <ImageDialog locale={locale} onClose={() => { dialog.resolve?.(null); setDialog(null); }} onDone={async (img) => {
          setDialog(null);
          if (dialog.purpose === 'gallery') return dialog.resolve(img);
          const { block, editor } = pendingBlock.current ?? {};
          if (block?.make && editor) {
            insertBlock(editor, block.make(img));
            if (block.settings) { setAsideTab('block'); setAsideOpen(true); }
          }
        }} />
      )}
      {dialog?.kind === 'attach' && (
        <AttachDialog locale={locale} tab={dialog.tab} onClose={() => setDialog(null)} onDone={(block) => {
          const { editor, replace } = pendingBlock.current ?? {};
          setDialog(null);
          if (!editor) return;
          // «استبدال»: الكتلة المحددة (ملف أو مصدر) تُستبدل بما اختير، ولو من نوع آخر
          if (replace) editor.chain().focus().deleteSelection().run();
          insertBlock(editor, block);
        }} />
      )}
      {dialog?.kind === 'consent' && (
        <ConsentDialog defaultName={form.name} hasPhoto={!!item.photo} onClose={() => setDialog(null)} onSubmit={async (consent) => {
          applyItem(await recordStoryConsent(item.id, consent), { keepForm: true });
          setDialog(null);
        }} />
      )}
      {dialog?.kind === 'withdraw' && (
        <ConfirmDialog title="سحب موافقة صاحب القصة؟" danger confirmLabel="سحب الموافقة" onClose={() => setDialog(null)}
          body="تبقى القصة منشورة بنصها، وتختفي صورته من البوابة فورًا، ولا تُنشر لها أي تعديلات حتى تُسجَّل موافقة جديدة."
          onConfirm={run(() => withdrawStoryConsent(item.id), 'سُحبت الموافقة.')} />
      )}
      {dialog?.kind === 'discard' && (
        <ConfirmDialog title="تجاهل التعديلات غير المنشورة؟" danger confirmLabel="تجاهل التعديلات" onClose={() => setDialog(null)}
          body="يبقى المنشور كما هو، وتبقى التعديلات المتجاهَلة في «النسخ السابقة»." onConfirm={run(() => discardWorkingCopy(type, item.id, item.version), 'تُجوهلت التعديلات.')} />
      )}
      {dialog?.kind === 'unpublish' && (
        <ConfirmDialog title="إعادة المادة إلى مسودّة؟" confirmLabel="إعادة إلى مسودّة" onClose={() => setDialog(null)}
          body="تختفي عن الزوار، وتبقى بكل تعديلاتها مسودّةً تنشرها متى شئت." onConfirm={run(() => unpublishEditorItem(type, item.id, item.version), 'أُعيدت إلى مسودّة.')} />
      )}
      {dialog?.kind === 'restore' && (
        <ConfirmDialog title={`استرجاع النسخة #${dialog.number}؟`} confirmLabel="استرجاع" onClose={() => setDialog(null)}
          body={item.status === 'draft' ? 'تحلّ محلّ المسودّة الحالية، وتبقى الحالية في «النسخ السابقة».' : 'تصير نسخة العمل، ولا تمسّ المنشور حتى تنشر التعديلات.'}
          onConfirm={run(() => restoreRevision(type, item.id, dialog.number, item.version), 'استُرجعت النسخة.')} />
      )}
      {dialog?.kind === 'removeCover' && (
        <ConfirmDialog title="إزالة الصورة؟" danger confirmLabel="إزالة الصورة" onClose={() => setDialog(null)}
          body={item.status === 'published' ? 'تُزال من المنشور الآن.' : 'يمكنك رفع غيرها في أي وقت.'}
          onConfirm={async () => { setDialog(null); await COVER[type].remove(item.id); await reload(); }} />
      )}
      {dialog?.kind === 'preview' && (
        <Dialog title="معاينة" wide onClose={() => setDialog(null)}>
          <div className="azq-ed-row" role="radiogroup" aria-label="الجهاز">
            {[['desktop', 'حاسوب'], ['mobile', 'جوال']].map(([d, l]) => <button key={d} type="button" role="radio" aria-checked={dialog.device === d} className={dialog.device === d ? 'azq-ed-btn-primary' : 'azq-ed-btn-ghost'} onClick={() => setDialog({ ...dialog, device: d })}>{l}</button>)}
          </div>
          <article className={`azq-ed-preview azq-ed-preview-${dialog.device}`} dir={dir}>
            <h1>{title}</h1>
            {cover?.url && <img src={cover.url} alt={cover.altTranslations?.[locale] ?? ''} />}
            {form.excerpt?.[locale] && <p className="azq-ed-preview-excerpt">{form.excerpt[locale]}</p>}
            {/* المتن من المحرّر نفسه، والخادم يبني منه body_html بالهروب عند الحفظ */}
            <div className="azq-ed-preview-body" dangerouslySetInnerHTML={{ __html: editorRef.current?.getHTML() ?? '' }} />
            <p className="azq-ed-hint">الفيديو والصوت والمنشورات: يُحمَّل المشغّل حين يضغط الزائر.</p>
          </article>
        </Dialog>
      )}
      {dialog?.kind === 'schedule' && (
        <ScheduleDialog current={item.status === 'scheduled' ? item.publishedAt : null} onClose={() => setDialog(null)} onSchedule={(iso) => { setDialog(null); publish(iso); }} />
      )}
      {blocker.state === 'blocked' && (
        <ConfirmDialog title="لديك تعديلات غير محفوظة" danger confirmLabel="مغادرة دون حفظ" onClose={() => blocker.reset()} body="إن غادرت الآن تبقى نسخة منها في هذا المتصفح فقط." onConfirm={() => blocker.proceed()} />
      )}
      {dialog?.kind === 'image' && dialog.purpose === 'cover' && (
        <CoverUploader locale={locale} title={type === 'story' ? 'صورة صاحب القصة' : 'صورة الغلاف'} onClose={() => setDialog(null)} onUpload={uploadCover} />
      )}
    </div>
  );
}

/** «جدولة…» بموعد وبتوقيت فلسطين. */
function ScheduleDialog({ current, onSchedule, onClose }) {
  const [value, setValue] = useState('');
  const iso = palestineToIso(value);
  const future = iso && new Date(iso) > new Date();
  return (
    <Dialog title={current ? 'تغيير موعد النشر' : 'جدولة النشر'} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); if (future) onSchedule(iso); }}>
        {current && <p>الموعد الحالي: {formatDateTime(current)}</p>}
        <label className="azq-ed-field"><span className="azq-ed-field-label">الموعد (توقيت فلسطين)</span>
          <input type="datetime-local" className="azq-ed-input" value={value} onChange={(e) => setValue(e.target.value)} required /></label>
        {value && !future && <p className="azq-ed-error" role="alert">اختر موعدًا في المستقبل.</p>}
        <p className="azq-ed-hint">تُنشر المادة وحدها في موعدها، ولا تظهر للزوار قبله.</p>
        <div className="azq-ed-dialog-actions">
          <button type="button" className="azq-ed-btn-ghost" onClick={onClose}>إلغاء</button>
          <button type="submit" className="azq-ed-btn-primary" disabled={!future}>جدولة</button>
        </div>
      </form>
    </Dialog>
  );
}

function readOnlyFor() {
  return false; // سير «إرسال للمراجعة» ينتظر القرار 15
}

/** رفع صورة الغلاف بنصّها البديل (يمرّ بمسار الرفع الحالي لكل نوع). */
function CoverUploader({ locale, title, onUpload, onClose }) {
  const [file, setFile] = useState(null);
  const [alt, setAlt] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const blocker = uploadBlocker(file, alt);
  return (
    <Dialog title={title} onClose={onClose}>
      <form onSubmit={async (e) => {
        e.preventDefault();
        if (blocker) return;
        setBusy(true);
        setError(null);
        try {
          await onUpload(file, alt);
          onClose();
        } catch (err) {
          setError(err);
          setBusy(false);
        }
      }}>
        <ImagePicker file={file} onChange={setFile} hint="أفضل نسبة: العرض ضعف الارتفاع (2:1). JPG أو PNG أو WebP، حتى 5 ميغابايت." />
        <label className="azq-ed-field"><span className="azq-ed-field-label">النص البديل ({locale === 'en' ? 'بالإنجليزية' : 'بالعربية'})</span>
          <input className="azq-ed-input" dir={locale === 'en' ? 'ltr' : 'rtl'} value={alt} onChange={(e) => setAlt(e.target.value)} minLength={3} />
          <small className="azq-ed-hint">يصف الصورة لمن لا يراها، ومطلوب للنشر.</small>
        </label>
        {error && <p className="azq-ed-error" role="alert">{error.message}</p>}
        <div className="azq-ed-dialog-actions">
          <button type="button" className="azq-ed-btn-ghost" onClick={onClose}>إلغاء</button>
          <button type="submit" className="azq-ed-btn-primary" disabled={busy || !!blocker}>{busy ? 'يُرفع…' : 'رفع'}</button>
        </div>
        {!busy && blocker && <p className="azq-ed-hint azq-ed-dialog-why">{blocker}</p>}
      </form>
    </Dialog>
  );
}
