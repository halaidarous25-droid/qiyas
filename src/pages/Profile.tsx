import { useRef, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useSlis } from "@/store";
import { Avatar } from "@/components/common";
import { updateOwnProfile, changeOwnPassword, updateStudentName } from "@/lib/api";
import { ROLE_LABEL, type Role } from "@/lib/perms";
import { User, Camera, Lock, Save, Loader2, ShieldCheck } from "lucide-react";

const inputCls = "w-full rounded-lg border bg-background px-3 h-11 text-sm outline-none focus:border-brand";

export function Profile() {
  const { identity } = useAuth();
  const { toast, live } = useSlis();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(identity?.name || "");
  const [avatar, setAvatar] = useState<string | null>(identity?.avatarUrl || null);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  const roleAr = identity?.role === "central" ? "مدير النظام المركزي"
    : identity?.role === "student" ? "طالب"
    : ROLE_LABEL[(identity?.memberRole as Role) || "teacher"];

  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 400_000) { toast("الصورة كبيرة — اختر صورة أصغر من ٤٠٠ كيلوبايت", "danger"); return; }
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(f);
  };

  const saveInfo = async () => {
    if (!identity) return;
    if (!live) { toast("التعديل متاح عند الدخول بحساب حقيقي", "info"); return; }
    setBusy(true);
    try {
      await updateOwnProfile(identity.userId, { full_name: name.trim(), avatar_url: avatar ?? undefined });
      if (identity.studentId) await updateStudentName(identity.studentId, name.trim());
      toast("حُفظت بياناتك — قد تحتاج إعادة تحميل الصفحة لتحديث الاسم أعلى الشاشة");
    } catch (e: any) { toast(`تعذّر الحفظ: ${e.message || e}`, "danger"); }
    finally { setBusy(false); }
  };

  const savePassword = async () => {
    if (!live) { toast("تغيير كلمة المرور متاح عند الدخول بحساب حقيقي", "info"); return; }
    if (pw.length < 6) { toast("كلمة المرور ٦ أحرف فأكثر", "danger"); return; }
    if (pw !== pw2) { toast("كلمتا المرور غير متطابقتين", "danger"); return; }
    setBusy(true);
    try { await changeOwnPassword(pw); setPw(""); setPw2(""); toast("تم تغيير كلمة المرور"); }
    catch (e: any) { toast(`تعذّر التغيير: ${e.message || e}`, "danger"); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold">ملفي الشخصي</h1>
        <p className="text-sm text-muted-foreground">حدّث بياناتك وصورتك وكلمة مرورك.</p>
      </div>

      {/* البطاقة الرئيسية */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            {avatar
              ? <img src={avatar} alt="" className="h-20 w-20 rounded-full object-cover border" />
              : <Avatar name={identity?.name || "?"} color="#0f5c66" size={80} />}
            <button onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -left-1 grid h-8 w-8 place-items-center rounded-full bg-brand text-white shadow hover:bg-brand/90">
              <Camera className="h-4 w-4" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
          </div>
          <div className="flex-1">
            <div className="font-display text-lg font-extrabold">{identity?.name}</div>
            <div className="mt-0.5 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-brand" /> {roleAr}
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <label className="block text-sm font-semibold mb-1">الاسم</label>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <button onClick={saveInfo} disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-brand px-5 h-11 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} حفظ البيانات
          </button>
        </div>
      </div>

      {/* تغيير كلمة المرور */}
      <div className="rounded-2xl border bg-card p-5">
        <div className="mb-3 flex items-center gap-2"><Lock className="h-[18px] w-[18px] text-brand" />
          <h2 className="font-display font-bold">تغيير كلمة المرور</h2></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input type="password" dir="ltr" placeholder="كلمة المرور الجديدة" className={inputCls} value={pw} onChange={(e) => setPw(e.target.value)} />
          <input type="password" dir="ltr" placeholder="تأكيد كلمة المرور" className={inputCls} value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </div>
        <button onClick={savePassword} disabled={busy || !pw}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border px-5 h-11 text-sm font-semibold hover:bg-accent disabled:opacity-50">
          <Lock className="h-4 w-4" /> تحديث كلمة المرور
        </button>
      </div>
    </div>
  );
}
