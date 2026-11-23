import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Palette, ShieldCheck } from 'lucide-react';
import TopBar from '../../components/Layout/TopBar';
import ErrorState from '../../components/common/ErrorState';
import Button from '../../components/ui/Button';
import KillSwitchPanel from '../../components/Admin/KillSwitchPanel';
import { useAdminNotice } from '../../components/Admin/adminNoticeContext';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../auth/AuthContext';
import { USE_API } from '../../config';
import * as adminApi from '../../api/admin';
import { hasPermission, roleLabelKey } from '../../utils/roles';

/**
 * الإعدادات (خطة لوحة الإدارة 4.7، المرحلة 4): المظهر، وإشعارات الطاقم، والأمان (الصيانة والحذف الطارئ
 * انتقلا إلى هنا من صفحة «الأمان» المؤقتة). كل قسم يظهر لمن يملك صلاحيته.
 */
export default function AdminSettings() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const canAppearance = hasPermission(user, 'settings.appearance');
  const canNotifications = hasPermission(user, 'settings.notifications');
  const canSecurity = hasPermission(user, 'system.maintenance');

  return (
    <div>
      <TopBar title={t('adminMembers.settings.title')} />
      <div className="azq-list">
        <header className="azq-list-head">
          <div>
            <h2>{t('adminMembers.settings.title')}</h2>
            <p>{t('adminMembers.settings.lead')}</p>
          </div>
        </header>

        {canAppearance && (
          <section className="azq-set" aria-labelledby="set-app">
            <span className="azq-tile" data-path="lib" aria-hidden="true"><Palette /></span>
            <div><h3 id="set-app">{t('adminMembers.settings.appearance')}</h3><p>{t('adminMembers.settings.appearanceLead')}</p></div>
            <Link className="azq-btn-sm" to="/admin/appearance">{t('adminMembers.settings.open')}</Link>
          </section>
        )}

        {canNotifications && USE_API && <StaffNotifications />}

        {canSecurity && (
          <section className="azq-set is-col" id="security" aria-labelledby="set-sec">
            <div className="azq-set-h">
              <span className="azq-tile" data-path="vote" aria-hidden="true"><ShieldCheck /></span>
              <div><h3 id="set-sec">{t('adminMembers.settings.security')}</h3><p>{t('adminMembers.settings.securityLead')}</p></div>
            </div>
            <KillSwitchPanel />
          </section>
        )}
      </div>
    </div>
  );
}

function StaffNotifications() {
  const { t } = useLanguage();
  const notify = useAdminNotice();
  const [kinds, setKinds] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    adminApi.getStaffNotifications().then((r) => live && setKinds(r.kinds)).catch((e) => live && setError(e));
    return () => { live = false; };
  }, []);

  const toggle = (kind, role) => setKinds((k) => {
    const roles = k[kind].roles.includes(role) ? k[kind].roles.filter((r) => r !== role) : [...k[kind].roles, role];
    return { ...k, [kind]: { ...k[kind], roles } };
  });

  const save = async () => {
    setBusy(true);
    try {
      const res = await adminApi.updateStaffNotifications(Object.fromEntries(Object.entries(kinds).map(([k, v]) => [k, v.roles])));
      setKinds(res.kinds);
      notify(t('adminMembers.settings.saved'));
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="azq-set is-col" aria-labelledby="set-ntf">
      <div className="azq-set-h">
        <span className="azq-tile" data-path="work" aria-hidden="true"><Bell /></span>
        <div><h3 id="set-ntf">{t('adminMembers.settings.notifications')}</h3><p>{t('adminMembers.settings.notificationsLead')}</p></div>
      </div>
      {error && <ErrorState error={error} />}
      {kinds && (
        <>
          {Object.entries(kinds).map(([kind, spec]) => (
            <fieldset key={kind} className="azq-set-row">
              <legend>{t(`adminMembers.settings.kind.${kind}`)}</legend>
              <div className="azq-toolbar">
                {spec.allowed.map((role) => (
                  <label key={role} className="azq-chk">
                    <input type="checkbox" checked={spec.roles.includes(role)} onChange={() => toggle(kind, role)} />
                    {t(roleLabelKey(role))}
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <div><Button size="sm" onClick={save} loading={busy}>{t('adminMembers.settings.save')}</Button></div>
        </>
      )}
    </section>
  );
}
