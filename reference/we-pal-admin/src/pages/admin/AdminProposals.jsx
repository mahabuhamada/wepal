import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, Flag, Lightbulb, Lock, PencilLine, Plus, Rocket, X } from 'lucide-react';
import TopBar from '../../components/Layout/TopBar';
import { ClickableRow, RowButton, RowLink } from '../../components/common/ClickableRow';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import FeatureUnavailable from '../../components/common/FeatureUnavailable';
import ErrorState from '../../components/common/ErrorState';
import { Badge, TrackBadge } from '../../components/common/Badge';
import { useAdminNotice } from '../../components/Admin/adminNoticeContext';
import DecisionDialog from '../../components/Admin/Proposals/DecisionDialog';
import ChallengeFormDialog from '../../components/Admin/Proposals/ChallengeFormDialog';
import LaunchDialog from '../../components/Admin/Proposals/LaunchDialog';
import ProposalStatus from '../../components/Proposals/ProposalStatus';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Tabs from '../../components/ui/Tabs';
import EmptyState from '../../components/ui/EmptyState';
import { useLanguage } from '../../i18n/LanguageContext';
import { USE_API } from '../../config';
import { closeChallenge, listAdminChallenges, listAdminProposals } from '../../api/proposals';
import { trackLabel } from '../../utils/apiMappers';
import { PROPOSAL_STATUSES, formatDay } from '../../utils/proposals';
import { ProposalsOverview } from '../../components/Admin/ListOverviews';
import useUrlParam from '../../hooks/useUrlParam';

const CHALLENGE_TONES = { OPEN: 'info', LAUNCHED: 'success', CLOSED: 'neutral' };

/**
 * المقترحات والتحديات (الحزمة 3أ، وعد للمانح «approve proposals»): من هنا تُفتح مساحات العمل.
 * المقترحات: قائمة بحسب الحالة (ما ينتظر القرار أولًا والأقدم أولًا)، وثلاثة قرارات لكل مقترح.
 * التحديات: الطرح والتعديل، ومن انضم، والفتح المبكر باختيار القائد، وإغلاق الانضمام.
 */
export default function AdminProposals() {
  const { t } = useLanguage();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'challenges' ? 'challenges' : 'proposals';

  if (!USE_API) return <FeatureUnavailable backTo="/admin" />;

  // تبديل التبويب يُسقط مرشّح الحالة (?status=) فهو للمقترحات وحدها
  const setTab = (id) => setParams(id === 'challenges' ? { tab: 'challenges' } : {}, { replace: true });

  return (
    <div>
      <TopBar title={t('workspaceProposals.admin.title')} />
      <div className="space-y-6 p-7 px-8">
        <PageHeader title={t('workspaceProposals.admin.title')} subtitle={t('workspaceProposals.admin.subtitle')} as="h2" />
        <Tabs
          tabs={[
            { id: 'proposals', label: t('workspaceProposals.admin.tabs.proposals') },
            { id: 'challenges', label: t('workspaceProposals.admin.tabs.challenges') },
          ]}
          value={tab}
          onChange={setTab}
          label={t('workspaceProposals.admin.title')}
          idPrefix="adm-proposals"
        />
        <div role="tabpanel" id={`adm-proposals-panel-${tab}`} aria-labelledby={`adm-proposals-tab-${tab}`}>
          {tab === 'proposals' ? <ProposalsPanel /> : <ChallengesPanel />}
        </div>
      </div>
    </div>
  );
}

