import { createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { crc32 } from 'node:zlib';

const MAX_SOURCE_BYTES = 5 * 1024 * 1024;
const TYPES: Record<string, string> = {
  txt: 'text/plain', md: 'text/markdown', pdf: 'application/pdf',
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
};

export interface ValidatedSource {
  fileName: string;
  mimeType: string;
  bytes: Buffer;
  sha256: string;
  text?: string;
  pageCount?: number;
}

/** Strict decoding: Buffer.from alone silently accepts malformed base64. */
export function decodeBase64(data: string, maxBytes: number): Buffer {
  if (!data || data.length > Math.ceil(maxBytes / 3) * 4 ||
      data.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
    throw new Error('Invalid or oversized base64 payload.');
  }
  const bytes = Buffer.from(data, 'base64');
  if (!bytes.length || bytes.length > maxBytes || bytes.toString('base64') !== data) {
    throw new Error('Invalid or oversized base64 payload.');
  }
  return bytes;
}

/** Validate actual bytes before extraction. Transcripts are UTF-8 TXT/MD, not raw audio. */
export async function validateSource(input: {
  fileName: string; mimeType?: string; base64: string;
}): Promise<ValidatedSource> {
  if (!input.fileName || input.fileName.length > 180 ||
      /[/\\\u0000-\u001f\u007f]/.test(input.fileName) || input.fileName !== input.fileName.trim()) {
    throw new Error('Use a plain file name without paths or control characters.');
  }
  const extension = input.fileName.split('.').pop()?.toLowerCase() ?? '';
  const mimeType = TYPES[extension];
  if (!mimeType) throw new Error('Supported files: TXT, MD, PDF, PNG and JPEG. Upload audio transcripts as TXT or MD.');
  const declared = input.mimeType?.split(';')[0]?.trim().toLowerCase();
  if (declared && declared !== 'application/octet-stream' && declared !== mimeType &&
      !(extension === 'md' && declared === 'text/plain')) {
    throw new Error('The declared file type does not match its extension.');
  }
  const bytes = decodeBase64(input.base64, MAX_SOURCE_BYTES);
  const result: ValidatedSource = {
    fileName: input.fileName, mimeType, bytes,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
  if (mimeType.startsWith('text/')) {
    if (bytes.length > 256 * 1024) throw new Error('Text sources must be at most 256 KiB; split larger documents explicitly.');
    let text: string;
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
    catch { throw new Error('Text files must contain valid UTF-8.'); }
    if (!text.trim() || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) {
      throw new Error('The text source is empty or contains binary control characters.');
    }
    result.text = text; // Preserve the complete source; never truncate silently.
  } else if (mimeType === 'application/pdf') {
    if (bytes.subarray(0, 5).toString('ascii') !== '%PDF-') throw new Error('Invalid PDF signature.');
    try {
      const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
      result.pageCount = pdf.getPageCount();
    } catch { throw new Error('The PDF is invalid or encrypted. Supply an unlocked PDF.'); }
    if (!result.pageCount || result.pageCount > 20) throw new Error('PDF sources must contain 1–20 pages; split larger PDFs explicitly.');
  } else if (mimeType === 'image/png') {
    if (bytes.length < 45 || !bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) ||
        bytes.toString('ascii', 12, 16) !== 'IHDR' || bytes.readUInt32BE(8) !== 13 ||
        bytes.toString('ascii', bytes.length - 8, bytes.length - 4) !== 'IEND') {
      throw new Error('Invalid PNG structure.');
    }
    checkDimensions(bytes.readUInt32BE(16), bytes.readUInt32BE(20));
    let offset = 8;
    let hasPixels = false;
    let hasEnd = false;
    while (offset + 12 <= bytes.length) {
      const size = bytes.readUInt32BE(offset);
      const end = offset + 12 + size;
      if (end > bytes.length) throw new Error('Truncated PNG chunk.');
      const kind = bytes.toString('ascii', offset + 4, offset + 8);
      if (!/^[A-Za-z]{4}$/.test(kind) ||
          crc32(bytes.subarray(offset + 4, end - 4)) !== bytes.readUInt32BE(end - 4)) {
        throw new Error('Invalid PNG chunk checksum.');
      }
      if (kind === 'IDAT' && size > 0) hasPixels = true;
      if (kind === 'IEND') {
        if (size || end !== bytes.length) throw new Error('Invalid PNG end chunk.');
        hasEnd = true;
      }
      offset = end;
    }
    if (offset !== bytes.length || !hasPixels || !hasEnd) throw new Error('PNG image data is incomplete.');
  } else {
    if (bytes.length < 12 || bytes.readUInt16BE(0) !== 0xffd8 ||
        bytes.readUInt16BE(bytes.length - 2) !== 0xffd9) throw new Error('Invalid JPEG signature.');
    let offset = 2;
    let dimensionsFound = false;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1]!;
      if (marker === 0xda || marker === 0xd9) break;
      const size = bytes.readUInt16BE(offset + 2);
      if (size < 2 || offset + 2 + size > bytes.length) break;
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
        if (size < 8) break;
        checkDimensions(bytes.readUInt16BE(offset + 7), bytes.readUInt16BE(offset + 5));
        dimensionsFound = true;
        break;
      }
      offset += size + 2;
    }
    if (!dimensionsFound) throw new Error('JPEG dimensions could not be validated.');
  }
  return result;
}

function checkDimensions(width: number, height: number) {
  if (!width || !height || width > 16_384 || height > 16_384 || width * height > 25_000_000) {
    throw new Error('Images must contain at most 25 megapixels and have valid dimensions.');
  }
}
