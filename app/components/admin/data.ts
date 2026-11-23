// Sample data for the admin panel (illustrative; no real people). Replaced by the platform API later.
import type { T } from "../content";
import { MEMBERS } from "../member/data";

const L = (ar: string, en: string): T => ({ ar, en });

/** Where members live: Palestinian governorates with their centre point. */
export type Region = { key: string; name: T; area: "wb" | "gaza" | "48"; lon: number; lat: number; members: number };
export const REGIONS: Region[] = [
  { key: "jenin", name: L("جنين", "Jenin"), area: "wb", lon: 35.30, lat: 32.46, members: 96 },
  { key: "tubas", name: L("طوباس", "Tubas"), area: "wb", lon: 35.37, lat: 32.32, members: 21 },
  { key: "tulkarm", name: L("طولكرم", "Tulkarm"), area: "wb", lon: 35.03, lat: 32.31, members: 74 },
  { key: "nablus", name: L("نابلس", "Nablus"), area: "wb", lon: 35.26, lat: 32.22, members: 158 },
  { key: "qalqilya", name: L("قلقيلية", "Qalqilya"), area: "wb", lon: 34.98, lat: 32.19, members: 33 },
  { key: "salfit", name: L("سلفيت", "Salfit"), area: "wb", lon: 35.18, lat: 32.08, members: 18 },
  { key: "ramallah", name: L("رام الله والبيرة", "Ramallah & al-Bireh"), area: "wb", lon: 35.20, lat: 31.90, members: 231 },
  { key: "jericho", name: L("أريحا والأغوار", "Jericho"), area: "wb", lon: 35.45, lat: 31.86, members: 27 },
  { key: "jerusalem", name: L("القدس", "Jerusalem"), area: "wb", lon: 35.23, lat: 31.77, members: 112 },
  { key: "bethlehem", name: L("بيت لحم", "Bethlehem"), area: "wb", lon: 35.20, lat: 31.70, members: 88 },
  { key: "hebron", name: L("الخليل", "Hebron"), area: "wb", lon: 35.10, lat: 31.53, members: 143 },
  { key: "north-gaza", name: L("شمال غزة", "North Gaza"), area: "gaza", lon: 34.50, lat: 31.54, members: 41 },
  { key: "gaza", name: L("غزة", "Gaza"), area: "gaza", lon: 34.46, lat: 31.50, members: 129 },
  { key: "deir-al-balah", name: L("دير البلح", "Deir al-Balah"), area: "gaza", lon: 34.35, lat: 31.42, members: 52 },
  { key: "khan-younis", name: L("خانيونس", "Khan Younis"), area: "gaza", lon: 34.30, lat: 31.34, members: 63 },
  { key: "rafah", name: L("رفح", "Rafah"), area: "gaza", lon: 34.25, lat: 31.29, members: 29 },
  { key: "inside", name: L("الداخل المحتل", "Inside the Green Line"), area: "48", lon: 35.30, lat: 32.70, members: 37 },
];
export const ABROAD = 32;
export const MEMBERS_TOTAL = REGIONS.reduce((n, r) => n + r.members, 0) + ABROAD;

const REGION_BY_CITY: Record<string, string> = {
  "نابلس": "nablus", "غزة": "gaza", "الخليل": "hebron", "جنين": "jenin", "بيت لحم": "bethlehem", "طولكرم": "tulkarm", "رام الله": "ramallah", "أريحا": "jericho", "القدس": "jerusalem",
};

export type Status = "active" | "new" | "suspended";
export type AdminUser = {
  id: string; name: T; avatar?: number; region: string; role: "member" | "moderator" | "admin"; status: Status;
  joined: string; lastSeen: T; workspaces: T[]; groups: T[]; proposals: { title: T; status: T }[];
  interactions: { posts: number; comments: number; reactions: number; votes: number }; badges: T[];
};

