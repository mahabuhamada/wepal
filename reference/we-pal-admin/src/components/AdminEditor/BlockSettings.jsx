// تبويب «الكتلة» في اللوحة الجانبية (editor/block-settings.tsx في المنتدى): إعدادات الكتلة المحدّدة،
// و«لم تُحدَّد كتلة» حين لا شيء محدّدًا. التعديل يكتب في خصائص الكتلة نفسها (updateAttributes).
import { useEffect, useState } from 'react';
import { SETTINGS_BLOCKS } from './blockNodes';
import { listResourcesForAdmin } from '../../api/admin';

const NAMES = {
  figure: 'صورة', video: 'فيديو', audio: 'صوت أو بودكاست', gallery: 'معرض صور', file: 'ملف للتحميل', xPost: 'منشور على X', linkCard: 'بطاقة رابط',
  mediaText: 'صورة ونص', callout: 'صندوق ملاحظة', buttons: 'أزرار', stats: 'أرقام', quoteCard: 'بطاقة اقتباس', storyQuote: 'كلام صاحب القصة',
  faq: 'أسئلة شائعة', faqItem: 'سؤال', map: 'خريطة', resource: 'مصدر من المكتبة', horizontalRule: 'فاصل',
};

/** أقرب كتلة لها إعدادات حول المؤشر: { name, attrs } أو null. */
export function currentBlock(editor) {
  if (!editor) return null;
  const { selection } = editor.state;
  if (selection.node && SETTINGS_BLOCKS.has(selection.node.type.name)) return { name: selection.node.type.name, attrs: selection.node.attrs };
  const { $from } = selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (SETTINGS_BLOCKS.has(node.type.name)) return { name: node.type.name, attrs: node.attrs };
  }
  return null;
}

function Field({ label, children, hint }) {
  return (
    <label className="azq-ed-field">
      <span className="azq-ed-field-label">{label}</span>
      {children}
      {hint && <small className="azq-ed-hint">{hint}</small>}
    </label>
  );
}

const Text = ({ value, onChange, dir, ...rest }) => <input type="text" className="azq-ed-input" dir={dir} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...rest} />;

function Choice({ value, options, onChange, label }) {
  return (
    <div className="azq-ed-choice" role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={String(v)} type="button" role="radio" aria-checked={value === v} className={value === v ? 'is-active' : ''} onClick={() => onChange(v)}>{text}</button>
      ))}
    </div>
  );
}

function Items({ items, onChange, max, min, make, render, addLabel }) {
  const set = (i, patch) => onChange(items.map((item, j) => (j === i ? { ...item, ...patch } : item)));
  return (
    <div className="azq-ed-items">
      {items.map((item, i) => (
        <fieldset key={i} className="azq-ed-item">
          {render(item, (patch) => set(i, patch), i)}
          {items.length > min && <button type="button" className="azq-ed-link-danger" onClick={() => onChange(items.filter((_, j) => j !== i))}>حذف</button>}
        </fieldset>
      ))}
      {items.length < max && <button type="button" className="azq-ed-link" onClick={() => onChange([...items, make()])}>{addLabel}</button>}
    </div>
  );
}

