import { useEffect, useId, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Eye, Lock, ShieldCheck } from 'lucide-react';
import TopBar from '../../components/Layout/TopBar';
import { ClickableRow, RowButton } from '../../components/common/ClickableRow';
import ErrorState from '../../components/common/ErrorState';
import LoadMore from '../../components/common/LoadMore';
import AdminDrawer from '../../components/Admin/AdminDrawer';
import { useLanguage } from '../../i18n/LanguageContext';
import { USE_API } from '../../config';
import * as adminApi from '../../api/admin';
import { unwrapList } from '../../api/client';
import useInfiniteList from '../../hooks/useInfiniteList';
import { relativeTime } from '../../utils/apiMappers';
import { localName, memberHref, placeHref } from '../../utils/adminLinks';

const KINDS = ['workspace', 'group'];

/**
 * «النقاشات» (قرار أمجد 12 نوفمبر 2026): المدير يقرأ نقاشات مساحات العمل وحيطان المجموعات.
 * القائمة بلا نصوص؛ النص يظهر في الدرج عند الفتح، وكل فتح لنقاش مساحة يُسجَّل في التدقيق (يقوله الدرج).
 */
export default function AdminDiscussions() {
  const { t } = useLanguage();
  if (!USE_API) {
    return (
      <div>
        <TopBar title={t('adminLists.discussions.title')} />
        <div className="azq-list"><p className="azq-empty">{t('adminLists.discussions.empty')}</p></div>
      </div>
    );
  }
  return <ApiAdminDiscussions />;
}

function ApiAdminDiscussions() {
  const { t, lang } = useLanguage();
  const [params, setParams] = useSearchParams();
  const kind = KINDS.includes(params.get('kind')) ? params.get('kind') : 'workspace';
  const [qInput, setQInput] = useState(params.get('q') ?? '');
  const q = params.get('q') ?? '';
  const [open, setOpen] = useState(null);

  useEffect(() => {
    const id = setTimeout(() => {
      if (qInput === q) return;
      const next = new URLSearchParams(params);
      if (qInput) next.set('q', qInput); else next.delete('q');
      setParams(next, { replace: true });
    }, 300);
    return () => clearTimeout(id);
  }, [qInput, q, params, setParams]);

  const setKind = (k) => {
    const next = new URLSearchParams(params);
    if (k === 'workspace') next.delete('kind'); else next.set('kind', k);
    setParams(next, { replace: true });
  };

  const list = useInfiniteList(async (page) => unwrapList(await adminApi.listDiscussions({ kind, q, page })), [kind, q]);
  const counts = list.meta?.counts ?? {};

  return (
    <div>
      <TopBar title={t('adminLists.discussions.title')} />
      <div className="azq-list">
        <header className="azq-list-head">
          <div>
            <h2>{t('adminLists.discussions.title')}</h2>
            <p>{t('adminLists.discussions.lead')}</p>
          </div>
        </header>
        <p className="azq-band-sc"><ShieldCheck size={14} aria-hidden="true" style={{ display: 'inline', verticalAlign: '-2px' }} /> {t('adminLists.discussions.auditNote')}</p>

        <div className="azq-tabs" role="tablist" aria-label={t('adminLists.discussions.title')}>
          {KINDS.map((k) => (
            <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => setKind(k)}>
              {t(`adminLists.discussions.tab.${k}`)}
              {counts[k] != null && <span className="azq-count">{counts[k]}</span>}
            </button>
          ))}
        </div>

        <div className="azq-toolbar">
          <input type="search" value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder={t('adminLists.discussions.search')} aria-label={t('adminLists.discussions.search')} />
        </div>

        {list.error && <ErrorState error={list.error} onRetry={list.reload} />}
        {list.loading && <div className="azq-skel" role="status" aria-busy="true"><span className="sr-only">{t('common.loading')}</span></div>}
        {!list.loading && !list.error && list.items.length === 0 && <p className="azq-empty">{t('adminLists.discussions.empty')}</p>}

        {!list.loading && list.items.length > 0 && (
          <ul className="azq-lrows">
            {list.items.map((d) => (
              <ClickableRow as="li" key={`${d.kind}-${d.id}`} className="azq-lrow">
                <span aria-hidden="true">{d.private ? <Lock size={16} /> : null}</span>
                <div className="azq-lrow-main">
                  <RowButton className="azq-lrow-title" onClick={() => setOpen(d)}>{localName(d.name, lang)}</RowButton>
                  <div className="azq-lrow-meta">
                    {d.private && <span className="azq-pill">{t('adminLists.discussions.private')}</span>}
                    <span>{t('adminLists.discussions.members', { count: d.membersCount })}</span>
                    <span>{t('adminLists.discussions.messages', { count: d.messagesCount })}</span>
                    {d.messagesWeek > 0 && <span className="azq-pill is-ok">{t('adminLists.discussions.week', { count: d.messagesWeek })}</span>}
                    <span>{d.lastMessageAt ? t('adminLists.discussions.last', { when: relativeTime(d.lastMessageAt, lang, t) }) : t('adminLists.discussions.none')}</span>
                  </div>
                </div>
                <div className="azq-lrow-acts">
                  {/* مكرّر للعنوان (الصف كله يفتح): خارج ترتيب التبويب */}
                  <button type="button" className="azq-btn-sm" onClick={() => setOpen(d)} tabIndex={-1} aria-hidden="true"><Eye size={14} aria-hidden="true" /> {t('adminLists.discussions.open')}</button>
                </div>
              </ClickableRow>
            ))}
          </ul>
        )}
        <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoadMore={list.loadMore} />
      </div>
      {open && <DiscussionDrawer item={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function DiscussionDrawer({ item, onClose }) {
  const { t, lang } = useLanguage();
  const titleId = useId();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    adminApi.getDiscussion(item.kind, item.id).then((d) => live && setData(d)).catch((e) => live && setError(e));
    return () => { live = false; };
  }, [item.kind, item.id]);

  const href = placeHref({ kind: item.kind, id: item.id });
  const body = (m) => (
    <>
      <span style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{m.body}</span>
      <small>
        {m.authorId ? <Link to={memberHref(m.authorId)}>{m.author?.name}</Link> : m.author?.name} · {relativeTime(m.createdAt, lang, t)}
        {m.hidden && <> · <span className="azq-pill is-danger">{t('adminLists.discussions.hidden')}</span></>}
      </small>
    </>
  );

  return (
    <AdminDrawer
      title={localName(item.name, lang)}
      labelledBy={titleId}
      onClose={onClose}
      footer={href ? <Link className="azq-btn-ghost" to={href}>{t('adminLists.discussions.openPage')}</Link> : null}
    >
      {item.kind === 'workspace' && <p className="azq-band-sc">{t('adminLists.discussions.auditNote')}</p>}
      {error && <ErrorState error={error} />}
      {!data && !error && <div className="azq-skel" aria-hidden="true" />}
      {data && data.messages.length === 0 && <p className="azq-empty">{t('adminLists.discussions.none')}</p>}
      {data && data.messages.length > 0 && (
        <ul className="azq-mini">
          {data.messages.map((m) => (
            <li key={m.id}>
              {body(m)}
              {(m.comments ?? []).length > 0 && (
                <ul className="azq-mini" style={{ paddingInlineStart: 16 }} aria-label={t('adminLists.discussions.replies', { count: m.comments.length })}>
                  {m.comments.map((c) => <li key={c.id}>{body(c)}</li>)}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
      {data?.truncated && <p className="azq-band-sc">{t('adminLists.discussions.truncated')}</p>}
    </AdminDrawer>
  );
}
