import { useState, useEffect, useCallback } from 'react';
import { Plus, ScrollText, Activity as ActivityIcon, GraduationCap, CheckCircle2 } from 'lucide-react';
import TopBar from '../../components/Layout/TopBar';
import Card from '../../components/common/Card';
import FadeIn from '../../components/common/FadeIn';
import { useLanguage } from '../../i18n/LanguageContext';
import { useLocalizedData } from '../../data/useLocalizedData';
import { USE_API } from '../../config';
import * as adminApi from '../../api/admin';
import { unwrapList } from '../../api/client';
import { listActivities } from '../../api/platform';
import useInfiniteList from '../../hooks/useInfiniteList';
import ErrorState from '../../components/common/ErrorState';
import LoadMore from '../../components/common/LoadMore';
import { auditActionLabel, auditActionDetail, activityVerbSentence, activitySubjectText, relativeTime, textOf } from '../../utils/apiMappers';
import DemoBadge from '../../components/common/DemoBadge';
import Alert from '../../components/ui/Alert';
import { useAdminNotice } from '../../components/Admin/adminNoticeContext';

const statusColors = {
  'نشط': { bg: 'var(--wp-success-tint)', text: 'var(--wp-success)' },
  'مكتمل': { bg: '#F0F0F0', text: 'var(--wp-text-3)' },
  'قادم': { bg: 'var(--wp-info-tint)', text: 'var(--wp-info)' },
};

