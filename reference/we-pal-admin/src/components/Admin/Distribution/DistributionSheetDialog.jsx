import { useRef, useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import Modal from '../../common/Modal';
import Field from '../../ui/Field';
import Alert from '../../ui/Alert';
import Button from '../../ui/Button';
import { useLanguage } from '../../../i18n/LanguageContext';
import { canApplyPlan, importDistributionSheet, previewDistributionSheet } from '../../../api/distribution';
import PlanSummary, { StatusPill } from './PlanSummary';
import FilePicker from '../FilePicker';

/**
 * «استيراد توزيع من ملف» (القرار 3): CSV أو XLSX بالبريد أو الجوال والمساحة والدور ← معاينة كل صف بحالته
 * (مطابق، مجهول، تعارض) وسعة كل مساحة، بلا كتابة، ثم حفظ الصفوف الجاهزة فقط.
 */
export default function DistributionSheetDialog({ onClose, onDone }) {
  const { t } = useLanguage();
  const cancelRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err?.errors?.file?.[0] || err?.message || t('common.loadError'));
    } finally {
      setBusy(false);
    }
  };

  const doPreview = () => run(async () => setPreview(await previewDistributionSheet(file)));
  const doImport = () => run(async () => onDone?.(await importDistributionSheet(file)));

  return (
    <Modal title={t('adminDistribution.sheet.title')} onClose={busy ? undefined : onClose} initialFocusRef={cancelRef} size="lg">
      <p className="text-sm text-[var(--wp-text-2)] leading-relaxed">{t('adminDistribution.sheet.lead')}</p>

      <div className="mt-4">
        <Field label={t('adminDistribution.sheet.file')}>
          <FilePicker file={file} accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onPick={(f) => { setFile(f); setPreview(null); }} />
        </Field>
      </div>

      {preview && (
        <div className="mt-4 space-y-3">
          <div className="max-h-64 overflow-y-auto rounded-xl border border-[var(--wp-border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[var(--wp-text-muted)]">
                  <th className="p-2 text-start">{t('adminDistribution.sheet.line')}</th>
                  <th className="p-2 text-start">{t('adminDistribution.sheet.identifier')}</th>
                  <th className="p-2 text-start">{t('adminDistribution.cols.member')}</th>
                  <th className="p-2 text-start">{t('adminDistribution.dialog.workspace')}</th>
                  <th className="p-2 text-start">{t('adminDistribution.dialog.role')}</th>
                  <th className="p-2 text-start"><span className="sr-only">{t('adminDistribution.status.ok')}</span></th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((r) => (
                  <tr key={r.line} className={`border-t border-[var(--wp-border)]${r.status === 'ok' ? '' : ' bg-[var(--color-danger-soft)]'}`}>
                    <td className="p-2 tabular-nums">{r.line}</td>
                    <td className="p-2" dir="ltr">{r.identifier || '—'}</td>
                    <td className="p-2">{r.name || '—'}</td>
                    <td className="p-2">{r.workspace?.title || '—'}</td>
                    <td className="p-2">{r.role ? t(`adminDistribution.dialog.roles.${r.role}`) : '—'}</td>
                    <td className="p-2"><StatusPill status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PlanSummary plan={preview} />
          <p className="text-xs text-[var(--wp-text-muted)]">{t('adminDistribution.dialog.notify')}</p>
        </div>
      )}

      {error && <Alert size="sm" className="mt-3">{error}</Alert>}
      <div className="mt-5 flex justify-end gap-2">
        <Button ref={cancelRef} variant="ghost" size="sm" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
        {!preview ? (
          <Button size="sm" onClick={doPreview} loading={busy} disabled={!file}><FileSpreadsheet aria-hidden="true" /> {t('adminDistribution.sheet.preview')}</Button>
        ) : (
          <Button size="sm" onClick={doImport} loading={busy} disabled={!canApplyPlan(preview)}>{t('adminDistribution.sheet.apply', { count: preview.counts?.ok ?? 0 })}</Button>
        )}
      </div>
    </Modal>
  );
}
