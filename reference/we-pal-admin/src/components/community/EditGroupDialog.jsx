import { useEffect, useRef, useState } from 'react';
import Modal from '../common/Modal';
import { useLanguage } from '../../i18n/LanguageContext';
import { createGroup, getGroupForEdit, updateGroup } from '../../api/platform';
import { listUsers } from '../../api/admin';
import { DEFAULT_GROUP_COLOR } from '../../utils/groupForm';
import { groupKindValid, groupPatch } from '../../utils/groupForm';
import { GROUP_TEXT_FIELDS, GROUP_TEXT_MAX, groupTextFields, groupTextValid } from '../../utils/groupForm';
import GroupMembersEditor from './GroupMembersEditor';
import { SELECTABLE_GROUP_KINDS } from '../../utils/groupKinds';
import { regionLabel, trackLabel } from '../../utils/apiMappers';
import Alert from '../ui/Alert';

const HEX = /^#[0-9A-Fa-f]{6}$/;
const SLUG = /^[A-Za-z0-9_-]{2,100}$/;

/**
 * تعديل المجموعة للمدير (B4.3): الاسم بالعربية والإنجليزية، والمعرّف (slug)، واللون، والميسّر (ملاحظة هلا د-7).
 * يُحمَّل بالترجمات الخام (withTranslations) لأن الاسم المعروض محلول بلغة واحدة.
 */
const BLANK_GROUP = { nameAr: '', nameEn: '', slug: '', color: '', kind: '', region: '', track: '', facilitatorId: '' };
// لا مجموعات اهتمام (قرار أمجد 17 نوفمبر): الجديدة مجموعة مسار حتى يختار المدير غيرها
const EMPTY_GROUP = { nameAr: '', nameEn: '', slug: '', color: DEFAULT_GROUP_COLOR, kind: 'TRACK', region: '', track: '', facilitatorId: '' };
// ملاحظة هلا د-6: الوصف والقواعد الخاصة بلغتين، وقسم الأعضاء (إضافة وإزالة فوريتان) عند التعديل.
const BLANK_TEXT = groupTextFields(null);

