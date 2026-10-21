import { decodeBase64 } from './source.js';

const MAX_AUDIO_BYTES = 64 * 1024 * 1024;

/** Parse RIFF chunks, not a guessed duration or a fixed 44-byte offset. */
export function inspectWav(bytes: Buffer) {
  if (bytes.length < 44 || bytes.length > MAX_AUDIO_BYTES ||
      bytes.toString('ascii', 0, 4) !== 'RIFF' ||
      bytes.toString('ascii', 8, 12) !== 'WAVE' ||
      bytes.readUInt32LE(4) + 8 !== bytes.length) {
    throw new Error('Invalid, truncated or oversized WAV file.');
  }
  let format: { sampleRate: number; channels: number; blockAlign: number } | undefined;
  let dataBytes = 0;
  let hasData = false;
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const id = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    const start = offset + 8;
    const next = start + size + (size % 2);
    if (next > bytes.length) throw new Error('Truncated WAV chunk.');
    if (id === 'fmt ') {
      if (format || size < 16 || bytes.readUInt16LE(start) !== 1 ||
          bytes.readUInt16LE(start + 14) !== 16) throw new Error('Only 16-bit PCM WAV is supported.');
      const channels = bytes.readUInt16LE(start + 2);
      const sampleRate = bytes.readUInt32LE(start + 4);
      const blockAlign = bytes.readUInt16LE(start + 12);
      if (![1, 2].includes(channels) || sampleRate < 8_000 || sampleRate > 96_000 ||
          blockAlign !== channels * 2 || bytes.readUInt32LE(start + 8) !== sampleRate * blockAlign) {
        throw new Error('Inconsistent WAV audio format.');
      }
      format = { channels, sampleRate, blockAlign };
    } else if (id === 'data') {
      if (hasData) throw new Error('Multiple WAV data chunks are unsupported.');
      hasData = true;
      dataBytes = size;
    }
    offset = next;
  }
  if (offset !== bytes.length || !format || !hasData || !dataBytes || dataBytes % format.blockAlign) {
    throw new Error('WAV sample data is missing or incomplete.');
  }
  const durationSeconds = dataBytes / format.blockAlign / format.sampleRate;
  if (durationSeconds > 30 * 60) throw new Error('Chapter audio exceeds the 30-minute limit.');
  return { ...format, dataBytes, durationSeconds, mimeType: 'audio/wav' as const };
}

/** Only use for provider output explicitly documented as signed little-endian PCM. */
export function wrapPcm16LE(pcm: Buffer, sampleRate: number, channels = 1): Buffer {
  if (!Number.isInteger(sampleRate) || sampleRate < 8_000 || sampleRate > 96_000 ||
      ![1, 2].includes(channels) || !pcm.length || pcm.length % (channels * 2) ||
      pcm.length + 44 > MAX_AUDIO_BYTES) throw new Error('Invalid signed 16-bit PCM audio.');
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + pcm.length, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24); header.writeUInt32LE(sampleRate * channels * 2, 28);
  header.writeUInt16LE(channels * 2, 32); header.writeUInt16LE(16, 34);
  header.write('data', 36); header.writeUInt32LE(pcm.length, 40);
  const wav = Buffer.concat([header, pcm]);
  inspectWav(wav);
  return wav;
}

export function decodeStudioWav(base64: string, mimeType: string) {
  if (!['audio/wav', 'audio/x-wav', 'audio/wave'].includes(mimeType.split(';')[0]!.trim().toLowerCase())) {
    throw new Error('Expected WAV output. Raw PCM requires an explicitly verified sample format.');
  }
  const bytes = decodeBase64(base64, MAX_AUDIO_BYTES);
  return { bytes, ...inspectWav(bytes) };
}
