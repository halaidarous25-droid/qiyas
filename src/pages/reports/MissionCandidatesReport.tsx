import { createPortal } from "react-dom";
import { AXES, type Candidate, type Mission, type AxisKey } from "@/data/mock";
import { En } from "@/components/common";
import { Printer, X, Target, Award, Crown, Medal, MapPin, CheckCircle2 } from "lucide-react";

// طبقة الطباعة: يُنقل التقرير إلى جسم الصفحة (portal) ويُخفى ما عداه حتى تُطبع نسخة واحدة فقط
const PRINT_CSS = `
@media print {
  body > *:not(.slis-report-portal) { display: none !important; }
  .slis-report-portal { position: static !important; background: #fff !important; padding: 0 !important; margin: 0 !important; overflow: visible !important; }
  .slis-report-portal .slis-report-inner { max-width: none !important; margin: 0 !important; }
  .slis-print-area { position: static !important; box-shadow: none !important; border: 0 !important; padding: 0 !important; }
  .slis-no-print { display: none !important; }
  .slis-cand-card { break-inside: avoid; }
  @page { size: A4; margin: 12mm; }
}
`;

// لون خلية المحور حسب القيمة
function cellTone(v: number): string {
  if (v >= 80) return "bg-emerald-50 text-emerald-800";
  if (v >= 60) return "bg-brand/5 text-brand";
  if (v >= 40) return "bg-amber-50 text-amber-800";
  return "bg-rose-50 text-rose-700";
}
function matchTone(v: number): string {
  if (v >= 85) return "text-emerald-700";
  if (v >= 70) return "text-brand";
  return "text-amber-700";
}
function verdictOf(v: number): { label: string; tone: string } {
  if (v >= 85) return { label: "مرشّح قوي — يُنصح بالاعتماد", tone: "text-emerald-700" };
  if (v >= 70) return { label: "مناسب — يُنظر فيه", tone: "text-brand" };
  if (v >= 55) return { label: "مناسب مشروط — يحتاج تحقّقًا ميدانيًا", tone: "text-amber-700" };
  return { label: "أقل مواءمة — يُفضّل تطويره أولًا", tone: "text-rose-700" };
}
function levelWord(v: number): string {
  if (v >= 80) return "عاليًا";
  if (v >= 60) return "جيدًا";
  if (v >= 45) return "متوسطًا";
  return "منخفضًا";
}

// توليد شرح (٢–٣ أسطر) لمدى مواءمة المرشّح للمهمة بناءً على محاورها الأهم
function narrative(c: Candidate, m: Mission, keyAxes: { key: AxisKey; label: string }[]): string {
  const strong = keyAxes.filter((a) => c.axes[a.key] >= 80).map((a) => a.label);
  const weak = keyAxes.filter((a) => c.axes[a.key] < 60).map((a) => a.label);
  const keyAvg = Math.round(keyAxes.reduce((s, a) => s + c.axes[a.key], 0) / (keyAxes.length || 1));
  const s1 = `يُظهر ${c.name} مستوى ${levelWord(keyAvg)} في المحاور التي تتطلّبها مهمة «${m.title}».`;
  const s2 = strong.length
    ? `أبرز قوّته في ${strong.join("، ")}${weak.length ? `، مع حاجة إلى تعزيز ${weak.join("، ")}` : "، وأداؤه متوازن عبر بقية المحاور المطلوبة"}.`
    : weak.length
      ? `يحتاج إلى تعزيز ${weak.join("، ")} وهي من محاور المهمة الأساسية.`
      : "أداؤه متوازن عبر محاور المهمة دون نقاط ضعف بارزة.";
  const v = verdictOf(c.match);
  const s3 = c.match >= 85
    ? "نتيجته تجعله من أقوى المرشّحين لهذه المهمة."
    : c.match >= 70
      ? "مواءمته جيدة وتؤهّله للترشّح لهذه المهمة."
      : "مواءمته محدودة نسبيًا ويُستحسن التحقّق قبل الإسناد.";
  return `${s1} ${s2} ${s3} (${v.label}).`;
}

