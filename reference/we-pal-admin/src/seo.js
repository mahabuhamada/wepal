import { BRAND } from './i18n/brand';
import { getClientLang } from './i18n/clientLang';

/**
 * بناء وسوم الرأس لكل صفحة.
 *
 * سبب وجود هذا الملف: قبل الهجرة كان للموقع كله عنوان واحد وبلا وصف ولا
 * Open Graph. زواحف معاينة الروابط (واتساب، فيسبوك، لينكدإن، تيليجرام)
 * لا تنفّذ جافاسكربت، فكانت كل مشاركة تظهر بعنوان عام بلا وصف ولا صورة.
 */

// اسم الموقع من المصدر الوحيد (i18n/brand.js). الاسم وحده: السطر الصغير تحت الاسم يظهر في الترويسة
// والتذييل، ولو دخل هنا لتكرّر في عنوان كل تبويب («… — وي بال — منصة سياسية حوارية»).
const SITE_NAME = BRAND.name;

/** يقبل نصاً واحداً أو كائن {ar, en}. */
const pick = (value, lang) =>
  value && typeof value === 'object' ? (value[lang] ?? value.ar ?? '') : (value ?? '');

/** لغة الواجهة من بيانات مسار الجذر — تُمرَّر إلى meta() عبر matches. */
// لغة الواجهة الحالية في المتصفح تغلب لغة الجذر (الثابتة من لحظة التحميل)، فيتبع عنوان التبويب التبديل.
export const langFromMatches = (matches) => getClientLang() ?? matches?.[0]?.data?.lang ?? 'ar';

/**
 * وسوم احتياطية: React Router يأخذ وسوم أقرب مسار أب يصدّر meta حين لا تصدّرها الصفحة نفسها.
 * - الجذر: اسم الموقع عنوانًا، حتى لا تبقى صفحة بلا عنوان في HTML الخادم.
 * - منطقتا الأعضاء والإدارة: عنوان عام مع noindex. الخادم يعرضهما دائمًا بلا تسجيل دخول
 *   (التوكن في localStorage)، فلا بد أن يحمل HTML الخادم نفسه منع الأرشفة.
 * الصفحة التي تصدّر meta خاصة بها تستبدل هذه كليًا، فعليها أن تمرّر noIndex بنفسها.
 */
export const siteFallbackMeta = ({ matches } = {}) => [{ title: SITE_NAME[langFromMatches(matches)] ?? SITE_NAME.ar }];

export const privateAreaMeta = ({ matches, location } = {}, title) =>
  buildMeta({ lang: langFromMatches(matches), title, path: location?.pathname ?? '/', noIndex: true });

/** أصل الموقع للروابط المطلقة (canonical و og:image). */
export const siteUrl = (
  import.meta.env.VITE_SITE_URL ?? 'https://wepal.ps'
).replace(/\/$/, '');

export const absoluteUrl = (path = '/') => `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`;

/** صورة المشاركة الافتراضية (1200×630، نسبة معاينات واتساب وفيسبوك وإكس). */
export const SHARE_IMAGE = { path: '/brand/wepal-share.png', width: 1200, height: 630 };

/**
 * رابط الصفحة بلغتها: العربية (الافتراضية) بلا معامل، والإنجليزية ‎?lang=en‎.
 * محركات البحث لا تحمل كوكي اللغة، فلكل لغة رابط ثابت يربطه hreflang.
 */
export function localizedPath(path = '/', lang = 'ar') {
  if (lang !== 'en') return path;
  return `${path}${path.includes('?') ? '&' : '?'}lang=en`;
}

/** قصّ النص لطول مناسب لمقتطف البحث دون قطع كلمة. */
export function excerpt(text, max = 160) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;

  return `${clean.slice(0, clean.lastIndexOf(' ', max) || max).trim()}…`;
}

/**
 * @param {object} options
 * @param {'ar'|'en'} [options.lang] لغة الصفحة — تضبط العنوان والوصف و og:locale
 * @param {string|{ar:string,en:string}} options.title عنوان الصفحة بلا اسم الموقع
 * @param {string|{ar:string,en:string}} [options.description]
 * @param {string} [options.path] مسار الصفحة للـ canonical
 * @param {string} [options.image] صورة المشاركة (مسار أو رابط مطلق)
 * @param {'website'|'article'} [options.type]
 * @param {boolean} [options.noIndex] لمنع الأرشفة (صفحات الحساب مثلاً)
 * @param {object} [options.article] بيانات مقال: { kind?: 'news'|'article', author?, publishedAt?, modifiedAt?, section? }
 * @param {{ar?: string, en?: string}|null} [options.alternates] لكل لغة مادة مستقلة: مسار كل نسخة. null = نسخة واحدة فلا hreflang؛
 *   وبلا قيمة (الصفحات العامة) الصفحة نفسها باللغتين كما اليوم.
 */
