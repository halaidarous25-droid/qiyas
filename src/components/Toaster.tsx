import { useSlis } from "@/store";
import { cn } from "@/lib/utils";
import { CheckCircle2, Info, XCircle, X } from "lucide-react";

const ICON = { success: CheckCircle2, info: Info, danger: XCircle };
const TONE = {
  success: "border-success/40 bg-success/10 text-success",
  info: "border-info/40 bg-info/10 text-info",
  danger: "border-danger/40 bg-danger/10 text-danger",
};

export function Toaster() {
  const { toasts, dismissToast } = useSlis();
  return (
    <div className="fixed bottom-4 left-1/2 z-[100] flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => {
        const Icon = ICON[t.tone];
        return (
          <div key={t.id}
            className={cn("flex items-center gap-2.5 rounded-xl border bg-card px-4 py-3 shadow-lg animate-in fade-in slide-in-from-bottom-2", TONE[t.tone])}>
            <Icon className="h-5 w-5 shrink-0" />
            <span className="text-sm font-semibold text-foreground">{t.text}</span>
            <button onClick={() => dismissToast(t.id)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
