// نوافذ المحرّر (editor/editor-dialogs.tsx في المنتدى): رابط التضمين، ورفع صورة بنصّها البديل، وتسجيل الموافقة،
// والتعارض («قارن» و«احتفظ بنسختي»)، وحارس المغادرة، والتأكيد. كل نافذة تذكر العاقبة بفعل صريح.
import { useEffect, useRef, useState } from 'react';
import { listEditorImages, resolveEmbed, updateEditorImageAlt, uploadEditorFile, uploadEditorImage } from '../../api/editor';
import { listResourcesForAdmin } from '../../api/admin';
import { diffFields, uploadBlocker } from '../../utils/editorState';
import { formatDateTime } from './editorFormat';

export function Dialog({ title, children, onClose, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal?.();
    return () => dialog?.close?.();
  }, []);
  return (
    <dialog ref={ref} className={`azq-ed-dialog${wide ? ' is-wide' : ''}`} aria-label={title} onCancel={(e) => { e.preventDefault(); onClose(); }}>
      <h2 className="azq-ed-dialog-title">{title}</h2>
      {children}
    </dialog>
  );
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // Images::MAX_KB في الخادم

/**
 * اختيار صورة بالعربية بدل «Choose File / No file chosen» الأصلية: منطقة تُضغط أو تُسحب إليها الصورة،
 * وتُعرض الصورة كاملة بعد اختيارها، ويُرفض النوع أو الحجم غير المقبول هنا قبل الرفع.
 */
