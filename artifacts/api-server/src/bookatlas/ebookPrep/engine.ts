import type { SubmissionIntake } from '@workspace/bookatlas-catalog/publishing';
import { packEpub, unpackEpub } from './archive.js';
import { PackageDocument } from './opf.js';
import { decodeImage, encodeJpeg, imageSize } from './images.js';
import { RULES, fingerprint, type EpubcheckMessage, type Finding, type PrepContext, type Rule } from './rules.js';

export const MAX_ROUNDS = 5;

export interface PrepRound { round: number; changes: { rule: string; change: string }[] }

export interface PrepReport {
  rounds: PrepRound[];
  findings: Finding[];
  summary: { errors: number; warnings: number; fixed: number };
  epubVersion: string;
  cover: { width: number; height: number } | null;
  bytes: { before: number; after: number };
  sha256: string;
  /** Rules whose store messages were seen before; their findings block publishing. */
  blockingRules: string[];
}

export interface PrepResult { epub: Uint8Array; frontCover: Uint8Array | null; report: PrepReport }

function runChecks(ctx: PrepContext, rules: Rule[], blocking: Set<string>) {
  return rules.flatMap((rule) => rule.check(ctx)).map((f) =>
    blocking.has(f.rule) && f.severity === 'warning' ? { ...f, severity: 'error' as const } : f);
}

/**
 * Check, fix and re-check until no fixable finding is left or a round changes nothing.
 * `blockingRules` are rules a store has rejected books for (learned from feedback); their
 * warnings count as errors.
 */
export function prepareEpub(input: Uint8Array, intake: SubmissionIntake, options: { epubcheck?: EpubcheckMessage[]; blockingRules?: string[]; cover?: PrepContext['cover'] } = {}): PrepResult {
  const epub = unpackEpub(input);
  const ctx: PrepContext = { epub, opf: new PackageDocument(epub), intake, epubcheck: options.epubcheck ?? [], cover: options.cover, notes: {} };
  const blocking = new Set(options.blockingRules ?? []);
  const rounds: PrepRound[] = [];

  for (let round = 1; round <= MAX_ROUNDS; round += 1) {
    const findings = runChecks(ctx, RULES, blocking);
    const fixable = RULES.filter((rule) => rule.fix && findings.some((f) => f.rule === rule.id && f.fixable));
    if (!fixable.length) break;
    const changes: PrepRound['changes'] = [];
    for (const rule of fixable) {
      for (const change of rule.fix!(ctx)) changes.push({ rule: rule.id, change });
      ctx.opf.save();
    }
    if (!changes.length) break;
    // The EPUBCheck messages describe the file before these changes.
    ctx.epubcheck = [];
    rounds.push({ round, changes });
  }

  const findings = runChecks(ctx, RULES, blocking);
  const output = packEpub(epub);
  const coverItem = ctx.opf.coverItem();
  const coverBytes = coverItem && epub.has(coverItem.path) ? epub.bytes(coverItem.path) : null;
  const size = coverBytes ? imageSize(coverBytes) : null;
  let frontCover: Uint8Array | null = null;
  if (coverBytes && size && size.width <= size.height * 1.05) {
    frontCover = coverBytes[0] === 0xff ? coverBytes : encodeJpeg(decodeImage(coverBytes), 92);
  }
  return {
    epub: output,
    frontCover,
    report: {
      rounds,
      findings,
      summary: {
        errors: findings.filter((f) => f.severity === 'error').length,
        warnings: findings.filter((f) => f.severity === 'warning').length,
        fixed: rounds.reduce((n, r) => n + r.changes.length, 0),
      },
      epubVersion: ctx.opf.version,
      cover: size,
      bytes: { before: input.byteLength, after: output.byteLength },
      sha256: fingerprint(output),
      blockingRules: [...blocking],
    },
  };
}

/** Match a store's rejection message to the rules that answer it. */
export function matchStoreMessage(message: string) {
  return RULES.filter((rule) => rule.storeMessages.some((pattern) => pattern.test(message))).map((rule) => rule.id);
}
