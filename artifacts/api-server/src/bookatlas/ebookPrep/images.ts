import { PNG } from 'pngjs';
import jpeg from 'jpeg-js';
import { printCoverSpec, BLEED_IN, type PaperId, type TrimSizeId } from '@workspace/bookatlas-catalog/publishing';

export interface Raster { width: number; height: number; data: Uint8Array }

const MAX_PIXELS = 60_000_000;

export function imageSize(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) { i += 1; continue; }
      const marker = bytes[i + 1]!;
      const length = (bytes[i + 2]! << 8) | bytes[i + 3]!;
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { height: (bytes[i + 5]! << 8) | bytes[i + 6]!, width: (bytes[i + 7]! << 8) | bytes[i + 8]! };
      }
      i += 2 + length;
    }
  }
  return null;
}

export function decodeImage(bytes: Uint8Array): Raster {
  const size = imageSize(bytes);
  if (!size || size.width * size.height > MAX_PIXELS) throw new Error('Unsupported or oversized image.');
  if (bytes[0] === 0x89) {
    const png = PNG.sync.read(Buffer.from(bytes));
    return { width: png.width, height: png.height, data: new Uint8Array(png.data) };
  }
  const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true, maxMemoryUsageInMB: 1024 });
  return { width: decoded.width, height: decoded.height, data: decoded.data };
}

export function encodePng(raster: Raster) {
  const png = new PNG({ width: raster.width, height: raster.height });
  png.data = Buffer.from(raster.data);
  return new Uint8Array(PNG.sync.write(png));
}

export function encodeJpeg(raster: Raster, quality = 92) {
  return new Uint8Array(jpeg.encode({ width: raster.width, height: raster.height, data: raster.data }, quality).data);
}

export function crop(raster: Raster, x: number, y: number, width: number, height: number): Raster {
  const data = new Uint8Array(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    const start = ((y + row) * raster.width + x) * 4;
    data.set(raster.data.subarray(start, start + width * 4), row * width * 4);
  }
  return { width, height, data };
}

/** Squared RGB distance below which a pixel counts as background (about 12% of full range). */
const FUZZ = (0.12 * 441) ** 2;

function isBackground(r: Raster, i: number, bg: [number, number, number]) {
  const dr = r.data[i]! - bg[0], dg = r.data[i + 1]! - bg[1], db = r.data[i + 2]! - bg[2];
  return dr * dr + dg * dg + db * db <= FUZZ;
}

export interface FrontPanel { x: number; y: number; width: number; height: number; method: 'background' | 'print-spec' | 'right-half' }

/**
 * Locate the front panel of a full print wrap (back, spine, front side by side).
 * 1. Designs on a plain background: the right-most wide run of non-background columns.
 * 2. Edge-to-edge wraps with a known trim and page count: the front panel from the print spec.
 * 3. Otherwise the right half, flagged for the author to check.
 */
export function findFrontPanel(r: Raster, print?: { trimSize?: TrimSizeId; paper?: PaperId; pageCount?: number }): FrontPanel {
  const corner = (x: number, y: number) => (y * r.width + x) * 4;
  const corners = [corner(0, 0), corner(r.width - 1, 0), corner(0, r.height - 1), corner(r.width - 1, r.height - 1)];
  const bg: [number, number, number] = [r.data[corners[1]!]!, r.data[corners[1]! + 1]!, r.data[corners[1]! + 2]!];
  const plainBackground = corners.every((i) => isBackground(r, i, bg));

  if (plainBackground) {
    const content = new Uint8Array(r.width);
    for (let x = 0; x < r.width; x += 1) {
      let hits = 0;
      for (let y = 0; y < r.height; y += 2) if (!isBackground(r, corner(x, y), bg) && ++hits > r.height * 0.02) { content[x] = 1; break; }
    }
    const runs: { start: number; end: number }[] = [];
    for (let x = 0; x < r.width; x += 1) {
      if (!content[x]) continue;
      const last = runs[runs.length - 1];
      if (last && x - last.end <= 2) last.end = x; else runs.push({ start: x, end: x });
    }
    const front = runs.reverse().find((run) => run.end - run.start > r.width * 0.25);
    if (front) {
      const x = front.start, width = front.end - front.start + 1;
      let top = 0, bottom = r.height - 1;
      const rowHasContent = (y: number) => {
        let hits = 0;
        for (let xx = x; xx < x + width; xx += 2) if (!isBackground(r, corner(xx, y), bg) && ++hits > width * 0.02) return true;
        return false;
      };
      while (top < bottom && !rowHasContent(top)) top += 1;
      while (bottom > top && !rowHasContent(bottom)) bottom -= 1;
      return { x, y: top, width, height: bottom - top + 1, method: 'background' };
    }
  }

  if (print?.trimSize && print.paper && print.pageCount) {
    const spec = printCoverSpec(print.trimSize, print.paper, print.pageCount);
    const scale = r.width / spec.widthIn;
    // The front panel without its outer bleed or the spine.
    const x = Math.round(spec.frontPanel.x * scale);
    const width = Math.round((spec.frontPanel.width - BLEED_IN) * scale);
    const y = Math.round(BLEED_IN * scale);
    const height = Math.round((spec.heightIn - BLEED_IN * 2) * scale);
    if (x + width <= r.width && y + height <= r.height) return { x, y, width, height, method: 'print-spec' };
  }

  const half = Math.floor(r.width / 2);
  return { x: r.width - half, y: 0, width: half, height: r.height, method: 'right-half' };
}
