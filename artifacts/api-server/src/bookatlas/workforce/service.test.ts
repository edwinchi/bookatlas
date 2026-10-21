import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { WorkforceTask, WorkforceTaskInput } from '@workspace/api-zod';
import type { WorkforceStore, VersionedTask } from './storage.js';
import {
  createWorkforceService, createWorkforceTask, reviewWorkforceTask, runWorkforceWorker, workforceReservationMicros,
  type WorkforceGenerator,
} from './service.js';

class MemoryStore implements WorkforceStore {
  private records = new Map<string, VersionedTask>();
  private version = 0;
  isConfigured() { return true; }
  async get(ownerId: string, id: string) {
    return this.records.get(`${ownerId}:${id}`) ?? null;
  }
  async create(ownerId: string, task: WorkforceTask) {
    const key = `${ownerId}:${task.id}`;
    if (this.records.has(key)) return false;
    this.records.set(key, { task, generation: String(++this.version) });
    return true;
  }
  async compareAndSwap(ownerId: string, id: string, generation: string, task: WorkforceTask) {
    const key = `${ownerId}:${id}`;
    const current = this.records.get(key);
    if (!current || current.generation !== generation) return false;
    this.records.set(key, { task, generation: String(++this.version) });
    return true;
  }
  async list(ownerId: string) {
    return [...this.records.entries()].filter(([key]) => key.startsWith(`${ownerId}:`)).map(([, record]) => record.task);
  }
}

const taskInput = (overrides: Partial<WorkforceTaskInput> = {}): WorkforceTaskInput => ({
  idempotencyKey: '8cc8aaf0-815c-445a-a673-6e4197a87ba5',
  objective: 'Assess the proposed reader onboarding experience.',
  context: 'Only use supplied context.',
  workerIds: ['product', 'ux'],
  budgetUsd: 0.1,
  ...overrides,
});

function generator(overrides: Partial<WorkforceGenerator> = {}): WorkforceGenerator {
  return {
    countTokens: async () => 10,
    generate: async () => ({ text: 'Grounded report with evidence and open questions.', finishReason: 'STOP' }),
    ...overrides,
  };
}

test('conservative reservations are integer microdollars and invalid counts are rejected', () => {
  assert.equal(workforceReservationMicros(10), 46_103);
  assert.equal(workforceReservationMicros(Number.NaN), null);
  assert.ok(workforceReservationMicros(10_000) !== null);
});

test('injectable service supports idempotent storage-only creation and owner isolation', async () => {
  const store = new MemoryStore();
  const service = createWorkforceService({ store });
  const payload = taskInput({ workerIds: ['security'] });
  const created = await service.createWorkforceTask('owner-one', payload);
  const duplicate = await service.createWorkforceTask('owner-one', payload);
  assert.equal(duplicate.id, created.id);
  assert.deepEqual((await service.getWorkforce('owner-one')).tasks.map(task => task.id), [created.id]);
  assert.deepEqual((await service.getWorkforce('owner-two')).tasks, []);
  await assert.rejects(
    service.createWorkforceTask('owner-one', { ...payload, objective: 'A different objective for the same key.' }),
    /different task payload/,
  );
});

test('budget guard refuses a paid call and concurrent duplicate runs claim at most one worker', async () => {
  const store = new MemoryStore();
  const created = await createWorkforceTask('owner-a', taskInput({ budgetUsd: 0.05 }), { store });
  let paidCalls = 0;
  const tooExpensive = generator({ countTokens: async () => 10_000 });
  await assert.rejects(
    runWorkforceWorker('owner-a', created.id, 'product', true, { store, generator: () => tooExpensive }),
    /budget cannot cover/,
  );
  assert.equal(paidCalls, 0);

  const runGenerator = generator({
    generate: async () => { paidCalls++; return { text: 'Complete report.', finishReason: 'STOP' }; },
  });
  const outcomes = await Promise.allSettled([
    runWorkforceWorker('owner-a', created.id, 'product', true, { store, generator: () => runGenerator }),
    runWorkforceWorker('owner-a', created.id, 'product', true, { store, generator: () => runGenerator }),
  ]);
  assert.equal(outcomes.filter(item => item.status === 'fulfilled').length, 1);
  assert.equal(paidCalls, 1);
  const saved = await store.get('owner-a', created.id);
  assert.equal(saved?.task.workers.find(worker => worker.workerId === 'product')?.status, 'completed');
});

