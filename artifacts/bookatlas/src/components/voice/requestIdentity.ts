type NarrationIdentity = { accountId: string; bookId: string; voice: string; text: string };

/** Retain the same approved request across reloads, without storing chapter text. */
export async function narrationRequestId(
  identity: NarrationIdentity,
  storage: Pick<Storage, 'getItem' | 'setItem'> = window.sessionStorage,
): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(identity)));
  const digest = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
  const key = `bookatlas.reader-narration.${digest}`;
  const saved = storage.getItem(key);
  if (saved) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saved)) {
      throw new Error('The saved narration request identity is invalid. No paid request was started.');
    }
    return saved;
  }
  const id = crypto.randomUUID();
  storage.setItem(key, id);
  if (storage.getItem(key) !== id) {
    throw new Error('The browser could not safely retain this narration request. No paid request was started.');
  }
  return id;
}
