import { BarChart3, BookOpen, Briefcase, CheckCircle2, Clock, Download, Globe2, Inbox, MessageCircleQuestion, MessageSquare, Search, SearchX, Send, Trophy, UserCheck, Users } from 'lucide-react';
import OverviewBand from './OverviewBand';
import useListSummary from '../../hooks/useListSummary';
import { useLanguage } from '../../i18n/LanguageContext';
import { useTheme } from '../../theme/ThemeContext';
import { USE_API } from '../../config';
import * as adminApi from '../../api/admin';
import { resourceTypeLabel, trackLabel } from '../../utils/apiMappers';
import { localName } from '../../utils/adminLinks';

// شريط «نظرة عامة» لصفحات قائمة قائمة أخرى (خطة لوحة الإدارة 4.3.1): سطر واحد في كل صفحة، والمكوّن هنا.
// للوحة الجديدة («أزرق هادئ») وحدها؛ التصميم الحالي لا يتغير.

const LIB_ICON = { resources: BookOpen, downloads: Download, fromWorkspaces: Briefcase, withoutEnglish: Globe2 };
const LIB_PATH = { resources: 'lib', downloads: 'work', fromWorkspaces: 'com', withoutEnglish: 'vote' };

export function LibraryOverview({ status = 'all' }) {
  const { t, lang } = useLanguage();
  const on = useTheme().theme === 'azraq' && USE_API;
  const band = useListSummary(() => (on ? adminApi.getLibrarySummary({ status }) : Promise.resolve(null)), [on, status]);
  if (!on) return null;
  return (
    <OverviewBand
      page="library"
      summary={band.summary}
      loading={band.loading}
      error={band.error}
      scopeText={t(`adminLists.library.status.${status}`)}
      tileLabel={(k) => t(`adminLists.library.tiles.${k}`)}
      tileIcon={(k) => LIB_ICON[k]}
      tilePath={(k) => LIB_PATH[k]}
      chartTitle={(k) => t(`adminLists.library.charts.${k}`)}
      itemLabel={(chart, item) => (chart === 'byType' ? resourceTypeLabel(item.key, lang) : localName(item.label, lang))}
    />
  );
}

const PROP_ICON = { inTab: Inbox, pending: Clock, approved: CheckCircle2, openChallenges: Trophy };
const PROP_PATH = { inTab: 'none', pending: 'vote', approved: 'ok', openChallenges: 'work' };

export function ProposalsOverview({ status = null }) {
  const { t, lang } = useLanguage();
  const on = useTheme().theme === 'azraq' && USE_API;
  const band = useListSummary(() => (on ? adminApi.getProposalsSummary({ status }) : Promise.resolve(null)), [on, status]);
  if (!on) return null;
  return (
    <OverviewBand
      page="proposals"
      summary={band.summary}
      loading={band.loading}
      error={band.error}
      scopeText={status ? t(`workspaceProposals.status.${status}`) : t('workspaceProposals.admin.all')}
      tileLabel={(k) => t(`adminLists.proposals.tiles.${k}`)}
      tileIcon={(k) => PROP_ICON[k]}
      tilePath={(k) => PROP_PATH[k]}
      chartTitle={(k) => t(`adminLists.proposals.charts.${k}`)}
      itemLabel={(chart, item) => (chart === 'byTrack' ? trackLabel(item.key, lang) : t(`workspaceProposals.status.${item.key}`))}
    />
  );
}

const PUB_ICON = { requests: Send, complete: CheckCircle2, incomplete: Users, published: BookOpen };
const PUB_PATH = { requests: 'none', complete: 'ok', incomplete: 'vote', published: 'lib' };

export function PublishOverview() {
  const { t } = useLanguage();
  const on = useTheme().theme === 'azraq' && USE_API;
  const band = useListSummary(() => (on ? adminApi.getPublishSummary() : Promise.resolve(null)), [on]);
  if (!on) return null;
  return (
    <OverviewBand
      page="publish"
      summary={band.summary}
      loading={band.loading}
      error={band.error}
      tileLabel={(k) => t(`adminLists.publish.tiles.${k}`)}
      tileIcon={(k) => PUB_ICON[k]}
      tilePath={(k) => PUB_PATH[k]}
      chartTitle={(k) => t(`adminLists.publish.charts.${k}`)}
      itemLabel={(chart, item) => item.label}
    />
  );
}

