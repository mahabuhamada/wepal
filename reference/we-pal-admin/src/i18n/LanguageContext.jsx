import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import ar from './ar';
import en from './en';
import { setRequestLocale } from '../api/client';
import { setClientLang } from './clientLang';

const translations = { ar, en };
const STORAGE_KEY = 'wepal-lang';

const LanguageContext = createContext();

function getNestedValue(obj, path) {
  return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

/**
 * يثبّت اللغة في كوكي حتى يتمكّن الخادم من عرض `<html lang dir>` صحيحاً
 * في أول استجابة (انظر loader في src/root.jsx). localStorage يبقى
 * للتوافق مع ما كان محفوظاً لدى المستخدمين الحاليين.
 */
function persistLang(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // وضع التصفّح الخاص قد يمنع الكتابة — الكوكي وحدها تكفي.
  }
  document.cookie = `${STORAGE_KEY}=${lang}; path=/; max-age=31536000; samesite=lax`;
}

/**
 * initialLang يأتي من الخادم (الكوكي). لا نقرأ localStorage أثناء العرض
 * لأنه غير موجود على الخادم ولأن القراءة وقت العرض تُحدث عدم تطابق ترطيب.
 */
export function LanguageProvider({ children, initialLang = 'ar' }) {
  const [lang, setLang] = useState(initialLang);

  // في بناء SPA تُولَّد الصفحة وقت البناء فلا يرى الخادم ‎?lang=‎ ولا الكوكي:
  // نصحّح اللغة بعد التحميل (الرابط أولًا كما على الخادم، ثم المحفوظة). مع العرض من الخادم الخادمُ يقرؤها أصلًا.
  // يسبق تأثير الحفظ أدناه حتى لا يُكتب initialLang فوق المحفوظ.
  useEffect(() => {
    if (!import.meta.env.SPA_BUILD) return;
    const fromQuery = new URLSearchParams(window.location.search).get('lang');
    const saved = ['ar', 'en'].includes(fromQuery) ? fromQuery : /(?:^|;\s*)wepal-lang=(ar|en)/.exec(document.cookie)?.[1];
    if (saved && saved !== initialLang) setLang(saved);
    // مرة واحدة عند التحميل.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    persistLang(lang);
    // رسائل الخادم والنصوص التي يترجمها («عضو المنصة») تتبع لغة الواجهة.
    setRequestLocale(lang);
    // مزامنة سمات الوثيقة عند التبديل بعد الترطيب.
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    // عنوان التبويب يتبع لغة الواجهة (LangMeta في root يعيد حسابه).
    setClientLang(lang);
  }, [lang]);

  const toggleLang = useCallback(() => {
    setLang((prev) => (prev === 'ar' ? 'en' : 'ar'));
  }, []);

  const t = useCallback(
    (key, params) => {
      let value = getNestedValue(translations[lang], key) || getNestedValue(translations.ar, key) || key;
      if (params && typeof value === 'string') {
        Object.entries(params).forEach(([k, v]) => {
          value = value.replace(`{${k}}`, v);
        });
      }
      return value;
    },
    [lang]
  );

  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  const isRtl = lang === 'ar';

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t, dir, isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
}
