import { useId, useState } from 'react';
import { X } from 'lucide-react';
import Avatar from './Avatar';
import { useLanguage } from '../../i18n/LanguageContext';
import useUserSearch from '../../hooks/useUserSearch';
import { avatarLetter } from '../../utils/avatarLetter';

// اختيار مستخدم بالبحث (GET /users/search — العقد §2.1): بالاسم أو بالبريد الكامل.
// متحكَّم به: selected + onChange(user|null). excludeIds: مستخدمون لا يُعرضون (أعضاء/مراجعون حاليون).
// inputRef: لتركيز حقل البحث عند فتح نافذة (Modal.initialFocusRef).
export default function UserPicker({ label, selected, onChange, excludeIds = [], inputRef }) {
  const { t } = useLanguage();
  const inputId = useId();
  const listId = useId();
  const statusId = useId();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const { status, results, error } = useUserSearch(query);

  const options = results.filter((u) => !excludeIds.includes(u.id));
  const open = status === 'done' && options.length > 0;
  const activeIndex = Math.min(active, Math.max(options.length - 1, 0));

  const choose = (user) => {
    onChange(user);
    setQuery('');
    setActive(0);
  };

  const onKeyDown = (e) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i - 1 + options.length) % options.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(options[activeIndex]);
    } else if (e.key === 'Escape') {
      e.stopPropagation(); // لا نغلق النافذة الأم، فقط نمسح البحث
      setQuery('');
    }
  };

  const message = {
    idle: query.trim() ? t('userPicker.minChars') : t('userPicker.hint'),
    loading: t('userPicker.searching'),
    done: options.length === 0 ? t('userPicker.noResults') : '',
    unavailable: t('userPicker.unavailable'),
    error: error?.message || t('common.loadError'),
  }[status];

  if (selected) {
    return (
      <div>
        {label && <span className="mb-1 block text-xs text-[var(--wp-text-3)]">{label}</span>}
        <div className="flex items-center gap-2 rounded-xl border border-[var(--wp-border-2)] px-3 py-2">
          <Avatar letter={avatarLetter(selected.name)} src={selected.avatarUrl} size={28} />
          <span className="flex-1 text-sm font-medium text-[var(--wp-ink)]">{selected.name}</span>
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label={t('userPicker.clear', { name: selected.name })}
            className="rounded-lg p-1 text-[var(--wp-text-muted)] hover:bg-[#F6F6F6]"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-xs text-[var(--wp-text-3)]">
          {label}
        </label>
      )}
      <input
        ref={inputRef}
        id={inputId}
        type="search"
        role="combobox"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        maxLength={100}
        autoComplete="off"
        placeholder={t('userPicker.placeholder')}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open ? `${listId}-${activeIndex}` : undefined}
        aria-describedby={statusId}
        className="wp-input w-full px-3 py-2 text-sm"
      />
      {open && (
        <ul id={listId} role="listbox" className="mt-1 max-h-60 overflow-y-auto rounded-xl border border-[var(--wp-border-2)] bg-white p-1 shadow-sm">
          {options.map((user, i) => (
            <li
              key={user.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              aria-label={user.nameHidden ? `${user.name} ${t('userPicker.hiddenName')}` : user.name}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(user)}
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm ${i === activeIndex ? 'bg-[#F6F6F6]' : ''}`}
            >
              <Avatar letter={avatarLetter(user.name)} src={user.avatarUrl} size={24} />
              <span className="text-[var(--wp-ink)]">{user.name}</span>
              {user.nameHidden && <span className="text-xs text-[var(--wp-text-muted)]">{t('userPicker.hiddenName')}</span>}
            </li>
          ))}
        </ul>
      )}
      <p
        id={statusId}
        role={status === 'error' ? 'alert' : undefined}
        aria-live="polite"
        className={`mt-1 min-h-[1rem] text-xs ${status === 'error' ? 'text-[var(--wp-coral-deep)]' : 'text-[var(--wp-text-muted)]'}`}
      >
        {message}
      </p>
    </div>
  );
}
