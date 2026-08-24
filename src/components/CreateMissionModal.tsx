import { useState } from "react";
import { useSlis, currentHijriAcademicYear, academicYearOptions } from "@/store";
import { En } from "@/components/common";
import { cn } from "@/lib/utils";
import { AXES, type ScopeLevel, type AxisScores, type AxisKey, type Mission } from "@/data/mock";
import { X, Target, Plus, SlidersHorizontal } from "lucide-react";

const SCOPES: { k: ScopeLevel; l: string }[] = [
  { k: "school", l: "المدرسة" }, { k: "grade", l: "الصف الدراسي" }, { k: "class", l: "الفصل" },
];

const EVEN_W: AxisScores = { org: 20, lead: 20, comm: 20, firm: 20, init: 20 };

export function CreateMissionModal({ onClose, edit }: { onClose: () => void; edit?: Mission }) {
  const { addMission, updateMission, classes, mode, roles, missions } = useSlis();
  const isEdit = !!edit;
  const [title, setTitle] = useState(edit?.title ?? "");
  const [scopeType, setScopeType] = useState<ScopeLevel>(edit?.scopeType === "stage" ? "school" : (edit?.scopeType ?? "school"));
  const [scopeRef, setScopeRef] = useState(edit?.scopeRef ?? "");
  const [seats, setSeats] = useState(edit?.seats ?? 1);
  const [nominationMode, setNominationMode] = useState<"scope" | "preference">(edit?.nominationMode ?? "preference");
  const [academicYear, setAcademicYear] = useState(edit?.academicYear || currentHijriAcademicYear());
  const yearOptions = academicYearOptions(missions.map((m) => m.academicYear));
  const [showPriorities, setShowPriorities] = useState(false);
  const [weights, setWeights] = useState<AxisScores>(edit?.weights ? { ...edit.weights } : { ...EVEN_W });

  // الصفوف الدراسية المتاحة (من الفصول) وأسماء الفصول
  const gradeLevels = Array.from(new Set(classes.map((c) => c.grade).filter(Boolean)));

  // «عريف فصل» يجب أن يكون على مستوى فصل محدّد دائمًا
  const isHomeroom = title.trim() === "عريف فصل";

  const valid = title.trim().length >= 2 &&
    (isHomeroom ? (scopeType === "class" && !!scopeRef)
      : (scopeType === "school" || (scopeType === "grade" && !!scopeRef) || (scopeType === "class" && !!scopeRef)));

  // منع تكرار نفس المهمة في نفس النطاق — مع قاعدة السماح بإنشاء جديدة بعد ٣ أشهر
  const effRef = scopeType === "grade" || scopeType === "class" ? scopeRef : "";
  const matches = missions.filter((m) =>
    m.id !== edit?.id &&
    m.title.trim() === title.trim() &&
    m.scopeType === scopeType &&
    (m.scopeRef || "") === (effRef || ""));
  const THREE_MONTHS = 90 * 86400000;
  const recentMatch = matches.find((m) => {
    const t = Date.parse(m.createdAt);
    return isNaN(t) ? true : (Date.now() - t) < THREE_MONTHS; // تعذّر قراءة التاريخ = نمنع احتياطًا
  });
  const duplicate = title.trim().length >= 2 && !!recentMatch;          // يمنع الإنشاء
  const oldMatchOnly = title.trim().length >= 2 && !recentMatch && matches.length > 0; // مسموح مع تنبيه

  const wSum = AXES.reduce((s, a) => s + weights[a.key], 0);
  const normalize = (w: AxisScores): AxisScores => {
    const sum = AXES.reduce((s, a) => s + w[a.key], 0);
    if (sum <= 0) return { ...EVEN_W };
    const out = {} as AxisScores;
    AXES.forEach((a) => (out[a.key] = Math.round((w[a.key] / sum) * 100)));
    return out;
  };

  // اختيار مسمّى قيادي: يملأ العنوان ويستدعي أوزانه للمواءمة
  const onPickRole = (rid: string) => {
    const r = roles.find((x) => x.id === rid);
    if (!r) { setTitle(""); return; }
    setTitle(r.title);
    setWeights({ ...r.weights });
    // عريف فصل: ألزم النطاق بفصل محدّد
    if (r.title === "عريف فصل") { setScopeType("class"); setScopeRef(""); }
  };

  const submit = () => {
    if (!valid || duplicate) return;
    const base = {
      title: title.trim(), scopeType,
      scopeRef: scopeType === "grade" || scopeType === "class" ? scopeRef : "",
      seats, mode, weights: normalize(weights), nominationMode,
      academicYear: academicYear.trim(),
    };
    if (isEdit) updateMission(edit!.id, base);
    else addMission({ ...base, autoNominate: true }); // الوضع التلقائي: ترشيح وتقييم تلقائي بعد الإنشاء
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center overflow-auto bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand text-white"><Target className="h-5 w-5" /></div>
            <h2 className="font-display text-lg font-extrabold">{isEdit ? "تعديل المهمة" : "إنشاء مهمة قيادية"}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        {/* عنوان المهمة = مسمّى من قائمة المهام القيادية */}
        <label className="block text-sm font-semibold">عنوان المهمة</label>
        {roles.length > 0 ? (
          <select
            value={roles.find((r) => r.title === title)?.id ?? ""}
            onChange={(e) => onPickRole(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-background px-3 h-11 text-sm outline-none focus:border-brand">
            <option value="">اختر المسمّى القيادي…</option>
            {roles.filter((r) => r.active !== false).map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
        ) : (
          <div className="mt-1 rounded-lg border border-dashed bg-muted/30 px-3 py-2.5 text-[12px] text-muted-foreground">
            لا توجد مسمّيات قيادية بعد. أضِفها من «إدارة المدرسة ← المهام القيادية» لتظهر هنا.
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold">النطاق</label>
            <div className="mt-1 flex rounded-lg border p-0.5">
              {SCOPES.map((s) => {
                const locked = isHomeroom && s.k !== "class"; // عريف فصل: فصل محدّد فقط
                return (
                  <button key={s.k} disabled={locked} onClick={() => { if (locked) return; setScopeType(s.k); setScopeRef(""); }}
                    className={cn("flex-1 rounded-md py-1.5 text-[11px] font-semibold", scopeType === s.k ? "bg-brand text-white" : "text-muted-foreground", locked && "opacity-40 cursor-not-allowed")}>
                    {s.l}
                  </button>
                );
              })}
            </div>
            {isHomeroom && <p className="mt-1 text-[10px] text-muted-foreground">«عريف فصل» يكون على مستوى فصل محدّد فقط.</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold">عدد المقاعد</label>
            <input type="number" min={1} inputMode="numeric" value={seats}
              onChange={(e) => setSeats(Math.max(1, parseInt(e.target.value) || 1))}
              className="mt-1 w-full rounded-lg border bg-background px-3 h-11 text-sm outline-none focus:border-brand" dir="ltr" />
          </div>
        </div>

        {/* السنة الدراسية — قائمة منسدلة تضاف إليها السنة التالية تلقائيًا وتبقى السابقة للبحث */}
        <div className="mt-4">
          <label className="block text-sm font-semibold">السنة الدراسية</label>
          <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)}
            className="mt-1 w-full rounded-lg border bg-background px-3 h-11 text-sm outline-none focus:border-brand">
            {!yearOptions.includes(academicYear) && academicYear && <option value={academicYear}>{academicYear}</option>}
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <p className="mt-1 text-[11px] text-muted-foreground">تظهر بجانب اسم المهمة في كل الشاشات والتقارير. تُضاف السنة التالية تلقائيًا وتبقى السنوات السابقة للبحث والتصفية.</p>
        </div>

        {/* الصف الدراسي عند نطاق «الصف الدراسي» */}
        {scopeType === "grade" && (
          <div className="mt-4">
            <label className="block text-sm font-semibold">الصف الدراسي المستهدف</label>
            <select value={scopeRef} onChange={(e) => setScopeRef(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-background px-3 h-11 text-sm">
              <option value="">اختر الصف الدراسي…</option>
              {gradeLevels.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">يُفتح الترشيح لجميع طلاب هذا الصف الدراسي.</p>
          </div>
        )}

        {/* الفصل عند نطاق «الفصل» */}
        {scopeType === "class" && (
          <div className="mt-4">
            <label className="block text-sm font-semibold">الفصل المستهدف</label>
            <select value={scopeRef} onChange={(e) => setScopeRef(e.target.value)}
              className="mt-1 w-full rounded-lg border bg-background px-3 h-11 text-sm">
              <option value="">اختر الفصل…</option>
              {classes.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">يُفتح الترشيح فقط لطلاب هذا الفصل.</p>
          </div>
        )}

        {scopeType === "school" && (
          <p className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">النطاق: كامل المدرسة — الترشيح مفتوح لجميع طلاب المدرسة.</p>
        )}

        {/* آلية الترشيح: بالنطاق (الجميع) أو بالرغبة (من اختار المسمّى في الرابط) */}
        <div className="mt-4">
          <label className="block text-sm font-semibold">آلية الترشيح</label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setNominationMode("scope")}
              className={cn("rounded-lg border p-2.5 text-right text-[12px]", nominationMode === "scope" ? "border-brand bg-brand/5" : "hover:bg-accent")}>
              <div className="font-semibold">بالنطاق (تلقائي)</div>
              <div className="text-[11px] text-muted-foreground">يُرشَّح كل طلاب النطاق المؤهّلين.</div>
            </button>
            <button type="button" onClick={() => setNominationMode("preference")}
              className={cn("rounded-lg border p-2.5 text-right text-[12px]", nominationMode === "preference" ? "border-brand bg-brand/5" : "hover:bg-accent")}>
              <div className="font-semibold">بالرغبة</div>
              <div className="text-[11px] text-muted-foreground">يُرشَّح فقط من اختار هذا المسمّى في رابط الاختبار.</div>
            </button>
          </div>
        </div>

        {/* أولويات المهمة (أوزان المحاور) — تُملأ تلقائيًا من المسمّى وتُخصَّص عند الحاجة */}
        <div className="mt-4">
          <button onClick={() => setShowPriorities((v) => !v)}
            className="flex w-full items-center justify-between rounded-lg border px-3 h-10 text-sm font-semibold hover:bg-accent">
            <span className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-brand" /> أولويات المواءمة (أوزان المحاور)</span>
            <span className="text-xs text-muted-foreground">{showPriorities ? "إخفاء" : "تخصيص"}</span>
          </button>
          {showPriorities && (
            <div className="mt-2 rounded-lg border p-3 space-y-2">
              {AXES.map((a) => (
                <div key={a.key} className="grid grid-cols-[70px_1fr_36px] items-center gap-2">
                  <span className="text-xs text-foreground/80">{a.label}</span>
                  <input type="range" min={0} max={100} value={weights[a.key as AxisKey]}
                    onChange={(e) => setWeights((w) => ({ ...w, [a.key]: Number(e.target.value) }))}
                    className="accent-[hsl(191_72%_30%)]" />
                  <span className="text-left text-xs font-bold text-brand"><En>{Math.round((weights[a.key as AxisKey] / (wSum || 1)) * 100)}</En>%</span>
                </div>
              ))}
              <p className="text-[10px] text-muted-foreground">تُملأ تلقائيًا من المسمّى المختار، وتُحدِّد كيفية مواءمة الطلاب. تُطبَّع إلى ١٠٠٪.</p>
            </div>
          )}
        </div>

        {duplicate ? (
          <div className="mt-3 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[12px] text-danger">
            ⚠ توجد مهمة «{title.trim()}» في هذا النطاق ({scopeType === "school" ? "كامل المدرسة" : scopeRef}) أُنشئت بتاريخ <span className="font-mono" dir="ltr">{recentMatch?.createdAt}</span>. لا يمكن إنشاء مهمة جديدة إلا بعد ٣ أشهر من إنشائها — يُكتفى بالمهمة الحالية.
          </div>
        ) : oldMatchOnly ? (
          <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[12px] text-amber-800">
            ℹ توجد مهمة سابقة بنفس الاسم في هذا النطاق مضى على إنشائها أكثر من ٣ أشهر — يمكنك إنشاء مهمة جديدة الآن.
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-brand/25 bg-brand/5 px-3 py-2 text-[11px] text-brand">
            يعمل النظام تلقائيًا: يُرشّح الطلاب ضمن النطاق فور إنشاء المهمة حسب آلية الترشيح المختارة.
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <button onClick={submit} disabled={!valid || duplicate}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand h-11 text-sm font-semibold text-white disabled:opacity-40 hover:bg-brand/90">
            <Plus className="h-4 w-4" /> {isEdit ? "حفظ التعديلات" : "إنشاء المهمة"}
          </button>
          <button onClick={onClose} className="rounded-lg border px-5 h-11 text-sm font-semibold hover:bg-accent">إلغاء</button>
        </div>
      </div>
    </div>
  );
}
