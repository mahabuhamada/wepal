// اللوحة الجانبية (editor/settings-aside.tsx في المنتدى): تبويبا «المادة» و«الكتلة»، و«الأصل» للترجمة. في «المادة» بطاقات تُطوى ويُحفظ
// طيّها في المتصفح: «جاهزية النشر»، ثم «التفاصيل»، ثم «التصنيف»، ثم «النشر». والجاهزية من الخادم بندًا ببند.
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BlockSettings } from './BlockSettings';
import { consentMethodLabel } from './EditorDialogs';
import { formatDate, formatDateTime } from './editorFormat';
import { RESOURCE_TYPES, resourceTypeLabel } from '../../utils/apiMappers';
import { uploadAccept } from '../../utils/uploads';
import { docText } from '../../utils/editorState';

const STATUS = { draft: 'مسودّة', published: 'منشورة', scheduled: 'مجدولة' };
const REGIONS = [['GAZA', 'غزة'], ['WEST_BANK', 'الضفة الغربية'], ['OTHER', 'أخرى']];

function readFolded() {
  try {
    return JSON.parse(window.localStorage.getItem('wepal-editor-folded') ?? '{}') ?? {};
  } catch {
    return {};
  }
}

function Card({ id, title, summary, children }) {
  const [folded, setFolded] = useState(() => readFolded()[id] === true);
  const toggle = () => {
    const next = !folded;
    setFolded(next);
    try {
      window.localStorage.setItem('wepal-editor-folded', JSON.stringify({ ...readFolded(), [id]: next }));
    } catch {
      // التخزين محجوب: يبقى الطيّ لهذه الزيارة
    }
  };
  return (
    <section className="azq-ed-card-section">
      <button type="button" className="azq-ed-card-head" aria-expanded={!folded} onClick={toggle}>
        <span>{title}</span>
        {summary && <small>{summary}</small>}
      </button>
      {!folded && <div className="azq-ed-card-body">{children}</div>}
    </section>
  );
}

const VERSION = { ar: 'العربية', en: 'الإنجليزية' };

/** رابط داخل النص الأصلي يُفتح في تبويب جديد، فلا يغادر المترجم ورقته. */
function openLinkAside(event) {
  const link = event.target.closest?.('a[href]');
  if (!link) return;
  event.preventDefault();
  window.open(link.href, '_blank', 'noopener,noreferrer');
}

/**
 * «الأصل» (للقراءة فقط): عنوان النسخة التي تُترجم منها المادة، ثم متنها HTML كما تعرضه البوابة (bodyHtml من الخادم،
 * عناوين ونقاط وروابط) بشكل ورقة المحرّر، وإلا النص العادي. ورابط يفتح تلك النسخة نفسها في المحرّر.
 */
export function SourcePanel({ type, sourceRef, source }) {
  const lang = source?.locale ?? sourceRef.locale;
  const dir = lang === 'en' ? 'ltr' : 'rtl';
  const f = source?.fields ?? {};
  const title = type === 'story' ? f.name : f.title?.[lang];
  const lead = f.excerpt?.[lang] ?? f.quote?.[lang];
  const plain = source?.bodyHtml ? '' : docText(f.body?.[lang]);
  return (
    <div className="azq-ed-aside-body azq-ed-source">
      <div className="azq-ed-source-head">
        <span className="azq-ed-hint">النسخة {VERSION[lang]} · للقراءة فقط</span>
        <Link className="azq-ed-link" to={`/admin/editor/${type}/${sourceRef.id}`}>فتح النسخة {VERSION[lang]}</Link>
      </div>
      {!source && <p className="azq-ed-hint" role="status">يُحمَّل النص الأصلي…</p>}
      {source?.failed && <p className="azq-ed-hint" role="alert">تعذّر تحميل النص الأصلي. افتح النسخة {VERSION[lang]} من الرابط أعلاه.</p>}
      {source && !source.failed && (
        <article className="azq-ed-source-doc" lang={lang} dir={dir}>
          <h2 className="azq-ed-source-title">{title || '(بلا عنوان)'}</h2>
          {lead && <p className="azq-ed-source-lead">{lead}</p>}
          {source.bodyHtml
            // HTML من BlockRenderer في الخادم (مهرَّب ومن مخطط مغلق)، كما تعرضه البوابة في ArticleBody
            ? <div className="azq-ed-prose azq-ed-source-body" onClick={openLinkAside} dangerouslySetInnerHTML={{ __html: source.bodyHtml }} />
            : plain && <div className="azq-ed-source-body is-plain">{plain}</div>}
        </article>
      )}
    </div>
  );
}

