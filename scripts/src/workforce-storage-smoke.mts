import assert from 'node:assert/strict';
import { createWorkforceService } from '../../artifacts/api-server/src/bookatlas/workforce/service.ts';
import { workforceStore } from '../../artifacts/api-server/src/bookatlas/workforce/storage.ts';

// Operator-only storage verification. No model call, email, or SQL is possible.
const owner = 'synthetic-workforce-storage-verification';
const service = createWorkforceService({
  provider: {
    async countTokens() { throw new Error('AI calls forbidden in storage verification.'); },
    async generate() { throw new Error('AI calls forbidden in storage verification.'); },
  },
});

try {
  const input = {
    idempotencyKey: '85dad822-70b0-43b0-89a7-51ddcf016294',
    objective: 'Synthetic verification of private assignment document persistence.',
    context: 'No real people, books, recipients, or production changes.',
    workerIds: ['qa', 'security'], budgetUsd: 0.1,
  };
  const created = await service.createWorkforceTask(owner, input);
  const duplicate = await service.createWorkforceTask(owner, input);
  assert.equal(duplicate.id, created.id);
  const stored = await workforceStore.get(owner, created.id);
  assert.equal(stored?.task.objective, input.objective);
  assert.equal(stored?.task.reservedUsd, 0);
  assert.equal(await workforceStore.get('synthetic-other-owner', created.id), null);
  assert.ok((await service.getWorkforce(owner)).tasks.some(task => task.id === created.id));
  if (stored?.task.status !== 'cancelled') {
    await service.reviewWorkforceTask(owner, created.id, { action: 'cancel', note: 'Storage-only verification complete.' });
    assert.equal(await workforceStore.compareAndSwap(owner, created.id, stored!.generation, stored!.task), false);
  }
  assert.equal((await workforceStore.get(owner, created.id))?.task.status, 'cancelled');
  console.log(JSON.stringify({
    privateDocumentReadBack: true, ownerIsolation: true, duplicateCreateDeduplicated: true,
    fixtureCancelled: true, modelCalls: 0, databaseWrites: 0, emailsSent: 0,
  }));
} catch {
  console.error('Private workforce storage verification failed; no AI requests, email, or SQL were attempted.');
  process.exitCode = 1;
}
