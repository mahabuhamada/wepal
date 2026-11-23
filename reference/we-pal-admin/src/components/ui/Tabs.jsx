import { useRef } from 'react';

/**
 * تبويبات النظام: شريط من الأزرار يبدّل محتوى الصفحة (styles/components.css).
 *   tabs:     [{ id, label, count? }]
 *   value:    معرّف التبويب المختار. onChange(id) عند الاختيار.
 *   label:    اسم الشريط لقارئ الشاشة.
 *   idPrefix: إن مُرّر، يأخذ كل تبويب id = `${idPrefix}-tab-${id}` ويشير إلى لوحة `${idPrefix}-panel-${id}`
 *             (ضع هذا الـ id على حاوية المحتوى مع role="tabpanel").
 * لوحة المفاتيح: الأسهم تنتقل بين التبويبات (باتجاه اللغة)، Home / End لأولها وآخرها؛ والتبويب المختار وحده في ترتيب Tab.
 */
export default function Tabs({ tabs, value, onChange, label, idPrefix, className = '' }) {
  const listRef = useRef(null);

  const focusAndSelect = (index) => {
    const next = tabs[(index + tabs.length) % tabs.length];
    onChange(next.id);
    // بعد إعادة الرسم يصير التبويب الجديد هو القابل للتركيز.
    requestAnimationFrame(() => listRef.current?.querySelector(`[data-tab-id="${CSS.escape(String(next.id))}"]`)?.focus());
  };

  const onKeyDown = (event) => {
    const index = tabs.findIndex((tab) => tab.id === value);
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (event.key === forward) focusAndSelect(index + 1);
    else if (event.key === backward) focusAndSelect(index - 1);
    else if (event.key === 'Home') focusAndSelect(0);
    else if (event.key === 'End') focusAndSelect(tabs.length - 1);
    else return;
    event.preventDefault();
  };

  return (
    <div ref={listRef} role="tablist" aria-label={label} className={['ui-tabs', className].filter(Boolean).join(' ')} onKeyDown={onKeyDown}>
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            data-tab-id={tab.id}
            id={idPrefix ? `${idPrefix}-tab-${tab.id}` : undefined}
            aria-controls={idPrefix ? `${idPrefix}-panel-${tab.id}` : undefined}
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            className="ui-tab"
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
            {tab.count !== undefined && tab.count !== null && <span className="ui-tab-count">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
