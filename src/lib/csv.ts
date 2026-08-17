// محلّل CSV بسيط يدعم الفواصل (، ؛ tab) وعناوين عربية/إنجليزية

export interface CsvStudentRow { name: string; grade: string; className: string; nationalId?: string; email?: string; phone?: string }

function detectDelimiter(headerLine: string): string {
  const counts: Record<string, number> = {
    ",": (headerLine.match(/,/g) || []).length,
    ";": (headerLine.match(/;/g) || []).length,
    "\t": (headerLine.match(/\t/g) || []).length,
  };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function splitLine(line: string, delim: string): string[] {
  const out: string[] = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === delim && !inQ) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function findCol(header: string[], keys: string[]): number {
  const norm = (s: string) => s.replace(/["'\s]/g, "").toLowerCase();
  const H = header.map(norm);
  for (const k of keys) {
    const i = H.indexOf(norm(k));
    if (i >= 0) return i;
  }
  return -1;
}

// يحوّل نص CSV إلى صفوف طلاب. يفترض وجود صف عناوين.
export function parseStudentsCsv(text: string): { rows: CsvStudentRow[]; skipped: number } {
  const clean = text.replace(/^﻿/, ""); // إزالة BOM
  const lines = clean.split(/\r?\n/).filter((l) => l.trim().length);
  if (lines.length < 2) return { rows: [], skipped: 0 };

  const delim = detectDelimiter(lines[0]);
  const header = splitLine(lines[0], delim);
  const iName = findCol(header, ["name", "الاسم", "اسم", "الطالب", "اسم الطالب"]);
  const iGrade = findCol(header, ["grade", "الصف", "المرحلة", "الصف الدراسي"]);
  const iClass = findCol(header, ["class", "className", "الفصل", "الشعبة", "القسم"]);
  const iNat = findCol(header, ["nationalId", "الهوية", "رقم الهوية", "الهويةالوطنية", "id"]);
  const iEmail = findCol(header, ["email", "البريد", "البريدالإلكتروني", "الايميل"]);
  const iPhone = findCol(header, ["phone", "mobile", "الجوال", "رقم الجوال", "الهاتف", "الجوّال"]);

  const rows: CsvStudentRow[] = [];
  let skipped = 0;
  for (const line of lines.slice(1)) {
    const c = splitLine(line, delim);
    const name = (iName >= 0 ? c[iName] : c[0]) || "";
    if (name.trim().length < 2) { skipped++; continue; }
    rows.push({
      name: name.trim(),
      grade: (iGrade >= 0 ? c[iGrade] : "") || "",
      className: (iClass >= 0 ? c[iClass] : "") || "",
      nationalId: (iNat >= 0 ? c[iNat] : "") || "",
      email: (iEmail >= 0 ? c[iEmail] : "") || "",
      phone: (iPhone >= 0 ? c[iPhone] : "") || "",
    });
  }
  return { rows, skipped };
}

// قالب CSV للتنزيل
export const STUDENTS_CSV_TEMPLATE =
  "الاسم,الصف,الفصل,رقم الهوية,البريد الإلكتروني,رقم الجوال\n" +
  "محمد أحمد الغامدي,الأول الثانوي,أول ثانوي/١,1012345678,m@example.com,0501234567\n" +
  "سارة خالد المطيري,الثاني الثانوي,ثاني ثانوي/٢,1087654321,,\n";
