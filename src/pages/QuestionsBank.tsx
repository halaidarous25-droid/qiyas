import { useEffect, useState } from "react";
import { Pill, En } from "@/components/common";
import { useSlis } from "@/store";
import { fetchQuestionBank, type QItem } from "@/lib/live";
import { dbAddQuestion, dbSetQuestionActive, dbDeleteQuestion, dbUpdateQuestionOptions } from "@/lib/api";
import { QUESTIONS } from "@/data/questions";
import { POOL } from "@/data/questionPool";
import { cn } from "@/lib/utils";
import {
  ListChecks, Plus, Trash2, Loader2, BookOpen, Building2,
  ToggleLeft, ToggleRight, X, AlertCircle, SlidersHorizontal, Save,
} from "lucide-react";

const AXES: { key: string; label: string }[] = [
  { key: "org", label: "التنظيم" }, { key: "lead", label: "القيادة" },
  { key: "comm", label: "التواصل" }, { key: "firm", label: "الحزم" },
  { key: "init", label: "المبادرة" },
];
const axisLabel = (k: string | null) => AXES.find((a) => a.key === k)?.label ?? (k || "—");
const TYPE_LABEL: Record<string, string> = {
  scenario: "سيناريو", situation: "موقف", parallel: "موازٍ", trap: "فخّ", indicator: "مؤشّر",
};

