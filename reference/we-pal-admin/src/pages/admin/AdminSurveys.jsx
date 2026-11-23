import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Download, BarChart3, X, Trash2, Send, Lock, Eye } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import TopBar from '../../components/Layout/TopBar';
import Card from '../../components/common/Card';
import { ClickableRow, RowButton, RowLink } from '../../components/common/ClickableRow';
import FadeIn from '../../components/common/FadeIn';
import ProgressBar from '../../components/common/ProgressBar';
import { useLanguage } from '../../i18n/LanguageContext';
import { useLocalizedData } from '../../data/useLocalizedData';
import { USE_API } from '../../config';
import * as adminApi from '../../api/admin';
import { unwrapList } from '../../api/client';
import BilingualField, { cleanBilingual } from '../../components/Admin/BilingualField';
import { surveyStatusLabel, surveyTypeLabel, qtypeLabel, isChoiceQtype, QTYPES, SURVEY_TYPES } from '../../utils/apiMappers';
import DemoBadge from '../../components/common/DemoBadge';
import Alert from '../../components/ui/Alert';
import ErrorState from '../../components/common/ErrorState';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import { useAdminNotice } from '../../components/Admin/adminNoticeContext';
import SurveyResultsDialog from '../../components/Admin/SurveyResultsDialog';
import PublicSurveyReviewDialog from '../../components/Admin/PublicSurveyReviewDialog';
import { SurveysOverview } from '../../components/Admin/ListOverviews';
import Tabs from '../../components/ui/Tabs';
import { memberHref } from '../../utils/adminLinks';
import { SURVEY_PLACEMENTS, SURVEY_TABS, adminDate, readSurveyFilters, surveyPlaces } from '../../utils/adminSurveys';

// ===== وضع المحاكاة (يبقى دون تغيير سلوكي) =====
function MockAdminSurveys() {
  const { t } = useLanguage();
  const { surveys, surveyQuestions } = useLocalizedData();

  return (
    <div>
      <TopBar title={t('adminSurveys.title')} />
      <div className="p-7 px-8 space-y-6">
        <FadeIn>
          <div className="flex items-center justify-between">
            <h2 className="wp-page-title">{t('adminSurveys.title')}</h2>
            <div className="flex gap-2">
              <button className="wp-btn-ghost rounded-xl px-4 py-2 text-sm flex items-center gap-1.5">
                <Download size={14} /> {t('common.exportCsv')}
              </button>
              <button className="wp-btn-ink px-5 py-2.5 text-sm flex items-center gap-2">
                <Plus size={16} /> {t('adminSurveys.createSurvey')}
              </button>
            </div>
          </div>
        </FadeIn>

        <div className="space-y-4">
          {surveys.map((survey, i) => {
            const pct = Math.round((survey.participated / survey.total) * 100);
            return (
              <FadeIn key={survey.id} delay={i * 0.05}>
                <Card>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[var(--wp-text)]">{survey.title}</h3>
                      <div className="flex items-center gap-3 text-xs text-[var(--wp-text-muted)] mt-1">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#F0F0F0] text-[var(--wp-text-2)] font-semibold">{survey.type}</span>
                        <span>{survey.participated}/{survey.total} {t('common.participated')} ({pct}%)</span>
                        <span>{t('common.endDate')}: {survey.deadline}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button className="wp-btn-ghost rounded-xl px-3 py-1.5 text-xs flex items-center gap-1">
                        <BarChart3 size={12} /> {t('common.viewReport')}
                      </button>
                      <button className="wp-btn-ghost rounded-xl px-3 py-1.5 text-xs flex items-center gap-1">
                        <Download size={12} /> Excel
                      </button>
                    </div>
                  </div>
                  <ProgressBar value={pct} />
                </Card>
              </FadeIn>
            );
          })}
        </div>

        <FadeIn delay={0.2}>
          <Card>
            <h3 className="text-base font-bold text-[var(--wp-ink)] mb-4">نتائج بيانية — {surveys[0].title}</h3>
            <div className="space-y-6">
              {surveyQuestions.slice(0, 2).map((q, i) => {
                const chartData = q.options.map((opt, j) => ({ name: opt, value: q.results[j] }));
                return (
                  <div key={q.id}>
                    <div className="text-sm font-medium text-[var(--wp-text)] mb-3">س{i + 1}: {q.text}</div>
                    <ResponsiveContainer width="100%" height={140}>
                      <BarChart data={chartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v) => `${v}%`} />
                        <Bar dataKey="value" fill="var(--wp-ink)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                );
              })}
            </div>
          </Card>
        </FadeIn>
      </div>
    </div>
  );
}

