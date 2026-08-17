import { AXES, TRUST_META, computeMatch, type Candidate, type Mission } from "@/data/mock";
import { leadershipStyle } from "@/lib/scoring";
import { En } from "@/components/common";
import { Printer, X, Award, Target, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

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
          fontSize="11" fontWeight="700" fill="#334155">{a.label}</text>;
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

export function StudentReportPro({ student, missions, schoolName, today, onClose }: {
  student: Candidate; missions: Mission[]; schoolName: string; today: string; onClose: () => void;
}) {
  const style = leadershipStyle(
    [...AXES].sort((a, b) => student.axes[b.key] - student.axes[a.key]).slice(0, 2).map((a) => a.key)
  );
  const trust = TRUST_META[student.trust];
  const sorted = [...AXES].sort((a, b) => student.axes[b.key] - student.axes[a.key]);
  const strengths = sorted.slice(0, 2);
  const growth = sorted.slice(-2);

  // المهام المناسبة: تحسب المواءمة لكل مهمة مفتوحة وترتّبها
  const openMissions = missions.filter((m) => ["open", "screening", "trial"].includes(m.status));
  const ranked = openMissions
    .map((m) => ({ m, match: computeMatch(student, m) }))
    .sort((a, b) => b.match - a.match);
  const suitable = ranked.filter((r) => r.match >= 70);

  // شرح مكتوب لدعم القرار
  const decision =
    student.trust === "trusted" ? "المؤشرات متّسقة وموثوقة؛ يمكن اعتماده مباشرةً للأدوار المناسبة لملفه."
    : student.trust === "reserved" ? "المؤشرات جيدة مع تحفّظ بسيط؛ يُنصح بمقابلة قصيرة قبل الاعتماد النهائي."
    : "توجد مؤشرات تحتاج تحقّقًا (تناقض/مثالية اجتماعية)؛ يُنصح بمقابلة معمّقة قبل القرار.";

  const narrative =
    `يُظهر ${student.name} نمطًا قياديًا «${style.name}». أبرز محاوره: ${strengths.map((a) => a.label).join("، ")}، ` +
    `بينما تمثّل ${growth.map((a) => a.label).join("، ")} فرص تطوير. ` +
    `بلغت الكفايات القيادية ${student.competency}٪ والسلوك في المواقف ${student.behavior}٪. ${decision}`;

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
              <div className="text-lg font-extrabold text-brand">تقرير الطالب القيادي التفصيلي</div>
              <div className="text-slate-500">{schoolName}</div>
            </div>
            <div className="text-left text-[11px] text-slate-500">
              <div className="font-bold text-slate-700">{student.name}</div>
              <div>{student.grade}{student.className ? " · " + student.className : ""}</div>
              <div>تاريخ: <En>{today}</En></div>
            </div>
          </div>

          {/* بطاقات علوية */}
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
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
          </div>

          {/* الرسوم: راداري + أشرطة المحاور */}
          <div className="mt-4 grid items-center gap-4 sm:grid-cols-2">
            <div className="flex justify-center rounded-lg border p-2">
              <Radar axes={student.axes} />
            </div>
            <div>
              <div className="mb-1 flex items-center gap-1.5 font-bold text-slate-900"><TrendingUp className="h-4 w-4 text-brand" /> المحاور الخمسة</div>
              {AXES.map((a) => (
                <div key={a.key} className="grid grid-cols-[70px_1fr_34px] items-center gap-2 py-1">
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

          {/* التوصية بالمهام المناسبة */}
          <div className="mt-4">
            <div className="mb-1 flex items-center gap-1.5 font-bold text-slate-900"><Target className="h-4 w-4 text-brand" /> المهام المناسبة (حسب المواءمة)</div>
            {ranked.length === 0 ? (
              <div className="text-slate-500 text-[12px]">لا توجد مهام مفتوحة حاليًا لحساب المواءمة.</div>
            ) : (
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr className="text-slate-500">
                    <th className="border-b border-slate-200 p-1.5 text-right">المهمة</th>
                    <th className="border-b border-slate-200 p-1.5 text-center">المواءمة</th>
                    <th className="border-b border-slate-200 p-1.5 text-right">التوصية</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.slice(0, 6).map(({ m, match }) => (
                    <tr key={m.id}>
                      <td className="border-b border-slate-100 p-1.5 font-medium">{m.title}</td>
                      <td className="border-b border-slate-100 p-1.5 text-center font-bold"><En>{match}</En>٪</td>
                      <td className="border-b border-slate-100 p-1.5">
                        {match >= 85 ? <span className="text-emerald-700 font-semibold">مرشّح قوي — يُنصح بالاعتماد</span>
                          : match >= 70 ? <span className="text-brand font-semibold">مناسب — يُنظر فيه</span>
                          : <span className="text-slate-500">أقل ملاءمة</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {suitable.length > 0 && (
              <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" /> عدد المهام المناسبة (مواءمة ≥ ٧٠٪): <En>{suitable.length}</En>
              </div>
            )}
          </div>

          {/* الشرح المكتوب لدعم القرار */}
          <div className="mt-4 rounded-lg border-r-4 border-brand bg-slate-50 p-3">
            <div className="mb-1 font-bold text-slate-900">الخلاصة والتوصية</div>
            <p className="text-[12.5px] leading-6 text-slate-700">{narrative}</p>
          </div>

          <div className="mt-5 border-t border-slate-200 pt-2 text-[10px] text-slate-400">
            تقرير آليّ من منصة SLIS — للاستخدام الإداري الداخلي في دعم قرار الترشيح.
          </div>
        </div>
      </div>
    </div>
  );
}