const WS = [L("خريطة مساحات الحوار المحلية", "Local dialogue spaces map"), L("سلسلة «اقرأ الخبر»", "“Read the news” series"), L("دليل الحوار للمدارس", "A dialogue guide for schools"), L("بودكاست الأجيال", "Generations podcast")];
const GR = [L("حوار الضفة الشمالية", "Northern West Bank dialogue"), L("صنّاع المحتوى", "Content makers"), L("باحثو المصالحة", "Reconciliation researchers"), L("مبادرو الجامعات", "University initiators")];
const BADGES = [L("مُحاور نشط", "Active voice"), L("أول مقترح", "First proposal"), L("صانع محتوى", "Content maker"), L("داعم المشاورات", "Consultation backer"), L("مُيسّر", "Facilitator")];
const PROPOSALS = [
  { title: L("دليل الحوار للمدارس", "A dialogue guide for schools"), status: L("قيد المراجعة", "In review") },
  { title: L("أرشيف المبادرات الشبابية", "Youth initiatives archive"), status: L("مقبول", "Accepted") },
  { title: L("جلسات استماع في المخيمات", "Listening sessions in camps"), status: L("مسودة", "Draft") },
];
const SEEN = [L("الآن", "Now"), L("قبل ساعة", "1 hour ago"), L("اليوم", "Today"), L("أمس", "Yesterday"), L("قبل 3 أيام", "3 days ago"), L("قبل أسبوع", "A week ago")];

export const USERS: AdminUser[] = MEMBERS.map((m, i) => ({
  id: m.id, name: m.name, avatar: m.avatar, region: REGION_BY_CITY[m.city.ar] ?? "ramallah",
  role: i === 0 ? "moderator" : "member", status: i === 5 ? "new" : i === 7 ? "suspended" : "active",
  joined: ["2026-02-11", "2026-03-04", "2026-03-20", "2026-04-02", "2026-05-17", "2026-10-30", "2026-06-08", "2026-07-22", "2026-08-14"][i % 9],
  lastSeen: SEEN[i % SEEN.length],
  workspaces: WS.filter((_, k) => (i + k) % 3 !== 0).slice(0, 1 + (i % 3)),
  groups: GR.filter((_, k) => (i + k) % 2 === 0),
  proposals: PROPOSALS.slice(0, i % 4),
  interactions: { posts: 4 + ((i * 7) % 23), comments: 11 + ((i * 13) % 61), reactions: 30 + ((i * 29) % 140), votes: 1 + (i % 6) },
  badges: BADGES.filter((_, k) => (i + k) % 3 === 0),
}));

export type Report = {
  id: string; reason: T; target: { kind: T; excerpt: T; where: T }; reported: string; by: string; when: T; count: number;
};
export const REPORTS: Report[] = [
  { id: "r1", reason: L("إساءة أو تنمّر", "Abuse or bullying"), reported: "m3", by: "m6", when: L("قبل 6 ساعات", "6 hours ago"), count: 3,
    target: { kind: L("تعليق", "Comment"), excerpt: L("«هذا الكلام لا يقوله إلا من لا يفهم شيئًا…»", "“Only someone who understands nothing would say this…”"), where: L("حوار الضفة الشمالية", "Northern West Bank dialogue") } },
  { id: "r2", reason: L("معلومات مضلّلة", "Misleading information"), reported: "m5", by: "m1", when: L("قبل 9 ساعات", "9 hours ago"), count: 1,
    target: { kind: L("منشور", "Post"), excerpt: L("«نتائج الاستطلاع حُسمت مسبقًا ولا داعي للتصويت»", "“The survey results were decided in advance; no need to vote”"), where: L("صنّاع المحتوى", "Content makers") } },
  { id: "r3", reason: L("محتوى خارج الموضوع", "Off-topic"), reported: "m7", by: "m4", when: L("أمس", "Yesterday"), count: 1,
    target: { kind: L("رسالة", "Message"), excerpt: L("رابط ترويجي متكرر في محادثة المساحة", "A repeated promotional link in the workspace chat"), where: L("سلسلة «اقرأ الخبر»", "“Read the news” series") } },
  { id: "r4", reason: L("خطاب كراهية", "Hate speech"), reported: "m8", by: "m2", when: L("أمس", "Yesterday"), count: 2,
    target: { kind: L("تعليق", "Comment"), excerpt: L("تعليق يعمّم على أهل منطقة كاملة", "A comment generalising about a whole region's people"), where: L("باحثو المصالحة", "Reconciliation researchers") } },
];
