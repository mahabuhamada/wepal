import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowRight, Printer } from 'lucide-react';
import ErrorState from '../../components/common/ErrorState';
import FeatureUnavailable from '../../components/common/FeatureUnavailable';
import Button from '../../components/ui/Button';
import { useLanguage } from '../../i18n/LanguageContext';
import { BRAND } from '../../i18n/brand';
import { USE_API } from '../../config';
import { getInvitationBatch } from '../../api/invitationBatches';
import { formatShortDate, regionLabel } from '../../utils/apiMappers';
import { privateAreaMeta } from '../../seo';
import '../../styles/invitation-print.css';

export const meta = (args) => privateAreaMeta(args, { ar: 'ورقة أكواد الدعوة', en: 'Invitation codes sheet' });

/**
 * ورقة للطباعة: قصاصة لكل كود غير مستعمل في الدفعة (الكود، والرابط، والصلاحية) تُقصّ وتوزّع في الورشة.
 * القصاصة لا تحمل اسم الدفعة ولا منطقتها، كالرابط نفسه. رأس الورقة (للمنظِّم) يحمل اسم الدفعة.
 * خارج قشرة الإدارة حتى لا يُطبع الشريط الجانبي؛ الحارس نفسه (AdminGuard).
 */
export default function AdminInvitationPrint() {
  if (!USE_API) return <FeatureUnavailable backTo="/admin/invitations" />;
  return <PrintSheet />;
}

function PrintSheet() {
  const { id } = useParams();
  const { t, lang } = useLanguage();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const brand = BRAND.name[lang] ?? BRAND.name.ar;
  const k = 'inviteBatches.print';

  useEffect(() => {
    let active = true;
    getInvitationBatch(id, 'UNUSED')
      .then((res) => { if (active) setData(res); })
      .catch((err) => { if (active) setError(err); });
    return () => { active = false; };
  }, [id]);

  const batch = data?.batch;
  const codes = data?.codes ?? [];

  return (
    <main className="inv-print" dir={lang === 'en' ? 'ltr' : 'rtl'}>
      <div className="inv-print-toolbar">
        <Button variant="secondary" size="sm" to={`/admin/invitations/${id}`}>
          <ArrowRight aria-hidden="true" className="ltr:rotate-180" /> {t(`${k}.back`)}
        </Button>
        <Button size="sm" onClick={() => window.print()} disabled={!codes.length}>
          <Printer aria-hidden="true" /> {t(`${k}.printNow`)}
        </Button>
      </div>

      {error && <ErrorState error={error} />}
      {!data && !error && <p role="status">{t('common.loading')}</p>}

      {batch && (
        <>
          <header className="inv-print-head">
            <h1>{batch.name}</h1>
            <p>
              {regionLabel(batch.region, lang)} · {batch.cohort?.name}
              {batch.expiresAt && <> · {t(`${k}.validUntil`, { date: formatShortDate(batch.expiresAt, lang) })}</>}
            </p>
            <p>{codes.length ? t(`${k}.onlyUnused`, { count: codes.length }) : t(`${k}.none`)}</p>
          </header>

          <ul className="inv-print-grid" aria-label={t(`${k}.docTitle`)}>
            {codes.map((c) => (
              <li key={c.id} className="inv-slip">
                <p className="inv-slip-brand">{t(`${k}.heading`, { brand })}</p>
                <p className="inv-slip-code" dir="ltr">{c.code}</p>
                <p className="inv-slip-link" dir="ltr">{c.joinUrl}</p>
                <p className="inv-slip-hint">{t(`${k}.instructions`)}</p>
                {c.expiresAt && <p className="inv-slip-hint">{t(`${k}.validUntil`, { date: formatShortDate(c.expiresAt, lang) })}</p>}
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
