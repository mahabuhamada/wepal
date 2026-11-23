import { useId, useState } from 'react';
import { Inbox, Mail, MailOpen } from 'lucide-react';
import TopBar from '../../components/Layout/TopBar';
import Card from '../../components/common/Card';
import FadeIn from '../../components/common/FadeIn';
import EmptyState from '../../components/common/EmptyState';
import ErrorState from '../../components/common/ErrorState';
import FeatureUnavailable from '../../components/common/FeatureUnavailable';
import LoadMore from '../../components/common/LoadMore';
import { useAdminNotice } from '../../components/Admin/adminNoticeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { USE_API } from '../../config';
import { unwrapList } from '../../api/client';
import * as adminApi from '../../api/admin';
import useInfiniteList from '../../hooks/useInfiniteList';
import useSelection from '../../hooks/useSelection';
import BulkBar from '../../components/Admin/BulkBar';
import { useTheme } from '../../theme/ThemeContext';
import { adjustInboxUnread, inboxBadgeText, setInboxUnread, useInboxUnreadCount } from '../../hooks/useInboxUnread';
import { formatShortDate } from '../../utils/apiMappers';
import { mailtoHref } from '../../utils/mailto';
import useUrlParam from '../../hooks/useUrlParam';

// حالة القراءة (PR 212): الكل / غير المقروءة / المقروءة → ?status=unread|read
const READ_FILTERS = ['all', 'unread', 'read'];

// الخادم يدعم حالة القراءة إن أرسل meta.unreadCount أو readAt في العناصر؛ الخادم الأقدم لا يرسل أيهما،
// فتبقى الصفحة كما كانت (بلا ترشيح ولا أزرار ولا شارة).
const hasReadState = (res) =>
  typeof res?.meta?.unreadCount === 'number'
  || (Array.isArray(res?.data) && res.data.some((m) => m && Object.prototype.hasOwnProperty.call(m, 'readAt')));

function ReadFilter({ value, onChange }) {
  const { t } = useLanguage();
  return (
    <div className="aib-filter mb-4 inline-flex gap-1 rounded-xl bg-[var(--wp-bg)] p-1" role="group" aria-label={t('azraqAdmin.inbox.filterLabel')}>
      {READ_FILTERS.map((key) => (
        <button
          key={key}
          type="button"
          aria-pressed={value === key}
          onClick={() => onChange(key)}
          className={`rounded-lg px-3 py-1 text-xs font-semibold ${value === key ? 'bg-white text-[var(--wp-ink)] shadow-sm' : 'text-[var(--wp-text-3)]'}`}
        >
          {t(`azraqAdmin.inbox.filters.${key}`)}
        </button>
      ))}
    </div>
  );
}

// حالة الرسالة نصًا وأيقونة (لا باللون وحده)، وزر يقلبها. الزر لا يُعطَّل أثناء الطلب حتى لا يضيع التركيز.
function ReadState({ message, onToggle }) {
  const { t, lang } = useLanguage();
  const notify = useAdminNotice();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const errorId = useId();
  const read = Boolean(message.readAt);
  const StateIcon = read ? MailOpen : Mail;
  const ActionIcon = read ? Mail : MailOpen;

  const toggle = async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const updated = await adminApi.markContactMessage(message.id, !read);
      const next = updated && typeof updated === 'object' ? { ...message, ...updated } : { ...message, readAt: read ? null : new Date().toISOString() };
      // تكرار الحالة نفسها لا يغيّر العدد (الخادم يُرجع العنصر كما هو).
      const nowRead = Boolean(next.readAt);
      if (nowRead !== read) adjustInboxUnread(nowRead ? -1 : 1);
      onToggle(next);
      notify(t(nowRead ? 'azraqAdmin.inbox.markedRead' : 'azraqAdmin.inbox.markedUnread', { subject: message.subject }));
    } catch (err) {
      setError(t('azraqAdmin.inbox.markFailed', { subject: message.subject, error: err?.message || '' }));
    } finally {
      setPending(false);
    }
  };

  const readerName = message.readBy?.name;
  const readText = !read ? t('azraqAdmin.inbox.unread')
    : readerName ? t('azraqAdmin.inbox.readByOn', { date: formatShortDate(message.readAt, lang), name: readerName })
      : t('azraqAdmin.inbox.readOn', { date: formatShortDate(message.readAt, lang) });

  return (
    <div className="aib-state mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--wp-border)] pt-3">
      <span className={`aib-status inline-flex items-center gap-1.5 text-xs font-semibold ${read ? 'text-[var(--wp-text-muted)]' : 'text-[var(--wp-coral-deep)]'}`} data-read={read ? 'true' : 'false'}>
        <StateIcon size={14} aria-hidden="true" />
        {readText}
      </span>
      <button
        type="button"
        onClick={toggle}
        aria-disabled={pending || undefined}
        aria-describedby={error ? errorId : undefined}
        aria-label={`${t(read ? 'azraqAdmin.inbox.markUnread' : 'azraqAdmin.inbox.markRead')}: ${message.subject}`}
        className="aib-toggle inline-flex items-center gap-1.5 rounded-lg border border-[var(--wp-border-2)] px-3 py-1.5 text-xs font-semibold text-[var(--wp-ink)] hover:border-[var(--wp-coral)] hover:text-[var(--wp-coral)]"
      >
        <ActionIcon size={14} aria-hidden="true" />
        {t(read ? 'azraqAdmin.inbox.markUnread' : 'azraqAdmin.inbox.markRead')}
      </button>
      {error && <p id={errorId} role="alert" className="aib-error w-full text-xs text-[var(--wp-coral-deep)]">{error}</p>}
    </div>
  );
}

