import { createHash } from 'node:crypto';
import { Storage } from '@google-cloud/storage';
import type { WorkforceTask } from '@workspace/api-zod';

const storage = new Storage({
  projectId: '',
  credentials: {
    audience: 'replit', subject_token_type: 'access_token', type: 'external_account',
    token_url: 'http://127.0.0.1:1106/token',
    credential_source: {
      url: 'http://127.0.0.1:1106/credential',
      format: { type: 'json', subject_token_field_name: 'access_token' },
    },
    universe_domain: 'googleapis.com',
  },
});

export interface VersionedTask {
  task: WorkforceTask;
  generation: string;
}

export interface WorkforceStore {
  isConfigured(): boolean;
  get(ownerId: string, taskId: string): Promise<VersionedTask | null>;
  create(ownerId: string, task: WorkforceTask): Promise<boolean>;
  compareAndSwap(ownerId: string, taskId: string, generation: string, task: WorkforceTask): Promise<boolean>;
  list(ownerId: string): Promise<WorkforceTask[]>;
}

export class WorkforceStorageLimitError extends Error {}

function ownerHash(ownerId: string) {
  return createHash('sha256').update(ownerId).digest('hex');
}

function tasksPrefix() {
  const root = process.env.PRIVATE_OBJECT_DIR?.replace(/^\/+|\/+$/g, '');
  if (!root || !root.includes('/')) throw new Error('Private App Storage is unavailable.');
  const [bucket, ...prefix] = root.split('/');
  return { bucket: storage.bucket(bucket!), prefix: prefix.join('/') };
}

function taskFile(ownerId: string, taskId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(taskId)) throw new Error('Invalid workforce task identifier.');
  const root = tasksPrefix();
  return root.bucket.file(`${root.prefix ? `${root.prefix}/` : ''}bookatlas-workforce/${ownerHash(ownerId)}/tasks/${taskId}.json`);
}

function isNotFound(error: unknown) {
  return typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 404;
}
function isPreconditionFailure(error: unknown) {
  return typeof error === 'object' && error !== null &&
    [409, 412].includes(Number((error as { code?: unknown }).code));
}

async function readVersioned(ownerId: string, taskId: string): Promise<VersionedTask | null> {
  const file = taskFile(ownerId, taskId);
  let metadata;
  try { [metadata] = await file.getMetadata(); }
  catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
  const generation = String(metadata.generation ?? '');
  if (!generation || metadata.metadata?.ownerHash !== ownerHash(ownerId) ||
      metadata.metadata?.visibility !== 'private') {
    throw new Error('Stored workforce task failed its ownership or version check.');
  }
  if (!Number.isSafeInteger(Number(metadata.size)) || Number(metadata.size) > 2 * 1024 * 1024) {
    throw new Error('Stored workforce task exceeds the supported size.');
  }
  const pinned = file.bucket.file(file.name, { generation });
  const [bytes] = await pinned.download({ validation: 'crc32c' });
  const task = JSON.parse(bytes.toString('utf8')) as WorkforceTask;
  if (task.id !== taskId) throw new Error('Stored workforce task identity is invalid.');
  return { task, generation };
}

export const workforceStore: WorkforceStore = {
  isConfigured() {
    const root = process.env.PRIVATE_OBJECT_DIR?.replace(/^\/+|\/+$/g, '');
    return !!root && root.includes('/');
  },
  get: readVersioned,
  async create(ownerId, task) {
    const file = taskFile(ownerId, task.id);
    try {
      await file.save(Buffer.from(JSON.stringify(task)), {
        resumable: false,
        validation: 'crc32c',
        preconditionOpts: { ifGenerationMatch: 0 },
        metadata: {
          contentType: 'application/json',
          cacheControl: 'private, no-store',
          metadata: { ownerHash: ownerHash(ownerId), taskId: task.id, visibility: 'private' },
        },
      });
      return true;
    } catch (error) {
      if (isPreconditionFailure(error)) return false;
      throw error;
    }
  },
  async compareAndSwap(ownerId, taskId, generation, task) {
    const file = taskFile(ownerId, taskId);
    try {
      await file.save(Buffer.from(JSON.stringify(task)), {
        resumable: false,
        validation: 'crc32c',
        preconditionOpts: { ifGenerationMatch: Number(generation) },
        metadata: {
          contentType: 'application/json',
          cacheControl: 'private, no-store',
          metadata: { ownerHash: ownerHash(ownerId), taskId, visibility: 'private' },
        },
      });
      return true;
    } catch (error) {
      if (isPreconditionFailure(error)) return false;
      throw error;
    }
  },
  async list(ownerId) {
    const root = tasksPrefix();
    const prefix = `${root.prefix ? `${root.prefix}/` : ''}bookatlas-workforce/${ownerHash(ownerId)}/tasks/`;
    const [files] = await root.bucket.getFiles({ prefix, maxResults: 101, autoPaginate: false });
    if (files.length > 100) {
      throw new WorkforceStorageLimitError('Workforce task listing exceeds the 100-document limit. Explicit pagination is required.');
    }
    const ids = files.map(file => file.name.slice(prefix.length))
      .filter(name => /^[0-9a-f-]{36}\.json$/i.test(name))
      .map(name => name.slice(0, -5));
    const found = await Promise.all(ids.map(id => readVersioned(ownerId, id)));
    return found.filter((item): item is VersionedTask => !!item)
      .map(item => item.task)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },
};