export default function EditGroupDialog({ groupId, onClose, onSaved, onMembersChange }) {
  const { t, lang } = useLanguage();
  const firstRef = useRef(null);
  // بلا groupId: إنشاء مجموعة جديدة من شاشة «المجموعات» في الإدارة (المرحلة 4)
  const creating = !groupId;
  // الفرق عن قيم فارغة: كل الحقول تُرسل عند الإنشاء (اللون والنوع إلزاميان في الخادم)
  const [initial, setInitial] = useState(() => (creating ? { ...BLANK_GROUP, ...BLANK_TEXT } : null));
  const [form, setForm] = useState(() => (creating ? { ...EMPTY_GROUP, ...BLANK_TEXT } : null));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // أصحاب دور «ميسّر» (يمنحه المدير من صفحة المستخدمين). تعذّر التحميل ← يبقى الميسّر الحالي وحده
  const [facilitators, setFacilitators] = useState([]);

  useEffect(() => {
    if (creating) return undefined;
    let active = true;
    getGroupForEdit(groupId)
      .then((g) => {
        if (!active) return;
        const names = g?.translations?.name || {};
        const init = {
          nameAr: names.ar ?? g?.name ?? '',
          nameEn: names.en ?? '',
          slug: g?.slug ?? '',
          color: g?.color ?? '#1A1A1A',
          // مجموعة قديمة بلا نوع في الرد = اهتمام (افتراض الخادم القديم)، تُعرض بنوعها ولا تُعرض للاختيار
          kind: g?.kind ?? 'INTEREST',
          region: g?.region ?? '',
          track: g?.track ?? '',
          facilitatorId: g?.facilitator?.id ?? '',
          ...groupTextFields(g),
        };
        if (g?.facilitator?.id) setFacilitators((list) => (list.some((u) => u.id === g.facilitator.id) ? list : [g.facilitator, ...list]));
        setInitial(init);
        setForm(init);
      })
      .catch((err) => { if (active) setError(err?.message || t('common.loadError')); });
    return () => { active = false; };
  }, [creating, groupId, t]);

  // قائمة الميسّرين للتعديل والإنشاء معًا
  useEffect(() => {
    let active = true;
    listUsers({ role: 'FACILITATOR', active: true })
      .then((res) => {
        if (!active) return;
        const found = (res?.data || []).map((u) => ({ id: u.id, name: u.name }));
        setFacilitators((list) => [...list.filter((u) => !found.some((f) => f.id === u.id)), ...found]);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const nameValid = form ? form.nameAr.trim().length >= 2 && form.nameAr.trim().length <= 100 : false;
  const slugValid = form ? SLUG.test(form.slug.trim()) : false;
  const colorValid = form ? HEX.test(form.color) : false;
  const kindValid = form ? groupKindValid(form) : false;
  const textValid = form ? GROUP_TEXT_FIELDS.every((field) => groupTextValid(form, field)) : false;
  const valid = nameValid && slugValid && colorValid && kindValid && textValid;

  // الوصف أو القواعد: عربي ثم إنجليزي اختياري، مع تلميح الحقل. الإنجليزية بلا عربية ← رسالة وتعطيل الحفظ.
  const textFields = (field, rows) => {
    const ok = groupTextValid(form, field);
    const hintId = `group-${field}-hint`;
    return (
      <fieldset className="space-y-2">
        <legend className="mb-1 text-xs font-bold text-[var(--wp-text-2)]">{t(`groupEdit.${field}`)}</legend>
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--wp-text-3)]">{t(`groupEdit.${field}Ar`)}</span>
          <textarea dir="rtl" rows={rows} value={form[`${field}Ar`]} onChange={set(`${field}Ar`)} maxLength={GROUP_TEXT_MAX[field]} aria-invalid={!ok} aria-describedby={hintId} className="wp-input w-full px-3 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-[var(--wp-text-3)]">{t(`groupEdit.${field}En`)}</span>
          <textarea dir="ltr" rows={rows} value={form[`${field}En`]} onChange={set(`${field}En`)} maxLength={GROUP_TEXT_MAX[field]} className="wp-input w-full px-3 py-2 text-sm" />
        </label>
        <p id={hintId} className={`text-xs ${ok ? 'text-[var(--wp-text-3)]' : 'text-[var(--wp-coral-deep)]'}`}>
          {ok ? t(`groupEdit.${field}Hint`) : t('groupEdit.textArFirst')}
        </p>
      </fieldset>
    );
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!valid) return;
    const payload = groupPatch(initial, form);
    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }
    setBusy(true);
    setError('');
    try {
      if (creating) await createGroup(payload);
      else await updateGroup(groupId, payload);
      await onSaved?.();
      onClose();
    } catch (err) {
      setError(err?.message || t('common.loadError'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t(creating ? 'groupEdit.createTitle' : 'groupEdit.title')} onClose={busy ? undefined : onClose} initialFocusRef={firstRef}>
      {!form && !error && <p className="text-sm text-[var(--wp-text-muted)]">{t('common.loading')}</p>}
      {form && (
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--wp-text-3)]">{t('groupEdit.nameAr')}</span>
            <input ref={firstRef} dir="rtl" value={form.nameAr} onChange={set('nameAr')} maxLength={100} aria-invalid={!nameValid} className="wp-input w-full px-3 py-2 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--wp-text-3)]">{t('groupEdit.nameEn')}</span>
            <input dir="ltr" value={form.nameEn} onChange={set('nameEn')} maxLength={100} className="wp-input w-full px-3 py-2 text-sm" />
          </label>
          {textFields('description', 3)}
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--wp-text-3)]">{t('groupEdit.slug')}</span>
            <input dir="ltr" value={form.slug} onChange={set('slug')} maxLength={100} aria-invalid={!slugValid} className="wp-input w-full px-3 py-2 text-sm font-mono" />
            {!slugValid && <span className="mt-1 block text-xs text-[var(--wp-coral-deep)]">{t('groupEdit.slugRule')}</span>}
          </label>
          <div>
            <label htmlFor="group-color-hex" className="mb-1 block text-xs text-[var(--wp-text-3)]">{t('groupEdit.color')}</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                aria-label={t('groupEdit.color')}
                value={colorValid ? form.color : '#000000'}
                onChange={set('color')}
                className="h-9 w-12 cursor-pointer rounded-lg border border-[var(--wp-border)]"
              />
              <input id="group-color-hex" dir="ltr" value={form.color} onChange={set('color')} maxLength={7} aria-invalid={!colorValid} className="wp-input w-28 px-3 py-2 text-sm font-mono" />
            </div>
          </div>

          {/* الحزمة 4: النوع ورابطه. صارت منطقة أو مسارًا ← يدخلها من تنطبق عليه القاعدة الآن (الخادم). */}
          <label className="block">
            <span className="mb-1 block text-xs text-[var(--wp-text-3)]">{t('groupEdit.kind')}</span>
            <select value={form.kind} onChange={set('kind')} className="wp-input w-full px-3 py-2 text-sm">
              {/* مجموعة اهتمام قديمة تُعرض بنوعها، ولا يُختار هذا النوع لغيرها */}
              {initial?.kind === 'INTEREST' && <option value="INTEREST" disabled>{t('trackGroups.kind.INTEREST')}</option>}
              {SELECTABLE_GROUP_KINDS.map((k) => <option key={k} value={k}>{t(`trackGroups.kind.${k}`)}</option>)}
            </select>
          </label>
          {form.kind === 'REGION' && (
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--wp-text-3)]">{t('groupEdit.region')}</span>
              <select value={form.region} onChange={set('region')} aria-invalid={!kindValid} className="wp-input w-full px-3 py-2 text-sm">
                <option value="">—</option>
                {['GAZA', 'WEST_BANK', 'OTHER'].map((r) => <option key={r} value={r}>{regionLabel(r, lang)}</option>)}
              </select>
            </label>
          )}
          {form.kind === 'TRACK' && (
            <label className="block">
              <span className="mb-1 block text-xs text-[var(--wp-text-3)]">{t('groupEdit.track')}</span>
              <select value={form.track} onChange={set('track')} aria-invalid={!kindValid} className="wp-input w-full px-3 py-2 text-sm">
                <option value="">—</option>
                {['RESEARCH', 'INITIATIVES', 'DIGITAL_CONTENT'].map((tr) => <option key={tr} value={tr}>{trackLabel(tr, lang)}</option>)}
              </select>
            </label>
          )}
          {form.kind !== 'INTEREST' && <p className="text-xs text-[var(--wp-text-3)]">{t('groupEdit.kindHint')}</p>}

          <div>
            <label htmlFor="group-facilitator" className="mb-1 block text-xs text-[var(--wp-text-3)]">{t('groupEdit.facilitator')}</label>
            <select id="group-facilitator" value={form.facilitatorId} onChange={set('facilitatorId')} aria-describedby="group-facilitator-hint" className="wp-input w-full px-3 py-2 text-sm">
              <option value="">{t('groupEdit.noFacilitator')}</option>
              {facilitators.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <p id="group-facilitator-hint" className="mt-1 text-xs text-[var(--wp-text-3)]">{t('groupEdit.facilitatorHint')}</p>
          </div>

          {textFields('rules', 5)}

          {error && (
            <Alert size="sm">{error}</Alert>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} disabled={busy} className="rounded-xl px-4 py-2 text-sm text-[var(--wp-text-2)] hover:bg-[#F6F6F6] disabled:opacity-50">
              {t('common.cancel')}
            </button>
            <button type="submit" disabled={busy || !valid} className="wp-btn-ink rounded-xl px-4 py-2 text-sm disabled:opacity-50">
              {busy ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>
      )}
      {!form && error && <div role="alert" className="text-sm text-[var(--wp-coral-deep)]">{error}</div>}
      {/* الأعضاء عند التعديل فقط: الفعل فوري، خارج النموذج (لا يحفظه «حفظ» ولا يلغيه «إلغاء») */}
      {!creating && form && <GroupMembersEditor groupId={groupId} onChange={onMembersChange} />}
    </Modal>
  );
}
