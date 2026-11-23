// نموذج «استشارة جديدة» في الإدارة (ملاحظة هلا هـ-2): منطق بلا واجهة، يُختبر في consultationForm.test.js.
// الاستشارة تعرض محادثة Pol.is للأعضاء، فتُنشأ المحادثة في pol.is أولًا ويُلصق معرّفها (أو رابطها) هنا.
import { cleanBilingual } from '../components/Admin/BilingualField';

export const emptyConsultationForm = () => ({
  title: { ar: '', en: '' },
  description: { ar: '', en: '' },
  polis: '',
  startsAt: '',
  endsAt: '',
});

/** معرّف المحادثة من رابطها الكامل (pol.is/<id>) أو كما هو. */
export function polisIdFrom(input) {
  const text = String(input ?? '').trim();
  const match = text.match(/pol\.is\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : text;
}

/** أول خطأ في النموذج كمفتاح ترجمة، أو null إن كان صالحًا (حدود الخادم: العنوان 3 أحرف، والمعرّف إلزامي). */
export function validateConsultationForm(form) {
  if ((form.title?.ar ?? '').trim().length < 3) return { key: 'adminConsultations.create.titleRequired' };
  if (!polisIdFrom(form.polis)) return { key: 'adminConsultations.create.polisRequired' };
  if (form.startsAt && form.endsAt && form.endsAt < form.startsAt) return { key: 'adminConsultations.create.endBeforeStart' };
  return null;
}

/** جسم POST /consultations: المملوء فقط. الحالة يفترضها الخادم (ACTIVE). */
export function consultationPayload(form) {
  const payload = { title: cleanBilingual(form.title) };
  const description = cleanBilingual(form.description);
  if (Object.keys(description).length > 0) payload.description = description;
  payload.polisConversationId = polisIdFrom(form.polis);
  if (form.startsAt) payload.startsAt = form.startsAt;
  if (form.endsAt) payload.endsAt = form.endsAt;
  return payload;
}
