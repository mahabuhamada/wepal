import { useEffect, useMemo, useState } from 'react';
import { GalleryHorizontal, LayoutGrid, Palette, Save } from 'lucide-react';
import TopBar from '../../components/Layout/TopBar';
import Card from '../../components/common/Card';
import FeatureUnavailable from '../../components/common/FeatureUnavailable';
import ErrorState from '../../components/common/ErrorState';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Field from '../../components/ui/Field';
import { Select } from '../../components/ui/Input';
import Alert from '../../components/ui/Alert';
import { useLanguage } from '../../i18n/LanguageContext';
import { useTheme } from '../../theme/ThemeContext';
import { USE_API } from '../../config';
import * as adminApi from '../../api/admin';
import { appearanceChanges, normalizeAppearance } from '../../utils/siteTheme';
import { formatShortDate } from '../../utils/apiMappers';
import { imagePolicyFrom } from '../../utils/images';
import PageHeaderImages from '../../components/Admin/PageHeaderImages';

const NEWS_COUNTS = [2, 3, 4, 5];
const INTERVALS = [5, 6, 7, 8, 9, 10, 11, 12];

// معاينة صغيرة بالسمة نفسها: data-theme على العنصر يجعل التوكنز تتبعها.
function ThemePreview({ theme, t }) {
  return (
    <span className="ui-choice-preview" data-theme={theme} aria-hidden="true">
      <b className="ui-choice-preview-title">{t('adminAppearance.previewTitle')}</b>
      <span className="ui-choice-preview-text">{t('adminAppearance.previewText')}</span>
      <span className="ui-choice-preview-row">
        <span className="ui-btn ui-btn-primary ui-btn-sm">{t('adminAppearance.previewButton')}</span>
        <span className="ui-swatches">
          <i style={{ background: 'var(--color-primary)' }} />
          <i style={{ background: 'var(--color-inverse)' }} />
          <i style={{ background: 'var(--color-secondary)' }} />
          <i style={{ background: 'var(--color-accent-yellow)' }} />
        </span>
      </span>
    </span>
  );
}

function Choice({ name, value, checked, onChange, title, desc, children }) {
  return (
    <label className="ui-choice">
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} className="ui-choice-input" />
      {children}
      <span className="ui-choice-title">{title}</span>
      {desc && <span className="ui-choice-desc">{desc}</span>}
    </label>
  );
}

/**
 * إعدادات الواجهة (إعادة التصميم، المرحلة أ): المدير يبدّل بين التصميم الحالي والجديد بلا نشر،
 * ويضبط هيرو الرئيسية الجديدة. GET/PATCH /admin/appearance.
 */
