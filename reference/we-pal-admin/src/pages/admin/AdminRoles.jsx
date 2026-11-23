import { useEffect, useState } from 'react';
import { Check, Minus } from 'lucide-react';
import TopBar from '../../components/Layout/TopBar';
import ErrorState from '../../components/common/ErrorState';
import { useLanguage } from '../../i18n/LanguageContext';
import { USE_API } from '../../config';
import * as adminApi from '../../api/admin';
import { roleLabelKey } from '../../utils/roles';

/**
 * مصفوفة الأدوار (خطة لوحة الإدارة 4.6): الصلاحيات صفوفًا والأدوار أعمدة، من config/permissions.php عبر الخادم.
 * قراءة فقط: تعديل الأدوار لا يكون من اللوحة (القرار 1، الخيار ب).
 */
export default function AdminRoles() {
  const { t } = useLanguage();
  const [matrix, setMatrix] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!USE_API) return undefined;
    let live = true;
    adminApi.getRolesMatrix().then((m) => live && setMatrix(m)).catch((e) => live && setError(e));
    return () => { live = false; };
  }, []);

  return (
    <div>
      <TopBar title={t('adminMembers.roles.title')} />
      <div className="azq-list">
        <header className="azq-list-head">
          <div>
            <h2>{t('adminMembers.roles.title')}</h2>
            <p>{t('adminMembers.roles.lead')}</p>
          </div>
        </header>
        {error && <ErrorState error={error} />}
        {!matrix && !error && <div className="azq-skel" role="status" aria-busy="true" />}
        {matrix && (
          <div className="azq-lrows" style={{ overflowX: 'auto' }}>
            <table className="azq-matrix">
              <caption className="sr-only">{t('adminMembers.roles.title')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('adminMembers.roles.permission')}</th>
                  {matrix.roles.map((r) => <th key={r.role} scope="col">{t(roleLabelKey(r.role))}</th>)}
                </tr>
              </thead>
              <tbody>
                {matrix.permissions.map((p) => (
                  <tr key={p.key}>
                    <th scope="row"><span>{p.label}</span><code dir="ltr">{p.key}</code></th>
                    {matrix.roles.map((r) => {
                      const yes = r.permissions.includes(p.key);
                      return (
                        <td key={r.role} data-yes={yes}>
                          {yes ? <Check aria-hidden="true" /> : <Minus aria-hidden="true" />}
                          <span className="sr-only">{t(yes ? 'adminMembers.roles.yes' : 'adminMembers.roles.no')}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
