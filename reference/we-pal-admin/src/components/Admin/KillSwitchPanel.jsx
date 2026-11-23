import { useEffect, useState } from 'react';
import { Power } from 'lucide-react';
import Card from '../common/Card';
import FadeIn from '../common/FadeIn';
import { useLanguage } from '../../i18n/LanguageContext';
import { useAuth } from '../../auth/AuthContext';
import { hasPermission } from '../../utils/roles';
import * as adminApi from '../../api/admin';
import { useAdminNotice } from './adminNoticeContext';

const PURGE_SCOPES = ['activities', 'notifications', 'comments'];

/**
 * مفتاح الطوارئ: وضع الصيانة والحذف الطارئ، للمدير العام وحده (القرار 1). كان على رئيسية الإدارة،
 * وانتقل في «أزرق هادئ» إلى صفحة «الأمان» (القرار 12: لا زرّ خطِر على الصفحة الأولى). نفس الشكل في الموضعين.
 */
export default function KillSwitchPanel({ onPurged }) {
  const { t } = useLanguage();
  const notify = useAdminNotice();
  const { user } = useAuth();
  const canMaintain = hasPermission(user, 'system.maintenance');
  const canPurge = hasPermission(user, 'security.purge');

  // مفتاح الطوارئ — الحالة تُقرأ من GET /admin/maintenance ثم تُتتبّع بعد كل تبديل.
  const [maintOn, setMaintOn] = useState(null); // null = غير معروف
  const [maintBusy, setMaintBusy] = useState(false);
  const [maintMsg, setMaintMsg] = useState('');

  // حوار الحذف النهائي.
  const [purgePhrase, setPurgePhrase] = useState('');
  const [purgeScopes, setPurgeScopes] = useState([]);
  const [purgeBusy, setPurgeBusy] = useState(false);
  const [purgeError, setPurgeError] = useState('');
  const [purgeResult, setPurgeResult] = useState(null);

  // حالة الصيانة الحالية من الخادم (B4.3) بدل «غير معروفة» حتى أول ضغطة.
  useEffect(() => {
    if (!canMaintain) return undefined;
    let active = true;
    adminApi.getMaintenance()
      .then((res) => { if (active && typeof res?.maintenance === 'boolean') setMaintOn(res.maintenance); })
      .catch(() => {});
    return () => { active = false; };
  }, [canMaintain]);

  const toggleMaintenance = async (on) => {
    setMaintBusy(true);
    setMaintMsg('');
    try {
      await adminApi.setMaintenance(on);
      setMaintOn(on);
      notify(t(on ? 'azraqAdmin.notice.maintenanceOn' : 'azraqAdmin.notice.maintenanceOff'));
    } catch (err) {
      setMaintMsg(err.message || t('common.loadError'));
    } finally {
      setMaintBusy(false);
    }
  };

  const toggleScope = (scope) => {
    setPurgeScopes((list) => (list.includes(scope) ? list.filter((s) => s !== scope) : [...list, scope]));
  };

  const doPurge = async () => {
    setPurgeBusy(true);
    setPurgeError('');
    setPurgeResult(null);
    try {
      const res = await adminApi.purge(purgePhrase, purgeScopes);
      setPurgeResult(res);
      setPurgePhrase('');
      setPurgeScopes([]);
      // إعادة تحميل الإحصائيات لتعكس الحذف.
      onPurged?.();
    } catch (err) {
      setPurgeError(err.message || t('common.loadError'));
    } finally {
      setPurgeBusy(false);
    }
  };

  if (!canMaintain && !canPurge) return null;

  return (
        <FadeIn delay={0.2}>
          <Card className="border-[#F0DAD6]">
            <div className="flex items-center gap-2 mb-4">
              <Power size={18} className="text-[var(--wp-coral-deep)]" />
              <h2 className="text-base font-bold text-[var(--wp-coral-deep)]">{t('adminApi.killSwitch')}</h2>
            </div>

            {/* وضع الصيانة */}
            {canMaintain && (
            <div className="rounded-2xl border border-[var(--wp-border)] p-4 mb-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="text-sm font-semibold text-[var(--wp-text)]">{t('adminApi.maintenance')}</div>
                  <div className="text-xs text-[var(--wp-text-muted)]">{t('adminApi.maintenanceHint')}</div>
                  <div className="text-xs mt-1 font-semibold text-[var(--wp-text-3)]">
                    {maintOn === null ? t('adminApi.maintenanceStateUnknown') : maintOn ? t('adminApi.maintenanceStateOn') : t('adminApi.maintenanceStateOff')}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleMaintenance(true)}
                    disabled={maintBusy || maintOn === true}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--wp-warning-tint)] text-[var(--wp-warning)] disabled:opacity-50 hover:opacity-90 transition-opacity"
                  >
                    {t('adminApi.maintenanceOn')}
                  </button>
                  <button
                    onClick={() => toggleMaintenance(false)}
                    disabled={maintBusy || maintOn === false}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--wp-success-tint)] text-[var(--wp-success)] disabled:opacity-50 hover:opacity-90 transition-opacity"
                  >
                    {t('adminApi.maintenanceOff')}
                  </button>
                </div>
              </div>
              {maintMsg && <div role="alert" className="text-xs text-[var(--wp-coral-deep)] mt-2">{maintMsg}</div>}
            </div>
            )}

            {/* الحذف النهائي */}
            {canPurge && (
            <div className="rounded-2xl border border-[#F0DAD6] bg-[var(--wp-coral-wash)] p-4">
              <div className="text-sm font-bold text-[var(--wp-coral-deep)] mb-1">{t('adminApi.purgeTitle')}</div>
              <div className="text-xs text-[var(--wp-text-3)] mb-3">{t('adminApi.purgeHint')}</div>

              <div className="text-xs font-semibold text-[var(--wp-text-2)] mb-1.5">{t('adminApi.scopes')}</div>
              <div className="flex flex-wrap gap-3 mb-3">
                {PURGE_SCOPES.map((scope) => (
                  <label key={scope} className="flex items-center gap-1.5 text-xs text-[var(--wp-text-2)] cursor-pointer">
                    <input type="checkbox" checked={purgeScopes.includes(scope)} onChange={() => toggleScope(scope)} className="accent-[var(--wp-coral-deep)]" />
                    {t(`adminApi.purgeScopes.${scope}`)}
                  </label>
                ))}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  value={purgePhrase}
                  onChange={(e) => setPurgePhrase(e.target.value)}
                  placeholder={t('adminApi.purgePhrasePlaceholder')}
                  className="wp-input px-3 py-2 text-sm flex-1 min-w-[160px]"
                />
                <button
                  onClick={doPurge}
                  disabled={purgeBusy || !purgePhrase || purgeScopes.length === 0}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[var(--wp-coral-deep)] text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
                >
                  {purgeBusy ? t('common.saving') : t('adminApi.purgeConfirm')}
                </button>
              </div>

              {purgeError && <div role="alert" className="text-xs text-[var(--wp-coral-deep)] mt-2 font-semibold">{purgeError}</div>}
              {purgeResult && (
                <div role="status" className="text-xs text-[var(--wp-success)] mt-2">
                  {t('adminApi.purgeDone')}: {Object.entries(purgeResult).filter(([k]) => k !== 'success' && k !== 'confirm').map(([k, v]) => `${PURGE_SCOPES.includes(k) ? t(`adminApi.purgeScopes.${k}`) : k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ') || '✓'}
                </div>
              )}
            </div>
            )}
          </Card>
        </FadeIn>
  );
}