const SURVEY_ICON = { surveys: BarChart3, responses: MessageSquare, awaitingReview: Clock, fromWorkspaces: Briefcase };
const SURVEY_PATH = { surveys: 'vote', responses: 'ok', awaitingReview: 'work', fromWorkspaces: 'com' };

// الاستطلاعات: البطاقات تتبع تبويب الحالة والمكان المختارين (ما عدا «بانتظار المراجعة»: الآن).
// version: يزيد بعد كل نشر أو إغلاق أو حذف في الصفحة، فتُعاد الأرقام.
export function SurveysOverview({ status = 'all', placement = 'all', version = 0 }) {
  const { t, lang } = useLanguage();
  const on = useTheme().theme === 'azraq' && USE_API;
  const band = useListSummary(() => (on ? adminApi.getSurveysSummary({ status, placement }) : Promise.resolve(null)), [on, status, placement, version]);
  if (!on) return null;
  const scope = [t(`adminSurveys.tab.${status}`), t(`adminSurveys.placement.${placement}`)].join(' · ');
  return (
    <OverviewBand
      page="surveys"
      summary={band.summary}
      loading={band.loading}
      error={band.error}
      scopeText={scope}
      tileLabel={(k) => t(`adminLists.surveys.tiles.${k}`)}
      tileIcon={(k) => SURVEY_ICON[k]}
      tilePath={(k) => SURVEY_PATH[k]}
      chartTitle={(k) => t(`adminLists.surveys.charts.${k}`)}
      itemLabel={(chart, item) => (chart === 'byPlacement' ? t(`adminSurveys.placement.${item.key}`) : localName(item.label, lang))}
    />
  );
}

// مصدر لا تعرفه الواجهة (يضيفه الخادم لاحقًا) يُعرض «غير معروف» بدل مفتاح الترجمة
const SQ_SOURCES = ['ask', 'public_ask', 'library', 'search'];
const sqSourceLabel = (t, key) => (SQ_SOURCES.includes(key) ? t(`azraqAdmin.searchQueries.sources.${key}`) : t('azraqAdmin.searchQueries.unknown'));

const SQ_ICON = { asked: Search, unanswered: SearchX, askers: Users, fromMembers: UserCheck };
const SQ_PATH = { asked: 'none', unanswered: 'vote', askers: 'com', fromMembers: 'work' };

/** «أسئلة البحث»: الأسئلة المطروحة، وبلا جواب، والأشخاص المختلفون، ومن الأعضاء؛ بالمرشّحات نفسها. */
export function SearchQueriesOverview({ month, source = null, area = null, status = 'unanswered' }) {
  const { t, lang } = useLanguage();
  const on = useTheme().theme === 'azraq' && USE_API;
  const band = useListSummary(
    () => (on ? adminApi.getSearchQueriesSummary({ month, source, area, status }) : Promise.resolve(null)),
    [on, month, source, area, status],
  );
  if (!on) return null;
  const scope = [
    t(`azraqAdmin.searchQueries.status.${status}`),
    source && sqSourceLabel(t, source),
    area && t(`azraqAdmin.searchQueries.areas.${area}`),
  ].filter(Boolean).join(' · ');
  return (
    <OverviewBand
      page="search-queries"
      summary={band.summary}
      loading={band.loading}
      error={band.error}
      scopeText={scope}
      tileLabel={(k) => t(`adminLists.searchQueries.tiles.${k}`)}
      tileIcon={(k) => SQ_ICON[k] ?? MessageCircleQuestion}
      tilePath={(k) => SQ_PATH[k]}
      // السائلون null = سجل قديم بلا بصمة: «غير معروف» لا صفر
      tileValue={(tile) => (tile.value == null ? t('azraqAdmin.searchQueries.unknown') : Number(tile.value).toLocaleString(lang === 'ar' ? 'ar-u-nu-latn' : 'en-GB'))}
      chartTitle={(k) => t(`adminLists.searchQueries.charts.${k}`)}
      itemLabel={(chart, item) => (chart === 'bySource' ? sqSourceLabel(t, item.key) : item.label)}
    />
  );
}
