"use client";

import { useState } from "react";
import { ChevronDown, FileText, Headphones, Image as ImageIcon, PlayCircle } from "lucide-react";
import { ACard, useAdmin } from "./shell";
import { biText, type Bi, type Item } from "./collection";
import { USERS } from "./data";
import { Avatar } from "./users";

/** Arabic / English switch for previews: each language is shown on its own, as the site shows it. */
function LangSwitch({ lang, set }: { lang: "ar" | "en"; set: (l: "ar" | "en") => void }) {
  return <div className="a-seg a-langseg" role="group"><button type="button" aria-pressed={lang === "ar"} onClick={() => set("ar")}>العربية</button><button type="button" aria-pressed={lang === "en"} onClick={() => set("en")}>English</button></div>;
}
const missing = (l: "ar" | "en") => (l === "ar" ? "لا نصّ عربي بعد." : "No English version yet.");

export function youtubeId(url: string) {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
  return m ? m[1] : null;
}

/** A media file, embedded like on the site: YouTube plays in place, audio gets a player, images a gallery, documents a card. */
export function Media({ url, kind }: { url: string; kind: string }) {
  const { rtl } = useAdmin();
  if (!url) return <div className="a-media-empty"><FileText aria-hidden="true" />{rtl ? "لم يُرفع ملف لهذه اللغة." : "No file for this language."}</div>;
  const yt = youtubeId(url);
  if (yt) return <div className="a-video"><iframe src={`https://www.youtube-nocookie.com/embed/${yt}`} title="video" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen /></div>;
  if (/\.(mp3|m4a|wav|ogg)(\?|$)/i.test(url) || kind === "podcast") return <div className="a-audio"><Headphones aria-hidden="true" /><audio controls preload="none" src={url} /></div>;
  if (/\.(png|jpe?g|webp|gif)(\?|$)/i.test(url) || url.startsWith("data:image")) return <img className="a-cover" src={url} alt="" />;
  return <a className="a-filecard" href={url} target="_blank" rel="noopener"><FileText aria-hidden="true" /><span><b>{decodeURIComponent(url.split("/").pop() || url)}</b><small>{rtl ? "افتح الملف" : "Open the file"}</small></span></a>;
}

const KIND_ICON: Record<string, typeof FileText> = { video: PlayCircle, podcast: Headphones, gallery: ImageIcon };

export function LibraryPreview(it: Item) { return <LibraryView it={it} />; }
function LibraryView({ it }: { it: Item }) {
  const { lang: ui, tx } = useAdmin();
  const [lang, setLang] = useState<"ar" | "en">(ui);
  const media = (it.media as Bi) ?? { ar: "", en: "" };
  const Icon = KIND_ICON[String(it.kind)] ?? FileText;
  return (
    <ACard title={ui === "ar" ? "كما يظهر في المكتبة" : "As it appears in the library"} end={<LangSwitch lang={lang} set={setLang} />}>
      <article className="a-article" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
        {typeof it.cover === "string" && it.cover && <img className="a-cover" src={it.cover} alt="" />}
        <span className="a-kicker"><Icon aria-hidden="true" />{tx({ ar: "مكتبة ويبال", en: "WePal library" })}</span>
        <h2>{biText(it.title, lang) || missing(lang)}</h2>
        <p className="a-lead">{(it.summary as Bi)?.[lang] || <em className="a-muted">{missing(lang)}</em>}</p>
        <Media url={media[lang] ?? ""} kind={String(it.kind)} />
        {Array.isArray(it.gallery) && it.gallery.length > 0 && <div className="a-gallery">{(it.gallery as string[]).map((src, i) => <img key={i} src={src} alt="" />)}</div>}
      </article>
    </ACard>
  );
}

export function ArticlePreview(it: Item) { return <ArticleView it={it} />; }
function ArticleView({ it }: { it: Item }) {
  const { lang: ui } = useAdmin();
  const [lang, setLang] = useState<"ar" | "en">(ui);
  const author = USERS.find((u) => u.id === it.author);
  return (
    <ACard title={ui === "ar" ? "كما يظهر في الموقع" : "As it appears on the site"} end={<LangSwitch lang={lang} set={setLang} />}>
      <article className="a-article" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
        {typeof it.cover === "string" && it.cover && <img className="a-cover" src={it.cover} alt="" />}
        {typeof it.label === "object" && biText(it.label, lang) && <span className="a-kicker">{biText(it.label, lang)}</span>}
        <h2>{biText(it.title, lang) || <em className="a-muted">{missing(lang)}</em>}</h2>
        {author && <p className="a-byline"><Avatar u={author} size={26} />{author.name[lang]}</p>}
        <p className="a-lead">{(it.summary as Bi)?.[lang] || <em className="a-muted">{missing(lang)}</em>}</p>
        {((it.body as Bi)?.[lang] ?? "").split("\n").filter(Boolean).map((p, i) => <p key={i}>{p}</p>)}
        {Array.isArray(it.gallery) && it.gallery.length > 0 && <div className="a-gallery">{(it.gallery as string[]).map((src, i) => <img key={i} src={src} alt="" />)}</div>}
      </article>
    </ACard>
  );
}