function ProposalsPanel() {
  const { t, lang } = useLanguage();
  const notify = useAdminNotice();
  // الحالة في العنوان (?status=)، فبطاقات «نظرة عامة» وأشرطة «حسب الحالة» تفتح القائمة بحالتها
  const [status, setStatus] = useUrlParam('status', 'PENDING', [...PROPOSAL_STATUSES, 'all']);
  const [items, setItems] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deciding, setDeciding] = useState(null); // { proposal, decision }
  const [openId, setOpenId] = useState(null); // درج المراجعة

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAdminProposals({ status });
      setItems(res?.data ?? []);
      setCounts(res?.meta?.counts ?? {});
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    load();
  }, [load]);

  const decided = (decision) => (next) => {
    notify(t(`workspaceProposals.admin.decided.${decision}`, { title: next.title }));
    load();
  };

  const filters = [...PROPOSAL_STATUSES, 'all'];
  const open = items.find((p) => p.id === openId) ?? null;

  return (
    <div className="space-y-4">
      <ProposalsOverview status={status === 'all' ? null : status} />
      <div className="flex flex-wrap gap-2" role="group" aria-label={t('workspaceProposals.admin.filter')}>
        {filters.map((s) => (
          <Button key={s} size="sm" variant={status === s ? 'primary' : 'secondary'} aria-pressed={status === s} onClick={() => setStatus(s)}>
            {s === 'all' ? t('workspaceProposals.admin.all') : t(`workspaceProposals.status.${s}`)}
            {s !== 'all' && counts[s] ? ` (${counts[s]})` : ''}
          </Button>
        ))}
      </div>

      {loading && <p role="status" aria-busy="true" data-loading="" className="text-sm text-[var(--wp-text-muted)]">{t('common.loading')}</p>}
      {error && <ErrorState error={error} onRetry={load} />}
      {!loading && !error && items.length === 0 && <EmptyState icon={Lightbulb} title={t('workspaceProposals.admin.empty')} />}

      <ul className="space-y-3" aria-label={t('workspaceProposals.admin.tabs.proposals')}>
        {items.map((p) => (
          // البطاقة كلها تفتح درج المراجعة (docs/ADMIN-UX.md)
          <ClickableRow as="li" key={p.id} className="ui-card space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <h3 className="text-base font-semibold text-[var(--wp-text)]"><RowButton aria-expanded={openId === p.id} onClick={() => setOpenId(openId === p.id ? null : p.id)}>{p.title}</RowButton></h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--wp-text-muted)]">
                    <TrackBadge track={trackLabel(p.track, lang)} />
                    <ProposalStatus status={p.status} />
                    <span>{t('workspaceProposals.admin.by', { name: p.proposer?.name ?? '', date: formatDay(p.createdAt, lang) })}</span>
                  </div>
                </div>
                {p.status === 'PENDING' && (
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button size="sm" onClick={() => setDeciding({ proposal: p, decision: 'approve' })}>
                      <Check aria-hidden="true" /> {t('workspaceProposals.admin.approve')}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setDeciding({ proposal: p, decision: 'request_changes' })}>
                      <PencilLine aria-hidden="true" /> {t('workspaceProposals.admin.requestChanges')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeciding({ proposal: p, decision: 'decline' })}>
                      <X aria-hidden="true" /> {t('workspaceProposals.admin.decline')}
                    </Button>
                  </div>
                )}
                {p.status === 'APPROVED' && p.projectId && (
                  <Button size="sm" variant="secondary" to={`/projects/${p.projectId}`}>{t('workspaceProposals.admin.openWorkspace')}</Button>
                )}
              </div>
              <Button size="sm" variant="ghost" aria-expanded={openId === p.id} onClick={() => setOpenId(openId === p.id ? null : p.id)}>
                {lang === 'en' ? 'View proposal' : 'عرض المقترح'}
              </Button>
          </ClickableRow>
        ))}
      </ul>

      {open && (
        <ProposalDrawer proposal={open} lang={lang} t={t} onClose={() => setOpenId(null)} onDecide={(decision) => setDeciding({ proposal: open, decision })} />
      )}

      {deciding && (
        <DecisionDialog
          proposal={deciding.proposal}
          decision={deciding.decision}
          onClose={() => setDeciding(null)}
          onDone={decided(deciding.decision)}
        />
      )}
    </div>
  );
}

/**
 * درج مراجعة المقترح (القسم 4.5): المقترح كاملًا، وصاحبه ومساره وحالته، والقرارات الثلاثة كما اليوم وسجلّها.
 * لوحة جانبية غير حاجبة: القائمة تبقى ظاهرة، و«إغلاق» أو Esc يعيدان التركيز إلى القائمة.
 */
function ProposalDrawer({ proposal: p, lang, t, onClose, onDecide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <aside className="adm-proposal-drawer" aria-label={lang === 'en' ? 'Proposal review' : 'مراجعة المقترح'}>
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold text-[var(--wp-text)]">{p.title}</h3>
        <Button size="sm" variant="ghost" onClick={onClose}>{lang === 'en' ? 'Close' : 'إغلاق'}</Button>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--wp-text-muted)]">
        <TrackBadge track={trackLabel(p.track, lang)} />
        <ProposalStatus status={p.status} />
        <span>{t('workspaceProposals.admin.by', { name: p.proposer?.name ?? '', date: formatDay(p.createdAt, lang) })}</span>
      </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-[var(--wp-text)]">{t('workspaceProposals.detail.idea')}</dt>
            <dd className="mt-0.5 whitespace-pre-line text-[var(--wp-text-2)]">{p.description}</dd>
          </div>
          <div>
            <dt className="font-semibold text-[var(--wp-text)]">{t('workspaceProposals.detail.expectedOutput')}</dt>
            <dd className="mt-0.5 whitespace-pre-line text-[var(--wp-text-2)]">{p.expectedOutput}</dd>
          </div>
        </dl>
        {p.decisionNote && (
          <div className="rounded-xl bg-[var(--color-surface-muted)] p-3 text-sm">
            <p className="font-semibold text-[var(--wp-text)]">{t('workspaceProposals.admin.note')}</p>
            <p className="whitespace-pre-line text-[var(--wp-text-2)]">{p.decisionNote}</p>
            {p.decidedBy && (
              <p className="mt-1 text-xs text-[var(--wp-text-muted)]">{t('workspaceProposals.admin.decidedBy', { name: p.decidedBy.name, date: formatDay(p.decidedAt, lang) })}</p>
            )}
          </div>
        )}
      {p.status === 'PENDING' && (
        <div className="flex flex-wrap gap-2 border-t border-[var(--wp-border)] pt-3">
          <Button size="sm" onClick={() => onDecide('approve')}>{t('workspaceProposals.admin.approve')}</Button>
          <Button size="sm" variant="secondary" onClick={() => onDecide('request_changes')}>{t('workspaceProposals.admin.requestChanges')}</Button>
          <Button size="sm" variant="ghost" onClick={() => onDecide('decline')}>{t('workspaceProposals.admin.decline')}</Button>
        </div>
      )}
      {p.status === 'APPROVED' && p.projectId && <Button size="sm" variant="secondary" to={`/projects/${p.projectId}`}>{t('workspaceProposals.admin.openWorkspace')}</Button>}
    </aside>
  );
}

