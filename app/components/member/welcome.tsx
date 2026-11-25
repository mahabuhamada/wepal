"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, FolderKanban, MessagesSquare, Users } from "lucide-react";
import { Logo } from "../identity";
import { useLang } from "../site-chrome";
import { Avatar, MemberLangProvider, useMember } from "./shell";
import { GROUPS, INTERESTS, ME } from "./data";
import { MEMBER_FLAG, update, useStore } from "./store";

const STEPS = 4;

function Steps() {
  const { rtl, tx, lang } = useMember();
  const Next = rtl ? ArrowLeft : ArrowRight;
  const Back = rtl ? ArrowRight : ArrowLeft;
  const s = useStore();
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<string[]>([]);
  const finish = () => {
    update((x) => ({ ...x, onboarded: true, interests: interests.length ? interests : x.interests }));
    try { window.localStorage.setItem(MEMBER_FLAG, "1"); } catch { /* storage blocked */ }
    window.location.assign(`${window.location.origin}/community`);
  };
  const joined = (id: string) => s.joined[id] ?? GROUPS.find((g) => g.id === id)!.joined;
  const canNext = step !== 1 || interests.length > 0;

  return (
    <div className="o-card">
      <header className="o-head">
        <Logo />
        <ol className="o-dots" aria-label={rtl ? `الخطوة ${step + 1} من ${STEPS}` : `Step ${step + 1} of ${STEPS}`}>{Array.from({ length: STEPS }, (_, i) => <li key={i} className={i < step ? "is-done" : i === step ? "is-now" : ""} />)}</ol>
        <button className="o-skip" onClick={finish}>{rtl ? "تخطَّ" : "Skip"}</button>
      </header>

      <div className="o-body" key={step}>
        {step === 0 && (
          <>
            <span className="m-kicker">{rtl ? "أهلًا بك" : "Welcome"}</span>
            <h1>{rtl ? `أهلًا ${tx(ME.name).split(" ")[0]}، هذه مساحتك في ويبال` : `Hi ${tx(ME.name).split(" ")[0]}, this is your WePal space`}</h1>
            <p>{rtl ? "ثلاث خطوات قصيرة نجهّز بها لوحتك على مقاسك." : "Three short steps to set up your home the way you like it."}</p>
            <ul className="o-points">
              <li><span><MessagesSquare /></span><div><strong>{rtl ? "حوار ومجموعات" : "Dialogue and groups"}</strong><small>{rtl ? "ناقش وتابع ما يجري في منطقتك ومسارك." : "Discuss and follow what's happening in your region and track."}</small></div></li>
              <li><span><FolderKanban /></span><div><strong>{rtl ? "مساحات عمل" : "Workspaces"}</strong><small>{rtl ? "اعمل مع فريق صغير على بحث أو مبادرة أو محتوى." : "Work with a small team on research, an initiative or content."}</small></div></li>
              <li><span><Users /></span><div><strong>{rtl ? "شارك برأيك" : "Have your say"}</strong><small>{rtl ? "استبيانات ومشاورات تجمع رأي الأعضاء." : "Surveys and consultations that gather members' views."}</small></div></li>
            </ul>
          </>
        )}
        {step === 1 && (
          <>
            <span className="m-kicker">{rtl ? "اهتماماتك" : "Your interests"}</span>
            <h1>{rtl ? "ما الذي يهمّك أكثر؟" : "What matters most to you?"}</h1>
            <p>{rtl ? "اختر ما يناسبك، وسنقترح عليك مجموعات ومحتوى قريبًا منه." : "Pick what fits; we'll suggest groups and content close to it."}</p>
            <div className="o-chips" role="group" aria-label={rtl ? "الاهتمامات" : "Interests"}>
              {INTERESTS.map((i) => { const on = interests.includes(i.en); return <button key={i.en} aria-pressed={on} onClick={() => setInterests((x) => on ? x.filter((y) => y !== i.en) : [...x, i.en])}>{on && <Check />}{i[lang]}</button>; })}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <span className="m-kicker">{rtl ? "مجموعات مقترحة" : "Suggested groups"}</span>
            <h1>{rtl ? "انضم إلى مجموعاتك الأولى" : "Join your first groups"}</h1>
            <p>{rtl ? "تستطيع المغادرة أو الانضمام لغيرها في أي وقت." : "You can leave or join others at any time."}</p>
            <div className="o-groups">
              {GROUPS.map((g) => { const on = joined(g.id); return (
                <button key={g.id} className={on ? "is-on" : ""} aria-pressed={on} onClick={() => update((x) => ({ ...x, joined: { ...x.joined, [g.id]: !on } }))}>
                  <span className="m-group-badge is-sm">{tx(g.name).slice(0, 1)}</span>
                  <span><strong>{tx(g.name)}</strong><small>{tx(g.kind)} · {g.members} {rtl ? "عضوًا" : "members"}</small></span>
                  <i>{on ? <Check /> : "+"}</i>
                </button>
              ); })}
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <span className="m-kicker">{rtl ? "صورتك" : "Your picture"}</span>
            <h1>{rtl ? "اختر صورة تمثّلك" : "Pick a picture for you"}</h1>
            <p>{rtl ? "تظهر بجانب اسمك في المنشورات والرسائل. يمكنك تغييرها لاحقًا من الإعدادات." : "It shows next to your name in posts and messages. You can change it later in Settings."}</p>
            <div className="o-avatars">
              {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => <button key={n} aria-pressed={(s.myAvatar ?? ME.avatar) === n} aria-label={rtl ? `الشكل ${n}` : `Avatar ${n}`} onClick={() => update((x) => ({ ...x, myAvatar: n }))}><img src={`/avatars/a${n}.webp`} alt="" width={64} height={64} /></button>)}
            </div>
            <div className="o-preview"><Avatar who={{ ...ME, tone: 0 }} size={52} /><span><strong>{tx(ME.name)}</strong><small>{tx(ME.city)}</small></span></div>
          </>
        )}
      </div>

      <footer className="o-foot">
        {step > 0 ? <button className="m-btn" onClick={() => setStep(step - 1)}><Back />{rtl ? "السابق" : "Back"}</button> : <span />}
        {step < STEPS - 1
          ? <button className="m-btn is-primary" disabled={!canNext} onClick={() => setStep(step + 1)}>{rtl ? "التالي" : "Next"}<Next /></button>
          : <button className="m-btn is-primary" onClick={finish}>{rtl ? "ادخل إلى لوحتي" : "Go to my home"}<Next /></button>}
      </footer>
    </div>
  );
}

export function WelcomePage() {
  const [lang, setLang] = useLang();
  return (
    <MemberLangProvider lang={lang}>
      <main className="home m-area o-page" dir={lang === "ar" ? "rtl" : "ltr"} lang={lang}>
        <button className="o-lang" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>{lang === "ar" ? "English" : "العربية"}</button>
        <Steps />
      </main>
    </MemberLangProvider>
  );
}
