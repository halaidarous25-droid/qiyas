import { useEffect, useState } from "react";
import { Pill, En } from "@/components/common";
import { useSlis } from "@/store";
import { cn } from "@/lib/utils";
import {
  ClipboardList, Plus, Pencil, Trash2, X, Save, School as SchoolIcon, Loader2,
} from "lucide-react";
import {
  fetchAllExamTypes, upsertExamType, deleteExamType, fetchExamAccessAll, setSchoolExamEnabled,
  type ExamType, type ExamQuestion,
} from "@/lib/api";
import type { PlatformSchool } from "@/data/mock";

const inp = "w-full rounded-lg border bg-background px-3 h-10 text-sm outline-none focus:border-brand";

export function CentralExams({ schools = [] }: { schools?: PlatformSchool[] }) {
  const { toast } = useSlis();
  const [exams, setExams] = useState<ExamType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ExamType | null>(null);
  const [creating, setCreating] = useState(false);
  const [accessFor, setAccessFor] = useState<ExamType | null>(null);

  const load = async () => {
    try { setExams(await fetchAllExamTypes()); }
    catch (e: any) { toast(`تعذّر تحميل الاختبارات: ${e.message || e}`, "danger"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const toggleActive = async (e: ExamType) => {
    try { await upsertExamType({ ...e, active: !e.active }); toast(e.active ? "أُوقف الاختبار عامًّا" : "فُعّل الاختبار عامًّا"); load(); }
    catch (err: any) { toast(`تعذّر التحديث: ${err.message || err}`, "danger"); }
  };
  const del = async (e: ExamType) => {
    if (!confirm(`حذف اختبار «${e.name}» بالكامل؟ لا يمكن التراجع.`)) return;
    try { await deleteExamType(e.key); toast("حُذف الاختبار"); load(); }
    catch (err: any) { toast(`تعذّر الحذف: ${err.message || err}`, "danger"); }
  };

  if (loading) return <div className="mx-auto max-w-5xl p-6 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-brand" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold">إدارة الاختبارات</h1>
          <p className="text-sm text-muted-foreground">إضافة الاختبارات وتعديل أسئلتها وتفاصيلها وحذفها، وتفعيلها لكل مدرسة.</p>
        </div>
        <button onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 h-10 text-sm font-semibold text-white hover:bg-brand/90">
          <Plus className="h-4 w-4" /> اختبار جديد
        </button>
      </div>

      <div className="space-y-3">
        {exams.map((e) => (
          <div key={e.id} className="rounded-xl border bg-card p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand/8 text-brand"><ClipboardList className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{e.name}</span>
                  <Pill tone={e.active ? "success" : "muted"}>{e.active ? "مُفعّل عامًّا" : "موقوف"}</Pill>
                  {e.key === "leadership" && <Pill tone="brand">أساسي</Pill>}
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">
                  المفتاح: <span dir="ltr" className="font-mono">{e.key}</span> · الأسئلة: <En>{e.questions?.length || 0}</En>
                  {e.description ? ` · ${e.description}` : ""}
                </div>
              </div>
              <button onClick={() => toggleActive(e)} className="rounded-lg border px-3 h-9 text-xs font-semibold hover:bg-accent">
                {e.active ? "إيقاف عام" : "تفعيل عام"}
              </button>
              <button onClick={() => setAccessFor(e)} className="inline-flex items-center gap-1 rounded-lg border px-3 h-9 text-xs font-semibold hover:bg-accent">
                <SchoolIcon className="h-3.5 w-3.5" /> المدارس
              </button>
              <button onClick={() => setEditing(e)} className="grid h-9 w-9 place-items-center rounded-lg border hover:bg-accent"><Pencil className="h-4 w-4" /></button>
              {e.key !== "leadership" && (
                <button onClick={() => del(e)} className="grid h-9 w-9 place-items-center rounded-lg border text-danger hover:bg-danger/10"><Trash2 className="h-4 w-4" /></button>
              )}
            </div>
          </div>
        ))}
      </div>

      {(editing || creating) && (
        <ExamEditor exam={editing} onClose={() => { setEditing(null); setCreating(false); }} onSaved={() => { setEditing(null); setCreating(false); load(); }} />
      )}
      {accessFor && <AccessEditor exam={accessFor} schools={schools} onClose={() => setAccessFor(null)} />}
    </div>
  );
}

// ===== محرّر الاختبار (التفاصيل + الأسئلة) =====
function ExamEditor({ exam, onClose, onSaved }: { exam: ExamType | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useSlis();
  const isNew = !exam;
  const [key, setKey] = useState(exam?.key || "");
  const [name, setName] = useState(exam?.name || "");
  const [description, setDescription] = useState(exam?.description || "");
  const [active, setActive] = useState(exam?.active ?? true);
  const [questions, setQuestions] = useState<ExamQuestion[]>(exam?.questions?.length ? exam.questions.map((q) => ({ ...q, options: [...q.options] })) : []);
  const [busy, setBusy] = useState(false);

  const normKey = (k: string) => k.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  const addQ = () => setQuestions((qs) => [...qs, { id: `q_${Date.now()}_${qs.length}`, text: "", options: [{ text: "", score: 50 }, { text: "", score: 50 }] }]);
  const rmQ = (i: number) => setQuestions((qs) => qs.filter((_, j) => j !== i));
  const setQText = (i: number, v: string) => setQuestions((qs) => qs.map((q, j) => j === i ? { ...q, text: v } : q));
  const addOpt = (i: number) => setQuestions((qs) => qs.map((q, j) => j === i ? { ...q, options: [...q.options, { text: "", score: 50 }] } : q));
  const rmOpt = (i: number, oi: number) => setQuestions((qs) => qs.map((q, j) => j === i ? { ...q, options: q.options.filter((_, k) => k !== oi) } : q));
  const setOpt = (i: number, oi: number, patch: Partial<{ text: string; score: number }>) =>
    setQuestions((qs) => qs.map((q, j) => j === i ? { ...q, options: q.options.map((o, k) => k === oi ? { ...o, ...patch } : o) } : q));

  const validKey = isNew ? normKey(key).length >= 2 : true;
  const canSave = name.trim().length >= 2 && validKey;

  const save = async () => {
    if (!canSave) return;
    setBusy(true);
    try {
      await upsertExamType({
        ...(exam?.id ? { id: exam.id } : {}),
        key: isNew ? normKey(key) : exam!.key,
        name: name.trim(), description: description.trim(), active,
        questions: questions.map((q) => ({ id: q.id, text: q.text.trim(), options: q.options.map((o) => ({ text: o.text.trim(), score: Number(o.score) || 0 })) })),
      });
      toast("حُفظ الاختبار");
      onSaved();
    } catch (e: any) { toast(`تعذّر الحفظ: ${e.message || e}`, "danger"); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-start justify-center overflow-auto bg-black/40 p-4" onClick={onClose}>
      <div className="my-4 w-full max-w-2xl rounded-2xl border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()} dir="rtl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-extrabold">{isNew ? "اختبار جديد" : `تعديل: ${exam!.name}`}</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">اسم الاختبار</label>
            <input className={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: اختبار التخصص" /></div>
          <div><label className="mb-1 block text-xs font-semibold text-muted-foreground">المفتاح (إنجليزي، لا يتغيّر)</label>
            <input className={inp} dir="ltr" value={key} disabled={!isNew} onChange={(e) => setKey(e.target.value)} placeholder="specialty" /></div>
        </div>
        <div className="mt-3"><label className="mb-1 block text-xs font-semibold text-muted-foreground">وصف مختصر</label>
          <input className={inp} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> مُفعّل عامًّا (متاح للمدارس)</label>

        <div className="mt-4 flex items-center justify-between">
          <h4 className="font-display font-bold">الأسئلة (<En>{questions.length}</En>)</h4>
          <button onClick={addQ} className="inline-flex items-center gap-1 rounded-lg border px-3 h-8 text-xs font-semibold hover:bg-accent"><Plus className="h-3.5 w-3.5" /> سؤال</button>
        </div>
        <div className="mt-2 space-y-3">
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-xl border p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground"><En>{i + 1}</En></span>
                <input className={inp} value={q.text} onChange={(e) => setQText(i, e.target.value)} placeholder="نص السؤال" />
                <button onClick={() => rmQ(i)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border text-danger hover:bg-danger/10"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-2 space-y-1.5">
                {q.options.map((o, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input className={cn(inp, "flex-1")} value={o.text} onChange={(e) => setOpt(i, oi, { text: e.target.value })} placeholder={`الخيار ${oi + 1}`} />
                    <input className="w-20 rounded-lg border bg-background px-2 h-10 text-sm" type="number" min={0} max={100} value={o.score} onChange={(e) => setOpt(i, oi, { score: Number(e.target.value) })} title="الدرجة" dir="ltr" />
                    <button onClick={() => rmOpt(i, oi)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border hover:bg-accent"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                <button onClick={() => addOpt(i)} className="text-xs font-semibold text-brand hover:underline">+ إضافة خيار</button>
              </div>
            </div>
          ))}
          {questions.length === 0 && <p className="text-sm text-muted-foreground">لا أسئلة بعد — أضف أول سؤال.</p>}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border px-4 h-10 text-sm font-semibold hover:bg-accent">إلغاء</button>
          <button onClick={save} disabled={!canSave || busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-5 h-10 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== تفعيل الاختبار لكل مدرسة =====
function AccessEditor({ exam, schools, onClose }: { exam: ExamType; schools: PlatformSchool[]; onClose: () => void }) {
  const { toast } = useSlis();
  const [access, setAccess] = useState<Record<string, { enabled: boolean; school_active: boolean }>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const rows = await fetchExamAccessAll(exam.key);
      const m: Record<string, { enabled: boolean; school_active: boolean }> = {};
      rows.forEach((r) => (m[r.school_id] = { enabled: r.enabled, school_active: r.school_active }));
      setAccess(m);
    } catch (e: any) { toast(`تعذّر التحميل: ${e.message || e}`, "danger"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [exam.key]);

  const toggle = async (schoolId: string, next: boolean) => {
    try {
      await setSchoolExamEnabled(schoolId, exam.key, next);
      setAccess((m) => ({ ...m, [schoolId]: { ...(m[schoolId] || { school_active: true }), enabled: next } }));
      toast(next ? "فُعّل للمدرسة" : "أُوقف للمدرسة");
    } catch (e: any) { toast(`تعذّر التحديث: ${e.message || e}`, "danger"); }
  };

  return (
    <div className="fixed inset-0 z-[80] grid place-items-start justify-center overflow-auto bg-black/40 p-4" onClick={onClose}>
      <div className="my-4 w-full max-w-lg rounded-2xl border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()} dir="rtl">
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-display text-lg font-extrabold">تفعيل «{exam.name}» للمدارس</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <p className="mb-3 text-[12px] text-muted-foreground">عند التفعيل، تتحكم كل مدرسة داخليًا بإظهاره أو إيقافه مؤقتًا.</p>
        {loading ? <div className="py-6 text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin text-brand" /></div> : (
          <div className="max-h-[50vh] divide-y overflow-y-auto rounded-lg border">
            {schools.map((s) => {
              const on = !!access[s.id]?.enabled;
              const active = access[s.id]?.school_active !== false;
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex-1"><div className="font-semibold text-sm">{s.name}</div>
                    {on && <div className="text-[11px] text-muted-foreground">{active ? "المدرسة مُظهِرة له" : "أوقفته المدرسة مؤقتًا"}</div>}</div>
                  <button onClick={() => toggle(s.id, !on)}
                    className={cn("rounded-lg border px-3 h-8 text-xs font-semibold", on ? "text-danger hover:bg-danger/10" : "text-success hover:bg-success/10")}>
                    {on ? "إيقاف" : "تفعيل"}
                  </button>
                </div>
              );
            })}
            {schools.length === 0 && <div className="px-4 py-6 text-center text-sm text-muted-foreground">لا مدارس.</div>}
          </div>
        )}
      </div>
    </div>
  );
}