function ContactMessages({ filter, onFilter }) {
  const { t, lang } = useLanguage();
  // يبقى صحيحًا بعد أول رد يدعم حالة القراءة، فلا يختفي الترشيح (ولا تركيزه) أثناء إعادة التحميل.
  const [readState, setReadState] = useState(false);
  const list = useInfiniteList(async (page) => {
    const res = await adminApi.listContactMessages(page, filter === 'all' ? {} : { status: filter });
    if (hasReadState(res)) {
      setReadState(true);
      setInboxUnread(res.meta?.unreadCount);
    }
    return unwrapList(res);
  }, [filter]);

  const replace = (next) => list.setItems((items) => items.map((m) => (m.id === next.id ? next : m)));
  const notify = useAdminNotice();
  const selection = useSelection(filter);
  // الإجراء الجماعي للوحة الجديدة («أزرق هادئ») وحدها؛ التصميم الحالي لا يتغير
  const azraqTheme = useTheme().theme === 'azraq';
  const bulk = readState && azraqTheme;

  // الإجراء الجماعي (خطة لوحة الإدارة 4.3): تعليم المحدّد مقروءًا أو غير مقروء، و«تراجع» يعيده
  const markMany = async (read, ids = [...selection.ids]) => {
    const res = await adminApi.markContactMessages(ids, read);
    const changed = res?.changed ?? [];
    selection.clear();
    await list.reload();
    notify(t('adminLists.inbox.marked', { count: changed.length }), changed.length
      ? { undo: async () => { await adminApi.markContactMessages(changed, !read); await list.reload(); } }
      : undefined);
  };
  const emptyTitle = filter === 'unread' ? t('azraqAdmin.inbox.noUnread')
    : filter === 'read' ? t('azraqAdmin.inbox.noRead') : t('adminInbox.noMessages');

  const filterBar = readState && <ReadFilter value={filter} onChange={onFilter} />;
  if (list.loading) return <>{filterBar}<p role="status" aria-busy="true" data-loading="" className="text-sm text-[var(--wp-text-muted)]">{t('common.loading')}</p></>;
  if (list.error) return <>{filterBar}<ErrorState error={list.error} onRetry={list.reload} /></>;
  if (list.items.length === 0) return <>{filterBar}<EmptyState icon={Inbox} title={emptyTitle} /></>;

  return (
    <>
      {filterBar}
      {bulk && (
        <BulkBar
          count={selection.size}
          onClear={selection.clear}
          actions={[
            { key: 'read', label: t('adminLists.inbox.markRead'), onClick: () => markMany(true) },
            { key: 'unread', label: t('adminLists.inbox.markUnread'), onClick: () => markMany(false) },
          ]}
        />
      )}
      <ul className="space-y-3" aria-label={t('adminInbox.messages')}>
        {list.items.map((m) => (
          <li key={m.id} data-unread={readState ? String(!m.readAt) : undefined}>
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-2">
                {bulk && (
                  <input
                    type="checkbox"
                    className="mt-1 h-[18px] w-[18px]"
                    checked={selection.has(m.id)}
                    onChange={() => selection.toggle(m.id)}
                    aria-label={t('adminLists.selectRow', { title: m.subject })}
                  />
                )}
                <div className={bulk ? 'min-w-0 flex-1' : undefined}>
                  <b className="text-sm text-[var(--wp-ink)]">{m.subject}</b>
                  <div className="mt-0.5 text-xs text-[var(--wp-text-muted)]">
                    {m.name} · <a href={mailtoHref(m.email)} dir="ltr" className="hover:text-[var(--wp-coral)]">{m.email}</a>
                  </div>
                </div>
                <small className="text-xs text-[var(--wp-text-muted)]">{formatShortDate(m.createdAt, lang)}</small>
              </div>
              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--wp-text-2)]">{m.message}</p>
              {readState && <ReadState message={m} onToggle={replace} />}
            </Card>
          </li>
        ))}
      </ul>
      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoadMore={list.loadMore} className="mt-4" />
    </>
  );
}

