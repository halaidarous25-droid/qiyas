import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabase";

export type LiveRole = "central" | "supervisor" | "student";

export interface Identity {
  role: LiveRole;
  schoolId: string | null;
  studentId: string | null;
  name: string;
}

interface AuthState {
  ready: boolean;
  demo: boolean;
  identity: Identity | null;
  email: string | null;
  signIn: (email: string, password: string) => Promise<string | null>; // يُرجع رسالة خطأ أو null
  signOut: () => Promise<void>;
  enterDemo: () => void;
}

const Ctx = createContext<AuthState | null>(null);
export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth outside provider");
  return c;
};

async function resolveIdentity(userId: string): Promise<Identity | null> {
  // مركزي؟
  const { data: prof } = await supabase.from("profiles").select("full_name,is_central_admin").eq("id", userId).maybeSingle();
  if (prof?.is_central_admin) return { role: "central", schoolId: null, studentId: null, name: prof.full_name || "مدير النظام المركزي" };
  // عضو مدرسة (مشرف/مدير)؟
  const { data: mem } = await supabase.from("school_members").select("school_id,role").eq("user_id", userId).maybeSingle();
  if (mem) return { role: "supervisor", schoolId: mem.school_id, studentId: null, name: prof?.full_name || "المشرف" };
  // طالب؟
  const { data: st } = await supabase.from("students").select("id,school_id,name").eq("user_id", userId).maybeSingle();
  if (st) return { role: "student", schoolId: st.school_id, studentId: st.id, name: st.name };
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

  const signIn = async (em: string, pw: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: em, password: pw });
    if (error) return error.message;
    if (data.user) {
      const id = await resolveIdentity(data.user.id);
      if (!id) return "تم تسجيل الدخول لكن لا يوجد دور مرتبط بهذا الحساب.";
      setIdentity(id); setEmail(data.user.email || null); setDemo(false);
    }
    return null;
  };

  const signOut = async () => { await supabase.auth.signOut(); setIdentity(null); setEmail(null); setDemo(false); };
  const enterDemo = () => setDemo(true);

  return (
    <Ctx.Provider value={{ ready, demo, identity, email, signIn, signOut, enterDemo }}>
      {children}
    </Ctx.Provider>
  );
}
