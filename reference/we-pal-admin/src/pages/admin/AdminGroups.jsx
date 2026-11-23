import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Users } from 'lucide-react';
import TopBar from '../../components/Layout/TopBar';
import ErrorState from '../../components/common/ErrorState';
import Button from '../../components/ui/Button';
import EditGroupDialog from '../../components/community/EditGroupDialog';
import { useAdminNotice } from '../../components/Admin/adminNoticeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { USE_API } from '../../config';
import { listGroups } from '../../api/platform';
import { localName } from '../../utils/adminLinks';
import { ClickableRow, RowLink } from '../../components/common/ClickableRow';

/**
 * «المجموعات» في الإدارة (البند 2.7 في التدقيق، المرحلة 4): كل المجموعات بأعدادها، وإنشاء مجموعة وتعديلها
 * بالمحرّر نفسه الذي في صفحة المجموعة، وروابط إلى حائطها ونقاشها في «النقاشات».
 */
export default function AdminGroups() {
  const { t, lang } = useLanguage();
  const notify = useAdminNotice();
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(undefined); // undefined: مغلق، null: جديدة، id: تعديل

  const load = useCallback(() => listGroups().then((g) => { setGroups(g ?? []); setError(null); }).catch(setError), []);
  useEffect(() => {
    if (!USE_API) return undefined;
    let live = true;
    listGroups().then((g) => live && setGroups(g ?? [])).catch((e) => live && setError(e));
    return () => { live = false; };
  }, []);

  return (
    <div>
      <TopBar title={t('adminGroups.title')} />
      <div className="azq-list">
        <header className="azq-list-head">
          <div>
            <h2>{t('adminGroups.title')}</h2>
            <p>{t('adminGroups.lead')}</p>
          </div>
          <Button onClick={() => setEditing(null)}><Plus aria-hidden="true" /> {t('adminGroups.create')}</Button>
        </header>
        {error && <ErrorState error={error} onRetry={load} />}
        {!groups && !error && <div className="azq-skel" role="status" aria-busy="true" />}
        {groups && groups.length === 0 && <p className="azq-empty">{t('adminGroups.empty')}</p>}
        {groups && groups.length > 0 && (
          <ul className="azq-lrows">
            {groups.map((g) => (
              <ClickableRow as="li" key={g.id} className="azq-lrow">
                <span className="azq-tile" aria-hidden="true" style={{ background: `color-mix(in srgb, ${g.color || 'var(--color-primary)'} 16%, var(--color-surface))`, color: g.color || 'var(--color-primary)' }}><Users /></span>
                <div className="azq-lrow-main">
                  <RowLink to={`/community/${encodeURIComponent(g.id)}`} className="azq-lrow-title">{localName(g.name, lang)}</RowLink>
                  <div className="azq-lrow-meta">
                    {g.kind && <span className="azq-pill">{t(`trackGroups.kind.${g.kind}`)}</span>}
                    <span>{t('adminGroups.members', { count: g.membersCount ?? 0 })}</span>
                    <span>{t('adminGroups.posts', { count: g.postsCount ?? 0 })}</span>
                    <Link to="/admin/discussions?kind=group">{t('adminGroups.readWall')}</Link>
                  </div>
                </div>
                <div className="azq-lrow-acts">
                  <button type="button" className="azq-btn-sm" onClick={() => setEditing(g.id)}><Pencil size={14} aria-hidden="true" /> {t('adminGroups.edit')}</button>
                </div>
              </ClickableRow>
            ))}
          </ul>
        )}
      </div>
      {editing !== undefined && (
        <EditGroupDialog
          groupId={editing}
          onClose={() => setEditing(undefined)}
          onSaved={async () => { notify(t(editing ? 'adminGroups.saved' : 'adminGroups.created')); await load(); }}
          onMembersChange={load}
        />
      )}
    </div>
  );
}
