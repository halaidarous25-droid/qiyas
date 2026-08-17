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
              <div className="text-slate-500">{schoolName}</div>
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
            <Row key={m.mission.id} label={m.mission.title}>
              مطابقة <En>{m.match}%</En> · ترتيب <En>{m.rank}</En> · {m.seat ? "ضمن المقاعد" : "خارج المقاعد"}
            </Row>
          ))}
      </div>
    </ReportShell>
  );
}

// ===== تقرير المهمة =====
export function MissionReport({ mission, ranked, schoolName, today, onClose }: {
  mission: Mission; ranked: Candidate[]; schoolName: string; today: string; onClose: () => void;
}) {
  const avg = ranked.length ? Math.round(ranked.reduce((s, c) => s + c.match, 0) / ranked.length) : 0;
  return (
    <ReportShell title="تقرير المهمة القيادية" subtitle={mission.title}
      schoolName={schoolName} today={today} onClose={onClose}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Row label="النطاق">{mission.scopeLabel}</Row>
          <Row label="المقاعد"><En>{mission.seats}</En></Row>
          <Row label="المرشّحون"><En>{ranked.length}</En></Row>
        </div>
        <div>
          <Row label="متوسط المواءمة"><Bar v={avg} /> <En>{avg}%</En></Row>
          <Row label="المقاعد المُغطّاة"><En>{Math.min(mission.seats, ranked.length)}/{mission.seats}</En></Row>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 font-bold text-slate-900">ترتيب المرشّحين حسب المواءمة</div>
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="text-slate-500">
              <th className="border-b border-slate-200 p-2 text-right">#</th>
              <th className="border-b border-slate-200 p-2 text-right">الطالب</th>
              <th className="border-b border-slate-200 p-2 text-right">الصف</th>
              <th className="border-b border-slate-200 p-2 text-center">المواءمة</th>
              <th className="border-b border-slate-200 p-2 text-center">المقعد</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((c, i) => (
              <tr key={c.id}>
                <td className="border-b border-slate-100 p-2"><En>{i + 1}</En></td>
                <td className="border-b border-slate-100 p-2 font-medium">{c.name}</td>
                <td className="border-b border-slate-100 p-2">{c.className || "—"}</td>
                <td className="border-b border-slate-100 p-2 text-center"><En>{c.match}%</En></td>
                <td className="border-b border-slate-100 p-2 text-center">{i < mission.seats ? "نعم" : "—"}</td>
              </tr>
            ))}
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
  return (
    <ReportShell title="تقرير المدرسة الشامل" subtitle="ملخّص أداء القيادات الطلابية"
      schoolName={schoolName} today={today} onClose={onClose}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Row label="إجمالي الطلاب"><En>{stats.students}</En></Row>
        <Row label="أدّوا المقياس"><En>{stats.assessed}</En></Row>
        <Row label="المهام"><En>{stats.missions}</En></Row>
      </div>

      <div className="mt-4">
        <div className="mb-1 font-bold text-slate-900">متوسط الكفايات عبر المحاور</div>
        {stats.axisAvg.map((a) => (
          <Row key={a.key} label={a.label}><Bar v={a.v} /> <En>{a.v}</En></Row>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1 font-bold text-slate-900">توزيع الأنماط</div>
          {stats.styles.length === 0 ? <div className="text-slate-500">لا بيانات.</div> :
            stats.styles.map(([n, c]) => <Row key={n} label={n}><En>{c}</En></Row>)}
        </div>
        <div>
          <div className="mb-1 font-bold text-slate-900">توزيع الفرص بالنطاق</div>
          <Row label="المدرسة"><En>{stats.scope.school}</En></Row>
          <Row label="المرحلة"><En>{stats.scope.stage}</En></Row>
          <Row label="الصف/الفصل"><En>{stats.scope.grade}</En></Row>
        </div>
      </div>
    </ReportShell>
  );
}
