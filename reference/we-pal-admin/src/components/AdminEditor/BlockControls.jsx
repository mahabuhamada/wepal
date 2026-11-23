// أدوات الكتلة في الهامش (block-controls.tsx في المنتدى): «+» للسطر الفارغ، ومقبض للكتلة التي فيها محتوى يُسحب لتحريكها
// أو يُضغط لقائمة: نقل للأعلى، ونقل للأسفل، والإعدادات، وتكرار، وحذف (بـ«تراجع»). وتختفي بعد 300ms من خروج المؤشر.
import { useEffect, useRef, useState } from 'react';
import { NodeSelection } from '@tiptap/pm/state';
import { moveBlock } from './BlockEditor';

const HIDE_MS = 300;

function blockAt(view, index) {
  let pos = 0;
  for (let i = 0; i < index; i += 1) pos += view.state.doc.child(i).nodeSize;
  return { pos, node: view.state.doc.child(index), dom: view.nodeDOM(pos) };
}

/** كما في ProseMirror نفسه: السحب ينقل الكتلة المحدّدة، والإفلات يضعها حيث يُفلت. */
function startMove(view, slice) {
  view.dragging = { slice, move: true };
}

function selectBlockAt(editor, pos) {
  editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, pos)));
}

export function BlockControls({ editor, container, onInsert, onSettings, onDeleted }) {
  const [hover, setHover] = useState(null); // { index, top, empty }
  const [menu, setMenu] = useState(false);
  const hideTimer = useRef(null);

  useEffect(() => {
    if (!editor || !container) return undefined;
    const dom = editor.view.dom;
    const onMove = (e) => {
      window.clearTimeout(hideTimer.current);
      const found = editor.view.posAtCoords({ left: e.clientX, top: e.clientY });
      if (!found) return;
      const index = editor.state.doc.resolve(Math.min(found.pos, editor.state.doc.content.size)).index(0);
      if (index >= editor.state.doc.childCount) return;
      const { node, dom: el } = blockAt(editor.view, index);
      if (!(el instanceof HTMLElement)) return;
      const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top;
      setHover((h) => (h && h.index === index && h.top === top ? h : { index, top, empty: node.type.name === 'paragraph' && node.content.size === 0 }));
    };
    const onLeave = () => {
      hideTimer.current = window.setTimeout(() => { setHover(null); setMenu(false); }, HIDE_MS);
    };
    dom.addEventListener('mousemove', onMove);
    dom.addEventListener('mouseleave', onLeave);
    return () => {
      dom.removeEventListener('mousemove', onMove);
      dom.removeEventListener('mouseleave', onLeave);
      window.clearTimeout(hideTimer.current);
    };
  }, [editor, container]);

  if (!editor || !hover || hover.index >= editor.state.doc.childCount) return null;

  const keep = () => window.clearTimeout(hideTimer.current);
  const leave = () => { hideTimer.current = window.setTimeout(() => { setHover(null); setMenu(false); }, HIDE_MS); };
  const target = () => blockAt(editor.view, hover.index);

  const onDragStart = (e) => {
    const { pos, dom } = target();
    selectBlockAt(editor, pos);
    const selection = editor.state.selection;
    startMove(editor.view, selection.content());
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    if (dom instanceof HTMLElement) e.dataTransfer.setDragImage(dom, 0, 0);
    setMenu(false);
  };

  const act = (fn) => () => {
    const { pos } = target();
    selectBlockAt(editor, pos);
    fn(pos);
    setMenu(false);
  };

  return (
    <div className="azq-ed-controls" style={{ top: hover.top }} onMouseEnter={keep} onMouseLeave={leave}>
      {hover.empty ? (
        <button type="button" className="azq-ed-control" aria-label="إضافة كتلة" title="إضافة كتلة" onClick={() => { const { pos } = target(); editor.chain().focus().setTextSelection(pos + 1).run(); onInsert(); }}>+</button>
      ) : (
        <button type="button" className="azq-ed-control azq-ed-handle" draggable onDragStart={onDragStart} aria-haspopup="menu" aria-expanded={menu}
          aria-label="الكتلة: اسحب لتحريكها أو اضغط للأفعال" title="اسحب لتحريك الكتلة، أو اضغط للأفعال" onClick={() => setMenu((v) => !v)}>⋮⋮</button>
      )}
      {menu && (
        <div className="azq-ed-menu azq-ed-controls-menu" dir="rtl" role="menu">
          <button type="button" role="menuitem" onClick={act(() => moveBlock(editor, -1))}>نقل للأعلى <kbd>Ctrl Alt Shift ↑</kbd></button>
          <button type="button" role="menuitem" onClick={act(() => moveBlock(editor, 1))}>نقل للأسفل <kbd>Ctrl Alt Shift ↓</kbd></button>
          <button type="button" role="menuitem" onClick={act(() => onSettings())}>الإعدادات</button>
          <button type="button" role="menuitem" onClick={act((pos) => {
            const node = editor.state.doc.nodeAt(pos);
            editor.chain().focus().insertContentAt(pos + node.nodeSize, node.toJSON()).run();
          })}>تكرار</button>
          <button type="button" role="menuitem" className="azq-ed-link-danger" onClick={act(() => {
            editor.chain().focus().deleteSelection().run();
            onDeleted();
          })}>حذف</button>
        </div>
      )}
    </div>
  );
}
