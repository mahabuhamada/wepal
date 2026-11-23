// صور المحتوى: شكل واحد في الواجهة لكل صورة تأتي من الـ API أو من صور المنتدى الثابتة.
// الـ API (عقد جلسة azraq-admin): { url, srcset, width, height, alt, credit } أو null.

const positive = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};
const text = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);

/**
 * صورة صالحة للعرض أو null: بلا url لا صورة (يُرسم البديل).
 * width/height تحجز المساحة (لا قفز في التخطيط)، و alt نص فارغ إن لم يُكتب (الصورة زخرفية حينها).
 */
export function normalizeImage(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const url = text(raw.url);
  if (!url) return null;
  return {
    url,
    srcset: text(raw.srcset),
    width: positive(raw.width),
    height: positive(raw.height),
    alt: text(raw.alt) ?? '',
    credit: text(raw.credit),
  };
}

// صور مجموعات من نشاطات المنتدى الاجتماعي التنموي (assets-sdf، بموافقة أمجد 2026-10-21)، مقصوص منها
// شريط الشعارات أسفلها. تُستعمل في التعريف بالمنصة وصفحة الدخول فقط، لا على مادة عن حدث آخر.
const SDF_PHOTOS = {
  facilitators: {
    width: 1280,
    height: 666,
    alt: {
      ar: 'ميسّرو شبكة الدعم النفسي والاجتماعي في ختام تدريبهم ضمن «يلا تشينج 7»',
      en: 'Psychosocial support network facilitators at the end of their Yalla Change 7 training',
    },
  },
  training: {
    width: 1280,
    height: 666,
    alt: {
      ar: 'تدريب فريق «الباروميتر الشبابي الفلسطيني 2026» على جمع البيانات وتحليلها',
      en: 'Palestinian Youth Barometer 2026 team training in data collection and analysis',
    },
  },
  dabke: {
    width: 1280,
    height: 666,
    alt: {
      ar: 'شباب «يلا تشينج» في إطلاق مبادرة «إلك بنغني»',
      en: 'Yalla Change youth at the launch of the “Ilak Binghanni” initiative',
    },
  },
  integrity: {
    width: 1280,
    height: 665,
    alt: {
      ar: '30 شابًا وشابة في ختام «مدرسة النزاهة 2026» في قطاع غزة',
      en: '30 young people at the closing of Integrity School 2026 in Gaza',
    },
  },
};

export const SDF_PHOTO_KEYS = Object.keys(SDF_PHOTOS);

/** صورة منتدى ثابتة بشكل صورة الـ API. credit: نص النسبة بلغة الصفحة. */
export function sdfPhoto(key, lang, credit = null) {
  const photo = SDF_PHOTOS[key];
  if (!photo) return null;
  const base = `/images/sdf/${key}`;
  return normalizeImage({
    url: `${base}-1280.webp`,
    srcset: `${base}-640.webp 640w, ${base}-1280.webp 1280w`,
    width: photo.width,
    height: photo.height,
    alt: photo.alt[lang] ?? photo.alt.ar,
    credit,
  });
}

// العنوان على غلاف الإصدار: ما بعد «ورقة بحثية:» إن كان قبل النقطتين اسم قصير (النوع مكتوب في رأس الغلاف).
export function coverTitle(title = '') {
  const text = String(title ?? '');
  const i = text.indexOf(':');
  return i > 0 && i < 24 ? text.slice(i + 1).trim() : text;
}
