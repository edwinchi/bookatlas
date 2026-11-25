import type { ClassReport } from '../ebook/ebookApi';

/**
 * Teacher reports (Reading Intelligence phase 5, owner request 2026-11-25): the class report as a table, a CSV
 * file and a PDF. Pure helpers, tested in classReport.test.ts.
 */
const shortDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};
export const weekLabel = (start: string) => `Week of ${shortDate(start)}`;

/** The report as columns and rows: member, each book's progress, each quiz score, minutes per week, total. */
export function reportTable(r: ClassReport) {
  const head = [
    'Member',
    ...r.books.map((b) => `${b.title} (%)`),
    ...r.quizzes.map((q) => `Quiz: ${q.chapterTitle} (%)`),
    ...r.weeks.map((w) => `${weekLabel(w)} (min)`),
    'Total (min)', 'Books finished', 'Last read',
  ];
  const rows = r.rows.map((m) => [
    m.name,
    ...r.books.map((b) => String(m.books[b.id] ?? 0)),
    ...r.quizzes.map((q) => (typeof m.quizzes[q.id] === 'number' ? String(m.quizzes[q.id]) : '')),
    ...m.weekly.map(String),
    String(m.weekly.reduce((a, b) => a + b, 0)),
    String(m.finished),
    m.lastRead ? m.lastRead.slice(0, 10) : '',
  ]);
  return { head, rows };
}

/** A CSV cell: quoted when needed, and never read as a formula by a spreadsheet. */
const cell = (v: string) => {
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  return /[",\n\r;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};
export function reportCsv(r: ClassReport) {
  const { head, rows } = reportTable(r);
  return `﻿${[head, ...rows].map((line) => line.map(cell).join(',')).join('\r\n')}\r\n`;
}

export const reportFileName = (r: ClassReport, ext: 'csv' | 'pdf') =>
  `${r.name.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'class'}-report-${r.generatedAt.slice(0, 10)}.${ext}`;

/** A PDF of the report (landscape A4), built in the browser. */
export async function reportPdf(r: ClassReport) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 36;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text(r.name, M, M + 4);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100);
  const t = r.totals;
  doc.text(`${r.kind === 'team' ? 'Team' : 'Class'} report · ${r.teacher} · ${shortDate(r.generatedAt)} · ${r.rows.length} members${t ? ` · average progress ${t.averageProgress}%${t.quizAverage !== null ? ` · quiz average ${t.quizAverage}%` : ''}` : ''}`, M, M + 20);
  doc.text('BooksAtlas · Read smarter → Schools and teams', M, H - 18);
  const { head, rows } = reportTable(r);
  // The member column is wider; the others share the rest of the page.
  const first = 130;
  const w = Math.max(34, (W - 2 * M - first) / Math.max(1, head.length - 1));
  const cols = Math.min(head.length, 1 + Math.floor((W - 2 * M - first) / w));
  const chunks: number[][] = [];
  for (let i = 1; i < head.length; i += cols - 1) chunks.push([0, ...Array.from({ length: Math.min(cols - 1, head.length - i) }, (_, k) => i + k)]);
  let y = M + 40;
  const line = 16;
  for (const [ci, idx] of chunks.entries()) {
    if (ci > 0) { doc.addPage(); y = M + 10; }
    const x = (k: number) => (k === 0 ? M : M + first + (k - 1) * w);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(60);
    const headH = 30;
    idx.forEach((c, k) => doc.text(doc.splitTextToSize(head[c]!, (k === 0 ? first : w) - 4).slice(0, 3), x(k), y));
    y += headH;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(20);
    for (const [ri, row] of rows.entries()) {
      if (y > H - 40) { doc.addPage(); y = M + 10; }
      if (ri % 2 === 0) { doc.setFillColor(244, 246, 250); doc.rect(M - 4, y - 11, W - 2 * M + 8, line, 'F'); }
      idx.forEach((c, k) => doc.text(doc.splitTextToSize(row[c] ?? '', (k === 0 ? first : w) - 4)[0] ?? '', x(k), y));
      y += line;
    }
  }
  return doc.output('blob') as Blob;
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