export function FaqPreview(it: Item) { return <FaqView it={it} />; }
function FaqView({ it }: { it: Item }) {
  const { lang: ui } = useAdmin();
  const [lang, setLang] = useState<"ar" | "en">(ui);
  return (
    <ACard title={ui === "ar" ? "كما يظهر في صفحة الأسئلة" : "As it appears on the FAQ page"} end={<LangSwitch lang={lang} set={setLang} />}>
      <details className="a-faq" open dir={lang === "ar" ? "rtl" : "ltr"}>
        <summary>{biText(it.question, lang) || missing(lang)}<ChevronDown aria-hidden="true" /></summary>
        <p>{(it.answer as Bi)?.[lang] || <em className="a-muted">{missing(lang)}</em>}</p>
      </details>
    </ACard>
  );
}

export function SurveyPreview(it: Item) { return <SurveyView it={it} />; }
function SurveyView({ it }: { it: Item }) {
  const { rtl, tx } = useAdmin();
  const options = ((it.options as Bi)?.ar ?? "").split("\n").filter(Boolean);
  const optionsEn = ((it.options as Bi)?.en ?? "").split("\n");
  const votes = (it.results as number[]) ?? [];
  const total = votes.reduce((a, b) => a + b, 0) || 0;
  return (
    <ACard title={rtl ? "الاستطلاع ونتائجه" : "The survey and its results"} sub={`${total} ${rtl ? "إجابة" : "responses"}`}>
      <div className="a-survey">
        <h2>{biText(it.question, rtl ? "ar" : "en")}</h2>
        <ul>
          {options.map((o, i) => { const n = votes[i] ?? 0; const p = total ? Math.round((n / total) * 100) : 0; return (
            <li key={i}><div><span>{rtl ? o : optionsEn[i] || o}</span><b>{p}% <small>({n})</small></b></div><span className="a-map-bar"><span style={{ width: `${p}%`, background: "var(--gc)" }} /></span></li>
          ); })}
        </ul>
        {!options.length && <p className="a-muted">{tx({ ar: "أضف الخيارات من «تعديل»، كل خيار في سطر.", en: "Add options from Edit, one per line." })}</p>}
      </div>
    </ACard>
  );
}

export function ThreadPreview(it: Item) { return <ThreadView it={it} />; }
function ThreadView({ it }: { it: Item }) {
  const { rtl, tx } = useAdmin();
  const msgs = (it.messages as { from: string; text: Bi; at: string; flagged?: boolean }[]) ?? [];
  return (
    <ACard title={rtl ? "النقاش كما يراه الأعضاء" : "The discussion as members see it"} sub={rtl ? "فتحك لهذا النقاش سُجّل في سجل التدقيق" : "Your opening of this discussion was logged in the audit log"}>
      <ol className="a-thread">
        {msgs.map((m, i) => { const u = USERS.find((x) => x.id === m.from); return (
          <li key={i} className={m.flagged ? "is-flagged" : ""}>{u && <a href={`/admin/users?open=${u.id}`}><Avatar u={u} size={32} /></a>}
            <div><p><b>{u ? tx(u.name) : "—"}</b><time>{m.at}</time></p><p>{tx(m.text)}</p>{m.flagged && <small>{rtl ? "عليه بلاغ" : "Reported"}</small>}</div></li>
        ); })}
      </ol>
    </ACard>
  );
}

export function TeamPreview(it: Item) { return <TeamView it={it} />; }
function TeamView({ it }: { it: Item }) {
  const { rtl, tx, lang } = useAdmin();
  const team = (it.team as string[]) ?? [];
  const media = it.media as Bi | undefined;
  return (
    <>
      <ACard title={rtl ? "الملخّص" : "Summary"}>
        <div className="a-preview">
          <p className="a-lead">{biText(it.summary, lang)}</p>
          {media && <Media url={media[lang] || media.ar} kind={String(it.kind ?? "")} />}
        </div>
      </ACard>
      {!!team.length && (
        <ACard title={rtl ? "الفريق" : "The team"} sub={rtl ? "اضغط على أي اسم لترى ملفه" : "Click a name to see their profile"}>
          <div className="a-team">{team.map((id) => { const u = USERS.find((x) => x.id === id); return u ? <a key={id} href={`/admin/users?open=${id}`}><Avatar u={u} size={40} /><span><b>{tx(u.name)}</b><small>{rtl ? "عرض الملف" : "View profile"}</small></span></a> : null; })}</div>
        </ACard>
      )}
    </>
  );
}
