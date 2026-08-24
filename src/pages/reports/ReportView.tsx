import { AXES, type Candidate, type Mission } from "@/data/mock";
import { leadershipStyle } from "@/lib/scoring";
import { En } from "@/components/common";
import { Printer, X } from "lucide-react";

// اسم النمط القيادي من أعلى محورين للطالب
function leadershipTop2Name(c: Candidate): string {
  const top = [...AXES].sort((a, b) => c.axes[b.key] - c.axes[a.key]).slice(0, 2).map((a) => a.key);
  return leadershipStyle(top).name;
}

// طبقة الطباعة: تُخفي كل شيء عدا منطقة التقرير عند الطباعة/حفظ PDF
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  .slis-print-area, .slis-print-area * { visibility: visible !important; }
  .slis-print-area { position: absolute; inset: 0; margin: 0; padding: 24px; box-shadow: none !important; border: 0 !important; }
  .slis-no-print { display: none !important; }
  @page { size: A4; margin: 14mm; }
}
`;

function ReportShell({ title, subtitle, schoolName, today, onClose, children }: {
  title: string; subtitle: string; schoolName: string; today: string;
  onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black/40 p-3 md:p-6" onClick={onClose}>
      <style>{PRINT_CSS}</style>
      <div className="mx-auto max-w-3xl" onClick={(e) => e.stopPropagation()}>
        {/* شريط الأدوات (لا يُطبع) */}
        <div className="slis-no-print mb-3 flex items-center justify-between">
          <button onClick={onClose} className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 h-9 text-sm font-semibold hover:bg-accent">
            <X className="h-4 w-4" /> إغلاق
          </button>
          <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 h-9 text-sm font-semibold text-white hover:bg-brand/90">
            <Printer className="h-4 w-4" /> طباعة / حفظ PDF
          </button>
        </div>

        {/* ورقة التقرير */}
        <div className="slis-print-area rounded-xl border bg-white p-6 text-[13px] leading-6 text-slate-800 shadow-xl" dir="rtl">
          <div className="flex items-start justify-between border-b border-slate-200 pb-3">
            <div>
              <div className="text-lg font-extrabold text-brand">نظام مؤشر لقياس المهارات الطلابية</div>
              <div className="font-semibold text-slate-700">{schoolName}</div>
              <div className="text-[11px] text-slate-500">مركز التدريب والتطوير</div>
            </div>
            <div className="text-left text-[11px] text-slate-500">
              <div>{title}</div>
              <div>تاريخ التوليد: <En>{today}</En></div>
            </div>
          </div>
          <h1 className="mt-4 text-xl font-extrabold text-slate-900">{title}</h1>
          <div className="text-slate-500">{subtitle}</div>
          <div className="mt-4">{children}</div>
          <div className="mt-6 border-t border-slate-200 pt-2 text-[10px] text-slate-400">
            تقرير آليّ من نظام مؤشر — للاستخدام الإداري الداخلي.
          </div>
        </div>
      </div>
    </div>
  );
}

function Bar({ v }: { v: number }) {
  return (
    <span className="inline-block h-2 w-28 overflow-hidden rounded bg-slate-200 align-middle">
      <span className="block h-full rounded bg-brand" style={{ width: `${Math.max(0, Math.min(100, v))}%` }} />
    </span>
  );
}

// بطاقة إحصائية صغيرة
function Stat({ label, value, sub, tone = "brand" }: { label: string; value: React.ReactNode; sub?: string; tone?: string }) {
  const tones: Record<string, string> = {
    brand: "text-brand", gold: "text-amber-600", emerald: "text-emerald-600", slate: "text-slate-700",
  };
  return (
    <div className="rounded-lg border border-slate-200 p-3 text-center">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className={`mt-0.5 font-display text-xl font-extrabold ${tones[tone]}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-400">{sub}</div>}
    </div>
  );
}

// حلقة نسبة (conic) — للطباعة والعرض
function Donut({ value, label, color = "hsl(191 72% 30%)" }: { value: number; label: string; color?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-24 w-24 rounded-full" style={{ background: `conic-gradient(${color} ${v * 3.6}deg, #e2e8f0 0deg)` }}>
        <div className="absolute inset-[18%] grid place-items-center rounded-full bg-white">
          <span className="font-display text-lg font-extrabold text-slate-800"><En>{Math.round(v)}</En>%</span>
        </div>
      </div>
      <div className="mt-1 text-[11px] font-semibold text-slate-600">{label}</div>
    </div>
  );
}

