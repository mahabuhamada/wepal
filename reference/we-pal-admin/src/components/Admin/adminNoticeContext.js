import { createContext, useContext } from 'react';

// سياق إعلان نتائج الإجراءات في لوحة الإدارة (AdminNotice.jsx يملكه ويعرضه).
export const NoticeContext = createContext({ notify: () => {}, notice: null, dismiss: () => {} });

/** يُرجع notify(text, {undo}?): يعلن نتيجة إجراء، ومعه «تراجع» إن أُعطي undo. خارج القشرة (اختبارات صفحة منفردة) لا يفعل شيئًا. */
export const useAdminNotice = () => useContext(NoticeContext).notify;