export function ImagePicker({ file, onChange, label = 'الصورة', hint }) {
  const [preview, setPreview] = useState(null);
  const [over, setOver] = useState(false);
  const [error, setError] = useState(null);
  const previewUrl = useRef(null);
  useEffect(() => () => { if (previewUrl.current) URL.revokeObjectURL(previewUrl.current); }, []);
  const take = (picked) => {
    if (!picked) return;
    if (!IMAGE_TYPES.includes(picked.type)) return setError('الصيغة غير مقبولة: اختر صورة JPG أو PNG أو WebP.');
    if (picked.size > IMAGE_MAX_BYTES) return setError('الصورة أكبر من 5 ميغابايت. صغّرها ثم أعد المحاولة.');
    setError(null);
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = URL.createObjectURL?.(picked) ?? null;
    setPreview(previewUrl.current);
    onChange(picked);
  };
  return (
    <div className="azq-ed-field">
      <span className="azq-ed-field-label">{label}</span>
      <label className={`azq-ed-drop${over ? ' is-over' : ''}${file ? ' has-file' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer?.files?.[0]); }}>
        <input type="file" className="sr-only" accept={IMAGE_TYPES.join(',')} onChange={(e) => { take(e.target.files?.[0] ?? null); e.target.value = ''; }} />
        {file && preview && <img src={preview} alt="" />}
        <span className="azq-ed-drop-text">
          {file
            ? <><strong dir="auto">{file.name}</strong> <span className="azq-ed-drop-action">تغيير الصورة</span></>
            : <><strong className="azq-ed-drop-action">اختر صورة</strong> أو اسحبها إلى هنا</>}
        </span>
        <small className="azq-ed-hint">{hint ?? 'JPG أو PNG أو WebP، حتى 5 ميغابايت، وعرضها 480 بكسل على الأقل.'}</small>
      </label>
      {error && <p className="azq-ed-error" role="alert">{error}</p>}
    </div>
  );
}

const HINT_TITLES = { video: 'رابط الفيديو', audio: 'رابط الحلقة أو البرنامج', post: 'رابط المنشور على X', link: 'الرابط' };
const HINT_HELP = {
  video: 'يوتيوب أو فيميو أو فيديو فيسبوك. لا يُحمَّل المشغّل حتى يضغط الزائر.',
  audio: 'ساوندكلاود، أو سبوتيفاي، أو بودكاست آبل، أو رابط خلاصة RSS.',
  post: 'رابط منشور بعينه على x.com.',
  link: 'أي رابط https: يصير بطاقة بالعنوان والموقع والصورة.',
};

/** «رابط الفيديو» وأخواتها: يكتشف الخادم المزوّد، والرفض يقول السبب ويذكر المدعوم. */
export function EmbedDialog({ hint = 'video', initialUrl = '', onDone, onClose }) {
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (asHint = hint) => {
    setBusy(true);
    setError(null);
    try {
      onDone(await resolveEmbed(url.trim(), asHint));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };
  const tracker = error?.message?.includes('بطاقة رابط') && hint !== 'link';
  return (
    <Dialog title={HINT_TITLES[hint] ?? 'الرابط'} onClose={onClose}>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <label className="azq-ed-field">
          <span className="azq-ed-field-label">الرابط</span>
          <input autoFocus type="url" dir="ltr" className="azq-ed-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" required />
          <small className="azq-ed-hint">{HINT_HELP[hint]}</small>
        </label>
        {error && <p className="azq-ed-error" role="alert">{error.message}</p>}
        <div className="azq-ed-dialog-actions">
          {tracker && <button type="button" className="azq-ed-btn-secondary" onClick={() => submit('link')} disabled={busy}>استعمله بطاقة رابط</button>}
          <button type="button" className="azq-ed-btn-ghost" onClick={onClose}>إلغاء</button>
          <button type="submit" className="azq-ed-btn-primary" disabled={busy || !url.trim()}>{busy ? 'نتحقّق…' : 'إدراج'}</button>
        </div>
      </form>
    </Dialog>
  );
}

/**
 * مكتبة الوسائط (MediaPicker): شبكة الصور السابقة ببحث، وتحت كل صورة شارتا «ع En» تقولان أيّ نصّ بديل مكتوب.
 * اختيار صورة يعرض نصّها البديل بلغة المادة (يُكتب هنا فيُحفظ في المكتبة إن لم يكن موجودًا) ونصّها باللغة الأخرى للاطلاع.
 */
function LibraryGrid({ locale, onDone }) {
  const [search, setSearch] = useState('');
  const [images, setImages] = useState(null);
  const [picked, setPicked] = useState(null);
  const [alt, setAlt] = useState('');
  const [error, setError] = useState(null);
  const other = locale === 'en' ? 'ar' : 'en';
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      listEditorImages({ search }).then((res) => alive && setImages(res.data ?? [])).catch((e) => alive && setError(e));
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [search]);
  const choose = async () => {
    try {
      if ((picked.alt?.[locale] ?? '') !== alt.trim()) await updateEditorImageAlt(picked.id, { [locale]: alt.trim() });
      onDone({ src: picked.path, alt: alt.trim(), width: picked.width, height: picked.height });
    } catch (e) {
      setError(e);
    }
  };
  return (
    <div className="azq-ed-library">
      <input type="search" className="azq-ed-input" placeholder="ابحث في الصور بنصّها البديل" value={search} onChange={(e) => setSearch(e.target.value)} />
      {images === null && !error && <p className="azq-ed-hint">…</p>}
      {images?.length === 0 && <p className="azq-ed-hint">لا صور بعد. ارفع صورة من «رفع صورة».</p>}
      <div className="azq-ed-library-grid" role="listbox" aria-label="صور المكتبة">
        {images?.map((img) => (
          <button key={img.id} type="button" role="option" aria-selected={picked?.id === img.id} className={`azq-ed-library-tile${picked?.id === img.id ? ' is-picked' : ''}`}
            onClick={() => { setPicked(img); setAlt(img.alt?.[locale] ?? ''); }}>
            <img src={img.url} alt={img.alt?.[locale] ?? img.alt?.ar ?? ''} loading="lazy" />
            <span className="azq-ed-library-langs">
              <span className={img.alt?.ar ? 'is-on' : ''}>ع</span><span className={img.alt?.en ? 'is-on' : ''}>En</span>
            </span>
          </button>
        ))}
      </div>
      {picked && (
        <>
          <label className="azq-ed-field">
            <span className="azq-ed-field-label">النص البديل ({locale === 'en' ? 'بالإنجليزية' : 'بالعربية'})</span>
            <input className="azq-ed-input" dir={locale === 'en' ? 'ltr' : 'rtl'} value={alt} onChange={(e) => setAlt(e.target.value)} required minLength={3} />
            {picked.alt?.[other] && <small className="azq-ed-hint">{other === 'en' ? 'بالإنجليزية' : 'بالعربية'}: {picked.alt[other]}</small>}
          </label>
          <div className="azq-ed-dialog-actions">
            <button type="button" className="azq-ed-btn-primary" disabled={alt.trim().length < 3} onClick={choose}>إدراج</button>
          </div>
        </>
      )}
      {error && <p className="azq-ed-error" role="alert">{error.message}</p>}
    </div>
  );
}

/** صورة لكتلة في المتن: من المكتبة، أو رفع جديد بنصّه البديل بلغة المادة (مطلوب). */
export function ImageDialog({ locale, onDone, onClose }) {
  const [source, setSource] = useState('library');
  const [file, setFile] = useState(null);
  const [alt, setAlt] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      // الخادم يطلب نصًّا بديلًا عربيًّا للصورة في المكتبة؛ في المادة الإنجليزية نكتبه في الحقلين ويُعدَّل لاحقًا
      const image = await uploadEditorImage(file, locale === 'en' ? { ar: alt, en: alt } : { ar: alt });
      onDone({ src: image.path, alt, width: image.width, height: image.height });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog title="صورة من المكتبة" onClose={onClose} wide={source === 'library'}>
      <div className="azq-ed-choice" role="tablist" aria-label="مصدر الصورة">
        <button type="button" role="tab" aria-selected={source === 'library'} className={source === 'library' ? 'is-active' : ''} onClick={() => setSource('library')}>المكتبة</button>
        <button type="button" role="tab" aria-selected={source === 'upload'} className={source === 'upload' ? 'is-active' : ''} onClick={() => setSource('upload')}>رفع صورة</button>
      </div>
      {source === 'library' ? <LibraryGrid locale={locale} onDone={onDone} /> : (
      <form onSubmit={submit}>
        <ImagePicker file={file} onChange={setFile} />
        <label className="azq-ed-field">
          <span className="azq-ed-field-label">النص البديل</span>
          <input type="text" className="azq-ed-input" dir={locale === 'en' ? 'ltr' : 'rtl'} value={alt} onChange={(e) => setAlt(e.target.value)} required minLength={3} />
          <small className="azq-ed-hint">يصف الصورة لمن لا يراها. مثال: «شابّات في ورشة الحوار في دير البلح».</small>
        </label>
        {error && <p className="azq-ed-error" role="alert">{error.message}</p>}
        <div className="azq-ed-dialog-actions">
          <button type="button" className="azq-ed-btn-ghost" onClick={onClose}>إلغاء</button>
          <button type="submit" className="azq-ed-btn-primary" disabled={busy || !!uploadBlocker(file, alt)}>{busy ? 'يُرفع…' : 'رفع وإدراج'}</button>
        </div>
        {!busy && uploadBlocker(file, alt) && <p className="azq-ed-hint azq-ed-dialog-why">{uploadBlocker(file, alt)}</p>}
      </form>
      )}
    </Dialog>
  );
}

const METHODS = [
  ['signed_paper', 'ورقة موقّعة'],
  ['written_message', 'رسالة مكتوبة منه'],
  ['verbal_witnessed', 'موافقة شفهية أمام شاهد من الطاقم'],
];
export const consentMethodLabel = (m) => METHODS.find(([v]) => v === m)?.[1] ?? m;

/** «تسجيل الموافقة»: من وافق، وكيف، ومتى، وما تشمله. والورقة الموقّعة نفسها في ملفات البرنامج. */
export function ConsentDialog({ defaultName, hasPhoto, onSubmit, onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ givenBy: defaultName ?? '', method: 'signed_paper', givenOn: today, coversPhoto: hasPhoto, note: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  return (
    <Dialog title="تسجيل موافقة صاحب القصة" onClose={onClose}>
      <form onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await onSubmit({ ...form, coversName: true, note: form.note || null });
        } catch (err) {
          setError(err);
          setBusy(false);
        }
      }}>
        <label className="azq-ed-field"><span className="azq-ed-field-label">من وافق</span><input className="azq-ed-input" value={form.givenBy} onChange={(e) => set({ givenBy: e.target.value })} required /></label>
        <fieldset className="azq-ed-field">
          <legend className="azq-ed-field-label">طريقة الموافقة</legend>
          {METHODS.map(([v, label]) => <label key={v} className="azq-ed-check"><input type="radio" name="method" checked={form.method === v} onChange={() => set({ method: v })} /> {label}</label>)}
        </fieldset>
        <label className="azq-ed-field"><span className="azq-ed-field-label">تاريخها</span><input type="date" className="azq-ed-input" max={today} value={form.givenOn} onChange={(e) => set({ givenOn: e.target.value })} required /></label>
        <fieldset className="azq-ed-field">
          <legend className="azq-ed-field-label">ما تشمله</legend>
          <label className="azq-ed-check"><input type="checkbox" checked disabled /> النشر بالاسم والصفة (شرط)</label>
          <label className="azq-ed-check"><input type="checkbox" checked={form.coversPhoto} onChange={(e) => set({ coversPhoto: e.target.checked })} /> الصورة{hasPhoto ? ' (للقصة صورة: شرط لنشرها)' : ''}</label>
        </fieldset>
        <label className="azq-ed-field"><span className="azq-ed-field-label">ملاحظة (اختياري)</span><textarea className="azq-ed-input" rows={2} value={form.note} onChange={(e) => set({ note: e.target.value })} maxLength={1000} /></label>
        <p className="azq-ed-hint">تُحفظ ورقة الموافقة نفسها في ملفات البرنامج، لا في المنصة.</p>
        {error && <p className="azq-ed-error" role="alert">{error.message}</p>}
        <div className="azq-ed-dialog-actions">
          <button type="button" className="azq-ed-btn-ghost" onClick={onClose}>إلغاء</button>
          <button type="submit" className="azq-ed-btn-primary" disabled={busy}>تسجيل الموافقة</button>
        </div>
      </form>
    </Dialog>
  );
}

/** «عدّل محمد عيسى هذه المادة قبل دقيقتين»: «قارن» (ما يختلف فقط) و«احتفظ بنسختي» و«خذ نسخته». */
export function ConflictDialog({ conflict, mine, locale, onKeepMine, onTakeTheirs, onClose }) {
  const [compare, setCompare] = useState(false);
  const rows = diffFields(mine, conflict.theirs, locale);
  const who = conflict.updatedBy?.name ?? 'شخص آخر';
  return (
    <Dialog title={`عدّل ${who} هذه المادة بعد أن فتحتها`} onClose={onClose} wide={compare}>
      <p>{conflict.updatedAt ? `آخر حفظ له: ${formatDateTime(conflict.updatedAt)}. ` : ''}لم نحفظ تعديلاتك حتى تختار. تعديلاتك محفوظة في هذا المتصفح.</p>
      {compare && (
        <table className="azq-ed-compare">
          <thead><tr><th>الحقل</th><th>نسختك</th><th>نسخة {who}</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={3}>لا فرق في النص.</td></tr>}
            {rows.map((r) => <tr key={r.key}><th>{r.label}</th><td>{r.mine}</td><td>{r.theirs}</td></tr>)}
          </tbody>
        </table>
      )}
      <div className="azq-ed-dialog-actions">
        <button type="button" className="azq-ed-btn-ghost" onClick={() => setCompare((v) => !v)}>{compare ? 'إخفاء المقارنة' : 'قارن'}</button>
        <button type="button" className="azq-ed-btn-secondary" onClick={onTakeTheirs}>خذ نسخته (تُفقد تعديلاتك)</button>
        <button type="button" className="azq-ed-btn-primary" onClick={onKeepMine}>احتفظ بنسختي</button>
      </div>
      <p className="azq-ed-hint">«احتفظ بنسختي» يجعل نسختك الأحدث، وتبقى نسخته في «النسخ السابقة».</p>
    </Dialog>
  );
}

const DOC_ACCEPT = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.odt,.ods,.odp,.txt,.csv,.zip';
const DOC_MAX_BYTES = 20 * 1024 * 1024; // Uploads::MAX_KB في الخادم

/** اختيار ملف بالعربية (ضغط أو سحب)، ويُرفض الحجم الزائد قبل الرفع؛ الصيغة يتحقق منها الخادم من المحتوى. */
function DocPicker({ file, onChange }) {
  const [over, setOver] = useState(false);
  const [error, setError] = useState(null);
  const take = (picked) => {
    if (!picked) return;
    if (picked.size > DOC_MAX_BYTES) return setError('الملف أكبر من 20 ميغابايت.');
    setError(null);
    onChange(picked);
  };
  return (
    <div className="azq-ed-field">
      <span className="azq-ed-field-label">الملف</span>
      <label className={`azq-ed-drop${over ? ' is-over' : ''}${file ? ' has-file' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); take(e.dataTransfer?.files?.[0]); }}>
        <input type="file" className="sr-only" accept={DOC_ACCEPT} onChange={(e) => { take(e.target.files?.[0] ?? null); e.target.value = ''; }} />
        <span className="azq-ed-drop-text">
          {file
            ? <><strong dir="auto">{file.name}</strong> <span className="azq-ed-drop-action">تغيير الملف</span></>
            : <><strong className="azq-ed-drop-action">اختر ملفًا</strong> أو اسحبه إلى هنا</>}
        </span>
        <small className="azq-ed-hint">PDF أو Word أو Excel أو PowerPoint أو نص أو zip، حتى 20 ميغابايت.</small>
      </label>
      {error && <p className="azq-ed-error" role="alert">{error}</p>}
    </div>
  );
}

