import { useState } from "react";
import { Pill, Meter, En } from "@/components/common";
import { AXES, STATUS_META, type Mission, type Candidate } from "@/data/mock";
import { leadershipStyle } from "@/lib/scoring";
import { useSlis } from "@/store";
import { matchTone, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { PieChart, Target, FileText, Layers, TrendingUp, User, Printer } from "lucide-react";
import { MissionReport, MissionScopeReport, SchoolReport, type ScopeUnit } from "./reports/ReportView";
import { StudentReportPro } from "./reports/StudentReportPro";

const STYLE_COLORS = ["hsl(191 72% 30%)", "hsl(36 55% 47%)", "hsl(152 46% 40%)", "hsl(205 70% 45%)", "hsl(280 40% 55%)", "hsl(15 65% 55%)"];

function candidateStyle(c: Candidate) {
  const top = [...AXES].sort((a, b) => c.axes[b.key] - c.axes[a.key]).slice(0, 2).map((a) => a.key);
  return leadershipStyle(top).name;
}

type OpenReport =
  | { kind: "student"; id: string }
  | { kind: "mission"; id: string }
  | { kind: "missionScope"; title: string; academicYear: string; scope: "class" | "grade" | "school"; ref: string }
  | { kind: "school" }
  | null;

export function Reports() {
  const { missions, students, rankMission, assigned, schoolInfo, roles, classes } = useSlis();
  const assessed = students.filter((c) => c.assessed);
  const [open, setOpen] = useState<OpenReport>(null);
  const [pickStudent, setPickStudent] = useState("");
  const [pickGroup, setPickGroup] = useState("");
  const [pickScope, setPickScope] = useState<"class" | "grade" | "school">("school");
  const [pickScopeRef, setPickScopeRef] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const schoolName = schoolInfo.name || "مدرستك";

  // مجموعات المهام حسب (الاسم + السنة الدراسية) — كل مجموعة يمكن توليد تقرير لها بثلاثة نطاقات
  const classGrade = (name: string) => classes.find((c) => c.name === name)?.grade || "";
  const missionGroups = Array.from(
    new Map(missions.map((m) => {
      const key = `${m.title}|||${m.academicYear || ""}`;
      return [key, { key, title: m.title, academicYear: m.academicYear || "" }];
    })).values()
  );
  const [gTitle, gYear] = pickGroup.split("|||");
  const groupMissions = pickGroup ? missions.filter((m) => m.title === gTitle && (m.academicYear || "") === gYear) : [];
  const groupClasses = Array.from(new Set(groupMissions.filter((m) => m.scopeType === "class" && m.scopeRef).map((m) => m.scopeRef!)));
  const groupGrades = Array.from(new Set([
    ...groupClasses.map((cn) => classGrade(cn)).filter(Boolean),
    ...groupMissions.filter((m) => m.scopeType === "grade" && m.scopeRef).map((m) => m.scopeRef!),
  ]));

  // بناء وحدات النطاق للتقرير المطلوب
  const buildScopeUnits = (title: string, year: string, scope: "class" | "grade" | "school", ref: string): ScopeUnit[] => {
    const grp = missions.filter((m) => m.title === title && (m.academicYear || "") === year);
    let chosen: Mission[] = [];
    if (scope === "school") chosen = grp;
    else if (scope === "grade") chosen = grp.filter((m) => (m.scopeType === "class" && classGrade(m.scopeRef || "") === ref) || (m.scopeType === "grade" && m.scopeRef === ref));
    else chosen = grp.filter((m) => m.scopeType === "class" && m.scopeRef === ref);
    return chosen.map((m) => {
      const ranked = rankMission(m);
      const asg = ranked.filter((c) => (assigned[m.id] || []).includes(c.id));
      return { label: m.scopeRef || m.scopeLabel, mission: m, ranked, assigned: asg };
    });
  };

  const missionReadiness = (m: Mission) => {
    const r = rankMission(m);
    const avg = r.length ? Math.round(r.reduce((s, c) => s + c.match, 0) / r.length) : 0;
    const filled = Math.min(m.seats, r.length);
    return { avg, filled, count: r.length };
  };

  // توزيع الأنماط
  const styleCount: Record<string, number> = {};
  assessed.forEach((c) => { const s = candidateStyle(c); styleCount[s] = (styleCount[s] || 0) + 1; });
  const styles = Object.entries(styleCount).sort((a, b) => b[1] - a[1]);
  const total = assessed.length || 1;
  // conic gradient
  let acc = 0;
  const segments = styles.map(([name, n], i) => {
    const start = (acc / total) * 360; acc += n;
    const end = (acc / total) * 360;
    return `${STYLE_COLORS[i % STYLE_COLORS.length]} ${start}deg ${end}deg`;
  }).join(", ");

  // توزيع الفرص بالنطاق
  const scopeCount = { school: 0, grade: 0, stage: 0 } as Record<string, number>;
  missions.forEach((m) => scopeCount[m.scopeType]++);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold">التقارير والتحليل</h1>
        <p className="text-sm text-muted-foreground">
          تحليلات على مستوى المدرسة — أنماط القيادة، جاهزية المهام، وتوزيع الفرص.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* توزيع الأنماط */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-2"><PieChart className="h-[18px] w-[18px] text-brand" />
            <h2 className="font-display font-bold">توزيع أنماط القيادة</h2></div>
          <div className="flex items-center gap-4">
            <div className="relative h-32 w-32 shrink-0 rounded-full" style={{ background: `conic-gradient(${segments})` }}>
              <div className="absolute inset-[22%] grid place-items-center rounded-full bg-card">
                <div className="text-center"><div className="font-display text-xl font-extrabold"><En>{total}</En></div>
                  <div className="text-[10px] text-muted-foreground">طالب</div></div>
              </div>
            </div>
            <div className="flex-1 space-y-1.5">
              {styles.map(([name, n], i) => (
                <div key={name} className="flex items-center gap-2 text-[13px]">
                  <span className="h-3 w-3 rounded-sm" style={{ background: STYLE_COLORS[i % STYLE_COLORS.length] }} />
                  <span className="flex-1 truncate">{name}</span>
                  <span className="font-bold"><En>{n}</En></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* متوسط المحاور */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-2"><TrendingUp className="h-[18px] w-[18px] text-brand" />
            <h2 className="font-display font-bold">متوسط الكفايات</h2></div>
          <div className="space-y-2.5">
            {AXES.map((a) => {
              const v = Math.round(assessed.reduce((s, c) => s + c.axes[a.key], 0) / total);
              return (
                <div key={a.key} className="grid grid-cols-[95px_1fr_34px] items-center gap-2">
                  <span className="text-[13px] text-foreground/80">{a.label}</span>
                  <Meter value={v} tone={v >= 82 ? "success" : v >= 72 ? "brand" : "warning"} />
                  <span className="text-left text-xs font-bold"><En>{v}</En></span>
                </div>
              );
            })}
          </div>
        </div>

        {/* توزيع الفرص */}
        <div className="rounded-xl border bg-card p-5">
          <div className="mb-4 flex items-center gap-2"><Layers className="h-[18px] w-[18px] text-brand" />
            <h2 className="font-display font-bold">توزيع الفرص بالنطاق</h2></div>
          <div className="space-y-3">
            {[
              { k: "school", l: "مستوى المدرسة" },
              { k: "stage", l: "مستوى المرحلة" },
              { k: "grade", l: "مستوى الصف/الفصل" },
            ].map((s) => (
              <div key={s.k} className="grid grid-cols-[110px_1fr_28px] items-center gap-2">
                <span className="text-[13px] text-foreground/80">{s.l}</span>
                <Meter value={(scopeCount[s.k] / (missions.length || 1)) * 100} tone="brand" />
                <span className="text-left text-xs font-bold"><En>{scopeCount[s.k]}</En></span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-muted/40 p-3 text-[12px] text-muted-foreground">
            إجمالي المهام: <En>{missions.length}</En> · لا مقارنة بين طلاب من نطاقات مختلفة لنفس المهمة.
          </div>
        </div>
      </div>

      {/* جاهزية المهام */}
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex items-center gap-2"><Target className="h-[18px] w-[18px] text-brand" />
          <h2 className="font-display font-bold">جاهزية المهام للإسناد</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-muted-foreground">
                <th className="border-b p-2.5 text-right font-semibold">المهمة</th>
                <th className="border-b p-2.5 text-center font-semibold">الحالة</th>
                <th className="border-b p-2.5 text-center font-semibold">المرشّحون</th>
                <th className="border-b p-2.5 text-center font-semibold">المقاعد المُغطّاة</th>
                <th className="border-b p-2.5 text-right font-semibold">متوسط المواءمة</th>
              </tr>
            </thead>
            <tbody>
              {missions.map((m) => {
                const r = missionReadiness(m);
                const st = STATUS_META[m.status];
                return (
                  <tr key={m.id} className="hover:bg-accent/30">
                    <td className="border-b p-2.5 font-medium">{m.title}
                      {m.academicYear && <span className="mr-1.5 rounded bg-brand/10 px-1 py-0.5 text-[10px] font-semibold text-brand">{m.academicYear}</span>}
                      <span className="block text-[11px] font-normal text-muted-foreground">{m.scopeLabel}</span></td>
                    <td className="border-b p-2.5 text-center"><Pill tone={st.tone as Tone}>{st.label}</Pill></td>
                    <td className="border-b p-2.5 text-center tabular-nums"><En>{r.count}</En></td>
                    <td className="border-b p-2.5 text-center tabular-nums"><En>{r.filled}/{m.seats}</En></td>
                    <td className="border-b p-2.5">
                      <div className="flex items-center gap-2">
                        <Meter value={r.avg} tone={matchTone(r.avg)} className="w-24" />
                        <span className="text-xs font-bold w-9"><En>{r.avg || "—"}%</En></span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* توليد التقارير القابلة للطباعة/التصدير PDF */}
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex items-center gap-2"><FileText className="h-[18px] w-[18px] text-gold" />
          <h2 className="font-display font-bold">توليد التقارير (طباعة / حفظ PDF)</h2></div>
        <div className="grid gap-4 md:grid-cols-3">
          {/* تقرير الطالب */}
          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2"><User className="h-4 w-4 text-brand" /><span className="font-semibold">تقرير طالب</span></div>
            <p className="mt-1 text-[11px] text-muted-foreground">الملف القيادي الكامل للطالب مع المحاور والترشيحات.</p>
            <select value={pickStudent} onChange={(e) => setPickStudent(e.target.value)}
              className="mt-2 w-full rounded-lg border bg-background px-2 h-9 text-sm">
              <option value="">اختر طالبًا…</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.name}{s.className ? ` — ${s.className}` : ""}</option>)}
            </select>
            <button disabled={!pickStudent} onClick={() => setOpen({ kind: "student", id: pickStudent })}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-3 h-9 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
              <Printer className="h-4 w-4" /> توليد
            </button>
          </div>

          {/* تقرير المهمة — بثلاثة نطاقات: فصل / صف / مدرسة مع مقارنات وتحليلات */}
          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2"><Target className="h-4 w-4 text-brand" /><span className="font-semibold">تقرير مهمة</span></div>
            <p className="mt-1 text-[11px] text-muted-foreground">اختر المهمة والسنة، ثم النطاق: فصل، أو صف كامل، أو المدرسة — مع مقارنة وتحليل.</p>
            <select value={pickGroup} onChange={(e) => { setPickGroup(e.target.value); setPickScope("school"); setPickScopeRef(""); }}
              className="mt-2 w-full rounded-lg border bg-background px-2 h-9 text-sm">
              <option value="">اختر المهمة والسنة…</option>
              {missionGroups.map((g) => <option key={g.key} value={g.key}>{g.title}{g.academicYear ? ` (${g.academicYear})` : ""}</option>)}
            </select>

            {pickGroup && (
              <>
                {/* اختيار النطاق */}
                <div className="mt-2 flex rounded-lg border p-0.5">
                  {[{ k: "class", l: "فصل" }, { k: "grade", l: "صف" }, { k: "school", l: "المدرسة" }].map((s) => (
                    <button key={s.k} onClick={() => { setPickScope(s.k as any); setPickScopeRef(""); }}
                      className={cn("flex-1 rounded-md py-1 text-[11px] font-semibold", pickScope === s.k ? "bg-brand text-white" : "text-muted-foreground")}>
                      {s.l}
                    </button>
                  ))}
                </div>

                {/* اختيار الفصل/الصف عند الحاجة */}
                {pickScope === "class" && (
                  <select value={pickScopeRef} onChange={(e) => setPickScopeRef(e.target.value)}
                    className="mt-2 w-full rounded-lg border bg-background px-2 h-9 text-sm">
                    <option value="">اختر الفصل…</option>
                    {groupClasses.map((cn) => <option key={cn} value={cn}>{cn}</option>)}
                  </select>
                )}
                {pickScope === "grade" && (
                  <select value={pickScopeRef} onChange={(e) => setPickScopeRef(e.target.value)}
                    className="mt-2 w-full rounded-lg border bg-background px-2 h-9 text-sm">
                    <option value="">اختر الصف الدراسي…</option>
                    {groupGrades.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                )}
              </>
            )}

            <button
              disabled={!pickGroup || (pickScope !== "school" && !pickScopeRef)}
              onClick={() => setOpen({ kind: "missionScope", title: gTitle, academicYear: gYear, scope: pickScope, ref: pickScopeRef })}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-3 h-9 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
              <Printer className="h-4 w-4" /> توليد
            </button>
          </div>

          {/* تقرير المدرسة */}
          <div className="rounded-xl border p-4">
            <div className="flex items-center gap-2"><Layers className="h-4 w-4 text-brand" /><span className="font-semibold">تقرير المدرسة</span></div>
            <p className="mt-1 text-[11px] text-muted-foreground">ملخّص شامل: الطلاب، متوسط المحاور، الأنماط، الفرص.</p>
            <div className="mt-2 h-9" />
            <button onClick={() => setOpen({ kind: "school" })}
              className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-brand px-3 h-9 text-sm font-semibold text-white hover:bg-brand/90">
              <Printer className="h-4 w-4" /> توليد
            </button>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-muted-foreground">
          يفتح التقرير في عرض قابل للطباعة — اضغط «طباعة / حفظ PDF» واختر «حفظ كـ PDF» من نافذة الطباعة للتصدير.
        </p>
      </div>

      {/* عارض التقارير */}
      {open?.kind === "student" && (() => {
        const s = students.find((c) => c.id === open.id);
        if (!s) return null;
        const assignedMissions = missions.filter((m) => (assigned[m.id] || []).includes(s.id));
        return <StudentReportPro student={s} missions={missions} assignedMissions={assignedMissions} roles={roles} schoolName={schoolName} today={today} onClose={() => setOpen(null)} />;
      })()}
      {open?.kind === "mission" && (() => {
        const m = missions.find((x) => x.id === open.id);
        if (!m) return null;
        const ranked = rankMission(m);
        const assignedStudents = ranked.filter((c) => (assigned[m.id] || []).includes(c.id));
        return <MissionReport mission={m} ranked={ranked} assignedStudents={assignedStudents} schoolName={schoolName} today={today} onClose={() => setOpen(null)} />;
      })()}
      {open?.kind === "missionScope" && (() => {
        const units = buildScopeUnits(open.title, open.academicYear, open.scope, open.ref);
        return <MissionScopeReport title={open.title} academicYear={open.academicYear} scope={open.scope} scopeRef={open.ref}
          units={units} schoolName={schoolName} today={today} onClose={() => setOpen(null)} />;
      })()}
      {open?.kind === "school" && (
        <SchoolReport schoolName={schoolName} today={today} onClose={() => setOpen(null)}
          stats={{
            students: students.length, assessed: assessed.length, missions: missions.length,
            axisAvg: AXES.map((a) => ({ key: a.key, label: a.label, v: Math.round(assessed.reduce((s, c) => s + c.axes[a.key], 0) / total) })),
            styles, scope: { school: scopeCount.school, stage: scopeCount.stage, grade: scopeCount.grade },
          }} />
      )}
    </div>
  );
}
