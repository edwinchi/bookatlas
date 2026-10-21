import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { createQueuedJob, runJob } from '../../artifacts/api-server/src/bookatlas/publishing/worker.ts';
import { database, loadJob, updateJob, viewJob } from '../../artifacts/api-server/src/bookatlas/publishing/jobs.ts';
import { readAsset } from '../../artifacts/api-server/src/bookatlas/publishing/storage.ts';
import { inspectWav } from '../../artifacts/api-server/src/bookatlas/publishing/audio.ts';
import { publishJob } from '../../artifacts/api-server/src/bookatlas/publishing/publication.ts';
import type { Job } from '../../artifacts/api-server/src/bookatlas/publishing/jobs.ts';

// Explicit operator-run verification, NEVER part of startup, CI or a workflow.
// Reuses one persistent fixture/ledger. It cannot silently create another paid test.
const owner = 'synthetic-publishing-verification';
const require = createRequire(new URL('../../artifacts/api-server/package.json', import.meta.url));
const { unzipSync, strFromU8 } = require('fflate');
try {
  if (!(Number(process.env.BOOKATLAS_TEST_BUDGET_USD) >= 0.75 &&
        Number(process.env.BOOKATLAS_TEST_BUDGET_USD) <= 1)) {
    throw new Error('No matching one-dollar test authorization configured.');
  }
  const previous = await database().from('publishing_jobs').select('*').eq('owner_id', owner)
    .eq('is_test', true).order('created_at', { ascending: false }).limit(1);
  if (previous.error) throw new Error('Test schema is not available.');
  let job = previous.data[0] as Job | undefined;
  if (!job) {
    const source = `Synthetic source for a short book about a fictional community reading room.
The room opens on Saturday afternoons. Volunteers arrange chairs in a circle and invite visitors to choose a short text.
Readers may listen without speaking. A session starts with a welcome, continues with quiet reading, and ends with optional discussion.
The volunteers collect anonymous suggestions on paper. They do not record visitor names or sell contact information.
The group notices three practical lessons: a predictable schedule makes planning easier, comfortable seating helps people stay, and clear invitations help new visitors feel included.
These are observations from this fictional scenario, not scientific findings. The group has no measured literacy outcomes or commercial results.
Its next experiment is to offer large-print copies and ask visitors whether the change helps.
The book should explain the room, the observations, their limitations, and the proposed next experiment.`;
    job = await createQueuedJob({
      fileName: 'synthetic-reading-room.txt', mimeType: 'text/plain',
      base64: Buffer.from(source).toString('base64'),
      title: 'The Saturday Reading Room — Synthetic Verification',
      author: 'Bookatlas Synthetic Test', language: 'en', category: 'Community Reading',
      chapterCount: 2, wordsPerChapter: 100, voice: 'Kore',
      includeAudio: true, isTest: true, budgetUsd: 0.75,
    }, owner);
  }
  if (['failed', 'cancelled'].includes(job.status) && process.argv.includes('--retry') && job.data.retryCount < 2) {
    const { pendingCall: _pending, error: _error, ...data } = job.data;
    job = await updateJob(job, { status: 'queued', stage: 'resume', lease_token: null, lease_until: null,
      data: { ...data, retryCount: data.retryCount + 1 } });
  }
  if (job.status === 'queued') {
    job = await updateJob(job, { status: 'running', lease_token: randomUUID(),
      lease_until: new Date(Date.now() + 10 * 60_000).toISOString() });
    console.log(JSON.stringify({ fixture: job.id, status: 'started', maximumApprovedForFixtureUsd: 0.75 }));
    await runJob(job);
    job = await loadJob(job.id); // Read back committed state, not local variables.
  }
  if (!['review', 'published'].includes(job.status)) {
    console.log(JSON.stringify({ fixture: job.id, status: job.status, stage: job.stage,
      reservedUsd: job.data.ledger.reservedMicros / 1_000_000, error: job.data.error }));
    process.exitCode = 1;
  } else {
    const epub = unzipSync(await readAsset(job.id, 'book.epub'));
    for (let i = 1; i <= 2; i++) {
      if (!strFromU8(epub[`EPUB/chapter-${i}.xhtml`]).includes('<section')) throw new Error('A complete EPUB chapter is missing.');
      inspectWav(await readAsset(job.id, `chapter-${i}.wav`));
    }
    const publication = await publishJob(job);
    const publicRecord = await database().from('books').select('id').eq('id', job.id).maybeSingle();
    if (publicRecord.error || publicRecord.data) throw new Error('Test isolation could not be confirmed.');
    const persisted = await viewJob(await loadJob(publication.job.id));
    if (persisted.chapters.length !== 2 || persisted.chapters.some(chapter => !chapter.audioUrl)) throw new Error('Persisted outputs are incomplete.');
    console.log(JSON.stringify({
      fixture: persisted.id, status: persisted.status,
      testCatalogOnly: true, publicCatalogUnchanged: true,
      completeEpubChapters: persisted.chapters.length,
      measuredAudioSeconds: persisted.chapters.map(chapter => chapter.durationSeconds),
      conservativeReservedUsd: persisted.reservedUsd, fixtureCapUsd: 0.75,
      emailSent: false,
    }, null, 2));
  }
} catch {
  console.error('Controlled publishing verification failed. Credentials and source content are not logged. Inspect the persisted test job and remaining reservation before retrying.');
  process.exitCode = 1;
}
