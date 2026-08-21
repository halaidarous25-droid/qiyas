import { useState, useEffect } from "react";
import { Pill, Meter, Avatar, En, MatchStars } from "@/components/common";
import {
  AXES, TRUST_META,
  type Candidate, type Trust,
} from "@/data/mock";
import { useSlis } from "@/store";
import { matchTone, textTone, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import {
  Users, Search, ArrowRight, Target, Crown, ShieldCheck,
  TrendingUp, CircleUser, Filter, Clock, FileText,
} from "lucide-react";
import { StudentReportPro } from "./reports/StudentReportPro";

// ===== ملف الطالب =====
function StudentProfile({ c, onBack }: { c: Candidate; onBack: () => void }) {
  const { studentMissionsFor, studentMissionStats, missions: allMissions, assigned, schoolInfo } = useSlis();
  const trust = TRUST_META[c.trust];
  const missions = studentMissionsFor(c.id);
  const stats = studentMissionStats(c.id);
  const assignedMissions = allMissions.filter((m) => (assigned[m.id] || []).includes(c.id));
  const [showReport, setShowReport] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  if (!c.assessed) {
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
            <ArrowRight className="h-4 w-4" /> رجوع إلى الطلاب
          </button>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name={c.name} color={c.avatarColor} size={60} />
            <div className="flex-1">
              <h1 className="font-display text-xl font-extrabold">{c.name}</h1>
              <div className="text-sm text-muted-foreground">{c.grade} · {c.className}</div>
            </div>
            <Pill tone="warning"><Clock className="h-3 w-3" /> بانتظار أداء المقياس</Pill>
          </div>
          <div className="mt-4 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            لم يؤدِّ هذا الطالب المقياس بعد، لذلك لا يوجد ملف قيادي أو نتائج.
            <br />يظهر ملفه الكامل هنا فور إكماله المقياس من بوابة الطالب.
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
          <ArrowRight className="h-4 w-4" /> رجوع إلى الطلاب
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowReport(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 h-9 text-sm font-semibold text-white hover:bg-brand/90">
            <FileText className="h-4 w-4" /> تقرير / طباعة
          </button>
        </div>
      </div>

      {showReport && (
        <StudentReportPro student={c} missions={allMissions} assignedMissions={assignedMissions} schoolName={schoolInfo.name || "مدرستي"} today={today} onClose={() => setShowReport(false)} />
      )}

      <div className="rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-center gap-4">
          <Avatar name={c.name} color={c.avatarColor} size={60} />
          <div className="flex-1">
            <h1 className="font-display text-xl font-extrabold">{c.name}</h1>
            <div className="text-sm text-muted-foreground">{c.grade} · {c.className}</div>
          </div>
          <div className="flex gap-3">
            <div className="rounded-xl border px-4 py-2 text-center">
              <div className="font-display text-2xl font-extrabold text-brand"><En>{c.competency}%</En></div>
              <div className="text-[11px] text-muted-foreground">الكفايات</div>
            </div>
            <div className="rounded-xl border px-4 py-2 text-center">
              <div className="font-display text-2xl font-extrabold text-brand"><En>{c.behavior}%</En></div>
              <div className="text-[11px] text-muted-foreground">السلوك</div>
            </div>
            <div className="grid place-items-center">
              <Pill tone={trust.tone as Tone}>{trust.label}</Pill>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <div className="mb-3 flex items-center gap-2"><TrendingUp className="h-[18px] w-[18px] text-brand" />
            <h2 className="font-display font-bold">الكفايات القيادية</h2></div>
          <div className="space-y-2.5">
            {AXES.map((a) => (
              <div key={a.key} className="grid grid-cols-[110px_1fr_36px] items-center gap-2">
                <span className="text-[13px] text-foreground/80">{a.label}</span>
                <Meter value={c.axes[a.key]} tone={c.axes[a.key] >= 82 ? "success" : c.axes[a.key] >= 72 ? "brand" : "warning"} />
                <span className="text-left text-xs font-bold"><En>{c.axes[a.key]}</En></span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border p-3">
            <div className="mb-2 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand" />
              <span className="text-[13px] font-semibold">مؤشرات الموثوقية</span></div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><div className="flex justify-between text-muted-foreground"><span>الاتساق</span><span><En>{c.contradiction}/10</En></span></div>
                <Meter value={c.contradiction * 10} tone={c.contradiction >= 6 ? "danger" : c.contradiction >= 3 ? "warning" : "success"} className="mt-1" /></div>
              <div><div className="flex justify-between text-muted-foreground"><span>الكمال الاجتماعي</span><span><En>{c.socialDesirability}/5</En></span></div>
                <Meter value={c.socialDesirability * 20} tone={c.socialDesirability >= 4 ? "danger" : c.socialDesirability >= 2 ? "warning" : "success"} className="mt-1" /></div>
            </div>
            {c.note && <p className="mt-2 text-[11px] text-warning">ملاحظة: {c.note}</p>}
          </div>
        </div>

        {/* المهام المرشّح لها — إغلاق الحلقة */}
        <div className="rounded-2xl border bg-card p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2"><Target className="h-[18px] w-[18px] text-gold" />
            <h2 className="font-display font-bold">المهام المرشّح لها</h2>
            <div className="mr-auto flex flex-wrap items-center gap-1">
              {stats.nominated > 0 && <Pill tone="brand"><En>{stats.nominated}</En> مرشّح</Pill>}
              {stats.notNominated > 0 && <Pill tone="muted"><En>{stats.notNominated}</En> غير مرشّح</Pill>}
              {stats.assigned > 0 && <Pill tone="success"><En>{stats.assigned}</En> مكلّف</Pill>}
            </div></div>
          {missions.length === 0 ? (
            <p className="text-sm text-muted-foreground">لم يُرشَّح لأي مهمة بعد.</p>
          ) : (
            <div className="space-y-2.5">
              {missions.map(({ mission, rank, match, seat }) => (
                <div key={mission.id} className={cn("rounded-lg border p-3", seat && "border-success/40 bg-success/5")}>
                  <div className="flex items-center gap-2">
                    <div className={cn("grid h-8 w-8 place-items-center rounded-lg font-display font-extrabold text-sm",
                      rank === 1 ? "bg-gold text-white" : "bg-muted text-foreground/70")}>
                      {rank === 1 ? <Crown className="h-4 w-4" /> : rank}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{mission.title}</div>
                      <div className="text-[11px] text-muted-foreground">{mission.scopeLabel}</div>
                    </div>
                    <div className="text-left">
                      <div className="flex items-center justify-end gap-1.5">
                        <MatchStars value={match} size={16} />
                        <span className={cn("font-display font-extrabold", textTone[matchTone(match)])}><En>{match}%</En></span>
                      </div>
                      {seat && <Pill tone="success" className="mt-0.5">ضمن المقاعد</Pill>}
                    </div>
                  </div>
                </div>
              ))}
              <p className="mt-1 text-[11px] text-muted-foreground">
                في الوضع (ب) يظهر الطالب في عدة مهام حسب درجة موائمته لكل منها.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== قائمة الطلاب =====
const TRUST_FILTERS: { key: Trust | "all"; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "trusted", label: "موثوق" },
  { key: "reserved", label: "تحفّظ" },
  { key: "interview", label: "مقابلة" },
];

export function Students({ initialStudentId, onConsumed }:
  { initialStudentId?: string | null; onConsumed?: () => void }) {
  const { students, studentMissionStats } = useSlis();
  const [sel, setSel] = useState<Candidate | null>(null);
  const [q, setQ] = useState("");
  const [tf, setTf] = useState<Trust | "all">("all");
  const [gradeF, setGradeF] = useState("");
  const [classF, setClassF] = useState("");
  const gradeOptions = Array.from(new Set(students.map((s) => s.grade).filter(Boolean)));
  const classOptions = Array.from(new Set(students.filter((s) => !gradeF || s.grade === gradeF).map((s) => s.className).filter(Boolean)));

  // فتح ملف طالب قادم من شاشة أخرى (مثل «عرض الملف» في المهمة)
  useEffect(() => {
    if (initialStudentId) {
      const c = students.find((x) => x.id === initialStudentId);
      if (c) setSel(c);
      onConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialStudentId]);

  if (sel) return <StudentProfile c={sel} onBack={() => setSel(null)} />;

  const list = students
    .filter((c) => (tf === "all" ? true : c.trust === tf))
    .filter((c) => (!gradeF || c.grade === gradeF))
    .filter((c) => (!classF || c.className === classF))
    .filter((c) => c.name.includes(q))
    .sort((a, b) => Number(b.assessed) - Number(a.assessed) || b.competency - a.competency);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold">الطلاب والملفات</h1>
        <p className="text-sm text-muted-foreground">
          الملفات القيادية الناتجة عن المقياس — كل ملف يربط الطالب بالمهام الأنسب له.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 h-10 text-sm w-60">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم…"
            className="bg-transparent outline-none flex-1" />
        </div>
        <Filter className="h-4 w-4 text-muted-foreground mr-1" />
        {TRUST_FILTERS.map((f) => (
          <button key={f.key} onClick={() => setTf(f.key)}
            className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium",
              tf === f.key ? "border-brand bg-brand text-white" : "bg-card hover:bg-accent")}>
            {f.label}
          </button>
        ))}
        <div className="mx-1 h-6 w-px bg-border" />
        <select value={gradeF} onChange={(e) => { setGradeF(e.target.value); setClassF(""); }}
          className="rounded-lg border bg-card px-3 h-9 text-sm outline-none focus:border-brand">
          <option value="">كل الصفوف</option>
          {gradeOptions.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={classF} onChange={(e) => setClassF(e.target.value)}
          className="rounded-lg border bg-card px-3 h-9 text-sm outline-none focus:border-brand">
          <option value="">كل الفصول</option>
          {classOptions.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {(gradeF || classF) && (
          <button onClick={() => { setGradeF(""); setClassF(""); }} className="rounded-lg border px-3 h-9 text-sm font-medium hover:bg-accent">إلغاء التصفية</button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="hidden md:grid grid-cols-[1fr_110px_110px_120px_180px] gap-3 border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold text-muted-foreground">
          <span>الطالب</span><span>الكفايات</span><span>السلوك</span><span>الموثوقية</span><span>المهام (مرشّح / غير مرشّح / مكلّف)</span>
        </div>
        <div className="divide-y">
          {list.map((c) => {
            const trust = TRUST_META[c.trust];
            const stats = studentMissionStats(c.id);
            return (
              <button key={c.id} onClick={() => setSel(c)}
                className="grid w-full grid-cols-[1fr_auto] md:grid-cols-[1fr_110px_110px_120px_180px] items-center gap-3 px-4 py-3 text-right hover:bg-accent/40">
                <div className="flex items-center gap-3">
                  <Avatar name={c.name} color={c.avatarColor} size={38} />
                  <div>
                    <div className="font-semibold text-[15px]">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.grade} · {c.className}</div>
                  </div>
                </div>
                {c.assessed ? (
                  <>
                    <div className="hidden md:flex items-center gap-2">
                      <Meter value={c.competency} tone={matchTone(c.competency)} />
                      <span className="text-xs font-bold w-8"><En>{c.competency}</En></span>
                    </div>
                    <div className="hidden md:flex items-center gap-2">
                      <Meter value={c.behavior} tone={matchTone(c.behavior)} />
                      <span className="text-xs font-bold w-8"><En>{c.behavior}</En></span>
                    </div>
                    <div className="hidden md:block"><Pill tone={trust.tone as Tone}>{trust.label}</Pill></div>
                    <div className="flex flex-wrap items-center gap-1 justify-end md:justify-start">
                      {stats.nominated > 0 && <Pill tone="brand"><En>{stats.nominated}</En> مرشّح</Pill>}
                      {stats.notNominated > 0 && <Pill tone="muted"><En>{stats.notNominated}</En> غير مرشّح</Pill>}
                      {stats.assigned > 0 && <Pill tone="success"><Target className="h-3 w-3" /> <En>{stats.assigned}</En> مكلّف</Pill>}
                      {stats.nominated === 0 && stats.notNominated === 0 && stats.assigned === 0 && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </>
                ) : (
                  <div className="md:col-span-4 flex justify-end md:justify-start">
                    <Pill tone="warning"><Clock className="h-3 w-3" /> بانتظار أداء المقياس</Pill>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CircleUser className="h-4 w-4" /> عدد الطلاب المعروضين: <En>{list.length}</En> — تُعرض النسب التفصيلية للمشرف فقط، والطالب يرى مستويات عامة.
      </div>
    </div>
  );
}
