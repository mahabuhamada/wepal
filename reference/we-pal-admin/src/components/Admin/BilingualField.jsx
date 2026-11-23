import { useId, useState } from 'react';
import { Check, Languages } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

/**
 * حقل نصّي ثنائي اللغة — يُنتج {ar, en}.
 *
 * العربية مطلوبة (لغة الأصل ولغة الرجوع) والإنجليزية اختيارية، مطابقةً
 * لقواعد التحقق على الخادم. التبويبان يوفّران مساحة الشاشة مقابل عرض
 * حقلين متجاورين، ونُظهر علامة على التبويب الذي كُتب فيه نص فعلاً حتى
 * يعرف المحرّر ما ينقصه دون تبديل.
 */
export default function BilingualField({
  label,
  value = {},
  onChange,
  type = 'input',
  rows = 3,
  required = true,
  placeholderAr = '',
  placeholderEn = '',
}) {
  const { t } = useLanguage();
  const [tab, setTab] = useState('ar');
  // التسمية مربوطة بحقل اللغة الظاهر، والتبويبان بحقليهما (قارئ الشاشة يسمع «العنوان، عربي»).
  const baseId = useId();
  const inputId = (locale) => `${baseId}-${locale}`;

  const set = (locale, text) => onChange({ ...value, [locale]: text });
  const filled = (locale) => Boolean((value[locale] ?? '').trim());

  // التبويبان أهداف لمس 44px بخط 12px على الأقل (backlog 39): كانا 24px بخط 11px.
  const tabs = [
    { key: 'ar', label: t('adminBilingual.arabic'), dir: 'rtl', required },
    { key: 'en', label: t('adminBilingual.english'), dir: 'ltr', required: false },
  ];

  const Field = type === 'textarea' ? 'textarea' : 'input';

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <label htmlFor={inputId(tab)} id={`${baseId}-label`} className="text-xs text-[var(--wp-text-muted)]">
          {label}
          {required && <span className="text-[var(--wepal-danger)]"> *</span>}
        </label>

        <div className="flex items-center gap-1" role="tablist" aria-labelledby={`${baseId}-label`}>
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={tab === item.key}
              aria-controls={inputId(item.key)}
              onClick={() => setTab(item.key)}
              className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-md px-3 text-label font-bold transition-colors ${
                tab === item.key
                  ? 'bg-[var(--wepal-primary-600)] text-white'
                  : 'text-[var(--wp-text-muted)] hover:bg-[var(--wepal-primary-50)]'
              }`}
            >
              {item.label}
              {filled(item.key) && <Check size={14} aria-hidden="true" />}
            </button>
          ))}
        </div>
      </div>

      {tabs.map((item) => (
        <Field
          key={item.key}
          id={inputId(item.key)}
          hidden={tab !== item.key}
          dir={item.dir}
          rows={type === 'textarea' ? rows : undefined}
          required={item.required && tab === item.key}
          value={value[item.key] ?? ''}
          onChange={(e) => set(item.key, e.target.value)}
          placeholder={item.key === 'ar' ? placeholderAr : placeholderEn}
          className="wp-input w-full px-3 py-2 text-sm"
        />
      ))}

      {tab === 'en' && !filled('en') && (
        <p className="mt-1 flex items-center gap-1 text-caption text-[var(--wp-text-muted)]">
          <Languages size={14} aria-hidden="true" />
          {t('adminBilingual.optionalHint')}
        </p>
      )}
    </div>
  );
}

/** يحوّل قيمة قادمة من الـ API (نص أو كائن) إلى شكل الحقل. */
export function toBilingual(value) {
  if (value && typeof value === 'object') return { ar: value.ar ?? '', en: value.en ?? '' };

  return { ar: value ?? '', en: '' };
}

/** يُسقط اللغات الفارغة قبل الإرسال حتى لا تُخزَّن "" في قاعدة البيانات. */
export function cleanBilingual(value) {
  const out = {};
  for (const locale of ['ar', 'en']) {
    const text = (value?.[locale] ?? '').trim();
    if (text) out[locale] = text;
  }

  return out;
}