// ===== وضع الـ API (بيانات حيّة) =====
const STATUS_COLORS = {
  DRAFT: { bg: '#F0F0F0', text: 'var(--wp-text-3)' },
  ACTIVE: { bg: 'var(--wp-success-tint)', text: 'var(--wp-success)' },
  CLOSED: { bg: 'var(--wp-warning-tint)', text: 'var(--wp-warning)' },
};

// نصّ السؤال ثنائي اللغة مثل عنوان الاستبيان ووصفه.
const emptyQuestion = () => ({ text: { ar: '', en: '' }, qtype: 'SINGLE_CHOICE', options: '' });

function ApiAdminSurveys() {
  const { t, lang } = useLanguage();
  const notify = useAdminNotice();
  const [surveys, setSurveys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  // إغلاق استطلاع قائم أو حذف مسودة ينتظر التأكيد: { survey, kind: 'close' | 'delete' }
  const [pending, setPending] = useState(null);
  // نتائج استطلاع منشور أو مغلق للقراءة فقط (نافذة).
  const [viewing, setViewing] = useState(null);
  // استطلاع للزوار مفتوح للمراجعة: معاينة ما يراه الزائر ثم «انشر للعامة».
  const [reviewing, setReviewing] = useState(null);
  // المرشّحان في الرابط (?status=&placement=) لتفتح بطاقات «نظرة عامة» القائمة مرشَّحة.
  const [params, setParams] = useSearchParams();
  const { status, placement } = readSurveyFilters(params);
  // يزيد بعد كل تغيير في الاستطلاعات، فتُعاد أرقام «نظرة عامة».
  const [version, setVersion] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: { ar: '', en: '' }, description: { ar: '', en: '' }, type: 'QUARTERLY', endsAt: '', audience: 'members', showResults: true });
  const [questions, setQuestions] = useState([emptyQuestion()]);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const load = useCallback(async (isActive = () => true) => {
    if (isActive()) { setLoading(true); setLoadError(null); }
    try {
      const res = await adminApi.listAdminSurveys({ status, placement });
      if (isActive()) setSurveys(unwrapList(res).items);
    } catch (err) {
      if (isActive()) setLoadError(err.message || t('common.loadError'));
    } finally {
      if (isActive()) setLoading(false);
    }
  }, [t, status, placement]);

  // بعد إنشاء أو نشر أو إغلاق أو حذف: القائمة والأرقام معًا.
  const refresh = async () => {
    setVersion((v) => v + 1);
    await load();
  };

  const setFilter = (key, value) => {
    const next = { status, placement, [key]: value };
    setParams(Object.fromEntries(Object.entries(next).filter(([, v]) => v && v !== 'all')), { replace: true });
  };

  useEffect(() => {
    let alive = true;
    load(() => alive);
    return () => { alive = false; };
  }, [load]);

  const setQ = (idx, patch) => setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  // الاستطلاع العام للزوار: أسئلة بأي عدد ونوع (قرار أمجد 16 نوفمبر 2026، أُلغي قيد B7.3).
  const isPublic = form.audience === 'public';
  const setAudience = (audience) => setForm((f) => ({ ...f, audience }));
  const addQ = () => setQuestions((qs) => [...qs, emptyQuestion()]);
  const removeQ = (idx) => setQuestions((qs) => qs.filter((_, i) => i !== idx));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');
    try {
      const payload = {
        title: cleanBilingual(form.title),
        ...(form.description?.ar?.trim() ? { description: cleanBilingual(form.description) } : {}),
        type: form.type,
        ...(form.endsAt ? { endsAt: new Date(form.endsAt).toISOString() } : {}),
        ...(isPublic ? { audience: 'public', showResults: form.showResults } : {}),
        questions: questions.map((q, i) => ({
          text: cleanBilingual(q.text),
          qtype: q.qtype,
          position: i,
          ...(isChoiceQtype(q.qtype)
            ? { options: q.options.split(',').map((o) => o.trim()).filter(Boolean) }
            : {}),
        })),
      };
      await adminApi.createSurvey(payload);
      setShowForm(false);
      // الاستطلاع العام لا يُنشر من هنا: يُحفظ مسودة وينتظر المراجعة
      notify(t(isPublic ? 'adminSurveys.publicCreated' : 'azraqAdmin.notice.surveyCreated'));
      setForm({ title: { ar: '', en: '' }, description: { ar: '', en: '' }, type: 'QUARTERLY', endsAt: '', audience: 'members', showResults: true });
      setQuestions([emptyQuestion()]);
      await refresh();
    } catch (err) {
      setFormError(err.message || t('common.loadError'));
    } finally {
      setBusy(false);
    }
  };

  const act = async (survey, fn, noticeKey) => {
    setBusyId(survey.id);
    setError('');
    try {
      await fn(survey.id);
      notify(t(noticeKey, { title: survey.title }));
      await refresh();
    } catch (err) {
      setError(err.message || t('common.loadError'));
    } finally {
      setBusyId(null);
    }
  };

  // بعد التأكيد: خطأ الخادم يبقى داخل النافذة.
  const confirmPending = async () => {
    const { survey, kind } = pending;
    setBusyId(survey.id);
    try {
      await (kind === 'close' ? adminApi.closeSurvey : adminApi.deleteSurvey)(survey.id);
      notify(t(kind === 'close' ? 'azraqAdmin.notice.surveyClosed' : 'azraqAdmin.notice.surveyDeleted', { title: survey.title }));
      await refresh();
    } finally {
      setBusyId(null);
    }
  };

  // «انشر للعامة» من نافذة المراجعة: الخطأ يبقى في النافذة، والنجاح يغلقها.
  const publishPublic = async (survey) => {
    await adminApi.publishSurvey(survey.id);
    setReviewing(null);
    notify(t('adminSurveys.review.published', { title: survey.title }));
    await refresh();
  };

  return (
    <div>
      <TopBar title={t('adminSurveys.title')} />
      <div className="p-7 px-8 space-y-6">
        <FadeIn>
          <div className="flex items-center justify-between">
            <h2 className="wp-page-title">{t('adminSurveys.title')}</h2>
            <button onClick={() => setShowForm((v) => !v)} className="wp-btn-ink px-5 py-2.5 text-sm flex items-center gap-2">
              <Plus size={16} /> {t('adminApi.createSurvey')}
            </button>
          </div>
        </FadeIn>

        <SurveysOverview status={status} placement={placement} version={version} />

        <div className="flex items-end justify-between gap-3 flex-wrap">
          <Tabs
            tabs={SURVEY_TABS.map((id) => ({ id, label: t(`adminSurveys.tab.${id}`) }))}
            value={status}
            onChange={(id) => setFilter('status', id)}
            label={t('adminSurveys.tabsLabel')}
            idPrefix="adm-surveys"
          />
          <div>
            <label htmlFor="survey-placement-filter" className="block text-xs text-[var(--wp-text-muted)] mb-1">{t('adminSurveys.placementLabel')}</label>
            <select id="survey-placement-filter" value={placement} onChange={(e) => setFilter('placement', e.target.value)} className="wp-input px-3 py-2 text-sm">
              {['all', ...SURVEY_PLACEMENTS].map((p) => <option key={p} value={p}>{t(`adminSurveys.placement.${p}`)}</option>)}
            </select>
          </div>
        </div>

        {error && <Alert>{error}</Alert>}
        {loadError && <ErrorState error={loadError} onRetry={() => load()} />}

        {showForm && (
          <FadeIn>
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-[var(--wp-ink)]">{t('adminApi.createSurvey')}</h3>
                <button aria-label={t('common.close')} onClick={() => setShowForm(false)} className="wp-icon-act" title={t('common.close')}><X aria-hidden="true" /></button>
              </div>
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <BilingualField label={t('adminApi.surveyTitle')} value={form.title} onChange={(title) => setForm({ ...form, title })} />
                  </div>
                  <div className="col-span-2">
                    <BilingualField label={t('adminApi.surveyDesc')} value={form.description} onChange={(description) => setForm({ ...form, description })} required={false} />
                  </div>
                  <div>
                    <label htmlFor="survey-survey-type" className="block text-xs text-[var(--wp-text-muted)] mb-1">{t('adminApi.surveyType')}</label>
                    <select id="survey-survey-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="wp-input w-full px-3 py-2 text-sm">
                      {SURVEY_TYPES.map((st) => <option key={st} value={st}>{surveyTypeLabel(st, lang)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="survey-ends-at" className="block text-xs text-[var(--wp-text-muted)] mb-1">{t('adminApi.endsAt')}</label>
                    <input id="survey-ends-at" type="date" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} className="wp-input w-full px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label htmlFor="survey-audience" className="block text-xs text-[var(--wp-text-muted)] mb-1">{t('adminSurveys.audience')}</label>
                    <select id="survey-audience" value={form.audience} onChange={(e) => setAudience(e.target.value)} className="wp-input w-full px-3 py-2 text-sm">
                      <option value="members">{t('adminSurveys.audienceMembers')}</option>
                      <option value="public">{t('adminSurveys.audiencePublic')}</option>
                    </select>
                  </div>
                  {isPublic && (
                    <label className="flex items-center gap-2 self-end pb-2 text-xs text-[var(--wp-text-2)]">
                      <input type="checkbox" checked={form.showResults} onChange={(e) => setForm({ ...form, showResults: e.target.checked })} />
                      {t('adminSurveys.showResults')}
                    </label>
                  )}
                  {isPublic && <p className="col-span-2 text-xs text-[var(--wp-text-muted)]">{t('adminSurveys.publicRule')}</p>}
                </div>

                {/* أسئلة ديناميكية */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-[var(--wp-text-2)]">{t('adminApi.questions')}</span>
                    <button type="button" onClick={addQ} className="flex items-center gap-1 text-xs text-[var(--wp-text-3)] hover:text-[var(--wp-coral)]"><Plus size={12} /> {t('adminApi.addQuestion')}</button>
                  </div>
                  <div className="space-y-3">
                    {questions.map((q, idx) => (
                      <div key={idx} className="rounded-2xl border border-[var(--wp-border)] p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <BilingualField label={t('adminApi.questionText')} value={q.text} onChange={(text) => setQ(idx, { text })} />
                          </div>
                          <select value={q.qtype} onChange={(e) => setQ(idx, { qtype: e.target.value })} aria-label={t('adminSurveys.questionType')} className="wp-input px-2 py-2 text-sm">
                            {QTYPES.map((qt) => <option key={qt} value={qt}>{qtypeLabel(qt, lang)}</option>)}
                          </select>
                          {questions.length > 1 && (
                            <button aria-label={t('a11y.removeQuestion', { n: idx + 1 })} type="button" onClick={() => removeQ(idx)} className="wp-icon-act" title={t('a11y.removeQuestion', { n: idx + 1 })}><Trash2 aria-hidden="true" /></button>
                          )}
                        </div>
                        {isChoiceQtype(q.qtype) && (
                          <input value={q.options} onChange={(e) => setQ(idx, { options: e.target.value })} placeholder={t('adminApi.options')} aria-label={t('adminApi.options')} className="wp-input w-full px-3 py-2 text-sm" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button type="submit" disabled={busy} className="wp-btn-ink px-5 py-2.5 text-sm disabled:opacity-50">{busy ? t('common.saving') : t('common.save')}</button>
                  <button type="button" onClick={() => setShowForm(false)} className="wp-btn-ghost px-5 py-2.5 rounded-xl text-sm">{t('common.cancel')}</button>
                  {formError && <span role="alert" className="text-xs text-[var(--wp-coral-deep)]">{formError}</span>}
                </div>
              </form>
            </Card>
          </FadeIn>
        )}

        {loading && (
          <div className="space-y-3" role="status" aria-busy="true">
            <span className="sr-only">{t('common.loading')}</span>
            {[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-2xl bg-[#F0F0F0] animate-pulse" />)}
          </div>
        )}

        {!loading && !loadError && surveys.length === 0 && (
          status === 'all' && placement === 'all'
            ? <EmptyState icon={BarChart3} title={t('azraqAdmin.noSurveys')} text={t('azraqAdmin.noSurveysHint')} />
            : <EmptyState icon={BarChart3} title={t(status === 'REVIEW' ? 'adminSurveys.reviewEmpty' : 'adminSurveys.emptyFiltered')} />
        )}

        <div className="space-y-4" role="tabpanel" id={`adm-surveys-panel-${status}`} aria-labelledby={`adm-surveys-tab-${status}`}>
          {!loading && surveys.map((survey, i) => {
            const sc = STATUS_COLORS[survey.status] || STATUS_COLORS.DRAFT;
            // البطاقة كلها تفتح الاستطلاع (docs/ADMIN-UX.md): المراجعة، أو النتائج، أو محرّر المسودة؛ عناصر البذرة المسوّدة بلا فتح
            const titleNode = (() => {
              if (!survey.isDemo && survey.awaitingReview) return <RowButton onClick={() => setReviewing(survey)}>{survey.title}</RowButton>;
              if (survey.status !== 'DRAFT') return <RowButton onClick={() => setViewing(survey)}>{survey.title}</RowButton>;
              if (!survey.isDemo) return <RowLink to={`/admin/editor/survey/${survey.id}`}>{survey.title}</RowLink>;
              return survey.title;
            })();
            const clickable = typeof titleNode !== 'string';
            const Row = clickable ? ClickableRow : Card;
            return (
              <FadeIn key={survey.id} delay={i * 0.05}>
                <Row {...(clickable ? { as: 'div', className: 'ui-card' } : {})}>
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-[var(--wp-text)]">{titleNode} <DemoBadge show={survey.isDemo} className="ms-1.5" /></h3>
                      <div className="flex items-center gap-3 text-xs text-[var(--wp-text-muted)] mt-1 flex-wrap">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: sc.bg, color: sc.text }}>{surveyStatusLabel(survey.status, lang)}</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-[#F0F0F0] text-[var(--wp-text-2)] font-semibold">{surveyTypeLabel(survey.type, lang)}</span>
                        {survey.audience === 'public' && (
                          <span className="px-2.5 py-0.5 rounded-full bg-[var(--wp-info-tint)] text-[var(--wp-info)] font-semibold">{t('adminSurveys.audiencePublicBadge')}</span>
                        )}
                        {survey.awaitingReview && (
                          <span className="px-2.5 py-0.5 rounded-full bg-[var(--wp-warning-tint)] text-[var(--wp-warning)] font-semibold">{t('adminSurveys.awaitingReview')}</span>
                        )}
                        <span>{survey.questionsCount} {t('adminApi.questions')}</span>
                        <span>{survey.responsesCount} {t('adminSurveys.responses')}</span>
                      </div>
                      <SurveyFacts survey={survey} />
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {/* النتائج للقراءة فقط: لكل استطلاع نُشر (قائم أو مغلق)، ومنها عناصر العرض */}
                      {survey.status !== 'DRAFT' && (
                        <button
                          type="button"
                          onClick={() => setViewing(survey)}
                          aria-label={`${t('azraqAdmin.surveyResults.open')}: ${survey.title}`}
                          className="wp-btn-ghost flex items-center gap-1 px-3 py-2 rounded-xl text-xs"
                        >
                          <BarChart3 size={12} aria-hidden="true" /> {t('azraqAdmin.surveyResults.open')}
                        </button>
                      )}
                      {/* وصف الاستطلاع بمحرّر الكتل (قرار أمجد، المرحلة 3): الوصف فقط، والفتح والإغلاق هنا */}
                      {!survey.isDemo && (
                        <Link to={`/admin/editor/survey/${survey.id}`} className="wp-btn-ghost flex items-center gap-1 px-3 py-2 rounded-xl text-xs">{lang === 'en' ? 'Edit description' : 'تحرير الوصف'}</Link>
                      )}
                      {/* عناصر بذرة العرض لا تُعدَّل ولا تُحذف من اللوحة (403 DemoContent)؛ تُزال بـ demo:purge فقط. */}
                      {/* استطلاع الزوار لا يُنشر بنقرة: يُراجَع بمعاينة ما يراه الزائر ثم «انشر للعامة» */}
                      {!survey.isDemo && survey.awaitingReview && (
                        <button type="button" onClick={() => setReviewing(survey)} className="wp-btn-ink flex items-center gap-1 px-3 py-2 rounded-xl text-xs"><Eye size={12} aria-hidden="true" /> {t('adminSurveys.review.open')}</button>
                      )}
                      {!survey.isDemo && survey.status === 'DRAFT' && !survey.awaitingReview && (
                        <button onClick={() => act(survey, adminApi.publishSurvey, 'azraqAdmin.notice.surveyPublished')} disabled={busyId === survey.id} className="wp-btn-ink flex items-center gap-1 px-3 py-2 rounded-xl text-xs disabled:opacity-50"><Send size={12} /> {t('adminApi.publishSurvey')}</button>
                      )}
                      {!survey.isDemo && survey.status === 'ACTIVE' && (
                        <button onClick={() => setPending({ survey, kind: 'close' })} disabled={busyId === survey.id} className="wp-btn-ghost flex items-center gap-1 px-3 py-2 rounded-xl text-xs disabled:opacity-50"><Lock size={12} /> {t('adminApi.closeSurvey')}</button>
                      )}
                      {!survey.isDemo && survey.status === 'DRAFT' && (
                        <button onClick={() => setPending({ survey, kind: 'delete' })} disabled={busyId === survey.id} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs text-[var(--wp-coral-deep)] bg-[var(--wp-coral-wash)] hover:opacity-90 disabled:opacity-50"><Trash2 size={12} /> {t('adminApi.deleteDraft')}</button>
                      )}
                    </div>
                  </div>
                </Row>
              </FadeIn>
            );
          })}
        </div>
      </div>

      {viewing && <SurveyResultsDialog survey={viewing} onClose={() => setViewing(null)} />}
      {reviewing && <PublicSurveyReviewDialog survey={reviewing} onPublish={publishPublic} onClose={() => setReviewing(null)} />}

      {pending && (
        <ConfirmDialog
          title={t(pending.kind === 'close' ? 'azraqAdmin.confirm.closeSurveyTitle' : 'azraqAdmin.confirm.deleteDraftTitle')}
          message={t(pending.kind === 'close' ? 'azraqAdmin.confirm.closeSurveyMessage' : 'azraqAdmin.confirm.deleteDraftMessage', { title: pending.survey.title })}
          confirmLabel={t(pending.kind === 'close' ? 'adminApi.closeSurvey' : 'adminApi.deleteDraft')}
          danger={pending.kind === 'delete'}
          onConfirm={confirmPending}
          onClose={() => setPending(null)}
        />
      )}
    </div>
  );
}

// من أنشأه (رابط ملفه في الإدارة)، وأين نُشر (روابط المساحة والمجموعة)، ومتى نُشر.
function SurveyFacts({ survey }) {
  const { t, lang } = useLanguage();
  const placement = survey.placement;
  if (!placement && !survey.creator && survey.publishedAt === undefined) return null; // خادم أقدم
  const places = surveyPlaces(placement);
  const placeLabel = { workspace: 'adminSurveys.inWorkspace', group: placement?.kind === 'workspace' ? 'adminSurveys.toGroup' : 'adminSurveys.inGroup' };
  const date = adminDate(survey.publishedAt, lang);
  const creatorHref = survey.creator ? memberHref(survey.creator.id) : null;

  return (
    <div className="flex items-center gap-x-3 gap-y-1 text-xs text-[var(--wp-text-muted)] mt-1.5 flex-wrap">
      {survey.creator && (
        <span>
          {t('adminSurveys.createdBy')}:{' '}
          {creatorHref ? <Link to={creatorHref} className="font-semibold text-[var(--wp-text-2)] hover:underline">{survey.creator.name}</Link> : survey.creator.name}
        </span>
      )}
      {places.map((place) => (
        <span key={place.kind}>
          {t(placeLabel[place.kind])}:{' '}
          <Link to={place.href} className="font-semibold text-[var(--wp-text-2)] hover:underline">{place.name || '—'}</Link>
        </span>
      ))}
      {placement?.kind === 'public' && <span>{t('adminSurveys.forPublic')}</span>}
      {placement?.kind === 'members' && <span>{t('adminSurveys.forMembers')}</span>}
      <span>{date ? t('adminSurveys.publishedOn', { date }) : t('adminSurveys.notPublished')}</span>
    </div>
  );
}

export default function AdminSurveys() {
  if (!USE_API) return <MockAdminSurveys />;
  return <ApiAdminSurveys />;
}
