import { createClient } from "@supabase/supabase-js";

// مشروع SLIS على Supabase — المفتاح العام آمن للاستخدام في الواجهة
const SUPABASE_URL = "https://tnemecignrwbgaydfmnx.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_l_L3BTe1wxiC8FUU-Z_N6w_YDhTcNWu";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
