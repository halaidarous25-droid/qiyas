# نشر منصة SLIS على Vercel — خطوات سريعة

هذا المجلد مشروع جاهز للنشر (Vite + React + Supabase). قاعدة البيانات مربوطة مسبقًا.

## الطريقة الأسهل (سطر أوامر Vercel)
1) ثبّت الأدوات (مرة واحدة):
   npm i -g vercel pnpm
2) من داخل هذا المجلد:
   pnpm install
   vercel            # سجّل الدخول لحسابك ثم اضغط Enter على كل سؤال
   vercel --prod     # للنشر النهائي والحصول على رابط عام
سيظهر رابط مثل: https://slis-app-xxxx.vercel.app

## بيانات الدخول التجريبية
- المشرف: supervisor@slis.demo
- المركزي: central@slis.demo
- الطالب: student@slis.demo
- كلمة المرور للجميع: Slis12345!
وزر «استعراض تجريبي» يعمل دون تسجيل دخول.

## ملاحظات
- الإطار: Vite (يكتشفه Vercel تلقائيًا). أمر البناء: vite build، مجلد الإخراج: dist.
- مدير الحزم: pnpm (محدّد في package.json).
- قاعدة البيانات (Supabase) والمفتاح العام مضمّنان في src/lib/supabase.ts (المفتاح عام وآمن للواجهة).
