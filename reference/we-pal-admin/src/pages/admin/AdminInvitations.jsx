import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarClock, ChevronLeft, Plus, Ticket } from 'lucide-react';
import TopBar from '../../components/Layout/TopBar';
import ErrorState from '../../components/common/ErrorState';
import FeatureUnavailable from '../../components/common/FeatureUnavailable';
import LoadMore from '../../components/common/LoadMore';
import ProgressBar from '../../components/common/ProgressBar';
import { Badge, TrackBadge } from '../../components/common/Badge';
import BatchFormDialog from '../../components/Admin/Invitations/BatchFormDialog';
import IndividualInvitations from '../../components/Admin/Invitations/IndividualInvitations';
import { useAdminNotice } from '../../components/Admin/adminNoticeContext';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Tabs from '../../components/ui/Tabs';
import EmptyState from '../../components/ui/EmptyState';
import useInfiniteList from '../../hooks/useInfiniteList';
import { useLanguage } from '../../i18n/LanguageContext';
import { USE_API } from '../../config';
import { listInvitationBatches } from '../../api/invitationBatches';
import { unwrapList } from '../../api/client';
import { formatShortDate, regionLabel, trackLabel } from '../../utils/apiMappers';
import { isPastDate, usedPercent } from '../../utils/invitationBatches';
import { ClickableRow, RowLink } from '../../components/common/ClickableRow';

const COUNT_TONES = { used: 'info', unused: 'success', expired: 'warning', revoked: 'neutral' };

const TABS = ['individual', 'batches'];

/**
 * الدعوات بتبويبين: «دعوات فردية» (الافتراضي، الطريق الأساسي: شخص باسمه وجواله يصله الكود برسالة)،
 * و«الدفعات» للتوزيع الجماعي (ورشة، شريك، دفعة برنامج). التبويب في الرابط (?tab=batches) فيعود إليه زر الرجوع.
 */
export default function AdminInvitations() {
  if (!USE_API) return <FeatureUnavailable backTo="/admin" />;
  return <InvitationsPage />;
}

function InvitationsPage() {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'individual';
  const select = (id) => setParams(id === 'individual' ? {} : { tab: id }, { replace: true });

  return (
    <div>
      <TopBar title={t('inviteSms.title')} />
      <div className="space-y-6 p-7 px-8">
        <PageHeader title={t('inviteSms.title')} subtitle={t('inviteSms.subtitle')} as="h2" />
        <Tabs
          tabs={TABS.map((id) => ({ id, label: t(`inviteSms.tabs.${id}`) }))}
          value={tab}
          onChange={select}
          label={t('inviteSms.tabs.label')}
          idPrefix="invitations"
        />
        <div role="tabpanel" id={`invitations-panel-${tab}`} aria-labelledby={`invitations-tab-${tab}`}>
          {tab === 'individual' ? <IndividualInvitations /> : <BatchesList />}
        </div>
      </div>
    </div>
  );
}

function BatchesList() {
  const { t, lang } = useLanguage();
  const notify = useAdminNotice();
  const navigate = useNavigate();
  const [cohorts, setCohorts] = useState([]);
  const [creating, setCreating] = useState(false);
  const list = useInfiniteList(async (page) => {
    const res = await listInvitationBatches(page);
    if (res?.meta?.cohorts) setCohorts(res.meta.cohorts);
    return unwrapList(res);
  }, []);

  const created = ({ batch, codes }) => {
    notify(t('inviteBatches.notice.created', { name: batch.name, count: codes?.length ?? batch.size }));
    navigate(`/admin/invitations/${batch.id}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-[var(--wp-text-2)]">{t('inviteBatches.subtitle')}</p>
        <Button onClick={() => setCreating(true)}><Plus aria-hidden="true" /> {t('inviteBatches.create')}</Button>
      </div>

      {list.loading && <p role="status" aria-busy="true" data-loading="" className="text-sm text-[var(--wp-text-muted)]">{t('common.loading')}</p>}
      {list.error && <ErrorState error={list.error} onRetry={list.reload} />}
      {!list.loading && !list.error && list.items.length === 0 && (
        <EmptyState icon={Ticket} title={t('inviteBatches.empty')} text={t('inviteBatches.emptyHint')} />
      )}

      {list.items.length > 0 && (
        <ul className="space-y-3" aria-label={t('inviteBatches.listLabel')}>
          {list.items.map((b) => <BatchCard key={b.id} batch={b} t={t} lang={lang} />)}
        </ul>
      )}
      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoadMore={list.loadMore} />

      {creating && <BatchFormDialog cohorts={cohorts} onClose={() => setCreating(false)} onCreated={created} />}
    </div>
  );
}

function BatchCard({ batch: b, t, lang }) {
  const expired = isPastDate(b.expiresAt);
  const pct = usedPercent(b.counts);
  return (
    <li>
      <ClickableRow as="div" className="ui-card space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <h3 className="text-base font-semibold text-[var(--wp-text)]">
              <RowLink to={`/admin/invitations/${b.id}`}>{b.name}</RowLink>
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--wp-text-muted)]">
              <Badge tone="neutral">{regionLabel(b.region, lang)}</Badge>
              <Badge tone="violet">{b.cohort?.name}</Badge>
              {b.track ? <TrackBadge track={trackLabel(b.track, lang)} /> : <span>{t('inviteBatches.anyTrack')}</span>}
              <span>{t('inviteBatches.codes', { count: b.size })}</span>
            </div>
          </div>
          <Button size="sm" variant="secondary" to={`/admin/invitations/${b.id}`} tabIndex={-1} aria-hidden="true">
            {t('inviteBatches.open')} <ChevronLeft aria-hidden="true" className="rtl:rotate-0 ltr:rotate-180" />
          </Button>
        </div>

        <ul className="flex flex-wrap gap-2 text-xs">
          {Object.entries(COUNT_TONES).map(([key, tone]) => (
            <li key={key}><Badge tone={tone}>{t(`inviteBatches.counts.${key}`)}: {b.counts?.[key] ?? 0}</Badge></li>
          ))}
        </ul>
        <div className="flex items-center gap-3">
          <ProgressBar value={pct} className="max-w-xs" />
          <span className="text-xs text-[var(--wp-text-muted)]">{t('inviteBatches.usedShare', { pct })}</span>
        </div>

        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--wp-text-muted)]">
          <span>
            {b.createdBy
              ? t('inviteBatches.createdBy', { name: b.createdBy.name, date: formatShortDate(b.createdAt, lang) })
              : t('inviteBatches.createdOn', { date: formatShortDate(b.createdAt, lang) })}
          </span>
          {b.expiresAt && (
            <span className={`flex items-center gap-1 ${expired ? 'font-semibold text-[var(--wp-coral-deep)]' : ''}`}>
              <CalendarClock size={12} aria-hidden="true" />
              {t(expired ? 'inviteBatches.expiredOn' : 'inviteBatches.expiresOn', { date: formatShortDate(b.expiresAt, lang) })}
            </span>
          )}
        </p>
        {b.note && <p className="whitespace-pre-line text-sm text-[var(--wp-text-2)]">{b.note}</p>}
      </ClickableRow>
    </li>
  );
}
