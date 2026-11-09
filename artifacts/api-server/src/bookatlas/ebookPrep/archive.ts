import { unzipSync, zipSync, strFromU8, strToU8, type Zippable } from 'fflate';

export class PrepError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

export const MAX_UPLOAD_BYTES = 150 * 1024 * 1024;
const MAX_UNPACKED_BYTES = 400 * 1024 * 1024;
const MAX_ENTRIES = 5000;

/** An unpacked EPUB: archive paths (forward slashes, no leading slash) to bytes. */
export class EpubFiles {
  constructor(public files: Map<string, Uint8Array>) {}

  has(path: string) { return this.files.has(path); }
  bytes(path: string) {
    const value = this.files.get(path);
    if (!value) throw new PrepError(`The EPUB is missing ${path}.`);
    return value;
  }
  text(path: string) { return strFromU8(this.bytes(path)); }
  setText(path: string, value: string) { this.files.set(path, strToU8(value)); }
  setBytes(path: string, value: Uint8Array) { this.files.set(path, value); }
  remove(path: string) { this.files.delete(path); }
  paths() { return [...this.files.keys()]; }
  totalBytes() { let n = 0; for (const v of this.files.values()) n += v.byteLength; return n; }
}

function safePath(name: string) {
  const path = name.replace(/\\/g, '/');
  if (path.startsWith('/') || /^[a-z]:/i.test(path) || path.split('/').some((part) => part === '..')) {
    throw new PrepError('The EPUB contains an unsafe file path.');
  }
  return path;
}

export function unpackEpub(bytes: Uint8Array): EpubFiles {
  if (bytes.byteLength > MAX_UPLOAD_BYTES) throw new PrepError('The EPUB is larger than 150 MB.');
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) throw new PrepError('This file is not an EPUB (it is not a zip archive).');
  let entries = 0;
  let declared = 0;
  let raw: Record<string, Uint8Array>;
  try {
    raw = unzipSync(bytes, {
      filter(file) {
        entries += 1;
        declared += file.originalSize;
        if (entries > MAX_ENTRIES || declared > MAX_UNPACKED_BYTES) throw new PrepError('The EPUB unpacks to more than 400 MB or 5,000 files.');
        return !file.name.endsWith('/');
      },
    });
  } catch (error) {
    if (error instanceof PrepError) throw error;
    throw new PrepError('The EPUB could not be opened; the zip archive is damaged.');
  }
  const files = new Map<string, Uint8Array>();
  let actual = 0;
  for (const [name, value] of Object.entries(raw)) {
    actual += value.byteLength;
    if (actual > MAX_UNPACKED_BYTES) throw new PrepError('The EPUB unpacks to more than 400 MB.');
    files.set(safePath(name), value);
  }
  return new EpubFiles(files);
}

/** Repack with `mimetype` first and stored, as the EPUB container format requires. */
export function packEpub(epub: EpubFiles): Uint8Array {
  const zippable: Zippable = { mimetype: [strToU8('application/epub+zip'), { level: 0 }] };
  for (const path of epub.paths().sort()) {
    if (path === 'mimetype') continue;
    const already = /\.(jpe?g|png|gif|webp|mp3|mp4|m4a|woff2?)$/i.test(path);
    zippable[path] = [epub.bytes(path), { level: already ? 0 : 9 }];
  }
  return zipSync(zippable);
}
