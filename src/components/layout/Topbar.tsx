import { useState, useRef, useEffect } from "react";
import { Avatar } from "@/components/common";
import { SCHOOL } from "@/data/mock";
import { cn } from "@/lib/utils";
import { Bell, Search, ChevronDown, LogOut } from "lucide-react";

export type Role = "supervisor" | "principal" | "student" | "central";
const ROLES: { key: Role; label: string }[] = [
  { key: "supervisor", label: "منسّق النظام (المشرف)" },
  { key: "principal", label: "مدير المدرسة" },
  { key: "student", label: "الطالب" },
  { key: "central", label: "مدير النظام المركزي" },
];

export function Topbar({ role, onRole, crumb, locked, onSignOut, userName, avatarUrl, onProfile }:
  { role: Role; onRole: (r: Role) => void; crumb: string;
    locked?: boolean; onSignOut?: () => void; userName?: string; avatarUrl?: string | null; onProfile?: () => void }) {
  const current = ROLES.find((r) => r.key === role)!;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card/85 px-4 backdrop-blur md:px-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{SCHOOL.name}</span>
        <span className="text-border">/</span>
        <span>{crumb}</span>
      </div>

      <div className="mr-auto flex items-center gap-2">
        <div className="hidden lg:flex items-center gap-2 rounded-lg border bg-background px-3 h-9 text-sm text-muted-foreground w-56">
          <Search className="h-4 w-4" />
          <input placeholder="بحث عن طالب أو مهمة…" className="bg-transparent outline-none flex-1 text-foreground placeholder:text-muted-foreground" />
        </div>

        <button className="relative grid h-9 w-9 place-items-center rounded-lg border bg-background hover:bg-accent">
          <Bell className="h-[18px] w-[18px]" />
          <span className="absolute -top-1 -left-1 grid h-4 w-4 place-items-center rounded-full bg-danger text-[10px] text-white">4</span>
        </button>

        {locked ? (
          <div className="flex items-center gap-2">
            <button onClick={onProfile} title="ملفي الشخصي"
              className="flex items-center gap-2 rounded-lg border bg-background px-2 h-9 hover:bg-accent">
              {avatarUrl
                ? <img src={avatarUrl} alt="" className="h-[26px] w-[26px] rounded-full object-cover" />
                : <Avatar name={userName || current.label} color="#0f5c66" size={26} />}
              <div className="hidden sm:block text-right leading-tight">
                <div className="text-xs font-semibold">{userName || current.label}</div>
                <div className="text-[10px] text-success">عرض الملف الشخصي</div>
              </div>
            </button>
            <button onClick={onSignOut} title="تسجيل الخروج"
              className="grid h-9 w-9 place-items-center rounded-lg border bg-background hover:bg-accent">
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        ) : (
        <div className="relative" ref={ref}>
          <button onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg border bg-background px-2 h-9 hover:bg-accent">
            <Avatar name={current.label} color="#0f5c66" size={26} />
            <div className="hidden sm:block text-right leading-tight">
              <div className="text-xs font-semibold">{current.label}</div>
              <div className="text-[10px] text-muted-foreground">تبديل الدور (عرض)</div>
            </div>
            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
          </button>

          {open && (
            <div className="absolute left-0 top-11 z-30 w-56 overflow-hidden rounded-lg border bg-popover shadow-lg">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground">عرض المنصة بدور</div>
              <div className="border-t" />
              {ROLES.map((r) => (
                <button key={r.key}
                  onClick={() => { onRole(r.key); setOpen(false); }}
                  className={cn("block w-full px-3 py-2 text-right text-sm hover:bg-accent",
                    r.key === role && "bg-accent font-semibold")}>
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>
        )}
      </div>
    </header>
  );
}
