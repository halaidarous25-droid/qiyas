import { Pill, Avatar, En, Meter } from "@/components/common";
import { useSlis } from "@/store";
import { matchTone, type Tone } from "@/lib/tone";
import { TRUST_META } from "@/data/mock";
import {
  Bell, ClipboardCheck, Sparkles, Clock, Check, X, FileText,
  Target, ArrowLeft, UserCheck, Inbox,
} from "lucide-react";

export function Updates({ onOpenStudent, onOpenMission }:
  { onOpenStudent: (id: string) => void; onOpenMission: (id: string) => void }) {
  const { students, indReqs, resolveIndReq, missions, assigned, toast, seenStudents } = useSlis();
  const isNew = (id: string) => !seenStudents.includes(id);

  // أحدث الاختبارات: الطلاب الذين أدّوا المقياس مرتّبين من الأحدث إلى الأقدم
  const latestDate = (s: any) => {
    const dates = [s.assessedAt, ...((s.attempts || []).map((a: any) => a.date))].filter(Boolean);
    return dates.sort().slice(-1)[0] || ""; // أحدث تاريخ متاح
  };
  const recentAssessed = students
    .filter((s) => s.assessed)
    .slice()
    // الجديد (لم يُطّلع عليه) أولًا، ثم الأحدث تاريخًا
    .sort((a, b) => (Number(isNew(b.id)) - Number(isNew(a.id))) || latestDate(b).localeCompare(latestDate(a)))
    .slice(0, 12);
  const newCount = students.filter((s) => s.assessed && isNew(s.id)).length;

  // مهام بانتظار الإسناد: مفتوحة/قيد الفرز، لها مرشّحون، ولم تكتمل مقاعدها
  const pendingMissions = missions.filter((m) => {
    const asg = (assigned[m.id] || []).length;
    return ["open", "screening"].includes(m.status) && m.candidateIds.length > 0 && asg < m.seats;
  });

  const pendingCount = indReqs.length + pendingMissions.length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold">آخر المستجدات</h1>
          <p className="text-sm text-muted-foreground">
            أحدث الاختبارات التي أجراها الطلاب، والطلبات والإجراءات التي تحتاج إلى قرارك.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-2">
          <Bell className="h-5 w-5 text-brand" />
          <div className="text-right leading-tight">
            <div className="font-display text-xl font-extrabold text-brand"><En>{pendingCount}</En></div>
            <div className="text-[11px] text-muted-foreground">بحاجة إلى إجراء</div>
          </div>
        </div>
      </div>

      {/* بطاقات ملخّص */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile icon={Sparkles} tone="brand" label="اختبارات جديدة" value={newCount} hint="طلاب اختبروا حديثًا ولم تُطّلع عليهم" />
        <StatTile icon={Inbox} tone="gold" label="طلبات فردية معلّقة" value={indReqs.length} hint="بحاجة إلى موافقة/رفض" />
        <StatTile icon={Target} tone="success" label="مهام بانتظار الإسناد" value={pendingMissions.length} hint="لها مرشّحون ولم تُسنَد" />
      </div>

      {/* طلبات تحتاج إجراء */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center gap-2 border-b px-5 py-3">
          <ClipboardCheck className="h-[18px] w-[18px] text-gold" />
          <h2 className="font-display font-bold">طلبات تحتاج اتخاذ إجراء</h2>
          <Pill tone="muted" className="mr-auto"><En>{indReqs.length}</En></Pill>
        </div>
        {indReqs.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">لا طلبات معلّقة حاليًا — كل شيء على ما يُرام.</div>
        ) : (
          <div className="divide-y">
            {indReqs.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Avatar name={r.student} color={r.color} size={38} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm">{r.student}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    {r.grade && <span>الصف: {r.grade}</span>}
                    {r.purpose && <Pill tone="info">{r.purpose}</Pill>}
                    {r.date && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {r.date}</span>}
                  </div>
                </div>
                <button onClick={() => { resolveIndReq(r.id, true, r.student); toast(`قُبل طلب ${r.student}`); }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 h-9 text-sm font-semibold text-white hover:opacity-90">
                  <Check className="h-4 w-4" /> قبول
                </button>
                <button onClick={() => { resolveIndReq(r.id, false, r.student); toast(`رُفض طلب ${r.student}`, "info"); }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-danger/40 text-danger px-3 h-9 text-sm font-semibold hover:bg-danger/10">
                  <X className="h-4 w-4" /> رفض
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* مهام بانتظار الإسناد */}
      {pendingMissions.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center gap-2 border-b px-5 py-3">
            <UserCheck className="h-[18px] w-[18px] text-brand" />
            <h2 className="font-display font-bold">مهام بانتظار الإسناد</h2>
            <Pill tone="muted" className="mr-auto"><En>{pendingMissions.length}</En></Pill>
          </div>
          <div className="divide-y">
            {pendingMissions.map((m) => {
              const asg = (assigned[m.id] || []).length;
              return (
                <button key={m.id} onClick={() => onOpenMission(m.id)}
                  className="flex w-full items-center gap-3 px-5 py-3 text-right hover:bg-accent/40">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand/8 text-brand"><Target className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-sm">{m.title}</div>
                    <div className="text-[11px] text-muted-foreground">{m.scopeLabel}</div>
                  </div>
                  <Pill tone="warning"><En>{asg}</En>/<En>{m.seats}</En> مقعد</Pill>
                  <Pill tone="brand"><En>{m.candidateIds.length}</En> مرشّح</Pill>
                  <ArrowLeft className="h-4 w-4 text-brand" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* أحدث الاختبارات */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="flex items-center gap-2 border-b px-5 py-3">
          <Sparkles className="h-[18px] w-[18px] text-brand" />
          <h2 className="font-display font-bold">أحدث الاختبارات التي أجراها الطلاب</h2>
          <Pill tone="muted" className="mr-auto"><En>{recentAssessed.length}</En></Pill>
        </div>
        {recentAssessed.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">لم يؤدِّ أي طالب المقياس بعد.</div>
        ) : (
          <div className="divide-y">
            {recentAssessed.map((s) => {
              const trust = TRUST_META[s.trust];
              return (
                <div key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <Avatar name={s.name} color={s.avatarColor} size={38} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><span className="font-semibold text-sm">{s.name}</span>
                      {isNew(s.id) && <Pill tone="brand">جديد</Pill>}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{s.grade} · {s.className}</span>
                      {s.assessedAt && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> <En>{s.assessedAt}</En></span>}
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-2 w-32">
                    <Meter value={s.competency} tone={matchTone(s.competency)} />
                    <span className="text-[11px] font-bold w-8">ك <En>{s.competency}</En></span>
                  </div>
                  <Pill tone={trust.tone as Tone}>{trust.label}</Pill>
                  <button onClick={() => onOpenStudent(s.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border px-3 h-9 text-sm font-semibold hover:bg-accent">
                    <FileText className="h-4 w-4" /> الملف
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, tone, label, value, hint }:
  { icon: any; tone: Tone; label: string; value: number; hint: string }) {
  const tones: Record<string, string> = {
    brand: "text-brand bg-brand/8", gold: "text-gold bg-gold/10", success: "text-success bg-success/10",
  };
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={`grid h-11 w-11 place-items-center rounded-xl ${tones[tone] || tones.brand}`}><Icon className="h-5 w-5" /></div>
        <div>
          <div className="font-display text-2xl font-extrabold"><En>{value}</En></div>
          <div className="text-xs font-semibold">{label}</div>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}
