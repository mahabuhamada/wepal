import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, Copy, Download, Pencil, Printer, Send, Trash2, Undo2 } from 'lucide-react';
import TopBar from '../../components/Layout/TopBar';
import Card from '../../components/common/Card';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import ErrorState from '../../components/common/ErrorState';
import FeatureUnavailable from '../../components/common/FeatureUnavailable';
import { Badge, TrackBadge } from '../../components/common/Badge';
import { useAdminNotice } from '../../components/Admin/adminNoticeContext';
import SendSmsDialog from '../../components/Admin/Invitations/SendSmsDialog';
import EditBatchDialog from '../../components/Admin/Invitations/EditBatchDialog';
import { copyText } from '../../components/Admin/Invitations/copyText';
import { Select } from '../../components/ui/Input';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Tabs from '../../components/ui/Tabs';
import EmptyState from '../../components/ui/EmptyState';
import { useLanguage } from '../../i18n/LanguageContext';
import { USE_API } from '../../config';
import {
  deleteInvitationBatch, exportInvitationBatch, getInvitationBatch, markInvitationCopied, revokeInvitationCode, setInvitationSent,
} from '../../api/invitationBatches';
import { formatShortDate, regionLabel, trackLabel } from '../../utils/apiMappers';
import {
  CODE_FILTERS, CODE_MARK_FILTERS, CODE_STATUS_TONES, batchAfterMark, canDeleteBatch, canRevoke, countsAfterRevoke,
  isSentByHand, liveCount,
} from '../../utils/invitationBatches';
import { canSendSms, upsertInvitation } from '../../utils/individualInvitations';

/**
 * تفاصيل دفعة دعوة: بياناتها، وأكوادها (من استعمل كل كود ومتى)، ونسخ رابط كل كود (يعلّمه «تم النسخ»)،
 * وعلامة «تم الإرسال» اليدوية، وإرسال كود غير مستعمل لشخص برسالة SMS، وإلغاء غير المستعمل، وتصدير CSV،
 * وورقة للطباعة، وتعديل الدفعة (الاسم والعدد) وحذفها إن لم يُستعمل أي كود منها.
 */
export default function AdminInvitationBatch() {
  if (!USE_API) return <FeatureUnavailable backTo="/admin/invitations" />;
  return <BatchDetail />;
}

