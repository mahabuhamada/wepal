// «مركز المساعد» (/admin/assistant): ردود الخادم بشكل ثابت للواجهة، وخطوات «قلب المساعد» السبع وحالاتها.
// الصفحة تعرض المرحلة 1 كما هي: ما لم يُبنَ بعد حالته «مخطَّط» برقم مرحلته، لا رقمًا وهميًا.

const num = (value) => (Number.isFinite(Number(value)) && value !== null && value !== '' ? Number(value) : 0);
const str = (value) => (typeof value === 'string' && value ? value : null);
const list = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

/** نسبة مئوية صحيحة، أو null حين لا مقام (لا «0%» مضلِّلة). */
export function percent(part, whole) {
  const total = num(whole);
  if (total <= 0) return null;
  return Math.round((num(part) * 100) / total);
}

/** حالات استخراج النص كما يرسلها الخادم (library-coverage)، بترتيب المرشّحات. */
export const COVERAGE_STATUSES = ['extracted', 'pending', 'needs_ocr', 'failed', 'no_file'];

/** الإعدادات المعتمدة للمساعد (23 أكتوبر 2026) إن غابت من رد خادم أقدم. */
export const PLANNED_DEFAULTS = { phase: 2, audience: 'members', dailyLimitPerMember: 20, monthlyCapUsd: 50, model: 'Claude Sonnet' };

/** رد GET /admin/assistant/overview بقيم مضمونة (أرقام لا undefined، وقوائم لا null). */
export function mapOverview(res) {
  const library = res?.library ?? {};
  const faq = res?.faq ?? {};
  const search = res?.search ?? {};
  const ask = res?.ask ?? {};
  const share = search.answeredShare;
  return {
    generatedAt: str(res?.generatedAt),
    library: {
      resources: num(library.resources),
      withFile: num(library.withFile),
      demo: num(library.demo),
      published: num(library.published),
      byType: library.byType && typeof library.byType === 'object' ? library.byType : {},
      items: list(library.items).map((item) => ({
        id: item.id,
        title: item.title ?? '',
        type: item.type ?? null,
        langs: list(item.langs),
        hasFile: Boolean(item.hasFile),
        format: str(item.format),
        isDemo: Boolean(item.isDemo),
        published: item.published !== false,
      })),
    },
    faq: {
      total: num(faq.total),
      published: num(faq.published),
      drafts: num(faq.drafts),
      demo: num(faq.demo),
      byCategory: list(faq.byCategory).map((row) => ({
        category: row.category,
        published: num(row.published),
        drafts: num(row.drafts),
      })),
    },
    search: {
      asks7d: num(search.asks7d),
      asks30d: num(search.asks30d),
      asksWithResults30d: num(search.asksWithResults30d),
      answeredShare: share === null || share === undefined || !Number.isFinite(Number(share)) ? null : Number(share),
      zeroResults7d: num(search.zeroResults7d),
      zeroResults30d: num(search.zeroResults30d),
      month: str(search.month),
      topZeroResults: list(search.topZeroResults).map((row) => ({
        query: String(row.query ?? ''),
        count: num(row.count),
        sources: list(row.sources),
        lastSeenAt: str(row.lastSeenAt),
      })).filter((row) => row.query),
      lastSearchAt: str(search.lastSearchAt),
      retentionDays: num(search.retentionDays) || 90,
    },
    ask: {
      mode: str(ask.mode) ?? 'search',
      languageModel: str(ask.languageModel),
      audience: str(ask.audience) ?? 'members',
      lastAskAt: str(ask.lastAskAt),
      planned: { ...PLANNED_DEFAULTS, ...(ask.planned && typeof ask.planned === 'object' ? ask.planned : {}) },
    },
  };
}

/**
 * رد library-coverage بقيم مضمونة، أو null إن لم يصل (النقطة غير منشورة، أو رد بلا totals).
 * حالة لا تعرفها الواجهة تُعرض «بانتظار» بدل أن تختفي المادة.
 */