function QuestionCard({ q, editable, onToggle, onDelete, onSaveOptions }: {
  q: QItem; editable: boolean;
  onToggle?: (q: QItem) => void; onDelete?: (q: QItem) => void;
  onSaveOptions?: (q: QItem, options: { text: string; score: number }[]) => void;
}) {
  const [editW, setEditW] = useState(false);
  const [opts, setOpts] = useState(q.options);

  return (
    <div className={cn("rounded-xl border bg-card p-4", !q.active && "opacity-60")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Pill tone="brand"><En>{q.seq}</En></Pill>
          <Pill tone="muted">{TYPE_LABEL[q.type] || q.type}</Pill>
          {q.axis && <Pill tone="info">{axisLabel(q.axis)}</Pill>}
          {q.section && <Pill tone="muted">قسم <En>{q.section}</En></Pill>}
          {!q.active && <Pill tone="warning">موقوف</Pill>}
        </div>
        {editable && (
          <div className="flex items-center gap-1">
            {q.options.length > 0 && (
              <button onClick={() => { setEditW((v) => !v); setOpts(q.options); }} title="تعديل الأوزان"
                className={cn("grid h-8 w-8 place-items-center rounded-md border hover:bg-accent", editW && "bg-brand/10 text-brand")}>
                <SlidersHorizontal className="h-4 w-4" />
              </button>
            )}
            <button onClick={() => onToggle?.(q)} title={q.active ? "إيقاف" : "تفعيل"}
              className="grid h-8 w-8 place-items-center rounded-md border hover:bg-accent">
              {q.active ? <ToggleRight className="h-4 w-4 text-success" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
            </button>
            <button onClick={() => onDelete?.(q)} title="حذف"
              className="grid h-8 w-8 place-items-center rounded-md border text-danger hover:bg-danger/10">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      {q.role && <div className="mt-2 text-[11px] text-muted-foreground">{q.role}</div>}
      <p className="mt-1 text-sm font-medium leading-6">{q.text}</p>

      {q.options.length > 0 && !editW && (
        <ul className="mt-2 space-y-1">
          {q.options.map((o, i) => (
            <li key={i} className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-2.5 py-1.5 text-[13px]">
              <span className="flex-1">{o.text}</span>
              <span className="shrink-0 rounded bg-brand/10 px-1.5 py-0.5 text-[11px] font-bold text-brand"><En>{o.score}</En></span>
            </li>
          ))}
        </ul>
      )}

      {editW && (
        <div className="mt-2 space-y-1.5">
          <div className="text-[11px] font-semibold text-brand">تعديل أوزان الخيارات (٠–١٠٠) — مفتاح التصحيح</div>
          {opts.map((o, i) => (
            <div key={i} className="flex items-center gap-2 text-[13px]">
              <span className="flex-1 truncate">{o.text}</span>
              <input type="number" min={0} max={100} value={o.score}
                onChange={(e) => setOpts((os) => os.map((x, j) => j === i ? { ...x, score: Number(e.target.value) } : x))}
                className="w-16 rounded border bg-background px-2 h-8 text-center text-xs" />
            </div>
          ))}
          <button onClick={() => { onSaveOptions?.(q, opts); setEditW(false); }}
            className="mt-1 inline-flex items-center gap-1 rounded-md bg-brand px-3 h-8 text-xs font-semibold text-white hover:bg-brand/90">
            <Save className="h-3.5 w-3.5" /> حفظ الأوزان
          </button>
        </div>
      )}
    </div>
  );
}

function AddQuestionForm({ onAdd, onClose, busy }: {
  onAdd: (q: any) => void; onClose: () => void; busy: boolean;
}) {
  const [type, setType] = useState("scenario");
  const [axis, setAxis] = useState("org");
  const [section, setSection] = useState(1);
  const [role, setRole] = useState("");
  const [text, setText] = useState("");
  const [options, setOptions] = useState([
    { text: "", score: 100 }, { text: "", score: 70 },
    { text: "", score: 40 }, { text: "", score: 10 },
  ]);

  const valid = text.trim().length > 5 && options.filter((o) => o.text.trim()).length >= 2;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">إضافة سؤال جديد</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <label className="text-sm">النوع
            <select value={type} onChange={(e) => setType(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-2 h-10 text-sm">
              <option value="scenario">سيناريو</option>
              <option value="situation">موقف</option>
            </select>
          </label>
          <label className="text-sm">المحور
            <select value={axis} onChange={(e) => setAxis(e.target.value)} className="mt-1 w-full rounded-lg border bg-background px-2 h-10 text-sm">
              {AXES.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
            </select>
          </label>
          <label className="text-sm">القسم
            <select value={section} onChange={(e) => setSection(Number(e.target.value))} className="mt-1 w-full rounded-lg border bg-background px-2 h-10 text-sm">
              <option value={1}>١</option><option value={2}>٢</option><option value={3}>٣</option>
            </select>
          </label>
        </div>

        <label className="mt-3 block text-sm">مؤشّر الدور (اختياري)
          <input value={role} onChange={(e) => setRole(e.target.value)} placeholder="مثال: طالب — موقف يومي"
            className="mt-1 w-full rounded-lg border bg-background px-3 h-10 text-sm" />
        </label>

        <label className="mt-3 block text-sm">نص السؤال
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2}
            placeholder="اكتب الموقف أو السؤال…"
            className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" />
        </label>

        <div className="mt-3 space-y-2">
          <div className="text-sm font-semibold">الخيارات ووزن كل خيار (٠–١٠٠)</div>
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={o.text} onChange={(e) => setOptions((os) => os.map((x, j) => j === i ? { ...x, text: e.target.value } : x))}
                placeholder={`الخيار ${i + 1}`} className="flex-1 rounded-lg border bg-background px-3 h-10 text-sm" />
              <input type="number" min={0} max={100} value={o.score}
                onChange={(e) => setOptions((os) => os.map((x, j) => j === i ? { ...x, score: Number(e.target.value) } : x))}
                className="w-20 rounded-lg border bg-background px-2 h-10 text-sm text-center" />
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border px-4 h-10 text-sm font-semibold hover:bg-accent">إلغاء</button>
          <button disabled={!valid || busy}
            onClick={() => onAdd({ type, axis, section, role: role.trim() || null, text: text.trim(), options: options.filter((o) => o.text.trim()) })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 h-10 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} إضافة
          </button>
        </div>
      </div>
    </div>
  );
}

export function QuestionsBank() {
  const { live, schoolId, toast } = useSlis();
  const [bank, setBank] = useState<{ global: QItem[]; school: QItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"base" | "extra">("base");

  const load = async () => {
    if (!live || !schoolId) { setLoading(false); return; }
    try { setBank(await fetchQuestionBank(schoolId)); setErr(null); }
    catch (e: any) { setErr(e?.message || "تعذّر تحميل بنك الأسئلة"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  // مستودع الأسئلة الأساسي: الأساسية + المستودع الموسّع (١٠٠ سؤال) — يُختار منها ٣٥ عشوائيًا لكل اختبار
  const poolItems: QItem[] = POOL.map((q) => ({
    id: q.id, schoolId: null, seq: q.n, type: q.type, axis: q.axis ?? null,
    section: q.section ?? null, role: q.role ?? null, text: q.text, options: q.options ?? [], active: true,
  }));
  const coreItems: QItem[] = live
    ? (bank?.global ?? [])
    : QUESTIONS.map((q) => ({
        id: q.id, schoolId: null, seq: q.n, type: q.type, axis: q.axis ?? null,
        section: q.section, role: q.role ?? null, text: q.text, options: q.options ?? [], active: true,
      }));
  const base = [...coreItems, ...poolItems];
  const extra = live ? (bank?.school ?? []) : [];

  const addQuestion = async (q: any) => {
    if (!schoolId) return;
    setBusy(true);
    try {
      await dbAddQuestion(schoolId, q);
      await load(); setShowAdd(false); setTab("extra");
      toast("أُضيف السؤال إلى مستودع مدرستك");
    } catch (e: any) { toast(`تعذّرت الإضافة: ${e.message || e}`, "danger"); }
    finally { setBusy(false); }
  };
  const toggle = async (q: QItem) => {
    try { await dbSetQuestionActive(q.id, !q.active); await load(); }
    catch (e: any) { toast(`تعذّر التغيير: ${e.message || e}`, "danger"); }
  };
  const del = async (q: QItem) => {
    try { await dbDeleteQuestion(q.id); await load(); toast("حُذف السؤال", "info"); }
    catch (e: any) { toast(`تعذّر الحذف: ${e.message || e}`, "danger"); }
  };
  const saveOptions = async (q: QItem, options: { text: string; score: number }[]) => {
    try { await dbUpdateQuestionOptions(q.id, options); await load(); toast("حُدّثت أوزان السؤال"); }
    catch (e: any) { toast(`تعذّر الحفظ: ${e.message || e}`, "danger"); }
  };

  if (loading) return (
    <div className="grid place-items-center py-20 text-muted-foreground">
      <Loader2 className="h-7 w-7 animate-spin text-brand" />
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold">مستودع الأسئلة</h1>
          <p className="text-sm text-muted-foreground">
            المستودع يضم أكثر من ١٠٠ سؤال، ويُختار منها ٣٥ سؤالًا عشوائيًا في كل اختبار حتى لا تتكرّر الأسئلة. ويمكن لمدرستك إضافة أسئلة خاصة بها.
          </p>
        </div>
        {live && (
          <button onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 h-10 text-sm font-semibold text-white hover:bg-brand/90">
            <Plus className="h-4 w-4" /> إضافة سؤال
          </button>
        )}
      </div>

      {!live && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 text-brand" /> أنت في العرض التجريبي — الإضافة والتعديل متاحان عند الدخول بحساب مدرسة حقيقي.
        </div>
      )}
      {err && (
        <div className="flex items-center gap-2 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4" /> {err}
        </div>
      )}

      {/* تبويبات */}
      <div className="flex gap-2">
        <button onClick={() => setTab("base")}
          className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 h-9 text-sm font-semibold",
            tab === "base" ? "bg-brand text-white" : "hover:bg-accent")}>
          <BookOpen className="h-4 w-4" /> الأساسية <span className="opacity-80"><En>{base.length}</En></span>
        </button>
        <button onClick={() => setTab("extra")}
          className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 h-9 text-sm font-semibold",
            tab === "extra" ? "bg-brand text-white" : "hover:bg-accent")}>
          <Building2 className="h-4 w-4" /> أسئلة مدرستك <span className="opacity-80"><En>{extra.length}</En></span>
        </button>
      </div>

      {tab === "base" && (
        <div className="grid gap-3 lg:grid-cols-2">
          {base.map((q) => <QuestionCard key={q.id} q={q} editable={false} />)}
        </div>
      )}

      {tab === "extra" && (
        extra.length === 0 ? (
          <div className="grid place-items-center gap-2 rounded-xl border border-dashed bg-card py-14 text-center">
            <ListChecks className="h-8 w-8 text-brand/60" />
            <div className="text-sm font-semibold">لا أسئلة خاصة بمدرستك بعد</div>
            <div className="text-xs text-muted-foreground">أضف سؤالك الأول ليظهر ضمن مقياس مدرستك.</div>
            {live && (
              <button onClick={() => setShowAdd(true)} className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 h-9 text-sm font-semibold text-white hover:bg-brand/90">
                <Plus className="h-4 w-4" /> إضافة سؤال
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {extra.map((q) => <QuestionCard key={q.id} q={q} editable={live} onToggle={toggle} onDelete={del} onSaveOptions={saveOptions} />)}
          </div>
        )
      )}

      {showAdd && <AddQuestionForm onAdd={addQuestion} onClose={() => setShowAdd(false)} busy={busy} />}
    </div>
  );
}