function BatchDetail() {
  const { id } = useParams();
  const { t, lang } = useLanguage();
  const notify = useAdminNotice();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('ALL');
  const [mark, setMark] = useState('ALL');
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [marking, setMarking] = useState(null);
  const [batch, setBatch] = useState(null);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [toRevoke, setToRevoke] = useState(null);
  const [toSend, setToSend] = useState(null);
  const k = 'inviteBatches.detail';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getInvitationBatch(id, filter === 'ALL' ? undefined : filter, mark === 'ALL' ? undefined : mark);
      setBatch(res?.batch ?? null);
      setCodes(res?.codes ?? []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id, filter, mark]);

  useEffect(() => {
    load();
  }, [load]);

  // تغيير علامة كود: الصف والأعداد (ما وصل إلى أحد، والحد الأدنى للتعديل) محليًا
  const applyMark = (before, after) => {
    setCodes((list) => upsertInvitation(list, after));
    setBatch((b) => batchAfterMark(b, before, after));
  };

  // النسخ يعلّم الكود «تم النسخ» على الخادم (أول مرة فقط)
  const copy = async (code) => {
    if (!(await copyText(code.joinUrl))) {
      notify(t('inviteBatches.notice.copyFailed', { url: code.joinUrl }));
      return;
    }
    notify(t('inviteBatches.notice.copied', { code: code.code }));
    if (code.marks?.copied) return;
    try {
      const res = await markInvitationCopied(code.id);
      applyMark(code, res.data);
    } catch {
      notify(t('inviteBatches.notice.markFailed'));
    }
  };

  const toggleSent = async (code) => {
    const sent = !isSentByHand(code);
    setMarking(code.id);
    try {
      const res = await setInvitationSent(code.id, sent);
      applyMark(code, res.data);
      notify(t(sent ? 'inviteBatches.notice.markedSent' : 'inviteBatches.notice.unmarkedSent', { code: code.code }));
    } catch (err) {
      notify(err?.message || t('common.loadError'));
    } finally {
      setMarking(null);
    }
  };

  const saved = (res) => {
    setEditing(false);
    if (res?.batch) setBatch(res.batch);
    notify(t('inviteBatches.notice.updated', { name: res?.batch?.name ?? batch.name }));
    load();
  };

  const removeBatch = async () => {
    await deleteInvitationBatch(id);
    notify(t('inviteBatches.notice.deleted', { name: batch.name }));
    navigate('/admin/invitations?tab=batches');
  };

  const doExport = async () => {
    setExporting(true);
    try {
      await exportInvitationBatch(id);
    } catch (err) {
      notify(err?.message || t('common.loadError'));
    } finally {
      setExporting(false);
    }
  };

  const revoke = async () => {
    await revokeInvitationCode(toRevoke.id);
    setCodes((list) => list.filter((c) => c.id !== toRevoke.id));
    setBatch((b) => (b ? { ...b, counts: countsAfterRevoke(b.counts, toRevoke.status) } : b));
    notify(t('inviteBatches.notice.revoked', { code: toRevoke.code }));
  };

  const sent = ({ data, sms }) => {
    setCodes((list) => upsertInvitation(list, data));
    notify(sms?.sent
      ? t('inviteSms.notice.sent', { name: data?.invitee?.name ?? data?.code })
      : t('inviteSms.notice.failed', { reason: sms?.message ?? '' }));
  };

  const title = batch?.name ?? t('inviteBatches.title');
  const counts = batch?.counts ?? {};
  const tabs = CODE_FILTERS.map((f) => ({
    id: f,
    label: t(`${k}.filters.${f}`),
    count: f === 'ALL' ? undefined : counts[{ UNUSED: 'unused', USED: 'used', EXPIRED: 'expired' }[f]],
  }));

  return (
    <div>
      <TopBar title={title} />
      <div className="space-y-6 p-7 px-8">
        <PageHeader title={title} as="h2" backTo="/admin/invitations?tab=batches" backLabel={t(`${k}.back`)}>
          {batch && (
            <>
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Pencil aria-hidden="true" /> {t('inviteBatches.edit.open')}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setDeleting(true)}
                disabled={!canDeleteBatch(batch)}
                title={canDeleteBatch(batch) ? undefined : t('inviteBatches.deleteDialog.blocked')}
              >
                <Trash2 aria-hidden="true" /> {t('inviteBatches.deleteDialog.open')}
              </Button>
              <Button variant="secondary" onClick={doExport} loading={exporting}>
                <Download aria-hidden="true" /> {exporting ? t(`${k}.exporting`) : t(`${k}.export`)}
              </Button>
              <Button variant="secondary" to={`/admin/invitations/${id}/print`}>
                <Printer aria-hidden="true" /> {t(`${k}.print`)}
              </Button>
            </>
          )}
        </PageHeader>

        {loading && !batch && <p role="status" aria-busy="true" data-loading="" className="text-sm text-[var(--wp-text-muted)]">{t('common.loading')}</p>}
        {error && <ErrorState error={error} onRetry={load} />}

        {batch && (
          <>
            <Card>
              <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
                <Meta label={t(`${k}.region`)}>{regionLabel(batch.region, lang)}</Meta>
                <Meta label={t(`${k}.cohort`)}>{batch.cohort?.name}</Meta>
                <Meta label={t(`${k}.track`)}>
                  {batch.track ? <TrackBadge track={trackLabel(batch.track, lang)} /> : t('inviteBatches.anyTrack')}
                </Meta>
                <Meta label={t(`${k}.expires`)}>
                  {batch.expiresAt ? formatShortDate(batch.expiresAt, lang) : '—'}
                </Meta>
                <Meta label={t(`${k}.createdBy`)}>
                  {batch.createdBy?.name ?? '—'} · {formatShortDate(batch.createdAt, lang)}
                </Meta>
                <Meta label={t('inviteBatches.counts.revoked')}>{counts.revoked ?? 0}</Meta>
                {batch.note && <Meta label={t(`${k}.note`)} wide>{batch.note}</Meta>}
              </dl>
            </Card>

            <div className="flex flex-wrap items-end justify-between gap-3">
              <Tabs tabs={tabs} value={filter} onChange={setFilter} label={t(`${k}.codesLabel`)} idPrefix="inv-codes" />
              <label className="w-full sm:w-48">
                <span className="sr-only">{t('inviteBatches.marks.filterLabel')}</span>
                <Select value={mark} onChange={(e) => setMark(e.target.value)} aria-label={t('inviteBatches.marks.filterLabel')}>
                  {CODE_MARK_FILTERS.map((f) => <option key={f} value={f}>{t(`inviteBatches.marks.filters.${f}`)}</option>)}
                </Select>
              </label>
            </div>
            <div role="tabpanel" id={`inv-codes-panel-${filter}`} aria-labelledby={`inv-codes-tab-${filter}`} aria-busy={loading || undefined}>
              {!loading && codes.length === 0 && <EmptyState title={t(`${k}.empty`)} />}
              {codes.length > 0 && (
                <Card className="overflow-x-auto p-0">
                  <table className="w-full text-sm">
                    <caption className="sr-only">{t(`${k}.codesLabel`)}</caption>
                    <thead className="text-xs text-[var(--wp-text-muted)]">
                      <tr className="border-b border-[var(--wp-border)]">
                        <th scope="col" className="px-4 py-3 text-start font-semibold">{t(`${k}.code`)}</th>
                        <th scope="col" className="px-4 py-3 text-start font-semibold">{t(`${k}.state`)}</th>
                        <th scope="col" className="px-4 py-3 text-start font-semibold">{t('inviteBatches.marks.label')}</th>
                        <th scope="col" className="px-4 py-3 text-start font-semibold">{t(`${k}.usedBy`)}</th>
                        <th scope="col" className="px-4 py-3 text-end font-semibold">{t(`${k}.actions`)}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--wp-border)]">
                      {codes.map((c) => (
                        <tr key={c.id}>
                          <td className="px-4 py-2.5">
                            <code dir="ltr" className="whitespace-nowrap font-mono text-[var(--wp-text)]">{c.code}</code>
                            {c.invitee?.name && (
                              <span className="block text-xs text-[var(--wp-text-muted)]">
                                {t('inviteSms.batch.sentTo', { name: c.invitee.name })}
                                {c.invitee.phone && <> · <span dir="ltr">{c.invitee.phone}</span></>}
                                {c.sms?.status === 'failed' && <> · <span className="text-[var(--wp-coral-deep)]">{t('inviteSms.status.FAILED')}</span></>}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5"><Badge tone={CODE_STATUS_TONES[c.status]}>{t(`inviteBatches.status.${c.status}`)}</Badge></td>
                          <td className="px-4 py-2.5"><CodeMarks marks={c.marks} t={t} lang={lang} /></td>
                          <td className="px-4 py-2.5 text-[var(--wp-text-2)]">
                            {c.usedBy ? (
                              <>
                                <span className="font-medium text-[var(--wp-text)]">{c.usedBy.name}</span>
                                <span className="block text-xs text-[var(--wp-text-muted)]">{formatShortDate(c.usedAt, lang)}</span>
                              </>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex justify-end gap-1.5">
                              {c.status === 'UNUSED' && canSendSms(c) && (
                                <Button size="sm" variant="ghost" onClick={() => setToSend(c)} aria-label={t('inviteSms.batch.sendLabel', { code: c.code })}>
                                  <Send aria-hidden="true" /> {t('inviteSms.batch.send')}
                                </Button>
                              )}
                              {c.status === 'UNUSED' && (
                                <Button size="sm" variant="ghost" onClick={() => copy(c)} aria-label={t(`${k}.copyLabel`, { code: c.code })}>
                                  <Copy aria-hidden="true" /> {t(`${k}.copy`)}
                                </Button>
                              )}
                              {c.status !== 'USED' && c.marks?.sent?.via !== 'sms' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleSent(c)}
                                  loading={marking === c.id}
                                  aria-label={t(isSentByHand(c) ? 'inviteBatches.marks.unmarkSentLabel' : 'inviteBatches.marks.markSentLabel', { code: c.code })}
                                >
                                  {isSentByHand(c)
                                    ? <><Undo2 aria-hidden="true" /> {t('inviteBatches.marks.unmarkSent')}</>
                                    : <><Check aria-hidden="true" /> {t('inviteBatches.marks.markSent')}</>}
                                </Button>
                              )}
                              {canRevoke(c) && (
                                <Button size="sm" variant="ghost" onClick={() => setToRevoke(c)} aria-label={t(`${k}.revokeLabel`, { code: c.code })}>
                                  <Trash2 aria-hidden="true" /> {t(`${k}.revoke`)}
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              )}
            </div>
          </>
        )}
      </div>

      {editing && batch && <EditBatchDialog batch={batch} onClose={() => setEditing(false)} onSaved={saved} />}
      {deleting && batch && (
        <ConfirmDialog
          title={t('inviteBatches.deleteDialog.title', { name: batch.name })}
          message={[
            t('inviteBatches.deleteDialog.message', { count: liveCount(counts) }),
            counts.handedOut ? t('inviteBatches.deleteDialog.handedOut', { count: counts.handedOut }) : '',
          ].filter(Boolean).join(' ')}
          confirmLabel={t('inviteBatches.deleteDialog.confirm')}
          danger
          onConfirm={removeBatch}
          onClose={() => setDeleting(false)}
        />
      )}
      {toSend && <SendSmsDialog code={toSend} onClose={() => setToSend(null)} onSent={sent} />}
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

// علامتا «تم النسخ» و«تم الإرسال» (يدويًا أو برسالة SMS)، ومن علّم ومتى
function CodeMarks({ marks, t, lang }) {
  const items = [
    marks?.copied && { key: 'copied', tone: 'violet', label: t('inviteBatches.marks.copied'), mark: marks.copied },
    marks?.sent && {
      key: 'sent', tone: 'success', label: t(marks.sent.via === 'sms' ? 'inviteBatches.marks.sentSms' : 'inviteBatches.marks.sent'), mark: marks.sent,
    },
  ].filter(Boolean);
  if (!items.length) return <span className="text-[var(--wp-text-muted)]">—</span>;
  return (
    <ul className="space-y-1">
      {items.map(({ key, tone, label, mark }) => (
        <li key={key}>
          <Badge tone={tone}>{label}</Badge>
          <span className="block text-xs text-[var(--wp-text-muted)]">
            {mark.by ? t('inviteBatches.marks.by', { name: mark.by.name, date: formatShortDate(mark.at, lang) }) : formatShortDate(mark.at, lang)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Meta({ label, wide = false, children }) {
  return (
    <div className={wide ? 'sm:col-span-2 lg:col-span-3' : ''}>
      <dt className="text-xs text-[var(--wp-text-muted)]">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line font-medium text-[var(--wp-text)]">{children}</dd>
    </div>
  );
}