export function mapCoverage(res) {
  if (!res || typeof res !== 'object' || !res.totals || typeof res.totals !== 'object') return null;
  const totals = res.totals;
  return {
    totals: {
      resources: num(totals.resources),
      withFile: num(totals.withFile),
      extracted: num(totals.extracted),
      needsOcr: num(totals.needsOcr),
      failed: num(totals.failed),
      noFile: num(totals.noFile),
      pending: num(totals.pending),
      pages: num(totals.pages),
      chunks: num(totals.chunks),
      lastExtractedAt: str(totals.lastExtractedAt),
    },
    items: list(res.items).map((item) => ({
      id: item.id,
      title: item.title ?? '',
      type: item.type ?? null,
      lang: str(item.lang),
      hasFile: Boolean(item.hasFile),
      isDemo: Boolean(item.isDemo),
      status: COVERAGE_STATUSES.includes(item.status) ? item.status : 'pending',
      pages: item.pages === null || item.pages === undefined ? null : num(item.pages),
      chunks: item.chunks === null || item.chunks === undefined ? null : num(item.chunks),
      extractedAt: str(item.extractedAt),
      error: str(item.error),
    })),
  };
}

/** عدد المواد في كل حالة (للمرشّحات)، ومعها all. */
export function coverageCounts(items) {
  const counts = Object.fromEntries([['all', 0], ...COVERAGE_STATUSES.map((status) => [status, 0])]);
  for (const item of items ?? []) {
    counts.all += 1;
    if (item?.status in counts) counts[item.status] += 1;
  }
  return counts;
}

/** إعادة الاستخراج لمادة لها ملف وليست مادة عرض، وليست في الطابور الآن. */
export const canReextract = (item) => Boolean(item?.hasFile && !item.isDemo && item.status !== 'pending' && item.status !== 'no_file');

/**
 * خطوات «قلب المساعد» السبع: المكتبة تُجهَّز (1–4)، ثم كل سؤال (5–7).
 * لكل خطوة: id، ورقمها، وحارتها، ومرحلة بنائها (0 = قائم اليوم)، وحالتها، والقيمة إن وُجدت، ومفتاح نص الحالة ومعاملاته.
 * الحالات: ok | warn | pending | planned. «planned» بلا قيمة أبدًا.
 */
export function buildStations(overview, coverage) {
  const { library, search } = overview;
  const planned = (id, n, lane, phase) => ({ id, n, lane, phase, state: 'planned', value: null, statusKey: 'planned', params: { phase } });

  const sources = {
    id: 'sources', n: 1, lane: 'prep', phase: 0,
    state: library.resources > 0 ? 'ok' : 'warn',
    value: library.resources,
    params: { withFile: library.withFile, demo: library.demo },
    statusKey: library.resources === 0 ? 'empty' : library.demo > 0 ? 'okDemo' : 'ok',
  };

  let extract = planned('extract', 2, 'prep', 2);
  let chunk = planned('chunk', 3, 'prep', 2);
  let index = planned('index', 4, 'prep', 2);
  if (coverage) {
    const tot = coverage.totals;
    const issues = tot.needsOcr + tot.failed;
    extract = {
      id: 'extract', n: 2, lane: 'prep', phase: 2,
      state: issues > 0 ? 'warn' : tot.pending > 0 ? 'pending' : tot.withFile === 0 ? 'pending' : 'ok',
      value: tot.extracted,
      of: tot.withFile,
      params: { count: issues, ocr: tot.needsOcr, failed: tot.failed, pending: tot.pending },
      statusKey: issues > 0 ? 'issues' : tot.pending > 0 ? 'waiting' : tot.withFile === 0 ? 'noFiles' : 'ok',
    };
    chunk = {
      id: 'chunk', n: 3, lane: 'prep', phase: 2,
      state: tot.chunks > 0 ? 'ok' : 'pending',
      value: tot.chunks,
      params: { pages: tot.pages },
      statusKey: tot.chunks > 0 ? 'ok' : 'none',
    };
    const share = percent(tot.extracted, tot.withFile);
    index = {
      id: 'index', n: 4, lane: 'prep', phase: 2,
      // نص الملفات جاهز؛ الفهرسة بالمعنى (pgvector) لم تبدأ بعد، فالحالة «بانتظار» لا «سليم».
      state: 'pending',
      value: share,
      unit: '%',
      params: { extracted: tot.extracted, withFile: tot.withFile },
      statusKey: 'meaningLater',
    };
  }

  const searchStation = {
    id: 'search', n: 5, lane: 'ask', phase: 0,
    state: search.asks30d > 0 ? 'ok' : 'pending',
    value: search.asks7d,
    params: { share: search.answeredShare, asks30d: search.asks30d },
    statusKey: search.asks30d > 0 && search.answeredShare !== null ? 'share' : 'quiet',
  };

  return [sources, extract, chunk, index, searchStation, planned('model', 6, 'ask', 4), planned('answer', 7, 'ask', 4)];
}

