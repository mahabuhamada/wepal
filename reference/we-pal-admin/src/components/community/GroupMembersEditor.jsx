import { useId, useState } from 'react';
import { UserMinus, UserPlus } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { addGroupMember, listGroupMembers, removeGroupMember } from '../../api/platform';
import useInfiniteList from '../../hooks/useInfiniteList';
import UserPicker from '../common/UserPicker';
import LoadMore from '../common/LoadMore';
import Avatar from '../common/Avatar';
import { avatarLetter } from '../../utils/avatarLetter';
import Alert from '../ui/Alert';

/**
 * أعضاء المجموعة في «تعديل المجموعة» (ملاحظة هلا د-6، لصاحب groups.manage): إضافة عضو بالبحث بالاسم
 * (UserPicker ← GET /users/search) وإزالته. الفعل فوري لا ينتظر «حفظ»، والإزالة تحتاج نقرة تأكيد ثانية.
 * لا شاشة إدارة للمجموعات (قرار معتمد): كل هذا من نافذة داخل منطقة الأعضاء.
 * onChange: بعد كل إضافة أو إزالة (لتحديث عدد الأعضاء في الصفحة خلف النافذة).
 */
export default function GroupMembersEditor({ groupId, onChange }) {
  const { t } = useLanguage();
  const headingId = useId();
  const list = useInfiniteList((page) => listGroupMembers(groupId, page), [groupId]);
  const [picked, setPicked] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(null); // معرّف العضو الذي ينتظر تأكيد إزالته
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  // meta.total من آخر تحميل؛ الإزالة تحذف من القائمة محليًا فتُطرح من العدد حتى التحميل التالي
  const [removedCount, setRemovedCount] = useState(0);
  const total = Math.max(0, (list.meta?.total ?? list.items.length) - removedCount);

  const add = async () => {
    if (!picked || busy) return;
    setBusy(true);
    setError('');
    try {
      await addGroupMember(groupId, picked.id);
      setStatus(t('groupMembersEdit.added', { name: picked.name }));
      setPicked(null);
      await list.reload({ quiet: true });
      setRemovedCount(0);
      onChange?.();
    } catch (err) {
      setError(err?.message || t('common.loadError'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (member) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await removeGroupMember(groupId, member.id);
      list.setItems((items) => items.filter((m) => m.id !== member.id));
      if (list.meta?.total != null) setRemovedCount((n) => n + 1);
      setConfirming(null);
      setStatus(t('groupMembersEdit.removed', { name: member.name }));
      onChange?.();
    } catch (err) {
      setError(err?.message || t('common.loadError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby={headingId} className="mt-6 space-y-3 border-t border-[var(--wp-border)] pt-4">
      <div>
        <h3 id={headingId} className="text-sm font-bold text-[var(--wp-ink)]">
          {t('groupMembersEdit.title')} {!list.loading && <span className="font-normal text-[var(--wp-text-3)]">({total.toLocaleString('en-US')})</span>}
        </h3>
        <p className="mt-1 text-xs text-[var(--wp-text-3)]">{t('groupMembersEdit.hint')}</p>
      </div>

      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <UserPicker
            label={t('groupMembersEdit.addLabel')}
            selected={picked}
            onChange={(user) => { setPicked(user); setStatus(''); setError(''); }}
            excludeIds={list.items.map((m) => m.id)}
          />
        </div>
        {picked && (
          <button type="button" onClick={add} disabled={busy} className="wp-btn-ink inline-flex items-center gap-1 rounded-xl px-4 py-2 text-sm disabled:opacity-50">
            <UserPlus size={14} aria-hidden="true" />
            {t('groupMembersEdit.add')}
          </button>
        )}
      </div>

      <p className="sr-only" role="status">{status}</p>
      {status && <p className="text-xs text-[var(--wp-text-2)]" aria-hidden="true">{status}</p>}
      {error && <Alert size="sm">{error}</Alert>}

      {list.loading && <p className="text-xs text-[var(--wp-text-muted)]">{t('common.loading')}</p>}
      {list.error && !list.loading && <Alert size="sm">{list.error?.message || t('common.loadError')}</Alert>}
      {!list.loading && !list.error && list.items.length === 0 && (
        <p className="text-xs text-[var(--wp-text-muted)]">{t('groupMembersEdit.empty')}</p>
      )}
      {list.items.length > 0 && (
        <ul className="max-h-72 space-y-1 overflow-y-auto" aria-labelledby={headingId}>
          {list.items.map((m) => (
            <li key={m.id} className="flex items-center gap-2 rounded-lg px-1 py-1">
              <Avatar letter={avatarLetter(m.name)} src={m.avatarUrl} size={28} />
              <span className="min-w-0 flex-1 truncate text-sm text-[var(--wp-ink)]">{m.name}</span>
              {confirming === m.id ? (
                <>
                  <button type="button" onClick={() => remove(m)} disabled={busy} className="rounded-lg px-2 py-1 text-xs font-bold text-[var(--wp-coral-deep)] hover:bg-[#F6F6F6] disabled:opacity-50">
                    {t('groupMembersEdit.confirmRemove', { name: m.name })}
                  </button>
                  <button type="button" onClick={() => setConfirming(null)} disabled={busy} className="rounded-lg px-2 py-1 text-xs text-[var(--wp-text-2)] hover:bg-[#F6F6F6]">
                    {t('common.cancel')}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => { setConfirming(m.id); setStatus(''); }}
                  disabled={busy}
                  aria-label={t('groupMembersEdit.removeLabel', { name: m.name })}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[var(--wp-text-2)] hover:bg-[#F6F6F6] disabled:opacity-50"
                >
                  <UserMinus size={14} aria-hidden="true" />
                  {t('groupMembersEdit.remove')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoadMore={list.loadMore} />
    </section>
  );
}
