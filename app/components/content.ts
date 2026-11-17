import { BookHeart, Info, Layers3, Library, Newspaper, PenLine, Sparkles } from "lucide-react";

export type Lang = "ar" | "en";
export type T = { ar: string; en: string };
export const L = (ar: string, en: string): T => ({ ar, en });

export const NAV = [
  { href: "/", icon: Sparkles, label: L("الرئيسية", "Home") },
  { href: "/news", icon: Newspaper, label: L("الأخبار", "News") },
  { href: "/library", icon: Library, label: L("المكتبة", "Library") },
  { href: "/blog", icon: PenLine, label: L("تحليلات", "Analysis") },
  { href: "/outputs", icon: Layers3, label: L("المخرجات", "Outputs") },
  { href: "/stories", icon: BookHeart, label: L("القصص", "Stories") },
  { href: "/about", icon: Info, label: L("عن المنصة", "About") },
];

export const EXTRA_PAGES = [
  { href: "/help", label: L("المساعدة", "Help") },
  { href: "/contact", label: L("تواصل معنا", "Contact") },
  { href: "/map", label: L("عالم المنتدى", "Ecosystem") },
  { href: "/login", label: L("دخول الأعضاء", "Member login") },
];

export type NewsCat = "public" | "dialogue" | "youth" | "culture" | "palestine";
export const NEWS_FILTERS: { id: "all" | NewsCat; label: T }[] = [
  { id: "all", label: L("الكل", "All") },
  { id: "public", label: L("شأن عام", "Public affairs") },
  { id: "dialogue", label: L("حوار", "Dialogue") },
  { id: "youth", label: L("شباب", "Youth") },
  { id: "culture", label: L("ثقافة", "Culture") },
  { id: "palestine", label: L("فلسطين", "Palestine") },
];
export const NEWS: { cat: NewsCat; img: string; kind: T; title: T; text: T }[] = [
  { cat: "public", img: "/images/nablus.webp", kind: L("ملف متجدد", "Living file"), title: L("كيف نصنع مساحة عامة تسمح بالسؤال قبل الحكم؟", "How do we make room for questions before judgment?"), text: L("قراءة تضع القضية في سياقها وتجمع أبرز الأسئلة والمصادر المرتبطة بها.", "A contextual reading gathering key questions and related sources.") },
  { cat: "culture", img: "/images/library.webp", kind: L("قراءة", "Reading"), title: L("المكتبة الوطنية: ذاكرة حيّة تتسع للأجيال", "The national library: a living memory for generations"), text: L("كيف تتحول الذاكرة المكتوبة إلى مساحة مشتركة؟", "How written memory becomes a shared space.") },
  { cat: "youth", img: "/images/facilitators.webp", kind: L("تقرير", "Report"), title: L("المشاركة الشبابية: من الحضور إلى التأثير", "Youth participation: from presence to influence"), text: L("تجارب ميدانية تُظهر ما الذي يجعل المشاركة فاعلة.", "Field experiences showing what makes participation effective.") },
  { cat: "palestine", img: "/images/gaza.webp", kind: L("قصة بصرية", "Visual story"), title: L("غزة التي نعرفها: المدينة والناس وما يبقى", "The Gaza we know: the city, its people and what remains"), text: L("المدينة كما يرويها أهلها.", "The city as told by its people.") },
  { cat: "dialogue", img: "/images/nablus.webp", kind: L("تحليل", "Analysis"), title: L("الاستماع بوصفه أداةً لبناء الثقة", "Listening as a tool for building trust"), text: L("لماذا يبدأ الحوار الجاد من الإصغاء؟", "Why serious dialogue starts with listening.") },
  { cat: "public", img: "/images/library.webp", kind: L("مختارات", "Selection"), title: L("خمسة مداخل لفهم الشأن العام", "Five ways into understanding public affairs"), text: L("دليل مختصر للبدء من المصادر الصحيحة.", "A short guide to starting from the right sources.") },
];

export type ResType = "study" | "guide" | "policy" | "video" | "report" | "tool";
export const RES_TYPES: { id: "all" | ResType; label: T }[] = [
  { id: "all", label: L("الكل", "All") }, { id: "study", label: L("دراسات", "Studies") }, { id: "guide", label: L("أدلة", "Guides") },
  { id: "policy", label: L("أوراق سياسات", "Policy papers") }, { id: "report", label: L("تقارير", "Reports") }, { id: "video", label: L("فيديو", "Video") }, { id: "tool", label: L("أدوات", "Tools") },
];
export const RESOURCES: { type: ResType; title: T; meta: T }[] = [
  { type: "study", title: L("الحوار المجتمعي وبناء الثقة", "Community dialogue and building trust"), meta: L("ملف مرجعي · PDF", "Reference file · PDF") },
  { type: "guide", title: L("أدوات تيسير النقاش العام", "Tools for facilitating public discussion"), meta: L("دليل عملي · 24 صفحة", "Practical guide · 24 pages") },
  { type: "policy", title: L("الشباب والمشاركة في الشأن العام", "Youth and public participation"), meta: L("قراءة تحليلية", "Analytical reading") },
  { type: "video", title: L("مشاركة الشباب في الانتخابات المحلية", "Youth participation in local elections"), meta: L("فيديو · 18 دقيقة", "Video · 18 minutes") },
  { type: "report", title: L("تجارب المصالحة والحوار: دروس ومقاربات", "Dialogue and reconciliation: lessons and approaches"), meta: L("تقرير موضوعي", "Thematic report") },
  { type: "tool", title: L("بطاقات أسئلة لفتح نقاش مجتمعي", "Question cards for community dialogue"), meta: L("أداة قابلة للطباعة", "Printable resource") },
];
