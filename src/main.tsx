import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// تحميل الخطوط العربية وقت التشغيل (لتفادي محاولة أداة الحزم تضمين رابط خارجي)
;(() => {
  const add = (href: string, attrs: Record<string, string> = {}) => {
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href;
    Object.entries(attrs).forEach(([k, v]) => l.setAttribute(k, v));
    document.head.appendChild(l);
  };
  add('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Tajawal:wght@400;500;700;800&display=swap');
})();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
