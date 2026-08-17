import { useState, useMemo } from "react";
import { QUESTIONS, SECTION_META, FREQ_LABELS, type Item } from "@/data/questions";
import { POOL } from "@/data/questionPool";
import { AXES } from "@/data/mock";
import { En } from "@/components/common";
import { cn } from "@/lib/utils";
import { type Answers } from "@/lib/scoring";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

export const FREQ = FREQ_LABELS;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let k = a.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [a[k], a[j]] = [a[j], a[k]];
  }
  return a;
}

// يبني مجموعة الاختبار: ١٥ سيناريو عشوائي من المستودع (٣ لكل محور) + البنود المساندة الثابتة = ٣٥
function buildQuestionSet(): Item[] {
  const scenarios: Item[] = [];
  AXES.forEach((a) => {
    const pool = POOL.filter((q) => q.axis === a.key);
    scenarios.push(...shuffle(pool).slice(0, 3));
  });
  const support = QUESTIONS.filter((q) => q.type !== "scenario"); // موازية/مواقف/فخاخ/مؤشرات
  // إعادة ترقيم تسلسلي لِما يراه الطالب
  return [...shuffle(scenarios), ...support].map((q, idx) => ({ ...q, n: idx + 1 }));
}

export function Assessment({ onFinish, onExit }:
  { onFinish: (a: Answers) => void; onExit: () => void }) {
  const questions = useMemo(() => buildQuestionSet(), []);
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const q = questions[i];
  const total = questions.length;
  const progress = Math.round(((i) / total) * 100);
  const answered = answers[q.id] !== undefined;
  const showSectionIntro = i === 0 || questions[i - 1].section !== q.section;

  const set = (val: number | boolean) => setAnswers((a) => ({ ...a, [q.id]: val }));
  const next = () => { if (i + 1 < total) setI(i + 1); else onFinish(answers); };
  const prev = () => i > 0 && setI(i - 1);

  return (
    <div className="mx-auto max-w-2xl">
      {/* شريط التقدّم */}
      <div className="sticky top-0 z-10 -mx-4 mb-5 bg-background/90 px-4 pb-3 pt-1 backdrop-blur">
        <div className="mb-2 flex items-center justify-between text-sm">
          <button onClick={onExit} className="text-muted-foreground hover:text-foreground">إنهاء لاحقًا</button>
          <span className="font-semibold">سؤال <En>{q.n}</En> من <En>{total}</En></span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {showSectionIntro && (
        <div className="mb-4 rounded-xl border bg-gradient-to-tl from-brand/8 to-gold/8 p-4">
          <div className="font-display font-bold text-brand">{SECTION_META[q.section].title}</div>
          <p className="mt-1 text-sm text-muted-foreground">{SECTION_META[q.section].intro}</p>
        </div>
      )}

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h2 className="font-display text-lg font-bold leading-8">{q.text}</h2>

        <div className="mt-5 space-y-2.5">
          {/* سيناريو / موقف / مؤشر */}
          {(q.type === "scenario" || q.type === "situation" || q.type === "indicator") &&
            q.options.map((o, idx) => {
              const sel = answers[q.id] === idx;
              return (
                <button key={idx} onClick={() => set(idx)}
                  className={cn("flex w-full items-center gap-3 rounded-xl border p-3.5 text-right text-[15px] transition-all",
                    sel ? "border-brand bg-brand/6 ring-1 ring-brand" : "hover:border-brand/40 hover:bg-accent/50")}>
                  <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-bold",
                    sel ? "border-brand bg-brand text-white" : "text-muted-foreground")}>
                    {["أ","ب","ج","د"][idx]}
                  </span>
                  <span className="flex-1">{o.text}</span>
                  {sel && <CheckCircle2 className="h-5 w-5 text-brand" />}
                </button>
              );
            })}

          {/* موازٍ: تكرار */}
          {q.type === "parallel" && (
            <div className="grid grid-cols-3 gap-2.5">
              {FREQ.map((label, idx) => {
                const sel = answers[q.id] === idx;
                return (
                  <button key={idx} onClick={() => set(idx)}
                    className={cn("rounded-xl border p-4 text-center font-semibold transition-all",
                      sel ? "border-brand bg-brand text-white" : "hover:border-brand/40 hover:bg-accent/50")}>
                    {label}
                  </button>
                );
              })}
            </div>
          )}

          {/* فخ: صحيح / غير صحيح */}
          {q.type === "trap" && (
            <div className="grid grid-cols-2 gap-2.5">
              {[{ v: true, l: "صحيح" }, { v: false, l: "غير صحيح" }].map((o) => {
                const sel = answers[q.id] === o.v;
                return (
                  <button key={o.l} onClick={() => set(o.v)}
                    className={cn("rounded-xl border p-4 text-center font-semibold transition-all",
                      sel ? "border-brand bg-brand text-white" : "hover:border-brand/40 hover:bg-accent/50")}>
                    {o.l}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button onClick={prev} disabled={i === 0}
          className="flex items-center gap-1.5 rounded-lg border px-4 h-11 text-sm font-semibold disabled:opacity-40 hover:bg-accent">
          <ArrowRight className="h-4 w-4" /> السابق
        </button>
        <button onClick={next} disabled={!answered}
          className="flex items-center gap-1.5 rounded-lg bg-brand px-6 h-11 text-sm font-semibold text-white disabled:opacity-40 hover:bg-brand/90">
          {i + 1 === total ? "إنهاء وعرض النتيجة" : "التالي"} <ArrowLeft className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        الأسئلة مرقّمة تسلسليًا دون تمييز نوعها — تصميم مقصود لضمان صدق القياس.
      </p>
    </div>
  );
}
