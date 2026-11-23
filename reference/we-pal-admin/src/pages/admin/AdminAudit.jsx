import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, ScrollText } from 'lucide-react';
import TopBar from '../../components/Layout/TopBar';
import ErrorState from '../../components/common/ErrorState';
import LoadMore from '../../components/common/LoadMore';
import Button from '../../components/ui/Button';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../auth/AuthContext';
import { USE_API } from '../../config';
import * as adminApi from '../../api/admin';
import { unwrapList } from '../../api/client';
import useInfiniteList from '../../hooks/useInfiniteList';
import { auditActionLabel, relativeTime } from '../../utils/apiMappers';
import { hasPermission, roleLabelKey } from '../../utils/roles';
import { memberHref } from '../../utils/adminLinks';

const CATEGORIES = ['admin', 'moderation', 'access', 'auth'];
const OUTCOMES = ['success', 'denied', 'failed'];
const ACTIONS = ['user.*', 'report.*', 'invitations.*', 'discussion.*', 'settings.*', 'auth.*', 'content.*'];
const FILTERS = ['category', 'outcome', 'action', 'from', 'to'];

/**
 * سجل التدقيق المقروء (خطة لوحة الإدارة، المرحلة 4): أسماء أفعال مقروءة، ومرشّحات في الرابط، والسبب
 * المكتوب حين يوجد، وتصدير CSV بالمرشّحات نفسها لمن يملك audit.export.
 */
export default function AdminAudit() {
  const { t, lang } = useLanguage();
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(FILTERS.map((k) => [k, params.get(k) ?? '']));
  const key = FILTERS.map((k) => filters[k]).join('|');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const list = useInfiniteList(async (page) => (USE_API ? unwrapList(await adminApi.listAuditFiltered(filters, page)) : { items: [], meta: null }), [key]);
  const setFilter = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };

  const exportCsv = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await adminApi.exportAuditCsv(filters);
    } catch (e) {
      setExportError(e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <TopBar title={t('adminAudit.title')} />
      <div className="azq-list">
        <header className="azq-list-head">
          <div>
            <h2>{t('adminAudit.title')}</h2>
            <p>{t('adminAudit.lead')}</p>
          </div>
          {hasPermission(user, 'audit.export') && (
            <Button variant="secondary" onClick={exportCsv} loading={exporting}><Download aria-hidden="true" /> {t('adminAudit.export')}</Button>
          )}
        </header>

        <div className="azq-toolbar" role="group" aria-label={t('adminAudit.filters')}>
          <select aria-label={t('adminAudit.category')} value={filters.category} onChange={(e) => setFilter('category', e.target.value)}>
            <option value="">{t('adminAudit.allCategories')}</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{t(`adminAudit.cat.${c}`)}</option>)}
          </select>
          <select aria-label={t('adminAudit.action')} value={filters.action} onChange={(e) => setFilter('action', e.target.value)}>
            <option value="">{t('adminAudit.allActions')}</option>
            {ACTIONS.map((a) => <option key={a} value={a}>{t(`adminAudit.act.${a.replace('.*', '')}`)}</option>)}
          </select>
          <select aria-label={t('adminAudit.outcome')} value={filters.outcome} onChange={(e) => setFilter('outcome', e.target.value)}>
            <option value="">{t('adminAudit.allOutcomes')}</option>
            {OUTCOMES.map((o) => <option key={o} value={o}>{t(`adminAudit.out.${o}`)}</option>)}
          </select>
          <label className="azq-chk">{t('adminAudit.from')} <input type="date" value={filters.from} onChange={(e) => setFilter('from', e.target.value)} /></label>
          <label className="azq-chk">{t('adminAudit.to')} <input type="date" value={filters.to} onChange={(e) => setFilter('to', e.target.value)} /></label>
        </div>

        {exportError && <ErrorState error={exportError} />}
        {list.error && <ErrorState error={list.error} onRetry={list.reload} />}
        {list.loading && <div className="azq-skel" role="status" aria-busy="true"><span className="sr-only">{t('common.loading')}</span></div>}
        {!list.loading && !list.error && list.items.length === 0 && <p className="azq-empty">{t('adminAudit.empty')}</p>}

        {list.items.length > 0 && (
          <ul className="azq-lrows" aria-label={t('adminAudit.title')}>
            {list.items.map((row) => (
              <li key={row.id} className="azq-lrow" style={{ gridTemplateColumns: 'auto minmax(0,1fr) auto' }}>
                <span className="azq-tile" data-path={row.outcome === 'success' ? 'none' : 'vote'} aria-hidden="true"><ScrollText /></span>
                <div className="azq-lrow-main">
                  <span>
                    {row.actor?.id ? <Link to={memberHref(row.actor.id)}><b>{row.actor.name || '—'}</b></Link> : <b>{row.actor?.name || t('adminAudit.system')}</b>}
                    {row.actor?.role && <span className="azq-band-sc"> ({t(roleLabelKey(row.actor.role))})</span>}
                    {' '}{auditActionLabel(row.action, lang)}
                    {row.meta?.label ? <> «{row.meta.label}»</> : null}
                  </span>
                  <span className="azq-lrow-meta">
                    <span className="azq-pill">{t(`adminAudit.cat.${row.category}`)}</span>
                    {row.outcome !== 'success' && <span className="azq-pill is-danger">{t(`adminAudit.out.${row.outcome}`)}</span>}
                    {row.meta?.reason && <span>«{row.meta.reason}»</span>}
                    {row.device && <span>{row.device}</span>}
                    <code dir="ltr">{row.action}</code>
                  </span>
                </div>
                <time className="azq-band-sc" dateTime={row.createdAt}>{relativeTime(row.createdAt, lang, t)}</time>
              </li>
            ))}
          </ul>
        )}
        <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoadMore={list.loadMore} />
      </div>
    </div>
  );
}
