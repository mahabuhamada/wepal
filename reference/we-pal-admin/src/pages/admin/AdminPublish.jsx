import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Eye, Edit3, Send, Star, CheckCircle2 } from 'lucide-react';
import TopBar from '../../components/Layout/TopBar';
import Card from '../../components/common/Card';
import FadeIn from '../../components/common/FadeIn';
import { useLanguage } from '../../i18n/LanguageContext';
import { useLocalizedData } from '../../data/useLocalizedData';
import { USE_API } from '../../config';
import * as adminApi from '../../api/admin';
import BilingualField, { cleanBilingual } from '../../components/Admin/BilingualField';
import { resourceTypeLabel, trackLabel, RESOURCE_TYPES } from '../../utils/apiMappers';
import ErrorState from '../../components/common/ErrorState';
import { publishStages } from '../../utils/publishStages';
import { isTeamConsentError, mapTeamConsent } from '../../utils/teamConsent';
import { PublishOverview } from '../../components/Admin/ListOverviews';
import ActiveFilter from '../../components/Admin/ActiveFilter';
import useUrlParam from '../../hooks/useUrlParam';

// ?consent= من بطاقات «نظرة عامة»: الطلبات، واكتملت موافقاتها، والناقصة (في تبويب «بانتظار»)
const CONSENT_FILTERS = {
  requested: (c) => Boolean(c?.requested),
  complete: (c) => Boolean(c?.requested && c.complete),
  incomplete: (c) => Boolean(c?.requested && !c.complete),
};

