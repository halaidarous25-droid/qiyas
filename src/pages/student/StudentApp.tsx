import { useState } from "react";
import { Pill, En } from "@/components/common";
import { Assessment } from "./Assessment";
import { Report } from "./Report";
import { scoreAssessment, type Answers, type AssessmentResult } from "@/lib/scoring";
import { QUESTIONS } from "@/data/questions";
import { useSlis } from "@/store";
import { cn } from "@/lib/utils";
import {
  GraduationCap, Play, ClipboardCheck, Target, Sparkles, Clock, Award,
  CheckCircle2, Hourglass, Trophy,
} from "lucide-react";

type View = "home" | "test" | "report";

export function StudentApp() {
  const { mode, missions, meAssessed, applyToMission, completeAssessment, isMeIn, isMeAssigned, toast } = useSlis();
  const [view, setView] = useState<View>("home");
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [pendingApply, setPendingApply] = useState<string | null>(null);

  const openMissions = missions.filter((m) => ["open", "screening", "trial"].includes(m.status));
  const myMissions = missions.filter((m) => isMeIn(m.id));

  const finish = (a: Answers) => {
    setResult(scoreAssessment(a));
    const n = completeAssessment(a);
    if (mode === "B" && n > 0) toast(`أكملت المقياس ورُشّحت تلقائيًا لـ ${n} مهام`);
    else toast("أكملت المقياس بنجاح");
    if (pendingApply) { applyToMission(pendingApply); setPendingApply(null); }
    setView("report");
  };

  const onApply = (missionId: string) => {
    if (!meAssessed) { setPendingApply(missionId); setView("test"); }
    else applyToMission(missionId);
  };

  if (view === "test")
    return <div className="min-h-screen bg-background soft-grid p-4 md:p-8">
      <Assessment onFinish={finish} onExit={() => { setPendingApply(null); setView("home"); }} />
    </div>;

  if (view === "report" && result)
    return <div className="min-h-screen bg-background p-4 md:p-8">
      <Report result={result} onRestart={() => setView("home")} />
    </div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 h-16">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white"><GraduationCap className="h-5 w-5" /></div>
          <div className="leading-tight">
            <div className="font-display font-extrabold text-brand text-[15px]">بوابة الطالب — SLIS</div>
            <div className="text-[11px] text-muted-foreground">ناصر سعد القحطاني · الثاني الثانوي ٢/ب</div>
          </div>
          <div className="mr-auto">
            {meAssessed
              ? <Pill tone="success"><CheckCircle2 className="h-3 w-3" /> أكملت المقياس</Pill>
              : <Pill tone="warning">لم تُكمل المقياس بعد</Pill>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-5 p-4 md:p-8">
        {/* دعوة/حالة المقياس */}
        <div className="overflow-hidden rounded-2xl border bg-gradient-to-tl from-brand to-brand-soft p-6 text-white">
          <div className="flex items-center gap-2 text-sm text-white/80"><Sparkles className="h-4 w-4" /> اكتشف ملفك القيادي</div>
          <h1 className="mt-2 font-display text-2xl font-extrabold">مقياس القيادة والسلوك</h1>
          <p className="mt-1 max-w-lg text-sm text-white/85">
            {mode === "B"
              ? <><En>{QUESTIONS.length}</En> موقفًا. أكمل المقياس مرة واحدة ويُرشّحك النظام تلقائيًا للمهام الأنسب لك.</>
              : <><En>{QUESTIONS.length}</En> موقفًا. أكمل المقياس ثم تقدّم للمهام المُعلَنة التي تناسبك.</>}
          </p>
          <button onClick={() => { setPendingApply(null); setView("test"); }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-6 h-12 font-bold text-brand shadow-sm hover:bg-white/90">
            <Play className="h-5 w-5" /> {meAssessed ? "إعادة المقياس" : "ابدأ المقياس الآن"}
          </button>
        </div>

        {/* كيف تعمل البوابة؟ */}
        <div className="rounded-2xl border bg-card p-4">
          <div className="mb-3 text-sm font-semibold text-muted-foreground">كيف تعمل بوابتك؟ ثلاث خطوات:</div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { n: 1, icon: ClipboardCheck, t: "أدِّ المقياس", d: "٣٥ موقفًا يبني ملفك القيادي", done: meAssessed },
              { n: 2, icon: Target,
                t: mode === "B" ? "ترشيح تلقائي" : "تقدّم للفرص",
                d: mode === "B" ? "يوزّعك النظام على المهام" : "اختر مهمة واضغط «تقدّم»", done: myMissions.length > 0 },
              { n: 3, icon: CheckCircle2, t: "مراجعة واعتماد", d: "يراجعك المشرف ويعتمدك للتكليف",
                done: myMissions.some((m) => isMeAssigned(m.id)) },
            ].map((s) => (
              <div key={s.n} className={cn("rounded-xl border p-3", s.done ? "border-success/40 bg-success/5" : "bg-muted/30")}>
                <div className="flex items-center gap-2">
                  <span className={cn("grid h-7 w-7 place-items-center rounded-full text-xs font-bold",
                    s.done ? "bg-success text-white" : "bg-brand/10 text-brand")}>
                    {s.done ? <CheckCircle2 className="h-4 w-4" /> : s.n}
                  </span>
                  <s.icon className={cn("h-4 w-4", s.done ? "text-success" : "text-brand")} />
                  <span className="text-sm font-semibold">{s.t}</span>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">{s.d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ترشيحاتي */}
        {myMissions.length > 0 && (
          <div className="rounded-2xl border bg-card p-5">
            <div className="mb-3 flex items-center gap-2"><Trophy className="h-[18px] w-[18px] text-gold" />
              <h2 className="font-display font-bold">ترشيحاتي</h2></div>
            <div className="space-y-2">
              {myMissions.map((m) => {
                const done = isMeAssigned(m.id);
                return (
                  <div key={m.id} className={cn("flex items-center gap-3 rounded-lg border p-3", done && "border-success/40 bg-success/5")}>
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand/8 text-brand"><Target className="h-4 w-4" /></div>
                    <div className="flex-1"><div className="font-semibold text-sm">{m.title}</div>
                      <div className="text-xs text-muted-foreground">{m.scopeLabel}</div></div>
                    {done
                      ? <Pill tone="success"><CheckCircle2 className="h-3 w-3" /> تم اعتمادك للتكليف</Pill>
                      : <Pill tone="info"><Hourglass className="h-3 w-3" /> قيد المراجعة</Pill>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* الفرص المفتوحة */}
        <div className="rounded-2xl border bg-card p-5">
          <div className="mb-3 flex items-center gap-2"><Target className="h-[18px] w-[18px] text-brand" />
            <h2 className="font-display font-bold">فرص قيادية مفتوحة</h2>
            <Pill tone="brand" className="mr-auto">الوضع {mode === "A" ? "أ" : "ب"}</Pill>
          </div>
          <div className="space-y-2">
            {openMissions.map((m) => {
              const applied = isMeIn(m.id);
              const done = isMeAssigned(m.id);
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand/8 text-brand"><Target className="h-4 w-4" /></div>
                  <div className="flex-1"><div className="font-semibold text-sm">{m.title}</div>
                    <div className="text-xs text-muted-foreground">{m.scopeLabel} · <En>{m.seats}</En> مقعد</div></div>
                  {done ? <Pill tone="success">تم اعتمادك</Pill>
                    : applied ? <Pill tone="info">مُرشَّح</Pill>
                    : mode === "B"
                      ? <span className="text-[11px] text-muted-foreground">ترشيح تلقائي بعد المقياس</span>
                      : <button onClick={() => onApply(m.id)}
                          className="rounded-lg bg-brand px-3 h-9 text-sm font-semibold text-white hover:bg-brand/90">
                          تقدّم لهذه المهمة
                        </button>}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            {mode === "B"
              ? "مدرستك تعمل بالوضع (ب): تؤدّي المقياس مرة واحدة ويُرشّحك النظام تلقائيًا."
              : "مدرستك تعمل بالوضع (أ): تتقدّم للمهمة ثم تؤدّي مقياسها. إن لم تكن أكملت المقياس سيبدأ تلقائيًا."}
          </p>
        </div>

        {/* بطاقات معلومات */}
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { icon: Clock, t: "المدة", v: "~١٢ دقيقة", s: "دون توقيت صارم" },
            { icon: ClipboardCheck, t: "الأقسام", v: "٣ أقسام", s: "كفايات · مواقف · مؤشرات" },
            { icon: Award, t: "الناتج", v: "تقرير شخصي", s: "قوة · تطوير · توجيه" },
          ].map((c, i) => (
            <div key={i} className="rounded-xl border bg-card p-4">
              <c.icon className="h-6 w-6 text-brand" />
              <div className="mt-2 text-sm text-muted-foreground">{c.t}</div>
              <div className="font-display text-lg font-extrabold">{c.v}</div>
              <div className="text-xs text-muted-foreground">{c.s}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
