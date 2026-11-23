import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircleMinus } from 'lucide-react';
import TopBar from '../../components/Layout/TopBar';
import FeatureUnavailable from '../../components/common/FeatureUnavailable';
import ErrorState from '../../components/ui/ErrorState';
import { useAdminNotice } from '../../components/Admin/adminNoticeContext';
import AssistantHeart from '../../components/AssistantHub/AssistantHeart';
import StationDrawer from '../../components/AssistantHub/StationDrawer';
import HubActivity from '../../components/AssistantHub/HubActivity';
import HubFaqPanel from '../../components/AssistantHub/HubFaqPanel';
import HubControls from '../../components/AssistantHub/HubControls';
import HubCoverage from '../../components/AssistantHub/HubCoverage';
import { StateBadge } from '../../components/AssistantHub/hubParts';
import { useLanguage } from '../../i18n/LanguageContext';
import { FEATURES, USE_API } from '../../config';
import * as hubApi from '../../api/assistantHub';
import { buildStations, mapCoverage, mapOverview, stationsNeedingAttention } from '../../utils/assistantHub';

const PHASES = ['p1', 'p2', 'p3', 'p4'];

/**
 * «مركز المساعد» (/admin/assistant، للمدير): الصفحة كما هي في المرحلة 1 من خطة المساعد
 * (design-directions/assistant-hub، عرض «المرحلة 1 فقط»). «قلب المساعد» بسبع خطوات، والنشاط بلا هوية،
 * والأسئلة الشائعة، والضوابط للقراءة، وتغطية المكتبة. ما لم يُبنَ بعد يظهر «يصل في المرحلة N» بلا أرقام.
 * تغطية المكتبة من نقطة المرحلة 2أ إن كانت منشورة؛ 404 ← null فتبقى الخطوات 2–4 «مخطَّطة».
 */
export default function AdminAssistant() {
  const { t } = useLanguage();
  const notify = useAdminNotice();
  const [overview, setOverview] = useState(null);
  const [coverage, setCoverage] = useState(null);
  const [error, setError] = useState(null);
  const [coverageError, setCoverageError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const openerRef = useRef(null);
  const alive = useRef(true);

  const loadCoverage = useCallback(async () => {
    setCoverageError(null);
    try {
      const res = await hubApi.getLibraryCoverage();
      if (alive.current) setCoverage(mapCoverage(res));
    } catch (err) {
      if (alive.current) setCoverageError(err);
    }
  }, []);

  const load = useCallback(async () => {
    setError(null);
    setRefreshing(true);
    try {
      const [res] = await Promise.all([hubApi.getAssistantOverview(), loadCoverage()]);
      if (alive.current) setOverview(mapOverview(res));
    } catch (err) {
      if (alive.current) setError(err);
    } finally {
      if (alive.current) setRefreshing(false);
    }
  }, [loadCoverage]);

  useEffect(() => {
    alive.current = true;
    if (USE_API) load();
    return () => { alive.current = false; };
  }, [load]);

  const stations = useMemo(() => (overview ? buildStations(overview, coverage) : []), [overview, coverage]);
  const openStation = stations.find((s) => s.id === openId) ?? null;

  const openDrawer = useCallback((id, opener) => {
    openerRef.current = opener ?? null;
    setOpenId(id);
  }, []);

  const closeDrawer = useCallback(() => {
    setOpenId(null);
    // التركيز يعود للبطاقة التي فتحت الدرج (بعد أن يُزال من الصفحة).
    requestAnimationFrame(() => openerRef.current?.focus?.());
  }, []);

  const showCoverage = useCallback(() => {
    setOpenId(null);
    requestAnimationFrame(() => {
      const target = document.getElementById('ahub-coverage');
      target?.scrollIntoView?.({ block: 'start' });
      target?.focus?.({ preventScroll: true });
    });
  }, []);

  const reextract = useCallback(async (item) => {
    setBusyId(item.id);
    try {
      await hubApi.requestExtraction(item.id);
      // 202: يعمل في الخلفية. المادة «بانتظار» حتى ينتهي، والأرقام تتحدّث بزر «حدّث».
      setCoverage((current) => current && {
        ...current,
        items: current.items.map((x) => (x.id === item.id ? { ...x, status: 'pending', error: null } : x)),
      });
      notify(t('assistantHub.coverage.reextracted', { title: item.title }));
    } catch (err) {
      notify(err?.message || t('common.loadError'));
    } finally {
      setBusyId(null);
    }
  }, [notify, t]);

  if (!USE_API) return <FeatureUnavailable backTo="/admin" />;

  return (
    <div>
      <TopBar title={t('assistantHub.title')} />
      <div className="ahub-page">
        <header className="ahub-head">
          <div className="ahub-head-text">
            <h2 className="ahub-title">
              {t('assistantHub.title')}
              <StateBadge state="planned" icon={CircleMinus} className="is-lg">{t('assistantHub.phaseBadge')}</StateBadge>
            </h2>
            <p>{t('assistantHub.lead')}</p>
          </div>
        </header>

        <ol className="ahub-phases" aria-label={t('assistantHub.phasesLabel')}>
          {PHASES.map((key, i) => (
            <li key={key} className={i === 0 ? 'is-now' : undefined} aria-current={i === 0 ? 'step' : undefined}>
              <span className="ahub-ph-n" aria-hidden="true">{i + 1}</span>
              <span>
                <b>{t(`assistantHub.phases.${key}.title`)}</b>
                <span>{t(`assistantHub.phases.${key}.text`)}</span>
              </span>
            </li>
          ))}
        </ol>

        {error && !overview && <ErrorState error={error} onRetry={load} />}
        {!error && !overview && (
          <p role="status" aria-busy="true" data-loading="" className="ahub-loading">{t('assistantHub.loading')}</p>
        )}

        {overview && (
          <div className="ahub-stack">
            {error && <ErrorState error={error} onRetry={load} />}
            <AssistantHeart
              stations={stations}
              openId={openId}
              onOpen={openDrawer}
              attention={stationsNeedingAttention(stations)}
              hasCoverage={Boolean(coverage)}
              generatedAt={overview.generatedAt}
              onRefresh={load}
              refreshing={refreshing}
            />
            <HubActivity search={overview.search} />
            <div className="ahub-row-2">
              <HubFaqPanel faq={overview.faq} />
              <HubControls ask={overview.ask} askEnabled={FEATURES.assistant !== false} />
            </div>
            <HubCoverage
              library={overview.library}
              coverage={coverage}
              coverageError={coverageError}
              onRetryCoverage={loadCoverage}
              onReextract={reextract}
              busyId={busyId}
            />
          </div>
        )}
      </div>

      {openStation && (
        <StationDrawer
          station={openStation}
          overview={overview}
          coverage={coverage}
          onClose={closeDrawer}
          onReextract={reextract}
          busyId={busyId}
          onShowCoverage={showCoverage}
        />
      )}
    </div>
  );
}
