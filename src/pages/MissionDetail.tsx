import { useState } from "react";
import { Pill, Meter, Avatar, En } from "@/components/common";
import {
  AXES, STATUS_META, TRUST_META, ME_ID,
  type Candidate, type Mission,
} from "@/data/mock";
import { useSlis } from "@/store";
import { matchTone, textTone, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import {
  ArrowRight, Target, MapPin, Users, Crown, ChevronDown,
  CheckCircle2, Trophy, ClipboardList, Plus, X, Save, Flag,
  XCircle, Pencil, UserPlus, Trash2,
} from "lucide-react";
import type { DevPlan } from "@/lib/live";
import { CreateMissionModal } from "@/components/CreateMissionModal";

function WeightBar({ m }: { m: Mission }) {
  return (
    <div className="flex overflow-hidden rounded-lg border">
      {AXES.map((a, i) => (
        <div key={a.key}
          className={cn("py-1.5 text-center text-[11px] font-semibold text-white", i % 2 ? "bg-brand-soft" : "bg-brand")}
          style={{ width: `${m.weights[a.key]}%` }} title={`${a.label}: ${m.weights[a.key]}%`}>
          {m.weights[a.key] >= 15 ? `${a.short} ${m.weights[a.key]}%` : m.weights[a.key]}
        </div>
      ))}
    </div>
  );
}

const APP_STATUS: { k: string; l: string }[] = [
  { k: "applied", l: "متقدّم" }, { k: "nominated", l: "مرشّح" },
  { k: "assigned", l: "معتمَد" }, { k: "rejected", l: "مرفوض" },
];

function CandidateRow({ c, rank, mission, assigned, onAssign, onUnassign, onRemove, onSetStatus, onOpenStudent }:
  { c: Candidate; rank: number; mission: Mission; assigned: boolean;
    onAssign: () => void; onUnassign: () => void; onRemove: () => void;
    onSetStatus: (s: string) => void; onOpenStudent: () => void }) {
  const [open, setOpen] = useState(rank === 1);
  const trust = TRUST_META[c.trust];
  const isSeat = rank <= mission.seats;

  return (
    <div className={cn("rounded-xl border bg-card transition-colors",
      isSeat ? "border-success/40" : "")}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 p-3 text-right">
        {/* الترتيب */}
        <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg font-display text-lg font-extrabold",
          rank === 1 ? "bg-gold text-white" : "bg-muted text-foreground/70")}>
          {rank === 1 ? <Crown className="h-5 w-5" /> : rank}
        </div>
        <Avatar name={c.name} color={c.avatarColor} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">{c.name}</span>
            {c.id === ME_ID && <Pill tone="gold" className="hidden sm:inline-flex">متقدّم جديد</Pill>}
            {isSeat && <Pill tone="success" className="hidden sm:inline-flex"><CheckCircle2 className="h-3 w-3" /> ضمن المقاعد</Pill>}
          </div>
          <div className="text-xs text-muted-foreground">
            {c.grade} · {c.className}
            {c.wishRank && <> · رغبة الطالب: <En>#{c.wishRank}</En></>}
          </div>
        </div>

        {/* المواءمة */}
        <div className="hidden md:flex flex-col items-center w-24">
          <span className={cn("font-display text-xl font-extrabold", textTone[matchTone(c.match)])}>
            <En>{c.match}%</En>
          </span>
          <span className="text-[10px] text-muted-foreground">المواءمة</span>
        </div>
        <div className="w-28 hidden md:block">
          <Meter value={c.match} tone={matchTone(c.match)} />
        </div>

        <Pill tone={trust.tone as Tone} className="hidden lg:inline-flex">{trust.label}</Pill>
        <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {/* شارة المواءمة للجوال */}
      <div className="flex items-center gap-2 px-3 pb-2 md:hidden">
        <Meter value={c.match} tone={matchTone(c.match)} />
        <span className="text-sm font-bold"><En>{c.match}%</En></span>
        <Pill tone={trust.tone as Tone}>{trust.label}</Pill>
      </div>

      {open && (
        <div className="border-t p-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* المحاور الخمسة */}
            <div>
              <div className="mb-2 text-xs font-semibold text-muted-foreground">الكفايات القيادية (محاور هيرمان)</div>
              <div className="space-y-2">
                {AXES.map((a) => (
                  <div key={a.key} className="grid grid-cols-[90px_1fr_38px] items-center gap-2">
                    <span className="text-[13px] text-foreground/80">{a.label}</span>
                    <Meter value={c.axes[a.key]}
                      tone={c.axes[a.key] >= 82 ? "success" : c.axes[a.key] >= 72 ? "brand" : "warning"} />
                    <span className="text-left text-xs font-bold tabular-nums"><En>{c.axes[a.key]}</En></span>
                  </div>
                ))}
              </div>
            </div>

            {/* ملخص التقييم */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border bg-muted/40 p-3">
                  <div className="text-[11px] text-muted-foreground">الكفايات (٧٠٪)</div>
                  <div className="font-display text-xl font-extrabold text-brand"><En>{c.competency}%</En></div>
                </div>
                <div className="rounded-lg border bg-muted/40 p-3">
                  <div className="text-[11px] text-muted-foreground">السلوك (٣٠٪)</div>
                  <div className="font-display text-xl font-extrabold text-brand"><En>{c.behavior}%</En></div>
                </div>
              </div>

              {/* مؤشرات النزاهة */}
              <div className="rounded-lg border p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[13px] font-semibold">مؤشرات الموثوقية</span>
                  <Pill tone={trust.tone as Tone}>{trust.label}</Pill>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>درجة التناقض</span><span><En>{c.contradiction}/10</En></span>
                    </div>
                    <Meter value={c.contradiction * 10} tone={c.contradiction >= 6 ? "danger" : c.contradiction >= 3 ? "warning" : "success"} className="mt-1" />
                  </div>
                  <div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>الكمال الاجتماعي</span><span><En>{c.socialDesirability}/5</En></span>
                    </div>
                    <Meter value={c.socialDesirability * 20} tone={c.socialDesirability >= 4 ? "danger" : c.socialDesirability >= 2 ? "warning" : "success"} className="mt-1" />
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">{trust.desc}.</p>
              </div>

              {c.note && (
                <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-[12px] text-warning">
                  ملاحظة: {c.note}
                </div>
              )}

              <div className="flex gap-2">
                {assigned ? (
                  <button onClick={onUnassign}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-danger/40 text-danger px-3 h-9 text-sm font-semibold hover:bg-danger/10">
                    <XCircle className="h-4 w-4" /> إلغاء الاعتماد
                  </button>
                ) : (
                  <button onClick={onAssign}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 h-9 text-sm font-semibold text-white bg-brand hover:bg-brand/90">
                    اعتماد للتكليف التجريبي
                  </button>
                )}
                <button onClick={onOpenStudent} className="rounded-lg border px-3 h-9 text-sm font-semibold hover:bg-accent">
                  عرض الملف
                </button>
              </div>
              {/* أدوات المشرف: تغيير الحالة + حذف */}
              <div className="flex items-center gap-2 border-t pt-2">
                <span className="text-[11px] text-muted-foreground">الحالة</span>
                <select value={assigned ? "assigned" : "nominated"} onChange={(e) => onSetStatus(e.target.value)}
                  className="rounded-lg border bg-background px-2 h-8 text-xs">
                  {APP_STATUS.map((s) => <option key={s.k} value={s.k}>{s.l}</option>)}
                </select>
                <button onClick={onRemove} title="حذف من المهمة"
                  className="mr-auto inline-flex items-center gap-1 rounded-lg border border-danger/40 text-danger px-2.5 h-8 text-xs font-semibold hover:bg-danger/10">
                  <Trash2 className="h-3.5 w-3.5" /> حذف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const DEV_STATUS: { k: NonNullable<DevPlan["status"]>; l: string; tone: Tone }[] = [
  { k: "trial", l: "قيد التجربة", tone: "warning" },
  { k: "confirmed", l: "معتمَد نهائيًا", tone: "success" },
  { k: "unfit", l: "غير مناسب", tone: "danger" },
];

function DevPlanCard({ mission, student }: { mission: Mission; student: Candidate }) {
  const { devPlans, saveDevPlan } = useSlis();
  const key = `${mission.id}:${student.id}`;
  const existing = devPlans[key] || {};
  const [plan, setPlan] = useState<DevPlan>({
    trialStart: existing.trialStart || "", trialEnd: existing.trialEnd || "",
    status: existing.status || "trial", performance: existing.performance ?? 0,
    goals: existing.goals || [], notes: existing.notes || "",
  });
  const [goalText, setGoalText] = useState("");

  const addGoal = () => { if (!goalText.trim()) return; setPlan((p) => ({ ...p, goals: [...(p.goals || []), { text: goalText.trim(), done: false }] })); setGoalText(""); };
  const toggleGoal = (i: number) => setPlan((p) => ({ ...p, goals: (p.goals || []).map((g, j) => j === i ? { ...g, done: !g.done } : g) }));
  const removeGoal = (i: number) => setPlan((p) => ({ ...p, goals: (p.goals || []).filter((_, j) => j !== i) }));

  const inputCls = "rounded-lg border bg-background px-3 h-9 text-sm";
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <Avatar name={student.name} color={student.avatarColor} size={34} />
        <div className="flex-1"><div className="font-semibold text-sm">{student.name}</div>
          <div className="text-xs text-muted-foreground">{student.className || student.grade}</div></div>
        <Pill tone={DEV_STATUS.find((s) => s.k === plan.status)?.tone || "muted"}>
          {DEV_STATUS.find((s) => s.k === plan.status)?.l}
        </Pill>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs text-muted-foreground">بداية التجربة
          <input type="date" className={cn(inputCls, "mt-1 w-full")} value={plan.trialStart} onChange={(e) => setPlan((p) => ({ ...p, trialStart: e.target.value }))} />
        </label>
        <label className="text-xs text-muted-foreground">نهاية التجربة
          <input type="date" className={cn(inputCls, "mt-1 w-full")} value={plan.trialEnd} onChange={(e) => setPlan((p) => ({ ...p, trialEnd: e.target.value }))} />
        </label>
        <label className="text-xs text-muted-foreground">الحالة
          <select className={cn(inputCls, "mt-1 w-full")} value={plan.status} onChange={(e) => setPlan((p) => ({ ...p, status: e.target.value as DevPlan["status"] }))}>
            {DEV_STATUS.map((s) => <option key={s.k} value={s.k}>{s.l}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>تقييم الأداء</span><span className="font-bold text-brand"><En>{plan.performance}</En>%</span>
        </div>
        <input type="range" min={0} max={100} value={plan.performance}
          onChange={(e) => setPlan((p) => ({ ...p, performance: Number(e.target.value) }))} className="mt-1 w-full accent-[hsl(191_72%_30%)]" />
      </div>

      <div className="mt-3">
        <div className="mb-1 text-xs font-semibold">أهداف خطة التطوير</div>
        <div className="space-y-1.5">
          {(plan.goals || []).map((g, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5 text-[13px]">
              <input type="checkbox" checked={g.done} onChange={() => toggleGoal(i)} className="accent-[hsl(152_46%_40%)]" />
              <span className={cn("flex-1", g.done && "line-through text-muted-foreground")}>{g.text}</span>
              <button onClick={() => removeGoal(i)} className="text-danger hover:opacity-70"><X className="h-3.5 w-3.5" /></button>
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex gap-2">
          <input value={goalText} onChange={(e) => setGoalText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addGoal()}
            placeholder="أضف هدفًا تطويريًا…" className={cn(inputCls, "flex-1")} />
          <button onClick={addGoal} className="inline-flex items-center gap-1 rounded-lg border px-2.5 h-9 text-xs font-semibold hover:bg-accent"><Plus className="h-3.5 w-3.5" /> إضافة</button>
        </div>
      </div>

      <textarea value={plan.notes} onChange={(e) => setPlan((p) => ({ ...p, notes: e.target.value }))} rows={2}
        placeholder="ملاحظات المشرف…" className="mt-3 w-full rounded-lg border bg-background px-3 py-2 text-sm" />

      <button onClick={() => saveDevPlan(mission.id, student.id, plan)}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 h-9 text-sm font-semibold text-white hover:bg-brand/90">
        <Save className="h-4 w-4" /> حفظ خطة التطوير
      </button>
    </div>
  );
}

export function MissionDetail({ missionId, onBack, onOpenStudent }:
  { missionId: string; onBack: () => void; onOpenStudent: (id: string) => void }) {
  const { missions, assigned, assignCandidate, unassignCandidate, nominateStudent, autoNominate, removeCandidate, setCandidateStatus, rankMission, students } = useSlis();
  const m = missions.find((x) => x.id === missionId)!;
  const ranked = rankMission(m);
  const st = STATUS_META[m.status];
  const assignedIds = assigned[m.id] || [];
  const assignedStudents = assignedIds
    .map((id) => students.find((s) => s.id === id) || ranked.find((c) => c.id === id))
    .filter((c): c is Candidate => !!c);
  const [editing, setEditing] = useState(false);
  const [nomId, setNomId] = useState("");
  const notNominated = students.filter((s) => !m.candidateIds.includes(s.id));

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowRight className="h-4 w-4" /> رجوع إلى المهام
      </button>

      {/* بطاقة المهمة */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand text-white">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-xl font-extrabold">{m.title}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{m.scopeLabel}</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{m.supervisor}</span>
                <span>أُنشئت <En>{m.createdAt}</En></span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Pill tone={st.tone as Tone}>{st.label}</Pill>
            <button onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 rounded-lg border px-3 h-8 text-xs font-semibold hover:bg-accent">
              <Pencil className="h-3.5 w-3.5" /> تعديل المهمة
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            <div className="mb-1.5 text-xs font-semibold text-muted-foreground">أوزان المحاور لهذه المهمة (تُحدّد المواءمة)</div>
            <WeightBar m={m} />
          </div>
          <div className="flex gap-2">
            <div className="grid place-items-center rounded-lg border px-4">
              <span className="font-display text-2xl font-extrabold text-brand"><En>{ranked.length}</En></span>
              <span className="text-[11px] text-muted-foreground">مرشّح</span>
            </div>
            <div className="grid place-items-center rounded-lg border px-4">
              <span className="font-display text-2xl font-extrabold text-gold"><En>{m.seats}</En></span>
              <span className="text-[11px] text-muted-foreground">مقعد</span>
            </div>
          </div>
        </div>
      </div>

      {/* قائمة المرشّحين */}
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Trophy className="h-[18px] w-[18px] text-gold" />
          <h2 className="font-display text-lg font-bold">قائمة المرشّحين مرتّبة حسب المواءمة</h2>
          <button onClick={() => autoNominate(m.id)}
            className="mr-auto inline-flex items-center gap-1.5 rounded-lg border border-brand/40 text-brand px-3 h-8 text-xs font-semibold hover:bg-brand/10">
            <UserPlus className="h-3.5 w-3.5" /> ترشيح تلقائي حسب النطاق
          </button>
        </div>
        <div className="space-y-2.5">
          {ranked.length === 0 && (
            <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
              لا مرشّحون بعد لهذه المهمة — في الوضع (ب) تظهر القائمة بعد أداء الطلاب للمقياس.
            </div>
          )}
          {ranked.map((c, i) => (
            <CandidateRow key={c.id} c={c} rank={i + 1} mission={m}
              assigned={assignedIds.includes(c.id)}
              onAssign={() => assignCandidate(m.id, c.id, c.name)}
              onUnassign={() => unassignCandidate(m.id, c.id, c.name)}
              onRemove={() => removeCandidate(m.id, c.id, c.name)}
              onSetStatus={(s) => setCandidateStatus(m.id, c.id, s)}
              onOpenStudent={() => onOpenStudent(c.id)} />
          ))}
        </div>

        {/* ترشيح طالب يدويًا */}
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
          <span className="flex items-center gap-1.5 text-sm font-semibold"><UserPlus className="h-4 w-4 text-brand" /> ترشيح طالب</span>
          <select value={nomId} onChange={(e) => setNomId(e.target.value)}
            className="rounded-lg border bg-background px-2 h-9 text-sm min-w-[200px]">
            <option value="">اختر طالبًا…</option>
            {notNominated.map((s) => <option key={s.id} value={s.id}>{s.name}{s.className ? ` — ${s.className}` : ""}</option>)}
          </select>
          <button disabled={!nomId}
            onClick={() => { const s = students.find((x) => x.id === nomId); if (s) { nominateStudent(m.id, s.id, s.name); setNomId(""); } }}
            className="rounded-lg bg-brand px-3 h-9 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
            ترشيح
          </button>
        </div>
      </div>

      {/* التكليف التجريبي وخطة التطوير */}
      {assignedStudents.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <ClipboardList className="h-[18px] w-[18px] text-brand" />
            <h2 className="font-display text-lg font-bold">التكليف التجريبي وخطة التطوير</h2>
            <Pill tone="muted" className="mr-auto"><Flag className="h-3 w-3" /> للمُعتمَدين</Pill>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {assignedStudents.map((s) => <DevPlanCard key={s.id} mission={m} student={s} />)}
          </div>
        </div>
      )}

      {editing && <CreateMissionModal edit={m} onClose={() => setEditing(false)} />}
    </div>
  );
}
