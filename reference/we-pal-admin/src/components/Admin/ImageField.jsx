import { useEffect, useId, useMemo, useRef } from 'react';
import { ImageOff, ImagePlus, RotateCcw, Trash2, X } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import BilingualField from './BilingualField';
import { imageAccept, imageMaxMb, imageTypesLabel, validateImage } from '../../utils/images';
import { draftHasImage } from '../../hooks/useImageDraft';

const canPreview = () => typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';

/**
 * حقل صورة المحتوى في نماذج الإدارة (جولة التصميم 6): معاينة، اختيار أو استبدال، حذف بتراجع،
 * ووصف للصورة بالعربية (مطلوب) والإنجليزية، ومصدر اختياري، وموافقة صاحب القصة إن مُرِّرت.
 * لا يرسل شيئًا: الصفحة تحفظ العنصر ثم تطبّق المسودة (commitImageDraft).
 *
 * draft/onChange من useImageDraft، و policy من imageUpload في رد الإدارة.
 * consent: { checked, onChange } لصورة القصة. ratio: نسبة المعاينة (مثل '16 / 9').
 */
export default function ImageField({ label, draft, onChange, policy, consent, ratio = '16 / 9', name = 'image' }) {
  const { t, lang } = useLanguage();
  const id = useId();
  const inputRef = useRef(null);
  const chooseRef = useRef(null);
  const undoRef = useRef(null);
  const removeRef = useRef(null);
  const focusNext = useRef(null);
  const hasImage = draftHasImage(draft);
  const ids = { hint: `${id}-hint`, status: `${id}-status`, error: `${id}-error`, credit: `${id}-credit`, consent: `${id}-consent` };

  // معاينة الصورة الجديدة من المتصفح قبل الرفع، ويُحرَّر الرابط عند التغيير.
  const localUrl = useMemo(() => (draft.file && canPreview() ? URL.createObjectURL(draft.file) : null), [draft.file]);
  useEffect(() => () => { if (localUrl) URL.revokeObjectURL(localUrl); }, [localUrl]);

  // التركيز لا يضيع حين يختفي الزر الذي ضُغط (حذف ← تراجع، إلغاء الجديدة ← اختيار).
  useEffect(() => {
    const target = focusNext.current;
    focusNext.current = null;
    if (target) target.current?.focus();
  });

  const types = imageTypesLabel(policy, lang === 'en' ? ', ' : '، ');
  const max = imageMaxMb(policy);

  const onFile = (event) => {
    const file = event.target.files?.[0] || null;
    event.target.value = ''; // اختيار الملف نفسه مرة أخرى يُطلق change
    if (!file) return;
    const invalid = validateImage(file, policy);
    if (invalid) {
      onChange({ error: t(invalid.key, invalid.params) });
      return;
    }
    onChange({ file, remove: false, error: null });
  };

  const cancelNew = () => { focusNext.current = chooseRef; onChange({ file: null, error: null }); };
  const markRemove = () => { focusNext.current = undoRef; onChange({ remove: true, error: null }); };
  const undoRemove = () => { focusNext.current = removeRef; onChange({ remove: false }); };

  const status = draft.file
    ? t('azraqAdmin.image.newFile', { name: draft.file.name })
    : draft.remove ? t('azraqAdmin.image.willRemove')
      : draft.current ? t('azraqAdmin.image.saved') : t('azraqAdmin.image.none');

  const preview = draft.file
    ? (localUrl && <img src={localUrl} alt={t('azraqAdmin.image.previewAlt')} className="h-full w-full object-cover" />)
    : draft.current && !draft.remove
      ? <img src={draft.current.url} srcSet={draft.current.srcset || undefined} sizes="240px" alt={draft.current.alt || ''} className="h-full w-full object-cover" />
      : null;

  return (
    <fieldset className="aim-field rounded-xl border border-[var(--wp-border)] p-4" aria-describedby={ids.hint} data-image-field={name}>
      <legend className="aim-legend px-1 text-xs font-bold text-[var(--wp-text-2)]">{label}</legend>

      <div className="aim-body flex flex-wrap items-start gap-4">
        <div className="aim-preview relative w-48 shrink-0 overflow-hidden rounded-lg bg-[var(--wp-bg)]" style={{ aspectRatio: ratio }}>
          {preview || (
            <span className="aim-empty flex h-full w-full flex-col items-center justify-center gap-1 text-xs text-[var(--wp-text-muted)]">
              <ImageOff size={20} aria-hidden="true" />
              {t('azraqAdmin.image.none')}
            </span>
          )}
        </div>

        <div className="aim-controls min-w-0 flex-1 space-y-2">
          <p id={ids.status} className="aim-status text-xs font-semibold text-[var(--wp-text-2)]" aria-live="polite">{status}</p>
          <div className="flex flex-wrap gap-2">
            <button ref={chooseRef} type="button" onClick={() => inputRef.current?.click()} aria-describedby={`${ids.hint}${draft.error ? ` ${ids.error}` : ''}`} className="aim-btn inline-flex items-center gap-1.5 rounded-lg border border-[var(--wp-border-2)] px-3 py-1.5 text-xs font-semibold text-[var(--wp-ink)] hover:border-[var(--wp-coral)]">
              <ImagePlus size={14} aria-hidden="true" />
              {hasImage ? t('azraqAdmin.image.replace') : t('azraqAdmin.image.choose')}
            </button>
            {draft.file && (
              <button type="button" onClick={cancelNew} className="aim-btn inline-flex items-center gap-1.5 rounded-lg border border-[var(--wp-border-2)] px-3 py-1.5 text-xs font-semibold text-[var(--wp-text-2)]">
                <X size={14} aria-hidden="true" />
                {t('azraqAdmin.image.cancelNew')}
              </button>
            )}
            {draft.current && !draft.file && !draft.remove && (
              <button ref={removeRef} type="button" onClick={markRemove} className="aim-btn aim-btn-danger inline-flex items-center gap-1.5 rounded-lg border border-[var(--wp-border-2)] px-3 py-1.5 text-xs font-semibold text-[var(--wp-coral-deep)]">
                <Trash2 size={14} aria-hidden="true" />
                {t('azraqAdmin.image.remove')}
              </button>
            )}
            {draft.remove && (
              <button ref={undoRef} type="button" onClick={undoRemove} className="aim-btn inline-flex items-center gap-1.5 rounded-lg border border-[var(--wp-border-2)] px-3 py-1.5 text-xs font-semibold text-[var(--wp-ink)]">
                <RotateCcw size={14} aria-hidden="true" />
                {t('azraqAdmin.image.undoRemove')}
              </button>
            )}
          </div>
          <input ref={inputRef} type="file" accept={imageAccept(policy)} hidden onChange={onFile} data-testid={`${name}-input`} />
          <p id={ids.hint} className="aim-hint text-caption text-[var(--wp-text-muted)]">{t('azraqAdmin.image.hint', { types, max })}</p>
          {draft.error && <p id={ids.error} role="alert" className="aim-error text-xs text-[var(--wp-coral-deep)]">{draft.error}</p>}
        </div>
      </div>

      {hasImage && (
        <div className="aim-text mt-4 grid gap-3">
          <BilingualField label={t('azraqAdmin.image.alt')} value={draft.alt} onChange={(alt) => onChange({ alt })} />
          <p className="aim-hint -mt-2 text-caption text-[var(--wp-text-muted)]">{t('azraqAdmin.image.altHint')}</p>
          <div>
            <label htmlFor={ids.credit} className="mb-1 block text-xs text-[var(--wp-text-muted)]">{t('azraqAdmin.image.credit')}</label>
            <input id={ids.credit} value={draft.credit} maxLength={80} onChange={(e) => onChange({ credit: e.target.value })} placeholder={t('azraqAdmin.image.creditPlaceholder')} className="wp-input w-full px-3 py-2 text-sm" />
          </div>
          {consent && (
            <div className="aim-consent flex items-start gap-2">
              <input id={ids.consent} type="checkbox" checked={consent.checked} onChange={(e) => consent.onChange(e.target.checked)} aria-describedby={`${ids.consent}-hint`} className="mt-1" />
              <div>
                <label htmlFor={ids.consent} className="text-sm font-semibold text-[var(--wp-text)]">{t('azraqAdmin.image.consent')}</label>
                <p id={`${ids.consent}-hint`} className="text-caption text-[var(--wp-text-muted)]">{t('azraqAdmin.image.consentHint')}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </fieldset>
  );
}