const ATTACH_TABS = [['upload', 'رفع ملف'], ['link', 'رابط خارجي'], ['library', 'من المكتبة']];

/**
 * «ملف أو رابط أو مصدر» داخل المتن (أمجد، 2026-11-17: «مش ضروري كل شيء من المكتبة»):
 *   رفع ملف ← كتلة «ملف للتحميل»، ورابط خارجي ← «بطاقة رابط» (أو «ملف للتحميل» باسمه إن تعذّرت قراءة الصفحة)،
 *   ومن المكتبة ← «مصدر من المكتبة». onDone يستلم الكتلة جاهزة للإدراج.
 */
export function AttachDialog({ locale, tab: initialTab = 'upload', onDone, onClose }) {
  const [tab, setTab] = useState(initialTab);
  const [file, setFile] = useState(null);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const dir = locale === 'en' ? 'ltr' : 'rtl';
  const run = async (fn) => {
    setBusy(true);
    setError(null);
    try {
      onDone(await fn());
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  };
  const upload = () => run(async () => {
    const res = await uploadEditorFile(file);
    return { type: 'file', attrs: { href: res.href, label: label.trim() || res.name } };
  });
  const link = () => run(async () => {
    const href = url.trim();
    try {
      const card = await resolveEmbed(href, 'link');
      return label.trim() ? { ...card, attrs: { ...card.attrs, title: label.trim() } } : card;
    } catch (e) {
      // صفحة لا تُقرأ (حماية أو PDF مباشر): ملف للتحميل باسمه الذي كتبه المحرّر
      if (!label.trim()) throw new Error(`${e.message} اكتب اسمًا ظاهرًا ليُضاف رابطًا للتحميل.`);
      return { type: 'file', attrs: { href, label: label.trim() } };
    }
  });
  return (
    <Dialog title="ملف أو رابط أو مصدر" onClose={onClose} wide={tab === 'library'}>
      <div className="azq-ed-choice" role="tablist" aria-label="من أين">
        {ATTACH_TABS.map(([key, name]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'is-active' : ''} onClick={() => { setTab(key); setError(null); }}>{name}</button>
        ))}
      </div>
      {tab === 'upload' && (
        <form onSubmit={(e) => { e.preventDefault(); if (file) upload(); }}>
          <DocPicker file={file} onChange={(f) => { setFile(f); if (!label) setLabel(f.name.replace(/\.[^.]+$/, '')); }} />
          <label className="azq-ed-field"><span className="azq-ed-field-label">الاسم الظاهر للزائر</span>
            <input className="azq-ed-input" dir={dir} value={label} maxLength={300} onChange={(e) => setLabel(e.target.value)} /></label>
          {error && <p className="azq-ed-error" role="alert">{error.message}</p>}
          <div className="azq-ed-dialog-actions">
            <button type="button" className="azq-ed-btn-ghost" onClick={onClose}>إلغاء</button>
            <button type="submit" className="azq-ed-btn-primary" disabled={busy || !file}>{busy ? 'يُرفع…' : 'رفع وإدراج'}</button>
          </div>
          {!busy && !file && <p className="azq-ed-hint azq-ed-dialog-why">اختر ملفًا أولًا.</p>}
        </form>
      )}
      {tab === 'link' && (
        <form onSubmit={(e) => { e.preventDefault(); link(); }}>
          <label className="azq-ed-field"><span className="azq-ed-field-label">الرابط</span>
            <input autoFocus type="url" dir="ltr" className="azq-ed-input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" required />
            <small className="azq-ed-hint">صفحة أو ملف PDF على موقع ناشره. يصير بطاقة بالعنوان والموقع والصورة.</small></label>
          <label className="azq-ed-field"><span className="azq-ed-field-label">الاسم الظاهر (اختياري)</span>
            <input className="azq-ed-input" dir={dir} value={label} maxLength={300} onChange={(e) => setLabel(e.target.value)} /></label>
          {error && <p className="azq-ed-error" role="alert">{error.message}</p>}
          <div className="azq-ed-dialog-actions">
            <button type="button" className="azq-ed-btn-ghost" onClick={onClose}>إلغاء</button>
            <button type="submit" className="azq-ed-btn-primary" disabled={busy || !url.trim()}>{busy ? 'نقرأ الرابط…' : 'إدراج'}</button>
          </div>
        </form>
      )}
      {tab === 'library' && <LibraryPick locale={locale} onPick={(id) => onDone({ type: 'resource', attrs: { id } })} onClose={onClose} />}
    </Dialog>
  );
}

