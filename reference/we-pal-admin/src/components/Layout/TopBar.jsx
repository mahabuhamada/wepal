import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Languages } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { USE_API } from '../../config';
import useUnreadNotifications from '../../hooks/useUnreadNotifications';
import { useTheme } from '../../theme/ThemeContext';
import AdminTopBarAzraq from './AdminTopBarAzraq';
import { BRAND } from '../../i18n/brand';

// الشريط العلوي لصفحات الإدارة: السمة «أزرق هادئ» لها شريطها (AdminTopBarAzraq)، والتصميم الحالي أدناه بلا تغيير.
// عنوان التبويب «الصفحة — المنصة» في السمتين، ويتبع تبديل اللغة فورًا. يُكتب في document.title (لا عنصر <title> ثانٍ):
// عنوان الخادم يأتي من meta المسار، فيبقى في <head> عنوان واحد يحمل اسم الصفحة بعد الدخول.
export default function TopBar({ title }) {
  const { theme } = useTheme();
  const { lang } = useLanguage();
  const tabTitle = `${title} — ${BRAND.name[lang] ?? BRAND.name.ar}`;
  useEffect(() => {
    document.title = tabTitle;
  }, [tabTitle]);
  return theme === 'azraq' ? <AdminTopBarAzraq title={title} /> : <ClassicTopBar title={title} />;
}

function ClassicTopBar({ title }) {
  const { t, toggleLang } = useLanguage();
  const navigate = useNavigate();
  // شارة الإشعارات غير المقروءة: نفس مصدر القشرات الأخرى (وقت حقيقي، بلا طلب كل دقيقة).
  const unread = useUnreadNotifications();

  return (
    <header className="h-16 bg-white/85 backdrop-blur-xl border-b border-[var(--wp-border)] flex items-center justify-between px-8 shrink-0 sticky top-0 z-30">
      <h1 className="text-body font-extrabold tracking-tight text-[var(--wp-ink)]">{title}</h1>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleLang}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[10px] border border-[var(--wp-border-2)] text-label font-bold text-[var(--wp-ink)] transition-colors hover:border-[var(--wp-coral)] hover:text-[var(--wp-coral)]"
        >
          <Languages size={16} />
          {t('lang.toggle')}
        </button>
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-xl transition-colors hover:bg-[#F6F6F6]"
          aria-label={t('notifications.title')}
        >
          <Bell size={20} className="text-[var(--wp-text-3)]" />
          {USE_API ? (
            unread > 0 && (
              <span className="absolute -top-0.5 -start-0.5 min-w-[16px] h-4 px-1 flex items-center justify-center bg-[var(--wp-coral)] text-white text-caption font-bold rounded-full">
                {unread > 9 ? '9+' : unread}
              </span>
            )
          ) : (
            <span className="absolute top-1.5 start-1.5 w-2 h-2 bg-[var(--wp-coral)] rounded-full" />
          )}
        </button>
      </div>
    </header>
  );
}
