import { useEffect, useState } from "react";
import { Pill } from "@/components/common";
import { En } from "@/components/common";
import { fetchGlobalQuestions, type QItem } from "@/lib/live";
import { dbAddGlobalQuestion, dbSetQuestionActive, dbDeleteQuestion, dbUpdateQuestionOptions } from "@/lib/api";
import { QUESTIONS } from "@/data/questions";
import { BANK_B } from "@/data/questionBankB";
import { cn } from "@/lib/utils";
import {
  ListChecks, Plus, Trash2, Loader2, ShieldCheck, ToggleLeft, ToggleRight,
  SlidersHorizontal, Save, X, BookOpen,
} from "lucide-react";

const AXES = [
  { key: "org", label: "التنظيم" }, { key: "lead", label: "القيادة" },
  { key: "comm", label: "التواصل" }, { key: "firm", label: "الحزم" }, { key: "init", label: "المبادرة" },
];
const axisLabel = (k: string | null) => AXES.find((a) => a.key === k)?.label ?? (k || "—");
const TYPE_LABEL: Record<string, string> = { scenario: "سيناريو", situation: "موقف", parallel: "موازٍ", trap: "فخّ", indicator: "مؤشّر" };

function Card({ q, editable, onToggle, onDelete, onSaveOptions }: {
  q: QItem; editable: boolean;
  onToggle?: (q: QItem) => void; onDelete?: (q: QItem) => void;
  onSaveOptions?: (q: QItem, o: { text: string; score: number }[]) => void;
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
            <button onClick={() => onToggle?.(q)} className="grid h-8 w-8 place-items-center rounded-md border hover:bg-accent">
              {q.active ? <ToggleRight className="h-4 w-4 text-success" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
            </button>
            <button onClick={() => onDelete?.(q)} className="grid h-8 w-8 place-items-center rounded-md border text-danger hover:bg-danger/10">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      <p className="mt-2 text-sm font-medium leading-6">{q.text}</p>
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

function AddForm({ onAdd, onClose, busy }: { onAdd: (q: any) => void; onClose: () => void; busy: boolean }) {
  const [axis, setAxis] = useState("org");
  const [text, setText] = useState("");
  const [options, setOptions] = useState([
    { text: "", score: 100 }, { text: "", score: 70 }, { text: "", score: 40 }, { text: "", score: 10 },
  ]);
  const valid = text.trim().length > 5 && options.filter((o) => o.text.trim()).length >= 2;
  const inputCls = "rounded-lg border bg-background px-3 h-10 text-sm";
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">إضافة سؤال عام للبنك</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <label className="text-sm">المحور
          <select value={axis} onChange={(e) => setAxis(e.target.value)} className={cn(inputCls, "mt-1 w-full")}>
            {AXES.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
        </label>
        <label className="mt-3 block text-sm">نص السؤال
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm" />
        </label>
        <div className="mt-3 space-y-2">
          <div className="text-sm font-semibold">الخيارات والأوزان (٠–١٠٠)</div>
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={o.text} onChange={(e) => setOptions((os) => os.map((x, j) => j === i ? { ...x, text: e.target.value } : x))}
                placeholder={`الخيار ${i + 1}`} className={cn(inputCls, "flex-1")} />
              <input type="number" min={0} max={100} value={o.score}
                onChange={(e) => setOptions((os) => os.map((x, j) => j === i ? { ...x, score: Number(e.target.value) } : x))}
                className="w-20 rounded-lg border bg-background px-2 h-10 text-center text-sm" />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border px-4 h-10 text-sm font-semibold hover:bg-accent">إلغاء</button>
          <button disabled={!valid || busy} onClick={() => onAdd({ type: "scenario", axis, section: 1, role: "موقف قيادي", text: text.trim(), options: options.filter((o) => o.text.trim()) })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 h-10 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} إضافة
          </button>
        </div>
      </div>
    </div>
  );
}

export function CentralQuestions() {
  const [globals, setGlobals] = useState<QItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"bank" | "base">("bank");
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [axisF, setAxisF] = useState<string>("all");
  const [typeF, setTypeF] = useState<string>("all");

  const load = async () => {
    try { setGlobals(await fetchGlobalQuestions()); } catch { /* */ } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(null), 2500); };

  // البنك المعتمد الفعلي المستخدَم في الاختبار: النموذج أ + النموذج ب (١٣٥ بندًا)
  const bankAll: QItem[] = [...QUESTIONS, ...BANK_B].map((q, i) => ({
    id: q.id, schoolId: null, seq: i + 1, type: q.type, axis: q.axis ?? null,
    section: q.section ?? null, role: q.role ?? null, text: q.text, options: q.options ?? [], active: true,
  }));
  const bankItems = bankAll.filter((q) =>
    (axisF === "all" || q.axis === axisF) && (typeF === "all" || q.type === typeF));

  const add = async (q: any) => {
    setBusy(true);
    try { await dbAddGlobalQuestion(q); await load(); setShowAdd(false); flash("أُضيف السؤال للبنك العام"); }
    catch (e: any) { flash(`تعذّرت الإضافة: ${e.message || e}`); }
    finally { setBusy(false); }
  };
  const toggle = async (q: QItem) => { try { await dbSetQuestionActive(q.id, !q.active); await load(); } catch { /* */ } };
  const del = async (q: QItem) => { try { await dbDeleteQuestion(q.id); await load(); flash("حُذف السؤال"); } catch { /* */ } };
  const saveOpts = async (q: QItem, o: { text: string; score: number }[]) => {
    try { await dbUpdateQuestionOptions(q.id, o); await load(); flash("حُدّثت الأوزان"); } catch { /* */ }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-brand" /> مستودع الأسئلة المحميّ</h1>
          <p className="text-sm text-muted-foreground">يُدار من الحساب المركزي فقط لحماية الأسئلة من التغيير. حسابات المدارس لا تراه.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 h-10 text-sm font-semibold text-white hover:bg-brand/90">
          <Plus className="h-4 w-4" /> إضافة سؤال عام
        </button>
      </div>

      {msg && <div className="rounded-lg border border-brand/30 bg-brand/5 px-4 py-2 text-sm text-brand">{msg}</div>}

      <div className="flex gap-2">
        <button onClick={() => setTab("bank")} className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 h-9 text-sm font-semibold", tab === "bank" ? "bg-brand text-white" : "hover:bg-accent")}>
          <BookOpen className="h-4 w-4" /> البنك المعتمد (أ + ب) <span className="opacity-80"><En>{bankAll.length}</En></span>
        </button>
        <button onClick={() => setTab("base")} className={cn("inline-flex items-center gap-1.5 rounded-lg border px-3 h-9 text-sm font-semibold", tab === "base" ? "bg-brand text-white" : "hover:bg-accent")}>
          <ListChecks className="h-4 w-4" /> أسئلة مضافة (قاعدة البيانات) <span className="opacity-80"><En>{globals.length}</En></span>
        </button>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16"><Loader2 className="h-7 w-7 animate-spin text-brand" /></div>
      ) : tab === "base" ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {globals.map((q) => <Card key={q.id} q={q} editable onToggle={toggle} onDelete={del} onSaveOptions={saveOpts} />)}
          {globals.length === 0 && <div className="lg:col-span-2 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">لا أسئلة إضافية في قاعدة البيانات بعد — أضف سؤالك الأول.</div>}
        </div>
      ) : (
        <>
          {/* مرشّحات البنك */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3">
            <span className="text-xs font-semibold text-muted-foreground">تصفية:</span>
            <div className="flex flex-wrap gap-1">
              <FilterChip label="كل الأنواع" active={typeF === "all"} onClick={() => setTypeF("all")} />
              {Object.entries(TYPE_LABEL).map(([k, l]) => (
                <FilterChip key={k} label={l} active={typeF === k} onClick={() => setTypeF(k)} />
              ))}
            </div>
            <div className="mx-1 h-5 w-px bg-border" />
            <div className="flex flex-wrap gap-1">
              <FilterChip label="كل المحاور" active={axisF === "all"} onClick={() => setAxisF("all")} />
              {AXES.map((a) => (
                <FilterChip key={a.key} label={a.label} active={axisF === a.key} onClick={() => setAxisF(a.key)} />
              ))}
            </div>
            <span className="mr-auto text-xs text-muted-foreground">المعروض: <En>{bankItems.length}</En> من <En>{bankAll.length}</En></span>
          </div>
          <p className="text-[12px] text-muted-foreground">
            هذا هو البنك الفعلي المستخدَم في الاختبار (النموذج أ ٣٥ + النموذج ب ١٠٠ = ١٣٥ بندًا). يُنتقى منه ٣٥ بندًا عشوائيًا لكل طالب مع توازن المحاور وعدم التكرار المتتالي.
          </p>
          <div className="grid gap-3 lg:grid-cols-2">
            {bankItems.map((q) => <Card key={q.id} q={q} editable={false} />)}
          </div>
        </>
      )}

      {showAdd && <AddForm onAdd={add} onClose={() => setShowAdd(false)} busy={busy} />}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={cn("rounded-full border px-3 h-7 text-xs font-semibold transition", active ? "bg-brand text-white border-brand" : "hover:bg-accent")}>
      {label}
    </button>
  );
}
