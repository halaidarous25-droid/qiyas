import { useState, useMemo } from "react";
import { QUESTIONS, SECTION_META, FREQ_LABELS, EXPERIENCE_ITEM, type Item } from "@/data/questions";
import { BANK_B } from "@/data/questionBankB";
import { AXES } from "@/data/mock";
import { En } from "@/components/common";
import { cn } from "@/lib/utils";
import { type Answers } from "@/lib/scoring";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";

export const FREQ = FREQ_LABELS;

// عنصر مبنيّ للعرض: قد يحمل خريطة تُعيد ترتيب الخيارات إلى مواضعها الأصلية للتصحيح
type Built = Item & { _map?: number[] };

// البنك الكامل = النموذج أ + النموذج ب (135 بندًا)
const BANK: Item[] = [...QUESTIONS, ...BANK_B];
const SCEN = BANK.filter((q) => q.type === "scenario");
const PARA = BANK.filter((q) => q.type === "parallel");
const TRAP = BANK.filter((q) => q.type === "trap");
const SITU = BANK.filter((q) => q.type === "situation");
const INTEG = BANK.filter((q) => q.type === "indicator" && q.indicator === "integrity");
const EMOT = BANK.filter((q) => q.type === "indicator" && q.indicator === "emotional");

// قالب ترتيب القسم الأول (٢٥ بندًا) — سيناريوهات مع فخاخ وبنود موازية مبثوثة بمسافات
// s = سيناريو، t = فخّ، p = موازٍ  (١٥ سيناريو + ٥ فخاخ + ٥ موازية)
const SEC1_TEMPLATE = ["s","s","s","t","s","s","s","p","s","t","s","p","s","s","t","s","s","p","s","s","t","s","p","p","t"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let k = a.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [a[k], a[j]] = [a[j], a[k]];
  }
  return a;
}

// ذاكرة آخر محاولة (لمنع تكرار الأسئلة بشكل متتالٍ) — تُحفظ محليًا إن أمكن
const RECENT_KEY = "qiyas_recent_ids";
function loadRecent(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(RECENT_KEY) || "[]")); } catch { return new Set(); }
}
function saveRecent(ids: string[]) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(ids)); } catch { /* تجاهل */ }
}

// يختار n عناصر عشوائيًا مع تفضيل ما لم يُستخدَم في المحاولة السابقة
function pick<T extends Item>(pool: T[], n: number, recent: Set<string>): T[] {
  const fresh = shuffle(pool.filter((q) => !recent.has(q.id)));
  const used = shuffle(pool.filter((q) => recent.has(q.id)));
  return [...fresh, ...used].slice(0, n);
}

// خلط مواضع خيارات السيناريو/الموقف/المؤشر مع حفظ الفهرس الأصلي (_map) للتصحيح الصحيح
function shuffleOptions(it: Item): Built {
  const canShuffle = (it.type === "scenario" || it.type === "situation" || it.type === "indicator") && it.options.length > 1;
  if (!canShuffle) return it;
  const order = shuffle(it.options.map((_, i) => i));
  return { ...it, options: order.map((i) => it.options[i]), _map: order };
}

// يبني اختبارًا معتمَدًا (٣٥ عنصرًا) بانتقاء عشوائي من البنك (١٣٥) دون الإخلال بالمعايير:
// ١٥ سيناريو (٣ لكل محور) + ٥ موازية (واحد لكل محور) + ٥ فخاخ + ٦ مواقف + ٤ مؤشرات (٢ نزاهة + ٢ انفعالي)
// ويُراعى عدم تكرار الأسئلة نفسها في المحاولة التالية مباشرةً.
function buildQuestionSet(): Built[] {
  const recent = loadRecent();

  // سيناريوهات: ٣ لكل محور، موزّعة بالتناوب حتى لا تتجاور محاور متشابهة
  const perAxisScen: Record<string, Item[]> = {};
  AXES.forEach((a) => { perAxisScen[a.key] = pick(SCEN.filter((q) => q.axis === a.key), 3, recent); });
  const scenSeq: Item[] = [];
  for (let r = 0; r < 3; r++) for (const a of shuffle([...AXES])) scenSeq.push(perAxisScen[a.key][r]);

  // موازية: واحد لكل محور
  const paras = shuffle(AXES.map((a) => pick(PARA.filter((q) => q.axis === a.key), 1, recent)[0]).filter(Boolean));
  const traps = pick(TRAP, 5, recent);

  // تعبئة قالب القسم الأول
  let si = 0, pi = 0, ti = 0;
  const sec1: Item[] = SEC1_TEMPLATE.map((slot) =>
    slot === "s" ? scenSeq[si++] : slot === "p" ? paras[pi++] : traps[ti++]
  ).filter(Boolean);

  // القسم الثاني: ٦ مواقف — والثالث: ٢ نزاهة + ٢ انفعالي
  const sec2 = pick(SITU, 6, recent);
  const sec3 = shuffle([...pick(INTEG, 2, recent), ...pick(EMOT, 2, recent)]);

  const all = [...sec1, ...sec2, ...sec3];
  saveRecent(all.map((q) => q.id));

  // السؤال الأخير الثابت (٣٦): مؤشر الخبرة القيادية — يُعرض دائمًا في النهاية بلا خلط
  const built = all.map(shuffleOptions);
  return [...built, EXPERIENCE_ITEM as Built].map((q, idx) => ({ ...q, n: idx + 1 }));
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
          {(q.type === "scenario" || q.type === "situation" || q.type === "indicator" || q.type === "experience") &&
            q.options.map((o, di) => {
              const orig = q._map ? q._map[di] : di;   // الفهرس الأصلي للخيار (للتصحيح)
              const sel = answers[q.id] === orig;
              return (
                <button key={di} onClick={() => set(orig)}
                  className={cn("flex w-full items-center gap-3 rounded-xl border p-3.5 text-right text-[15px] transition-all",
                    sel ? "border-brand bg-brand/6 ring-1 ring-brand" : "hover:border-brand/40 hover:bg-accent/50")}>
                  <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-bold",
                    sel ? "border-brand bg-brand text-white" : "text-muted-foreground")}>
                    {["أ","ب","ج","د"][di]}
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