export function buildMeta({
  lang = 'ar',
  title,
  description,
  path = '/',
  image = SHARE_IMAGE.path,
  type = 'website',
  noIndex = false,
  article,
  alternates,
}) {
  const siteName = SITE_NAME[lang] ?? SITE_NAME.ar;
  const pageTitle = pick(title, lang);
  const fullTitle = pageTitle ? `${pageTitle} — ${siteName}` : siteName;
  const desc = excerpt(pick(description, lang));
  const canonical = absoluteUrl(localizedPath(path, lang));
  const imageUrl = image.startsWith('http') ? image : absoluteUrl(image);
  const isArticle = type === 'article' || Boolean(article);

  const tags = [
    { title: fullTitle },
    { name: 'description', content: desc },
    { tagName: 'link', rel: 'canonical', href: canonical },

    { property: 'og:site_name', content: siteName },
    { property: 'og:title', content: fullTitle },
    { property: 'og:description', content: desc },
    { property: 'og:type', content: isArticle ? 'article' : type },
    { property: 'og:url', content: canonical },
    { property: 'og:image', content: imageUrl },
    { property: 'og:image:alt', content: fullTitle },
    ...(image === SHARE_IMAGE.path
      ? [{ property: 'og:image:width', content: String(SHARE_IMAGE.width) }, { property: 'og:image:height', content: String(SHARE_IMAGE.height) }]
      : []),
    { property: 'og:locale', content: lang === 'en' ? 'en_US' : 'ar_PS' },
    { property: 'og:locale:alternate', content: lang === 'en' ? 'ar_PS' : 'en_US' },

    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: fullTitle },
    { name: 'twitter:description', content: desc },
    { name: 'twitter:image', content: imageUrl },
    { name: 'twitter:image:alt', content: fullTitle },
  ];

  if (noIndex) {
    tags.push({ name: 'robots', content: 'noindex, nofollow' });
  } else {
    // نسختا الصفحة باللغتين؛ x-default العربية.
    // مادة بلغة واحدة: لا hreflang (القسم 4.4 «اللغتان»)؛ ومادة بنسختين: رابط كل نسخة بلغتها.
    if (alternates !== null) {
      const arPath = alternates?.ar ?? path;
      const enPath = localizedPath(alternates?.en ?? path, 'en');
      tags.push(
        { tagName: 'link', rel: 'alternate', hrefLang: 'ar', href: absoluteUrl(arPath) },
        { tagName: 'link', rel: 'alternate', hrefLang: 'en', href: absoluteUrl(enPath) },
        { tagName: 'link', rel: 'alternate', hrefLang: 'x-default', href: absoluteUrl(arPath) },
      );
    }
    tags.push({ name: 'robots', content: 'index, follow, max-image-preview:large' });
  }

  if (article?.publishedAt) tags.push({ property: 'article:published_time', content: article.publishedAt });
  if (article?.modifiedAt) tags.push({ property: 'article:modified_time', content: article.modifiedAt });
  if (article?.author) tags.push({ property: 'article:author', content: article.author });
  if (article?.section) tags.push({ property: 'article:section', content: article.section });

  // بيانات منظّمة للمقالات — تساعد جوجل على عرض المؤلف وتاريخ النشر.
  if (article) {
    tags.push({
      'script:ld+json': {
        '@context': 'https://schema.org',
        '@type': article.kind === 'news' ? 'NewsArticle' : 'Article',
        headline: pageTitle,
        description: desc,
        inLanguage: lang,
        url: canonical,
        mainEntityOfPage: canonical,
        image: imageUrl,
        ...(article.author ? { author: { '@type': 'Person', name: article.author } } : {}),
        ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
        ...(article.modifiedAt || article.publishedAt ? { dateModified: article.modifiedAt ?? article.publishedAt } : {}),
        publisher: {
          '@type': 'Organization',
          name: siteName,
          logo: { '@type': 'ImageObject', url: absoluteUrl('/brand/wepal-logo-v3.png') },
        },
      },
    });
  }

  return tags;
}