/** حلقة بالنسبة وقائمة بنود بثلاث حالات، وفي كل بند غير مكتمل «انتقل». */
export function Readiness({ readiness, onGo }) {
  const items = readiness?.items ?? [];
  const percent = readiness?.percent ?? 0;
  return (
    <div className="azq-ed-readiness">
      <div className="azq-ed-ring" style={{ '--p': percent }} role="img" aria-label={`الجاهزية ${percent}%`}><span>{percent}%</span></div>
      <ul>
        {items.map((item) => (
          <li key={`${item.key}-${item.block ?? ''}`} className={`azq-ed-ready-${item.state}`}>
            <span className="azq-ed-ready-dot" aria-hidden="true" />
            <span className="azq-ed-ready-text">{item.message}{item.state === 'advice' ? ' (نصيحة)' : ''}</span>
            {item.state !== 'done' && <button type="button" className="azq-ed-link" onClick={() => onGo(item)}>انتقل</button>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PostDetails({ fields, setField, locale }) {
  const news = fields.category === 'news';
  return (
    <>
      <div className="azq-ed-field" id="ed-category" tabIndex={-1}>
        <span className="azq-ed-field-label">النوع</span>
        <div className="azq-ed-choice" role="radiogroup" aria-label="النوع">
          <button type="button" role="radio" aria-checked={news} className={news ? 'is-active' : ''} onClick={() => setField('category', 'news')}>خبر</button>
          <button type="button" role="radio" aria-checked={!news} className={!news ? 'is-active' : ''} onClick={() => !news || setField('category', 'تحليلات')}>تحليل</button>
        </div>
      </div>
      {news ? (
        <>
          <label className="azq-ed-field" htmlFor="ed-sourceName">
            <span className="azq-ed-field-label">المصدر</span>
            <input id="ed-sourceName" className="azq-ed-input" value={fields.sourceName ?? ''} onChange={(e) => setField('sourceName', e.target.value)} placeholder="وكالة وفا" />
          </label>
          <label className="azq-ed-field" htmlFor="ed-sourceUrl">
            <span className="azq-ed-field-label">رابط المصدر</span>
            <input id="ed-sourceUrl" className="azq-ed-input" dir="ltr" type="url" value={fields.sourceUrl ?? ''} onChange={(e) => setField('sourceUrl', e.target.value)} placeholder="https://" />
          </label>
        </>
      ) : (
        <label className="azq-ed-field" htmlFor="ed-categoryName">
          <span className="azq-ed-field-label">تصنيف التحليل</span>
          <input id="ed-categoryName" className="azq-ed-input" value={fields.category ?? ''} onChange={(e) => setField('category', e.target.value)} list="ed-categories" />
          <datalist id="ed-categories"><option value="تحليلات" /><option value="تجارب" /></datalist>
        </label>
      )}
      <label className="azq-ed-field" htmlFor="ed-authorLabel">
        <span className="azq-ed-field-label">الكاتب</span>
        <input id="ed-authorLabel" className="azq-ed-input" dir={locale === 'en' ? 'ltr' : 'rtl'} value={fields.authorLabel ?? ''} onChange={(e) => setField('authorLabel', e.target.value)} />
      </label>
    </>
  );
}

function StoryDetails({ item, fields, setField, setLocalized, locale, onRecordConsent, onWithdrawConsent }) {
  const consent = item.consent;
  const dir = locale === 'en' ? 'ltr' : 'rtl';
  return (
    <>
      <label className="azq-ed-field" htmlFor="ed-name">
        <span className="azq-ed-field-label">اسم صاحب القصة</span>
        <input id="ed-name" className="azq-ed-input" value={fields.name ?? ''} onChange={(e) => setField('name', e.target.value)} />
        <small className="azq-ed-hint">يظهر على البطاقة وتحت الاقتباس.</small>
      </label>
      <label className="azq-ed-field" htmlFor="ed-roleLabel">
        <span className="azq-ed-field-label">صفته أو مدينته</span>
        <input id="ed-roleLabel" className="azq-ed-input" dir={dir} value={fields.roleLabel?.[locale] ?? ''} onChange={(e) => setLocalized('roleLabel', e.target.value)} placeholder="عضو فريق «مياه الوسطى»، دير البلح" />
      </label>
      <label className="azq-ed-field" htmlFor="ed-region">
        <span className="azq-ed-field-label">المنطقة</span>
        <select id="ed-region" className="azq-ed-input" value={fields.region ?? 'OTHER'} onChange={(e) => setField('region', e.target.value)}>
          {REGIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <div className="azq-ed-field" id="ed-consent">
        <span className="azq-ed-field-label">موافقة صاحب القصة</span>
        {consent?.active ? (
          <p className="azq-ed-consent-ok">
            {consent.givenBy} · {consentMethodLabel(consent.method)} · {formatDate(consent.givenOn)}{consent.recordedBy ? ` · سجّلها ${consent.recordedBy.name}` : ''}
            <br /><small>تشمل: النشر بالاسم والصفة{consent.coversPhoto ? '، والصورة' : ''}</small>
          </p>
        ) : (
          <p className="azq-ed-consent-missing">{consent ? `سُحبت الموافقة في ${formatDateTime(consent.withdrawnAt)}. لا تُنشر تعديلات حتى تُسجَّل موافقة جديدة.` : 'لم تُسجَّل موافقة. لا تُنشر القصة ولا صورتها قبلها.'}</p>
        )}
        <div className="azq-ed-row">
          <button type="button" className="azq-ed-btn-secondary" onClick={onRecordConsent}>{consent?.active ? 'تسجيل موافقة جديدة' : 'تسجيل الموافقة'}</button>
          {consent?.active && <button type="button" className="azq-ed-link-danger" onClick={onWithdrawConsent}>سحب الموافقة</button>}
        </div>
      </div>
    </>
  );
}

const FAQ_CATEGORIES = [['about', 'عن المنصة'], ['membership', 'العضوية'], ['content', 'المحتوى'], ['participation', 'المشاركة'], ['privacy', 'الخصوصية']];

// ملف التحميل يُرفع على المادة مباشرة (كالغلاف)، لا ينتظر «حفظ» ولا «نشر».
function ResourceFile({ file, onReplaceFile }) {
  const [state, setState] = useState({ busy: false, error: '' });
  const upload = async (e) => {
    const chosen = e.target.files?.[0];
    e.target.value = '';
    if (!chosen) return;
    setState({ busy: true, error: '' });
    try {
      await onReplaceFile(chosen);
      setState({ busy: false, error: '' });
    } catch (err) {
      setState({ busy: false, error: err.message || 'تعذّر رفع الملف.' });
    }
  };
  return (
    <div className="azq-ed-field" id="ed-file">
      <span className="azq-ed-field-label">ملف للتحميل</span>
      <small className="azq-ed-hint">{file?.hasFile ? `الملف الحالي: ${file.format ?? 'ملف'}. رفع ملف آخر يستبدله فورًا.` : 'لا ملف بعد. يكفي الرابط الخارجي إن لم يكن للمادة ملف.'}</small>
      <label className="azq-ed-link" htmlFor="ed-file-input" aria-busy={state.busy}>
        {state.busy ? 'نرفع الملف…' : file?.hasFile ? 'استبدال الملف' : '+ رفع ملف'}
      </label>
      <input id="ed-file-input" type="file" className="sr-only" accept={uploadAccept(null)} disabled={state.busy} onChange={upload} />
      {state.error && <small className="azq-ed-hint" role="alert">{state.error}</small>}
    </div>
  );
}

function ResourceDetails({ item, fields, setField, locale, onAddImage, onReplaceFile }) {
  const gallery = Array.isArray(fields.gallery) ? fields.gallery : [];
  const setImage = (i, patch) => setField('gallery', gallery.map((img, j) => (j === i ? { ...img, ...patch } : img)));
  return (
    <>
      {/* بلا نوع افتراضي: «دليل» كان يُختار وحده لكل مصدر. النوع مطلوب للنشر */}
      <label className="azq-ed-field" htmlFor="ed-resourceType">
        <span className="azq-ed-field-label">نوع المصدر</span>
        <select id="ed-resourceType" className="azq-ed-input" value={fields.resourceType ?? ''} onChange={(e) => setField('resourceType', e.target.value || null)}>
          <option value="" disabled>اختر النوع…</option>
          {RESOURCE_TYPES.map((v) => <option key={v} value={v}>{resourceTypeLabel(v, 'ar')}</option>)}
        </select>
      </label>
      <label className="azq-ed-field" htmlFor="ed-authorLabel">
        <span className="azq-ed-field-label">الكاتب / الجهة الناشرة</span>
        <input id="ed-authorLabel" className="azq-ed-input" dir="auto" maxLength={120} value={fields.authorLabel ?? ''} onChange={(e) => setField('authorLabel', e.target.value)} />
        <small className="azq-ed-hint">كما في المراجع، وإن وُجد الاثنان فبينهما فاصلة: «جميل هلال، شبكة السياسات الفلسطينية».</small>
      </label>
      <label className="azq-ed-field" htmlFor="ed-issued">
        <span className="azq-ed-field-label">تاريخ الإصدار</span>
        <input id="ed-issued" className="azq-ed-input" dir="auto" maxLength={60} value={fields.issued ?? ''} onChange={(e) => setField('issued', e.target.value || null)} placeholder={locale === 'en' ? 'November 1947' : 'نوفمبر 1947'} />
        <small className="azq-ed-hint">تاريخ صدور المصدر نفسه كما تعرفه: سنة («2025») أو شهر وسنة أو يوم كامل. غير تاريخ نشره في المنصة.</small>
      </label>
      <label className="azq-ed-field" htmlFor="ed-externalUrl">
        <span className="azq-ed-field-label">رابط المصدر (اختياري)</span>
        <input id="ed-externalUrl" className="azq-ed-input" dir="ltr" type="url" value={fields.externalUrl ?? ''} onChange={(e) => setField('externalUrl', e.target.value)} placeholder="https://" />
        <small className="azq-ed-hint">صفحة المصدر أو ملفّه (PDF) على موقع ناشره. ورابط يوتيوب أو فيميو أو بودكاست يُشغَّل داخل الصفحة حين يضغط الزائر.</small>
      </label>
      <ResourceFile file={item.file} onReplaceFile={onReplaceFile} />
      <div className="azq-ed-field" id="ed-gallery">
        <span className="azq-ed-field-label">صور أخرى ({gallery.length} / 12)</span>
        <small className="azq-ed-hint">صورة الغلاف تبقى صورة العرض في المكتبة. ولكل صورة نصّ بديل بلغة المادة.</small>
        {gallery.map((img, i) => (
          <div key={`${img.src}-${i}`} className="azq-ed-item">
            <input className="azq-ed-input" dir={locale === 'en' ? 'ltr' : 'rtl'} value={img.alt ?? ''} placeholder="النص البديل" onChange={(e) => setImage(i, { alt: e.target.value })} />
            <button type="button" className="azq-ed-link-danger" onClick={() => setField('gallery', gallery.filter((_, j) => j !== i))}>حذف الصورة</button>
          </div>
        ))}
        {gallery.length < 12 && <button type="button" className="azq-ed-link" onClick={async () => { const img = await onAddImage(); if (img) setField('gallery', [...gallery, img]); }}>+ إضافة صورة</button>}
      </div>
    </>
  );
}

export function SettingsAside({ item, type, fields, setField, setLocalized, locale, editor, tab, onTab, onGo, onClose, sourceRef, source, onReplaceUrl, onUploadImage, onRecordConsent, onWithdrawConsent, onCreateTranslation, onAddGalleryImage, onReplaceFile }) {
  const readiness = item.readiness;
  const missing = readiness?.blocking ?? 0;
  const other = item.translations?.[0];
  return (
    <aside className="azq-ed-aside" aria-label="إعدادات المادة">
      <div className="azq-ed-aside-head">
        <div className="azq-ed-aside-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === 'item'} onClick={() => onTab('item')}>المادة</button>
          <button type="button" role="tab" aria-selected={tab === 'block'} onClick={() => onTab('block')}>الكتلة</button>
          {sourceRef && <button type="button" role="tab" aria-selected={tab === 'source'} onClick={() => onTab('source')}>الأصل</button>}
        </div>
        <button type="button" className="azq-ed-icon-btn" aria-label="إغلاق اللوحة" onClick={onClose}>×</button>
      </div>
      {tab === 'source' && sourceRef ? (
        <SourcePanel type={type} sourceRef={sourceRef} source={source} />
      ) : tab === 'block' ? (
        <BlockSettings editor={editor} dir={locale === 'en' ? 'ltr' : 'rtl'} onReplaceUrl={onReplaceUrl} onUploadImage={onUploadImage} />
      ) : (
        <div className="azq-ed-aside-body">
          <Card id="readiness" title="جاهزية النشر" summary={missing ? `ينقص ${missing}` : 'جاهزة'}>
            <Readiness readiness={readiness} onGo={onGo} />
          </Card>
          <Card id="details" title="التفاصيل">
            {type === 'story' && <StoryDetails item={item} fields={fields} setField={setField} setLocalized={setLocalized} locale={locale} onRecordConsent={onRecordConsent} onWithdrawConsent={onWithdrawConsent} />}
            {type === 'post' && <PostDetails fields={fields} setField={setField} locale={locale} />}
            {type === 'resource' && <ResourceDetails item={item} fields={fields} setField={setField} locale={locale} onAddImage={onAddGalleryImage} onReplaceFile={onReplaceFile} />}
            {type === 'faq' && (
              <label className="azq-ed-field" htmlFor="ed-category">
                <span className="azq-ed-field-label">القسم</span>
                <select id="ed-category" className="azq-ed-input" value={fields.category ?? 'about'} onChange={(e) => setField('category', e.target.value)}>
                  {FAQ_CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
            )}
          </Card>
          {type === 'story' && (
            <Card id="classification" title="التصنيف">
              <label className="azq-ed-check"><input type="checkbox" checked={!!fields.featured} onChange={(e) => setField('featured', e.target.checked)} /> مميّزة في الرئيسية</label>
            </Card>
          )}
          <Card id="publish" title="النشر" summary={STATUS[item.status]}>
            <dl className="azq-ed-meta">
              <div><dt>الحالة</dt><dd>{STATUS[item.status]}{item.workingCopy ? ' · نسخة عمل غير منشورة' : ''}</dd></div>
              {item.publishedAt && <div><dt>{item.status === 'scheduled' ? 'موعد النشر' : 'تاريخ النشر'}</dt><dd>{formatDateTime(item.publishedAt)} (توقيت فلسطين)</dd></div>}
              {item.updatedBy && <div><dt>آخر تعديل</dt><dd>{item.updatedBy.name} · {formatDateTime(item.updatedAt)}</dd></div>}
              <div>
                <dt>اللغات</dt>
                <dd>
                  {other ? `${locale === 'ar' ? 'العربية والإنجليزية' : 'الإنجليزية والعربية'}` : `${locale === 'ar' ? 'العربية' : 'الإنجليزية'} فقط. `}
                  {!other && <button type="button" className="azq-ed-link" onClick={onCreateTranslation}>أنشئ النسخة {locale === 'ar' ? 'الإنجليزية' : 'العربية'}</button>}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      )}
    </aside>
  );
}
