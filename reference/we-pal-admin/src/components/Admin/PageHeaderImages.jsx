import { useState } from 'react';
import { ImageIcon, Save } from 'lucide-react';
import Card from '../common/Card';
import Button from '../ui/Button';
import { useLanguage } from '../../i18n/LanguageContext';
import * as adminApi from '../../api/admin';
import ImageField from './ImageField';
import { useAdminNotice } from './adminNoticeContext';
import useImageDraft, { commitImageDraft, draftAltMissing } from '../../hooks/useImageDraft';
import { PAGE_HEADER_PAGES, imageTextChanged } from '../../utils/images';

/**
 * صور رؤوس صفحات القوائم في إعدادات الواجهة (جولة التصميم 6): لكل صفحة صورة اختيارية مستقلة،
 * تُحفظ وحدها (لا تنتظر زر حفظ التصميم). onSaved(res) بإعدادات المظهر الكاملة بعد كل حفظ.
 */
export default function PageHeaderImages({ headers, policy, onSaved }) {
  const { t } = useLanguage();

  return (
    <Card>
      <section aria-labelledby="page-headers-title" className="space-y-4">
        <div>
          <h3 id="page-headers-title" className="ui-section-title"><ImageIcon aria-hidden="true" />{t('azraqAdmin.image.headersTitle')}</h3>
          <p className="ui-section-hint">{t('azraqAdmin.image.headersHint')}</p>
        </div>
        <div className="aim-headers grid gap-4 lg:grid-cols-2">
          {PAGE_HEADER_PAGES.map((page) => (
            <PageHeaderForm key={page} page={page} image={headers?.[page] ?? null} policy={policy} onSaved={onSaved} />
          ))}
        </div>
      </section>
    </Card>
  );
}

function PageHeaderForm({ page, image, policy, onSaved }) {
  const { t } = useLanguage();
  const notify = useAdminNotice();
  const header = useImageDraft();
  const [loadedFor, setLoadedFor] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const pageName = t(`azraqAdmin.image.pages.${page}`);

  // المسودة تتبع الصورة المحفوظة عند أول عرض وبعد حفظ هذه الصفحة؛ حفظ صفحة أخرى (رد جديد بنفس الصورة)
  // لا يمسّ ما يُحرَّر هنا، فالمقارنة بالمحتوى لا بالمرجع.
  const imageKey = JSON.stringify(image ?? null);
  if (loadedFor !== imageKey) {
    setLoadedFor(imageKey);
    header.reset(image);
  }

  const { draft } = header;
  const dirty = Boolean(draft.file) || (draft.remove && draft.current) || (draft.current && !draft.remove && imageTextChanged(draft.current, draft.alt, draft.credit));

  const save = async (event) => {
    event.preventDefault();
    if (!dirty) {
      notify(t('azraqAdmin.image.nothingToSave', { page: pageName }));
      return;
    }
    if (draftAltMissing(draft)) {
      header.update({ error: t('azraqAdmin.image.altRequired') });
      return;
    }
    setBusy(true);
    header.update({ error: null });
    try {
      const removing = draft.remove && !draft.file;
      const res = await commitImageDraft(draft, {
        id: page,
        upload: adminApi.uploadPageHeader,
        remove: adminApi.deletePageHeader,
        patchText: (key, text) => adminApi.updateAppearance({ pageHeaders: { [key]: { alt: text.alt, credit: text.credit } } }),
      });
      if (res) onSaved(res);
      notify(t(removing ? 'azraqAdmin.image.headerRemoved' : 'azraqAdmin.image.headerSaved', { page: pageName }));
    } catch (err) {
      header.update({ error: err.message || t('common.loadError') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={save} className="aim-header-form space-y-3" aria-label={t('azraqAdmin.image.headerLabel', { page: pageName })}>
      <ImageField label={t('azraqAdmin.image.headerLabel', { page: pageName })} draft={draft} onChange={header.update} policy={policy} name={`header-${page}`} ratio="21 / 9" />
      <Button type="submit" size="sm" variant="secondary" loading={busy}>
        <Save aria-hidden="true" />{t('azraqAdmin.image.saveHeader', { page: pageName })}
      </Button>
    </form>
  );
}
