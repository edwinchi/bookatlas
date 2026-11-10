/**
 * Publication readiness package for Amazon KDP and Lulu (owner brief 2026-11-10: the "Revelation
 * Protocol" audit package as the guide). Built from the prepared EPUB, the preparation report and
 * the intake: score, major issues, chapter audit, upload checklists, metadata, description and
 * copyright page. Fact-checking cannot be automated; the audit counts the claims to verify.
 */
import type { Chapter } from '@workspace/bookatlas-catalog/types';
import { printCoverSpec, type SubmissionIntake } from '@workspace/bookatlas-catalog/publishing';
import type { PrepReport } from './engine.js';

export type Check = 'ok' | 'review' | 'fix' | 'manual' | 'n/a';
export interface ChapterAudit {
  title: string; words: number; paragraphs: number; images: number;
  editing: Check; formatting: Check; duplication: Check; factCheck: Check; imagesCheck: Check; ready: boolean;
  notes: string[];
}
export interface ChecklistItem { label: string; status: Check; detail: string }
export interface ReadinessPackage {
  score: number;
  verdict: 'Ready to publish' | 'Nearly ready' | 'Needs work';
  summary: string;
  issues: { severity: 'error' | 'warning'; text: string }[];
  corrections: string[];
  chapters: ChapterAudit[];
  kdpEbook: ChecklistItem[];
  kdpPrint: ChecklistItem[];
  lulu: ChecklistItem[];
  metadata: { title: string; subtitle?: string; author: string; contributors: string[]; series?: string; language: string; categories: string[]; keywords: string[]; isbn: { ebook?: string; print?: string } };
  description: string;
  copyright: string;
  markdown: string;
}

/** BookAtlas categories as the subject paths KDP and Lulu ask for (BISAC-style). Suggestions, not guarantees. */
const STORE_CATEGORIES: Record<string, string[]> = {
  'Spiritual Healing & Alignment': ['Body, Mind & Spirit > Healing > Energy', 'Body, Mind & Spirit > Spiritualism'],
  'Mind Mastery & Quantum Awakening': ['Body, Mind & Spirit > Mindfulness & Meditation', 'Body, Mind & Spirit > New Thought'],
  'Consciousness & Ancient Wisdom': ['Body, Mind & Spirit > Ancient Mysteries & Controversial Knowledge', 'Body, Mind & Spirit > Mysticism'],
  'Kemetic Science & Sacred Geometry': ['Body, Mind & Spirit > Sacred Sexuality', 'Body, Mind & Spirit > Ancient Mysteries & Controversial Knowledge'],
  'Metaphysics & Higher Dimensions': ['Body, Mind & Spirit > Metaphysics'],
  'Indigenous Spiritual Technologies': ['Body, Mind & Spirit > Shamanism', 'Religion > Indigenous, Folk & Tribal'],
  'Holistic Energy, Chakras & Kundalini': ['Body, Mind & Spirit > Healing > Energy', 'Health & Fitness > Alternative Therapies'],
  'African Literature & Classics': ['Fiction > African American & Black > General', 'Literary Collections > African'],
  'African Diaspora & Black Studies': ['Social Science > Ethnic Studies > African American & Black Studies'],
  'Afrofuturism & Speculative Fiction': ['Fiction > Science Fiction > General', 'Fiction > African American & Black > General'],
  'Pan-African History & Civilizations': ['History > Africa > General'],
  'African Philosophy & Indigenous Traditions': ['Philosophy > General', 'Religion > Indigenous, Folk & Tribal'],
  'Contemporary African Voices & Fiction': ['Fiction > Literary', 'Fiction > Cultural Heritage'],
  'Sci-Fi & Fantasy': ['Fiction > Science Fiction > General', 'Fiction > Fantasy > General'],
  'Fiction & Literature': ['Fiction > Literary'],
  'Mystery & Suspense': ['Fiction > Mystery & Detective > General'],
  'Historical Fiction': ['Fiction > Historical > General'],
  'Romance & Contemporary': ['Fiction > Romance > Contemporary'],
  'Thriller & Crime': ['Fiction > Thrillers > General'],
  'Non-Fiction & Essays': ['Literary Collections > Essays'],
  'Biography & Memoir': ['Biography & Autobiography > Personal Memoirs'],
  'Business & Leadership': ['Business & Economics > Leadership'],
  'Self-Improvement & Psychology': ['Self-Help > Personal Growth > General', 'Psychology > General'],
  'Dutch & European Classics': ['Fiction > Classics'],
  'Graphic Novels & Manga': ['Comics & Graphic Novels > General'],
  'Philosophy & Deep Thought': ['Philosophy > General'],
  'Poetry & Anthologies': ['Poetry > Anthologies (multiple authors)'],
  'Science & Technology': ['Science > General', 'Technology & Engineering > General'],
};

