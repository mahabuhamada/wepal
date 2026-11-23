// المتن كتلًا (القرار 14 بعد تعديله): محرّر الكتل نفسه الذي في المنتدى (rich-text-editor.tsx) بألوان وي بال.
// شريط أدوات النص بترتيب المنتدى، و«إدراج» و«/» يفتحان مكتبة الكتل نفسها، والمقبض ينقل الكتلة ويكرّرها ويحذفها،
// ولصق رابط في سطر فارغ يصير بطاقة تضمين. لا ألوان ولا أحجام خط حرّة.
import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TableKit } from '@tiptap/extension-table';
import { Placeholder } from '@tiptap/extensions';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import { BLOCK_NODES, Separator, SETTINGS_BLOCKS } from './blockNodes';
import { BLOCKS, filterBlocks, groupBlocks } from './blockLibrary';
import { BlockControls } from './BlockControls';
import { fromServerDoc, toServerDoc } from '../../utils/editorState';

const isHttpsUrl = (text) => /^https:\/\/\S+$/i.test(text.trim());

/** موضع الكتلة رقم index في أعلى المستند. */
function blockPos(doc, index) {
  let pos = 0;
  for (let i = 0; i < index; i += 1) pos += doc.child(i).nodeSize;
  return pos;
}

export function topIndex(state) {
  return state.doc.resolve(Math.min(state.selection.from, state.doc.content.size)).index(0);
}

/** ينقل الكتلة الحالية للأعلى (-1) أو للأسفل (1). */
export function moveBlock(editor, dir) {
  const { state } = editor;
  const index = topIndex(state);
  const target = index + dir;
  if (target < 0 || target >= state.doc.childCount) return false;
  const node = state.doc.child(index);
  const from = blockPos(state.doc, index);
  const tr = state.tr.delete(from, from + node.nodeSize);
  const insertAt = dir < 0 ? blockPos(state.doc, target) : from + state.doc.child(target).nodeSize;
  tr.insert(insertAt, node);
  tr.setSelection(node.isAtom ? NodeSelection.create(tr.doc, insertAt) : TextSelection.near(tr.doc.resolve(insertAt + 1)));
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}

/** «انتقل» من الجاهزية: يحدّد الكتلة رقم n (يبدأ من 1) ويمرّر إليها. */
export function selectBlock(editor, n) {
  const { doc } = editor.state;
  const index = Math.max(0, Math.min(n - 1, doc.childCount - 1));
  const pos = blockPos(doc, index);
  const node = doc.child(index);
  const selection = node.isTextblock ? TextSelection.near(doc.resolve(pos + 1)) : NodeSelection.create(doc, pos);
  editor.chain().focus().command(({ tr }) => {
    tr.setSelection(selection).scrollIntoView();
    return true;
  }).run();
}

/** سطر فارغ في أعلى المستند يبقى مكان الكتلة الجديدة، وإلا تُضاف بعد الكتلة الحالية. */
function prepareInsert(editor) {
  const { state } = editor;
  const { $from } = state.selection;
  const emptyLine = !(state.selection instanceof NodeSelection) && $from.depth === 1 && $from.parent.type.name === 'paragraph' && $from.parent.content.size === 0;
  if (emptyLine) return;
  const index = topIndex(state);
  const after = state.doc.childCount ? blockPos(state.doc, index) + state.doc.child(index).nodeSize : 0;
  editor.chain().insertContentAt(after, { type: 'paragraph' }).setTextSelection(after + 1).run();
}

export function insertBlock(editor, content) {
  prepareInsert(editor);
  const start = editor.state.selection.$from.before(1);
  editor.chain().focus().insertContent(content).run();
  // كتلة فيها نص (ملاحظة، اقتباس، أسئلة): المؤشر في أول فقرة منها، لا بعدها
  const node = editor.state.doc.nodeAt(start);
  if (node && !node.isAtom && !node.isTextblock && node.content.size > 0) {
    editor.commands.setTextSelection(start + 2 + (node.type.name === 'faq' ? 1 : 0));
  }
}

function ToolButton({ label, active, disabled, onClick, children }) {
  return (
    <button type="button" className={`azq-ed-tool${active ? ' is-active' : ''}`} aria-label={label} title={label} aria-pressed={active ?? undefined} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      {children}
    </button>
  );
}

