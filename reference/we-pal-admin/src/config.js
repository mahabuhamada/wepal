import { resolveFeatures } from './utils/features';

// أعلام التهيئة العامة للتطبيق.
// USE_API: عند التفعيل، يقرأ القسم الخاص بيانات المشاريع من الـ API الحقيقي بدل بيانات المحاكاة.
export const USE_API = import.meta.env.VITE_USE_API === 'true';

// FEATURES: أعلام الميزات (utils/features): الوهمية بلا باك اند (الرسائل، منشئ الاستبيانات، مساعد المشروع)، و«اسأل» الحقيقية.
// التفاصيل وطريقة الفرض من البيئة في utils/features.js.
export const FEATURES = resolveFeatures(import.meta.env);