// رسم راداري مخمّس لمتوسط المحاور
function MiniRadar({ axes }: { axes: Record<string, number> }) {
  const keys = AXES.map((a) => a.key);
  const cx = 110, cy = 100, R = 78, n = keys.length;
  const pt = (i: number, r: number) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + r * Math.cos(ang), cy + r * Math.sin(ang)];
  };
  const poly = (pts: number[][]) => pts.map((p) => p.join(",")).join(" ");
  const valuePts = keys.map((k, i) => pt(i, (Math.max(0, Math.min(100, axes[k] || 0)) / 100) * R));
  return (
    <svg width="220" height="205" viewBox="0 0 220 205">
      {[0.25, 0.5, 0.75, 1].map((r, i) => (
        <polygon key={i} points={poly(keys.map((_, j) => pt(j, r * R)))} fill="none" stroke="#e2e8f0" strokeWidth="1" />
      ))}
      {keys.map((_, i) => { const [x, y] = pt(i, R); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#e2e8f0" strokeWidth="1" />; })}
      <polygon points={poly(valuePts)} fill="rgba(15,92,102,0.20)" stroke="hsl(191 72% 30%)" strokeWidth="2" />
      {valuePts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.5" fill="hsl(191 72% 30%)" />)}
      {AXES.map((a, i) => { const [x, y] = pt(i, R + 14); return <text key={a.key} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="10" fontWeight="700" fill="#334155">{a.short}</text>; })}
    </svg>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-1.5">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{children}</span>
    </div>
  );
}

// ===== تقرير الطالب =====
export function StudentReport({ student, missions, schoolName, today, onClose }: {
  student: Candidate; missions: { mission: Mission; rank: number; match: number; seat: boolean }[];
  schoolName: string; today: string; onClose: () => void;
}) {
  const style = leadershipTop2Name(student);
  return (
    <ReportShell title="تقرير الطالب القيادي" subtitle={`${student.name}${student.className ? " · " + student.className : ""}`}
      schoolName={schoolName} today={today} onClose={onClose}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1 font-bold text-slate-900">المعلومات</div>
          <Row label="الاسم">{student.name}</Row>
          <Row label="الصف/الفصل">{student.className || "—"}</Row>
          <Row label="أدّى المقياس">{student.assessed ? "نعم" : "لا"}</Row>
          <Row label="النمط القيادي">{style}</Row>
          <Row label="تصنيف الثقة">{student.trust}</Row>
        </div>
        <div>
          <div className="mb-1 font-bold text-slate-900">الدرجات العامة</div>
          <Row label="الكفاية"><Bar v={student.competency} /> <En>{student.competency}</En></Row>
          <Row label="السلوك"><Bar v={student.behavior} /> <En>{student.behavior}</En></Row>
          <Row label="التناقض"><En>{student.contradiction}</En>/10</Row>
          <Row label="المرغوبية الاجتماعية"><En>{student.socialDesirability}</En>/5</Row>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 font-bold text-slate-900">المحاور القيادية الخمسة</div>
        {AXES.map((a) => (
          <Row key={a.key} label={a.label}><Bar v={student.axes[a.key]} /> <En>{student.axes[a.key]}</En></Row>
        ))}
      </div>

      <div className="mt-4">
        <div className="mb-1 font-bold text-slate-900">الترشيحات ({missions.length})</div>
        {missions.length === 0 ? <div className="text-slate-500">لا ترشيحات حالية.</div> :
          missions.map((m) => (
            <Row key={m.mission.id} label={`${m.mission.title}${m.mission.academicYear ? ` (${m.mission.academicYear})` : ""}`}>
              مطابقة <En>{m.match}%</En> · ترتيب <En>{m.rank}</En> · {m.seat ? "ضمن المقاعد" : "خارج المقاعد"}
            </Row>
          ))}
      </div>
    </ReportShell>
  );
}

// ===== تقرير المهمة =====
export function MissionReport({ mission, ranked, assignedStudents = [], schoolName, today, onClose }: {
  mission: Mission; ranked: Candidate[]; assignedStudents?: Candidate[];
  schoolName: string; today: string; onClose: () => void;
}) {
  const avg = ranked.length ? Math.round(ranked.reduce((s, c) => s + c.match, 0) / ranked.length) : 0;
  const filled = assignedStudents.length;
  const seatCov = mission.seats ? Math.round((Math.min(mission.seats, filled) / mission.seats) * 100) : 0;
  const assignedIds = new Set(assignedStudents.map((c) => c.id));
  // متوسط المحاور لمرشّحي المهمة
  const axisAvg = AXES.map((a) => ({
    key: a.key, label: a.label,
    v: ranked.length ? Math.round(ranked.reduce((s, c) => s + c.axes[a.key], 0) / ranked.length) : 0,
  }));
  const axesObj: Record<string, number> = {}; axisAvg.forEach((a) => (axesObj[a.key] = a.v));
  const topAxis = [...axisAvg].sort((a, b) => b.v - a.v)[0];
  const lowAxis = [...axisAvg].sort((a, b) => a.v - b.v)[0];
  // توزيع جودة المواءمة
  const excellent = ranked.filter((c) => c.match >= 85).length;
  const good = ranked.filter((c) => c.match >= 70 && c.match < 85).length;
  const low = ranked.filter((c) => c.match < 70).length;
  const seg = (n: number) => (ranked.length ? (n / ranked.length) * 100 : 0);

  return (
    <ReportShell title="تقرير المهمة القيادية" subtitle={`${mission.title}${mission.academicYear ? ` (${mission.academicYear})` : ""} — ${mission.scopeLabel}`}
      schoolName={schoolName} today={today} onClose={onClose}>

      {/* شارة النطاق البارزة للتفريق بين المهام */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand/8 px-3 py-1.5 text-[13px] font-bold text-brand">
          {mission.title}
        </span>
        {mission.academicYear && (
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand/30 bg-brand/5 px-3 py-1.5 text-[12px] font-semibold text-brand">
            السنة الدراسية: {mission.academicYear}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-800">
          النطاق: {mission.scopeLabel}
        </span>
      </div>

      {/* بطاقات علوية */}
      <div className="grid gap-2.5 sm:grid-cols-4">
        <Stat label="المرشّحون" value={<En>{ranked.length}</En>} />
        <Stat label="المقاعد" value={<En>{mission.seats}</En>} tone="gold" />
        <Stat label="المكلّفون" value={<><En>{filled}</En>/<En>{mission.seats}</En></>} sub={`تغطية ${seatCov}%`} tone="emerald" />
        <Stat label="متوسط المواءمة" value={<><En>{avg}</En>%</>} tone="brand" />
      </div>

      {/* رسم: راداري لمتوسط محاور المرشّحين + توزيع جودة المواءمة */}
      <div className="mt-4 grid items-center gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 p-2">
          <div className="mb-1 text-center text-[12px] font-bold text-slate-700">متوسط المحاور لمرشّحي المهمة</div>
          <div className="flex justify-center"><MiniRadar axes={axesObj} /></div>
        </div>
        <div className="space-y-3">
          <div>
            <div className="mb-1 text-[12px] font-bold text-slate-700">توزيع جودة المواءمة</div>
            <div className="flex h-5 overflow-hidden rounded-md border border-slate-200">
              <div className="bg-emerald-500" style={{ width: `${seg(excellent)}%` }} title={`ممتاز ${excellent}`} />
              <div className="bg-brand" style={{ width: `${seg(good)}%` }} title={`جيد ${good}`} />
              <div className="bg-amber-400" style={{ width: `${seg(low)}%` }} title={`متوسط ${low}`} />
            </div>
            <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-600">
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> ممتاز (≥85): <En>{excellent}</En></span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-brand" /> جيد (70–84): <En>{good}</En></span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400" /> متوسط (&lt;70): <En>{low}</En></span>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 p-2.5 text-[12px] leading-6 text-slate-700">
            <div className="font-bold text-slate-900">تحليل موجز</div>
            أقوى محور لدى المرشّحين: <b>{topAxis?.label}</b> (<En>{topAxis?.v}</En>٪)، وأضعفها: <b>{lowAxis?.label}</b> (<En>{lowAxis?.v}</En>٪).
            {filled >= mission.seats ? " اكتمل تكليف جميع المقاعد." : ` تبقّى ${mission.seats - filled} مقعد بحاجة إلى تكليف.`}
          </div>
        </div>
      </div>

      {/* المكلّفون */}
      {assignedStudents.length > 0 && (
        <div className="mt-4">
          <div className="mb-1 font-bold text-slate-900">الطلاب المكلّفون بالمهمة</div>
          <div className="flex flex-wrap gap-2">
            {assignedStudents.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[12px] font-semibold text-emerald-800">
                {c.name} · مواءمة <En>{c.match}%</En>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4">
        <div className="mb-1 font-bold text-slate-900">ترتيب المرشّحين حسب المواءمة</div>
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="text-slate-500">
              <th className="border-b border-slate-200 p-2 text-right">#</th>
              <th className="border-b border-slate-200 p-2 text-right">الطالب</th>
              <th className="border-b border-slate-200 p-2 text-right">الصف/الفصل</th>
              <th className="border-b border-slate-200 p-2 text-center">المواءمة</th>
              <th className="border-b border-slate-200 p-2 text-center">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((c, i) => {
              const isAssigned = assignedIds.has(c.id);
              const seatsFull = filled >= mission.seats;
              return (
                <tr key={c.id} className={isAssigned ? "bg-emerald-50/60" : ""}>
                  <td className="border-b border-slate-100 p-2"><En>{i + 1}</En></td>
                  <td className="border-b border-slate-100 p-2 font-medium">{c.name}</td>
                  <td className="border-b border-slate-100 p-2">{c.className || "—"}</td>
                  <td className="border-b border-slate-100 p-2">
                    <div className="flex items-center justify-center gap-1.5"><Bar v={c.match} /> <span className="font-bold"><En>{c.match}%</En></span></div>
                  </td>
                  <td className="border-b border-slate-100 p-2 text-center">
                    {isAssigned ? <span className="font-semibold text-emerald-700">مكلّف</span>
                      : seatsFull ? <span className="text-slate-400">غير مرشّح</span>
                      : <span className="text-brand">مرشّح</span>}
                  </td>
                </tr>
              );
            })}
            {ranked.length === 0 && <tr><td colSpan={5} className="p-3 text-center text-slate-500">لا مرشّحون بعد.</td></tr>}
          </tbody>
        </table>
      </div>
    </ReportShell>
  );
}

// ===== تقرير المدرسة =====
export function SchoolReport({ schoolName, today, onClose, stats }: {
  schoolName: string; today: string; onClose: () => void;
  stats: {
    students: number; assessed: number; missions: number;
    axisAvg: { key: string; label: string; v: number }[];
    styles: [string, number][];
    scope: { school: number; stage: number; grade: number };
  };
}) {
  const STYLE_COLORS = ["hsl(191 72% 30%)", "hsl(36 55% 47%)", "hsl(152 46% 40%)", "hsl(205 70% 45%)", "hsl(280 40% 55%)", "hsl(15 65% 55%)"];
  const totalStyles = stats.styles.reduce((s, [, n]) => s + n, 0) || 1;
  let acc = 0;
  const segments = stats.styles.map(([, n], i) => {
    const start = (acc / totalStyles) * 360; acc += n; const end = (acc / totalStyles) * 360;
    return `${STYLE_COLORS[i % STYLE_COLORS.length]} ${start}deg ${end}deg`;
  }).join(", ") || "#e2e8f0 0deg 360deg";
  const assessedPct = stats.students ? Math.round((stats.assessed / stats.students) * 100) : 0;
  const axesObj: Record<string, number> = {}; stats.axisAvg.forEach((a) => (axesObj[a.key] = a.v));
  const sortedAx = [...stats.axisAvg].sort((a, b) => b.v - a.v);
  const overallAvg = stats.axisAvg.length ? Math.round(stats.axisAvg.reduce((s, a) => s + a.v, 0) / stats.axisAvg.length) : 0;

  return (
    <ReportShell title="تقرير المدرسة الشامل" subtitle="ملخّص أداء القيادات الطلابية بالرسوم والتحليل"
      schoolName={schoolName} today={today} onClose={onClose}>

      {/* بطاقات علوية */}
      <div className="grid gap-2.5 sm:grid-cols-4">
        <Stat label="إجمالي الطلاب" value={<En>{stats.students}</En>} />
        <Stat label="أدّوا المقياس" value={<En>{stats.assessed}</En>} sub={`${assessedPct}%`} tone="emerald" />
        <Stat label="المهام" value={<En>{stats.missions}</En>} tone="gold" />
        <Stat label="متوسط الكفايات" value={<><En>{overallAvg}</En>%</>} tone="brand" />
      </div>

      {/* رسوم: نسبة الأداء + توزيع الأنماط (دائري) + راداري المحاور */}
      <div className="mt-4 grid items-center gap-4 sm:grid-cols-3">
        <div className="flex flex-col items-center rounded-lg border border-slate-200 p-3">
          <Donut value={assessedPct} label="نسبة من أدّوا المقياس" color="hsl(152 46% 40%)" />
        </div>
        <div className="rounded-lg border border-slate-200 p-3">
          <div className="mb-2 text-center text-[12px] font-bold text-slate-700">توزيع أنماط القيادة</div>
          <div className="flex items-center gap-3">
            <div className="relative h-24 w-24 shrink-0 rounded-full" style={{ background: `conic-gradient(${segments})` }}>
              <div className="absolute inset-[24%] grid place-items-center rounded-full bg-white">
                <span className="font-display text-sm font-extrabold text-slate-800"><En>{stats.assessed}</En></span>
              </div>
            </div>
            <div className="flex-1 space-y-1">
              {stats.styles.slice(0, 5).map(([n, c], i) => (
                <div key={n} className="flex items-center gap-1.5 text-[11px]">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: STYLE_COLORS[i % STYLE_COLORS.length] }} />
                  <span className="flex-1 truncate text-slate-600">{n}</span>
                  <span className="font-bold text-slate-800"><En>{c}</En></span>
                </div>
              ))}
              {stats.styles.length === 0 && <div className="text-[11px] text-slate-400">لا بيانات.</div>}
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 p-2">
          <div className="mb-1 text-center text-[12px] font-bold text-slate-700">متوسط المحاور (راداري)</div>
          <div className="flex justify-center"><MiniRadar axes={axesObj} /></div>
        </div>
      </div>

      {/* متوسط المحاور بالأشرطة */}
      <div className="mt-4">
        <div className="mb-1 font-bold text-slate-900">متوسط الكفايات عبر المحاور</div>
        {stats.axisAvg.map((a) => (
          <Row key={a.key} label={a.label}><Bar v={a.v} /> <En>{a.v}</En></Row>
        ))}
      </div>

      {/* توزيع الفرص + تحليل */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1 font-bold text-slate-900">توزيع الفرص بالنطاق</div>
          <Row label="المدرسة"><En>{stats.scope.school}</En></Row>
          <Row label="المرحلة"><En>{stats.scope.stage}</En></Row>
          <Row label="الصف/الفصل"><En>{stats.scope.grade}</En></Row>
        </div>
        <div className="rounded-lg border border-slate-200 p-3 text-[12px] leading-6 text-slate-700">
          <div className="font-bold text-slate-900">تحليل موجز</div>
          {sortedAx.length > 0 && (
            <>أقوى كفاية على مستوى المدرسة: <b>{sortedAx[0].label}</b> (<En>{sortedAx[0].v}</En>٪)،
              وأضعفها: <b>{sortedAx[sortedAx.length - 1].label}</b> (<En>{sortedAx[sortedAx.length - 1].v}</En>٪).{" "}</>)}
          أدّى المقياس <En>{stats.assessed}</En> من <En>{stats.students}</En> طالبًا ({assessedPct}٪).
          {assessedPct < 60 ? " يُنصح بتحفيز بقية الطلاب على أداء المقياس لاكتمال الصورة." : " نسبة مشاركة جيدة تدعم دقّة التحليل."}
        </div>
      </div>
    </ReportShell>
  );
}
