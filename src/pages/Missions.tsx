import { useState } from "react";
import { Pill, En } from "@/components/common";
import { STATUS_META, SCOPE_META, type Mission, type MissionStatus } from "@/data/mock";
import { useSlis } from "@/store";
import { CreateMissionModal } from "@/components/CreateMissionModal";
import { type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { Target, Users, MapPin, ArrowLeft, Plus, SlidersHorizontal, Search, Sparkles } from "lucide-react";

const FILTERS: { key: MissionStatus | "all"; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "open", label: "تقديم مفتوح" },
  { key: "screening", label: "قيد الفرز" },
  { key: "closed", label: "مكتملة التكليف" },
  { key: "draft", label: "مسودة" },
];

function MissionCard({ m, onOpen, applied, qualified }: { m: Mission; onOpen: (id: string) => void; applied: number; qualified: number }) {
  const st = STATUS_META[m.status];
  return (
    <button onClick={() => onOpen(m.id)}
      className="group text-right rounded-xl border bg-card p-4 transition-all hover:border-brand/40 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand/8 text-brand">
          <Target className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-1.5">
          <Pill tone={st.tone as Tone}>{st.label}</Pill>
        </div>
      </div>
      <h3 className="mt-3 font-display text-[16px] font-bold group-hover:text-brand">
        {m.title}
        {m.academicYear && <span className="mr-1.5 align-middle rounded-md bg-brand/10 px-1.5 py-0.5 text-[11px] font-semibold text-brand">{m.academicYear}</span>}
      </h3>
      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" /> {m.scopeLabel}
        <span className="mx-1">·</span> {SCOPE_META[m.scopeType]}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-muted/60 py-2">
          <div className="font-display text-lg font-extrabold"><En>{applied}</En></div>
          <div className="text-[11px] text-muted-foreground">متقدّم</div>
        </div>
        <div className="rounded-lg bg-muted/60 py-2">
          <div className="font-display text-lg font-extrabold"><En>{m.seats}</En></div>
          <div className="text-[11px] text-muted-foreground">مقعد</div>
        </div>
        <div className="rounded-lg bg-muted/60 py-2">
          <div className="font-display text-lg font-extrabold"><En>{qualified}</En></div>
          <div className="text-[11px] text-muted-foreground">مؤهّل</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t pt-3">
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" /> {m.supervisor}
        </span>
        <span className="flex items-center gap-1 text-sm font-semibold text-brand">
          فتح القائمة <ArrowLeft className="h-4 w-4" />
        </span>
      </div>
      {m.hasConflict && (
        <div className="mt-2 rounded-lg border border-danger/30 bg-danger/5 px-2.5 py-1.5 text-[12px] text-danger">
          ⚠ يوجد تعارض زمني في هذه المهمة يحتاج قرارًا.
        </div>
      )}
    </button>
  );
}