function ChallengesPanel() {
  const { t, lang } = useLanguage();
  const notify = useAdminNotice();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null); // null | 'new' | challenge
  const [launching, setLaunching] = useState(null);
  const [closing, setClosing] = useState(null);
  const k = 'workspaceProposals.admin.challenges';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems((await listAdminChallenges())?.data ?? []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const replace = (next) => setItems((list) => list.map((c) => (c.id === next.id ? next : c)));

  const close = async () => {
    const next = await closeChallenge(closing.id);
    replace(next);
    notify(t(`${k}.done.closed`, { title: next.title }));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setEditing('new')}><Plus aria-hidden="true" /> {t(`${k}.create`)}</Button>
      </div>

      {loading && <p role="status" aria-busy="true" data-loading="" className="text-sm text-[var(--wp-text-muted)]">{t('common.loading')}</p>}
      {error && <ErrorState error={error} onRetry={load} />}
      {!loading && !error && items.length === 0 && <EmptyState icon={Flag} title={t(`${k}.empty`)} />}

      <ul className="space-y-3" aria-label={t('workspaceProposals.admin.tabs.challenges')}>
        {items.map((c) => {
          // التحدي المفتوح يفتح نموذج تعديله، والذي له مساحة عمل يفتحها؛ غير ذلك بطاقة عادية
          const titleNode = c.status === 'OPEN'
            ? <RowButton onClick={() => setEditing(c)}>{c.title}</RowButton>
            : c.projectId ? <RowLink to={`/projects/${c.projectId}`}>{c.title}</RowLink> : c.title;
          const clickable = typeof titleNode !== 'string';
          const Row = clickable ? ClickableRow : 'li';
          return (
          <Row key={c.id} {...(clickable ? { as: 'li' } : {})} className="ui-card space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <h3 className="text-base font-semibold text-[var(--wp-text)]">{titleNode}</h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--wp-text-muted)]">
                    <TrackBadge track={trackLabel(c.track, lang)} />
                    <Badge tone={CHALLENGE_TONES[c.status]}>{t(`${k}.status.${c.status}`)}</Badge>
                    <span>{t(`${k}.participants`, { count: c.participantsCount, min: c.minMembers, max: c.maxMembers, date: formatDay(c.closesAt, lang) })}</span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {c.status === 'OPEN' && (
                    <>
                      <Button size="sm" disabled={!c.participantsCount} onClick={() => setLaunching(c)}>
                        <Rocket aria-hidden="true" /> {t(`${k}.launch`)}
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => setEditing(c)} aria-label={`${t(`${k}.edit`)}: ${c.title}`}>
                        <PencilLine aria-hidden="true" /> {t(`${k}.edit`)}
                      </Button>
                    </>
                  )}
                  {c.projectId && <Button size="sm" variant="secondary" to={`/projects/${c.projectId}`}>{t(`${k}.openWorkspace`)}</Button>}
                  {c.status !== 'CLOSED' && (
                    <Button size="sm" variant="ghost" onClick={() => setClosing(c)}>
                      <Lock aria-hidden="true" /> {t(`${k}.close`)}
                    </Button>
                  )}
                </div>
              </div>
              <p className="whitespace-pre-line text-sm text-[var(--wp-text-2)]">{c.description}</p>
              <div className="text-sm">
                <p className="font-semibold text-[var(--wp-text)]">{t(`${k}.participantsLabel`)}</p>
                {c.participants?.length
                  ? <p className="text-[var(--wp-text-2)]">{c.participants.map((p) => p.name).join('، ')}</p>
                  : <p className="text-[var(--wp-text-muted)]">{t(`${k}.noParticipants`)}</p>}
              </div>
          </Row>
          );
        })}
      </ul>

      {editing && (
        <ChallengeFormDialog
          challenge={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(saved, created) => {
            notify(t(created ? `${k}.done.created` : `${k}.done.updated`, { title: saved.title }));
            if (created) setItems((list) => [saved, ...list]);
            else replace(saved);
          }}
        />
      )}
      {launching && (
        <LaunchDialog
          challenge={launching}
          onClose={() => setLaunching(null)}
          onDone={(next) => {
            replace(next);
            notify(t(`${k}.done.launched`, { title: next.title }));
          }}
        />
      )}
      {closing && (
        <ConfirmDialog
          title={t(`${k}.closeDialog.title`, { title: closing.title })}
          message={t(`${k}.closeDialog.message`)}
          confirmLabel={t(`${k}.closeDialog.confirm`)}
          danger
          onConfirm={close}
          onClose={() => setClosing(null)}
        />
      )}
    </div>
  );
}
