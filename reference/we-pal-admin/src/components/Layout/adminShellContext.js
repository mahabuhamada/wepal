import { createContext, useContext } from 'react';

// حالة قشرة الإدارة في السمة «أزرق هادئ»: القائمة على الجوال يفتحها الشريط العلوي (في كل صفحة) وتملكها القشرة،
// ولوحة الأوامر (Ctrl K)، وملخّص GET /admin/summary الذي يتشاركه الشريط الجانبي (العدّادات) والجرس والرئيسية.
// خارج القشرة لا قائمة ولا لوحة، فلا يظهر زرّاهما.
export const AdminShellContext = createContext({
  menuOpen: false,
  openMenu: null,
  closeMenu: null,
  menuButtonRef: null,
  openPalette: null,
  summary: null,
  summaryError: null,
  reloadSummary: null,
  summaryDays: 30,
  setSummaryDays: null,
});

export const useAdminShell = () => useContext(AdminShellContext);
