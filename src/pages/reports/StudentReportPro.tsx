import { createPortal } from "react-dom";
import { AXES, computeMatch, type Candidate, type Mission } from "@/data/mock";
import type { MissionRole } from "@/store";
import { EXPERIENCE_LABELS, QUESTIONS, type Item } from "@/data/questions";
import { BANK_B } from "@/data/questionBankB";
import { leadershipStyle } from "@/lib/scoring";
import { En } from "@/components/common";
import { Printer, X, Award, Target, TrendingUp, AlertTriangle, CheckCircle2, ClipboardList, Lightbulb, ShieldCheck, ArrowUpRight, Gauge } from "lucide-react";

// طبقة الطباعة: يُنقل التقرير إلى جسم الصفحة (portal) ويُخفى ما عداه بالكامل حتى تُطبع نسخة واحدة فقط
const PRINT_CSS = `
@media print {
  /* إخفاء كل ما هو خارج ورقة التقرير (يمنع تكرار النسخ والصفحات الفارغة) */
  body > *:not(.slis-report-portal) { display: none !important; }
  .slis-report-portal { position: static !important; background: #fff !important; padding: 0 !important; margin: 0 !important; overflow: visible !important; }
  .slis-report-portal .slis-report-inner { max-width: none !important; margin: 0 !important; }
  .slis-print-area { position: static !important; box-shadow: none !important; border: 0 !important; padding: 0 !important; }
  .slis-no-print { display: none !important; }
  /* دليل المصطلحات يظهر كاملًا عند الطباعة حتى لو كان مطويًا */
  details.slis-glossary > *:not(summary) { display: block !important; }
  details.slis-glossary summary > span.slis-hint { display: none !important; }
  @page { size: A4; margin: 12mm; }
}
`;

const AX_KEYS = AXES.map((a) => a.key);

// توصيات استثمار نقاط القوة (لكل محور) — نصوص وصفية بلا أرقام
const AXIS_LEVERAGE: Record<string, string> = {
  org: "يبرع في الأدوار التنظيمية والإدارية؛ كلّفه بتنظيم الفعاليات والجداول ومتابعة الالتزام.",
  lead: "لديه استعداد قيادي واضح؛ امنحه قيادة فريق صغير أو مسؤولية مباشرة.",
  comm: "قوي في التواصل؛ استثمره في التنسيق بين الفرق والعرض والتمثيل.",
  firm: "يتميّز بالحزم والنزاهة؛ أوكِل إليه المتابعة والرقابة وحفظ النظام.",
  init: "صاحب مبادرة ومرونة؛ ضعه في المهام التي تحتاج ابتكارًا ومواجهة المتغيّرات.",
};
// توصيات تطوير فرص النمو (لكل محور) — نصوص وصفية بلا أرقام
const AXIS_DEVELOP: Record<string, string> = {
  org: "درّبه على إدارة الوقت وترتيب الأولويات وإنهاء المهام في مواعيدها.",
  lead: "امنحه مسؤوليات صغيرة متدرّجة لبناء الثقة القيادية خطوةً بخطوة.",
  comm: "أشركه في أنشطة جماعية وعروض قصيرة لتطوير التواصل والثقة أمام الآخرين.",
  firm: "درّبه على اتخاذ المواقف الواضحة والالتزام بالقيم حتى تحت الضغط.",
  init: "شجّعه على اقتراح أفكار جديدة والتعامل مع التغيير بمرونة.",
};

// وصف مستوى المحور بالكلمات (بدل النسبة)
function axisLevel(v: number): { label: string; tone: string } {
  if (v >= 78) return { label: "مرتفع", tone: "text-emerald-700" };
  if (v >= 62) return { label: "متوسط", tone: "text-brand" };
  return { label: "يحتاج تطوير", tone: "text-amber-700" };
}
// وصف المؤشر العام بالكلمات
function overallLabel(v: number): string {
  if (v >= 85) return "ممتاز";
  if (v >= 75) return "جيد جدًا";
  if (v >= 65) return "جيد";
  if (v >= 50) return "متوسط";
  return "يحتاج تطوير";
}