/** خطوات تحتاج انتباه المدير (للسطر تحت القلب). */
export const stationsNeedingAttention = (stations) => (stations ?? []).filter((s) => s.state === 'warn');

const NUMBER = new Intl.NumberFormat('en-US');
/** أرقام غربية بفواصل الآلاف (كباقي لوحة الإدارة)، و«—» لما لا رقم له. */
export const formatNumber = (value) => (value === null || value === undefined || value === '' || Number.isNaN(Number(value)) ? '—' : NUMBER.format(Number(value)));

/** وقت محدد بلغة الواجهة وأرقام غربية: «23 أكتوبر، 09:40» / «23 October, 09:40». فارغ لما لا وقت له. */
export function formatWhen(value, lang) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(lang === 'en' ? 'en-GB' : 'ar', {
    day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', numberingSystem: 'latn',
  });
}

/** نص حالة الخطوة من مفتاحها؛ الخطوة المخطَّطة «تصل في المرحلة N». t دالة الترجمة. */
export function stationStatus(t, station) {
  if (station.state === 'planned') return t('assistantHub.plannedStatus', { phase: station.phase });
  return t(`assistantHub.stations.${station.id}.status.${station.statusKey}`, station.params);
}

/** سطر الوحدة تحت رقم الخطوة، أو وصف ما سيأتي للخطوة المخطَّطة. */
export function stationUnit(t, station) {
  if (station.state === 'planned') return t(`assistantHub.stations.${station.id}.plannedUnit`);
  return t(`assistantHub.stations.${station.id}.unit`, station.params);
}

// حرف عربي واحد يكفي ليُعدّ السؤال عربيًا (السجل يحفظ النص المطبَّع، وقد يخلط أرقامًا وحروفًا لاتينية).
const ARABIC_LETTER = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFC]/;

/**
 * «أضف سؤالًا شائعًا» من أسئلة لم تجد نتيجة (/admin/editor/faq/new?q=…) ← نص السؤال بلغته: { ar, en }.
 * يُقصّ إلى حد الحقل (300)، والنص الفارغ أو الأقصر من حرفين ← null فلا يُفتح النموذج.
 */
export function faqQuestionFromQuery(query) {
  const text = String(query ?? '').replace(/\s+/g, ' ').trim().slice(0, 300);
  if (text.length < 2) return null;
  return ARABIC_LETTER.test(text) ? { ar: text, en: '' } : { ar: '', en: text };
}

/**
 * «أضفه للأسئلة الشائعة» من صفحة «أسئلة البحث»: المحرّر بسؤال شائع جديد بنص السؤال، و`from=search` ليربط
 * الخادم السؤال المسجَّل بالسؤال الشائع (editorStart ← searchQuery)، فيظهر في التقرير «مُجابًا».
 */
export function addFaqPath(query) {
  return `/admin/editor/faq/new?${new URLSearchParams({ q: String(query ?? ''), from: 'search' })}`;
}
