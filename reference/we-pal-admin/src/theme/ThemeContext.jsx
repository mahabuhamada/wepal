import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { USE_API } from '../config';
import { getAppearance } from '../api/publicPortal';
import { DEFAULT_HERO, DEFAULT_THEME, EMPTY_PAGE_HEADERS, applyTheme, isTheme, normalizeAppearance } from '../utils/siteTheme';

const ThemeContext = createContext({ theme: DEFAULT_THEME, hero: DEFAULT_HERO, pageHeaders: EMPTY_PAGE_HEADERS, setTheme: () => {}, setHero: () => {} });

// السمة الأولى: ما ضبطه سكربت ما قبل الرسم على <html> (من الكوكي)، وإلا ما جاء من الخادم.
function startingTheme(initialTheme) {
  if (typeof document !== 'undefined') {
    const fromDom = document.documentElement.getAttribute('data-theme');
    if (isTheme(fromDom)) return fromDom;
  }
  return isTheme(initialTheme) ? initialTheme : DEFAULT_THEME;
}

/**
 * سمة الواجهة وإعدادات الهيرو، كما يختارها المدير من «إعدادات الواجهة».
 * تُقرأ من GET /public/appearance عند التحميل؛ إن تعذّر الطلب تبقى السمة المحفوظة (الكوكي) أو الحالية.
 * setTheme يطبّق فورًا (يستعمله المدير بعد الحفظ دون إعادة تحميل).
 */
export function ThemeProvider({ initialTheme = DEFAULT_THEME, initialHero, initialPageHeaders, children }) {
  const [theme, setThemeState] = useState(() => startingTheme(initialTheme));
  // hero من الخادم (root loader) حين يتوفر: الهيرو الصحيح من أول رسم، بلا قفزة من السلايدر إلى الشبكة.
  const [hero, setHero] = useState(initialHero ?? DEFAULT_HERO);
  // صور رؤوس صفحات القوائم (جولة 6): من الخادم في أول رسم، ثم من طلب المتصفح.
  const [pageHeaders, setPageHeaders] = useState(initialPageHeaders ?? EMPTY_PAGE_HEADERS);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!USE_API) return undefined;
    let alive = true;
    getAppearance()
      .then((res) => {
        if (!alive) return;
        const appearance = normalizeAppearance(res);
        setThemeState(appearance.design);
        setHero(appearance.hero);
        setPageHeaders(appearance.pageHeaders);
      })
      // الطلب لا يمنع عرض الصفحة: نبقى على السمة المحفوظة.
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const setTheme = useCallback((next) => {
    if (isTheme(next)) setThemeState(next);
  }, []);

  const value = useMemo(() => ({ theme, hero, pageHeaders, setTheme, setHero }), [theme, hero, pageHeaders, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
