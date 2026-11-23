import { Check, Star } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { isMultiQtype, isScaleQtype, isTextQtype } from '../../utils/apiMappers';

// حقل إدخال حسب نوع السؤال: يستعمله استبيان الأعضاء وصفحة الاستطلاعات العامة معًا.
export default function QuestionInput({ question, index, value, onChange }) {
  const { t } = useLanguage();

  if (isScaleQtype(question.qtype)) {
    const current = value?.scale ?? 0;
    return (
      <fieldset>
        <legend><span>{index + 1}</span>{question.text}</legend>
        <div className="survey-scale-input">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              className={n <= current ? 'on' : ''}
              onClick={() => onChange({ scale: n })}
              aria-label={`${n}`}
              aria-pressed={n === current}
            >
              <Star fill={n <= current ? 'currentColor' : 'none'} />
            </button>
          ))}
        </div>
      </fieldset>
    );
  }

  if (isTextQtype(question.qtype)) {
    return (
      <fieldset>
        <legend><span>{index + 1}</span>{question.text}</legend>
        <textarea
          value={value?.text ?? ''}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder={t('surveyDetail.textPlaceholder')}
        />
      </fieldset>
    );
  }

  // اختيار (فردي/متعدد)
  const multi = isMultiQtype(question.qtype);
  const selected = multi ? (value?.choices ?? []) : value?.choice;
  const toggle = (opt) => {
    if (multi) {
      const set = new Set(value?.choices ?? []);
      if (set.has(opt)) set.delete(opt); else set.add(opt);
      onChange({ choices: Array.from(set) });
    } else {
      onChange({ choice: opt });
    }
  };

  return (
    <fieldset>
      <legend><span>{index + 1}</span>{question.text}</legend>
      <div className="survey-dialog-options">
        {(question.options || []).map((opt, j) => {
          const checked = multi ? selected.includes(opt) : selected === opt;
          return (
            <label key={j} className={checked ? 'selected' : ''}>
              <input
                type={multi ? 'checkbox' : 'radio'}
                name={`q${question.id}`}
                checked={checked}
                onChange={() => toggle(opt)}
              />
              <span>{opt}</span>
              {checked && <Check />}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
