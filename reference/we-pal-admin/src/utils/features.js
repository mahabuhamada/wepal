// أعلام الميزات.
// FEATURE_NAMES: ميزات صفحاتها ما زالت على بيانات وهمية بلا باك اند. في وضع الـ API تُخفى افتراضيًا
// (بدل عرض بيانات وهمية لمستخدمين حقيقيين)، وفي وضع المحاكاة تظهر كلها (النموذج التجريبي الكامل).
//   projectAssistant: المساعد داخل أدوات المشروع (ردود ثابتة، لا API بعد).
// REAL_FEATURES: ميزات حقيقية ظاهرة افتراضيًا في الوضعين، والعلم مفتاح إيقاف فقط.
//   assistant: صفحة «اسأل» (/assistant): بحث في المحتوى المنشور بلا نموذج لغوي (المرحلة 1).
//   surveyBuilder: استطلاع المساحة الموجّه إلى مجموعة مسارها في أدوات المشروع (الحزمة 5، POST /projects/{id}/surveys).
// يمكن فرض أي علم من البيئة: VITE_FEATURE_<NAME>=true|false (مثل VITE_FEATURE_SURVEY_BUILDER).
export const MOCK_FEATURES = ['projectAssistant'];
// messages: حقيقية منذ 16 نوفمبر 2026 (الرسائل الخاصة وشات المجموعات على الخادم)، والعلم مفتاح إيقاف.
export const REAL_FEATURES = ['assistant', 'surveyBuilder', 'messages'];
export const FEATURE_NAMES = [...REAL_FEATURES, ...MOCK_FEATURES];

const envKey = (name) => `VITE_FEATURE_${name.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase()}`;

export function resolveFeatures(env = {}) {
  const useApi = env.VITE_USE_API === 'true';
  return Object.fromEntries(
    FEATURE_NAMES.map((name) => {
      const raw = env[envKey(name)];
      const fallback = REAL_FEATURES.includes(name) || !useApi;
      const enabled = raw === 'true' ? true : raw === 'false' ? false : fallback;
      return [name, enabled];
    }),
  );
}

// مسار الصفحة المرتبطة بكل علم — لتصفية الروابط والقوائم.
export const FEATURE_PATHS = {
  '/assistant': 'assistant',
  '/messages': 'messages',
};

// هل الرابط مسموح؟ (مسار بلا علم = مسموح دائمًا)
export const isPathEnabled = (path, features) => {
  const flag = FEATURE_PATHS[path];
  return !flag || Boolean(features[flag]);
};
