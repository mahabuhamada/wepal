// البديل النصّي لرسم بياني في لوحة الإدارة: جدول مخفي بصريًا يقرؤه قارئ الشاشة (الرسم وحده صورة لا تُقرأ).
//   caption: عنوان الرسم. columns: [{ key, label }] — العمود الأول رأس الصف (الشهر، المنطقة…). rows: البيانات نفسها.
// الإخفاء على غلاف div لا على الجدول: الجداول لا تتقلّص إلى 1px، فكان الجدول المخفي يطيل الصفحة ويوسّعها.
export default function ChartTable({ caption, columns, rows }) {
  return (
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            {columns.map((col) => <th key={col.key} scope="col">{col.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row[columns[0].key] ?? i}>
              {columns.map((col, j) => (j === 0
                ? <th key={col.key} scope="row">{row[col.key]}</th>
                : <td key={col.key}>{row[col.key] ?? 0}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
