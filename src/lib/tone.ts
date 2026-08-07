// خريطة النغمات الدلالية → أصناف Tailwind (شارات، خلفيات، نصوص)
export type Tone = "brand" | "gold" | "success" | "warning" | "danger" | "info" | "muted";

export const badgeTone: Record<Tone, string> = {
  brand:   "bg-brand/10 text-brand border-brand/25",
  gold:    "bg-gold/10 text-gold border-gold/30",
  success: "bg-success/10 text-success border-success/30",
  warning: "bg-warning/12 text-warning border-warning/30",
  danger:  "bg-danger/10 text-danger border-danger/30",
  info:    "bg-info/10 text-info border-info/25",
  muted:   "bg-muted text-muted-foreground border-border",
};

export const dotTone: Record<Tone, string> = {
  brand: "bg-brand", gold: "bg-gold", success: "bg-success",
  warning: "bg-warning", danger: "bg-danger", info: "bg-info", muted: "bg-muted-foreground",
};

export const barTone: Record<Tone, string> = {
  brand: "bg-brand", gold: "bg-gold", success: "bg-success",
  warning: "bg-warning", danger: "bg-danger", info: "bg-info", muted: "bg-muted-foreground",
};

export const textTone: Record<Tone, string> = {
  brand: "text-brand", gold: "text-gold", success: "text-success",
  warning: "text-warning", danger: "text-danger", info: "text-info", muted: "text-muted-foreground",
};

export function matchTone(pct: number): Tone {
  if (pct >= 85) return "success";
  if (pct >= 70) return "brand";
  if (pct >= 55) return "warning";
  return "danger";
}
