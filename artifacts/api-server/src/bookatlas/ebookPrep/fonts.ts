import { createHash } from 'node:crypto';
import { unzlibSync } from 'fflate';

export interface FontInfo { fsType: number; vendor: string; copyright: string; family: string }

function readTables(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const signature = view.getUint32(0);
  const tables = new Map<string, Uint8Array>();
  if (signature === 0x774f4646) { // 'wOFF'
    const count = view.getUint16(12);
    for (let i = 0; i < count; i += 1) {
      const at = 44 + i * 20;
      const tag = String.fromCharCode(...bytes.subarray(at, at + 4));
      const offset = view.getUint32(at + 4), compLength = view.getUint32(at + 8), origLength = view.getUint32(at + 12);
      const raw = bytes.subarray(offset, offset + compLength);
      tables.set(tag, compLength < origLength ? unzlibSync(raw) : raw);
    }
    return tables;
  }
  if (![0x00010000, 0x4f54544f, 0x74727565].includes(signature)) return null; // TrueType, 'OTTO', 'true'
  const count = view.getUint16(4);
  for (let i = 0; i < count; i += 1) {
    const at = 12 + i * 16;
    const tag = String.fromCharCode(...bytes.subarray(at, at + 4));
    tables.set(tag, bytes.subarray(view.getUint32(at + 8), view.getUint32(at + 8) + view.getUint32(at + 12)));
  }
  return tables;
}

function nameRecord(table: Uint8Array | undefined, nameId: number) {
  if (!table || table.length < 6) return '';
  const view = new DataView(table.buffer, table.byteOffset, table.byteLength);
  const count = view.getUint16(2), storage = view.getUint16(4);
  for (let i = 0; i < count; i += 1) {
    const at = 6 + i * 12;
    if (at + 12 > table.length) break;
    const platform = view.getUint16(at), id = view.getUint16(at + 6);
    const length = view.getUint16(at + 8), offset = view.getUint16(at + 10);
    if (id !== nameId) continue;
    const raw = table.subarray(storage + offset, storage + offset + length);
    if (platform === 3 || platform === 0) {
      let s = '';
      for (let j = 0; j + 1 < raw.length; j += 2) s += String.fromCharCode((raw[j]! << 8) | raw[j + 1]!);
      return s;
    }
    return String.fromCharCode(...raw);
  }
  return '';
}

export function inspectFont(bytes: Uint8Array): FontInfo | null {
  try {
    const tables = readTables(bytes);
    const os2 = tables?.get('OS/2');
    if (!tables || !os2 || os2.length < 62) return null;
    const view = new DataView(os2.buffer, os2.byteOffset, os2.byteLength);
    return {
      fsType: view.getUint16(8),
      vendor: String.fromCharCode(...os2.subarray(58, 62)),
      copyright: nameRecord(tables.get('name'), 0),
      family: nameRecord(tables.get('name'), 1),
    };
  } catch {
    return null;
  }
}

/** Undo IDPF or Adobe font obfuscation (META-INF/encryption.xml) so the font can be inspected. */
export function deobfuscate(bytes: Uint8Array, algorithm: string, uniqueIdentifier: string) {
  const out = new Uint8Array(bytes);
  if (algorithm.includes('idpf.org/2008/embedding')) {
    const key = createHash('sha1').update(uniqueIdentifier.replace(/[ \u0009\u000d\u000a]/g, '')).digest();
    for (let i = 0; i < Math.min(1040, out.length); i += 1) out[i]! ^= key[i % key.length]!;
  } else if (algorithm.includes('ns.adobe.com/pdf/enc#RC')) {
    const hex = uniqueIdentifier.replace(/^urn:uuid:/i, '').replace(/-/g, '');
    const key = Buffer.from(hex, 'hex');
    if (key.length !== 16) return null;
    for (let i = 0; i < Math.min(1024, out.length); i += 1) out[i]! ^= key[i % 16]!;
  } else {
    return null;
  }
  return out;
}

/** Bit 1 alone means "restricted licence embedding": the font may not be embedded at all. */
export function forbidsEmbedding(info: FontInfo) {
  return (info.fsType & 0x000f) === 0x0002;
}

/** System and Office fonts whose licence does not cover redistribution inside an eBook (owner decision D2). */
export function isRedistributionRestricted(info: FontInfo) {
  return forbidsEmbedding(info) || info.vendor === 'MS  ' || /microsoft/i.test(info.copyright);
}
