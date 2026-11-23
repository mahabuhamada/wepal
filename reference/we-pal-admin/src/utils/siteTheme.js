// سمة الواجهة: «classic» (التصميم الحالي) أو «azraq» (أزرق هادئ، design-system/wepal/MASTER.md).
// المدير يختارها من لوحة التحكم (GET /public/appearance). نحفظ آخر قيمة في كوكي حتى يخرج
// <html data-theme> صحيحًا من الخادم، ويضبطها سكربت صغير قبل الرسم في بناء SPA (بلا وميض).
// خطوط السمتين مستضافة معنا (styles/fonts.css، @font-face يُنزَّل عند الاستعمال فقط): لا روابط خارجية،
// فلا يتوقف الرسم إن تأخّر خادم خطوط، ولا يُرسل عنوان الزائر إلى طرف ثالث.

import { normalizeImage } from './media';

export const THEMES = ['classic', 'azraq'];
export const DEFAULT_THEME = 'classic';
export const THEME_COOKIE = 'wepal-theme';

// إعدادات الهيرو للرئيسية الجديدة (العقد: GET /public/appearance).
export const DEFAULT_HERO = { mode: 'slider', newsCount: 3, interval: 7 };

export const isTheme = (value) => THEMES.includes(value);

// صور رؤوس صفحات القوائم من «إعدادات الواجهة» (جولة 6): صورة لكل صفحة أو null فيُرسم البديل الكحلي.
// القصص بلا صورة رأس عمدًا (لا صور مجموعات على صفحة قصص أشخاص بعينهم).
export const PAGE_HEADER_KEYS = ['news', 'blog', 'polls', 'library', 'outputs'];
export const EMPTY_PAGE_HEADERS = Object.freeze(Object.fromEntries(PAGE_HEADER_KEYS.map((key) => [key, null])));

export function normalizePageHeaders(raw) {
  return Object.fromEntries(PAGE_HEADER_KEYS.map((key) => [key, normalizeImage(raw?.[key])]));
}

export function themeFromCookie(cookie = '') {
  const match = new RegExp(`(?:^|;\\s*)${THEME_COOKIE}=(${THEMES.join('|')})(?:;|$)`).exec(cookie);
  return match ? match[1] : DEFAULT_THEME;
}

// يضبط السمة على الصفحة ويحفظها في الكوكي. يعيد السمة المطبَّقة.
export function applyTheme(theme, doc = document) {
  const safe = isTheme(theme) ? theme : DEFAULT_THEME;
  doc.documentElement.setAttribute('data-theme', safe);
  doc.cookie = `${THEME_COOKIE}=${safe}; path=/; max-age=31536000; samesite=lax`;
  return safe;
}

// يعمل قبل أول رسم (في <head>): يقرأ الكوكي ويضبط السمة. لا يضيف رابط خطوط: رابط stylesheet
// في <head> يوقف الرسم حتى يرد خادمه، والخطوط أصلًا في styles/fonts.css.
// إن عرض الخادم السمة من اختيار المدير (data-theme-locked) فهي الصحيحة، ولا نعيدها إلى كوكي قديم.
export function themeBootScript() {
  return `(function(){try{if(document.documentElement.hasAttribute('data-theme-locked'))return;var m=/(?:^|;\\s*)${THEME_COOKIE}=(${THEMES.join('|')})(?:;|$)/.exec(document.cookie);`
    + `document.documentElement.setAttribute('data-theme',m?m[1]:'${DEFAULT_THEME}');}catch(e){}})();`;
}

// يوحّد ردّ الـ API: قيم غير معروفة ← الافتراضي، حتى لا تنكسر الواجهة.
export function normalizeAppearance(res) {
  const hero = res?.hero ?? {};
  const int = (v, min, max, fallback) => (Number.isInteger(v) && v >= min && v <= max ? v : fallback);
  return {
    design: isTheme(res?.design) ? res.design : DEFAULT_THEME,
    hero: {
      mode: ['slider', 'bento'].includes(hero.mode) ? hero.mode : DEFAULT_HERO.mode,
      newsCount: int(hero.newsCount, 2, 5, DEFAULT_HERO.newsCount),
      interval: int(hero.interval, 5, 12, DEFAULT_HERO.interval),
    },
    pageHeaders: normalizePageHeaders(res?.pageHeaders),
    updatedAt: res?.updatedAt ?? null,
  };
}

// ما تغيّر فقط (PATCH جزئي في العقد).
export function appearanceChanges(saved, draft) {
  const changes = {};
  if (draft.design !== saved.design) changes.design = draft.design;
  const hero = {};
  ['mode', 'newsCount', 'interval'].forEach((key) => {
    if (draft.hero[key] !== saved.hero[key]) hero[key] = draft.hero[key];
  });
  if (Object.keys(hero).length) changes.hero = hero;
  return changes;
}