// سجل موحّد لكل الأسئلة لاستخراج تفاصيل الإجابات
const ALL_ITEMS: Item[] = [...QUESTIONS, ...BANK_B];
const AXIS_LABEL: Record<string, string> = Object.fromEntries(AXES.map((a) => [a.key, a.label]));

// تحليل مختصر لاختيار الطالب في سؤال موقفي بناءً على جودة الخيار ومحوره
function interpretChoice(item: Item, chosenIdx: number): { level: string; tone: string; text: string } {
  const opt = item.options[chosenIdx];
  const score = opt ? opt.score : 0;
  const axisTxt = item.axis ? AXIS_LABEL[item.axis] : "";
  const maxScore = Math.max(...item.options.map((o) => o.score));
  const isBest = opt && score === maxScore;
  if (score >= 85) return { level: "اختيار ناضج", tone: "text-emerald-700",
    text: `يعكس مستوى عاليًا في ${axisTxt}${isBest ? " — وهو أفضل خيار متاح" : ""}؛ يتصرّف بوعي ومسؤولية في هذا الموقف.` };
  if (score >= 60) return { level: "اختيار جيد", tone: "text-brand",
    text: `يدل على مستوى جيد في ${axisTxt}؛ استجابة إيجابية مع مساحة بسيطة للتحسين.` };
  if (score >= 40) return { level: "اختيار متوسط", tone: "text-amber-700",
    text: `استجابة متوسطة تُظهر حاجة لتعزيز ${axisTxt} في مواقف مشابهة.` };
  return { level: "يحتاج تطويرًا", tone: "text-rose-700",
    text: `خيار ضعيف في ${axisTxt}؛ يُنصح بالتدريب على التعامل مع هذا النوع من المواقف.` };
}

// رسم راداري (مخمّس) لمحاور القيادة الخمسة — تمثيل بصري بلا أرقام
function Radar({ axes }: { axes: Record<string, number> }) {
  const cx = 130, cy = 120, R = 95;
  const n = AX_KEYS.length;
  const pt = (i: number, r: number) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  };
  const rings = [0.25, 0.5, 0.75, 1];
  const valuePts = AX_KEYS.map((k, i) => pt(i, (Math.max(0, Math.min(100, axes[k])) / 100) * R));
  const poly = (pts: number[][]) => pts.map((p) => p.join(",")).join(" ");
  return (
    <svg width="260" height="245" viewBox="0 0 260 245">
      {rings.map((r, i) => (
        <polygon key={i} points={poly(AX_KEYS.map((_, j) => pt(j, r * R)))}
          fill="none" stroke="#e2e8f0" strokeWidth="1" />
      ))}
      {AX_KEYS.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
      })}
      <polygon points={poly(valuePts)} fill="rgba(15,92,102,0.22)" stroke="hsl(191 72% 30%)" strokeWidth="2" />
      {valuePts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3" fill="hsl(191 72% 30%)" />)}
      {AXES.map((a, i) => {
        const [x, y] = pt(i, R + 16);
        return <text key={a.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
          fontSize="11" fontWeight="700" fill="#334155">{a.short}</text>;
      })}
    </svg>
  );
}

function Bar({ v }: { v: number }) {
  return (
    <span className="inline-block h-2.5 w-full overflow-hidden rounded bg-slate-200 align-middle">
      <span className="block h-full rounded" style={{ width: `${Math.max(0, Math.min(100, v))}%`, background: "hsl(191 72% 30%)" }} />
    </span>
  );
}

