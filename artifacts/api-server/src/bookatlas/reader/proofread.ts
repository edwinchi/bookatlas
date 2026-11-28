import type { Identity } from '../../auth/policy.js';
import { ownChapters } from '../ebookPrep/service.js';
import type { Generate } from './ai.js';
import { ReaderError } from './service.js';

/**
 * AI proofreader for authors (2026-11-28, master.md "AI proofreading"): one chapter of the author's own prepared book
 * is checked for spelling, grammar, punctuation and typing errors. Only suggestions that quote the chapter exactly
 * are kept, so nothing invented reaches the author; the book itself is never changed. Tested in proofread.test.ts.
 */
export const PROOF_CHARS = 6000;
export const PROOF_KINDS = ['spelling', 'grammar', 'punctuation', 'typo', 'consistency'] as const;
export type ProofKind = (typeof PROOF_KINDS)[number];
export interface ProofIssue { original: string; suggestion: string; kind: ProofKind; reason: string }

export const proofreadInstruction = `You are a careful proofreader for an independent author. Check the chapter for spelling, grammar, punctuation, typing errors and inconsistent spelling of names. Do not rewrite style, voice, dialect or deliberate word choices, and do not comment on the story. Reply with JSON only: {"issues": [{"original": "the exact words from the chapter, 2 to 12 words, copied character for character", "suggestion": "the same words corrected", "kind": "spelling|grammar|punctuation|typo|consistency", "reason": "why, in at most 12 words, in the language of the chapter"}]}. At most 15 issues, the clearest first. If there are none, reply {"issues": []}.`;

const flat = (s: string) => s.replace(/\s+/g, ' ').trim();

/** The model's issues, kept only when the original is in the chapter and the suggestion differs. */
export function cleanIssues(raw: string | null, chapterText: string): ProofIssue[] {
  let data: unknown;
  try { data = JSON.parse(String(raw ?? '').replace(/^```(?:json)?\s*|\s*```$/g, '')); } catch { return []; }
  const list = Array.isArray((data as { issues?: unknown })?.issues) ? (data as { issues: unknown[] }).issues : [];
  const text = flat(chapterText);
  const seen = new Set<string>();
  const out: ProofIssue[] = [];
  for (const item of list) {
    const i = item as Record<string, unknown>;
    const original = flat(String(i.original ?? '')).slice(0, 200);
    const suggestion = flat(String(i.suggestion ?? '')).slice(0, 200);
    if (original.length < 2 || !suggestion || suggestion === original || !text.includes(original) || seen.has(original)) continue;
    seen.add(original);
    const kind = (PROOF_KINDS as readonly string[]).includes(String(i.kind)) ? i.kind as ProofKind : 'grammar';
    out.push({ original, suggestion, kind, reason: flat(String(i.reason ?? '')).slice(0, 160) });
    if (out.length >= 15) break;
  }
  return out;
}

export async function proofreadChapter(generate: Generate, who: Identity, body: Record<string, unknown>) {
  const id = String(body.submissionId ?? '');
  if (!/^[0-9a-zA-Z-]{6,80}$/.test(id)) throw new ReaderError('Unknown book.', 404);
  const chapters = await ownChapters(who, id).catch((e: Error & { status?: number }) => { throw new ReaderError(e.message || 'Unknown book.', e.status ?? 404); });
  const ci = Number(body.chapterIndex);
  const chapter = Number.isInteger(ci) ? chapters[ci] : undefined;
  if (!chapter) throw new ReaderError('Unknown chapter.', 404);
  const full = chapter.content.join('\n\n');
  if (flat(full).length < 80) throw new ReaderError('This chapter is too short to proofread.', 409);
  const part = full.slice(0, PROOF_CHARS);
  const raw = await generate({ jsonMode: true, temperature: 0.1, systemInstruction: proofreadInstruction, messages: [{ role: 'user', text: `Chapter ${ci + 1}: "${chapter.title}"\n"""${part.replace(/"""/g, '"')}"""` }] });
  if (raw === null) throw new ReaderError('The proofreader is not available right now. Please try again in a minute.', 503);
  return { chapterIndex: ci, title: chapter.title, issues: cleanIssues(raw, part), checkedChars: part.length, totalChars: full.length };
}