test('approval requires every report; cancellation and recovery preserve spent reservations', async () => {
  const store = new MemoryStore();
  const created = await createWorkforceTask('owner-b', taskInput(), { store, now: () => 1_700_000_000_000 });
  await assert.rejects(
    reviewWorkforceTask('owner-b', created.id, { action: 'approve', note: '' }, { store }),
    /requires a complete report/,
  );

  await runWorkforceWorker('owner-b', created.id, 'product', true, {
    store, generator: () => generator(), now: () => 1_700_000_001_000,
  });
  const beforeRecovery = await store.get('owner-b', created.id);
  const startedAt = new Date(1_700_000_002_000).toISOString();
  const interrupted: WorkforceTask = {
    ...beforeRecovery!.task,
    status: 'running',
    workers: beforeRecovery!.task.workers.map(worker => worker.workerId === 'ux' ? {
      ...worker, status: 'running', startedAt, reservedUsd: 0.01,
    } : worker),
    reservedUsd: beforeRecovery!.task.reservedUsd + 0.01,
  };
  assert.equal(await store.compareAndSwap('owner-b', created.id, beforeRecovery!.generation, interrupted), true);
  const runningRecord = await store.get('owner-b', created.id);
  const reservedBefore = runningRecord!.task.reservedUsd;
  const recovered = await reviewWorkforceTask('owner-b', created.id, { action: 'recover', note: '' }, {
    store, now: () => 1_700_000_182_000,
  });
  assert.equal(recovered.workers.find(worker => worker.workerId === 'ux')?.status, 'unknown');
  assert.equal(recovered.reservedUsd, reservedBefore);
  await assert.rejects(
    runWorkforceWorker('owner-b', created.id, 'ux', true, { store, generator: () => generator() }),
    /cannot run another worker/,
  );
  const cancelled = await reviewWorkforceTask('owner-b', created.id, { action: 'cancel', note: '' }, { store });
  assert.equal(cancelled.status, 'cancelled');
});

test('approval is allowed only after every assigned worker completed', async () => {
  const store = new MemoryStore();
  const created = await createWorkforceTask('owner-d', taskInput({ workerIds: ['product', 'ux'] }), { store });
  for (const workerId of ['product', 'ux']) {
    await runWorkforceWorker('owner-d', created.id, workerId, true, { store, generator: () => generator() });
  }
  const approved = await reviewWorkforceTask(
    'owner-d', created.id, { action: 'approve', note: 'Reviewed reports.' }, { store },
  );
  assert.equal(approved.status, 'approved');
  assert.equal(approved.approvalNote, 'Reviewed reports.');
});

test('late generator result cannot replace a cancellation checkpoint', async () => {
  const store = new MemoryStore();
  const created = await createWorkforceTask('owner-c', taskInput({ workerIds: ['product'] }), { store });
  let release!: (value: { text: string; finishReason: string }) => void;
  const pending = new Promise<{ text: string; finishReason: string }>(resolve => { release = resolve; });
  const running = runWorkforceWorker('owner-c', created.id, 'product', true, {
    store, generator: () => generator({ generate: () => pending }),
  });
  // Wait until the run is durably claimed before cancelling it.
  for (let attempt = 0; attempt < 20; attempt++) {
    if ((await store.get('owner-c', created.id))?.task.status === 'running') break;
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  await reviewWorkforceTask('owner-c', created.id, { action: 'cancel', note: '' }, { store });
  release({ text: 'Late report.', finishReason: 'STOP' });
  const result = await running;
  assert.equal(result.status, 'cancelled');
  assert.equal(result.workers[0]?.status, 'unknown');
  assert.equal(result.workers[0]?.report, '');
});