/** مصدر منشور من المكتبة: مفتاح «بلغة هذه المادة / كل المصادر» وشارة لغة لكل مصدر. */
function LibraryPick({ locale, onPick, onClose }) {
  const [scope, setScope] = useState('locale');
  const [items, setItems] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    let alive = true;
    listResourcesForAdmin({ status: 'published', perPage: 100 })
      .then((res) => alive && setItems(res?.data ?? []))
      .catch((e) => alive && setError(e));
    return () => { alive = false; };
  }, []);
  const shown = (items ?? []).filter((f) => scope === 'all' || (f.locale ?? 'ar') === locale);
  return (
    <>
      <div className="azq-ed-choice" role="radiogroup" aria-label="المصادر">
        <button type="button" role="radio" aria-checked={scope === 'locale'} className={scope === 'locale' ? 'is-active' : ''} onClick={() => setScope('locale')}>بلغة هذه المادة</button>
        <button type="button" role="radio" aria-checked={scope === 'all'} className={scope === 'all' ? 'is-active' : ''} onClick={() => setScope('all')}>كل المصادر</button>
      </div>
      {items === null && !error && <p className="azq-ed-hint">…</p>}
      {items !== null && shown.length === 0 && <p className="azq-ed-hint">لا مصادر منشورة {scope === 'locale' ? 'بهذه اللغة. جرّب «كل المصادر».' : 'في المكتبة بعد.'}</p>}
      <ul className="azq-ed-file-list">
        {shown.map((f) => (
          <li key={f.id}>
            <button type="button" className="azq-ed-file-item" onClick={() => onPick(f.id)}>
              <span className="azq-ed-file-lang">{(f.locale ?? 'ar') === 'en' ? 'En' : 'ع'}</span>
              <span dir="auto">{f.title}</span>
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="azq-ed-error" role="alert">{error.message}</p>}
      <div className="azq-ed-dialog-actions"><button type="button" className="azq-ed-btn-ghost" onClick={onClose}>إلغاء</button></div>
    </>
  );
}

export function ConfirmDialog({ title, body, confirmLabel, danger, onConfirm, onClose }) {
  return (
    <Dialog title={title} onClose={onClose}>
      {body && <p>{body}</p>}
      <div className="azq-ed-dialog-actions">
        <button type="button" className="azq-ed-btn-ghost" onClick={onClose}>إلغاء</button>
        <button type="button" className={danger ? 'azq-ed-btn-danger' : 'azq-ed-btn-primary'} onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Dialog>
  );
}