const PLACEHOLDER = /lorem ipsum|\bTODO\b|\bTBD\b|\[insert|\bxxx+\b|\?\?\?|\[citation needed\]|placeholder text/i;
/** "the The architect": a doubled word, usually left by find-and-replace. Some doubles are correct English. */
const REPEATED_WORD = /\b(?!(?:that|had|is|do|so|no|very|bye|ha|ho|la|na|well)\b)([a-z]{2,})\s+\1\b/i;
const FRONT_MATTER = /^(introduction|preface|foreword|prologue|epilogue|afterword|acknowledg|about the author|dedication|contents|copyright)/i;
const CLAIM = /\b(1[0-9]{3}|20[0-9]{2})\b|\d+(?:\.\d+)?\s?%|\b(according to|studies show|research shows|scientists|proven|statistics)\b/gi;

const wordsOf = (text: string) => text.split(/\s+/).filter(Boolean).length;

export function auditChapters(chapters: Chapter[]): ChapterAudit[] {
  // A long paragraph that appears more than once in the book is a duplication candidate.
  const seen = new Map<string, number>();
  for (const c of chapters) for (const p of c.content) if (p.length >= 120) seen.set(p, (seen.get(p) ?? 0) + 1);
  return chapters.map((c, index) => {
    const headings = new Set(c.headings ?? []);
    const paragraphs = c.content.filter((_, i) => !headings.has(i));
    const words = paragraphs.reduce((n, p) => n + wordsOf(p), 0);
    const notes: string[] = [];
    const placeholders = paragraphs.filter((p) => PLACEHOLDER.test(p)).length;
    const repeatExamples = paragraphs.flatMap((p) => {
      const m = REPEATED_WORD.exec(p);
      return m ? [p.slice(m.index, m.index + m[0].length + 12).replace(/\s+\S*$/, '')] : [];
    });
    const repeats = repeatExamples.length;
    const walls = paragraphs.filter((p) => wordsOf(p) > 350).length;
    const frontMatter = index === 0 || FRONT_MATTER.test(c.title);
    const dupes = paragraphs.filter((p) => (seen.get(p) ?? 0) > 1).length;
    const claims = paragraphs.reduce((n, p) => n + (p.match(CLAIM)?.length ?? 0), 0);
    const figures = c.figures ?? [];
    const noAlt = figures.filter((f) => !f.alt.trim() || /^(image|img|picture|photo)\s*\d*$/i.test(f.alt.trim())).length;
    if (placeholders) notes.push(`${placeholders} paragraph${placeholders > 1 ? 's' : ''} with placeholder text`);
    if (repeats) notes.push(`${repeats} doubled word${repeats > 1 ? 's' : ''}, for example "${[...new Set(repeatExamples)].slice(0, 2).join('", "')}"`);
    if (walls) notes.push(`${walls} paragraph${walls > 1 ? 's' : ''} over 350 words; split for reading on phones`);
    if (words > 0 && words < 150 && !frontMatter) notes.push(`only ${words} words`);
    if (dupes) notes.push(`${dupes} paragraph${dupes > 1 ? 's' : ''} also appear elsewhere in the book`);
    if (noAlt && !(frontMatter && figures.length <= 2)) notes.push(`${noAlt} image${noAlt > 1 ? 's' : ''} without a description (alt text)`);
    if (claims) notes.push(`${claims} date${claims > 1 ? 's, figures or claims' : ', figure or claim'} to verify`);
    const editing: Check = placeholders ? 'fix' : repeats ? 'review' : 'ok';
    const formatting: Check = walls || (words > 0 && words < 150 && !frontMatter) ? 'review' : 'ok';
    const duplication: Check = dupes ? 'review' : 'ok';
    // A title page's image is usually the cover; it needs no description of its own.
    const imagesCheck: Check = !figures.length ? 'n/a' : noAlt && !(frontMatter && figures.length <= 2) ? 'review' : 'ok';
    const factCheck: Check = claims ? 'manual' : 'ok';
    return {
      title: c.title, words, paragraphs: paragraphs.length, images: figures.length,
      editing, formatting, duplication, factCheck, imagesCheck,
      ready: editing !== 'fix' && ![formatting, duplication, imagesCheck].includes('review') && editing !== 'review', notes,
    };
  });
}

export function copyrightPage(intake: SubmissionIntake) {
  const holder = intake.copyrightHolder.trim() || intake.author.trim();
  return [
    `Copyright © ${intake.copyrightYear} ${holder}.`, '', 'All rights reserved.', '',
    'No part of this publication may be reproduced, distributed, stored, or transmitted without prior written permission from the publisher except as permitted under applicable copyright law.',
    '', 'This publication is intended for educational, informational, philosophical, and inspirational purposes only and does not constitute medical, legal, financial, psychological, or professional advice.',
    '', `Published by ${holder}.`,
    ...(intake.ebookIsbn ? ['', `eBook ISBN ${intake.ebookIsbn}`] : []),
    ...(intake.printIsbn ? [`Print ISBN ${intake.printIsbn}`] : []),
  ].join('\n');
}

const mark: Record<Check, string> = { ok: '✅', review: '⚠️ Review', fix: '❌ Fix', manual: '🔎 Verify', 'n/a': '—' };

export function readinessPackage(intake: SubmissionIntake, report: PrepReport | null, chapters: Chapter[]): ReadinessPackage {
  const audits = auditChapters(chapters);
  const issues: ReadinessPackage['issues'] = [];
  if (!report) issues.push({ severity: 'error', text: 'The EPUB has not been prepared and checked yet.' });
  for (const f of report?.findings ?? []) if (f.severity !== 'info') issues.push({ severity: f.severity, text: f.message });
  const description = intake.description.trim();
  if (description.length < 150) issues.push({ severity: 'error', text: 'The book description is shorter than 150 characters; stores show it on the product page.' });
  if ((intake.keywords ?? []).length < 7) issues.push({ severity: 'warning', text: `${(intake.keywords ?? []).length} of 7 keywords filled in; KDP lets you add 7 to be found in search.` });
  const placeholderChapters = audits.filter((a) => a.editing === 'fix').length;
  if (placeholderChapters) issues.push({ severity: 'error', text: `${placeholderChapters} chapter${placeholderChapters > 1 ? 's contain' : ' contains'} placeholder text.` });
  const dupChapters = audits.filter((a) => a.duplication === 'review').length;
  if (dupChapters) issues.push({ severity: 'warning', text: `Repeated passages in ${dupChapters} chapter${dupChapters > 1 ? 's' : ''}; check they are intended.` });

  const cover = report?.cover;
  const coverOk = !!cover && cover.height >= 2560 && cover.width >= 1600;
  const epubErrors = report?.summary.errors ?? 1;
  const print = intake.wantsPrint && intake.trimSize && intake.paper && intake.pageCount
    ? printCoverSpec(intake.trimSize, intake.paper, intake.pageCount, intake.binding) : null;
  if (intake.wantsPrint && !print) issues.push({ severity: 'warning', text: 'Print edition requested, but trim size, paper or page count is missing.' });
  for (const p of print?.problems ?? []) issues.push({ severity: 'warning', text: p });

  const kdpEbook: ChecklistItem[] = [
    { label: 'Manuscript: EPUB 3 that passes the checks', status: epubErrors ? 'fix' : 'ok', detail: epubErrors ? `${epubErrors} error(s) in the preparation report.` : `EPUB ${report?.epubVersion}, ${report ? Math.round(report.bytes.after / 1024 / 1024) : '?'} MB, no errors. Download "Prepared EPUB".` },
    { label: 'Cover: front only, 1600 × 2560 recommended', status: coverOk ? 'ok' : cover ? 'review' : 'fix', detail: cover ? `${cover.width} × ${cover.height}. Download "Store cover (JPG)".` : 'No cover found.' },
    { label: 'Title and subtitle as on the cover', status: 'ok', detail: [intake.title, intake.subtitle].filter(Boolean).join(': ') },
    { label: 'Description (up to 4,000 characters)', status: description.length >= 150 ? 'ok' : 'fix', detail: `${description.length} characters.` },
    { label: '7 keywords', status: (intake.keywords ?? []).length >= 7 ? 'ok' : 'review', detail: (intake.keywords ?? []).join(', ') || 'None yet.' },
    { label: 'Categories', status: intake.categories.length ? 'ok' : 'fix', detail: 'See the metadata package below.' },
    { label: 'ISBN (optional for KDP eBooks; KDP assigns an ASIN)', status: intake.ebookIsbn ? 'ok' : 'n/a', detail: intake.ebookIsbn ?? 'Not needed on KDP.' },
    { label: 'Copyright year matches the copyright page', status: report?.findings.some((f) => f.rule === 'copyright-year' && f.severity === 'error') ? 'fix' : 'ok', detail: String(intake.copyrightYear) },
    { label: 'AI-content disclosure', status: 'ok', detail: intake.aiContent === 'none' ? 'None declared.' : `Declare "${intake.aiContent === 'generated' ? 'AI-generated' : 'AI-assisted'}" in KDP's content questions.` },
    { label: 'Preview in the Kindle Previewer before publishing', status: 'manual', detail: 'Free from Amazon; check images, the table of contents and chapter starts.' },
  ];
  const kdpPrint: ChecklistItem[] = !intake.wantsPrint ? [{ label: 'Print edition', status: 'n/a', detail: 'Not requested. Turn on the print edition in "Edit details" to get the print checklist.' }] : [
    { label: 'Trim size, paper and binding', status: print ? 'ok' : 'fix', detail: print ? `${intake.trimSize} in, ${intake.paper}, ${intake.binding ?? 'paperback'}` : 'Missing.' },
    { label: 'Page count within KDP limits', status: print && !print.problems.length ? 'ok' : 'review', detail: `${intake.pageCount ?? '?'} pages.` },
    { label: 'Print ISBN (different from the eBook)', status: intake.printIsbn ? 'ok' : 'review', detail: intake.printIsbn ?? 'Use the free KDP ISBN or your own.' },
    { label: 'Interior PDF at trim size, fonts embedded', status: 'manual', detail: print ? `Inside margin at least ${print.gutterIn} in; bleed 0.125 in only if images reach the edge.` : 'Set the trim size first.' },
    { label: 'Full-wrap cover PDF', status: print ? 'manual' : 'fix', detail: print ? `${print.widthIn} × ${print.heightIn} in with bleed; spine ${print.spineIn} in${print.spineIn < 0.06 ? ' (too thin for spine text)' : ''}.` : 'Needs trim, paper and page count.' },
    { label: 'Barcode area clear', status: 'manual', detail: '2 × 1.2 in on the back, lower right; KDP prints it.' },
    { label: 'Order a proof copy', status: 'manual', detail: 'Check colours, margins and the spine in print.' },
  ];
  const lulu: ChecklistItem[] = [
    { label: 'eBook: EPUB that passes EPUBCheck', status: epubErrors ? 'fix' : 'ok', detail: 'Lulu validates EPUBs on upload; this file passed the same checks.' },
    { label: 'eBook cover: front only (no back cover)', status: report?.findings.some((f) => f.rule === 'cover-front-only' && f.severity === 'error') ? 'fix' : 'ok', detail: 'Lulu rejects marketing images with a back cover section.' },
    { label: 'Copyright year in the metadata matches the interior', status: 'ok', detail: `Enter ${intake.copyrightYear} on the Lulu form.` },
    { label: 'Print: interior PDF and Lulu cover template', status: intake.wantsPrint ? 'manual' : 'n/a', detail: intake.wantsPrint ? 'Download the cover template from Lulu with the final page count.' : 'Print not requested.' },
    { label: 'Print: page count up to 800', status: !intake.wantsPrint ? 'n/a' : (intake.pageCount ?? 0) <= 800 ? 'ok' : 'fix', detail: `${intake.pageCount ?? '?'} pages.` },
  ];

  const errors = issues.filter((i) => i.severity === 'error').length;
  const warnings = issues.filter((i) => i.severity === 'warning').length;
  const notReady = audits.filter((a) => !a.ready).length;
  const score = Math.max(0, Math.min(100, 100 - errors * 15 - warnings * 4 - Math.min(30, notReady * 3)));
  const verdict = score >= 90 ? 'Ready to publish' : score >= 70 ? 'Nearly ready' : 'Needs work';
  const claims = audits.reduce((n, a) => n + (a.factCheck === 'manual' ? 1 : 0), 0);
  const summary = `${intake.title} scores ${score}/100 (${verdict.toLowerCase()}). ${audits.length} chapters, ${audits.reduce((n, a) => n + a.words, 0).toLocaleString('en-US')} words, ${audits.reduce((n, a) => n + a.images, 0)} images. `
    + `${errors ? `${errors} issue${errors > 1 ? 's' : ''} must be fixed` : 'Nothing blocks publishing'}${warnings ? `; ${warnings} to review` : ''}. `
    + (claims ? `${claims} chapter${claims > 1 ? 's' : ''} contain dates, figures or claims for the author to verify.` : '');

  const corrections = [
    ...issues.map((i) => `${i.severity === 'error' ? 'Fix' : 'Review'}: ${i.text}`),
    ...audits.flatMap((a) => a.notes.filter((n) => !/to verify$/.test(n)).map((n) => `${a.title}: ${n}`)),
  ];

  const categories = [...new Set(intake.categories.flatMap((c) => STORE_CATEGORIES[c] ?? [`Body, Mind & Spirit > General (${c})`]))].slice(0, 3);
  const metadata = {
    title: intake.title, subtitle: intake.subtitle, author: intake.author, contributors: [], language: intake.language,
    categories, keywords: (intake.keywords ?? []).slice(0, 7), isbn: { ebook: intake.ebookIsbn, print: intake.printIsbn },
  };
  const copyright = copyrightPage(intake);

  const table = (items: ChecklistItem[]) => items.map((i) => `- [${i.status === 'ok' ? 'x' : ' '}] **${i.label}** — ${mark[i.status]}. ${i.detail}`).join('\n');
  const markdown = [
    `# ${intake.title.toUpperCase()}`, '', '## Amazon KDP & Lulu Publication Readiness Package', '',
    `Prepared by BookAtlas on ${new Date().toISOString().slice(0, 10)}.`, '',
    '# Executive Summary', '', summary, '',
    '# Publication Readiness Score', '', `**${score}/100 — ${verdict}**`, '',
    '# Major Issues Requiring Correction', '', issues.length ? issues.map((i) => `- ${i.severity === 'error' ? '❌' : '⚠️'} ${i.text}`).join('\n') : '- None.', '',
    '# Correction Checklist', '', corrections.length ? corrections.map((c) => `- [ ] ${c}`).join('\n') : '- [x] Nothing to correct.', '',
    '# Chapter-by-Chapter Audit', '',
    '| Chapter | Words | Editing | Formatting | Duplication | Fact check | Images | Ready |',
    '|---|---|---|---|---|---|---|---|',
    ...audits.map((a) => `| ${a.title.replace(/\|/g, '/')} | ${a.words.toLocaleString('en-US')} | ${mark[a.editing]} | ${mark[a.formatting]} | ${mark[a.duplication]} | ${mark[a.factCheck]} | ${mark[a.imagesCheck]} | ${a.ready ? 'Yes' : 'No'} |`),
    '', ...audits.filter((a) => a.notes.length).map((a) => `- **${a.title}:** ${a.notes.join('; ')}.`), '',
    '# Amazon KDP Upload Checklist — eBook', '', table(kdpEbook), '',
    '# Amazon KDP Upload Checklist — Print', '', table(kdpPrint), '',
    '# Lulu Upload Checklist', '', table(lulu), '',
    '# KDP Metadata Package', '',
    `## Title\n${metadata.title}`, '', ...(metadata.subtitle ? [`## Subtitle\n${metadata.subtitle}`, ''] : []),
    `## Author\n${metadata.author}`, '', '## Contributors\nForeword author, editor or narrator (if applicable)', '',
    '## Series\nNone (optional)', '', `## Language\n${metadata.language}`, '',
    `## Categories\n${categories.map((c) => `- ${c}`).join('\n')}`, '',
    `## Keywords\n${metadata.keywords.join(', ') || '(add up to 7)'}`, '',
    ...(metadata.isbn.ebook || metadata.isbn.print ? [`## ISBN\n${[metadata.isbn.ebook && `eBook ${metadata.isbn.ebook}`, metadata.isbn.print && `Print ${metadata.isbn.print}`].filter(Boolean).join('\n')}`, ''] : []),
    '# Amazon Book Description', '', description, '',
    '# Copyright Page', '', copyright, '',
  ].join('\n');

  return { score, verdict, summary, issues, corrections, chapters: audits, kdpEbook, kdpPrint, lulu, metadata, description, copyright, markdown };
}