export function MissionCandidatesReport({ mission, ranked, assignedIds = [], schoolName, today, onClose }: {
  mission: Mission; ranked: Candidate[]; assignedIds?: string[]; schoolName: string; today: string; onClose: () => void;
}) {
  const assignedSet = new Set(assignedIds);
  // محاور المهمة الأهم (الأعلى وزنًا) — تُبرز ما يهمّ في هذه المهمة تحديدًا
  const keyAxes = [...AXES].sort((a, b) => (mission.weights[b.key] || 0) - (mission.weights[a.key] || 0))
    .slice(0, 3).map((a) => ({ key: a.key as AxisKey, label: a.label }));
  const avg = ranked.length ? Math.round(ranked.reduce((s, c) => s + c.match, 0) / ranked.length) : 0;
  const top = ranked[0];
  const medals = ["text-amber-500", "text-slate-400", "text-amber-700"]; // ذهبي/فضي/برونزي

  const report = (
    <div className="slis-report-portal fixed inset-0 z-50 overflow-auto bg-black/40 p-3 md:p-6" onClick={onClose}>
      <style>{PRINT_CSS}</style>
      <div className="slis-report-inner mx-auto max-w-4xl" onClick={(e) => e.stopPropagation()}>
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
              <div className="text-[11px] text-slate-500">مركز التدريب والتطوير · تقرير مقارن لمرشّحي المهمة</div>
            </div>
            <div className="text-left text-[11px] text-slate-500">
              <div>تاريخ التقرير: <En>{today}</En></div>
              {mission.academicYear && <div>السنة الدراسية: {mission.academicYear}</div>}
            </div>
          </div>

          {/* عنوان المهمة */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand text-white"><Target className="h-6 w-6" /></div>
            <div className="flex-1">
              <h1 className="font-display text-xl font-extrabold text-slate-900">{mission.title}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-slate-500">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {mission.scopeLabel}</span>
                <span>المقاعد: <b className="text-slate-700"><En>{mission.seats}</En></b></span>
                <span>المرشّحون: <b className="text-slate-700"><En>{ranked.length}</En></b></span>
              </div>
            </div>
          </div>
          <p className="mt-2 text-[12px] text-slate-500">
            الغرض: مقارنة المرشّحين لهذه المهمة وترتيبهم حسب نسبة المطابقة، مع شرح موجز لكل مرشّح ونتيجته.
            محاور المهمة الأهم: <b className="text-brand">{keyAxes.map((a) => a.label).join("، ")}</b>.
          </p>
          <p className="mt-1 rounded-md bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500">
            <b className="text-slate-700">المطابقة = المواءمة:</b> مصطلح واحد يعني مدى ملاءمة نتائج محاور الطالب لأوزان معايير هذه المهمة،
            وتُحسب بنفس الطريقة في كل الشاشات والتقارير — فالنسبة لنفس الطالب في هذه المهمة واحدة أينما ظهرت.
            يظهر وزن كل معيار في رأس عموده بالجدول أدناه ليتّضح تأثيره في التقييم.
          </p>

          {/* بطاقات علوية */}
          <div className="mt-4 grid gap-2.5 sm:grid-cols-4">
            {[
              { l: "عدد المرشّحين", v: ranked.length },
              { l: "المقاعد المتاحة", v: mission.seats },
              { l: "متوسط المطابقة", v: `${avg}٪` },
              { l: "أعلى مرشّح", v: top ? `${top.match}٪` : "—" },
            ].map((s) => (
              <div key={s.l} className="rounded-lg border border-slate-200 p-3 text-center">
                <div className="text-[11px] text-slate-500">{s.l}</div>
                <div className="mt-0.5 font-display text-xl font-extrabold text-brand"><En>{String(s.v)}</En></div>
              </div>
            ))}
          </div>

          {/* جدول المقارنة (محاور كل مرشّح + المطابقة + الحالة) */}
          <div className="mt-5">
            <div className="mb-1.5 font-bold text-slate-900">جدول المقارنة</div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    <th className="border border-slate-200 p-2 text-right">#</th>
                    <th className="border border-slate-200 p-2 text-right">المرشّح</th>
                    {AXES.map((a) => (
                      <th key={a.key} className="border border-slate-200 p-2 text-center align-top">
                        <div>{a.short}</div>
                        <div className="mt-0.5 text-[9px] font-normal text-brand" title="وزن هذا المعيار في تقييم هذه المهمة">
                          الوزن <En>{mission.weights[a.key] || 0}</En>٪
                        </div>
                      </th>
                    ))}
                    <th className="border border-slate-200 p-2 text-center">المطابقة</th>
                    <th className="border border-slate-200 p-2 text-center">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((c, i) => (
                    <tr key={c.id}>
                      <td className="border border-slate-200 p-2 text-center font-bold text-slate-500"><En>{i + 1}</En></td>
                      <td className="border border-slate-200 p-2 font-semibold text-slate-800">{c.name}</td>
                      {AXES.map((a) => (
                        <td key={a.key} className={`border border-slate-200 p-2 text-center font-semibold ${cellTone(c.axes[a.key])}`}>
                          <En>{c.axes[a.key]}</En>٪
                        </td>
                      ))}
                      <td className={`border border-slate-200 p-2 text-center font-extrabold ${matchTone(c.match)}`}><En>{c.match}</En>٪</td>
                      <td className="border border-slate-200 p-2 text-center">
                        {assignedSet.has(c.id)
                          ? <span className="font-semibold text-emerald-700">مكلّف</span>
                          : i < mission.seats ? <span className="text-brand">ضمن المقاعد</span>
                          : <span className="text-slate-400">مرشّح</span>}
                      </td>
                    </tr>
                  ))}
                  {ranked.length === 0 && <tr><td colSpan={AXES.length + 4} className="border border-slate-200 p-3 text-center text-slate-500">لا مرشّحون بعد.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-3 text-[10px] text-slate-500">
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-200" /> ٨٠٪ فأعلى</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-brand/20" /> ٦٠–٧٩٪</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-200" /> ٤٠–٥٩٪</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-rose-200" /> أقل من ٤٠٪</span>
            </div>
          </div>

          {/* بطاقات المرشّحين المرتّبة مع الشرح */}
          <div className="mt-5">
            <div className="mb-2 font-bold text-slate-900">ترتيب المرشّحين والتحليل</div>
            <div className="space-y-3">
              {ranked.map((c, i) => {
                const v = verdictOf(c.match);
                return (
                  <div key={c.id} className="slis-cand-card rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      {/* رتبة/وسام */}
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-slate-100">
                        {i < 3
                          ? (i === 0 ? <Crown className={`h-5 w-5 ${medals[0]}`} /> : <Medal className={`h-5 w-5 ${medals[i]}`} />)
                          : <span className="font-display text-sm font-extrabold text-slate-500"><En>{i + 1}</En></span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-900">{c.name}</span>
                          {c.className && <span className="text-[11px] text-slate-400">{c.className}</span>}
                          {assignedSet.has(c.id) && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800"><CheckCircle2 className="h-3 w-3" /> مكلّف</span>}
                          <span className={`text-[11px] font-bold ${v.tone}`}>{v.label}</span>
                        </div>
                      </div>
                      {/* حلقة المطابقة */}
                      <div className="flex shrink-0 flex-col items-center">
                        <div className="relative h-14 w-14 rounded-full"
                          style={{ background: `conic-gradient(hsl(191 72% 30%) ${c.match * 3.6}deg, #e2e8f0 0deg)` }}>
                          <div className="absolute inset-[16%] grid place-items-center rounded-full bg-white">
                            <span className="font-display text-[13px] font-extrabold text-brand"><En>{c.match}</En>٪</span>
                          </div>
                        </div>
                        <span className="mt-0.5 text-[9px] text-slate-400">المطابقة</span>
                      </div>
                    </div>

                    {/* شرائح المحاور */}
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {AXES.map((a) => {
                        const isKey = keyAxes.some((k) => k.key === a.key);
                        return (
                          <span key={a.key} className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] ${cellTone(c.axes[a.key])} ${isKey ? "ring-1 ring-brand/30" : ""}`}>
                            {a.label} <b><En>{c.axes[a.key]}</En>٪</b>
                          </span>
                        );
                      })}
                    </div>

                    {/* الشرح (٢–٣ أسطر) */}
                    <p className="mt-2.5 rounded-lg bg-slate-50 px-3 py-2 text-[12.5px] leading-6 text-slate-700">
                      {narrative(c, mission, keyAxes)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* الخلاصة الإدارية */}
          {ranked.length > 0 && (
            <div className="mt-5 rounded-lg border border-brand/25 bg-brand/5 p-4">
              <div className="mb-1.5 flex items-center gap-1.5 font-bold text-brand"><Award className="h-4 w-4" /> الخلاصة الإدارية</div>
              <ul className="space-y-1">
                {ranked.slice(0, Math.max(mission.seats, Math.min(5, ranked.length))).map((c, i) => {
                  const v = verdictOf(c.match);
                  const within = i < mission.seats;
                  return (
                    <li key={c.id} className="flex gap-1.5 text-[12.5px] leading-6 text-slate-700">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                      <span><b className="text-slate-900">{c.name}</b> — {v.label}{within ? "، ويقع ضمن المقاعد المتاحة" : ""}.</span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-[11px] text-slate-500">
                ملاحظة: نتائج المؤشر أداة مساندة لاتخاذ القرار، ويُستحسن دمجها مع الملاحظة الميدانية والأداء الفعلي للطالب.
              </p>
            </div>
          )}

          <div className="mt-5 border-t border-slate-200 pt-2 text-[10px] text-slate-400">
            تقرير آليّ من نظام مؤشر — للاستخدام الإداري الداخلي في دعم قرار الترشيح للمهمة.
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(report, document.body);
}
