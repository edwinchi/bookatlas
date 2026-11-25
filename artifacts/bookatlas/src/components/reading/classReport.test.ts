import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reportCsv, reportFileName, reportTable, weekLabel } from './classReport';
import type { ClassReport } from '../ebook/ebookApi';

const report: ClassReport = {
  id: 'c1', name: 'Year 5, "Readers"', kind: 'class', teacher: 'Ama M.', generatedAt: '2026-11-25T12:00:00Z',
  books: [{ id: 'b1', title: 'Book A' }], due: {}, quizzes: [{ id: 'q1', bookId: 'b1', chapterTitle: 'River', due: null }],
  weeks: ['2026-11-16', '2026-11-23'],
  rows: [
    { userId: 'u1', name: 'Kofi B.', joinedAt: '', books: { b1: 50 }, finished: 0, average: 50, weekMinutes: 10, lastRead: '2026-11-24T08:00:00Z', quizzes: { q1: 80 }, weekly: [30, 10] },
    { userId: 'u2', name: '=cmd()', joinedAt: '', books: {}, finished: 0, average: 0, weekMinutes: 0, lastRead: null, quizzes: { q1: null }, weekly: [0, 0] },
  ],
  totals: { members: 2, weekMinutes: 10, averageProgress: 25, activeThisWeek: 1, quizAverage: 80 },
};

test('teacher report: table, CSV and file name', () => {
  assert.equal(weekLabel('2026-11-23'), 'Week of 23 Nov');
  const { head, rows } = reportTable(report);
  assert.deepEqual(head, ['Member', 'Book A (%)', 'Quiz: River (%)', 'Week of 16 Nov (min)', 'Week of 23 Nov (min)', 'Total (min)', 'Books finished', 'Last read']);
  assert.deepEqual(rows[0], ['Kofi B.', '50', '80', '30', '10', '40', '0', '2026-11-24']);
  assert.deepEqual(rows[1]!.slice(1, 3), ['0', '']);
  const csv = reportCsv(report);
  assert.ok(csv.startsWith('﻿Member,'));
  assert.match(csv, /\r\n'=cmd\(\),0,,0,0,0,0,\r\n$/, 'a name starting with = is not read as a formula');
  assert.equal(reportFileName(report, 'csv'), 'Year-5-Readers-report-2026-11-25.csv');
});

test('teacher report: the PDF is made', async () => {
  const { reportPdf } = await import('./classReport');
  const many = { ...report, weeks: Array.from({ length: 26 }, (_, i) => `2026-${String(1 + Math.floor(i / 4)).padStart(2, '0')}-0${1 + (i % 4)}`), rows: report.rows.map((r) => ({ ...r, weekly: new Array(26).fill(5) })) };
  for (const r of [report, many]) {
    const blob = await reportPdf(r);
    const head = Buffer.from(await blob.arrayBuffer()).subarray(0, 5).toString();
    assert.equal(head, '%PDF-');
  }
});
