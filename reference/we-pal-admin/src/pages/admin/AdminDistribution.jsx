import { useCallback, useEffect, useMemo, useState } from 'react';
import { FolderInput, MoveRight, Search, Upload, UserMinus } from 'lucide-react';
import TopBar from '../../components/Layout/TopBar';
import ErrorState from '../../components/common/ErrorState';
import Button from '../../components/ui/Button';
import DistributeDialog from '../../components/Admin/Distribution/DistributeDialog';
import DistributionSheetDialog from '../../components/Admin/Distribution/DistributionSheetDialog';
import { useAdminNotice } from '../../components/Admin/adminNoticeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { USE_API } from '../../config';
import { listDistributionMembers, listDistributionWorkspaces } from '../../api/distribution';
import { REGIONS, regionLabel, trackLabel } from '../../utils/apiMappers';
import { TRACKS } from '../../utils/proposals';

/**
 * «توزيع الأعضاء» (القرار 3، 16 نوفمبر 2026؛ الشاشة 5 في platform-ux-2026-11): الإدارة تضع الأعضاء في مساحات العمل
 * دفعةً واحدة. المرشّحات تبدأ بما يحتاج عملًا («بلا مساحة عمل»)، ثم تحديد جماعي وفعل واحد بمعاينة قبل الحفظ،
 * أو ورقة CSV. اختيار «في مساحة» يعرض أعضاءها للنقل والإزالة. عمود السعة يقول كم في كل فريق من 8.
 * مرشّح «الورشة» والنقل إلى ورشة ينتظران نوع مجموعة «ورشة» (إعادة تنظيم المجموعات).
 */
