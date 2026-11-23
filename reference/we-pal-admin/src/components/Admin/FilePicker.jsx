import { useId, useState } from 'react';

// منتقي ملف بالعربية بدل «Choose File / No file chosen» الإنجليزية: حقل مخفي بصريًا داخل تسمية بإطار متقطّع،
// ويقبل السحب والإفلات. التحقق من الصيغة يبقى على الخادم كما كان.
const EXT_LABEL = { '.csv': 'CSV', '.xlsx': 'Excel' };

function acceptedFormats(accept) {
  const names = [...new Set(accept.split(',').map((s) => s.trim()).map((s) => EXT_LABEL[s]).filter(Boolean))];
  return names.join(' أو ');
}

export default function FilePicker({ file, onPick, accept, hint, id }) {
  const auto = useId();
  const [over, setOver] = useState(false);
  const formats = hint ?? (accept ? `الصيغ المقبولة: ${acceptedFormats(accept)}` : '');
  return (
    <label
      htmlFor={id ?? auto}
      className={`flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-5 text-center text-sm cursor-pointer text-[var(--wp-text-2)] focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 ${over ? 'border-[var(--wp-text-2)]' : 'border-[var(--wp-border)]'}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const dropped = e.dataTransfer?.files?.[0]; if (dropped) onPick(dropped); }}
    >
      <input
        id={id ?? auto}
        type="file"
        className="sr-only"
        accept={accept}
        onChange={(e) => { onPick(e.target.files?.[0] ?? null); e.target.value = ''; }}
      />
      {file
        ? <span><strong dir="auto" className="break-all">{file.name}</strong> <span className="underline underline-offset-4">تغيير الملف</span></span>
        : <strong className="font-semibold">اختر ملفًا أو اسحبه إلى هنا</strong>}
      {formats && <small className="text-xs text-[var(--wp-text-muted)]">{formats}</small>}
    </label>
  );
}
