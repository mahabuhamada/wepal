import { useEffect, useId, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Trash2, AlertCircle, XCircle, EyeOff, Eye, Flag, Clock, Users } from 'lucide-react';
import TopBar from '../../components/Layout/TopBar';
import Card from '../../components/common/Card';
import { ClickableRow, RowButton } from '../../components/common/ClickableRow';
import FadeIn from '../../components/common/FadeIn';
import { useLanguage } from '../../i18n/LanguageContext';
import { useLocalizedData } from '../../data/useLocalizedData';
import { USE_API } from '../../config';
import * as adminApi from '../../api/admin';
import { unwrapList, downloadBlob } from '../../api/client';
import useInfiniteList from '../../hooks/useInfiniteList';
import ErrorState from '../../components/common/ErrorState';
import Modal from '../../components/common/Modal';
import Button from '../../components/ui/Button';
import LoadMore from '../../components/common/LoadMore';
import { reportStatusLabel, resolutionLabel, relativeTime } from '../../utils/apiMappers';
import Alert from '../../components/ui/Alert';
import { useAdminNotice } from '../../components/Admin/adminNoticeContext';
import { useTheme } from '../../theme/ThemeContext';
import OverviewBand from '../../components/Admin/OverviewBand';
import BulkBar from '../../components/Admin/BulkBar';
import AdminDrawer from '../../components/Admin/AdminDrawer';
import useSelection from '../../hooks/useSelection';
import useListSummary from '../../hooks/useListSummary';
import { localName, placeHref, memberHref } from '../../utils/adminLinks';

const RESOLVED_NOTICE = {
  hide: 'azraqAdmin.notice.reportHidden',
  warn: 'azraqAdmin.notice.reportWarned',
  dismiss: 'azraqAdmin.notice.reportDismissed',
  suspend_messaging: 'azraqAdmin.notice.reportHidden',
};