function ResourcePicker({ value, onChange }) {
  const [resources, setResources] = useState(null);
  useEffect(() => {
    let alive = true;
    listResourcesForAdmin({ status: 'published', perPage: 100 }).then((res) => alive && setResources(res?.data ?? [])).catch(() => alive && setResources([]));
    return () => { alive = false; };
  }, []);
  if (resources === null) return <p className="azq-ed-hint">…</p>;
  return (
    <select className="azq-ed-input" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">اختر مادة منشورة من المكتبة</option>
      {resources.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
    </select>
  );
}

/**
 * @param {object} props
 * @param {object} props.editor محرّر Tiptap
 * @param {'rtl'|'ltr'} props.dir لغة المادة للنصوص (النص البديل، والتعليق، ونص الزر)
 * @param {(hint: string) => void} props.onReplaceUrl «استبدال الرابط» للتضمين
 * @param {() => Promise<object|null>} props.onUploadImage رفع صورة إلى المكتبة: { src, alt, width, height }
 */
export function BlockSettings({ editor, dir, onReplaceUrl, onUploadImage }) {
  const [, force] = useState(0);
  useEffect(() => {
    if (!editor) return undefined;
    const rerender = () => force((n) => n + 1);
    editor.on('selectionUpdate', rerender);
    editor.on('transaction', rerender);
    return () => {
      editor.off('selectionUpdate', rerender);
      editor.off('transaction', rerender);
    };
  }, [editor]);

  const block = currentBlock(editor);
  if (!block) return <p className="azq-ed-empty">لم تُحدَّد كتلة. اختر صورة أو زرًّا أو أي كتلة في المتن لترى إعداداتها هنا.</p>;
  const a = block.attrs;
  const set = (patch) => editor.chain().updateAttributes(block.name, patch).run();
  const anchor = <Field label="مرساة (اختياري)" hint="حروف وأرقام و- فقط، لرابط مباشر إلى الكتلة"><Text dir="ltr" value={a.anchor} onChange={(v) => set({ anchor: v || null })} /></Field>;
  const alt = <Field label="النص البديل" hint="يصف الصورة لمن لا يراها، بلغة المادة. مطلوب للنشر"><Text dir={dir} value={a.alt} onChange={(v) => set({ alt: v })} /></Field>;

  const forms = {
    figure: <>{alt}<Field label="العرض"><Choice label="العرض" value={a.size ?? 'text'} options={[['text', 'بعرض النص'], ['wide', 'أعرض من النص']]} onChange={(v) => set({ size: v })} /></Field><Field label="رابط (اختياري)"><Text dir="ltr" value={a.href} onChange={(v) => set({ href: v || null })} /></Field>{anchor}</>,
    video: <><button type="button" className="azq-ed-btn-secondary" onClick={() => onReplaceUrl('video')}>استبدال الرابط</button>{anchor}</>,
    audio: <><button type="button" className="azq-ed-btn-secondary" onClick={() => onReplaceUrl('audio')}>استبدال الرابط</button>{anchor}</>,
    xPost: <><button type="button" className="azq-ed-btn-secondary" onClick={() => onReplaceUrl('post')}>استبدال الرابط</button>{anchor}</>,
    linkCard: <><Field label="العنوان"><Text dir={dir} value={a.title} onChange={(v) => set({ title: v })} /></Field><Field label="الموقع"><Text value={a.site} onChange={(v) => set({ site: v })} /></Field><button type="button" className="azq-ed-btn-secondary" onClick={() => onReplaceUrl('link')}>استبدال الرابط</button>{anchor}</>,
    gallery: (
      <>
        <Field label="الأعمدة"><Choice label="الأعمدة" value={a.columns} options={[[2, '2'], [3, '3'], [4, '4']]} onChange={(v) => set({ columns: v })} /></Field>
        <Items items={a.images ?? []} min={0} max={6} addLabel="+ إضافة صورة" make={() => null}
          onChange={async (images) => {
            if (images.length > (a.images ?? []).length) {
              const img = await onUploadImage();
              if (img) set({ images: [...(a.images ?? []), img] });
              return;
            }
            set({ images });
          }}
          render={(img, patch) => <Field label="النص البديل"><Text dir={dir} value={img?.alt} onChange={(v) => patch({ alt: v })} /></Field>} />
        {anchor}
      </>
    ),
    file: <><Field label="الاسم الظاهر"><Text dir={dir} value={a.label} onChange={(v) => set({ label: v })} /></Field><Field label="رابط الملف" hint="ملف مرفوع، أو من المكتبة، أو رابط https"><Text dir="ltr" value={a.href} onChange={(v) => set({ href: v })} /></Field><button type="button" className="azq-ed-btn-secondary" onClick={() => onReplaceUrl('attach')}>استبدال: ملف أو رابط أو من المكتبة</button>{anchor}</>,
    mediaText: <>{alt}<Field label="الصورة"><Choice label="مكان الصورة" value={a.side} options={[['start', 'في البداية'], ['end', 'في النهاية']]} onChange={(v) => set({ side: v })} /></Field>{anchor}</>,
    callout: <><Field label="النوع"><Choice label="النوع" value={a.tone} options={[['info', 'معلومة'], ['warn', 'تنبيه'], ['highlight', 'إبراز']]} onChange={(v) => set({ tone: v })} /></Field><Field label="العنوان (اختياري)"><Text dir={dir} value={a.title} onChange={(v) => set({ title: v })} /></Field>{anchor}</>,
    buttons: (
      <>
        <Field label="المحاذاة"><Choice label="المحاذاة" value={a.align} options={[['start', 'البداية'], ['center', 'الوسط']]} onChange={(v) => set({ align: v })} /></Field>
        <Items items={a.items ?? []} min={1} max={3} addLabel="+ زرّ آخر" make={() => ({ label: '', href: '', style: 'secondary', newTab: false })} onChange={(items) => set({ items })}
          render={(item, patch) => (
            <>
              <Field label="نص الزر"><Text dir={dir} value={item.label} onChange={(v) => patch({ label: v })} /></Field>
              <Field label="الرابط"><Text dir="ltr" value={item.href} onChange={(v) => patch({ href: v })} /></Field>
              <Choice label="النمط" value={item.style} options={[['primary', 'أساسي'], ['secondary', 'ثانوي']]} onChange={(v) => patch({ style: v })} />
              <label className="azq-ed-check"><input type="checkbox" checked={!!item.newTab} onChange={(e) => patch({ newTab: e.target.checked })} /> نافذة جديدة</label>
            </>
          )} />
        {anchor}
      </>
    ),
    stats: (
      <>
        <Items items={a.items ?? []} min={2} max={4} addLabel="+ رقم آخر" make={() => ({ value: '', label: '' })} onChange={(items) => set({ items })}
          render={(item, patch) => <><Field label="الرقم"><Text value={item.value} onChange={(v) => patch({ value: v })} /></Field><Field label="ماذا يعني"><Text dir={dir} value={item.label} onChange={(v) => patch({ label: v })} /></Field></>} />
        {anchor}
      </>
    ),
    quoteCard: <><Field label="صاحب الاقتباس"><Text dir={dir} value={a.name} onChange={(v) => set({ name: v })} /></Field><Field label="صفته"><Text dir={dir} value={a.role} onChange={(v) => set({ role: v })} /></Field><Field label="الخلفية"><Choice label="الخلفية" value={a.variant} options={[['light', 'فاتحة'], ['dark', 'داكنة']]} onChange={(v) => set({ variant: v })} /></Field>{anchor}</>,
    storyQuote: <><p className="azq-ed-hint">الاسم والصفة من «التفاصيل» في القصة نفسها.</p><Field label="الخلفية"><Choice label="الخلفية" value={a.variant} options={[['light', 'فاتحة'], ['dark', 'داكنة']]} onChange={(v) => set({ variant: v })} /></Field>{anchor}</>,
    faq: <>{anchor}</>,
    faqItem: (
      <>
        <Field label="السؤال" hint="والجواب في المتن تحته"><Text dir={dir} value={a.question} onChange={(v) => set({ question: v })} /></Field>
        <button type="button" className="azq-ed-link" onClick={() => {
          const { $from } = editor.state.selection;
          for (let d = $from.depth; d > 0; d -= 1) {
            if ($from.node(d).type.name === 'faqItem') {
              editor.chain().focus().insertContentAt($from.after(d), { type: 'faqItem', attrs: { question: '' }, content: [{ type: 'paragraph' }] }).run();
              break;
            }
          }
        }}>+ سؤال آخر</button>
      </>
    ),
    map: <><Field label="اسم المكان"><Text dir={dir} value={a.place} onChange={(v) => set({ place: v })} /></Field><Field label="رابط خرائط Google"><Text dir="ltr" value={a.href} onChange={(v) => set({ href: v })} /></Field>{alt}{anchor}</>,
    resource: <><Field label="المادة"><ResourcePicker value={a.id} onChange={(id) => set({ id })} /></Field><button type="button" className="azq-ed-btn-secondary" onClick={() => onReplaceUrl('attach')}>بدلها: رفع ملف أو رابط خارجي</button>{anchor}</>,
    horizontalRule: <Field label="الشكل"><Choice label="الشكل" value={a.variant ?? 'line'} options={[['line', 'خط'], ['dots', 'نقاط']]} onChange={(v) => set({ variant: v })} /></Field>,
  };

  return (
    <div className="azq-ed-settings">
      <h3 className="azq-ed-settings-title">{NAMES[block.name] ?? block.name}</h3>
      {forms[block.name]}
      <div className="azq-ed-settings-actions">
        <button type="button" className="azq-ed-link-danger" onClick={() => editor.chain().focus().deleteSelection().run()}>حذف الكتلة</button>
      </div>
    </div>
  );
}