/** مكتبة الكتل بحقل بحث ومجموعات (تحت «إدراج»، أو عند «/»، أو ورقة سفلية على الهاتف). */
export function BlockPicker({ isStory, onPick, onClose }) {
  const [query, setQuery] = useState('');
  const input = useRef(null);
  useEffect(() => input.current?.focus(), []);
  const groups = groupBlocks(filterBlocks(query, { isStory }));
  return (
    <div className="azq-ed-picker" dir="rtl" role="dialog" aria-label="إدراج كتلة" onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <input ref={input} type="search" className="azq-ed-picker-search" placeholder="ابحث عن كتلة: صورة، زر، أسئلة…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className="azq-ed-picker-list">
        {groups.length === 0 && <p className="azq-ed-hint">لا كتلة بهذا الاسم.</p>}
        {groups.map((group) => (
          <section key={group.key}>
            <h3 className="azq-ed-picker-group">{group.label}</h3>
            {group.blocks.map((block) => (
              <button key={block.id} type="button" className={`azq-ed-picker-item azq-ed-group-${block.group}`} onClick={() => onPick(block)}>
                <span className="azq-ed-picker-icon" aria-hidden="true">{block.label.slice(0, 1)}</span>
                <span><strong>{block.label}</strong><small>{block.desc}</small></span>
              </button>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

/**
 * @param {object} props
 * @param {object} props.doc مستند الخادم (body بلغة المادة)
 * @param {(doc: object) => void} props.onChange مستند الخادم بعد كل تعديل
 * @param {'rtl'|'ltr'} props.dir اتجاه الحقول يتبع لغة المادة
 * @param {(block: object, editor: object) => void} props.onBlockAction صورة أو رابط أو إعدادات تحتاجها كتلة
 * @param {(name: string|null) => void} props.onSelectBlock الكتلة المحدّدة (لتبويب «الكتلة»)
 * @param {(url: string) => void} props.onPasteUrl رابط ملصق في سطر فارغ
 */
export function BlockEditor({ doc, onChange, dir, isStory, readOnly, onBlockAction, onSelectBlock, onPasteUrl, editorRef, onNotice }) {
  const [picker, setPicker] = useState(false);
  const [body, setBody] = useState(null);
  const callbacks = useRef({ onChange, onSelectBlock, onPasteUrl });
  useEffect(() => {
    callbacks.current = { onChange, onSelectBlock, onPasteUrl };
  });

  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        strike: false,
        underline: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: false, protocols: ['http', 'https', 'mailto', 'tel'], HTMLAttributes: { rel: 'noopener', target: null } },
      }),
      Separator,
      TableKit.configure({ table: { resizable: false } }),
      Placeholder.configure({ placeholder: 'اكتب، أو اضغط / لإضافة كتلة', showOnlyCurrent: true }),
      ...BLOCK_NODES,
    ],
    content: fromServerDoc(doc),
    editorProps: {
      attributes: { class: 'azq-ed-prose', dir, 'aria-label': 'المتن', 'aria-multiline': 'true', role: 'textbox' },
      handleKeyDown(view, event) {
        const { $from, empty } = view.state.selection;
        if (event.key === '/' && empty && $from.depth === 1 && $from.parent.type.name === 'paragraph' && $from.parent.content.size === 0) {
          event.preventDefault();
          setPicker(true);
          return true;
        }
        return false;
      },
      handlePaste(view, event) {
        const text = event.clipboardData?.getData('text/plain') ?? '';
        const { $from } = view.state.selection;
        if (isHttpsUrl(text) && $from.parent.type.name === 'paragraph' && $from.parent.content.size === 0) {
          callbacks.current.onPasteUrl?.(text.trim());
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => callbacks.current.onChange(toServerDoc(e.getJSON())),
    onSelectionUpdate: ({ editor: e }) => {
      const { selection } = e.state;
      const name = selection instanceof NodeSelection ? selection.node.type.name : null;
      callbacks.current.onSelectBlock?.(name && SETTINGS_BLOCKS.has(name) ? name : null);
    },
  });

  useImperativeHandle(editorRef, () => editor, [editor]);

  // نقل الكتلة بلوحة المفاتيح: Ctrl Alt Shift ↑/↓
  useEffect(() => {
    if (!editor) return undefined;
    const onKey = (e) => {
      if (e.ctrlKey && e.altKey && e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
        e.preventDefault();
        moveBlock(editor, e.key === 'ArrowUp' ? -1 : 1);
      }
    };
    const dom = editor.view.dom;
    dom.addEventListener('keydown', onKey);
    return () => dom.removeEventListener('keydown', onKey);
  }, [editor]);

  const pick = (block) => {
    setPicker(false);
    if (!editor) return;
    if (block.kind === 'command') {
      prepareInsert(editor);
      block.command(editor.chain().focus()).run();
    } else if (block.kind === 'insert' || block.kind === 'settings') {
      insertBlock(editor, block.content);
      if (block.kind === 'settings') onBlockAction?.({ type: 'settings' }, editor);
    } else {
      onBlockAction?.(block, editor);
    }
  };

  const link = () => {
    if (!editor) return;
    const previous = editor.getAttributes('link').href ?? '';
    // نافذة المتصفح البسيطة؛ الرابط يفحصه الخادم (http وhttps والبريد والهاتف والداخلية فقط)
    const href = window.prompt('الرابط', previous);
    if (href === null) return;
    if (href.trim() === '') editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange('link').setLink({ href: href.trim() }).run();
  };

  if (!editor) return <div className="azq-ed-prose azq-ed-loading" dir={dir}>…</div>;

  const inTable = editor.isActive('table');
  const blockType = editor.isActive('heading', { level: 2 }) ? 'h2' : editor.isActive('heading', { level: 3 }) ? 'h3' : 'p';

  return (
    <div className="azq-ed-body" ref={setBody}>
      {!readOnly && (
        // أدوات الواجهة بالعربية دائمًا (من اليمين)، والمتن وحده يتبع لغة المادة
        <div className="azq-ed-toolbar" dir="rtl" role="toolbar" aria-label="أدوات النص" onKeyDown={(e) => e.key === 'Escape' && editor.commands.focus()}>
          <button type="button" className="azq-ed-insert" aria-expanded={picker} onClick={() => setPicker((v) => !v)}>+ إدراج</button>
          <select className="azq-ed-blocktype" aria-label="نوع الفقرة" value={blockType} onChange={(e) => {
            const c = editor.chain().focus();
            (e.target.value === 'p' ? c.setParagraph() : c.setHeading({ level: e.target.value === 'h2' ? 2 : 3 })).run();
          }}>
            <option value="p">فقرة</option>
            <option value="h2">عنوان 2</option>
            <option value="h3">عنوان 3</option>
          </select>
          <span className="azq-ed-sep" aria-hidden="true" />
          <ToolButton label="غامق (Ctrl B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}><b>غ</b></ToolButton>
          <ToolButton label="مائل (Ctrl I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><i>م</i></ToolButton>
          <span className="azq-ed-sep" aria-hidden="true" />
          <ToolButton label="قائمة نقطية" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>•≡</ToolButton>
          <ToolButton label="قائمة مرقّمة" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1≡</ToolButton>
          <ToolButton label="اقتباس" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</ToolButton>
          <span className="azq-ed-sep" aria-hidden="true" />
          <ToolButton label="رابط (Ctrl K)" active={editor.isActive('link')} onClick={link}>🔗</ToolButton>
          <ToolButton label="صورة" onClick={() => pick(BLOCKS.find((b) => b.id === 'figure'))}>🖼</ToolButton>
          <ToolButton label="فيديو" onClick={() => pick(BLOCKS.find((b) => b.id === 'video'))}>▶</ToolButton>
          {inTable ? (
            <>
              <ToolButton label="إضافة صف" onClick={() => editor.chain().focus().addRowAfter().run()}>+صف</ToolButton>
              <ToolButton label="إضافة عمود" onClick={() => editor.chain().focus().addColumnAfter().run()}>+عمود</ToolButton>
              <ToolButton label="حذف الصف" onClick={() => editor.chain().focus().deleteRow().run()}>−صف</ToolButton>
              <ToolButton label="حذف العمود" onClick={() => editor.chain().focus().deleteColumn().run()}>−عمود</ToolButton>
              <ToolButton label="حذف الجدول" onClick={() => editor.chain().focus().deleteTable().run()}>×جدول</ToolButton>
            </>
          ) : (
            <ToolButton label="جدول 3×3" onClick={() => pick(BLOCKS.find((b) => b.id === 'table'))}>▦</ToolButton>
          )}
          <span className="azq-ed-grow" />
          <ToolButton label="نقل الكتلة للأعلى (Ctrl Alt Shift ↑)" onClick={() => moveBlock(editor, -1)}>↑</ToolButton>
          <ToolButton label="نقل الكتلة للأسفل (Ctrl Alt Shift ↓)" onClick={() => moveBlock(editor, 1)}>↓</ToolButton>
          <ToolButton label="تراجع (Ctrl Z)" disabled={!editor.can().undo()} onClick={() => editor.chain().focus().undo().run()}>↶</ToolButton>
          <ToolButton label="إعادة (Ctrl Shift Z)" disabled={!editor.can().redo()} onClick={() => editor.chain().focus().redo().run()}>↷</ToolButton>
        </div>
      )}
      {picker && <BlockPicker isStory={isStory} onPick={pick} onClose={() => { setPicker(false); editor.commands.focus(); }} />}
      {!readOnly && (
        <BlockControls editor={editor} container={body} onInsert={() => setPicker(true)}
          onSettings={() => onBlockAction?.({ type: 'settings' }, editor)}
          onDeleted={() => onNotice?.({ tone: 'info', text: 'حُذفت الكتلة.', undo: () => editor.chain().focus().undo().run() })} />
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