// ===== وضع المحاكاة (يبقى دون تغيير سلوكي) =====
function MockAdminReports() {
  const { t } = useLanguage();
  const { reports } = useLocalizedData();

  return (
    <div>
      <TopBar title={t('adminReports.title')} />
      <div className="p-7 px-8 space-y-6">
        <FadeIn>
          <h2 className="wp-page-title">{t('adminReports.title')}</h2>
          <p className="text-sm text-[var(--wp-text-3)]">{reports.length} {t('adminReports.pending')}</p>
        </FadeIn>

        <div className="space-y-3">
          {reports.map((report, i) => (
            <FadeIn key={report.id} delay={i * 0.05}>
              <Card className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-[var(--wp-text)] mb-1">{report.content}</div>
                  <div className="flex gap-4 text-xs text-[var(--wp-text-muted)]">
                    <span>{t('admin.reporter')}: {report.reporter}</span>
                    <span>{t('admin.reason')}: <span className="px-2 py-0.5 rounded-full bg-[var(--wp-coral-wash)] text-[var(--wp-coral-deep)] font-semibold">{report.reason}</span></span>
                    <span>{report.date}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="flex items-center gap-1 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs hover:bg-red-100 transition-colors">
                    <Trash2 size={14} /> {t('admin.deleteAction')}
                  </button>
                  <button className="flex items-center gap-1 px-3 py-2 bg-[var(--wp-warning-tint)] text-[var(--wp-warning)] rounded-xl text-xs hover:opacity-90 transition-opacity">
                    <AlertCircle size={14} /> {t('admin.warnAction')}
                  </button>
                  <button className="flex items-center gap-1 px-3 py-2 bg-[#F6F6F6] text-[var(--wp-text-3)] rounded-xl text-xs hover:bg-[#F0F0F0] transition-colors">
                    <XCircle size={14} /> {t('admin.ignoreAction')}
                  </button>
                </div>
              </Card>
            </FadeIn>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== وضع الـ API: الطابور المجمَّع (خطة لوحة الإدارة 4.3 و4.3.1 و4.5) =====
const TABS = ['PENDING', 'RESOLVED', 'DISMISSED', 'all'];
const TYPES = ['comment', 'idea', 'project', 'group_post', 'group_post_comment', 'chat_message'];
const TILE_ICON = { contentItems: Flag, openReports: AlertCircle, medianAgeHours: Clock, medianHandlingHours: Clock, multiReporter: Users };
const TILE_PATH = { contentItems: 'none', openReports: 'vote', medianAgeHours: 'work', medianHandlingHours: 'ok', multiReporter: 'com' };


function ApiAdminReports() {
  const { t, lang } = useLanguage();
  const notify = useAdminNotice();
  const [params, setParams] = useSearchParams();
  const status = TABS.includes(params.get('status')) ? params.get('status') : 'PENDING';
  const type = TYPES.includes(params.get('type')) ? params.get('type') : '';
  const multi = params.get('multi') === '1';
  const filterKey = `${status}|${type}|${multi}`;

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params);
    if (value === '' || value === null || value === false || (key === 'status' && value === 'PENDING')) next.delete(key);
    else next.set(key, value === true ? '1' : value);
    setParams(next, { replace: true });
  };

  const list = useInfiniteList(async (page) => unwrapList(await adminApi.listReportQueue({ status, type, multi, page })), [filterKey]);
  const band = useListSummary(() => adminApi.getReportsSummary({ status, type, multi }), [filterKey]);
  const selection = useSelection(filterKey);
  const [open, setOpen] = useState(null); // صف الدرج
  const [deciding, setDeciding] = useState(null); // {row, action}
  const rows = list.items;
  const counts = list.meta?.counts ?? {};
  const pending = status === 'PENDING';

  const refresh = async () => { await Promise.all([list.reload(), band.reload()]); };

  const resolve = async (row, action, options) => {
    await adminApi.resolveReportGroup(row.type, row.id, action, options);
    setOpen(null);
    const undo = action === 'hide' && row.type !== 'project'
      ? async () => { await adminApi.restoreHiddenContent(row.type, row.id); notify(t('adminLists.reports.restored')); }
      : undefined;
    notify(t(RESOLVED_NOTICE[action]), { undo });
    await refresh();
  };

  const bulk = async (action) => {
    const items = rows.filter((r) => selection.has(r.key)).map((r) => ({ type: r.type, id: r.id }));
    const res = await adminApi.bulkResolveReports(action, items, { notifyReporter: true });
    selection.clear();
    const done = res?.done?.length ?? 0;
    const skipped = res?.skipped?.length ?? 0;
    notify(t('adminLists.reports.bulkDone', { done, skipped }), action === 'hide' && done
      ? { undo: async () => { await Promise.all(res.done.filter((d) => d.type !== 'project').map((d) => adminApi.restoreHiddenContent(d.type, d.id))); notify(t('adminLists.reports.restored')); await refresh(); } }
      : undefined);
    await refresh();
  };

  const scopeText = [
    t(`adminLists.reports.tab.${status}`),
    type && t(`adminLists.reports.type.${type}`),
    multi && t('adminLists.reports.multi'),
  ].filter(Boolean).join(' · ');

  const visibleKeys = rows.map((r) => r.key);
  const allSelected = visibleKeys.length > 0 && visibleKeys.every((k) => selection.has(k));

  return (
    <div onKeyDown={(e) => { if (e.key === 'Escape' && selection.size) selection.clear(); }}>
      <TopBar title={t('adminReports.title')} />
      <div className="azq-list">
        <header className="azq-list-head">
          <div>
            <h2>{t('adminReports.title')}</h2>
            <p>{t('adminLists.reports.lead')}</p>
          </div>
          <Link className="azq-btn-ghost" to="/admin/hidden">{t('adminLists.reports.trash')}</Link>
        </header>

        <OverviewBand
          page="reports"
          summary={band.summary}
          loading={band.loading}
          error={band.error}
          scopeText={scopeText}
          tileLabel={(k) => t(`adminLists.reports.tiles.${k}`)}
          tileIcon={(k) => TILE_ICON[k]}
          tilePath={(k) => TILE_PATH[k]}
          tileValue={(tile) => (tile.key.startsWith('median') ? (tile.value == null ? '—' : t('adminLists.hours', { n: tile.value })) : Number(tile.value).toLocaleString('en-GB'))}
          chartTitle={(k) => t(`adminLists.reports.charts.${k}`)}
          itemLabel={(chart, item) => (chart === 'byPlace'
            ? (item.key === 'workspaces' ? t('adminLists.reports.workspaces') : item.key === 'deleted' ? t('adminLists.reports.deleted') : localName(item.label, lang))
            : item.label)}
        />

        <div className="azq-tabs" role="tablist" aria-label={t('adminLists.reports.tabsLabel')}>
          {TABS.map((s) => (
            <button key={s} type="button" role="tab" aria-selected={status === s} onClick={() => setFilter('status', s)}>
              {t(`adminLists.reports.tab.${s}`)}
              {counts[s] != null && <span className="azq-count">{counts[s]}</span>}
            </button>
          ))}
        </div>

        <div className="azq-toolbar">
          <label className="sr-only" htmlFor="rq-type">{t('adminLists.reports.typeLabel')}</label>
          <select id="rq-type" value={type} onChange={(e) => setFilter('type', e.target.value)}>
            <option value="">{t('adminLists.reports.allTypes')}</option>
            {TYPES.map((x) => <option key={x} value={x}>{t(`adminLists.reports.type.${x}`)}</option>)}
          </select>
          <label className="azq-chk">
            <input type="checkbox" checked={multi} onChange={(e) => setFilter('multi', e.target.checked)} />
            {t('adminLists.reports.multi')}
          </label>
          {rows.length > 0 && pending && (
            <label className="azq-chk">
              <input type="checkbox" checked={allSelected} onChange={(e) => selection.setAll(visibleKeys, e.target.checked)} />
              {t('adminLists.selectAll')}
            </label>
          )}
        </div>

        <BulkBar
          count={selection.size}
          onClear={selection.clear}
          actions={[
            { key: 'hide', label: t('adminReports.hide'), onClick: () => bulk('hide') },
            { key: 'dismiss', label: t('adminApi.dismiss'), onClick: () => bulk('dismiss') },
          ]}
        />

        {list.error && <ErrorState error={list.error} onRetry={list.reload} />}
        {list.loading && <div className="azq-skel" role="status" aria-busy="true"><span className="sr-only">{t('common.loading')}</span></div>}
        {!list.loading && !list.error && rows.length === 0 && (
          <p className="azq-empty">{type || multi ? t('adminLists.band.empty') : t('adminApi.noReports')}</p>
        )}

        {!list.loading && rows.length > 0 && (
          <ul className="azq-lrows" aria-label={t('adminReports.title')}>
            {rows.map((row) => (
              <ReportRow
                key={row.key}
                row={row}
                pending={pending}
                selected={selection.has(row.key)}
                onSelect={() => selection.toggle(row.key)}
                onOpen={() => setOpen(row)}
                onAct={(action) => setDeciding({ row, action })}
              />
            ))}
          </ul>
        )}
        <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoadMore={list.loadMore} />
      </div>

      {open && <ReportDrawer row={open} pending={pending} onClose={() => setOpen(null)} onAct={(action) => setDeciding({ row: open, action })} onSuspend={() => resolve(open, 'suspend_messaging')} />}

      {deciding && (
        <ResolveDialog
          report={{ contentPreview: deciding.row.preview, reporter: deciding.row.reportersCount > 0 ? {} : null }}
          action={deciding.action}
          onConfirm={(options) => resolve(deciding.row, deciding.action, options)}
          onClose={() => setDeciding(null)}
        />
      )}
    </div>
  );
}

function ReportRow({ row, pending, selected, onSelect, onOpen, onAct }) {
  const { t, lang } = useLanguage();
  const href = placeHref(row.place);
  return (
    <ClickableRow as="li" className="azq-lrow" aria-selected={selected}>
      {pending ? (
        <input type="checkbox" checked={selected} onChange={onSelect} aria-label={t('adminLists.selectRow', { title: row.preview || t('adminLists.reports.deleted') })} />
      ) : <span />}
      <div className="azq-lrow-main">
        <RowButton className="azq-lrow-title" onClick={onOpen}>
          {row.preview || <em>{t('adminLists.reports.deleted')}</em>}
        </RowButton>
        <div className="azq-lrow-meta">
          <span className="azq-pill">{t(`adminLists.reports.type.${row.type}`)}</span>
          <span className={`azq-pill${row.reportsCount > 1 ? ' is-warn' : ''}`}>{t('adminLists.reports.count', { reports: row.reportsCount, people: row.reportersCount })}</span>
          {row.contentHidden && <span className="azq-pill is-danger"><EyeOff size={12} aria-hidden="true" />{t('adminLists.reports.hidden')}</span>}
          {row.reasons.map((r) => <span key={r}>«{r}»</span>)}
          {row.author && row.authorId && <Link to={memberHref(row.authorId)}>{row.author.name}</Link>}
          {href && <Link to={href}>{localName(row.place.name, lang)}</Link>}
          <span>{relativeTime(row.lastAt, lang, t)}</span>
        </div>
      </div>
      <div className="azq-lrow-acts">
        {/* مكرّر للعنوان (الصف كله يفتح): خارج ترتيب التبويب */}
        <button type="button" className="azq-btn-sm" onClick={onOpen} tabIndex={-1} aria-hidden="true"><Eye size={14} aria-hidden="true" /> {t('adminLists.view')}</button>
        {pending && row.type !== 'project' && !row.deleted && (
          <button type="button" className="azq-btn-sm" onClick={() => onAct('hide')}>{t('adminReports.hide')}</button>
        )}
        {pending && <button type="button" className="azq-btn-ghost" onClick={() => onAct('dismiss')}>{t('adminApi.dismiss')}</button>}
      </div>
    </ClickableRow>
  );
}

function ReportDrawer({ row, pending, onClose, onAct, onSuspend }) {
  const { t, lang } = useLanguage();
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);
  const titleId = useId();
  const [actionError, setActionError] = useState('');
  const [suspending, setSuspending] = useState(false);
  const isChat = row.type === 'chat_message';

  const suspend = async () => {
    setSuspending(true);
    setActionError('');
    try {
      await onSuspend();
    } catch (err) {
      setActionError(err?.message || t('common.loadError'));
      setSuspending(false);
    }
  };

  useEffect(() => {
    let live = true;
    adminApi.getReportGroup(row.type, row.id).then((d) => live && setDetail(d)).catch((e) => live && setError(e));
    return () => { live = false; };
  }, [row.type, row.id]);

  const href = placeHref(detail?.place ?? row.place);
  const footer = pending ? (
    <>
      {isChat && <Button variant="danger" size="sm" onClick={suspend} loading={suspending} aria-describedby="chat-suspend-note">{t('adminChatReport.suspend')}</Button>}
      {detail?.hideable !== false && row.type !== 'project' && !row.deleted && <Button variant="danger" size="sm" onClick={() => onAct('hide')}>{t('adminReports.hide')}</Button>}
      <Button variant="primary" size="sm" onClick={() => onAct('warn')}>{t('adminApi.warn')}</Button>
      <Button variant="ghost" size="sm" onClick={() => onAct('dismiss')}>{t('adminApi.dismiss')}</Button>
    </>
  ) : null;

  return (
    <AdminDrawer title={t('adminLists.reports.drawerTitle')} labelledBy={titleId} onClose={onClose} footer={footer}>
      {error && <ErrorState error={error} />}
      {actionError && <Alert size="sm" className="mb-3">{actionError}</Alert>}
      {!detail && !error && <div className="azq-skel" aria-hidden="true" />}
      {detail && (
        <>
          {isChat && pending && <p id="chat-suspend-note" className="azq-band-sc">{t('adminChatReport.suspendNote')}</p>}
          {isChat && detail.place && (
            <p className="azq-band-sc">{detail.place.kind === 'group' ? t('adminChatReport.place.group', { name: localName(detail.place.name, lang) }) : t('adminChatReport.place.conversation')}</p>
          )}
          {isChat && Array.isArray(detail.context) && <ChatContext context={detail.context} />}
          <section className="azq-drawer-sec">
            <h3>{t('adminLists.reports.content')}</h3>
            {detail.content ? (
              <div className="azq-quote">{detail.content.title && <b>{detail.content.title}{'\n'}</b>}{detail.content.body}</div>
            ) : <p className="azq-empty">{t('adminLists.reports.deleted')}</p>}
          </section>
          <dl className="azq-dl">
            <dt>{t('adminLists.reports.where')}</dt>
            <dd>{href ? <Link to={href}>{localName(detail.place.name, lang)}</Link> : '—'}</dd>
            <dt>{t('adminLists.reports.author')}</dt>
            <dd>{detail.authorId ? <Link to={memberHref(detail.authorId)}>{detail.author?.name}</Link> : '—'}</dd>
            <dt>{t('adminLists.reports.posted')}</dt>
            <dd>{detail.content?.createdAt ? relativeTime(detail.content.createdAt, lang, t) : '—'}</dd>
            <dt>{t('adminLists.reports.state')}</dt>
            <dd>{detail.contentHidden ? t('adminLists.reports.hidden') : t('adminLists.reports.visible')}</dd>
          </dl>
          <section className="azq-drawer-sec">
            <h3>{t('adminLists.reports.allReports', { count: detail.reports.length })}</h3>
            <ul className="azq-mini">
              {detail.reports.map((r) => (
                <li key={r.id}>
                  <span>«{r.reason}»</span>
                  <small>{r.reporter?.name || '—'} · {relativeTime(r.createdAt, lang, t)} · {reportStatusLabel(r.status, lang)}{r.resolution ? ` · ${resolutionLabel(r.resolution, lang)}` : ''}</small>
                </li>
              ))}
            </ul>
          </section>
          <section className="azq-drawer-sec">
            <h3>{t('adminLists.reports.history')}</h3>
            {detail.authorHistory.total === 0 ? (
              <p className="azq-band-empty">{t('adminLists.reports.noHistory')}</p>
            ) : (
              <>
                <p className="azq-band-sc">{t('adminLists.reports.historyLine', { total: detail.authorHistory.total, upheld: detail.authorHistory.upheld })}</p>
                <ul className="azq-mini">
                  {detail.authorHistory.recent.map((h) => (
                    <li key={`${h.type}-${h.id}-${h.createdAt}`}>
                      <span>«{h.reason}»</span>
                      <small>{t(`adminLists.reports.type.${h.type}`)} · {relativeTime(h.createdAt, lang, t)} · {reportStatusLabel(h.status, lang)}</small>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </>
      )}
    </AdminDrawer>
  );
}

// لقطة المحادثة وقت البلاغ: لا رابط إلى المحادثة نفسها، والمرفقات تُنزَّل بالعميل الموثَّق.
function ChatContext({ context }) {
  const { t, lang } = useLanguage();
  const [dlError, setDlError] = useState('');
  const download = async (a) => {
    setDlError('');
    try {
      await downloadBlob(`/admin/reports/chat-attachments/${a.id}`, a.name);
    } catch (err) {
      setDlError(err?.message || t('common.loadError'));
    }
  };
  return (
    <section className="azq-drawer-sec" aria-labelledby="chat-context-title">
      <h3 id="chat-context-title">{t('adminChatReport.contextTitle')}</h3>
      <p className="azq-band-sc">{t('adminChatReport.snapshotNote')}</p>
      <p className="azq-band-sc"><em>{t('adminChatReport.privateEdge')}</em></p>
      <ul className="azq-mini">
        {context.map((m) => (
          <li key={m.id} data-reported={m.reported ? 'true' : undefined} style={m.reported ? { borderInlineStart: '3px solid var(--wp-coral-deep)', paddingInlineStart: '0.5rem', background: 'var(--wp-coral-wash)' } : undefined}>
            <span>
              <b>{m.author?.name || '—'}</b>
              {m.reported && <> <span className="azq-pill is-danger">{t('adminChatReport.reported')}</span></>}
            </span>
            <span>{m.deleted && !m.body ? <em>{t('adminChatReport.deleted')}</em> : m.body}</span>
            {(m.attachments ?? []).map((a) => (
              <button key={a.id} type="button" className="azq-btn-sm" onClick={() => download(a)}>{t('adminChatReport.attachment', { name: a.name })}</button>
            ))}
            <small>{relativeTime(m.createdAt, lang, t)}</small>
          </li>
        ))}
      </ul>
      <p className="azq-band-sc"><em>{t('adminChatReport.afterEdge')}</em></p>
      {dlError && <Alert size="sm">{dlError}</Alert>}
    </section>
  );
}

// ===== التصميم الحالي (classic): القائمة القديمة بلاغًا بلاغًا، لا تتغير (azraqAdminClassic.guard) =====
const CLASSIC_STATUSES = ['PENDING', 'RESOLVED', 'DISMISSED'];

function ClassicApiAdminReports() {
  const { t, lang } = useLanguage();
  const notify = useAdminNotice();
  const [status, setStatus] = useState('PENDING');
  const [error, setError] = useState('');
  // البلاغ والإجراء المفتوحان في نافذة القرار: {report, action}
  const [deciding, setDeciding] = useState(null);
  // صفحةً صفحة مع «عرض المزيد»؛ تغيير الحالة يعيد من الصفحة الأولى.
  const list = useInfiniteList(async (page) => unwrapList(await adminApi.listReports(status, page)), [status]);
  const { items: reports, loading } = list;

  // خطأ الخادم يظهر داخل النافذة وتبقى مفتوحة (ResolveDialog)
  const resolve = async (report, action, options) => {
    setError('');
    await adminApi.resolveReport(report.id, action, options);
    notify(t(RESOLVED_NOTICE[action]));
    await list.reload();
  };

  return (
    <div>
      <TopBar title={t('adminReports.title')} />
      <div className="p-7 px-8 space-y-6">
        <FadeIn>
          <h2 className="wp-page-title">{t('adminReports.title')}</h2>
        </FadeIn>

        <FadeIn delay={0.05}>
          <div className="flex gap-2">
            {CLASSIC_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={status === s}
                onClick={() => setStatus(s)}
                className={`rounded-full px-4 py-[9px] text-body-sm font-semibold transition-colors ${
                  status === s ? 'bg-[var(--wp-ink)] text-white' : 'bg-white border border-[var(--wp-border-2)] text-[var(--wp-text-3)] hover:border-[var(--wp-coral)] hover:text-[var(--wp-coral)]'
                }`}
              >
                {reportStatusLabel(s, lang)}
              </button>
            ))}
          </div>
        </FadeIn>

        {error && <Alert>{error}</Alert>}
        {list.error && <ErrorState error={list.error} onRetry={list.reload} />}

        {loading && (
          <div className="space-y-3" role="status" aria-busy="true">
            <span className="sr-only">{t('common.loading')}</span>
            {[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-2xl bg-[#F0F0F0] animate-pulse" />)}
          </div>
        )}

        {!loading && !list.error && reports.length === 0 && (
          <div className="rounded-2xl bg-[#F6F6F6] border border-[var(--wp-border)] p-6 text-sm text-[var(--wp-text-muted)] text-center">{t('adminApi.noReports')}</div>
        )}

        <div className="space-y-3">
          {!loading && reports.map((report, i) => (
            <FadeIn key={report.id} delay={i * 0.05}>
              <Card className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[var(--wp-text)] mb-1">{report.contentPreview || '—'}</div>
                  <div className="flex gap-4 text-xs text-[var(--wp-text-muted)] flex-wrap">
                    <span>{t('admin.reporter')}: {report.reporter?.name || '—'}</span>
                    <span>{t('admin.reason')}: <span className="px-2 py-0.5 rounded-full bg-[var(--wp-coral-wash)] text-[var(--wp-coral-deep)] font-semibold">{report.reason}</span></span>
                    <span>{relativeTime(report.createdAt, lang, t)}</span>
                    {report.resolution && <span>{t('adminApi.resolution')}: {resolutionLabel(report.resolution, lang)}</span>}
                    {report.contentHidden && <Link to="/admin/hidden" className="underline">{t('adminReports.inTrash')}</Link>}
                  </div>
                </div>
                {status === 'PENDING' && (
                  <div className="flex gap-2 shrink-0">
                    {/* مساحة العمل لا تُخفى من بلاغ (الخادم يرفضه): يبقى التحذير والرفض */}
                    {report.type !== 'project' && (
                      <button
                        type="button"
                        onClick={() => setDeciding({ report, action: 'hide' })}
                        className="flex items-center gap-1 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs hover:bg-red-100 transition-colors"
                      >
                        <EyeOff size={14} aria-hidden="true" /> {t('adminReports.hide')}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeciding({ report, action: 'warn' })}
                      className="flex items-center gap-1 px-3 py-2 bg-[var(--wp-warning-tint)] text-[var(--wp-warning)] rounded-xl text-xs hover:ring-1 hover:ring-[var(--wp-warning)] transition-shadow"
                    >
                      <AlertCircle size={14} aria-hidden="true" /> {t('adminApi.warn')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeciding({ report, action: 'dismiss' })}
                      className="flex items-center gap-1 px-3 py-2 bg-[#F6F6F6] text-[var(--wp-text-3)] rounded-xl text-xs hover:bg-[#F0F0F0] transition-colors"
                    >
                      <XCircle size={14} aria-hidden="true" /> {t('adminApi.dismiss')}
                    </button>
                  </div>
                )}
                {status !== 'PENDING' && (report.memberMessage || report.reporterNotified) && (
                  <div className="text-xs text-[var(--wp-text-muted)] space-y-1 shrink-0 max-w-[18rem]">
                    {report.memberMessage && <p>{t('adminReports.sentMessage')}: «{report.memberMessage}»</p>}
                    {report.reporterNotified && <p>{t('adminReports.reporterWasNotified')}</p>}
                  </div>
                )}
              </Card>
            </FadeIn>
          ))}
        </div>
        <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoadMore={list.loadMore} />
      </div>

      {deciding && (
        <ResolveDialog
          report={deciding.report}
          action={deciding.action}
          onConfirm={(options) => resolve(deciding.report, deciding.action, options)}
          onClose={() => setDeciding(null)}
        />
      )}
    </div>
  );
}

const MEMBER_MESSAGE_MAX = 1000;

/**
 * نافذة القرار في البلاغ (ملاحظة هالة 4): رسالة للعضو صاحب المحتوى بنصّ مقترح حسب القرار تصل في إشعاره،
 * و«أبلِغ المبلِّغ» مفعّل افتراضيًّا. الرفض لا يرسل شيئًا للعضو، فلا رسالة فيه.
 */
export function ResolveDialog({ report, action, onConfirm, onClose }) {
  const { t } = useLanguage();
  const cancelRef = useRef(null);
  const withMessage = action !== 'dismiss';
  const [message, setMessage] = useState(withMessage ? t(`adminReports.suggested.${action}`) : '');
  const [notifyReporter, setNotifyReporter] = useState(Boolean(report.reporter));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await onConfirm({ memberMessage: withMessage ? message.trim() : '', notifyReporter });
      onClose();
    } catch (err) {
      setError(err?.message || t('common.loadError'));
      setBusy(false);
    }
  };

  return (
    <Modal title={t(`adminReports.dialog.${action}.title`)} onClose={busy ? undefined : onClose} initialFocusRef={cancelRef} size="sm">
      <p className="text-sm leading-relaxed text-[var(--wp-text-2)]">{t(`adminReports.dialog.${action}.body`)}</p>
      {report.contentPreview && (
        <blockquote className="mt-3 rounded-xl bg-[#F6F6F6] px-3 py-2 text-sm text-[var(--wp-text-2)] line-clamp-3">{report.contentPreview}</blockquote>
      )}
      {withMessage && (
        <div className="mt-4">
          <label htmlFor="report-member-message" className="block text-xs font-semibold text-[var(--wp-text-2)] mb-1">{t('adminReports.memberMessage')}</label>
          <p id="report-member-message-hint" className="text-xs text-[var(--wp-text-muted)] mb-1.5">{t('adminReports.memberMessageHint')}</p>
          <textarea
            id="report-member-message"
            rows={3}
            maxLength={MEMBER_MESSAGE_MAX}
            aria-describedby="report-member-message-hint"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="wp-input w-full px-3 py-2 text-sm"
          />
        </div>
      )}
      {report.reporter && (
        <label className="mt-4 flex items-start gap-2 text-sm text-[var(--wp-text-2)]">
          <input type="checkbox" className="mt-1" checked={notifyReporter} onChange={(e) => setNotifyReporter(e.target.checked)} />
          <span>{t('adminReports.notifyReporter')}</span>
        </label>
      )}
      {error && <Alert size="sm" className="mt-3">{error}</Alert>}
      <div className="mt-5 flex justify-end gap-2">
        <Button ref={cancelRef} variant="ghost" size="sm" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
        <Button variant={action === 'hide' ? 'danger' : 'primary'} size="sm" onClick={confirm} loading={busy}>
          {busy ? t('projectDetail.manage.working') : t(`adminReports.dialog.${action}.confirm`)}
        </Button>
      </div>
    </Modal>
  );
}

export default function AdminReports() {
  const { theme } = useTheme();
  if (!USE_API) return <MockAdminReports />;
  // الطابور المجمَّع للوحة الجديدة («أزرق هادئ») وحدها؛ التصميم الحالي يبقى كما هو
  return theme === 'azraq' ? <ApiAdminReports /> : <ClassicApiAdminReports />;
}