export default function AdminAppearance() {
  const { t, lang } = useLanguage();
  const { setTheme, setHero } = useTheme();
  const [saved, setSaved] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  // صور رؤوس صفحات القوائم (جولة التصميم 6): تظهر فقط إن أرسل الخادم imageUpload.
  const [headers, setHeaders] = useState(null);
  const [imagePolicy, setImagePolicy] = useState(null);

  const load = () => {
    setLoadError(null);
    adminApi.getAppearance()
      .then((res) => {
        const state = normalizeAppearance(res);
        setSaved(state);
        setDraft(state);
        setHeaders(res?.pageHeaders ?? null);
        setImagePolicy(imagePolicyFrom(res));
      })
      .catch(setLoadError);
  };

  // حفظ صورة رأس يعيد الإعدادات كاملة: تُحدَّث الصور ووقت آخر تعديل دون المساس بتعديلات التصميم غير المحفوظة.
  const onHeaderSaved = (res) => {
    setHeaders(res?.pageHeaders ?? null);
    setSaved((current) => (current ? { ...current, updatedAt: res?.updatedAt ?? current.updatedAt } : current));
  };

  useEffect(() => {
    if (!USE_API) return;
    load();
  }, []);

  const changes = useMemo(() => (saved && draft ? appearanceChanges(saved, draft) : {}), [saved, draft]);
  const dirty = Object.keys(changes).length > 0;

  if (!USE_API) return <FeatureUnavailable backTo="/admin" />;

  const setDesign = (design) => { setMessage(null); setDraft((d) => ({ ...d, design })); };
  const setHeroField = (key, value) => { setMessage(null); setDraft((d) => ({ ...d, hero: { ...d.hero, [key]: value } })); };

  const save = async (event) => {
    event.preventDefault();
    if (!dirty) return;
    setBusy(true);
    setMessage(null);
    try {
      const state = normalizeAppearance(await adminApi.updateAppearance(changes));
      setSaved(state);
      setDraft(state);
      setTheme(state.design);
      setHero(state.hero);
      setMessage({ tone: 'success', text: t('adminAppearance.saved') });
    } catch (err) {
      setMessage({ tone: 'danger', text: err?.message || t('adminAppearance.saveFailed') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <TopBar title={t('adminAppearance.title')} />
      <div className="p-7 px-8 space-y-6">
        <PageHeader title={t('adminAppearance.title')} subtitle={t('adminAppearance.subtitle')} as="h2" />

        {loadError && <ErrorState error={loadError} onRetry={load} />}
        {!loadError && !draft && <p role="status" aria-busy="true" data-loading="" className="text-body-sm text-ink-muted">{t('common.loading')}</p>}

        {draft && (
          <form onSubmit={save} className="space-y-6">
            <Card>
              <fieldset className="ui-fieldset">
                <legend className="ui-section-title"><Palette aria-hidden="true" />{t('adminAppearance.designTitle')}</legend>
                <p className="ui-section-hint">{t('adminAppearance.designHint')}</p>
                <div className="ui-choices">
                  <Choice name="design" value="classic" checked={draft.design === 'classic'} onChange={setDesign}
                    title={t('adminAppearance.classic')} desc={t('adminAppearance.classicDesc')}>
                    <ThemePreview theme="classic" t={t} />
                  </Choice>
                  <Choice name="design" value="azraq" checked={draft.design === 'azraq'} onChange={setDesign}
                    title={t('adminAppearance.azraq')} desc={t('adminAppearance.azraqDesc')}>
                    <ThemePreview theme="azraq" t={t} />
                  </Choice>
                </div>
                <Alert tone="info" size="sm" className="mt-4">{t('adminAppearance.designNote')}</Alert>
              </fieldset>
            </Card>

            <Card>
              <fieldset className="ui-fieldset">
                <legend className="ui-section-title"><GalleryHorizontal aria-hidden="true" />{t('adminAppearance.heroTitle')}</legend>
                <p className="ui-section-hint">{t('adminAppearance.heroHint')}</p>
                <div className="ui-choices">
                  <Choice name="heroMode" value="slider" checked={draft.hero.mode === 'slider'} onChange={(v) => setHeroField('mode', v)}
                    title={t('adminAppearance.slider')} desc={t('adminAppearance.sliderDesc')}>
                    <span className="ui-choice-icon" aria-hidden="true"><GalleryHorizontal /></span>
                  </Choice>
                  <Choice name="heroMode" value="bento" checked={draft.hero.mode === 'bento'} onChange={(v) => setHeroField('mode', v)}
                    title={t('adminAppearance.bento')} desc={t('adminAppearance.bentoDesc')}>
                    <span className="ui-choice-icon" aria-hidden="true"><LayoutGrid /></span>
                  </Choice>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 mt-4">
                  <Field label={t('adminAppearance.newsCount')} hint={t('adminAppearance.newsCountHint')}>
                    <Select value={draft.hero.newsCount} onChange={(e) => setHeroField('newsCount', Number(e.target.value))}>
                      {NEWS_COUNTS.map((n) => <option key={n} value={n}>{n}</option>)}
                    </Select>
                  </Field>
                  <Field label={t('adminAppearance.interval')} hint={t('adminAppearance.intervalHint')}>
                    <Select value={draft.hero.interval} onChange={(e) => setHeroField('interval', Number(e.target.value))}>
                      {INTERVALS.map((n) => <option key={n} value={n}>{t('adminAppearance.seconds', { count: n })}</option>)}
                    </Select>
                  </Field>
                </div>
              </fieldset>
            </Card>

            {message && <Alert tone={message.tone}>{message.text}</Alert>}

            <div className="flex flex-wrap items-center gap-4">
              <Button type="submit" loading={busy} disabled={!dirty}>
                <Save aria-hidden="true" />{busy ? t('adminAppearance.saving') : t('adminAppearance.save')}
              </Button>
              {saved?.updatedAt && (
                <span className="text-body-sm text-ink-muted">{t('adminAppearance.lastUpdated', { date: formatShortDate(saved.updatedAt, lang) })}</span>
              )}
            </div>
          </form>
        )}

        {draft && imagePolicy && headers && (
          <PageHeaderImages headers={headers} policy={imagePolicy} onSaved={onHeaderSaved} />
        )}
      </div>
    </div>
  );
}