// بطاقة نقاط بالكلمات (بلا نسب)
function WordCard({ icon: Icon, title, tone, items }: {
  icon: any; title: string; tone: "brand" | "emerald" | "amber" | "rose"; items: string[];
}) {
  const tones: Record<string, string> = {
    brand: "border-brand/25 bg-brand/5 text-brand",
    emerald: "border-emerald-200 bg-emerald-50/60 text-emerald-800",
    amber: "border-amber-200 bg-amber-50/60 text-amber-800",
    rose: "border-rose-200 bg-rose-50/60 text-rose-800",
  };
  if (!items.length) return null;
  return (
    <div className={`rounded-lg border p-3 ${tones[tone]}`}>
      <div className="mb-1.5 flex items-center gap-1.5 font-bold"><Icon className="h-4 w-4" /> {title}</div>
      <ul className="space-y-1">
        {items.map((t, i) => (
          <li key={i} className="flex gap-1.5 text-[12.5px] leading-6 text-slate-700">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-60" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StudentReportPro({ student, missions, assignedMissions = [], roles = [], schoolName, today, onClose }: {
  student: Candidate; missions: Mission[]; assignedMissions?: Mission[]; roles?: MissionRole[]; schoolName: string; today: string; onClose: () => void;
}) {
  const style = leadershipStyle(
    [...AXES].sort((a, b) => student.axes[b.key] - student.axes[a.key]).slice(0, 2).map((a) => a.key)
  );
  const sorted = [...AXES].sort((a, b) => student.axes[b.key] - student.axes[a.key]);
  const strengths = sorted.slice(0, 2);
  const growth = sorted.slice(-2);

  // ===== المؤشر العام الموحّد (نسبة واحدة تلخّص أداء الطالب) =====
  const attempts = student.attempts || [];
  const attemptCount = attempts.length;
  const best = attempts.find((a) => a.best) || attempts[0];
  const first = attempts[attempts.length - 1];
  const delta = best && first ? best.composite - first.composite : 0;
  const overall = Math.round(best?.composite ?? (student.competency + student.behavior) / 2);
  const overallTxt = overallLabel(overall);

  // ===== الموثوقية (تحديد واضح) =====
  const reliability = student.trust === "trusted"
    ? { label: "موثوق", tone: "text-emerald-700", ring: "border-emerald-200 bg-emerald-50", note: "النتائج متّسقة ويمكن الاعتماد عليها مباشرةً." }
    : student.trust === "reserved"
      ? { label: "متحفَّظ", tone: "text-amber-700", ring: "border-amber-200 bg-amber-50", note: "النتائج جيدة مع تحفّظ بسيط — يُنصح بمقابلة تأكيدية قصيرة." }
      : { label: "يحتاج تحقّقًا", tone: "text-rose-700", ring: "border-rose-200 bg-rose-50", note: "يُنصح بمقابلة معمّقة قبل اعتماد النتائج في القرار." };

  // ===== المسمّيات التي تقدّم لها الطالب + الخبرات السابقة =====
  const sPrefs = (student as any).rolePrefs as { role_title: string; prior_assigned: boolean }[] | undefined;
  const priorTitles = new Set((sPrefs || []).filter((p) => p.prior_assigned).map((p) => p.role_title));
  const chosenTitles = new Set((sPrefs || []).map((p) => p.role_title));
  const assignedTitles = new Set(assignedMissions.map((m) => m.title));
  const experienceTitles = Array.from(new Set([...priorTitles, ...assignedTitles]));

  // مطابقة الطالب مع الوصف الوظيفي لكل مسمّى — رقم واحد موحّد لكل مهمة:
  // نسبة مطابقة نتائج محاور الطالب مع أوزان أهمية المحاور في وصف المهمة (بلا إضافات مربكة).
  // الخبرة السابقة تظهر كشارة فقط ولا تُضاف إلى الرقم حتى يبقى متّسقًا وواضحًا.
  const roleFits = roles.filter((r) => r.active !== false).map((r) => {
    const match = Math.round(AXES.reduce((s, a) => s + student.axes[a.key] * (r.weights[a.key] || 0), 0) / 100);
    const hasPrior = priorTitles.has(r.title) || assignedTitles.has(r.title);
    const chosen = chosenTitles.has(r.title);
    const keyAxes = AXES.filter((a) => (r.weights[a.key] || 0) >= 20);
    const sStrengths = keyAxes.filter((a) => student.axes[a.key] >= 75);
    const gaps = keyAxes.filter((a) => student.axes[a.key] < 70);
    const verdict = match >= 85 ? "مطابقة عالية" : match >= 70 ? "مناسب" : "أقل مناسبة";
    return { r, match, hasPrior, chosen, strengths: sStrengths, gaps, verdict };
  }).sort((a, b) => b.match - a.match);

  // المهام التي تقدّم لها الطالب فعلًا (نُظهر لها نسبة المطابقة). وإن لم يتقدّم لأيٍّ نقترح الأنسب له.
  const appliedFits = roleFits.filter((rf) => rf.chosen);
  const applied = appliedFits.length > 0;
  const shownFits = applied ? appliedFits : roleFits.slice(0, 3);
  const bestFit = roleFits[0];

  // مهمة مفتوحة أعلى مواءمةً (لدعم القرار)
  const openMissions = missions.filter((m) => ["open", "screening"].includes(m.status));
  const rankedOpen = openMissions.map((m) => ({ m, match: computeMatch(student, m) })).sort((a, b) => b.match - a.match);

  // ===== القرار والتوصية (بالكلمات، دون نسب) =====
  const decisionItems: string[] = [
    student.trust === "trusted"
      ? "يمكن اعتماده مباشرةً للأدوار المناسبة لملفه دون حاجة لمقابلة."
      : student.trust === "reserved"
        ? "يُنصح بمقابلة قصيرة للتأكيد قبل الاعتماد النهائي."
        : "يُنصح بمقابلة معمّقة قبل أي قرار اعتماد.",
  ];
  const gap = student.competency - student.behavior;
  if (gap >= 20) decisionItems.push("قوي معرفيًا أكثر من الجانب العملي — يحتاج فرص تطبيق ميداني ليترجم معرفته إلى سلوك.");
  else if (gap <= -20) decisionItems.push("عملي وميداني أكثر من الجانب المعرفي — يُدعَم جانبه النظري بالتدريب.");
  if (experienceTitles.length > 0) decisionItems.push(`لديه خبرة سابقة في: ${experienceTitles.join("، ")} — تُرجّح جاهزيته لأدوار مماثلة.`);
  if (bestFit) decisionItems.push(`أنسب مسمّى قيادي له: «${bestFit.r.title}» (${bestFit.verdict}).`);

  const leverageItems = strengths.map((a) => AXIS_LEVERAGE[a.key]);
  const developItems = growth.map((a) => AXIS_DEVELOP[a.key]);

  // ===== تفصيل إجابات الطالب (المواقف ذات الخيارات) مع تحليل مختصر لكل إجابة =====
  const answers = student.answers || {};
  const answeredItems = ALL_ITEMS
    .filter((it) => it.options && it.options.length > 0 && typeof answers[it.id] === "number")
    .map((it) => ({ it, idx: answers[it.id] as number }))
    .filter(({ it, idx }) => it.options[idx] !== undefined)
    .sort((a, b) => a.it.n - b.it.n);

  // التنبيهات — بالكلمات دون أرقام
  const alertItems: string[] = [];
  if (student.contradiction >= 6) alertItems.push("لوحظ تفاوت في اتساق بعض الإجابات — يُستحسن مراجعتها بأسئلة موقفية في المقابلة.");
  if (student.socialDesirability >= 4) alertItems.push("ميل لتقديم صورة مثالية — يُنصح بالتحقّق بمواقف واقعية.");
  if (attemptCount > 1 && delta >= 8) alertItems.push("تحسّن أداؤه عبر المحاولات — مؤشر إيجابي على التعلّم والتطوّر.");
  if (attemptCount > 1 && delta <= -8) alertItems.push("تذبذب أداؤه عبر المحاولات — يُستحسن معرفة السبب.");

  const report = (
    <div className="slis-report-portal fixed inset-0 z-50 overflow-auto bg-black/40 p-3 md:p-6" onClick={onClose}>
      <style>{PRINT_CSS}</style>
      <div className="slis-report-inner mx-auto max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="slis-no-print mb-3 flex items-center justify-between">
          <button onClick={onClose} className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 h-9 text-sm font-semibold hover:bg-accent">
            <X className="h-4 w-4" /> إغلاق
          </button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 h-9 text-sm font-semibold text-white hover:bg-brand/90">
            <Printer className="h-4 w-4" /> طباعة / حفظ PDF
          </button>
        </div>

        <div className="slis-print-area rounded-xl border bg-white p-6 text-[13px] leading-6 text-slate-800 shadow-xl" dir="rtl">
          {/* ترويسة */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-3">
            <div>
              <div className="text-lg font-extrabold text-brand">نظام مؤشر لقياس المهارات الطلابية</div>
              <div className="font-semibold text-slate-700">{schoolName}</div>
              <div className="text-[11px] text-slate-500">مركز التدريب والتطوير · تقرير الطالب القيادي</div>
            </div>
            <div className="text-left text-[11px] text-slate-500">
              <div className="font-bold text-slate-700">{student.name}</div>
              <div>{student.grade}{student.className ? " · " + student.className : ""}</div>
              <div>تاريخ التقرير: <En>{today}</En></div>
              {student.assessedAt && <div>تاريخ الاختبار: <En>{student.assessedAt}</En></div>}
            </div>
          </div>

          {/* ===== الملخّص التنفيذي: نسبة عامة موحّدة + النمط + الموثوقية ===== */}
          <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr]">
            {/* المؤشر العام — نسبة واحدة فقط */}
            <div className="flex flex-col items-center justify-center rounded-xl border border-brand/25 bg-brand/5 p-4 text-center sm:w-44">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-brand"><Gauge className="h-3.5 w-3.5" /> المؤشر العام</div>
              <div className="mt-1 font-display text-4xl font-extrabold text-brand"><En>{overall}</En><span className="text-xl">٪</span></div>
              <div className="mt-0.5 text-[12px] font-bold text-slate-700">{overallTxt}</div>
              <div className="mt-1 text-[10px] text-slate-500">نتيجة موحّدة من اختبار القيادات</div>
            </div>
            {/* النمط + الموثوقية */}
            <div className="grid gap-3">
              <div className="rounded-xl border p-3">
                <div className="text-[11px] text-slate-500">النمط القيادي للطالب</div>
                <div className="mt-0.5 font-display text-lg font-extrabold text-brand">{style.name}</div>
                <div className="mt-0.5 text-[12px] text-slate-600">أبرز ما يميّزه: {strengths.map((a) => a.label).join(" و")}.</div>
              </div>
              <div className={`rounded-xl border p-3 ${reliability.ring}`}>
                <div className="flex items-center gap-1.5 text-[12px] font-bold">
                  <ShieldCheck className={`h-4 w-4 ${reliability.tone}`} />
                  <span className="text-slate-600">موثوقية النتائج:</span>
                  <span className={reliability.tone}>{reliability.label}</span>
                </div>
                <div className="mt-0.5 text-[12px] text-slate-600">{reliability.note}</div>
              </div>
            </div>
          </div>

          {/* سجل التكليفات السابقة (يُراعى عند القرار) */}
          {assignedMissions.length > 0 && (
            <div className="mt-4 rounded-lg border border-brand/25 bg-brand/5 p-3">
              <div className="mb-1.5 flex items-center gap-1.5 font-bold text-brand"><ClipboardList className="h-4 w-4" /> مهام سبق تكليفه بها</div>
              <ul className="grid gap-1 sm:grid-cols-2">
                {assignedMissions.map((m) => (
                  <li key={m.id} className="flex items-center gap-1.5 text-[12.5px] text-slate-700">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    <span className="font-semibold">{m.title}</span>
                    <span className="text-slate-500">— {m.scopeLabel}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[11px] text-slate-500">يُراعى توزيع الفرص القيادية بعدالة عند الترشيح لمهام جديدة.</p>
            </div>
          )}

          {/* ===== الشخصية القيادية: رسم راداري + مستويات المحاور بالكلمات ===== */}
          <div className="mt-5">
            <div className="mb-2 flex items-center gap-1.5 font-bold text-slate-900"><TrendingUp className="h-4 w-4 text-brand" /> الشخصية القيادية للطالب</div>
            <div className="grid items-center gap-4 sm:grid-cols-2">
              <div className="flex justify-center rounded-lg border p-2"><Radar axes={student.axes} /></div>
              <div className="space-y-1.5">
                {sorted.map((a) => {
                  const lvl = axisLevel(student.axes[a.key]);
                  return (
                    <div key={a.key} className="grid grid-cols-[110px_1fr_74px] items-center gap-2 py-0.5">
                      <span className="text-[12px] text-slate-600">{a.label}</span>
                      <Bar v={student.axes[a.key]} />
                      <span className={`text-left text-[11px] font-bold ${lvl.tone}`}>{lvl.label}</span>
                    </div>
                  );
                })}
                <p className="pt-1 text-[11px] text-slate-500">
                  نقاط القوة: <b className="text-emerald-700">{strengths.map((a) => a.label).join(" و")}</b> ·
                  فرص التطوير: <b className="text-amber-700">{growth.map((a) => a.label).join(" و")}</b>.
                </p>
              </div>
            </div>
          </div>

          {/* ===== مطابقة الطالب مع المهام (نسبة واحدة لكل مهمة) ===== */}
          {shownFits.length > 0 && (
            <div className="mt-5">
              <div className="mb-1 flex items-center gap-1.5 font-bold text-slate-900">
                <Target className="h-4 w-4 text-brand" />
                {applied ? "مطابقة الطالب مع المهام التي تقدّم لها" : "أنسب المهام للطالب (لم يتقدّم لمهمة محددة)"}
              </div>
              <p className="mb-2 text-[11px] text-slate-500">
                {applied
                  ? "لكل مهمة تقدّم لها الطالب: نسبة مطابقة واحدة تلخّص مدى ملاءمته لها."
                  : "لم يختر الطالب مسمّى معيّنًا في الرابط — نعرض أعلى المهام مواءمةً لملفه."}
              </p>
              <div className="space-y-2">
                {shownFits.map(({ r, match, hasPrior, verdict, strengths: st, gaps }) => {
                  const vTone = match >= 85 ? "text-emerald-700" : match >= 70 ? "text-brand" : "text-amber-700";
                  return (
                    <div key={r.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900">{r.title}</span>
                        <span className={`text-[11px] font-bold ${vTone}`}>{verdict}</span>
                        {hasPrior && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">خبرة سابقة</span>}
                        <span className="mr-auto flex items-center gap-2">
                          <span className="w-24"><Bar v={match} /></span>
                          <span className="font-display text-base font-extrabold text-brand"><En>{match}</En>٪</span>
                        </span>
                      </div>
                      <div className="mt-1 text-[12px] text-slate-600">
                        {st.length > 0 && <>يتفوّق في: <b className="text-emerald-700">{st.map((a) => a.label).join("، ")}</b>. </>}
                        {gaps.length > 0 && <>يحتاج تعزيزًا في: <b className="text-amber-700">{gaps.map((a) => a.label).join("، ")}</b>.</>}
                        {st.length === 0 && gaps.length === 0 && <>ملاءمة متوازنة لمتطلّبات المهمة.</>}
                      </div>
                    </div>
                  );
                })}
              </div>
              {applied && rankedOpen[0] && (
                <p className="mt-2 text-[11px] text-slate-500">أعلى مهمة مفتوحة مواءمةً لملفه حاليًا: «{rankedOpen[0].m.title}».</p>
              )}
              <p className="mt-1 text-[11px] text-slate-400">
                نسبة المطابقة رقم موحّد يعبّر عن مدى ملاءمة نتائج الطالب لمتطلّبات كل مهمة، وتُعرض الخبرة السابقة كشارة دون التأثير على الرقم.
              </p>
            </div>
          )}

          {/* ===== الخلاصة والتوصية للمشرف / متّخذ القرار (بالكلمات) ===== */}
          <div className="mt-5">
            <div className="mb-2 flex items-center gap-1.5 font-bold text-slate-900"><ClipboardList className="h-4 w-4 text-brand" /> الخلاصة والتوصية لمتّخذ القرار</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <WordCard icon={ShieldCheck} tone="brand" title="القرار المقترح" items={decisionItems} />
              <WordCard icon={ArrowUpRight} tone="emerald" title="ما يُستثمر فيه" items={leverageItems} />
              <WordCard icon={Lightbulb} tone="amber" title="ما يحتاج تطويرًا" items={developItems} />
              <WordCard icon={AlertTriangle} tone="rose" title="ملاحظات للانتباه" items={alertItems} />
            </div>
          </div>

          {/* ===== سجل المحاولات (مختصر: مؤشر واحد لكل محاولة) ===== */}
          {attemptCount > 1 && (
            <div className="mt-5">
              <div className="mb-1 flex items-center gap-1.5 font-bold text-slate-900"><TrendingUp className="h-4 w-4 text-brand" /> سجل المحاولات — يُعتمد الأفضل</div>
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="text-slate-500">
                    <th className="border-b border-slate-200 p-1.5 text-right">#</th>
                    <th className="border-b border-slate-200 p-1.5 text-right">التاريخ</th>
                    <th className="border-b border-slate-200 p-1.5 text-center">المؤشر العام</th>
                    <th className="border-b border-slate-200 p-1.5 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a, i) => (
                    <tr key={a.id} className={a.best ? "bg-emerald-50/60" : ""}>
                      <td className="border-b border-slate-100 p-1.5"><En>{attemptCount - i}</En></td>
                      <td className="border-b border-slate-100 p-1.5"><En>{a.date}</En></td>
                      <td className="border-b border-slate-100 p-1.5 text-center font-bold"><En>{a.composite}</En>٪</td>
                      <td className="border-b border-slate-100 p-1.5 text-center">
                        {a.best ? <span className="font-semibold text-emerald-700">★ المعتمد</span> : <span className="text-slate-400">محاولة</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                المعتمَد هو الأفضل{delta !== 0 ? ` — ${delta > 0 ? "تحسّن" : "تراجع"} عن أول محاولة` : ""}.
              </div>
            </div>
          )}

          {/* خبرة قيادية */}
          <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-gold/15 px-3 py-1 text-[11px] font-bold text-amber-700">
            <Award className="h-3.5 w-3.5" /> الخبرة القيادية: {EXPERIENCE_LABELS[student.experience ?? 0]}
          </div>

          {/* ===== تفصيل إجابات الطالب وتحليلها (مطوي تلقائيًا، يظهر كاملًا عند الطباعة) ===== */}
          {answeredItems.length > 0 && (
            <details className="slis-glossary mt-6 rounded-lg border border-slate-200 bg-white p-4">
              <summary className="flex cursor-pointer list-none items-center gap-1.5 font-bold text-slate-900 [&::-webkit-details-marker]:hidden">
                <ClipboardList className="h-4 w-4 text-brand" /> تفصيل إجابات الطالب وتحليلها (<En>{answeredItems.length}</En> موقفًا)
                <span className="slis-hint mr-auto text-[11px] font-normal text-slate-400">(اضغط للعرض)</span>
              </summary>
              <p className="mt-2 mb-3 text-[11.5px] text-slate-500">
                فيما يلي إجابة الطالب على كل موقف، مع تفسير وتحليل مختصر أسفل الخيارات يوضّح دلالة اختياره.
              </p>
              <div className="space-y-3">
                {answeredItems.map(({ it, idx }) => {
                  const analysis = interpretChoice(it, idx);
                  return (
                    <div key={it.id} className="break-inside-avoid rounded-lg border border-slate-200 p-3">
                      <div className="flex items-start gap-2">
                        <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded bg-brand/10 text-[11px] font-bold text-brand"><En>{it.n}</En></span>
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800">{it.text}</div>
                          {it.axis && <div className="mt-0.5 text-[10px] text-slate-400">المحور المقيس: {AXIS_LABEL[it.axis]}</div>}
                        </div>
                      </div>
                      <ul className="mt-2 space-y-1">
                        {it.options.map((o, oi) => {
                          const chosen = oi === idx;
                          return (
                            <li key={oi} className={`flex items-start gap-2 rounded-md px-2 py-1 text-[12px] ${chosen ? "border border-brand/40 bg-brand/5 font-semibold text-slate-800" : "text-slate-500"}`}>
                              <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border ${chosen ? "border-brand bg-brand text-white" : "border-slate-300"}`}>
                                {chosen && <CheckCircle2 className="h-3 w-3" />}
                              </span>
                              <span className="flex-1">{o.text}</span>
                              {chosen && <span className="shrink-0 text-[10px] font-bold text-brand">إجابة الطالب</span>}
                            </li>
                          );
                        })}
                      </ul>
                      <div className={`mt-2 rounded-md bg-slate-50 px-2.5 py-1.5 text-[11.5px] leading-6 ${analysis.tone}`}>
                        <b>التحليل ({analysis.level}):</b> <span className="text-slate-600">{analysis.text}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </details>
          )}

          {/* ===== دليل المصطلحات: مطوي تلقائيًا ===== */}
          <details className="slis-glossary mt-6 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 font-bold text-slate-900 [&::-webkit-details-marker]:hidden">
              <ClipboardList className="h-4 w-4 text-brand" /> دليل المصطلحات — شرح مبسّط للمفاهيم
              <span className="slis-hint mr-auto text-[11px] font-normal text-slate-400">(اضغط للعرض)</span>
            </summary>
            <dl className="mt-2 grid gap-x-5 gap-y-2 sm:grid-cols-2">
              {[
                ["المؤشر العام", "نسبة واحدة تلخّص أداء الطالب في اختبار القيادات (تجمع معرفته وسلوكه)."],
                ["النمط القيادي", "وصف عام لأسلوب الطالب القيادي، مستنتَج من أبرز محورين لديه."],
                ["موثوقية النتائج", "مدى إمكانية الاعتماد على نتائج الطالب: موثوق / متحفَّظ / يحتاج تحقّقًا."],
                ["نسبة المطابقة مع المهمة", "مدى ملاءمة الطالب لمتطلّبات مهمة قيادية محدّدة تقدّم لها."],
                ["المحاور الخمسة", "الجوانب التي يقيسها الاختبار: التنظيم، القيادة، التواصل، الحزم، المبادرة."],
              ].map(([term, def]) => (
                <div key={term}>
                  <dt className="text-[12px] font-bold text-slate-800">{term}</dt>
                  <dd className="text-[11.5px] leading-6 text-slate-600">{def}</dd>
                </div>
              ))}
            </dl>
          </details>

          <div className="mt-5 border-t border-slate-200 pt-2 text-[10px] text-slate-400">
            تقرير آليّ من نظام مؤشر — للاستخدام الإداري الداخلي في دعم قرار الترشيح.
          </div>
        </div>
      </div>
    </div>
  );

  // إخراج التقرير إلى جسم الصفحة مباشرةً حتى تُطبع نسخة واحدة فقط بلا تكرار
  return createPortal(report, document.body);
}
