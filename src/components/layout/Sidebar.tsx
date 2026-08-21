import { cn } from "@/lib/utils";
import { En } from "@/components/common";
import { useSlis } from "@/store";
import {
  LayoutDashboard, Target, Users, BarChart3, Wallet,
  ShieldCheck, Settings, Gauge, Sparkles, Building2, Bell,
} from "lucide-react";

export type PageKey =
  | "dashboard" | "updates" | "missions" | "students" | "school" | "questions" | "reports"
  | "quota" | "governance" | "settings" | "profile";

const NAV: { key: PageKey; label: string; icon: any; soon?: boolean }[] = [
  { key: "dashboard", label: "لوحة المدرسة", icon: LayoutDashboard },
  { key: "updates", label: "آخر المستجدات", icon: Bell },
  { key: "missions", label: "المهام القيادية", icon: Target },
  { key: "students", label: "الطلاب والملفات", icon: Users },
  { key: "school", label: "إدارة المدرسة", icon: Building2 },
  { key: "reports", label: "التقارير والتحليل", icon: BarChart3 },
  { key: "quota", label: "حصص الاختبارات", icon: Wallet },
  { key: "governance", label: "الحوكمة والتظلّمات", icon: ShieldCheck },
  { key: "settings", label: "الإعدادات", icon: Settings },
];

export function Sidebar({ page, onNavigate, notifCount = 0 }:
  { page: PageKey; onNavigate: (p: PageKey) => void; notifCount?: number }) {
  const { mode, hybrid, can } = useSlis();
  const nav = NAV.filter((item) => item.key === "updates" || can(item.key as any));
  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-l bg-card">
      <div className="flex items-center gap-3 px-5 h-16 border-b">
        <div className="grid place-items-center h-10 w-10 rounded-xl bg-brand text-white shadow-sm">
          <Gauge className="h-5 w-5" />
        </div>
        <div className="leading-tight">
          <div className="font-display font-extrabold text-brand text-[15px]">مؤشر</div>
          <div className="text-[11px] text-muted-foreground">لقياس المهارات الطلابية</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {nav.map((item) => {
          const active = page === item.key;
          return (
            <button key={item.key} onClick={() => !item.soon && onNavigate(item.key)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors text-right",
                active ? "bg-brand text-white shadow-sm"
                       : "text-foreground/75 hover:bg-accent hover:text-foreground",
                item.soon && "opacity-55 cursor-default hover:bg-transparent"
              )}>
              <item.icon className={cn("h-[18px] w-[18px]", active ? "text-white" : "text-brand-soft")} />
              <span className="flex-1">{item.label}</span>
              {item.key === "updates" && notifCount > 0 && (
                <span className={cn("grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-bold",
                  active ? "bg-white text-brand" : "bg-danger text-white")}><En>{notifCount}</En></span>
              )}
              {item.soon && <span className="text-[10px] rounded bg-muted px-1.5 py-0.5 text-muted-foreground">قريبًا</span>}
            </button>
          );
        })}
      </nav>

      <div className="m-3 rounded-xl border bg-gradient-to-tl from-brand/8 to-gold/8 p-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-brand">
          <Sparkles className="h-4 w-4" /> وضع التشغيل الحالي
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground leading-5">
          {hybrid ? "هجين — يُحدَّد الوضع لكل مهمة عند إنشائها."
            : mode === "A" ? "الوضع (أ) — الإعلان أولًا ويتقدّم الطالب."
            : "الوضع (ب) — القياس أولًا والتوزيع التلقائي."}
          {" "}يمكن تغييره من الإعدادات.
        </p>
        <div className="mt-2 text-[11px] text-muted-foreground">
          الإصدار <En>v1.3</En> · نموذج أولي
        </div>
      </div>
    </aside>
  );
}
