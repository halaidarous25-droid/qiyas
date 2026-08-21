import { cn } from "@/lib/utils";
import { badgeTone, barTone, type Tone } from "@/lib/tone";
import { Star } from "lucide-react";

// تقييم على شكل ٥ نجوم متلاصقة تمتلئ ذهبيًا حسب النسبة (0..100)
export function MatchStars({ value, size = 20, className }:
  { value: number; size?: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const row = () => (
    <span className="flex">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} width={size} height={size} fill="currentColor" stroke="none" />
      ))}
    </span>
  );
  return (
    <span dir="ltr" className={cn("relative inline-flex leading-none align-middle", className)} title={`المواءمة ${pct}%`}>
      <span className="flex text-slate-300 dark:text-slate-600">{row()}</span>
      <span className="absolute inset-0 overflow-hidden text-gold" style={{ width: `${pct}%` }}>{row()}</span>
    </span>
  );
}

export function Pill({ tone = "muted", children, className }:
  { tone?: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
      badgeTone[tone], className
    )}>{children}</span>
  );
}

// شريط تقدّم رفيع بلون دلالي
export function Meter({ value, tone = "brand", className }:
  { value: number; tone?: Tone; className?: string }) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div className={cn("h-full rounded-full transition-all", barTone[tone])}
           style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function Avatar({ name, color, size = 40 }:
  { name: string; color: string; size?: number }) {
  const initials = name.split(" ").slice(0, 2).map((w) => w[0]).join("");
  return (
    <div className="flex items-center justify-center rounded-full font-bold text-white shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}>
      {initials}
    </div>
  );
}

// رقم يُعرض LTR داخل نص عربي
export function En({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("en", className)}>{children}</span>;
}
