import { useRef, useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import Modal from '../../common/Modal';
import Field from '../../ui/Field';
import { Select } from '../../ui/Input';
import Alert from '../../ui/Alert';
import Button from '../../ui/Button';
import { useLanguage } from '../../../i18n/LanguageContext';
import { importInvitationSheet, previewInvitationSheet } from '../../../api/admin';
import { REGIONS, regionLabel } from '../../../utils/apiMappers';
import FilePicker from '../FilePicker';

/**
 * «دعوة من ورقة» (قرار أمجد 12 نوفمبر 2026): ملف CSV أو XLSX بالاسم والجوال → معاينة كل صف بحالته
 * (بلا كتابة)، ثم إنشاء دعوة لكل صف جاهز، وكل مدعوّ يصله كوده برسالة SMS. الجوال الكامل لا يعود إلى المتصفح.
 */
export default function SheetInviteDialog({ cohorts = [], onClose, onDone }) {
  const { t, lang } = useLanguage();
  const cancelRef = useRef(null);
  const [file, setFile] = useState(null);
  const [region, setRegion] = useState('GAZA');
  const [cohort, setCohort] = useState(cohorts.length === 1 ? cohorts[0].key : '');
  const [sendSms, setSendSms] = useState(true);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const fields = { region, cohort, sendSms };
  const ready = preview?.counts?.ok ?? 0;

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

  const doPreview = () => run(async () => setPreview(await previewInvitationSheet(file, fields)));
  const doImport = () => run(async () => {
    const res = await importInvitationSheet(file, fields);
    setResult(res);
    onDone?.(res);
  });

  return (
    <Modal title={t('adminLists.sheet.title')} onClose={busy ? undefined : onClose} initialFocusRef={cancelRef} size="lg">
      <p className="text-sm text-[var(--wp-text-2)] leading-relaxed">{t('adminLists.sheet.lead')}</p>

      {result ? (
        <div className="mt-4 space-y-3">
          <Alert tone="success">{t('adminLists.sheet.done', { created: result.created, sent: result.smsSent })}</Alert>
          {(result.smsFailed?.length ?? 0) > 0 && <Alert>{t('adminLists.sheet.failed', { count: result.smsFailed.length })}</Alert>}
          <div className="flex justify-end"><Button ref={cancelRef} onClick={onClose}>{t('common.close')}</Button></div>
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label={t('adminLists.sheet.file')}>
              <FilePicker file={file} accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onPick={(f) => { setFile(f); setPreview(null); }} />
            </Field>
            <Field label={t('adminLists.sheet.cohort')}>
              <Select value={cohort} onChange={(e) => setCohort(e.target.value)}>
                {cohorts.length !== 1 && <option value="">—</option>}
                {cohorts.map((c) => <option key={c.key} value={c.key}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label={t('adminLists.sheet.region')}>
              <Select value={region} onChange={(e) => setRegion(e.target.value)}>
                {REGIONS.map((r) => <option key={r} value={r}>{regionLabel(r, lang)}</option>)}
              </Select>
            </Field>
            <label className="flex items-start gap-2 text-sm text-[var(--wp-text-2)] self-end">
              <input type="checkbox" className="mt-1" checked={sendSms} onChange={(e) => setSendSms(e.target.checked)} />
              <span>{t('adminLists.sheet.sendSms')}</span>
            </label>
          </div>

          {preview && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold mb-2">{t('adminLists.sheet.rows')} ({preview.counts.total})</h3>
              <div className="max-h-64 overflow-y-auto rounded-xl border border-[var(--wp-border)]">
                <table className="w-full text-sm">
                  <thead><tr className="text-start text-xs text-[var(--wp-text-muted)]"><th className="p-2 text-start">{t('adminLists.sheet.line')}</th><th className="p-2 text-start">{t('inviteSms.form.name')}</th><th className="p-2 text-start">{t('inviteSms.form.phone')}</th><th className="p-2 text-start">{t('adminLists.sheet.status.ok')}</th></tr></thead>
                  <tbody>
                    {preview.rows.map((r) => (
                      <tr key={r.line} className="border-t border-[var(--wp-border)]">
                        <td className="p-2 tabular-nums">{r.line}</td>
                        <td className="p-2">{r.name || '—'}</td>
                        <td className="p-2" dir="ltr">{r.phoneMask || '—'}</td>
                        <td className="p-2"><span className={`azq-pill${r.status === 'ok' ? ' is-ok' : ' is-warn'}`}>{t(`adminLists.sheet.status.${r.status}`)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && <Alert size="sm" className="mt-3">{error}</Alert>}
          <div className="mt-5 flex justify-end gap-2">
            <Button ref={cancelRef} variant="ghost" size="sm" onClick={onClose} disabled={busy}>{t('common.cancel')}</Button>
            {!preview ? (
              <Button size="sm" onClick={doPreview} loading={busy} disabled={!file || !cohort}><FileSpreadsheet aria-hidden="true" /> {t('adminLists.sheet.preview')}</Button>
            ) : (
              <Button size="sm" onClick={doImport} loading={busy} disabled={ready === 0}>{t('adminLists.sheet.create', { count: ready })}</Button>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
