import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabase";

export type LiveRole = "central" | "supervisor" | "student";

export interface Identity {
  role: LiveRole;
  memberRole: string | null;   // الدور التفصيلي داخل المدرسة (principal/coordinator/activity_supervisor/teacher)
  schoolId: string | null;
  studentId: string | null;
  userId: string;
  avatarUrl: string | null;
  name: string;
  mustChange: boolean;         // تغيير كلمة المرور مطلوب عند أول دخول
}

const LOGIN_DOMAIN = "qiyas.local";
// يحوّل اسم المستخدم إلى بريد الدخول الاصطناعي (الدخول باسم المستخدم لا بالبريد)
export function usernameToEmail(login: string): string {
  const v = login.trim();
  return v.includes("@") ? v : `${v.toLowerCase().replace(/[^a-z0-9_.-]/g, "")}@${LOGIN_DOMAIN}`;
}

interface AuthState {
  ready: boolean;
  demo: boolean;
  identity: Identity | null;
  email: string | null;
  signIn: (login: string, password: string) => Promise<string | null>; // login = اسم المستخدم أو بريد؛ يُرجع رسالة خطأ أو null
  signOut: () => Promise<void>;
  enterDemo: () => void;
  clearMustChange: () => void;   // بعد تغيير كلمة المرور في أول دخول
}

const Ctx = createContext<AuthState | null>(null);
export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
};

async function resolveIdentity(userId: string): Promise<Identity | null> {
  // مركزي؟
  const { data: prof } = await supabase.from("profiles").select("full_name,is_central_admin,avatar_url,must_change").eq("id", userId).maybeSingle();
  const av = prof?.avatar_url ?? null;
  const mustChange = !!prof?.must_change;
  if (prof?.is_central_admin) return { role: "central", memberRole: null, schoolId: null, studentId: null, userId, avatarUrl: av, name: prof.full_name || "مدير النظام المركزي", mustChange };
  // عضو مدرسة (مدير/منسّق/مشرف نشاط/معلم)؟
  const { data: mem } = await supabase.from("school_members").select("school_id,role").eq("user_id", userId).maybeSingle();
  if (mem) return { role: "supervisor", memberRole: mem.role, schoolId: mem.school_id, studentId: null, userId, avatarUrl: av, name: prof?.full_name || "عضو المدرسة", mustChange };
  // طالب؟
  const { data: st } = await supabase.from("students").select("id,school_id,name").eq("user_id", userId).maybeSingle();
  if (st) return { role: "student", memberRole: null, schoolId: st.school_id, studentId: st.id, userId, avatarUrl: av, name: st.name, mustChange };
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [demo, setDemo] = useState(false);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      if (data.session?.user) {
        setEmail(data.session.user.email || null);
        try { setIdentity(await resolveIdentity(data.session.user.id)); } catch { /* تجاهل */ }
      }
      setReady(true);
    }).catch(() => { if (mounted) setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (session?.user) {
        setEmail(session.user.email || null);
        setIdentity(await resolveIdentity(session.user.id));
      } else {
        setEmail(null); setIdentity(null);
      }
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  const signIn = async (login: string, pw: string) => {
    const em = usernameToEmail(login);
    let { data, error } = await supabase.auth.signInWithPassword({ email: em, password: pw });
    // احتياط: إن أُدخل الاسم مع «@» بالخطأ أو تعذّر، جرّب الصيغة الاصطناعية أيضًا
    if (error && !login.includes("@")) {
      const alt = `${login.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, "")}@qiyas.local`;
      if (alt !== em) { const r = await supabase.auth.signInWithPassword({ email: alt, password: pw }); data = r.data; error = r.error; }
    }
    if (error) {
      const m = (error.message || "").toLowerCase();
      if (m.includes("invalid")) return "اسم المستخدم أو كلمة المرور غير صحيحة";
      if (m.includes("not confirmed")) return "الحساب غير مُفعّل — تواصل مع مدير النظام";
      if (m.includes("disabled")) return "تسجيل الدخول معطّل مؤقتًا — تواصل مع الدعم";
      return `تعذّر الدخول: ${error.message}`;
    }
    if (data.user) {
      const id = await resolveIdentity(data.user.id);
      if (!id) return "تم تسجيل الدخول لكن لا يوجد دور مرتبط بهذا الحساب.";
      setIdentity(id); setEmail(data.user.email || null); setDemo(false);
    }
    return null;
  };

  const signOut = async () => { await supabase.auth.signOut(); setIdentity(null); setEmail(null); setDemo(false); };
  const enterDemo = () => setDemo(true);
  const clearMustChange = () => setIdentity((p) => p ? { ...p, mustChange: false } : p);

  return (
    <Ctx.Provider value={{ ready, demo, identity, email, signIn, signOut, enterDemo, clearMustChange }}>
      {children}
    </Ctx.Provider>
  );
}