// موافقة الفريق (الحزمة 3ب): الخلاصة وحالة كل عضو، ليعرف المدير ما ينقص قبل النشر.
// المشروع بلا حقل consent (خادم أقدم) لا يعرض شيئًا.
function ConsentStatus({ consent, t }) {
  if (!consent) return null;
  const tone = consent.complete ? 'complete' : consent.requested ? 'partial' : 'missing';
  return (
    <div className="pub-consent mt-2" data-tone={tone}>
      <span className="pub-consent-badge">
        {consent.complete
          ? t('teamConsent.admin.complete')
          : consent.requested
            ? t('teamConsent.progress', { approved: consent.approved, total: consent.total })
            : t('teamConsent.admin.notRequested')}
      </span>
      {consent.requested && consent.members.length > 0 && (
        <ul className="pub-consent-members" aria-label={t('teamConsent.membersLabel')}>
          {consent.members.map((m) => (
            <li key={m.id ?? m.name} data-status={m.status}>
              <span>{m.name}</span>
              <span className="pub-consent-status">{t(`teamConsent.status.${m.status}`)}</span>
              {m.status === 'APPROVED' && m.showName && <span className="pub-consent-named">{t('teamConsent.named')}</span>}
              {m.status === 'DECLINED' && m.note && <span className="pub-consent-note">«{m.note}»</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const statusColors = {
  'جاهز للنشر': { bg: 'var(--wp-success-tint)', text: 'var(--wp-success)' },
  'قيد التحرير': { bg: 'var(--wp-warning-tint)', text: 'var(--wp-warning)' },
  'قيد المراجعة': { bg: 'var(--wp-info-tint)', text: 'var(--wp-info)' },
};

// ===== وضع المحاكاة (يبقى دون تغيير سلوكي) =====
function MockAdminPublish() {
  const { t } = useLanguage();
  const { adminPublishQueue } = useLocalizedData();

  return (
    <div>
      <TopBar title={t('adminPublish.title')} />
      <div className="p-7 px-8 space-y-6">
        <FadeIn>
          <h2 className="wp-page-title">{t('adminPublish.title')}</h2>
          <p className="text-sm text-[var(--wp-text-3)]">{t('adminPublish.readyToPublish')}</p>
        </FadeIn>

        <div className="space-y-4">
          {adminPublishQueue.map((item, i) => {
            const sc = statusColors[item.status] || statusColors['قيد المراجعة'];
            return (
              <FadeIn key={item.id} delay={i * 0.05}>
                <Card className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-[var(--wp-text)]">{item.title}</h3>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: sc.bg, color: sc.text }}>
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[var(--wp-text-muted)]">
                      <span>{item.type}</span>
                      <span>{t('adminPublish.team')}: {item.team}</span>
                      {item.rating && (
                        <span className="flex items-center gap-1">
                          <Star size={11} className="text-[var(--wepal-warning)] fill-[var(--wepal-warning)]" />
                          {item.rating}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="wp-btn-ghost flex items-center gap-1 px-3 py-2 rounded-xl text-xs">
                      <Eye size={14} /> {t('common.view')}
                    </button>
                    <button className="wp-btn-ghost flex items-center gap-1 px-3 py-2 rounded-xl text-xs">
                      <Edit3 size={14} /> {t('common.edit')}
                    </button>
                    {item.status === 'جاهز للنشر' && (
                      <button className="wp-btn-ink flex items-center gap-1 px-3 py-2 rounded-xl text-xs">
                        <Send size={14} /> {t('adminPublish.publish')}
                      </button>
                    )}
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

/** المراحل ظاهرة في الصف: «الفريق طلب النشر ← موافقات الفريق (3 من 5) ← مراجعة الإدارة ← منشور». */
function PublishStages({ consent, lang, published = false }) {
  return (
    <ol className="pub-stages" aria-label={lang === 'en' ? 'Publishing stages' : 'مراحل النشر'}>
      {publishStages(consent, { lang, published }).map((s) => (
        <li key={s.key} className={`pub-stage is-${s.state}`} aria-current={s.state === 'current' ? 'step' : undefined}>
          {s.label}{s.detail ? ` (${s.detail})` : ''}
        </li>
      ))}
    </ol>
  );
}

/** «نشر رغم نقص الموافقة»: سبب مكتوب (10 أحرف على الأقل) يُحفظ في سجل التدقيق ويظهر في خطّ المساحة الزمني. */
function OverrideDialog({ lang, t, busy, onConfirm, onClose }) {
  const ref = useRef(null);
  const [reason, setReason] = useState('');
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal?.();
    return () => dialog?.close?.();
  }, []);
  return (
    <dialog ref={ref} className="pub-override-dialog" aria-labelledby="pub-override-title" onCancel={(e) => { e.preventDefault(); onClose(); }}>
      <form onSubmit={(e) => { e.preventDefault(); onConfirm(reason.trim()); }}>
        <h2 id="pub-override-title" className="text-base font-semibold mb-2">{lang === 'en' ? 'Publish without full team approval?' : 'نشر رغم نقص موافقة الفريق؟'}</h2>
        <label htmlFor="publish-override-reason" className="block text-xs font-semibold text-[var(--wp-text-2)] mb-1">{t('teamConsent.admin.overrideLabel')}</label>
        <p id="publish-override-hint" className="text-xs text-[var(--wp-text-muted)] mb-1.5">{t('teamConsent.admin.overrideHint')}</p>
        <textarea id="publish-override-reason" rows={3} minLength={10} maxLength={500} required aria-describedby="publish-override-hint" value={reason} onChange={(e) => setReason(e.target.value)} className="wp-input w-full px-3 py-2 text-sm" />
        <div className="flex gap-3 mt-3 justify-end">
          <button type="button" onClick={onClose} className="wp-btn-ghost px-4 py-2 rounded-xl text-sm">{t('common.cancel')}</button>
          <button type="submit" disabled={busy || reason.trim().length < 10} className="wp-btn-ink px-4 py-2 text-sm disabled:opacity-50">{lang === 'en' ? 'Publish anyway' : 'نشر رغم نقص الموافقة'}</button>
        </div>
      </form>
    </dialog>
  );
}

// ما نُشر من المساحة (ملاحظة هلا ج-10): روابط المخرجات في تبويب «منشور». خادم أقدم بلا الحقل = لا شيء.
const publishedOf = (project) => mapTeamConsent(project?.consent)?.published ?? [];

/** نُشر من المساحة ملف واحد على الأقل في المكتبة، أو مخرج برابط خارجي (published في الموافقة). */
const isPublished = (project) => (project?.files ?? []).some((f) => f.publishedResourceId) || publishedOf(project).length > 0;

// الموافقة ناقصة ← النشر يحتاج سبب تجاوز مكتوبًا. مشروع بلا consent (خادم أقدم) لا يُطلب له.
const needsOverride = (project) => Boolean(project?.consent) && !project.consent.complete;

// ===== وضع الـ API (بيانات حيّة) =====
function ApiAdminPublish() {
  const { t, lang } = useLanguage();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openId, setOpenId] = useState(null); // مشروع مفتوح للنشر
  const [overrideOpen, setOverrideOpen] = useState(false);
  // «بانتظار» و«منشور» (القسم 4.5): منشور = نُشر ملف واحد على الأقل من المساحة في المكتبة
  // التبويب ومرشّح الموافقات في العنوان، فبطاقات «نظرة عامة» تفتح ما تعدّه (docs/ADMIN-UX.md §2)
  const [tabParam, setTab] = useUrlParam('tab', 'pending', ['pending', 'published']);
  const [consent, setConsent] = useUrlParam('consent', null, Object.keys(CONSENT_FILTERS));
  const tab = consent ? 'pending' : tabParam;
  const shown = (p) => isPublished(p) === (tab === 'published') && (!consent || CONSENT_FILTERS[consent](p.consent));
  const [form, setForm] = useState({ fileId: '', type: 'REPORT', title: { ar: '', en: '' }, description: { ar: '', en: '' }, authorLabel: '', externalUrl: '', });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState(null); // {id,...} المورد المنشور

  const load = useCallback(async (isActive = () => true) => {
    if (isActive()) { setLoading(true); setError(''); }
    try {
      const res = await adminApi.listPublishable();
      if (isActive()) setProjects(res?.data || []);
    } catch (err) {
      if (isActive()) setError(err.message || t('common.loadError'));
    } finally {
      if (isActive()) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    let alive = true;
    load(() => alive);
    return () => { alive = false; };
  }, [load]);

  const openPublish = (project) => {
    setOpenId(project.id);
    setForm({ fileId: project.files?.[0]?.id || '', type: 'REPORT', title: { ar: '', en: '' }, description: { ar: '', en: '' }, authorLabel: '', externalUrl: '', });
    setFormError('');
    setSuccess(null);
  };

  const submit = async (e, project, overrideReason = '') => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      const payload = {
        projectId: project.id,
        type: form.type,
        ...(form.fileId ? { fileId: form.fileId } : {}),
        ...(form.title?.ar?.trim() ? { title: cleanBilingual(form.title) } : {}),
        ...(form.description?.ar?.trim() ? { description: cleanBilingual(form.description) } : {}),
        ...(form.authorLabel ? { authorLabel: form.authorLabel } : {}),
        ...(form.externalUrl ? { externalUrl: form.externalUrl } : {}),
        // تجاوز موافقة الفريق: لا يُرسل إلا حين تنقص الموافقة (يُسجَّل في سجل التدقيق)
        ...(needsOverride(project) && overrideReason ? { overrideReason } : {}),
      };
      const res = await adminApi.publish(payload);
      setSuccess(res);
      setOpenId(null);
      await load();
    } catch (err) {
      setFormError(err.message || t('common.loadError'));
      // الموافقة تغيّرت منذ التحميل: نحدّث الحالة ليظهر حقل السبب
      if (isTeamConsentError(err)) await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <TopBar title={t('adminPublish.title')} />
      <div className="p-7 px-8 space-y-6">
        <FadeIn>
          <h2 className="wp-page-title">{t('adminPublish.title')}</h2>
          <p className="text-sm text-[var(--wp-text-3)]">{t('adminPublish.readyToPublish')}</p>
        </FadeIn>

        <PublishOverview />

        {error && <ErrorState error={error} onRetry={() => load()} />}

        {success && (
          <FadeIn>
            <div role="status" className="rounded-2xl bg-[var(--wp-success-tint)] border border-[#CBE7D2] p-4 text-sm text-[var(--wp-success)] flex items-center gap-2">
              <CheckCircle2 size={18} />
              <span>{t('adminApi.publishSuccess')}.</span>
              <Link to={`/library/${success.id}`} className="underline font-semibold">{t('adminApi.viewResource')}</Link>
            </div>
          </FadeIn>
        )}

        {loading && (
          <div className="space-y-3" role="status" aria-busy="true">
            <span className="sr-only">{t('common.loading')}</span>
            {[0, 1].map((i) => <div key={i} className="h-24 rounded-2xl bg-[#F0F0F0] animate-pulse" />)}
          </div>
        )}

        {!loading && projects.length > 0 && (
          <div className="flex flex-wrap gap-2" role="tablist" aria-label={lang === 'en' ? 'Outputs' : 'المخرجات'}>
            {[['pending', lang === 'en' ? 'Waiting' : 'بانتظار'], ['published', lang === 'en' ? 'Published' : 'منشور']].map(([key, label]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => { setConsent(null); setTab(key); }}
                className={`px-4 py-2 rounded-xl text-sm ${tab === key ? 'wp-btn-ink' : 'wp-btn-ghost'}`}>
                {label} ({projects.filter((p) => isPublished(p) === (key === 'published')).length})
              </button>
            ))}
            {consent && <ActiveFilter label={t(`adminLists.activeFilter.consent${consent[0].toUpperCase()}${consent.slice(1)}`)} onClear={() => setConsent(null)} />}
          </div>
        )}

        {!loading && projects.length === 0 && (
          <div className="rounded-2xl bg-[#F6F6F6] border border-[var(--wp-border)] p-6 text-sm text-[var(--wp-text-muted)] text-center">{t('adminApi.noPublishable')}</div>
        )}

        <div className="space-y-4">
          {!loading && projects.filter(shown).map((project, i) => (
            <FadeIn key={project.id} delay={i * 0.05}>
              <Card>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-[var(--wp-text)]">{project.title}</h3>
                      {project.track && <span className="px-2.5 py-0.5 rounded-full bg-[#F0F0F0] text-[var(--wp-text-2)] text-xs font-semibold">{trackLabel(project.track, lang)}</span>}
                    </div>
                    <div className="text-xs text-[var(--wp-text-muted)]">{t('adminPublish.filesCount', { n: project.files?.length ?? 0 })}</div>
                    <ConsentStatus consent={mapTeamConsent(project.consent)} t={t} />
                    <PublishStages consent={project.consent} lang={lang} published={isPublished(project)} />
                    {publishedOf(project).length > 0 && (
                      <ul className="mt-2 space-y-1 text-xs">
                        {publishedOf(project).map((r) => (
                          <li key={r.id} className="flex items-center gap-1.5 text-[var(--wp-success)]">
                            <CheckCircle2 size={13} aria-hidden="true" />
                            <Link to={`/library/${r.id}`} className="underline font-semibold">{r.title || t('adminApi.viewResource')}</Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <button onClick={() => openPublish(project)} className={`${isPublished(project) ? 'wp-btn-ghost' : 'wp-btn-ink'} flex items-center gap-1 px-4 py-2 rounded-xl text-xs shrink-0`}>
                    <Send size={14} /> {isPublished(project) ? t('adminPublish.publishAnother') : t('adminPublish.publish')}
                  </button>
                </div>

                {openId === project.id && (
                  <form onSubmit={(e) => submit(e, project)} className="mt-4 pt-4 border-t border-[var(--wp-border)] grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="publish-pick-file" className="block text-xs text-[var(--wp-text-muted)] mb-1">{t('adminApi.pickFile')}</label>
                      <select id="publish-pick-file" value={form.fileId} onChange={(e) => setForm({ ...form, fileId: e.target.value })} className="wp-input w-full px-3 py-2 text-sm">
                        <option value="">—</option>
                        {(project.files || []).map((f) => <option key={f.id} value={f.id}>{f.name || f.title || f.id}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="publish-type" className="block text-xs text-[var(--wp-text-muted)] mb-1">{t('adminApi.type')}</label>
                      <select id="publish-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="wp-input w-full px-3 py-2 text-sm">
                        {RESOURCE_TYPES.map((rt) => <option key={rt} value={rt}>{resourceTypeLabel(rt, lang)}</option>)}
                      </select>
                    </div>
                    <div>
                      <BilingualField
                        label={t('adminApi.surveyTitle')}
                        value={form.title}
                        onChange={(title) => setForm({ ...form, title })}
                        required={false}
                        placeholderAr={project.title}
                      />
                    </div>
                    <div>
                      <label htmlFor="publish-author-label" className="block text-xs text-[var(--wp-text-muted)] mb-1">{t('adminApi.authorLabel')}</label>
                      <input id="publish-author-label" value={form.authorLabel} onChange={(e) => setForm({ ...form, authorLabel: e.target.value })} className="wp-input w-full px-3 py-2 text-sm" />
                    </div>
                    <div className="col-span-2">
                      <label htmlFor="publish-external-url" className="block text-xs text-[var(--wp-text-muted)] mb-1">{t('adminApi.externalUrl')}</label>
                      <input id="publish-external-url" value={form.externalUrl} onChange={(e) => setForm({ ...form, externalUrl: e.target.value })} placeholder="https://…" className="wp-input w-full px-3 py-2 text-sm" />
                    </div>
                    {needsOverride(project) && overrideOpen && (
                      <OverrideDialog lang={lang} t={t} busy={busy} onClose={() => setOverrideOpen(false)}
                        onConfirm={(reason) => { setOverrideOpen(false); submit({ preventDefault() {} }, project, reason); }} />
                    )}
                    <div className="col-span-2 flex items-center gap-3">
                      {needsOverride(project) ? (
                        <>
                          <button type="submit" disabled className="wp-btn-ink px-5 py-2.5 text-sm disabled:opacity-50" title={lang === 'en' ? 'Waiting for team approvals' : 'بانتظار موافقات الفريق'}>{lang === 'en' ? 'Publish on behalf of the team' : 'نشر باسم الفريق'}</button>
                          <button type="button" disabled={busy} onClick={() => setOverrideOpen(true)} className="wp-btn-ghost px-5 py-2.5 rounded-xl text-sm">{lang === 'en' ? 'Publish without full approval…' : 'نشر رغم نقص الموافقة…'}</button>
                        </>
                      ) : (
                        <button type="submit" disabled={busy} className="wp-btn-ink px-5 py-2.5 text-sm disabled:opacity-50">{busy ? t('common.saving') : (lang === 'en' ? 'Publish on behalf of the team' : 'نشر باسم الفريق')}</button>
                      )}
                      <button type="button" onClick={() => setOpenId(null)} className="wp-btn-ghost px-5 py-2.5 rounded-xl text-sm">{t('common.cancel')}</button>
                      {formError && <span role="alert" className="text-xs text-[var(--wp-coral-deep)]">{formError}</span>}
                    </div>
                  </form>
                )}
              </Card>
            </FadeIn>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminPublish() {
  if (!USE_API) return <MockAdminPublish />;
  return <ApiAdminPublish />;
}