export default function AdminDistribution() {
  const { t, lang } = useLanguage();
  const notify = useAdminNotice();
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({ q: '', region: '', track: '', filter: 'unassigned', projectId: '' });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [dialog, setDialog] = useState(null); // add | move | remove | sheet

  const load = useCallback(async () => {
    if (!USE_API) return;
    setLoading(true);
    try {
      const [members, spaces] = await Promise.all([
        listDistributionMembers({ ...filters, filter: filters.projectId ? 'all' : filters.filter, page }),
        listDistributionWorkspaces(),
      ]);
      setResult(members);
      setWorkspaces(spaces);
      setError(null);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  // البحث بعد توقف الكتابة
  useEffect(() => {
    const id = setTimeout(() => {
      setFilters((f) => (f.q === searchInput.trim() ? f : { ...f, q: searchInput.trim() }));
      setPage(1);
    }, 300);
    return () => clearTimeout(id);
  }, [searchInput]);

  const setFilter = (key, value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
    setSelected(new Set());
  };

  const members = useMemo(() => result?.data ?? [], [result]);
  const meta = result?.meta ?? {};
  const currentSpace = workspaces.find((w) => w.id === filters.projectId) ?? null;
  const allOnPage = members.length > 0 && members.every((m) => selected.has(m.id));

  const toggle = (id) => setSelected((s) => {
    const next = new Set(s);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const togglePage = () => setSelected((s) => {
    const next = new Set(s);
    members.forEach((m) => (allOnPage ? next.delete(m.id) : next.add(m.id)));
    return next;
  });

  const done = async (res, mode) => {
    setDialog(null);
    setSelected(new Set());
    notify(t(`adminDistribution.saved.${mode}`, { count: res?.counts?.ok ?? 0 }));
    await load();
  };

  return (
    <div>
      <TopBar title={t('adminDistribution.title')} />
      <div className="azq-list">
        <header className="azq-list-head">
          <div>
            <h2>{t('adminDistribution.title')}</h2>
            <p>{t('adminDistribution.lead')}</p>
          </div>
          <Button variant="secondary" onClick={() => setDialog('sheet')}><Upload aria-hidden="true" /> {t('adminDistribution.importSheet')}</Button>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search size={14} aria-hidden="true" className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--wp-text-muted)]" />
                <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder={t('adminDistribution.search')} aria-label={t('adminDistribution.search')} className="wp-input w-full ps-8 pe-3 py-2 text-sm" />
              </div>
              <select value={filters.region} onChange={(e) => setFilter('region', e.target.value)} aria-label={t('azraqAdmin.filterRegion')} className="wp-input px-3 py-2 text-sm">
                <option value="">{t('adminApi.allRegions')}</option>
                {REGIONS.map((r) => <option key={r} value={r}>{regionLabel(r, lang)}</option>)}
              </select>
              <select value={filters.track} onChange={(e) => setFilter('track', e.target.value)} aria-label={t('adminDistribution.cols.track')} className="wp-input px-3 py-2 text-sm">
                <option value="">{t('adminDistribution.allTracks')}</option>
                {TRACKS.map((tr) => <option key={tr.value} value={tr.value}>{trackLabel(tr.value, lang)}</option>)}
              </select>
              <select value={filters.projectId} onChange={(e) => setFilter('projectId', e.target.value)} aria-label={t('adminDistribution.inWorkspace')} className="wp-input px-3 py-2 text-sm max-w-[16rem]">
                <option value="">{t('adminDistribution.anyWorkspace')}</option>
                {workspaces.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
              </select>
              {!filters.projectId && (
                <div className="flex gap-1" role="group" aria-label={t('adminDistribution.cols.workspaces')}>
                  {['unassigned', 'all'].map((key) => (
                    <button key={key} type="button" className="px-3 py-1.5 rounded-full text-sm" aria-pressed={filters.filter === key} onClick={() => setFilter('filter', key)}>
                      {t(`adminDistribution.chip.${key}`)}{meta.counts?.[key] != null && ` · ${meta.counts[key]}`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selected.size > 0 && (
              <div className="flex items-center gap-2 flex-wrap rounded-xl border border-[var(--wp-border)] bg-[var(--color-surface-muted)] p-2" role="toolbar" aria-label={t('adminDistribution.bulkLabel')}>
                <b className="text-sm px-1">{t('adminDistribution.selected', { count: selected.size })}</b>
                <Button size="sm" onClick={() => setDialog('add')}><FolderInput aria-hidden="true" /> {t('adminDistribution.actions.add')}</Button>
                {currentSpace && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => setDialog('move')}><MoveRight aria-hidden="true" /> {t('adminDistribution.actions.move')}</Button>
                    <Button size="sm" variant="secondary" onClick={() => setDialog('remove')}><UserMinus aria-hidden="true" /> {t('adminDistribution.actions.remove')}</Button>
                  </>
                )}
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>{t('adminDistribution.actions.clear')}</Button>
              </div>
            )}

            {error && <ErrorState error={error} onRetry={load} />}
            <div className="overflow-x-auto rounded-xl border border-[var(--wp-border)]" role="region" tabIndex={0} aria-label={t('adminDistribution.tableLabel')}>
              <table className="w-full text-sm" aria-busy={loading}>
                <caption className="sr-only">{t('adminDistribution.tableLabel')}</caption>
                <thead>
                  <tr className="border-b border-[var(--wp-border)] text-xs text-[var(--wp-text-muted)]">
                    <th scope="col" className="p-2 w-8"><input type="checkbox" checked={allOnPage} onChange={togglePage} aria-label={t('adminDistribution.selectPage')} disabled={members.length === 0} /></th>
                    <th scope="col" className="p-2 text-start">{t('adminDistribution.cols.member')}</th>
                    <th scope="col" className="p-2 text-start">{t('adminDistribution.cols.region')}</th>
                    <th scope="col" className="p-2 text-start">{t('adminDistribution.cols.track')}</th>
                    <th scope="col" className="p-2 text-start">{t('adminDistribution.cols.workspaces')}</th>
                    <th scope="col" className="p-2 text-start">{t('adminDistribution.cols.account')}</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading && members.length === 0 && (
                    <tr><td colSpan={6} className="py-6 text-center text-[var(--wp-text-muted)]">{t('adminDistribution.empty')}</td></tr>
                  )}
                  {members.map((m) => (
                    <tr key={m.id} className={`border-b border-[var(--wp-border)]${selected.has(m.id) ? ' bg-[var(--color-primary-soft)]' : ''}`}>
                      <td className="p-2"><input type="checkbox" checked={selected.has(m.id)} onChange={() => toggle(m.id)} aria-label={t('adminDistribution.selectOne', { name: m.name })} /></td>
                      <td className="p-2 font-medium">{m.name}</td>
                      <td className="p-2 text-[var(--wp-text-muted)]">{m.region ? regionLabel(m.region, lang) : '—'}</td>
                      <td className="p-2 text-[var(--wp-text-muted)]">{m.track ? trackLabel(m.track, lang) : '—'}</td>
                      <td className="p-2">
                        {m.workspaces.length === 0 ? <span className="text-[var(--wp-text-muted)]">—</span> : (
                          <span className="flex flex-wrap gap-1">
                            {m.workspaces.map((w) => (
                              <span key={w.id} className="azq-pill">{w.title}{w.role === 'LEADER' && ` · ${t('adminDistribution.leader')}`}</span>
                            ))}
                          </span>
                        )}
                      </td>
                      <td className="p-2"><span className={`azq-pill${m.isActive ? ' is-ok' : ' is-warn'}`}>{t(m.isActive ? 'adminDistribution.active' : 'adminDistribution.inactive')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(meta.lastPage ?? 1) > 1 && (
              <div className="flex items-center justify-between text-sm text-[var(--wp-text-muted)]">
                <span>{t('adminDistribution.page', { page: meta.page, last: meta.lastPage })}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>{t('adminDistribution.prev')}</Button>
                  <Button size="sm" variant="ghost" disabled={page >= meta.lastPage || loading} onClick={() => setPage((p) => p + 1)}>{t('adminDistribution.next')}</Button>
                </div>
              </div>
            )}
          </div>

          <section className="rounded-xl border border-[var(--wp-border)] p-3 space-y-3 self-start" aria-labelledby="dist-capacity">
            <h3 id="dist-capacity" className="text-sm font-semibold">{t('adminDistribution.capacity.title')}</h3>
            {workspaces.length === 0 && <p className="text-sm text-[var(--wp-text-muted)]">{t('adminDistribution.capacity.none')}</p>}
            <ul className="space-y-3 max-h-[28rem] overflow-y-auto">
              {workspaces.map((w) => (
                <li key={w.id}>
                  <div className="flex justify-between gap-2 text-sm"><b className="truncate">{w.title}</b><span className="tabular-nums shrink-0">{t('adminDistribution.capacity.count', { count: w.membersCount, max: w.max })}</span></div>
                  <div className="h-1.5 rounded-full bg-[var(--color-surface-muted)] mt-1" aria-hidden="true">
                    <div className="h-full rounded-full" style={{ width: `${Math.min(100, (w.membersCount / w.max) * 100)}%`, background: w.membersCount < w.min ? 'var(--color-warning-text)' : 'var(--color-primary)' }} />
                  </div>
                  <p className="text-xs text-[var(--wp-text-muted)] mt-1">
                    {w.membersCount < w.min ? t('adminDistribution.capacity.low', { min: w.min }) : (w.leaders?.length ? t('adminDistribution.capacity.leaders', { names: w.leaders.join('، ') }) : '')}
                  </p>
                </li>
              ))}
            </ul>
            <p className="text-xs text-[var(--wp-text-muted)]">{t('adminDistribution.capacity.note')}</p>
          </section>
        </div>
      </div>

      {dialog && dialog !== 'sheet' && (
        <DistributeDialog mode={dialog} userIds={[...selected]} from={currentSpace} workspaces={workspaces} onClose={() => setDialog(null)} onDone={done} />
      )}
      {dialog === 'sheet' && <DistributionSheetDialog onClose={() => setDialog(null)} onDone={(res) => done(res, 'sheet')} />}
    </div>
  );
}
