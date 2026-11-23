import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useLanguage } from '../../i18n/LanguageContext';
import * as adminApi from '../../api/admin';
import { trackLabel } from '../../utils/apiMappers';
import ErrorState from '../../components/common/ErrorState';
import ChartTable from '../../components/Admin/ChartTable';

/**
 * «الإحصاءات والتقارير» قسمًا في الرئيسية (قرار أمجد أ، 12 نوفمبر): رسما صفحة الإحصاءات السابقة بلا «معدّل التفاعل»
 * (القرار 6). لكل رسم مدّته ومصدره، وجدول بديل للقارئ الآلي. اختيار المدة (7/30/90 يومًا) يحتاج نقطة خادم بتواريخ
 * يومية، فيأتي مع المرحلة 2.
 */
export default function AdminStatsSection() {
  const { t, lang } = useLanguage();
  const [monthly, setMonthly] = useState([]);
  const [byTrack, setByTrack] = useState([]);
  const [error, setError] = useState(null);

  // إعادة المحاولة تزيد المفتاح فيُعاد الجلب
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    Promise.all([adminApi.getMonthlyActivity(), adminApi.getProjectsByTrack()])
      .then(([m, tr]) => {
        if (!alive) return;
        setMonthly((m || []).map((x) => ({ month: x.month, activities: x.activities, newUsers: x.newUsers })));
        setByTrack((tr || []).map((x) => ({ name: trackLabel(x.track, lang), value: x.count })));
        setError(null);
      })
      .catch((err) => { if (alive) setError(err); });
    return () => { alive = false; };
  }, [lang, attempt]);

  return (
    <section id="stats" className="azq-stats" aria-labelledby="azq-stats-h">
      <div className="azq-hsec">
        <h3 id="azq-stats-h">{t('adminShell.stats.title')}</h3>
        <p>{t('adminShell.stats.lead')}</p>
        <Link className="azq-btn-ghost" to="/admin/analytics">{t('adminShell.stats.analyticsLink')}</Link>
      </div>
      {error && <ErrorState error={error} onRetry={() => setAttempt((n) => n + 1)} />}
      <div className="azq-charts">
        <div className="azq-card azq-chart">
          <div className="azq-card-h">
            <div>
              <h4>{t('adminApi.monthlyActivity')}</h4>
              <span className="azq-card-sub">{t('adminShell.stats.monthlySub')}</span>
            </div>
          </div>
          <div className="azq-chart-body">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="activities" name={t('adminApi.activities')} fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="newUsers" name={t('adminApi.newUsers')} fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <ChartTable
              caption={t('azraqAdmin.chartData', { title: t('adminApi.monthlyActivity') })}
              columns={[{ key: 'month', label: t('azraqAdmin.month') }, { key: 'activities', label: t('adminApi.activities') }, { key: 'newUsers', label: t('adminApi.newUsers') }]}
              rows={monthly}
            />
          </div>
        </div>
        <div className="azq-card azq-chart">
          <div className="azq-card-h">
            <div>
              <h4>{t('adminApi.projectsByTrack')}</h4>
              <span className="azq-card-sub">{t('adminShell.stats.trackSub')}</span>
            </div>
          </div>
          <div className="azq-chart-body">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byTrack} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={110} />
                <Tooltip />
                <Bar dataKey="value" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <ChartTable
              caption={t('azraqAdmin.chartData', { title: t('adminApi.projectsByTrack') })}
              columns={[{ key: 'name', label: t('azraqAdmin.track') }, { key: 'value', label: t('adminApi.projectsByTrack') }]}
              rows={byTrack}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
