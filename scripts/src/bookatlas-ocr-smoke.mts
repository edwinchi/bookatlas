import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { database, updateJob, type Job } from '../../artifacts/api-server/src/bookatlas/publishing/jobs.ts';
import { createQueuedJob } from '../../artifacts/api-server/src/bookatlas/publishing/worker.ts';
import { Generator } from '../../artifacts/api-server/src/bookatlas/publishing/generation.ts';
import { extractSource } from '../../artifacts/api-server/src/bookatlas/publishing/extraction.ts';
import { validateSource } from '../../artifacts/api-server/src/bookatlas/publishing/source.ts';
import { writeJson, writeAsset } from '../../artifacts/api-server/src/bookatlas/publishing/storage.ts';

// Operator-only paid source-format checks. Combined fixture caps: $0.75 + $0.20.
const require = createRequire(new URL('../../artifacts/api-server/package.json', import.meta.url));
const { PDFDocument, StandardFonts } = require('pdf-lib');
const owner = 'synthetic-multimodal-verification';
let directory: string | undefined;
let gen: Generator | undefined;
try {
  if (Number(process.env.BOOKATLAS_TEST_BUDGET_USD) !== 1) throw new Error('No matching test authorization.');
  const document = await PDFDocument.create();
  const page = document.addPage([600, 800]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  page.drawText('Synthetic verification. The access code is MAPLE42.', { x: 35, y: 710, size: 17, font });
  const pdf = Buffer.from(await document.save());
  const previous = await database().from('publishing_jobs').select('*').eq('owner_id', owner).eq('is_test', true).limit(1);
  if (previous.error) throw new Error('Could not check persistent fixture.');
  let job = previous.data[0] as Job | undefined;
  if (!job) job = await createQueuedJob({
    fileName: 'synthetic-source.pdf', mimeType: 'application/pdf', base64: pdf.toString('base64'),
    title: 'Synthetic PDF and image extraction verification', author: 'Bookatlas Synthetic Test',
    language: 'en', category: 'Verification', chapterCount: 2, wordsPerChapter: 100,
    voice: 'Kore', includeAudio: false, isTest: true, budgetUsd: 0.20,
  }, owner);
  if (job.data.pendingCall) {
    if (!process.argv.includes('--retry') || job.data.retryCount >= 2) throw new Error('Ambiguous previous attempt; do not automatically repeat.');
    job = await updateJob(job, { data: {
      ...job.data, pendingCall: undefined, retryCount: job.data.retryCount + 1,
    } });
  }
  if (!(job.data.verification?.pdf && job.data.verification.image)) {
    job = await updateJob(job, { status: 'running', stage: 'format-verification', lease_token: randomUUID(),
      lease_until: new Date(Date.now() + 10 * 60_000).toISOString() });
    gen = new Generator(job);
    directory = await mkdtemp('/tmp/bookatlas-ocr-');
    await writeFile(`${directory}/source.pdf`, pdf);
    execFileSync('pdftoppm', ['-png', '-singlefile', '-r', '100', `${directory}/source.pdf`, `${directory}/source`]);
    const png = await readFile(`${directory}/source.png`);
    for (const [kind, fileName, mimeType, bytes] of [
      ['pdf', 'synthetic-source.pdf', 'application/pdf', pdf],
      ['image', 'synthetic-source.png', 'image/png', png],
    ] as const) {
      if (gen.job.data.verification?.[kind]) continue;
      const source = await validateSource({ fileName, mimeType, base64: bytes.toString('base64') });
      await writeAsset(job.id, `verification-source.${kind === 'pdf' ? 'pdf' : 'png'}`, bytes, mimeType, owner);
      const extracted = await extractSource(gen, source);
      if (!extracted.text.includes('MAPLE42')) throw new Error('Source text was not faithfully extracted.');
      await writeJson(job.id, `verification-${kind}.json`, extracted, owner);
      await gen.checkpoint({ ...gen.job.data, pendingCall: undefined,
        verification: { ...gen.job.data.verification, [kind]: true } }, 'format-verification');
    }
    job = await updateJob(gen.job, { status: 'cancelled', stage: 'verification-completed', lease_token: null, lease_until: null });
  }
  console.log(JSON.stringify({
    pdfExtractionVerified: job.data.verification?.pdf === true,
    imageExtractionVerified: job.data.verification?.image === true,
    conservativeReservedUsd: job.data.ledger.reservedMicros / 1e6,
    fixtureCapUsd: 0.20, combinedFixtureCapsUsd: 0.95, publicationRequested: false, emailSent: false,
  }, null, 2));
} catch {
  if (gen) await updateJob(gen.job, {
    status: 'failed', stage: 'verification-failed', lease_token: null, lease_until: null,
    data: { ...gen.job.data, error: 'Controlled format verification failed; reservation retained. No publication or email requested.' },
  }).catch(() => {});
  console.error('Controlled format verification failed safely. Do not automatically repeat a provider call.');
  process.exitCode = 1;
} finally {
  if (directory) await rm(directory, { recursive: true, force: true });
}
