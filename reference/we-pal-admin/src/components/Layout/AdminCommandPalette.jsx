import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, BookOpen } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../auth/AuthContext';
import { USE_API } from '../../config';
import { canAccessAdminPath, hasPermission } from '../../utils/roles';
import * as adminApi from '../../api/admin';
import * as portalApi from '../../api/publicPortal';
import { trapTab } from '../../utils/focusTrap';
import { visibleNavGroups } from './adminNav';
import { paletteMatches } from './paletteMatch';

const MAX_RESULTS = 14;
const MIN_QUERY = 2;
const DEBOUNCE_MS = 250;

/**
 * لوحة الأوامر (Ctrl K، القرار 10): انتقال إلى صفحة، وبحث في الأعضاء بالاسم أو البريد، وفي المكتبة.
 * تعمل بالأسهم وEnter وEsc، وتحترم الصلاحيات (صفحات الدور وحده، والبحث لمن يملك صلاحيته).
 * الأفعال السريعة («خبر جديد»…) والبحث في الأخبار والقصص يأتيان مع نمط القائمة والمحرّر (المرحلتان 2 و3).
 */
export default function AdminCommandPalette({ onClose }) {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const listId = useId();
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const returnFocus = useRef(typeof document !== 'undefined' ? document.activeElement : null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  // نتيجة البحث في الخادم ومعها نصّها: تُستعمل فقط ما دام النص الحالي هو نفسه
  const [remote, setRemote] = useState({ q: '', members: [], library: [] });

  const canSearchMembers = USE_API && hasPermission(user, 'users.view');
  const canSearchLibrary = USE_API && hasPermission(user, 'content.manage');

  const pages = useMemo(
    () => visibleNavGroups((path) => !USE_API || canAccessAdminPath(user, path)).flatMap((group) => group.items.map((item) => ({
      kind: 'page',
      id: item.to,
      label: t(`adminShell.nav.${item.label}`),
      sub: t(`adminShell.groups.${group.id}`),
      to: item.to,
      path: group.path,
      icon: item.icon,
    }))),
    [t, user],
  );

  // البحث في الخادم بعد توقّف الكتابة، ونتيجة طلب قديم لا تحلّ محلّ الأحدث
  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY || (!canSearchMembers && !canSearchLibrary)) return undefined;
    let live = true;
    const timer = setTimeout(async () => {
      const [members, library] = await Promise.all([
        canSearchMembers ? adminApi.listUsers({ q }).then((r) => r?.data ?? []).catch(() => []) : [],
        canSearchLibrary ? portalApi.listResources({ q }, lang).then((r) => r ?? []).catch(() => []) : [],
      ]);
      if (!live) return;
      setRemote({
        q,
        members: members.slice(0, 5).map((m) => ({ kind: 'member', id: `m-${m.id}`, label: m.name || m.email, sub: m.email || '', to: `/admin/users?q=${encodeURIComponent(m.email || m.name || '')}`, path: 'vote', icon: User })),
        library: library.slice(0, 5).map((r) => ({ kind: 'library', id: `r-${r.id}`, label: r.title, sub: t('adminShell.nav.library'), to: '/admin/library', path: 'lib', icon: BookOpen })),
      });
    }, DEBOUNCE_MS);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query, canSearchMembers, canSearchLibrary, lang, t]);

  const results = useMemo(() => {
    const q = query.trim();
    const matchedPages = q ? pages.filter((p) => paletteMatches(`${p.label} ${p.sub}`, q)) : pages;
    const fresh = q.length >= MIN_QUERY && remote.q === q;
    return [
      ...matchedPages.map((r) => ({ ...r, group: t('adminShell.palette.pages') })),
      ...(fresh ? remote.members : []).map((r) => ({ ...r, group: t('adminShell.palette.members') })),
      ...(fresh ? remote.library : []).map((r) => ({ ...r, group: t('adminShell.palette.library') })),
    ].slice(0, MAX_RESULTS);
  }, [pages, remote, query, t]);

  const active = Math.min(selected, Math.max(0, results.length - 1));

  const close = () => {
    onClose();
    const el = returnFocus.current;
    if (el && typeof el.focus === 'function' && document.contains(el)) el.focus();
  };

  const go = (index) => {
    const item = results[index];
    if (!item) return;
    onClose();
    navigate(item.to);
  };

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [active, listId]);

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelected(results.length ? (active + 1) % results.length : 0);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelected(results.length ? (active - 1 + results.length) % results.length : 0);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(active);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    } else if (event.key === 'Tab') {
      trapTab(event, boxRef.current);
    }
  };

  let lastGroup = '';
  return (
    <div className="azq-pal" onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div ref={boxRef} className="azq-pal-box" role="dialog" aria-modal="true" aria-label={t('adminShell.palette.open')} onKeyDown={onKeyDown}>
        <div className="azq-pal-input">
          <Search aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={results.length ? `${listId}-${active}` : undefined}
            placeholder={t('adminShell.palette.placeholder')}
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(0);
            }}
          />
          <kbd aria-hidden="true">Esc</kbd>
        </div>
        <ul id={listId} role="listbox" aria-label={t('adminShell.palette.results')}>
          {results.length === 0 && <li role="presentation" className="azq-pal-group">{t('adminShell.palette.empty')}</li>}
          {results.map((item, index) => {
            const heading = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            const Icon = item.icon;
            return [
              heading && <li key={`h-${heading}`} role="presentation" className="azq-pal-group">{heading}</li>,
              <li
                key={item.id}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                className="azq-pal-option"
                data-path={item.path}
                onMouseMove={() => setSelected(index)}
                onClick={() => go(index)}
              >
                <span className="azq-pal-tile" aria-hidden="true">{Icon && <Icon />}</span>
                <span className="azq-pal-label">{item.label}</span>
                <small>{item.sub}</small>
              </li>,
            ];
          })}
        </ul>
        <div className="azq-pal-foot" aria-hidden="true">
          <span><kbd>↑</kbd> <kbd>↓</kbd> {t('adminShell.palette.move')}</span>
          <span><kbd>Enter</kbd> {t('adminShell.palette.openItem')}</span>
        </div>
      </div>
    </div>
  );
}
