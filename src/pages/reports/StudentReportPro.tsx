import { AXES, TRUST_META, computeMatch, type Candidate, type Mission } from "@/data/mock";
import type { MissionRole } from "@/store";
import { EXPERIENCE_LABELS } from "@/data/questions";
import { leadershipStyle } from "@/lib/scoring";
import { En } from "@/components/common";
import { Printer, X, Award, Target, TrendingUp, AlertTriangle, CheckCircle2, History, ClipboardList, Lightbulb, ShieldCheck, ArrowUpRight } from "lucide-react";

const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  .slis-print-area, .slis-print-area * { visibility: visible !important; }
  .slis-print-area { position: absolute; inset: 0; margin: 0; padding: 20px; box-shadow: none !important; border: 0 !important; }
  .slis-no-print { display: none !important; }
  @page { size: A4; margin: 12mm; }
}
`;

const AX_KEYS = AXES.map((a) => a.key);

// توصيات استثمار نقاط القوة (لكل محور)
const AXIS_LEVERAGE: Record<string, string> = {
  org: "كلّفه بتنظيم الفعاليات والجداول ومتابعة الالتزام — يبرع في الأدوار التنظيمية والإدارية.",
  lead: "امنحه قيادة فريق صغير أو مسؤولية مباشرة؛ لديه استعداد قيادي واضح يستحق التوظيف.",
  comm: "استثمر مهاراته في التنسيق بين الفرق والعرض والتمثيل والتواصل مع الجهات.",
  firm: "أوكِل إليه مهام تتطلب حزمًا ونزاهة كالمتابعة والرقابة والتحكيم وحفظ النظام.",
  init: "ضعه في مهام تحتاج مبادرة ومرونة وابتكارًا ومواجهة المتغيّرات المفاجئة.",
};
// توصيات تطوير فرص النمو (لكل محور)
const AXIS_DEVELOP: Record<string, string> = {
  org: "درّبه على إدارة الوقت وترتيب الأولويات وإنهاء المهام في مواعيدها المحدّدة.",
  lead: "امنحه مسؤوليات صغيرة متدرّجة لبناء الثقة القيادية خطوةً بخطوة.",
  comm: "أشركه في أنشطة جماعية وعروض قصيرة لتطوير التواصل والثقة أمام الآخرين.",
  firm: "درّبه على اتخاذ المواقف الواضحة والالتزام بالقيم حتى تحت الضغط.",
  init: "شجّعه على اقتراح أفكار جديدة والتعامل مع التغيير بمرونة ودون قلق.",
};

// رسم راداري (مخمّس) لمحاور القيادة الخمسة
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

// بطاقة توصيات على شكل نقاط واضحة
function RecoCard({ icon: Icon, title, tone, items }: {
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
  const trust = TRUST_META[student.trust];
  const sorted = [...AXES].sort((a, b) => student.axes[b.key] - student.axes[a.key]);
  const strengths = sorted.slice(0, 2);
  const growth = sorted.slice(-2);

  // المهام المناسبة: تحسب المواءمة لكل مهمة مفتوحة وترتّبها
  const openMissions = missions.filter((m) => ["open", "screening"].includes(m.status));
  const ranked = openMissions
    .map((m) => ({ m, match: computeMatch(student, m) }))
    .sort((a, b) => b.match - a.match);
  const suitable = ranked.filter((r) => r.match >= 70);

  // ===== مطابقة ذكية مع الوصف الوظيفي للمسمّيات + الخبرات السابقة =====
  const sPrefs = (student as any).rolePrefs as { role_title: string; prior_assigned: boolean }[] | undefined;
  const priorTitles = new Set((sPrefs || []).filter((p) => p.prior_assigned).map((p) => p.role_title));
  const chosenTitles = new Set((sPrefs || []).map((p) => p.role_title));
  const assignedTitles = new Set(assignedMissions.map((m) => m.title));
  const experienceTitles = Array.from(new Set([...priorTitles, ...assignedTitles]));

  const roleFits = roles.filter((r) => r.active !== false).map((r) => {
    // نسبة التطابق = نتائج محاور الطالب موزونة بأولويات الوصف الوظيفي للمسمّى
    const fit = Math.round(AXES.reduce((s, a) => s + student.axes[a.key] * (r.weights[a.key] || 0), 0) / 100);
    const hasPrior = priorTitles.has(r.title) || assignedTitles.has(r.title);
    const chosen = chosenTitles.has(r.title);
    // ملاءمة نهائية محدودة: التطابق + أثر بسيط للخبرة السابقة (حتى +٥)
    const suitability = Math.min(100, fit + (hasPrior ? 5 : 0));
    const keyAxes = AXES.filter((a) => (r.weights[a.key] || 0) >= 20); // محاور المسمّى الأعلى وزنًا
    const strengths = keyAxes.filter((a) => student.axes[a.key] >= 75);
    const gaps = keyAxes.filter((a) => student.axes[a.key] < 70);
    const verdict = suitability >= 85 ? "عالي التطابق" : suitability >= 70 ? "مناسب" : "أقل تطابقًا";
    return { r, fit, suitability, hasPrior, chosen, strengths, gaps, verdict };
  }).sort((a, b) => b.suitability - a.suitability);
  const bestFit = roleFits[0];

  // المحاولات (الأحدث أولًا)
  const attempts = student.attempts || [];
  const attemptCount = attempts.length;
  const best = attempts.find((a) => a.best) || attempts[0];
  const first = attempts[attempts.length - 1];
  const delta = best && first ? best.composite - first.composite : 0;

  // ===== توليد التوصيات التحليلية (نقاط مقسّمة) =====
  // 1) قرار الاعتماد
  const decisionItems: string[] = [
    student.trust === "trusted"
      ? "المؤشرات موثوقة ومتّسقة — يمكن اعتماده مباشرةً للأدوار المناسبة لملفه دون حاجة لمقابلة."
      : student.trust === "reserved"
        ? "المؤشرات جيدة مع تحفّظ بسيط — يُنصح بمقابلة قصيرة (١٠–١٥ دقيقة) للتأكيد قبل الاعتماد النهائي."
        : "توجد مؤشرات تحتاج تحقّقًا — يُنصح بمقابلة معمّقة قبل أي قرار اعتماد.",
  ];
  const gap = student.competency - student.behavior;
  if (gap >= 20) decisionItems.push(`فجوة بين الكفاية النظرية (${student.competency}٪) والسلوك الفعلي (${student.behavior}٪): قوي معرفيًا ويحتاج فرص تطبيق عملي.`);
  else if (gap <= -20) decisionItems.push(`السلوك الفعلي (${student.behavior}٪) أعلى من الكفاية النظرية (${student.competency}٪): عملي وميداني، ويُدعَم جانبه المعرفي.`);
  if (experienceTitles.length > 0) decisionItems.push(`لدى الطالب خبرة سابقة في: ${experienceTitles.join("، ")} — تُرجّح جاهزيته لأدوار مماثلة.`);
  if (bestFit) decisionItems.push(`أعلى تطابق مع الوصف الوظيفي: «${bestFit.r.title}» بنسبة ${bestFit.suitability}٪ (${bestFit.verdict}).`);

  // 2) نقاط الاستثمار الفوري (نقاط القوة)
  const leverageItems = strengths.map((a) => `${a.label} (${student.axes[a.key]}٪): ${AXIS_LEVERAGE[a.key]}`);

  // 3) خطة التطوير (فرص النمو)
  const developItems = growth.map((a) => `${a.label} (${student.axes[a.key]}٪): ${AXIS_DEVELOP[a.key]}`);

  // 4) التوصية بالأدوار
  const roleItems: string[] = suitable.slice(0, 4).map(({ m, match }) =>
    `${m.title} — مواءمة ${match}٪: ${match >= 85 ? "مرشّح قوي، يُنصح بالاعتماد." : "مناسب، يُنظر فيه."}`);
  if (roleItems.length === 0) roleItems.push("لا توجد مهام مفتوحة عالية المواءمة حاليًا — أعد التقييم عند فتح مهام جديدة.");

  // 5) تنبيهات المصداقية
  const alertItems: string[] = [];
  if (student.contradiction >= 6) alertItems.push(`ارتفاع درجة التناقض (${student.contradiction}/١٠): راجع اتساق إجاباته عبر أسئلة موقفية في المقابلة.`);
  if (student.socialDesirability >= 4) alertItems.push(`ميل للمثالية الاجتماعية (${student.socialDesirability}/٥): قد يقدّم صورة مثالية؛ تحقّق بمواقف واقعية.`);
  if (attemptCount > 1 && delta >= 8) alertItems.push(`تحسّن أداؤه عبر المحاولات (+${delta} نقطة): مؤشر على التعلّم والتطوّر — إيجابي.`);
  if (attemptCount > 1 && delta <= -8) alertItems.push(`تراجع أداؤه عبر المحاولات (${delta} نقطة): يُستحسن معرفة سبب التذبذب.`);

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black/40 p-3 md:p-6" onClick={onClose}>
      <style>{PRINT_CSS}</style>
      <div className="mx-auto max-w-3xl" onClick={(e) => e.stopPropagation()}>
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
              <div className="text-[11px] text-slate-500">مركز التدريب والتطوير · تقرير الطالب القيادي التفصيلي</div>
            </div>
            <div className="text-left text-[11px] text-slate-500">
              <div className="font-bold text-slate-700">{student.name}</div>
              <div>{student.grade}{student.className ? " · " + student.className : ""}</div>
              <div>تاريخ التقرير: <En>{today}</En></div>
              {student.assessedAt && <div>تاريخ الاختبار: <En>{student.assessedAt}</En></div>}
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                <Award className="h-3 w-3" /> خبرة قيادية: {EXPERIENCE_LABELS[student.experience ?? 0]}
              </div>
            </div>
          </div>

          {/* بطاقات علوية */}
          <div className="mt-4 grid gap-3 sm:grid-cols-5">
            <div className="rounded-lg border p-3 text-center">
              <div className="text-[11px] text-slate-500">النمط القيادي</div>
              <div className="mt-0.5 font-extrabold text-brand">{style.name}</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-[11px] text-slate-500">تصنيف الثقة</div>
              <div className="mt-0.5 font-extrabold">{trust.label}</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-[11px] text-slate-500">الكفايات / السلوك</div>
              <div className="mt-0.5 font-extrabold"><En>{student.competency}</En>٪ / <En>{student.behavior}</En>٪</div>
            </div>
            <div className="rounded-lg border p-3 text-center">
              <div className="text-[11px] text-slate-500">عدد المحاولات</div>
              <div className="mt-0.5 font-extrabold"><En>{attemptCount || 1}</En>{attemptCount > 1 ? " (الأفضل)" : ""}</div>
            </div>
            <div className="rounded-lg border border-brand/30 bg-brand/5 p-3 text-center">
              <div className="text-[11px] text-slate-500">مهام سبق تكليفه بها</div>
              <div className="mt-0.5 font-extrabold text-brand"><En>{assignedMissions.length}</En></div>
            </div>
          </div>

          {/* سجل التكليفات السابقة (يؤخذ في الاعتبار عند القرار) */}
          {assignedMissions.length > 0 && (
            <div className="mt-4 rounded-lg border border-brand/25 bg-brand/5 p-3">
              <div className="mb-1.5 flex items-center gap-1.5 font-bold text-brand"><ClipboardList className="h-4 w-4" /> المهام المعتمدة للطالب في الفترات السابقة (<En>{assignedMissions.length}</En>)</div>
              <ul className="grid gap-1 sm:grid-cols-2">
                {assignedMissions.map((m) => (
                  <li key={m.id} className="flex items-center gap-1.5 text-[12.5px] text-slate-700">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    <span className="font-semibold">{m.title}</span>
                    <span className="text-slate-500">— {m.scopeLabel}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-1.5 text-[11px] text-slate-500">يُراعى عدد التكليفات السابقة عند ترشيح الطالب لمهام جديدة لتوزيع الفرص القيادية بعدالة.</p>
            </div>
          )}

          {/* الرسوم: راداري + أشرطة المحاور */}
          <div className="mt-4 grid items-center gap-4 sm:grid-cols-2">
            <div className="flex justify-center rounded-lg border p-2">
              <Radar axes={student.axes} />
            </div>
            <div>
              <div className="mb-1 flex items-center gap-1.5 font-bold text-slate-900"><TrendingUp className="h-4 w-4 text-brand" /> المحاور الخمسة</div>
              {AXES.map((a) => (
                <div key={a.key} className="grid grid-cols-[110px_1fr_34px] items-center gap-2 py-1">
                  <span className="text-[12px] text-slate-600">{a.label}</span>
                  <Bar v={student.axes[a.key]} />
                  <span className="text-left text-[11px] font-bold"><En>{student.axes[a.key]}</En></span>
                </div>
              ))}
            </div>
          </div>

          {/* القوة والتطوير */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
              <div className="mb-1 flex items-center gap-1.5 font-bold text-emerald-800"><Award className="h-4 w-4" /> نقاط القوة</div>
              <ul className="list-disc pr-4 text-[12px] text-slate-700">
                {strengths.map((a) => <li key={a.key}>{a.label} — <En>{student.axes[a.key]}</En>٪</li>)}
              </ul>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
              <div className="mb-1 flex items-center gap-1.5 font-bold text-amber-800"><AlertTriangle className="h-4 w-4" /> فرص التطوير</div>
              <ul className="list-disc pr-4 text-[12px] text-slate-700">
                {growth.map((a) => <li key={a.key}>{a.label} — <En>{student.axes[a.key]}</En>٪</li>)}
              </ul>
            </div>
          </div>

          {/* ===== التوصيات التحليلية (نقاط مقسّمة لدعم القرار) ===== */}
          <div className="mt-5">
            <div className="mb-2 flex items-center gap-1.5 font-bold text-slate-900"><ClipboardList className="h-4 w-4 text-brand" /> التوصيات التحليلية لدعم القرار</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <RecoCard icon={ShieldCheck} tone="brand" title="قرار الاعتماد" items={decisionItems} />
              <RecoCard icon={Target} tone="emerald" title="التوصية بالأدوار والمهام" items={roleItems} />
              <RecoCard icon={ArrowUpRight} tone="emerald" title="استثمار فوري لنقاط القوة" items={leverageItems} />
              <RecoCard icon={Lightbulb} tone="amber" title="خطة التطوير المقترحة" items={developItems} />
            </div>
            {alertItems.length > 0 && (
              <div className="mt-3"><RecoCard icon={AlertTriangle} tone="rose" title="تنبيهات المصداقية والملاحظات" items={alertItems} /></div>
            )}
          </div>

          {/* ===== مطابقة الطالب مع الوصف الوظيفي للمسمّيات (تحليل ذكي) ===== */}
          {roleFits.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 flex items-center gap-1.5 font-bold text-slate-900"><Target className="h-4 w-4 text-brand" /> مطابقة الطالب مع الوصف الوظيفي للمسمّيات القيادية</div>
              <div className="space-y-2.5">
                {roleFits.slice(0, 5).map(({ r, fit, suitability, hasPrior, chosen, strengths, gaps, verdict }) => {
                  const vTone = suitability >= 85 ? "text-emerald-700" : suitability >= 70 ? "text-brand" : "text-amber-700";
                  return (
                    <div key={r.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900">{r.title}</span>
                        <span className={`text-[11px] font-bold ${vTone}`}>{verdict}</span>
                        {hasPrior && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">خبرة سابقة</span>}
                        {chosen && <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">من اختيار الطالب</span>}
                        <span className="mr-auto flex items-center gap-2">
                          <Bar v={suitability} />
                          <span className="font-display text-sm font-extrabold text-brand"><En>{suitability}</En>٪</span>
                        </span>
                      </div>
                      {r.description && <div className="mt-1 text-[11.5px] text-slate-500">{r.description}</div>}
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
                        <span className="text-slate-600">تطابق المحاور: <b className="text-slate-800"><En>{fit}</En>٪</b></span>
                        {strengths.length > 0 && <span className="text-emerald-700">نقاط تطابق: {strengths.map((a) => a.label).join("، ")}</span>}
                        {gaps.length > 0 && <span className="text-amber-700">فجوات على محاور المسمّى: {gaps.map((a) => a.label).join("، ")}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-1.5 text-[11px] text-slate-500">تُحسب نسبة التطابق من مطابقة نتائج محاور الطالب مع أوزان الوصف الوظيفي لكل مسمّى، وتُراعى الخبرة السابقة بأثر محدود.</div>
            </div>
          )}

          {/* ===== سجل المحاولات (التاريخ والفروقات) ===== */}
          {attemptCount > 1 && (
            <div className="mt-5">
              <div className="mb-1 flex items-center gap-1.5 font-bold text-slate-900"><History className="h-4 w-4 text-brand" /> سجل المحاولات ({<En>{attemptCount}</En>}) — نُعتمد الأفضل مع إتاحة المقارنة</div>
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="text-slate-500">
                    <th className="border-b border-slate-200 p-1.5 text-right">#</th>
                    <th className="border-b border-slate-200 p-1.5 text-right">التاريخ</th>
                    <th className="border-b border-slate-200 p-1.5 text-center">الكفاية</th>
                    <th className="border-b border-slate-200 p-1.5 text-center">السلوك</th>
                    <th className="border-b border-slate-200 p-1.5 text-center">المؤشر المركّب</th>
                    <th className="border-b border-slate-200 p-1.5 text-center">الثقة</th>
                    <th className="border-b border-slate-200 p-1.5 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map((a, i) => (
                    <tr key={a.id} className={a.best ? "bg-emerald-50/60" : ""}>
                      <td className="border-b border-slate-100 p-1.5"><En>{attemptCount - i}</En></td>
                      <td className="border-b border-slate-100 p-1.5"><En>{a.date}</En></td>
                      <td className="border-b border-slate-100 p-1.5 text-center"><En>{a.competency}</En>٪</td>
                      <td className="border-b border-slate-100 p-1.5 text-center"><En>{a.behavior}</En>٪</td>
                      <td className="border-b border-slate-100 p-1.5 text-center font-bold"><En>{a.composite}</En>٪</td>
                      <td className="border-b border-slate-100 p-1.5 text-center">{TRUST_META[a.trust]?.label || a.trust}</td>
                      <td className="border-b border-slate-100 p-1.5 text-center">
                        {a.best ? <span className="font-semibold text-emerald-700">★ الأفضل (معتمد)</span> : <span className="text-slate-400">محاولة</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                جميع المحاولات محفوظة. المعتمَد في التقرير هو الأفضل (الأعلى مؤشرًا مركّبًا){delta !== 0 ? ` — الفارق عن أول محاولة ${delta > 0 ? "+" : ""}${delta} نقطة` : ""}.
              </div>
            </div>
          )}

          <div className="mt-5 border-t border-slate-200 pt-2 text-[10px] text-slate-400">
            تقرير آليّ من نظام مؤشر — للاستخدام الإداري الداخلي في دعم قرار الترشيح.
          </div>
        </div>
      </div>
    </div>
  );
}
