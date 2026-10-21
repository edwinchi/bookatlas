import { Storage } from '@google-cloud/storage';

// Replit App Storage sidecar authentication; no credential files or signed URLs exposed.
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

export function privateAssetFile(jobId: string, key: string) {
  if (!/^[0-9a-f-]{36}$/.test(jobId) || !/^[a-z0-9-]+\.[a-z0-9]+$/.test(key)) {
    throw new Error('Invalid private publishing asset identity.');
  }
  const root = process.env.PRIVATE_OBJECT_DIR?.replace(/^\/+|\/+$/g, '');
  if (!root || !root.includes('/')) throw new Error('Private App Storage is unavailable.');
  const [bucket, ...prefix] = root.split('/');
  return storage.bucket(bucket!).file(`${prefix.join('/')}/bookatlas/${jobId}/${key}`);
}

export async function writeAsset(jobId: string, key: string, bytes: Buffer, contentType: string, ownerId: string) {
  await privateAssetFile(jobId, key).save(bytes, {
    resumable: false, validation: 'crc32c',
    metadata: { contentType, cacheControl: 'private, no-store', metadata: { ownerId, jobId, visibility: 'private' } },
  });
}

export async function readAsset(jobId: string, key: string) {
  const file = privateAssetFile(jobId, key);
  const [metadata] = await file.getMetadata();
  if (!Number.isSafeInteger(Number(metadata.size)) || Number(metadata.size) > 64 * 1024 * 1024) {
    throw new Error('Publishing asset exceeds the supported size.');
  }
  const [bytes] = await file.download({ validation: 'crc32c' });
  return bytes;
}

export async function writeJson(jobId: string, key: string, value: unknown, ownerId: string) {
  await writeAsset(jobId, key, Buffer.from(JSON.stringify(value)), 'application/json', ownerId);
}

export async function readJson<T>(jobId: string, key: string): Promise<T> {
  return JSON.parse((await readAsset(jobId, key)).toString('utf8')) as T;
}
