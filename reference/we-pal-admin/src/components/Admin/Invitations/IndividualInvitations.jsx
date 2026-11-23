import { useEffect, useState } from 'react';
import { Copy, FileSpreadsheet, Search, Send, Trash2, UserPlus, UserRound } from 'lucide-react';
import Card from '../../common/Card';
import ConfirmDialog from '../../common/ConfirmDialog';
import ErrorState from '../../common/ErrorState';
import LoadMore from '../../common/LoadMore';
import { Badge } from '../../common/Badge';
import { useAdminNotice } from '../adminNoticeContext';
import Button from '../../ui/Button';
import EmptyState from '../../ui/EmptyState';
import { Input, Select } from '../../ui/Input';
import useInfiniteList from '../../../hooks/useInfiniteList';
import { useLanguage } from '../../../i18n/LanguageContext';
import { listIndividualInvitations, sendInvitationSms } from '../../../api/invitations';
import { markInvitationCopied, revokeInvitationCode } from '../../../api/invitationBatches';
import { unwrapList } from '../../../api/client';
import { formatShortDate } from '../../../utils/apiMappers';
import { INVITE_FILTERS, INVITE_LIMITS, INVITE_STATUS_TONES, canSendSms, upsertInvitation } from '../../../utils/individualInvitations';
import InviteFormDialog from './InviteFormDialog';
import SheetInviteDialog from './SheetInviteDialog';
import { copyText } from './copyText';
import useUrlParam from '../../../hooks/useUrlParam';

/**
 * التبويب الأول في /admin/invitations: الدعوات الفردية. «دعوة شخص»، وجدول بالاسم والجوال المقنّع والكود
 * والحالة، وإعادة الإرسال ونسخ الرابط والإلغاء، وترشيح بالحالة وبحث بالاسم.
 */
