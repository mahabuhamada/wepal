import { isMultiQtype, isScaleQtype, isTextQtype } from './apiMappers';

/** هل السؤال مُجاب (تحقّق العميل: كل الأسئلة مطلوبة)؟ */
export function isAnswered(q, v) {
  if (!v) return false;
  if (isScaleQtype(q.qtype)) return typeof v.scale === 'number' && v.scale >= 1;
  if (isTextQtype(q.qtype)) return Boolean(v.text && v.text.trim());
  if (isMultiQtype(q.qtype)) return Array.isArray(v.choices) && v.choices.length > 0;
  return Boolean(v.choice);
}

/** هل الاستطلاع العام بشكله البسيط (سؤال واحد باختيار واحد) فيُعرض ويُصوَّت بالخيارات مباشرة؟ */
export function isSimplePoll(poll) {
  const qs = poll?.questions;
  if (!Array.isArray(qs)) return true; // رد قديم بلا questions
  return qs.length === 1 && qs[0].qtype === 'SINGLE_CHOICE';
}

/** { questionId, value }[] من قيم الواجهة المفهرسة بمعرّف السؤال. */
export function buildAnswers(questions, values) {
  return questions.map((q) => ({ questionId: q.id, value: values[q.id] }));
}

/** هل أُجيبت كل الأسئلة؟ */
export function allAnswered(questions, values) {
  return questions.length > 0 && questions.every((q) => isAnswered(q, values[q.id]));
}
