import { MATRIX_ROLES, ALL_CAPS, CAP_LABEL, ROLE_LABEL, can } from "@/lib/perms";
import { ShieldCheck, Check, Minus } from "lucide-react";

export function PermissionsMatrix() {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="h-[18px] w-[18px] text-brand" />
        <h2 className="font-display font-bold">مصفوفة الصلاحيات</h2>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        الصلاحيات متدرّجة: المعلم أساس، ومشرف النشاط يرث صلاحيات المعلم ويزيد، والمنسّق يزيد عليها، ومدير المدرسة يملكها كاملة.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground">
              <th className="border-b p-2.5 text-right font-semibold sticky right-0 bg-card">الصلاحية</th>
              {MATRIX_ROLES.map((r) => (
                <th key={r} className="border-b p-2.5 text-center font-semibold">{ROLE_LABEL[r]}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALL_CAPS.map((cap) => (
              <tr key={cap} className="hover:bg-accent/30">
                <td className="border-b p-2.5 font-medium sticky right-0 bg-card">{CAP_LABEL[cap]}</td>
                {MATRIX_ROLES.map((r) => (
                  <td key={r} className="border-b p-2.5 text-center">
                    {can(r, cap)
                      ? <Check className="mx-auto h-4 w-4 text-success" />
                      : <Minus className="mx-auto h-4 w-4 text-muted-foreground/40" />}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