// ===== وضع المحاكاة (يبقى دون تغيير سلوكي) =====
function MockAdminActivities() {
  const { t } = useLanguage();
  const { adminActivities } = useLocalizedData();

  return (
    <div>
      <TopBar title={t('adminActivities.title')} />
      <div className="p-7 px-8 space-y-6">
        <FadeIn>
          <div className="flex items-center justify-between">
            <h2 className="wp-page-title">{t('adminActivities.title')}</h2>
            <button className="wp-btn-ink px-5 py-2.5 text-sm flex items-center gap-2">
              <Plus size={16} /> {t('adminActivities.createNew')}
            </button>
          </div>
        </FadeIn>

        <div className="space-y-4">
          {adminActivities.map((activity, i) => {
            const sc = statusColors[activity.status] || statusColors['نشط'];
            return (
              <FadeIn key={activity.id} delay={i * 0.05}>
                <Card className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-[var(--wp-text)]">{activity.title}</h3>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: sc.bg, color: sc.text }}>
                        {activity.status}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#F0F0F0] text-xs font-semibold text-[var(--wp-text-3)]">{activity.type}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[var(--wp-text-muted)]">
                      <span>{t('adminActivities.proposals')}: {activity.proposals}</span>
                      <span>من {activity.startDate} إلى {activity.endDate}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="wp-btn-ghost rounded-xl px-4 py-2 text-xs">مراجعة المقترحات</button>
                    <button className="wp-btn-ghost rounded-xl px-4 py-2 text-xs">متابعة المشاريع</button>
                  </div>
                </Card>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===== وضع الـ API (بيانات حيّة) =====
function ApiAdminActivities() {
  const { t, lang } = useLanguage();
  const notify = useAdminNotice();
  const [feed, setFeed] = useState([]);
  // سجل التدقيق والتحققات المعلّقة صفحةً صفحة مع «عرض المزيد» (B3.1).
  const auditList = useInfiniteList(async (page) => unwrapList(await adminApi.listAudit(30, page)), []);
  const completionsList = useInfiniteList(async (page) => unwrapList(await adminApi.listCourseCompletions(0, page)), []);
  const audit = auditList.items;
  const completions = completionsList.items;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedError, setFeedError] = useState(null);
  const [verifyBusy, setVerifyBusy] = useState(null);

  const load = useCallback(async (isActive = () => true) => {
    if (isActive()) { setLoading(true); setFeedError(null); }
    try {
      const f = await listActivities(20);
      if (isActive()) setFeed(unwrapList(f).items);
    } catch (err) {
      if (isActive()) setFeedError(err.message || t('common.loadError'));
    } finally {
      if (isActive()) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let alive = true;
    load(() => alive);
    return () => { alive = false; };
  }, [load]);

  const verify = async (c) => {
    setVerifyBusy(c.id);
    setError('');
    try {
      await adminApi.verifyCourseCompletion(c.courseId, c.userId);
      completionsList.setItems((list) => list.filter((x) => x.id !== c.id));
      notify(t('azraqAdmin.notice.verified', { name: c.userName }));
    } catch (err) {
      setError(err.message || t('common.loadError'));
    } finally {
      setVerifyBusy(null);
    }
  };

  return (
    <div>
      <TopBar title={t('adminActivities.title')} />
      <div className="p-7 px-8 space-y-6">
        <FadeIn>
          <h2 className="wp-page-title">{t('adminActivities.title')}</h2>
        </FadeIn>

        {error && <Alert>{error}</Alert>}

        {/* تحقّقات الكورسات المعلّقة */}
        <FadeIn delay={0.03}>
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <GraduationCap size={18} className="text-[var(--wp-info)]" />
              <h3 className="text-base font-bold text-[var(--wp-ink)]">{t('adminApi.pendingVerifications')}</h3>
            </div>
            {completionsList.loading && <div role="status" data-loading="" className="text-sm text-[var(--wp-text-muted)]">{t('common.loading')}</div>}
            {completionsList.error && <ErrorState error={completionsList.error} onRetry={completionsList.reload} />}
            {!completionsList.loading && !completionsList.error && completions.length === 0 && <div className="text-sm text-[var(--wp-text-muted)]">{t('adminApi.noPending')}</div>}
            <div className="space-y-2">
              {completions.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 rounded-2xl border border-[var(--wp-border)]">
                  <div className="text-sm">
                    <span className="font-medium text-[var(--wp-text)]">{c.userName}</span>
                    {/* الخادم يرسل courseTitle ككائن ترجمات خام هنا — نحوّله لنص. */}
                    <span className="text-[var(--wp-text-muted)]"> · {textOf(c.courseTitle, lang)}</span>
                  </div>
                  <button onClick={() => verify(c)} disabled={verifyBusy === c.id} className="wp-btn-ink flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs disabled:opacity-50">
                    <CheckCircle2 size={12} /> {t('adminApi.verify')}
                  </button>
                </div>
              ))}
            </div>
            <LoadMore hasMore={completionsList.hasMore} loading={completionsList.loadingMore} onLoadMore={completionsList.loadMore} className="mt-3" />
          </Card>
        </FadeIn>

        {/* التحديات لا خادم لها بعد: تظهر في وضع المحاكاة فقط، لا على البيانات الحقيقية (قرار أمجد، 2026-10-21) */}
        <div className="grid grid-cols-2 gap-4">
          {/* سجل التدقيق */}
          <FadeIn delay={0.1}>
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <ScrollText size={18} className="text-[var(--wp-ink)]" />
                <h3 className="text-base font-bold text-[var(--wp-ink)]">{t('adminApi.auditLog')}</h3>
              </div>
              {/* منطقة تمرير: قابلة للتركيز حتى تُمرَّر بلوحة المفاتيح */}
              <div className="space-y-2 max-h-[420px] overflow-y-auto" tabIndex={0} role="region" aria-label={t('adminApi.auditLog')} aria-busy={auditList.loading}>
                {auditList.loading && <div role="status" data-loading="" className="text-sm text-[var(--wp-text-muted)]">{t('common.loading')}</div>}
                {auditList.error && <ErrorState error={auditList.error} onRetry={auditList.reload} />}
                {audit.map((row) => {
                  const detail = auditActionDetail(row, lang);
                  return (
                    <div key={row.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#F6F6F6]">
                      <div className="flex-1 min-w-0 text-sm">
                        <span className="font-medium text-[var(--wp-text)]">{row.admin?.name || t('adminApi.admin')}</span>
                        <span className="text-[var(--wp-text-3)]"> — {auditActionLabel(row.action, lang)}</span>
                        {row.targetId && <span className="text-xs text-[var(--wp-text-muted)]"> #{String(row.targetId).slice(0, 8)}</span>}
                        {detail && (
                          <div className="mt-0.5 text-xs text-[var(--wp-text-3)]">
                            {detail.title && <span>{t('adminApi.auditProject', { title: detail.title })}</span>}
                            {detail.title && detail.via && ' · '}
                            {detail.via && <span>{t('adminApi.auditVia', { action: detail.via })}</span>}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-[var(--wp-text-muted)] shrink-0">{relativeTime(row.createdAt, lang, t)}</span>
                    </div>
                  );
                })}
                <LoadMore hasMore={auditList.hasMore} loading={auditList.loadingMore} onLoadMore={auditList.loadMore} className="py-2" />
              </div>
            </Card>
          </FadeIn>

          {/* خلاصة نشاط المنصة */}
          <FadeIn delay={0.15}>
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <ActivityIcon size={18} className="text-[var(--wp-success)]" />
                <h3 className="text-base font-bold text-[var(--wp-ink)]">{t('adminApi.platformFeed')}</h3>
              </div>
              <div className="space-y-2 max-h-[420px] overflow-y-auto" tabIndex={0} role="region" aria-label={t('adminApi.platformFeed')} aria-busy={loading}>
                {loading && <div role="status" data-loading="" className="text-sm text-[var(--wp-text-muted)]">{t('common.loading')}</div>}
                {feedError && <ErrorState error={feedError} onRetry={() => load()} />}
                {feed.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#F6F6F6]">
                    <div className="flex-1 min-w-0 text-sm">
                      <span className="font-medium text-[var(--wp-text)]">{item.user?.name}</span>
                      <DemoBadge show={item.user?.isDemo || item.subject?.isDemo} className="ms-1.5" />
                      <span className="text-[var(--wp-text-3)]"> {lang === 'en' ? '' : '· '}{activityVerbSentence(item.verb, lang)} </span>
                      <span className="text-[var(--wp-text)]">{activitySubjectText(item.subject, lang)}</span>
                    </div>
                    <span className="text-xs text-[var(--wp-text-muted)] shrink-0">{relativeTime(item.createdAt, lang, t)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </FadeIn>
        </div>
      </div>
    </div>
  );
}

export default function AdminActivities() {
  if (!USE_API) return <MockAdminActivities />;
  return <ApiAdminActivities />;
}