function NewsletterSubscribers() {
  const { t, lang } = useLanguage();
  const list = useInfiniteList(async (page) => unwrapList(await adminApi.listNewsletterSubscribers(page)), []);

  if (list.loading) return <p role="status" aria-busy="true" data-loading="" className="text-sm text-[var(--wp-text-muted)]">{t('common.loading')}</p>;
  if (list.error) return <ErrorState error={list.error} onRetry={list.reload} />;
  if (list.items.length === 0) return <EmptyState icon={Mail} title={t('adminInbox.noSubscribers')} />;

  return (
    <Card>
      {list.meta?.total != null && (
        <p className="mb-3 text-xs text-[var(--wp-text-muted)]">{t('adminInbox.subscribersCount', { count: list.meta.total })}</p>
      )}
      <ul className="divide-y divide-[var(--wp-border)]" aria-label={t('adminInbox.subscribers')}>
        {list.items.map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span dir="ltr" className="text-[var(--wp-text)]">{s.email}</span>
            <small className="text-xs text-[var(--wp-text-muted)]">{formatShortDate(s.subscribedAt, lang)}</small>
          </li>
        ))}
      </ul>
      <LoadMore hasMore={list.hasMore} loading={list.loadingMore} onLoadMore={list.loadMore} className="mt-4" />
    </Card>
  );
}

/**
 * صندوق الوارد (B7.2، للمدير): رسائل نموذج «تواصل معنا» ومشتركو النشرة البريدية،
 * كلاهما مقسّم والأحدث أولًا. مع خادم حالة القراءة (PR 212): عدد غير المقروءة على التبويب،
 * وترشيح الكل/غير المقروءة/المقروءة، وزر تعليم لكل رسالة يُعلَن ناتجه.
 */
export default function AdminInbox() {
  const { t } = useLanguage();
  // التبويب ومرشّح القراءة في العنوان: سطر «الوارد» في الرئيسية يفتح غير المقروءة (?read=unread)
  const [tab, setTab] = useUrlParam('tab', 'messages', ['messages', 'subscribers']);
  const [readFilter, setReadFilter] = useUrlParam('read', 'all', READ_FILTERS);
  const unread = useInboxUnreadCount();

  if (!USE_API) return <FeatureUnavailable backTo="/admin" />;

  const tabs = [['messages', t('adminInbox.messages')], ['subscribers', t('adminInbox.subscribers')]];
  // الأسهم تنتقل بين التبويبين باتجاه اللغة، و Home / End لأولهما وآخرهما (نمط ARIA للتبويبات).
  const onTabKey = (event) => {
    const ids = tabs.map(([id]) => id);
    const rtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const step = { ArrowLeft: rtl ? 1 : -1, ArrowRight: rtl ? -1 : 1 }[event.key];
    let next = null;
    if (step) next = ids[(ids.indexOf(tab) + step + ids.length) % ids.length];
    else if (event.key === 'Home') next = ids[0];
    else if (event.key === 'End') next = ids[ids.length - 1];
    if (!next) return;
    event.preventDefault();
    setTab(next);
    requestAnimationFrame(() => document.getElementById(`inbox-tab-${next}`)?.focus());
  };
  return (
    <div>
      <TopBar title={t('adminInbox.title')} />
      <div className="p-7 px-8 space-y-6">
        <FadeIn>
          <h2 className="wp-page-title">{t('adminInbox.title')}</h2>
          <p className="text-sm text-[var(--wp-text-3)]">{t('adminInbox.subtitle')}</p>
        </FadeIn>
        <div role="tablist" aria-label={t('adminInbox.title')} className="flex gap-2" onKeyDown={onTabKey}>
          {tabs.map(([id, label]) => (
            <button
              key={id}
              id={`inbox-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={tab === id}
              aria-controls="inbox-panel"
              tabIndex={tab === id ? 0 : -1}
              onClick={() => setTab(id)}
              className={`rounded-xl px-4 py-2 text-sm font-bold ${tab === id ? 'bg-[var(--wp-ink)] text-white' : 'text-[var(--wp-text-2)] hover:bg-[#F6F6F6]'}`}
            >
              {label}
              {id === 'messages' && unread > 0 && (
                <span className="aib-count ms-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--wp-coral)] px-1.5 text-caption font-bold text-white">
                  <span aria-hidden="true">{inboxBadgeText(unread)}</span>
                  <span className="sr-only">{t('azraqAdmin.inbox.unreadSuffix', { count: unread })}</span>
                </span>
              )}
            </button>
          ))}
        </div>
        <div role="tabpanel" id="inbox-panel" aria-labelledby={`inbox-tab-${tab}`} tabIndex={0}>
          {tab === 'messages' ? <ContactMessages filter={readFilter} onFilter={setReadFilter} /> : <NewsletterSubscribers />}
        </div>
      </div>
    </div>
  );
}
