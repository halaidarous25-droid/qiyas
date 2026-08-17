import { Gauge, School } from "lucide-react";

// ترويسة ثابتة موحّدة: اسم النظام + اسم المدرسة + مركز التدريب والتطوير
export function BrandBanner({ schoolName }: { schoolName?: string }) {
  return (
    <div className="w-full border-b bg-gradient-to-l from-brand to-brand-soft text-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/15"><Gauge className="h-5 w-5" /></div>
          <div className="leading-tight">
            <div className="font-display text-[13px] font-extrabold">نظام مؤشر لقياس المهارات الطلابية</div>
            <div className="text-[10px] text-white/80">مركز التدريب والتطوير</div>
          </div>
        </div>
        {schoolName && (
          <div className="mr-auto inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[12px] font-semibold">
            <School className="h-3.5 w-3.5" /> {schoolName}
          </div>
        )}
      </div>
    </div>
  );
}
