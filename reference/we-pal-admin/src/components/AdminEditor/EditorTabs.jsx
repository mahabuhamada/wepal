// تبويبا «الترجمة» (translation-card.tsx في المنتدى) و«الرابط والنسخ» (النسخ السابقة والفرق والاسترجاع).
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRevision, listRevisions } from '../../api/editor';
import { diffFields, portalPath } from '../../utils/editorState';
import { formatDateTime } from './editorFormat';
import { ClickableRow, RowLink } from '../common/ClickableRow';

const STATUS = { draft: 'مسودّة', published: 'منشورة', scheduled: 'مجدولة' };
const LANG = { ar: 'العربية', en: 'الإنجليزية' };
const KINDS = { manual: 'حفظ', publish: 'نشر', restore: 'استرجاع', overwritten: 'نسخة حُفظ فوقها' };

export function TranslationTab({ item, type, dirty, onCreate }) {
  const other = item.translations?.[0];
  const otherLocale = item.locale === 'ar' ? 'en' : 'ar';
  const otherName = LANG[otherLocale];
  return (
    <div className="azq-ed-tab-panel">
      <section className="azq-ed-panel-card">
        <h2>النسخة {otherName === 'العربية' ? 'العربية' : 'الإنجليزية'}</h2>
        {other ? (
          <>
            <p>المادتان مرتبطتان: يظهر في البوابة زرّ التبديل بين اللغتين.</p>
            <p><strong dir="auto">{other.title || '(بلا عنوان بعد)'}</strong> · {STATUS[other.status]}</p>
            <Link className="azq-ed-btn-secondary" to={`/admin/editor/${type}/${other.id}`}>تحرير النسخة {otherName}</Link>
          </>
        ) : (
          <>
            <p>النسخة {otherName} غير موجودة. وهي اختيارية، وتُضاف في أي وقت.</p>
            <p className="azq-ed-hint">يُنسخ إليها: صورة الغلاف (نسخة مستقلة لها)، {type === 'story' ? 'وصاحب القصة وموافقته' : 'والتصنيف والكاتب'}. ويبقى العنوان والملخّص والمتن فارغة لتُكتب بلغتها.</p>
            <button type="button" className="azq-ed-btn-primary" disabled={dirty} onClick={onCreate}>إنشاء النسخة {otherName}</button>
            {dirty && <p className="azq-ed-hint">احفظ التغييرات أولًا حتى تُنسخ آخر نسخة منها.</p>}
          </>
        )}
      </section>
      <section className="azq-ed-panel-card">
        <h2>ما يخصّ كل لغة</h2>
        <table className="azq-ed-table">
          <thead><tr><th>اللغة</th><th>الحالة</th><th>النص البديل لصورة الغلاف</th></tr></thead>
          <tbody>
            {/* كل صف يفتح نسخته: هذه هي المفتوحة، والأخرى رابط إليها (الصف كله، docs/ADMIN-UX.md) */}
            <tr aria-current="true"><td>{LANG[item.locale]} (هذه)</td><td>{STATUS[item.status]}</td><td>{(item.cover ?? item.photo)?.altTranslations?.[item.locale] ? 'مكتوب' : 'غير مكتوب'}</td></tr>
            {other && (
              <ClickableRow>
                <td><RowLink to={`/admin/editor/${type}/${other.id}`}>{LANG[other.locale]}</RowLink></td>
                <td>{STATUS[other.status]}</td>
                <td>يُرى في نسختها</td>
              </ClickableRow>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function LinksTab({ item, type, fields, dirty, onRestore }) {
  const [revisions, setRevisions] = useState(null);
  const [open, setOpen] = useState(null);
  const path = portalPath(type, item);
  const fullUrl = path && typeof window !== 'undefined' ? `${window.location.origin}${path}` : path;

  useEffect(() => {
    let alive = true;
    listRevisions(type, item.id).then((res) => alive && setRevisions(res.data ?? [])).catch(() => alive && setRevisions([]));
    return () => { alive = false; };
  }, [type, item.id, item.version]);

  const show = async (number) => {
    const revision = await getRevision(type, item.id, number);
    setOpen(revision);
  };

  return (
    <div className="azq-ed-tab-panel">
      <section className="azq-ed-panel-card">
        <h2>الرابط</h2>
        <p dir="ltr" className="azq-ed-url">{fullUrl ?? '—'}</p>
        <div className="azq-ed-row">
          <button type="button" className="azq-ed-btn-secondary" disabled={!fullUrl} onClick={() => navigator.clipboard?.writeText(fullUrl)}>نسخ الرابط</button>
          {item.status === 'published' && path && <a className="azq-ed-btn-ghost" href={path} target="_blank" rel="noopener">فتح في البوابة</a>}
        </div>
      </section>
      <section className="azq-ed-panel-card">
        <h2>النسخ السابقة</h2>
        <p className="azq-ed-hint">نسخة عند كل حفظ يدوي وعند النشر (لا ينشئ الحفظ التلقائي نسخة). والاسترجاع لا يغيّر الحالة ولا الرابط ولا اللغة، ولا يمسّ المنشور.</p>
        {revisions === null && <p>…</p>}
        {revisions?.length === 0 && <p>لا نسخ سابقة بعد.</p>}
        <ul className="azq-ed-revisions">
          {revisions?.map((r) => (
            <li key={r.number}>
              <button type="button" className="azq-ed-link" onClick={() => show(r.number)}>#{r.number} · {KINDS[r.kind] ?? r.kind}</button>
              <small>{r.by?.name ?? '—'} · {formatDateTime(r.createdAt)}</small>
            </li>
          ))}
        </ul>
        {open && (
          <div className="azq-ed-revision">
            <h3>الفرق بين النسخة #{open.number} والحالية</h3>
            <table className="azq-ed-compare">
              <thead><tr><th>الحقل</th><th>النسخة #{open.number}</th><th>الحالية</th></tr></thead>
              <tbody>
                {diffFields(open.fields, fields, item.locale).map((row) => (
                  <tr key={row.key}><th>{row.label}</th><td className="azq-ed-removed">{row.mine}</td><td className="azq-ed-added">{row.theirs}</td></tr>
                ))}
              </tbody>
            </table>
            <button type="button" className="azq-ed-btn-primary" disabled={dirty} onClick={() => onRestore(open.number)}>استرجاع هذه النسخة</button>
            {dirty && <p className="azq-ed-hint">احفظ تعديلاتك أولًا: الاسترجاع معطّل ما دامت هناك تعديلات غير محفوظة.</p>}
          </div>
        )}
      </section>
    </div>
  );
}
