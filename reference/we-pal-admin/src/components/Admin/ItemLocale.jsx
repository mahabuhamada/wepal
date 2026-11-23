import { Link } from 'react-router-dom';
import { Languages } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useTheme } from '../../theme/ThemeContext';
import { itemLanguages } from '../../utils/itemLanguages';

// لغة الصف في قوائم المحتوى: كل لغة مادة مستقلة (ترحيل اللغتين)، والنسخة الأخرى صف آخر.
// في «أزرق هادئ» ومع type: شارة لكل لغة للمادة (هذه وأخواتها)، وكلٌّ منها رابط يفتح نسختها في المحرّر.
// التصميم الحالي (classic) يبقى شارة لغة الصف وحدها كما في حارسه.
export default function ItemLocale({ locale, item, type }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const label = (l) => (l === 'en' ? t('adminBilingual.english') : t('adminBilingual.arabic'));

  if (theme === 'azraq' && type && item?.id && !item.isDemo) {
    return (
      <span className="wp-item-langs" role="group" aria-label={t('adminBilingual.language')}>
        {itemLanguages(item).map((l) => (
          <Link
            key={l.locale}
            to={`/admin/editor/${type}/${l.id}`}
            className={`wp-pill wp-item-lang${l.current ? ' is-current' : ''}`}
            lang={l.locale}
            aria-current={l.current ? 'true' : undefined}
            aria-label={t('adminBilingual.openVersion', { lang: t(`adminBilingual.versionNames.${l.locale}`) })}
            title={t('adminBilingual.openVersion', { lang: t(`adminBilingual.versionNames.${l.locale}`) })}
          >
            {l.current && <Languages size={11} aria-hidden="true" />}
            {label(l.locale)}
          </Link>
        ))}
      </span>
    );
  }

  const en = (locale ?? item?.locale) === 'en';
  return (
    <span className="wp-pill bg-[#F3F4F6] text-[var(--wp-text-3)]" lang={en ? 'en' : 'ar'}>
      <Languages size={11} aria-hidden="true" />
      {label(en ? 'en' : 'ar')}
    </span>
  );
}