export function Missions({ onOpenMission }: { onOpenMission: (id: string) => void }) {
  const { missions, assigned, can, classes, students, bulkCreateHomeroomMissions } = useSlis();
  // متقدّم = عدد المتقدمين/المرشّحين، مؤهّل = من بينهم من أدّى المقياس
  const appliedOf = (m: typeof missions[number]) => m.candidateIds.length;
  const qualifiedOf = (m: typeof missions[number]) =>
    m.candidateIds.filter((id) => students.find((s) => s.id === id)?.assessed).length;
  const [filter, setFilter] = useState<MissionStatus | "all">("all");
  const [gradeF, setGradeF] = useState("");
  const [classF, setClassF] = useState("");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);

  const gradeOptions = Array.from(new Set(classes.map((c) => c.grade).filter(Boolean)));
  const classOptions = classes.filter((c) => !gradeF || c.grade === gradeF);
  const gradeOfClass = (cn: string) => classes.find((c) => c.name === cn)?.grade || "";
  const matchesGrade = (m: typeof missions[number]) => !gradeF
    || m.scopeType === "school" || m.scopeType === "stage"
    || (m.scopeType === "grade" && m.scopeRef === gradeF)
    || (m.scopeType === "class" && gradeOfClass(m.scopeRef || "") === gradeF);
  const matchesClass = (m: typeof missions[number]) => !classF
    || m.scopeType === "school" || m.scopeType === "stage"
    || (m.scopeType === "class" && m.scopeRef === classF)
    || (m.scopeType === "grade" && m.scopeRef === gradeOfClass(classF));

  const qq = q.trim();
  const list = missions
    .filter((m) => filter === "all" || m.status === filter)
    .filter(matchesGrade)
    .filter(matchesClass)
    .filter((m) => !qq || m.title.includes(qq) || (m.scopeLabel || "").includes(qq) || (m.supervisor || "").includes(qq));

  // مهمة مغلقة = اكتمل تعيين كل مقاعدها أو حالتها «مُسندة/مغلقة»
  const isClosed = (m: typeof missions[number]) => {
    const filled = (assigned[m.id] || []).length;
    return ["assigned", "closed", "archived"].includes(m.status) || (m.seats > 0 && filled >= m.seats);
  };
  const openList = list.filter((m) => !isClosed(m));
  const closedList = list.filter((m) => isClosed(m));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold">المهام القيادية</h1>
          <p className="text-sm text-muted-foreground">
            كل مهمة فرصة قيادية مستقلة لها نطاق ومتطلبات وقائمة مرشّحين مرتّبة.
          </p>
        </div>
        {can("missions") && (
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => {
              if (confirm("سيتم إنشاء مهمة «عريف فصل» (مقعد واحد، بالرغبة، بأوزان المسمّى) لكل فصل ليس لديه مهمة عريف فصل. متابعة؟")) bulkCreateHomeroomMissions();
            }}
              className="flex items-center gap-2 rounded-lg border border-brand/40 text-brand px-4 h-10 text-sm font-semibold hover:bg-brand/10">
              <Sparkles className="h-4 w-4" /> عريف فصل لكل فصل
            </button>
            <button onClick={() => setCreating(true)}
              className="flex items-center gap-2 rounded-lg bg-brand px-4 h-10 text-sm font-semibold text-white shadow-sm hover:bg-brand/90">
              <Plus className="h-4 w-4" /> إنشاء مهمة
            </button>
          </div>
        )}
      </div>

      {creating && <CreateMissionModal onClose={() => setCreating(false)} />}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border bg-card px-3 h-9 text-sm w-60">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالمهمة أو النطاق…"
            className="bg-transparent outline-none flex-1" />
        </div>
        <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={cn("rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
              filter === f.key ? "border-brand bg-brand text-white" : "bg-card hover:bg-accent")}>
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
          {classOptions.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        {(gradeF || classF) && (
          <button onClick={() => { setGradeF(""); setClassF(""); }} className="rounded-lg border px-3 h-9 text-sm font-medium hover:bg-accent">إلغاء التصفية</button>
        )}
      </div>

      {/* مهام مفتوحة */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-success" />
          <h2 className="font-display font-bold">مهام مفتوحة (<En>{openList.length}</En>)</h2>
        </div>
        {openList.length === 0
          ? <div className="rounded-xl border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">لا مهام مفتوحة حاليًا.</div>
          : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {openList.map((m) => <MissionCard key={m.id} m={m} onOpen={onOpenMission} applied={appliedOf(m)} qualified={qualifiedOf(m)} />)}
            </div>}
      </div>

      {/* مهام مغلقة (اكتمل التعيين) */}
      {closedList.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/50" />
            <h2 className="font-display font-bold text-muted-foreground">مهام مغلقة — اكتمل التعيين (<En>{closedList.length}</En>)</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 opacity-80">
            {closedList.map((m) => <MissionCard key={m.id} m={m} onOpen={onOpenMission} applied={appliedOf(m)} qualified={qualifiedOf(m)} />)}
          </div>
        </div>
      )}
    </div>
  );
}
