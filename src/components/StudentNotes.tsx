import { useState, useEffect } from "react";
import { useSlis } from "@/store";
import { cn } from "@/lib/utils";
import { NotebookPen, Save, Check } from "lucide-react";

// خانة تقييم وملاحظات المشرف/المدرسة عن الطالب — مرجع دائم يُحفظ في قاعدة البيانات
export function StudentNotes({ studentId, value, title = "تقييم وملاحظات المدرسة", className }:
  { studentId: string; value?: string; title?: string; className?: string }) {
  const { saveStudentNotes } = useSlis();
  const [text, setText] = useState(value || "");
  const [done, setDone] = useState(false);

  // مزامنة عند تبدّل الطالب أو تحديث القيمة من الخادم
  useEffect(() => { setText(value || ""); setDone(false); }, [studentId, value]);

  const dirty = (text || "") !== (value || "");
  const save = () => { saveStudentNotes(studentId, text.trim()); setDone(true); };

  return (
    <div className={cn("rounded-xl border bg-card p-4", className)}>
      <div className="mb-2 flex items-center gap-2">
        <NotebookPen className="h-[18px] w-[18px] text-brand" />
        <h3 className="font-display font-bold">{title}</h3>
        <span className="mr-auto text-[11px] text-muted-foreground">مرجع دائم للطالب</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setDone(false); }}
        rows={4}
        placeholder="اكتب تقييمك وملاحظاتك عن الطالب (نقاط القوة، السلوك، التوصيات…) — تُحفظ وتظهر كمرجع في ملف الطالب وفي المهام."
        className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-brand"
      />
      <div className="mt-2 flex items-center gap-2">
        <button onClick={save} disabled={!dirty}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 h-9 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
          <Save className="h-4 w-4" /> حفظ الملاحظات
        </button>
        {done && !dirty && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-success"><Check className="h-3.5 w-3.5" /> تم الحفظ</span>
        )}
      </div>
    </div>
  );
}