export default function IndividualInvitations() {
  const { t, lang } = useLanguage();
  const notify = useAdminNotice();
  // الحالة في العنوان: بطاقة «الدعوات» في الرئيسية تفتح المستعملة (?status=USED)
  const [status, setStatus] = useUrlParam('status', 'ALL', INVITE_FILTERS);
  const [query, setQuery] = useState('');
  const [q, setQ] = useState('');
  const [cohorts, setCohorts] = useState([]);
  const [sheet, setSheet] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [sending, setSending] = useState(null);
  const [toRevoke, setToRevoke] = useState(null);
  const k = 'inviteSms';

  // البحث بعد توقف الكتابة قليلًا، لا مع كل حرف
  useEffect(() => {
    const id = setTimeout(() => setQ(query.trim()), 300);
    return () => clearTimeout(id);
  }, [query]);

  const list = useInfiniteList(async (page) => {
    const res = await listIndividualInvitations(page, { status: status === 'ALL' ? undefined : status, q });
    if (res?.meta?.cohorts) setCohorts(res.meta.cohorts);
    return unwrapList(res);
  }, [status, q]);

  const nameOf = (inv) => inv.invitee?.name || inv.code;

  const resend = async (inv) => {
    setSending(inv.id);
    try {
      const res = await sendInvitationSms(inv.id);
      list.setItems((items) => upsertInvitation(items, res.data));
      notify(res.sms?.sent ? t(`${k}.notice.sent`, { name: nameOf(inv) }) : t(`${k}.notice.failed`, { reason: res.sms?.message ?? '' }));
    } catch (err) {
      notify(err?.message || t('common.loadError'));
    } finally {
      setSending(null);
    }
  };

  // النسخ يعلّم الدعوة «تم النسخ» على الخادم (أول مرة فقط)
  const copy = async (inv) => {
    if (!(await copyText(inv.joinUrl))) {
      notify(t(`${k}.notice.copyFailed`, { text: inv.joinUrl }));
      return;
    }
    notify(t(`${k}.notice.copied`, { name: nameOf(inv) }));
    if (inv.marks?.copied) return;
    try {
      const res = await markInvitationCopied(inv.id);
      list.setItems((items) => upsertInvitation(items, res.data));
    } catch {
      notify(t('inviteBatches.notice.markFailed'));
    }
  };

  const revoke = async () => {
    await revokeInvitationCode(toRevoke.id);
    list.setItems((items) => items.filter((x) => x.id !== toRevoke.id));
    notify(t(`${k}.notice.revoked`, { name: nameOf(toRevoke) }));
  };

  const filtered = status !== 'ALL' || q !== '';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[14rem] flex-1">
          <span className="sr-only">{t(`${k}.search`)}</span>
          <Input
            type="search"
            icon={Search}
            value={query}
            maxLength={INVITE_LIMITS.nameMax}
            placeholder={t(`${k}.searchPlaceholder`)}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label className="w-full sm:w-48">
          <span className="sr-only">{t(`${k}.filterLabel`)}</span>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label={t(`${k}.filterLabel`)}>
            {INVITE_FILTERS.map((f) => <option key={f} value={f}>{t(`${k}.filters.${f}`)}</option>)}
          </Select>
        </label>
        <Button variant="secondary" onClick={() => setSheet(true)}><FileSpreadsheet aria-hidden="true" /> {t('adminLists.sheet.open')}</Button>
        <Button onClick={() => setInviting(true)}><UserPlus aria-hidden="true" /> {t(`${k}.invite`)}</Button>
      </div>

      {list.loading && <p role="status" aria-busy="true" data-loading="" className="text-sm text-[var(--wp-text-muted)]">{t('common.loading')}</p>}
      {list.error && <ErrorState error={list.error} onRetry={list.reload} />}
      {!list.loading && !list.error && list.items.length === 0 && (
        filtered
          ? <EmptyState title={t(`${k}.emptyFiltered`)} />
          : <EmptyState icon={UserRound} title={t(`${k}.empty`)} text={t(`${k}.emptyHint`)} />
      )}

      {list.items.length > 0 && (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <caption className="sr-only">{t(`${k}.listLabel`)}</caption>
            <thead className="text-xs text-[var(--wp-text-muted)]">
              <tr className="border-b border-[var(--wp-border)]">
                <th scope="col" className="px-4 py-3 text-start font-semibold">{t(`${k}.cols.person`)}</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{t(`${k}.cols.code`)}</th>
                <th scope="col" className="px-4 py-3 text-start font-semibold">{t(`${k}.cols.status`)}</th>
                <th scope="col" className="px-4 py-3 text-end font-semibold">{t(`${k}.cols.actions`)}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--wp-border)]">
              {list.items.map((inv) => (
                <Row
                  key={inv.id}
                  inv={inv}
                  t={t}
                  lang={lang}
                  busy={sending === inv.id}
                  onResend={() => resend(inv)}
                  onCopy={() => copy(inv)}
                  onRevoke={() => setToRevoke(inv)}
                />
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoadMore={list.loadMore} />

      {sheet && <SheetInviteDialog cohorts={cohorts} onClose={() => setSheet(false)} onDone={() => list.reload()} />}
      {inviting && (
        <InviteFormDialog
          cohorts={cohorts}
          onClose={() => setInviting(false)}
          onCreated={(inv) => list.setItems((items) => upsertInvitation(items, inv))}
        />
      )}
      {toRevoke && (
        <ConfirmDialog
          title={t('inviteBatches.revokeDialog.title', { code: toRevoke.code })}
          message={t('inviteBatches.revokeDialog.message')}
          confirmLabel={t('inviteBatches.revokeDialog.confirm')}
          danger
          onConfirm={revoke}
          onClose={() => setToRevoke(null)}
        />
      )}
    </div>
  );
}

function Row({ inv, t, lang, busy, onResend, onCopy, onRevoke }) {
  const k = 'inviteSms';
  const status = inv.inviteStatus;
  const name = inv.invitee?.name || t(`${k}.noName`);
  const active = status !== 'USED' && status !== 'EXPIRED';
  const sent = inv.sms?.attempts > 0;

  return (
    <tr>
      <td className="px-4 py-2.5">
        <span className="block font-medium text-[var(--wp-text)]">{name}</span>
        {inv.invitee?.phone && <span dir="ltr" className="block text-xs text-[var(--wp-text-muted)]">{inv.invitee.phone}</span>}
        {inv.invitedBy && <span className="block text-xs text-[var(--wp-text-muted)]">{t(`${k}.invitedBy`, { name: inv.invitedBy.name })}</span>}
      </td>
      <td className="px-4 py-2.5"><code dir="ltr" className="whitespace-nowrap font-mono text-[var(--wp-text)]">{inv.code}</code></td>
      <td className="px-4 py-2.5">
        <Badge tone={INVITE_STATUS_TONES[status]}>{t(`${k}.status.${status}`)}</Badge>
        {status === 'USED' && inv.usedBy && (
          <span className="mt-1 block text-xs text-[var(--wp-text-2)]">{t(`${k}.usedBy`, { name: inv.usedBy.name, date: formatShortDate(inv.usedAt, lang) })}</span>
        )}
        {status === 'FAILED' && inv.sms?.failureMessage && (
          <span className="mt-1 block max-w-[16rem] text-xs text-[var(--wp-coral-deep)]">{inv.sms.failureMessage}</span>
        )}
        {active && inv.sms?.sentAt && (
          <span className="mt-1 block text-xs text-[var(--wp-text-muted)]">{t(`${k}.sentOn`, { date: formatShortDate(inv.sms.sentAt, lang) })}</span>
        )}
        {active && sent && (
          <span className="block text-xs text-[var(--wp-text-muted)]">{t(`${k}.attempts`, { count: inv.sms.attempts, max: INVITE_LIMITS.maxSends })}</span>
        )}
        {active && inv.marks?.copied && (
          <span className="mt-1 block text-xs text-[var(--wp-text-muted)]">
            {t('inviteBatches.marks.copied')} · {formatShortDate(inv.marks.copied.at, lang)}
          </span>
        )}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex justify-end gap-1.5">
          {canSendSms(inv) && inv.invitee?.phone && (
            <Button size="sm" variant="ghost" onClick={onResend} loading={busy} aria-label={t(`${k}.resendLabel`, { name })}>
              <Send aria-hidden="true" /> {t(sent ? `${k}.resend` : `${k}.send`)}
            </Button>
          )}
          {active && (
            <Button size="sm" variant="ghost" onClick={onCopy} aria-label={t(`${k}.copyLabel`, { name })}>
              <Copy aria-hidden="true" /> {t(`${k}.copy`)}
            </Button>
          )}
          {status !== 'USED' && (
            <Button size="sm" variant="ghost" onClick={onRevoke} aria-label={t(`${k}.revokeLabel`, { name })}>
              <Trash2 aria-hidden="true" /> {t(`${k}.revoke`)}
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
